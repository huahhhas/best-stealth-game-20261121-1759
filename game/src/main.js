// DOCKLIGHT — the game loop and state machine: title, playing, paused,
// level-complete, caught and win. Owns the level, the actors, the
// searchlights and the HUD numbers; the systems in the other files do
// the moving, seeing, drawing and sounding.
import { CONFIG } from './config.js';
import { parseLevel, levelCount, lineOfSightClear } from './world.js';
import { createGuard, updateGuard, hearNoise } from './guards.js';
import { createPlayer, updatePlayer, nearIntel, atExit, caughtBy } from './player.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { drawGame } from './render.js';
import { applyShot, shotFromUrl } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.VIEW_W;
canvas.height = CONFIG.VIEW_H;

const audio = createAudio();
const input = createInput(canvas);

const G = {
  phase: 'title',
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  lights: [],
  intelGot: 0,
  levelTime: 0,
  totalTime: 0,
  spotted: 0,
  lightExposure: 0,
  rank: 'ROOKIE',
  time: 0,
  frozen: false,
};

// Load a level fresh: new yard, new guards on their routes, the courier
// at the start, the clock and the intel counter reset.
G.loadLevel = function loadLevel(index) {
  G.levelIndex = index;
  G.level = parseLevel(index);
  G.player = createPlayer(G.level.player);
  G.guards = G.level.guards.map((def, i) => createGuard(def, i));
  G.lights = G.level.lights.map((l) => ({ ...l, angle: l.start }));
  G.intelGot = 0;
  G.levelTime = 0;
  G.lightExposure = 0;
  G.phase = 'playing';
};

function rankFor(spotted) {
  if (spotted === 0) return 'GHOST';
  if (spotted <= 3) return 'SHADOW';
  return 'ROOKIE';
}

function startGame() {
  G.totalTime = 0;
  G.spotted = 0;
  G.rank = 'ROOKIE';
  G.loadLevel(0);
  audio.ensure();
  audio.click();
}

function nextLevel() {
  if (G.levelIndex + 1 < levelCount()) {
    G.loadLevel(G.levelIndex + 1);
  } else {
    G.phase = 'win';
    G.rank = rankFor(G.spotted);
    audio.win();
  }
  audio.click();
}

