// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play, paused,
// caught, won and dawn. Keyboard (WASD/arrows, Shift to sneak, Space to dash,
// Q smoke, E firecracker, M mute, P pause, R restart) and mouse (click to walk,
// click a difficulty on the title) both play it.
//
// ?shot=cover|patrol|alarm|win (with &seed=N, accepted and ignored — the bazaar
// is one fixed room) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot. window.__game always
// carries the live state for tests and tooling.
import { BEST_KEY, STEP } from './config.js';
import { createWorld, EVENT_ALARM, EVENT_CAUGHT, EVENT_COIN, EVENT_CRACKER, EVENT_DASH, EVENT_DAWN, EVENT_JADE, EVENT_KOI, EVENT_SMOKE, EVENT_SUSPICIOUS, EVENT_WIN } from './world.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM,
  ACTION_CRACKER,
  ACTION_DASH,
  ACTION_DIFF_EASY,
  ACTION_DIFF_HARD,
  ACTION_DIFF_NORMAL,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  ACTION_SMOKE,
  createInput,
} from './input.js';
import {
  SCREEN_CAUGHT,
  SCREEN_DAWN,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);
const audio = createAudio();

/** The live state tests and screenshot tooling read. */
const gameHandle = {
  status: 'title',
  screen: 'title',
  detection: 0,
  collected: 0,
  coins: 0,
  score: 0,
  time: 0,
  timeLeft: 0,
  alarm: 'calm',
  hasKoi: false,
  difficulty: 'normal',
  player: { x: 0, y: 0 },
};
window.__game = gameHandle;

function syncHandle(screen) {
  const state = world.state;
  gameHandle.status = screen === SCREEN_PLAY || screen === SCREEN_PAUSED ? 'playing' : screen === SCREEN_TITLE ? 'title' : screen;
  gameHandle.screen = screen;
  gameHandle.detection = state.detection;
  gameHandle.collected = state.collected;
  gameHandle.coins = state.coinCount;
  gameHandle.score = state.score;
  gameHandle.time = state.elapsed;
  gameHandle.timeLeft = state.timeLeft;
  gameHandle.alarm = state.alarm;
  gameHandle.hasKoi = state.hasKoi;
  gameHandle.difficulty = state.difficultyKey;
  gameHandle.player.x = state.player.x;
  gameHandle.player.y = state.player.y;
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  syncHandle(scene.screen);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, world.state.difficultyKey);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let difficultyKey = 'normal';
  let accumulator = 0;
  let last = performance.now();
  let moveTarget = null;
  let pendingDash = false;
  let pendingSmoke = false;
  let pendingCracker = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each catch.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset(difficultyKey);
    moveTarget = null;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Steal the Golden Koi, then reach the boat.');
  }

  function endGame(nextScreen, message) {
    screen = nextScreen;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(message);
  }

  function playEventSounds(events) {
    if (events & EVENT_COIN) audio.coin();
    if (events & EVENT_JADE) audio.jade();
    if (events & EVENT_KOI) audio.koi();
    if (events & EVENT_SMOKE) audio.smoke();
    if (events & EVENT_CRACKER) audio.cracker();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_SUSPICIOUS) audio.suspicious();
    if (events & EVENT_ALARM) audio.alarm();
    if (events & EVENT_CAUGHT) audio.caught();
    if (events & EVENT_WIN) audio.win();
    if (events & EVENT_DAWN) audio.dawn();
  }

  /** The title panel's difficulty rows, in field coordinates, for click selection. */
  function difficultyAtPoint(field) {
    const lines = 13;
    const panelHeight = 150 + lines * 32 + 76;
    const panelY = (720 - panelHeight) / 2;
    const row = Math.floor((field.y - (panelY + 150 + 8 * 32)) / 32);
    if (field.x < 320 || field.x > 960 || row < 0 || row > 2) return null;
    return ['easy', 'normal', 'hard'][row];
  }

  function handleActions() {
    const actions = input.takeActions();
    const click = input.takeClickTarget();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_DIFF_EASY) difficultyKey = 'easy';
    else if (actions & ACTION_DIFF_NORMAL) difficultyKey = 'normal';
    else if (actions & ACTION_DIFF_HARD) difficultyKey = 'hard';
    if (screen === SCREEN_TITLE) {
      if (click !== null) {
        const field = renderer.toField(click.clientX, click.clientY);
        const picked = difficultyAtPoint(field);
        if (picked !== null) {
          difficultyKey = picked;
          audio.click();
          return;
        }
      }
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
        return;
      }
      if (actions & ACTION_DASH) pendingDash = true;
      if (actions & ACTION_SMOKE) pendingSmoke = true;
      if (actions & ACTION_CRACKER) pendingCracker = true;
      if (click !== null) {
        const field = renderer.toField(click.clientX, click.clientY);
        moveTarget = { x: field.x, y: field.y };
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_CAUGHT || screen === SCREEN_WIN || screen === SCREEN_DAWN) {
      if (actions & (ACTION_RESTART | ACTION_CONFIRM)) startGame();
    }
  }

  function moveDirection() {
    const keys = input.keys();
    if (keys.x !== 0 || keys.y !== 0) {
      moveTarget = null;
      return keys;
    }
    if (moveTarget !== null) {
      const dx = moveTarget.x - world.state.player.x;
      const dy = moveTarget.y - world.state.player.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 10) {
        moveTarget = null;
        return { x: 0, y: 0 };
      }
      return { x: dx / distance, y: dy / distance };
    }
    return { x: 0, y: 0 };
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The bazaar stays alive behind the title: guards patrol, cameras sweep.
      world.step(STEP, { x: 0, y: 0 }, { sneak: false, dash: false, smoke: false, cracker: false });
      return;
    }
    const move = moveDirection();
    const opts = {
      sneak: input.isSneaking(),
      dash: pendingDash,
      smoke: pendingSmoke,
      cracker: pendingCracker,
    };
    pendingDash = false;
    pendingSmoke = false;
    pendingCracker = false;
    const events = world.step(STEP, move, opts);
    playEventSounds(events);
    if (events & EVENT_CAUGHT) {
      endGame(SCREEN_CAUGHT, `Caught. Score ${world.state.score}. Best ${best}.`);
    } else if (events & EVENT_WIN) {
      endGame(SCREEN_WIN, `The Koi is yours. Score ${world.state.score}. Best ${best}.`);
    } else if (events & EVENT_DAWN) {
      endGame(SCREEN_DAWN, `Dawn breaks. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    syncHandle(screen);
    renderer.draw(world.state, screen, best, difficultyKey);
  }

  // Leaving the tab pauses a running game rather than letting the night run out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Floating Lantern Heist. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
