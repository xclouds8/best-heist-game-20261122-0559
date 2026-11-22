// The Floating Lantern Heist — the game's rules and state, with no drawing and
// no browser in it: the thief, the patrolling guards and their vision cones, the
// sweeping lantern-cameras, the alarm states, the loot, the tools, the timer and
// the win and lose conditions. step() advances one fixed step and returns what
// happened as bit flags, so the caller can react without the world knowing about
// screens or sound. Nothing here allocates after createWorld returns.

import {
  BOAT,
  CAMERA_SPOTS,
  COIN_SPOTS,
  GUARD_PATROLS,
  JADE_SPOTS,
  PLAYER_START,
  SHRINE,
  STALLS,
} from './level.js';
import {
  CAMERA,
  DECK,
  DETECTION,
  DIFFICULTY,
  GUARD,
  LOOT,
  PLAYER,
  TOOLS,
} from './config.js';

export const EVENT_COIN = 1;
export const EVENT_JADE = 2;
export const EVENT_KOI = 4;
export const EVENT_SUSPICIOUS = 8;
export const EVENT_ALARM = 16;
export const EVENT_CAUGHT = 32;
export const EVENT_WIN = 64;
export const EVENT_DAWN = 128;
export const EVENT_SMOKE = 256;
export const EVENT_CRACKER = 512;
export const EVENT_DASH = 1024;

export const ALARM_CALM = 'calm';
export const ALARM_SUSPICIOUS = 'suspicious';
export const ALARM_ALARM = 'alarm';

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when the segment (x1,y1)-(x2,y2) touches rectangle r (slab test). */
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.width) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.width - x1) / dx;
    if (t1 > t2) {
      const held = t1;
      t1 = t2;
      t2 = held;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.height) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.height - y1) / dy;
    if (t1 > t2) {
      const held = t1;
      t1 = t2;
      t2 = held;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** True when any stall stands between the two points. */
export function lineOfSightBlocked(x1, y1, x2, y2) {
  for (let index = 0; index < STALLS.length; index += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, STALLS[index])) return true;
  }
  return false;
}

function circleHitsStall(x, y, radius) {
  for (let index = 0; index < STALLS.length; index += 1) {
    const stall = STALLS[index];
    const nearestX = clamp(x, stall.x, stall.x + stall.width);
    const nearestY = clamp(y, stall.y, stall.y + stall.height);
    const dx = x - nearestX;
    const dy = y - nearestY;
    if (dx * dx + dy * dy < radius * radius) return stall;
  }
  return null;
}

