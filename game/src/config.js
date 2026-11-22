// The Floating Lantern Heist — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size. A night bazaar on stilts
// over dark teal water: warm amber lanterns, jade loot, and a Golden Koi shrine.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The bazaar deck the thief walks on; outside it is dark water. */
export const DECK = { x: 40, y: 80, width: 1200, height: 600 };

export const PLAYER = {
  radius: 14,
  speed: 175,
  sneakSpeed: 96,
  dashSpeed: 430,
  dashTime: 0.16,
  dashCooldown: 2.0,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 72,
  suspiciousSpeed: 108,
  chaseSpeed: 192,
  investigateSpeed: 120,
  visionRange: 225,
  visionHalfAngle: 0.61,
  catchDistance: 30,
  scanPause: 1.4,
  lookAroundTime: 2.2,
};

export const CAMERA = {
  visionRange: 245,
  visionHalfAngle: 0.52,
  sweepHalfAngle: 1.05,
  sweepSpeed: 0.55,
};

export const DETECTION = {
  guardPerSecond: 58,
  cameraPerSecond: 72,
  sneakMultiplier: 0.5,
  decayPerSecond: 20,
  smokeDecayPerSecond: 8,
  suspiciousAt: 40,
  alarmAt: 100,
};

export const TOOLS = {
  smokeCost: 25,
  smokeSeconds: 4,
  smokeRadius: 90,
  crackerCost: 15,
  investigateSeconds: 4,
};

export const LOOT = {
  jadePoints: 100,
  coinPoints: 10,
  koiPoints: 500,
  ghostBonus: 300,
  koiGrabSeconds: 1.0,
};

export const DIFFICULTY = {
  easy: {
    key: 'easy',
    name: 'Paper Lantern',
    blurb: 'Slow patrols, sleepy cameras',
    detectionMultiplier: 0.7,
    guardSpeedMultiplier: 0.85,
    timerSeconds: 300,
  },
  normal: {
    key: 'normal',
    name: 'Festival Night',
    blurb: 'The bazaar as it is',
    detectionMultiplier: 1.0,
    guardSpeedMultiplier: 1.0,
    timerSeconds: 240,
  },
  hard: {
    key: 'hard',
    name: 'Typhoon Watch',
    blurb: 'Sharp eyes, short night',
    detectionMultiplier: 1.35,
    guardSpeedMultiplier: 1.15,
    timerSeconds: 200,
  },
};

export const PALETTE = {
  backdrop: '#04141a',
  waterDeep: '#06232b',
  water: '#0a3540',
  waterShimmer: '#12505f',
  deck: '#3a2a1c',
  deckPlank: '#4a3624',
  deckEdge: '#6b4e2e',
  stallRoof: '#8c2f2f',
  stallRoofDark: '#6e2323',
  stallCloth: '#c96f2e',
  stallWood: '#5d4126',
  lanternGlow: '#ffb347',
  lanternCore: '#ffd98a',
  jade: '#2fd6a3',
  jadeDark: '#0f8a66',
  gold: '#f5c542',
  goldBright: '#ffe27a',
  guard: '#2b2f3a',
  guardTrim: '#ffb347',
  cone: 'rgba(255, 179, 71, 0.20)',
  coneEdge: 'rgba(255, 179, 71, 0.55)',
  cameraCone: 'rgba(255, 92, 92, 0.16)',
  cameraConeEdge: 'rgba(255, 92, 92, 0.5)',
  thief: '#e8f4ff',
  thiefCoat: '#274b63',
  smoke: 'rgba(214, 228, 235, 0.55)',
  panel: '#0d2733',
  panelEdge: '#ffb347',
  text: '#f4ead2',
  muted: '#9db8ad',
  calm: '#2fd6a3',
  suspicious: '#ffb347',
  alarm: '#ff5c5c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'floating-lantern-heist.best';
