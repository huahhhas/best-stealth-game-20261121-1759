// DOCKLIGHT — the three yards. Each level is a tile map plus the patrol
// routes and searchlights that make it. `#` is a container stack: it
// blocks movement and blocks sight, so it is the cover. `.` is open
// concrete. `P` is where the courier starts, `I` an intel crate, `E`
// the moored boat that is the exit. Guard routes are tile waypoints the
// patrol walks back and forth along; every waypoint sits on open floor.
import { CONFIG } from './config.js';

const LEVELS = [
  {
    name: 'LEVEL 1 — FIRST SHIFT',
    sub: 'Three guards, wide lanes. Learn the patrols.',
    map: [
      '####################',
      '#P....#......#....I#',
      '#.....#......#.....#',
      '#..#..#..##..#..#..#',
      '#..#.....##.....#..#',
      '#.....#......#.....#',
      '#..I..#..#...#..E..#',
      '#.....#..#...#.....#',
      '#..I..#......#..#..#',
      '####################',
    ],
    guards: [
      { route: [[4, 1], [4, 8]] },
      { route: [[11, 2], [11, 8]] },
      { route: [[14, 7], [18, 7]] },
    ],
    lights: [],
  },
  {
    name: 'LEVEL 2 — FLOODLIGHTS',
    sub: 'Five guards and sweeping searchlights. Mind the light.',
    map: [
      '####################',
      '#P...#....#....#..I#',
      '#....#....#....#...#',
      '#.#..#..#.#..#.#...#',
      '#.#.....#....#.#.#.#',
      '#....#....#....#...#',
      '#..I.#..#.#..#.#.E.#',
      '#....#.............#',
      '#..#.#....#I.#.#...#',
      '####################',
    ],
    guards: [
      { route: [[2, 1], [2, 8]] },
      { route: [[1, 2], [4, 2]] },
      { route: [[12, 1], [12, 7]] },
      { route: [[16, 7], [18, 7]] },
      { route: [[7, 5], [7, 8]] },
    ],
    lights: [
      { tx: 9, ty: 3, start: 0.6, sweep: 1.1, period: 7 },
      { tx: 16, ty: 5, start: 2.4, sweep: 0.9, period: 9 },
    ],
  },
  {
    name: 'LEVEL 3 — LOCKDOWN',
    sub: 'Seven guards, tight lanes, short safe windows.',
    map: [
      '####################',
      '#P..#...#....#...#I#',
      '#...#...#..#.#...#.#',
      '#.###...#..#.#.#.#.#',
      '#.....#....#...#I..#',
      '#.#####.#####.###..#',
      '#..I..#.....#....E.#',
      '#.....#..#..#.#....#',
      '#..#..#..#..#.#..#.#',
      '####################',
    ],
    guards: [
      { route: [[1, 1], [1, 8]] },
      { route: [[1, 4], [5, 4]] },
      { route: [[9, 1], [9, 3]] },
      { route: [[1, 7], [5, 7]] },
      { route: [[14, 1], [14, 4]] },
      { route: [[13, 6], [16, 6]] },
      { route: [[18, 2], [18, 7]] },
    ],
    lights: [
      { tx: 10, ty: 4, start: 0.2, sweep: 1.2, period: 6 },
      { tx: 7, ty: 7, start: 1.8, sweep: 1.0, period: 8 },
    ],
  },
];

// Turn a level's string map into the grid the systems use: 1 is a wall
// tile, 0 is open floor. Also pulls out the player start, the intel
// crates and the exit as pixel positions.
export function parseLevel(index) {
  const def = LEVELS[index];
  const grid = [];
  let player = { x: 96, y: 96 };
  const intel = [];
  let exit = { x: 0, y: 0 };
  for (let ty = 0; ty < def.map.length; ty += 1) {
    const row = [];
    for (let tx = 0; tx < def.map[ty].length; tx += 1) {
      const ch = def.map[ty][tx];
      row.push(ch === '#' ? 1 : 0);
      const cx = tx * CONFIG.TILE + CONFIG.TILE / 2;
      const cy = ty * CONFIG.TILE + CONFIG.TILE / 2;
      if (ch === 'P') player = { x: cx, y: cy };
      if (ch === 'I') intel.push({ x: cx, y: cy, tx, ty, taken: false });
      if (ch === 'E') exit = { x: cx, y: cy, tx, ty };
    }
    grid.push(row);
  }
  const guards = def.guards.map((g) => ({
    route: g.route.map(([tx, ty]) => ({
      x: tx * CONFIG.TILE + CONFIG.TILE / 2,
      y: ty * CONFIG.TILE + CONFIG.TILE / 2,
    })),
  }));
  const lights = def.lights.map((l) => ({
    x: l.tx * CONFIG.TILE + CONFIG.TILE / 2,
    y: l.ty * CONFIG.TILE + CONFIG.TILE / 2,
    start: l.start,
    sweep: l.sweep,
    period: l.period,
  }));
  return {
    index,
    name: def.name,
    sub: def.sub,
    grid,
    player,
    intel,
    exit,
    guards,
    lights,
    map: def.map,
  };
}

export function levelCount() {
  return LEVELS.length;
}

// True when the tile at (tx, ty) is a wall, or outside the map.
export function isWallTile(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length) return true;
  if (tx < 0 || tx >= grid[0].length) return true;
  return grid[ty][tx] === 1;
}

// True when the pixel point (x, y) sits inside a wall tile.
export function isWallAt(grid, x, y) {
  const tx = Math.floor(x / CONFIG.TILE);
  const ty = Math.floor(y / CONFIG.TILE);
  return isWallTile(grid, tx, ty);
}

// Line of sight between two pixel points: sample along the line and
// fail the moment a sample lands in a wall tile. Containers block sight.
export function lineOfSightClear(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (isWallAt(grid, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

// Cast one ray from (x, y) along `angle` until it hits a wall or runs
// out to `range`; returns the distance it travelled. Used to clip
// vision cones and searchlights against cover.
export function castRay(grid, x, y, angle, range) {
  const step = 6;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let travelled = 0;
  let px = x;
  let py = y;
  while (travelled < range) {
    px += dx;
    py += dy;
    travelled += step;
    if (isWallAt(grid, px, py)) return travelled;
  }
  return range;
}
