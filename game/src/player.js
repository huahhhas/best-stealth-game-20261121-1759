// DOCKLIGHT — the courier. Walk, sneak, make noise, grab intel, reach
// the boat. Movement is axis-separated against wall tiles so the player
// slides along containers instead of sticking to them.
import { CONFIG } from './config.js';
import { isWallAt } from './world.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: CONFIG.PLAYER_RADIUS,
    sneaking: false,
    moving: false,
    faceAngle: -Math.PI / 2,
    stepTimer: 0,
    noiseRadius: 0,
    noisePulse: 0,
  };
}

// Try to move by (dx, dy), resolving each axis against walls in turn.
function moveAxis(player, grid, dx, dy) {
  const r = player.radius;
  const nx = player.x + dx;
  if (
    !isWallAt(grid, nx - r, player.y - r) &&
    !isWallAt(grid, nx + r, player.y - r) &&
    !isWallAt(grid, nx - r, player.y + r) &&
    !isWallAt(grid, nx + r, player.y + r)
  ) {
    player.x = nx;
  }
  const ny = player.y + dy;
  if (
    !isWallAt(grid, player.x - r, ny - r) &&
    !isWallAt(grid, player.x + r, ny - r) &&
    !isWallAt(grid, player.x - r, ny + r) &&
    !isWallAt(grid, player.x + r, ny + r)
  ) {
    player.y = ny;
  }
}

// One tick. `input` is {x, y} in -1..1 plus {sneak}. Returns 'step'
// on a footstep, which the main loop turns into sound and a noise ring.
export function updatePlayer(player, dt, input, grid) {
  player.sneaking = !!input.sneak;
  const len = Math.hypot(input.x, input.y);
  player.moving = len > 0.01;
  if (!player.moving) {
    player.noiseRadius = 0;
    return null;
  }
  const nx = input.x / Math.max(1, len);
  const ny = input.y / Math.max(1, len);
  const speed = player.sneaking ? CONFIG.PLAYER_SNEAK_SPEED : CONFIG.PLAYER_WALK_SPEED;
  moveAxis(player, grid, nx * speed * dt, ny * speed * dt);
  player.faceAngle = Math.atan2(ny, nx);
  player.noiseRadius = player.sneaking ? CONFIG.NOISE_SNEAK : CONFIG.NOISE_WALK;
  player.noisePulse += dt;
  player.stepTimer -= dt;
  if (player.stepTimer <= 0) {
    player.stepTimer = player.sneaking
      ? CONFIG.NOISE_STEP_INTERVAL_SNEAK
      : CONFIG.NOISE_STEP_INTERVAL_WALK;
    return 'step';
  }
  return null;
}

// True when the player stands close enough to an intel crate to grab it.
export function nearIntel(player, crate) {
  if (crate.taken) return false;
  return Math.hypot(player.x - crate.x, player.y - crate.y) < CONFIG.PICKUP_RADIUS;
}

// True when the player stands on the exit.
export function atExit(player, exit) {
  return Math.hypot(player.x - exit.x, player.y - exit.y) < CONFIG.EXIT_RADIUS;
}

// True when any guard is close enough to catch the player.
export function caughtBy(player, guards) {
  for (const g of guards) {
    if (g.state !== 'alert') continue;
    if (Math.hypot(player.x - g.x, player.y - g.y) < g.radius + player.radius + 2) {
      return g;
    }
  }
  return null;
}
