// DOCKLIGHT — tuning constants. One place for every number the game
// balances on, so a level or a mechanic can be retuned without touching
// the systems that use it.
export const CONFIG = {
  // Canvas and playfield geometry.
  VIEW_W: 1280,
  VIEW_H: 720,
  HUD_H: 48,
  BOTTOM_H: 32,
  TILE: 64,
  COLS: 20,
  ROWS: 10,

  // Player movement (pixels per second).
  PLAYER_WALK_SPEED: 175,
  PLAYER_SNEAK_SPEED: 88,
  PLAYER_RADIUS: 14,

  // Noise: how far a moving player is heard, and how loud each step is.
  NOISE_WALK: 78,
  NOISE_SNEAK: 26,
  NOISE_STEP_INTERVAL_WALK: 0.34,
  NOISE_STEP_INTERVAL_SNEAK: 0.55,

  // Guards.
  GUARD_PATROL_SPEED: 72,
  GUARD_CHASE_SPEED: 158,
  GUARD_SEARCH_SPEED: 95,
  GUARD_RADIUS: 15,
  GUARD_TURN_SPEED: 3.4,

  // Vision: cone range, half-angle, and how fast being seen fills the
  // detection meter. Sneaking, distance and standing still all slow it.
  VISION_RANGE: 215,
  VISION_HALF_ANGLE: 0.58,
  DETECT_FILL_CLOSE: 1.35,
  DETECT_FILL_FAR: 0.55,
  DETECT_SNEAK_FACTOR: 0.45,
  DETECT_STILL_FACTOR: 0.6,
  DETECT_DECAY: 0.5,
  SUSPICIOUS_AT: 0.35,
  ALERT_AT: 1.0,

  // How long a guard hunts your last-seen spot before giving up.
  LOSE_SIGHT_AFTER: 2.5,
  SEARCH_SECONDS: 3.0,

  // Searchlights (levels 2 and 3): a lit player fills the exposure meter.
  LIGHT_RANGE: 260,
  LIGHT_HALF_ANGLE: 0.34,
  LIGHT_FILL: 0.85,
  LIGHT_DECAY: 0.4,

  // Intel and exit.
  INTEL_PER_LEVEL: 3,
  PICKUP_RADIUS: 30,
  EXIT_RADIUS: 30,

  // Colours.
  COLOUR_FLOOR_A: '#232a33',
  COLOUR_FLOOR_B: '#20262e',
  COLOUR_FLOOR_LINE: '#2b333d',
  COLOUR_CONTAINER: '#7a5a2e',
  COLOUR_CONTAINER_DARK: '#5d4423',
  COLOUR_CONTAINER_ALT: '#4a6b6e',
  COLOUR_CRATE: '#6e5136',
  COLOUR_WALL: '#11151a',
  COLOUR_CONE_PATROL: 'rgba(255, 214, 90, 0.16)',
  COLOUR_CONE_SUSPICIOUS: 'rgba(255, 170, 40, 0.30)',
  COLOUR_CONE_ALERT: 'rgba(255, 60, 50, 0.32)',
  COLOUR_LIGHT_CONE: 'rgba(255, 244, 180, 0.20)',
};
