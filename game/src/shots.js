// DOCKLIGHT — screenshot staging. `?shot=<name>` puts the game into a
// fixed, readable state and freezes it, so a screenshot is a real render
// of the game's own code in a chosen moment. Nothing here is a mock:
// every staged state is one the game can reach by playing.
import { CONFIG } from './config.js';

function tileCentre(tx, ty) {
  return { x: tx * CONFIG.TILE + CONFIG.TILE / 2, y: ty * CONFIG.TILE + CONFIG.TILE / 2 };
}

function placeGuard(guard, tx, ty, facingDeg, state, meter) {
  const p = tileCentre(tx, ty);
  guard.x = p.x;
  guard.y = p.y;
  guard.angle = (facingDeg * Math.PI) / 180;
  guard.state = state;
  guard.meter = meter;
  guard.lastSeen = { x: p.x + Math.cos(guard.angle) * 120, y: p.y + Math.sin(guard.angle) * 120 };
}

function takeIntel(G, count) {
  for (let i = 0; i < count && i < G.level.intel.length; i += 1) {
    G.level.intel[i].taken = true;
  }
  G.intelGot = count;
}

// Stage one named moment on the live game object G. G must already
// have its level loaded (loadLevel first); this only poses the actors.
export function applyShot(G, name) {
  G.frozen = true;
  if (name === 'title') {
    G.phase = 'title';
    return;
  }
  if (name === 'cover') {
    // Level 2 mid-game: the courier crouched behind a container stack,
    // two patrol cones in frame, one guard suspicious with a half-full
    // meter, two of three intel already lifted.
    G.loadLevel(1);
    G.phase = 'playing';
    const p = tileCentre(4, 7);
    G.player.x = p.x;
    G.player.y = p.y;
    G.player.sneaking = true;
    G.player.faceAngle = Math.PI / 2;
    placeGuard(G.guards[0], 2, 6, 55, 'suspicious', 0.55);
    placeGuard(G.guards[2], 12, 3, 160, 'patrol', 0.08);
    takeIntel(G, 2);
    G.levelTime = 83;
    G.lightExposure = 0.2;
    return;
  }
  if (name === 'alarm') {
    // Level 1: a guard has gone to "!" and is chasing, red cone out,
    // the courier sprinting for the container lane.
    G.loadLevel(0);
    G.phase = 'playing';
    const p = tileCentre(13, 5);
    G.player.x = p.x;
    G.player.y = p.y;
    G.player.sneaking = false;
    G.player.faceAngle = 0;
    placeGuard(G.guards[1], 11, 5, 0, 'alert', 1);
    G.guards[1].lastSeen = { x: p.x, y: p.y };
    placeGuard(G.guards[0], 4, 3, 90, 'patrol', 0);
    takeIntel(G, 1);
    G.levelTime = 47;
    G.spotted = 1;
    return;
  }
  if (name === 'complete') {
    G.loadLevel(0);
    G.phase = 'complete';
    takeIntel(G, 3);
    G.levelTime = 96;
    G.spotted = 1;
    return;
  }
  if (name === 'win') {
    G.loadLevel(2);
    G.phase = 'win';
    G.totalTime = 512;
    G.spotted = 2;
    G.rank = 'GHOST';
    takeIntel(G, 3);
    return;
  }
  // Unknown shot name: fall back to the title screen.
  G.phase = 'title';
}

export function shotFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('shot');
  } catch (err) {
    return null;
  }
}
