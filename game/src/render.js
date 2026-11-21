// DOCKLIGHT — everything on screen. Canvas 2D, all art drawn in code:
// the concrete yard, container stacks, vision cones clipped against
// cover by raycast, guards, the courier, the HUD and every screen.
import { CONFIG } from './config.js';
import { castRay } from './world.js';
import { guardCone } from './guards.js';

const TILE = CONFIG.TILE;

// A stable pseudo-random pick from a tile's coordinates, so the yard
// looks varied but identical every frame.
function tileHash(tx, ty) {
  let h = (tx * 73856093) ^ (ty * 19349663);
  h = (h ^ (h >> 13)) >>> 0;
  return h / 4294967295;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A cone polygon from (x, y) along `angle`, clipped at walls by casting
// a ray for each slice of the arc.
function conePolygon(grid, x, y, angle, half, range) {
  const steps = 26;
  const points = [{ x, y }];
  for (let i = 0; i <= steps; i += 1) {
    const a = angle - half + (2 * half * i) / steps;
    const d = castRay(grid, x, y, a, range);
    points.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return points;
}

function drawCone(ctx, grid, x, y, angle, half, range, colour) {
  const pts = conePolygon(grid, x, y, angle, half, range);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawFloor(ctx, level, time) {
  for (let ty = 0; ty < CONFIG.ROWS; ty += 1) {
    for (let tx = 0; tx < CONFIG.COLS; tx += 1) {
      const x = tx * TILE;
      const y = ty * TILE;
      ctx.fillStyle = (tx + ty) % 2 === 0 ? CONFIG.COLOUR_FLOOR_A : CONFIG.COLOUR_FLOOR_B;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = CONFIG.COLOUR_FLOOR_LINE;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      // Faint painted yard markings on some open tiles.
      if (level.grid[ty][tx] === 0 && tileHash(tx, ty) > 0.86) {
        ctx.fillStyle = 'rgba(255, 200, 60, 0.10)';
        ctx.fillRect(x + 8, y + TILE / 2 - 2, TILE - 16, 4);
      }
    }
  }
  // The dock edge along the bottom: water beyond the fence line.
  void time;
}

function drawContainer(ctx, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  const alt = tileHash(tx, ty) > 0.5;
  const base = alt ? CONFIG.COLOUR_CONTAINER_ALT : CONFIG.COLOUR_CONTAINER;
  const dark = alt ? '#38504f' : CONFIG.COLOUR_CONTAINER_DARK;
  ctx.fillStyle = base;
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = dark;
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(x + 8 + i * 11, y + 5, 4, TILE - 10);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(x + 2, y + 2, TILE - 4, 8);
}

function drawIntel(ctx, crate, time) {
  const pulse = 0.55 + 0.35 * Math.sin(time * 4);
  ctx.save();
  ctx.shadowColor = 'rgba(255, 190, 60, 0.9)';
  ctx.shadowBlur = 18 * pulse;
  ctx.fillStyle = '#c98f2b';
  roundRect(ctx, crate.x - 15, crate.y - 15, 30, 30, 5);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#2b1d05';
  ctx.lineWidth = 2;
  ctx.strokeRect(crate.x - 15, crate.y - 15, 30, 30);
  ctx.fillStyle = '#241a04';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('i', crate.x, crate.y + 1);
  ctx.fillStyle = `rgba(255, 210, 90, ${0.35 + 0.3 * pulse})`;
  ctx.beginPath();
  ctx.arc(crate.x, crate.y, 26 + 4 * pulse, 0, Math.PI * 2);
  ctx.stroke();
}

function drawExit(ctx, exit, open, time) {
  const glow = open ? 0.6 + 0.4 * Math.sin(time * 3) : 0.15;
  // The moored boat: hull, cabin, mast light.
  ctx.save();
  ctx.shadowColor = open ? 'rgba(90, 230, 160, 0.9)' : 'rgba(90, 160, 230, 0.5)';
  ctx.shadowBlur = 16 * glow + 4;
  ctx.fillStyle = open ? '#2f8f5f' : '#3a5a78';
  ctx.beginPath();
  ctx.moveTo(exit.x - 26, exit.y - 10);
  ctx.lineTo(exit.x + 26, exit.y - 10);
  ctx.lineTo(exit.x + 18, exit.y + 16);
  ctx.lineTo(exit.x - 18, exit.y + 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#dfe8ee';
  ctx.fillRect(exit.x - 8, exit.y - 22, 16, 14);
  ctx.fillStyle = open ? '#5fe6a0' : '#7fa8c9';
  ctx.beginPath();
  ctx.arc(exit.x, exit.y - 26, 4 + 2 * glow, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = open ? '#bff5d6' : '#9db8cc';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT — GO!' : 'EXIT · LOCKED', exit.x, exit.y + 32);
}

function drawGuard(ctx, guard, time) {
  const cone = guardCone(guard);
  // Vision cone is drawn by the caller before the body; here the body.
  const body = guard.state === 'alert' ? '#c23b2e' : guard.state === 'suspicious' ? '#c98a1e' : '#4a6b8a';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(guard.x + 2, guard.y + 4, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0e1418';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Cap brim shows facing.
  ctx.fillStyle = '#1d2b36';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 8, 0, Math.PI * 2);
  ctx.fill();
  const fx = guard.x + Math.cos(guard.angle) * 18;
  const fy = guard.y + Math.sin(guard.angle) * 18;
  ctx.strokeStyle = '#ffd65a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  void time;
  // State mark and detection meter above the guard.
  const mark = guard.state === 'alert' ? '!' : guard.state === 'suspicious' || guard.state === 'search' ? '?' : '';
  if (mark) {
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(mark, guard.x, guard.y - 30);
    ctx.fillStyle = guard.state === 'alert' ? '#ff5148' : '#ffc23d';
    ctx.fillText(mark, guard.x, guard.y - 30);
  }
  if (guard.meter > 0.02) {
    const w = 34;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(guard.x - w / 2, guard.y - 46, w, 6);
    ctx.fillStyle = guard.meter >= CONFIG.ALERT_AT ? '#ff5148' : '#ffc23d';
    ctx.fillRect(guard.x - w / 2, guard.y - 46, w * guard.meter, 6);
  }
}

function drawPlayer(ctx, player, time) {
  // Noise rings while moving: the sound you make, made visible.
  if (player.moving && player.noiseRadius > 0) {
    const phase = (player.noisePulse % 0.9) / 0.9;
    ctx.strokeStyle = `rgba(255, 220, 120, ${0.35 * (1 - phase)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.noiseRadius * phase + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(player.x + 2, player.y + 4, 15, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const crouch = player.sneaking;
  ctx.fillStyle = crouch ? '#7a6a3f' : '#d8b13c';
  ctx.beginPath();
  ctx.arc(player.x, player.y, crouch ? 12 : 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#241a04';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood + facing tick.
  ctx.fillStyle = '#3d2f10';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 7, 0, Math.PI * 2);
  ctx.fill();
  const fx = player.x + Math.cos(player.faceAngle) * 17;
  const fy = player.y + Math.sin(player.faceAngle) * 17;
  ctx.strokeStyle = '#fff3c4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  if (crouch) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', player.x, player.y - 22);
  }
  void time;
}

function drawLights(ctx, level, lights) {
  for (const light of lights) {
    drawCone(ctx, level.grid, light.x, light.y, light.angle, CONFIG.LIGHT_HALF_ANGLE, CONFIG.LIGHT_RANGE, CONFIG.COLOUR_LIGHT_CONE);
    ctx.fillStyle = '#8a7a3a';
    ctx.fillRect(light.x - 4, light.y - 4, 8, 8);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(light.x, light.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function drawHud(ctx, G) {
  const W = CONFIG.VIEW_W;
  ctx.fillStyle = '#10141a';
  ctx.fillRect(0, 0, W, CONFIG.HUD_H);
  ctx.fillStyle = '#ffd65a';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('DOCKLIGHT', 16, CONFIG.HUD_H / 2);
  ctx.fillStyle = '#c8d2dc';
  ctx.font = '15px sans-serif';
  ctx.fillText(G.level.name, 180, CONFIG.HUD_H / 2 + 1);
  // Intel counter.
  ctx.fillStyle = '#ffd65a';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`INTEL ${G.intelGot} / ${CONFIG.INTEL_PER_LEVEL}`, 560, CONFIG.HUD_H / 2);
  // Timer.
  ctx.fillStyle = '#e8eef4';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(formatTime(G.levelTime), 700, CONFIG.HUD_H / 2);
  // Alert pill.
  const alert = G.guards.some((g) => g.state === 'alert');
  const wary = !alert && (G.guards.some((g) => g.state === 'suspicious' || g.state === 'search') || G.lightExposure > 0.4);
  const label = alert ? '● ALERT' : wary ? '● SUSPICIOUS' : '○ UNSEEN';
  const colour = alert ? '#ff5148' : wary ? '#ffc23d' : '#5fe6a0';
  ctx.fillStyle = colour;
  roundRect(ctx, 790, 10, 150, 28, 14);
  ctx.fill();
  ctx.fillStyle = '#10141a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(label, 865, CONFIG.HUD_H / 2 + 1);
  // Spotted count.
  ctx.fillStyle = '#9aa7b4';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`SPOTTED ${G.spotted}×`, W - 24, CONFIG.HUD_H / 2);
  // Bottom hint bar.
  ctx.fillStyle = '#10141a';
  ctx.fillRect(0, CONFIG.VIEW_H - CONFIG.BOTTOM_H, W, CONFIG.BOTTOM_H);
  ctx.fillStyle = '#8b98a5';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD / arrows move · SHIFT sneak · E grab intel · R restart · ESC menu', 16, CONFIG.VIEW_H - CONFIG.BOTTOM_H / 2 + 1);
  ctx.textAlign = 'right';
  ctx.fillText(G.level.sub, W - 16, CONFIG.VIEW_H - CONFIG.BOTTOM_H / 2 + 1);
}

function drawOverlay(ctx, title, lines, buttons) {
  ctx.fillStyle = 'rgba(8, 11, 15, 0.78)';
  ctx.fillRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd65a';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(title, CONFIG.VIEW_W / 2, 210);
  ctx.fillStyle = '#e8eef4';
  ctx.font = '20px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, CONFIG.VIEW_W / 2, 280 + i * 34);
  });
  buttons.forEach((b) => {
    ctx.fillStyle = b.hot ? '#ffd65a' : '#2a333d';
    roundRect(ctx, b.x - 130, b.y - 24, 260, 48, 8);
    ctx.fill();
    ctx.fillStyle = b.hot ? '#10141a' : '#e8eef4';
    ctx.font = 'bold 18px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x, b.y + 1);
  });
}

// The whole frame: yard, cones, actors, HUD, then the screen overlay
// for the current phase.
export function drawGame(ctx, G) {
  const time = G.time;
  ctx.save();
  ctx.clearRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);
  ctx.fillStyle = '#0c0f13';
  ctx.fillRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);
  ctx.translate(0, CONFIG.HUD_H);
  drawFloor(ctx, G.level, time);
  // Searchlight cones sit under the guard cones.
  drawLights(ctx, G.level, G.lights, time);
  // Guard vision cones, clipped against containers.
  for (const guard of G.guards) {
    const cone = guardCone(guard);
    drawCone(ctx, G.level.grid, guard.x, guard.y, guard.angle, cone.half, cone.range, cone.colour);
  }
  // Containers above the cones so cover reads at a glance.
  for (let ty = 0; ty < CONFIG.ROWS; ty += 1) {
    for (let tx = 0; tx < CONFIG.COLS; tx += 1) {
      if (G.level.grid[ty][tx] === 1) drawContainer(ctx, tx, ty);
    }
  }
  for (const crate of G.level.intel) {
    if (!crate.taken) drawIntel(ctx, crate, time);
  }
  drawExit(ctx, G.level.exit, G.intelGot >= CONFIG.INTEL_PER_LEVEL, time);
  for (const guard of G.guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, G.player, time);
  ctx.restore();
  drawHud(ctx, G);

  if (G.phase === 'title') {
    drawOverlay(ctx, 'DOCKLIGHT', [
      'Night shift on the container docks. You are the courier.',
      'Grab 3 intel crates, then reach the boat — unseen.',
      'Guards patrol fixed routes. Their cones are their eyes.',
      'Sneak (SHIFT) to stay quiet. Run, and they will hear you.',
    ], [
      { label: '▶  START — LEVEL 1', x: 640, y: 470, hot: true, id: 'start' },
    ]);
  } else if (G.phase === 'paused') {
    drawOverlay(ctx, 'PAUSED', [
      'The yard waits. The guards do not — take your time.',
      'WASD move · SHIFT sneak · E grab intel · R restart',
    ], [
      { label: 'RESUME', x: 640, y: 470, hot: true, id: 'resume' },
      { label: 'RESTART LEVEL', x: 640, y: 530, hot: false, id: 'restart' },
    ]);
  } else if (G.phase === 'complete') {
    drawOverlay(ctx, 'LEVEL CLEAR', [
      `${G.level.name} — all intel secured, boat reached unseen.`,
      `Time ${formatTime(G.levelTime)} · Spotted ${G.spotted}× this run`,
    ], [
      { label: G.levelIndex < 2 ? 'NEXT LEVEL  ▶' : 'FINISH  ▶', x: 640, y: 470, hot: true, id: 'next' },
    ]);
  } else if (G.phase === 'caught') {
    drawOverlay(ctx, 'CAUGHT!', [
      'A guard got you. The yard keeps its secrets — this time.',
      `You had ${G.intelGot} / ${CONFIG.INTEL_PER_LEVEL} intel on ${G.level.name}.`,
    ], [
      { label: '↻  TRY AGAIN', x: 640, y: 470, hot: true, id: 'retry' },
    ]);
  } else if (G.phase === 'win') {
    drawOverlay(ctx, 'GHOST OF THE DOCKS', [
      'All three yards crossed. Every crate lifted. The boat is yours.',
      `Total time ${formatTime(G.totalTime)} · Spotted ${G.spotted}× · Rank: ${G.rank}`,
      'DOCKLIGHT — a stealth game in three nights.',
    ], [
      { label: '↻  PLAY AGAIN', x: 640, y: 470, hot: true, id: 'again' },
    ]);
  }
}

export { formatTime };