// One searchlight tick: sweep the beam, and if the courier stands lit,
// fill the exposure meter until the nearest guard is sent to investigate.
function updateLights(dt) {
  for (const light of G.lights) {
    light.angle = light.start + Math.sin((G.time * Math.PI * 2) / light.period) * light.sweep;
    const dx = G.player.x - light.x;
    const dy = G.player.y - light.y;
    const dist = Math.hypot(dx, dy);
    let lit = false;
    if (dist < CONFIG.LIGHT_RANGE) {
      const toPlayer = Math.atan2(dy, dx);
      let diff = Math.abs(toPlayer - light.angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      lit = diff < CONFIG.LIGHT_HALF_ANGLE &&
        lineOfSightClear(G.level.grid, light.x, light.y, G.player.x, G.player.y);
    }
    if (lit && !G.player.sneaking) {
      G.lightExposure = Math.min(1, G.lightExposure + CONFIG.LIGHT_FILL * dt);
    } else if (lit) {
      G.lightExposure = Math.min(1, G.lightExposure + CONFIG.LIGHT_FILL * 0.4 * dt);
    } else {
      G.lightExposure = Math.max(0, G.lightExposure - CONFIG.LIGHT_DECAY * dt);
    }
  }
  if (G.lightExposure >= 1) {
    let nearest = null;
    let best = Infinity;
    for (const guard of G.guards) {
      const d = Math.hypot(guard.x - G.player.x, guard.y - G.player.y);
      if (d < best) { best = d; nearest = guard; }
    }
    if (nearest) {
      nearest.state = 'alert';
      nearest.meter = 1;
      nearest.lastSeen = { x: G.player.x, y: G.player.y };
      G.spotted += 1;
      audio.alertSting();
    }
    G.lightExposure = 0.3;
  }
}

function updatePlaying(dt) {
  G.levelTime += dt;
  const step = updatePlayer(G.player, dt, { x: input.moveX, y: input.moveY, sneak: input.sneak }, G.level.grid);
  if (step === 'step') {
    audio.footstep(0, 0.12, G.player.sneaking);
    for (const guard of G.guards) {
      hearNoise(guard, G.player.x, G.player.y, G.player.noiseRadius);
    }
  }
  const events = [];
  for (const guard of G.guards) {
    updateGuard(guard, dt, G.player, G.level.grid, events);
  }
  for (const event of events) {
    if (event.type === 'alert') {
      G.spotted += 1;
      audio.alertSting();
    } else if (event.type === 'step') {
      const dx = event.guard.x - G.player.x;
      const dist = Math.hypot(dx, event.guard.y - G.player.y);
      if (dist < 420) {
        audio.footstep(Math.max(-1, Math.min(1, dx / 200)), 0.22 * (1 - dist / 420), false);
      }
    }
  }
  updateLights(dt);
  // Intel: walking over a crate lifts it.
  for (const crate of G.level.intel) {
    if (nearIntel(G.player, crate)) {
      crate.taken = true;
      G.intelGot += 1;
      audio.pickup();
    }
  }
  // The boat opens once all three crates are lifted.
  if (G.intelGot >= CONFIG.INTEL_PER_LEVEL && atExit(G.player, G.level.exit)) {
    G.totalTime += G.levelTime;
    G.phase = 'complete';
    audio.levelClear();
    return;
  }
  const catcher = caughtBy(G.player, G.guards);
  if (catcher) {
    G.phase = 'caught';
    audio.caught();
  }
}

// Buttons the current screen shows, in canvas pixels. The renderer
// draws them at these same spots.
function buttonsForPhase() {
  if (G.phase === 'title') return [{ id: 'start', x: 640, y: 470 }];
  if (G.phase === 'paused') {
    return [
      { id: 'resume', x: 640, y: 470 },
      { id: 'restart', x: 640, y: 530 },
    ];
  }
  if (G.phase === 'complete') return [{ id: 'next', x: 640, y: 470 }];
  if (G.phase === 'caught') return [{ id: 'retry', x: 640, y: 470 }];
  if (G.phase === 'win') return [{ id: 'again', x: 640, y: 470 }];
  return [];
}

function handleButton(id) {
  if (id === 'start' || id === 'again') startGame();
  else if (id === 'resume') { G.phase = 'playing'; audio.click(); }
  else if (id === 'restart' || id === 'retry') { G.loadLevel(G.levelIndex); audio.click(); }
  else if (id === 'next') nextLevel();
}

function drainClicks() {
  while (input.clicks.length > 0) {
    const click = input.clicks.shift();
    for (const button of buttonsForPhase()) {
      if (Math.abs(click.x - button.x) <= 130 && Math.abs(click.y - button.y) <= 24) {
        handleButton(button.id);
        break;
      }
    }
  }
}

input.onAnyKey = () => audio.ensure();
input.onInteract = () => {
  if (G.phase !== 'playing') return;
  for (const crate of G.level.intel) {
    if (nearIntel(G.player, crate)) {
      crate.taken = true;
      G.intelGot += 1;
      audio.pickup();
      break;
    }
  }
};
input.onRestart = () => {
  if (G.phase === 'playing' || G.phase === 'paused' || G.phase === 'caught') {
    G.loadLevel(G.levelIndex);
  }
};
input.onPause = () => {
  if (G.phase === 'playing') G.phase = 'paused';
  else if (G.phase === 'paused') G.phase = 'playing';
};
input.onConfirm = () => {
  const first = buttonsForPhase()[0];
  if (first) handleButton(first.id);
};

// Boot: fresh yard behind the title screen, or a staged shot.
G.loadLevel(0);
G.phase = 'title';
const shot = shotFromUrl();
if (shot) applyShot(G, shot);
window.DOCKLIGHT = G;

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!G.frozen) {
    G.time += dt;
    if (G.phase === 'playing') updatePlaying(dt);
  }
  drainClicks();
  drawGame(ctx, G);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