export function createWorld() {
  const player = {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    radius: PLAYER.radius,
    faceX: 0,
    faceY: -1,
    dashTimer: 0,
    dashCooldown: 0,
  };
  const guards = GUARD_PATROLS.map((patrol) => ({
    name: patrol.name,
    waypoints: patrol.waypoints,
    waypointIndex: 0,
    x: patrol.start.x,
    y: patrol.start.y,
    angle: patrol.facing,
    mode: 'patrol',
    pauseTimer: 0,
    lookTimer: 0,
    targetX: patrol.start.x,
    targetY: patrol.start.y,
    scanPhase: 0,
  }));
  const cameras = CAMERA_SPOTS.map((spot) => ({
    x: spot.x,
    y: spot.y,
    restAngle: spot.restAngle,
    phase: spot.phase,
    angle: spot.restAngle,
    sweepTime: spot.phase,
  }));
  const jades = JADE_SPOTS.map((spot) => ({ x: spot.x, y: spot.y, taken: false }));
  const coins = COIN_SPOTS.map((spot) => ({ x: spot.x, y: spot.y, taken: false }));

  const state = {
    player,
    guards,
    cameras,
    jades,
    coins,
    stalls: STALLS,
    shrine: SHRINE,
    boat: BOAT,
    detection: 0,
    alarm: ALARM_CALM,
    hasKoi: false,
    koiProgress: 0,
    collected: 0,
    coinCount: 0,
    score: 0,
    elapsed: 0,
    timeLeft: DIFFICULTY.normal.timerSeconds,
    maxDetection: 0,
    smoke: { active: false, x: 0, y: 0, until: 0 },
    status: 'playing',
    difficultyKey: 'normal',
  };

  function difficulty() {
    return DIFFICULTY[state.difficultyKey];
  }

  function reset(difficultyKey) {
    state.difficultyKey = DIFFICULTY[difficultyKey] ? difficultyKey : 'normal';
    player.x = PLAYER_START.x;
    player.y = PLAYER_START.y;
    player.faceX = 0;
    player.faceY = -1;
    player.dashTimer = 0;
    player.dashCooldown = 0;
    for (let index = 0; index < guards.length; index += 1) {
      const guard = guards[index];
      const patrol = GUARD_PATROLS[index];
      guard.x = patrol.start.x;
      guard.y = patrol.start.y;
      guard.angle = patrol.facing;
      guard.mode = 'patrol';
      guard.waypointIndex = 0;
      guard.pauseTimer = 0;
      guard.lookTimer = 0;
      guard.targetX = patrol.start.x;
      guard.targetY = patrol.start.y;
      guard.scanPhase = 0;
    }
    for (let index = 0; index < cameras.length; index += 1) {
      cameras[index].angle = CAMERA_SPOTS[index].restAngle;
      cameras[index].sweepTime = CAMERA_SPOTS[index].phase;
    }
    for (const jade of jades) jade.taken = false;
    for (const coin of coins) coin.taken = false;
    state.detection = 0;
    state.alarm = ALARM_CALM;
    state.hasKoi = false;
    state.koiProgress = 0;
    state.collected = 0;
    state.coinCount = 0;
    state.score = 0;
    state.elapsed = 0;
    state.timeLeft = difficulty().timerSeconds;
    state.maxDetection = 0;
    state.smoke.active = false;
    state.status = 'playing';
  }

  /** Move a circle (x, y, radius) by (dx, dy), sliding along stalls and the deck edge. */
  function moveCircle(body, dx, dy) {
    let nextX = clamp(body.x + dx, DECK.x + body.radius, DECK.x + DECK.width - body.radius);
    if (circleHitsStall(nextX, body.y, body.radius) !== null) nextX = body.x;
    let nextY = clamp(body.y + dy, DECK.y + body.radius, DECK.y + DECK.height - body.radius);
    if (circleHitsStall(nextX, nextY, body.radius) !== null) nextY = body.y;
    body.x = nextX;
    body.y = nextY;
  }

  /** How exposed the point (x, y) is to one observer: 0 when unseen, up to 1 in plain sight. */
  function exposureAt(x, y, observer, range, halfAngle) {
    const dx = x - observer.x;
    const dy = y - observer.y;
    const distance = Math.hypot(dx, dy);
    if (distance > range) return 0;
    if (distance < 30) return 1;
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(angle, observer.angle)) > halfAngle) return 0;
    if (lineOfSightBlocked(observer.x, observer.y, x, y)) return 0;
    return 1 - (distance / range) * 0.4;
  }

  /** 0..1 danger of standing at (x, y) right now: 1 means some eye is on you. */
  function dangerAt(x, y) {
    let worst = 0;
    for (const guard of guards) {
      worst = Math.max(worst, exposureAt(x, y, guard, GUARD.visionRange, GUARD.visionHalfAngle));
    }
    for (const camera of cameras) {
      worst = Math.max(worst, exposureAt(x, y, camera, CAMERA.visionRange, CAMERA.visionHalfAngle));
    }
    return worst;
  }

  function hiddenBySmoke() {
    if (!state.smoke.active) return false;
    const dx = player.x - state.smoke.x;
    const dy = player.y - state.smoke.y;
    return dx * dx + dy * dy < TOOLS.smokeRadius * TOOLS.smokeRadius;
  }

  function useSmoke() {
    if (state.coinCount < TOOLS.smokeCost || state.smoke.active) return 0;
    state.coinCount -= TOOLS.smokeCost;
    state.smoke.active = true;
    state.smoke.x = player.x;
    state.smoke.y = player.y;
    state.smoke.until = state.elapsed + TOOLS.smokeSeconds;
    return EVENT_SMOKE;
  }

  function useCracker() {
    if (state.coinCount < TOOLS.crackerCost) return 0;
    state.coinCount -= TOOLS.crackerCost;
    const targetX = clamp(player.x + player.faceX * 130, DECK.x + 20, DECK.x + DECK.width - 20);
    const targetY = clamp(player.y + player.faceY * 130, DECK.y + 20, DECK.y + DECK.height - 20);
    for (const guard of guards) {
      const distance = Math.hypot(guard.x - player.x, guard.y - player.y);
      if (distance < 420 && guard.mode !== 'chase') {
        guard.mode = 'investigate';
        guard.targetX = targetX;
        guard.targetY = targetY;
        guard.lookTimer = TOOLS.investigateSeconds;
      }
    }
    return EVENT_CRACKER;
  }

  function updateGuard(guard, dt, events) {
    const speedMultiplier = difficulty().guardSpeedMultiplier;
    let speed = 0;
    let goalX = guard.x;
    let goalY = guard.y;
    if (guard.mode === 'patrol') {
      const waypoint = guard.waypoints[guard.waypointIndex];
      goalX = waypoint.x;
      goalY = waypoint.y;
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        guard.scanPhase += dt;
        guard.angle += Math.sin(guard.scanPhase * 2.2) * 0.045;
      } else {
        speed = GUARD.patrolSpeed * speedMultiplier;
        const dx = goalX - guard.x;
        const dy = goalY - guard.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 6) {
          guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
          guard.pauseTimer = GUARD.scanPause;
          guard.scanPhase = 0;
        } else {
          guard.angle = Math.atan2(dy, dx);
        }
      }
    } else if (guard.mode === 'suspicious' || guard.mode === 'investigate') {
      goalX = guard.targetX;
      goalY = guard.targetY;
      const dx = goalX - guard.x;
      const dy = goalY - guard.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 10) {
        if (guard.lookTimer > 0) {
          guard.lookTimer -= dt;
          guard.angle += dt * 1.6;
        } else if (guard.mode === 'suspicious') {
          guard.mode = 'patrol';
        } else {
          guard.mode = 'patrol';
        }
      } else {
        speed = (guard.mode === 'investigate' ? GUARD.investigateSpeed : GUARD.suspiciousSpeed) * speedMultiplier;
        guard.angle = Math.atan2(dy, dx);
      }
    } else if (guard.mode === 'chase') {
      goalX = player.x;
      goalY = player.y;
      speed = GUARD.chaseSpeed * speedMultiplier;
      guard.angle = Math.atan2(goalY - guard.y, goalX - guard.x);
    }
    if (speed > 0) {
      const dx = goalX - guard.x;
      const dy = goalY - guard.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.01) {
        const step = Math.min(distance, speed * dt);
        moveCircle(guard, (dx / distance) * step, (dy / distance) * step);
      }
    }
    if (guard.mode === 'chase' && Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.catchDistance) {
      state.status = 'caught';
      return EVENT_CAUGHT;
    }
    return 0;
  }

  /**
   * One fixed step. `move` is {x, y} (a unit-ish direction, or 0,0 to stand still).
   * `opts` is {sneak, dash, smoke, cracker}: the held keys and one-shot tool presses.
   */
  function step(dt, move, opts) {
    let events = 0;
    if (state.status !== 'playing') return events;
    state.elapsed += dt;
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.status = 'dawn';
      return EVENT_DAWN;
    }
    if (state.smoke.active && state.elapsed >= state.smoke.until) state.smoke.active = false;

    if (opts) {
      if (opts.smoke) events |= useSmoke();
      if (opts.cracker) events |= useCracker();
      if (opts.dash && player.dashCooldown <= 0 && (move.x !== 0 || move.y !== 0)) {
        player.dashTimer = PLAYER.dashTime;
        player.dashCooldown = PLAYER.dashCooldown;
        events |= EVENT_DASH;
      }
    }
    if (player.dashCooldown > 0) player.dashCooldown -= dt;

    const length = Math.hypot(move.x, move.y);
    const dirX = length > 0 ? move.x / length : 0;
    const dirY = length > 0 ? move.y / length : 0;
    if (length > 0) {
      player.faceX = dirX;
      player.faceY = dirY;
    }
    let speed = opts && opts.sneak ? PLAYER.sneakSpeed : PLAYER.speed;
    if (player.dashTimer > 0) {
      player.dashTimer -= dt;
      speed = PLAYER.dashSpeed;
    }
    moveCircle(player, dirX * speed * dt, dirY * speed * dt);

    for (const coin of coins) {
      if (coin.taken) continue;
      if (Math.hypot(coin.x - player.x, coin.y - player.y) < 24) {
        coin.taken = true;
        state.coinCount += 1;
        state.score += LOOT.coinPoints;
        events |= EVENT_COIN;
      }
    }
    for (const jade of jades) {
      if (jade.taken) continue;
      if (Math.hypot(jade.x - player.x, jade.y - player.y) < 26) {
        jade.taken = true;
        state.collected += 1;
        state.score += LOOT.jadePoints;
        events |= EVENT_JADE;
      }
    }
    const shrineDistance = Math.hypot(SHRINE.x - player.x, SHRINE.y - player.y);
    if (!state.hasKoi && shrineDistance < SHRINE.radius + 22) {
      state.koiProgress += dt;
      if (state.koiProgress >= LOOT.koiGrabSeconds) {
        state.hasKoi = true;
        state.score += LOOT.koiPoints;
        events |= EVENT_KOI;
      }
    } else {
      state.koiProgress = Math.max(0, state.koiProgress - dt * 2);
    }
    if (state.hasKoi
      && player.x > BOAT.x - BOAT.width / 2 && player.x < BOAT.x + BOAT.width / 2
      && player.y > BOAT.y - BOAT.height / 2 && player.y < BOAT.y + BOAT.height / 2) {
      state.score += Math.round(state.timeLeft) * 2;
      if (state.maxDetection < DETECTION.suspiciousAt) state.score += LOOT.ghostBonus;
      state.status = 'won';
      return EVENT_WIN;
    }

    for (const camera of cameras) {
      camera.sweepTime += dt;
      camera.angle = camera.restAngle + Math.sin(camera.sweepTime * CAMERA.sweepSpeed) * CAMERA.sweepHalfAngle;
    }

    const hidden = hiddenBySmoke();
    const multiplier = difficulty().detectionMultiplier * (opts && opts.sneak ? DETECTION.sneakMultiplier : 1);
    let seen = 0;
    if (!hidden) {
      for (const guard of guards) {
        seen = Math.max(seen, exposureAt(player.x, player.y, guard, GUARD.visionRange, GUARD.visionHalfAngle) * DETECTION.guardPerSecond);
      }
      for (const camera of cameras) {
        seen = Math.max(seen, exposureAt(player.x, player.y, camera, CAMERA.visionRange, CAMERA.visionHalfAngle) * DETECTION.cameraPerSecond);
      }
    }
    const previous = state.detection;
    if (seen > 0) state.detection = Math.min(100, state.detection + seen * multiplier * dt);
    else state.detection = Math.max(0, state.detection - (hidden ? DETECTION.smokeDecayPerSecond : DETECTION.decayPerSecond) * dt);
    state.maxDetection = Math.max(state.maxDetection, state.detection);

    const previousAlarm = state.alarm;
    if (state.detection >= DETECTION.alarmAt) state.alarm = ALARM_ALARM;
    else if (state.detection >= DETECTION.suspiciousAt) state.alarm = ALARM_SUSPICIOUS;
    else state.alarm = ALARM_CALM;
    if (state.alarm === ALARM_SUSPICIOUS && previousAlarm === ALARM_CALM) events |= EVENT_SUSPICIOUS;
    if (state.alarm === ALARM_ALARM && previousAlarm !== ALARM_ALARM) events |= EVENT_ALARM;

    const lastSeen = { x: player.x, y: player.y };
    for (const guard of guards) {
      if (state.alarm === ALARM_ALARM) {
        if (guard.mode !== 'chase') {
          guard.mode = 'chase';
          guard.targetX = lastSeen.x;
          guard.targetY = lastSeen.y;
        }
      } else if (state.alarm === ALARM_SUSPICIOUS) {
        if (guard.mode === 'patrol') {
          guard.mode = 'suspicious';
          guard.targetX = lastSeen.x;
          guard.targetY = lastSeen.y;
          guard.lookTimer = GUARD.lookAroundTime;
        }
      } else if (guard.mode === 'chase') {
        guard.mode = 'suspicious';
        guard.targetX = lastSeen.x;
        guard.targetY = lastSeen.y;
        guard.lookTimer = GUARD.lookAroundTime;
      }
      events |= updateGuard(guard, dt, events);
      if (state.status !== 'playing') break;
    }
    return events;
  }

  reset('normal');
  return { state, reset, step, dangerAt, lineOfSightBlocked, pointBlocked };
}

/** True when the point (x, y) is inside a stall or outside the deck (with a margin). */
function pointBlocked(x, y, margin) {
  if (x < DECK.x + margin || x > DECK.x + DECK.width - margin || y < DECK.y + margin || y > DECK.y + DECK.height - margin) return true;
  for (let index = 0; index < STALLS.length; index += 1) {
    const stall = STALLS[index];
    if (x > stall.x - margin && x < stall.x + stall.width + margin && y > stall.y - margin && y < stall.y + stall.height + margin) return true;
  }
  return false;
}
