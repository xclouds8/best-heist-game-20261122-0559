// Keyboard and pointer input. Held keys give a steering direction; one-shot
// presses (start, pause, dash, tools, mute, difficulty) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost and
// never counted twice. A mouse click on the field sets a move target the thief
// walks toward; any held movement key overrides it at once.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_SMOKE = 8;
export const ACTION_CRACKER = 16;
export const ACTION_MUTE = 32;
export const ACTION_RESTART = 64;
export const ACTION_DIFF_EASY = 128;
export const ACTION_DIFF_NORMAL = 256;
export const ACTION_DIFF_HARD = 512;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const DASH = new Set(['Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let sneak = false;
  let actions = 0;
  /** The field point a click told the thief to walk to, or null. */
  let clickTarget = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') sneak = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (event.code === 'KeyQ') {
      if (!event.repeat) actions |= ACTION_SMOKE;
    } else if (event.code === 'KeyE') {
      if (!event.repeat) actions |= ACTION_CRACKER;
    } else if (event.code === 'Digit1') {
      if (!event.repeat) actions |= ACTION_DIFF_EASY;
    } else if (event.code === 'Digit2') {
      if (!event.repeat) actions |= ACTION_DIFF_NORMAL;
    } else if (event.code === 'Digit3') {
      if (!event.repeat) actions |= ACTION_DIFF_HARD;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') sneak = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
    sneak = false;
  });
  // Clicking the field sets a walk target (and counts as confirm on menus);
  // the loop converts the client point to field coordinates.
  target.addEventListener('pointerdown', (event) => {
    actions |= ACTION_CONFIRM;
    clickTarget = { clientX: event.clientX, clientY: event.clientY };
  });

  return {
    /** {x, y} steering from held keys, or {x: 0, y: 0} when none are held. */
    keys() {
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    isSneaking() {
      return sneak;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last click's client point, or null; cleared once read. */
    takeClickTarget() {
      const taken = clickTarget;
      clickTarget = null;
      return taken;
    },
    clearClickTarget() {
      clickTarget = null;
    },
  };
}
