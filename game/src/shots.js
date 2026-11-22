// The screenshot scenes behind ?shot=cover|patrol|alarm|win. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (sample eight directions, keep out of the cones, move
// toward the current target), so the frame is what a short game really looks
// like and the same seed always gives the same frame. The win scene plays a
// whole heist to the getaway; the cover scene stops mid-heist with the Koi
// still in its shrine, the guards and cameras on patrol, and the alarm meter
// part-filled — the room, the cones, the cameras, the loot and the meter in
// one frame.

import { BOAT, SHRINE } from './level.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_WIN } from './render.js';

const SAMPLE = 1 / 30;
const DIRECTIONS = [
  { x: 0, y: -1 },
  { x: 0.7071, y: -0.7071 },
  { x: 1, y: 0 },
  { x: 0.7071, y: 0.7071 },
  { x: 0, y: 1 },
  { x: -0.7071, y: 0.7071 },
  { x: -1, y: 0 },
  { x: -0.7071, y: -0.7071 },
  { x: 0, y: 0 },
];
const SNEAK_SPEED = 96;
const FULL_SPEED = 175;

/** The autopilot's current target: jade, then the Koi shrine, then the boat. */
function currentTarget(world, jadesToTake) {
  const state = world.state;
  if (!state.hasKoi) {
    if (state.collected < jadesToTake) {
      let best = null;
      let bestDistance = Infinity;
      for (const jade of state.jades) {
        if (jade.taken) continue;
        const distance = Math.hypot(jade.x - state.player.x, jade.y - state.player.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = jade;
        }
      }
      if (best !== null) return { x: best.x, y: best.y };
    }
    return { x: SHRINE.x, y: SHRINE.y + 40 };
  }
  return { x: BOAT.x, y: BOAT.y };
}

/**
 * One autopilot decision: two modes, like a real thief. Safe (no eye on you):
 * walk toward the target, slipping around stalls, waiting out a cone only by
 * choosing the direction that keeps you out of it. Seen (an eye is on you):
 * get out of the light first — the direction whose landing spot is safest —
 * and only then think about the target. Cones sweep, so a blocked lane opens
 * again a few seconds later; the thief advances in the safe windows. When the
 * Koi is stolen, or the alarm is high, the thief runs at full speed and dashes.
 */
function autopilot(world, jadesToTake) {
  const state = world.state;
  const player = state.player;
  const fleeing = state.detection > 60 || (state.hasKoi && state.alarm !== 'calm');
  const target = fleeing && state.hasKoi ? { x: BOAT.x, y: BOAT.y } : currentTarget(world, jadesToTake);
  const speed = fleeing ? FULL_SPEED : SNEAK_SPEED;
  const hereDanger = world.dangerAt(player.x, player.y);
  let best = DIRECTIONS[8];
  let bestScore = -Infinity;
  for (const direction of DIRECTIONS) {
    const x = player.x + direction.x * speed * 0.35;
    const y = player.y + direction.y * speed * 0.35;
    if (world.pointBlocked(x, y, 16)) continue;
    const danger = world.dangerAt(x, y);
    const distance = Math.hypot(target.x - x, target.y - y);
    // Seen: danger rules, distance only breaks ties. Safe: distance rules,
    // danger only vetoes a landing spot that is plainly watched.
    const score = hereDanger > 0.05
      ? -danger * 1000 - distance * 0.2 - (direction.x === 0 && direction.y === 0 ? 50 : 0)
      : -distance - danger * 400 - (direction.x === 0 && direction.y === 0 ? 6 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = direction;
    }
  }
  const opts = { sneak: !fleeing, dash: fleeing && state.detection > 40, smoke: false, cracker: false };
  if (state.detection > 50 && state.coinCount >= 25 && !state.smoke.active) opts.smoke = true;
  if (state.detection > 30 && state.coinCount >= 15) {
    for (const guard of state.guards) {
      if (guard.mode === 'chase' || guard.mode === 'suspicious') {
        opts.cracker = true;
        break;
      }
    }
  }
  return { move: best, opts };
}

/** Walk straight toward `point` until the alarm reaches `target` or `seconds` pass. */
function peekAtDanger(world, point, target, seconds) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let index = 0; index < steps; index += 1) {
    const player = world.state.player;
    const dx = point.x - player.x;
    const dy = point.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    world.step(SAMPLE, { x: dx / length, y: dy / length }, { sneak: false, dash: false, smoke: false, cracker: false });
    if (world.state.status !== 'playing') break;
    if (world.state.detection >= target) break;
  }
}
/** Step the world forward with the autopilot for up to `seconds`, stopping early when `stop` says so. */
function playForward(world, seconds, jadesToTake, stop) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let index = 0; index < steps; index += 1) {
    const decision = autopilot(world, jadesToTake);
    world.step(SAMPLE, decision.move, decision.opts);
    if (world.state.status !== 'playing') break;
    if (stop && stop(world.state)) break;
  }
}

/**
 * Set `world` to the named scene (cover, patrol, alarm or win; any other name
 * is cover) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset('normal');
  if (name === 'patrol') {
    playForward(world, 6, 1);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'alarm') {
    // Walk straight at the west watchman until the alarm is nearly full.
    const westGuard = world.state.guards[0];
    const steps = Math.floor(90 / SAMPLE);
    for (let index = 0; index < steps; index += 1) {
      const player = world.state.player;
      const dx = westGuard.x - player.x;
      const dy = westGuard.y - player.y;
      const length = Math.hypot(dx, dy) || 1;
      world.step(SAMPLE, { x: dx / length, y: dy / length }, { sneak: false, dash: false, smoke: false, cracker: false });
      if (world.state.status !== 'playing') break;
      if (world.state.detection >= 65) break;
    }
    return { screen: world.state.status === 'playing' ? SCREEN_PLAY : SCREEN_CAUGHT, best: 0 };
  }
  if (name === 'win') {
    playForward(world, 240, 2);
    if (world.state.status === 'won') return { screen: SCREEN_WIN, best: world.state.score };
    if (world.state.status === 'playing') {
      // The autopilot ran out of night without the getaway: say so honestly.
      return { screen: SCREEN_PLAY, best: world.state.score };
    }
    return { screen: SCREEN_CAUGHT, best: world.state.score };
  }
  // cover: a mid-heist frame, two jades in, the Koi still in its shrine — and
  // the alarm part-filled, so the meter reads as a live system, not a prop.
  // The autopilot is good at staying unseen, so if it ends the run calm, the
  // thief leans into the west lantern-camera's sweep until the meter climbs.
  playForward(world, 18, 2, (state) => state.detection >= 55);
  if (world.state.status === 'playing' && world.state.detection < 35) {
    peekAtDanger(world, { x: 470, y: 500 }, 42, 6);
  }
  if (world.state.status === 'playing' && world.state.detection < 35) {
    peekAtDanger(world, { x: 300, y: 380 }, 42, 6);
  }
  return { screen: SCREEN_PLAY, best: 0 };
}
