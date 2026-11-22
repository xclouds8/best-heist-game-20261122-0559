// The Floating Lantern Heist — the bazaar itself. One fixed layout, so every
// run plays the same room and the staged screenshots are repeatable: market
// stalls that block sight and movement, three patrolling guards, two sweeping
// brass lantern-cameras, five jade loot caches, scattered coins, the Golden Koi
// shrine at the north end and the escape boat at the south dock. The room has
// three routes to the shrine — the open centre lane, the west stalls and the
// east stalls — so a player can always pick a way around a cone.

import { DECK } from './config.js';

/** Stall rectangles (x, y, width, height). They block movement and line of sight. */
export const STALLS = [
  { x: 180, y: 180, width: 180, height: 70, name: 'Silk stall' },
  { x: 180, y: 420, width: 180, height: 70, name: 'Spice stall' },
  { x: 920, y: 180, width: 180, height: 70, name: 'Jade stall' },
  { x: 920, y: 420, width: 180, height: 70, name: 'Tea stall' },
  { x: 480, y: 330, width: 120, height: 60, name: 'Fish stall' },
  { x: 680, y: 330, width: 120, height: 60, name: 'Paper stall' },
  { x: 430, y: 470, width: 130, height: 60, name: 'Rice stall' },
  { x: 720, y: 470, width: 130, height: 60, name: 'Flower stall' },
];

/** Guard patrols: waypoints plus where each guard starts and faces. */
export const GUARD_PATROLS = [
  {
    name: 'Old Bao',
    waypoints: [
      { x: 300, y: 200 },
      { x: 300, y: 560 },
    ],
    start: { x: 300, y: 200 },
    facing: Math.PI / 2,
  },
  {
    name: 'Sister Mei',
    waypoints: [
      { x: 980, y: 560 },
      { x: 980, y: 200 },
    ],
    start: { x: 980, y: 560 },
    facing: -Math.PI / 2,
  },
  {
    name: 'Captain Rook',
    waypoints: [
      { x: 450, y: 240 },
      { x: 830, y: 240 },
    ],
    start: { x: 450, y: 240 },
    facing: 0,
  },
];

/** Brass lantern-cameras on poles: position, the direction they face at rest, and sweep. */
export const CAMERA_SPOTS = [
  { x: 470, y: 385, restAngle: Math.PI / 2, phase: 0 },
  { x: 810, y: 385, restAngle: -Math.PI / 2, phase: 1.6 },
];

/** Jade loot caches: the bonus loot. Five of them, one in each corner and one mid-west. */
export const JADE_SPOTS = [
  { x: 120, y: 140 },
  { x: 1160, y: 140 },
  { x: 120, y: 600 },
  { x: 1160, y: 600 },
  { x: 300, y: 305 },
];

/** Coins: the currency tools are bought with. */
export const COIN_SPOTS = [
  { x: 640, y: 560 },
  { x: 640, y: 460 },
  { x: 250, y: 330 },
  { x: 1030, y: 330 },
  { x: 420, y: 150 },
  { x: 860, y: 150 },
  { x: 120, y: 330 },
  { x: 1160, y: 330 },
  { x: 540, y: 620 },
  { x: 740, y: 620 },
  { x: 300, y: 640 },
  { x: 980, y: 640 },
];

/** The Golden Koi shrine: the loot target, north centre. */
export const SHRINE = { x: 640, y: 140, radius: 34 };

/** The escape boat dock: the getaway, south centre. */
export const BOAT = { x: 640, y: 652, width: 130, height: 34 };

/** Where the thief starts: on the dock, just north of the boat. */
export const PLAYER_START = { x: 640, y: 600 };

/** Decorative lanterns hung over the deck (purely visual, drawn in render.js). */
export const LANTERNS = [
  { x: 140, y: 120 },
  { x: 380, y: 120 },
  { x: 900, y: 120 },
  { x: 1140, y: 120 },
  { x: 140, y: 640 },
  { x: 380, y: 640 },
  { x: 900, y: 640 },
  { x: 1140, y: 640 },
  { x: 640, y: 300 },
  { x: 240, y: 300 },
  { x: 1040, y: 300 },
  { x: 240, y: 540 },
  { x: 1040, y: 540 },
];

/** The deck's edge, for clamping the thief and the guards inside the bazaar. */
export function deckBounds() {
  return DECK;
}
