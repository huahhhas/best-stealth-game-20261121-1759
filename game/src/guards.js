// DOCKLIGHT — guard patrols, vision cones and the detection meter.
// A guard cycles patrol -> suspicious "?" -> alert "!" -> search ->
// recover, so being seen is a scare with a way back, not an instant
// loss. Cover blocks sight through lineOfSightClear in world.js.
import { CONFIG } from './config.js';
import { lineOfSightClear } from './world.js';

export function createGuard(def, index) {
  const start = def.route[0];
  return {
    id: index,
    x: start.x,
    y: start.y,
    radius: CONFIG.GUARD_RADIUS,
    route: def.route,
    waypoint: 1 % def.route.length,
    dir: 1,
    angle: 0,
    state: 'patrol',
    meter: 0,
    lastSeen: null,
    loseTimer: 0,
    searchTimer: 0,
    lookTimer: 0,
    lookAngle: 0,
    stepTimer: 0,
    stepPhase: 0,
  };
}

// How strongly this guard can see the player right now: 0 when the
// player is out of range, outside the cone, or behind cover; up to 1
// when close and dead centre. Sneaking shrinks the effective range.
function visibility(grid, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = CONFIG.VISION_RANGE * (player.sneaking ? 0.72 : 1);
  if (dist > range) return 0;
  const toPlayer = Math.atan2(dy, dx);
  let diff = Math.abs(toPlayer - guard.angle);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  if (diff > CONFIG.VISION_HALF_ANGLE) return 0;
  if (!lineOfSightClear(grid, guard.x, guard.y, player.x, player.y)) return 0;
  const closeness = 1 - dist / range;
  const centred = 1 - diff / CONFIG.VISION_HALF_ANGLE;
  return 0.45 + 0.55 * closeness * (0.5 + 0.5 * centred);
}

// Turn the guard's facing toward `target` at most turnSpeed * dt.
function turnToward(guard, target, dt) {
  let diff = target - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const maxTurn = CONFIG.GUARD_TURN_SPEED * dt;
  guard.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
}

// Walk toward a point, stopping within `arrive` pixels. Returns true
// when arrived. Facing follows the walk direction.
function walkToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  turnToward(guard, Math.atan2(dy, dx), dt);
  guard.stepTimer -= dt;
  if (guard.stepTimer <= 0) {
    guard.stepTimer = 0.42;
    guard.stepPhase += 1;
    return 'step';
  }
  return false;
}

// A noise at (x, y) with the given radius: a guard inside it turns
// toward the sound and grows suspicious.
export function hearNoise(guard, x, y, radius) {
  if (guard.state === 'alert') return;
  const dist = Math.hypot(x - guard.x, y - guard.y);
  if (dist > radius + 30) return;
  guard.lastSeen = { x, y };
  if (guard.state === 'patrol') guard.state = 'suspicious';
  guard.meter = Math.min(0.9, guard.meter + 0.3);
}

// One tick of guard AI. `events` collects plain objects the main loop
// turns into sounds and HUD changes: {type:'alert'}, {type:'step', guard}.
export function updateGuard(guard, dt, player, grid, events) {
  const seen = visibility(grid, guard, player);
  if (seen > 0) {
    guard.lastSeen = { x: player.x, y: player.y };
    guard.loseTimer = 0;
    const stance = player.sneaking
      ? CONFIG.DETECT_SNEAK_FACTOR
      : player.moving
        ? 1
        : CONFIG.DETECT_STILL_FACTOR;
    const rate = (CONFIG.DETECT_FILL_FAR +
      (CONFIG.DETECT_FILL_CLOSE - CONFIG.DETECT_FILL_FAR) * seen) * stance;
    guard.meter = Math.min(1, guard.meter + rate * dt);
  } else {
    guard.meter = Math.max(0, guard.meter - CONFIG.DETECT_DECAY * dt);
  }

  if (guard.state === 'patrol') {
    const target = guard.route[guard.waypoint];
    const arrived = walkToward(guard, target.x, target.y, CONFIG.GUARD_PATROL_SPEED, dt);
    if (arrived === 'step') events.push({ type: 'step', guard });
    if (arrived === true) {
      guard.waypoint += guard.dir;
      if (guard.waypoint >= guard.route.length || guard.waypoint < 0) {
        guard.dir *= -1;
        guard.waypoint += guard.dir * 2;
      }
    }
    if (guard.meter >= CONFIG.SUSPICIOUS_AT) guard.state = 'suspicious';
  } else if (guard.state === 'suspicious') {
    // Freeze and stare at where the player was seen.
    if (guard.lastSeen) {
      turnToward(guard, Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x), dt);
    }
    if (guard.meter >= CONFIG.ALERT_AT) {
      guard.state = 'alert';
      events.push({ type: 'alert', guard });
    } else if (guard.meter <= 0.05) {
      guard.state = 'patrol';
    }
  } else if (guard.state === 'alert') {
    // Chase the last-seen spot. Lose the trail after a while unseen.
    if (seen > 0) {
      guard.loseTimer = 0;
    } else {
      guard.loseTimer += dt;
    }
    const target = guard.lastSeen || { x: guard.x, y: guard.y };
    const arrived = walkToward(guard, target.x, target.y, CONFIG.GUARD_CHASE_SPEED, dt);
    if (arrived === 'step') events.push({ type: 'step', guard });
    if (guard.loseTimer >= CONFIG.LOSE_SIGHT_AFTER) {
      guard.state = 'search';
      guard.searchTimer = CONFIG.SEARCH_SECONDS;
      guard.lookTimer = 0;
    }
  } else if (guard.state === 'search') {
    // Sweep the area around the last-seen spot, then stand down.
    guard.searchTimer -= dt;
    guard.lookTimer -= dt;
    if (guard.lookTimer <= 0) {
      guard.lookTimer = 0.9;
      guard.lookAngle = guard.angle + (Math.random() - 0.5) * 2.4;
    }
    turnToward(guard, guard.lookAngle, dt);
    if (guard.meter >= CONFIG.ALERT_AT && seen > 0) {
      guard.state = 'alert';
      guard.loseTimer = 0;
    } else if (guard.searchTimer <= 0) {
      guard.state = 'patrol';
      guard.meter = 0;
      guard.lastSeen = null;
    }
  }
}

// The cone the guard projects right now: range, half-angle and colour
// follow its state, so a cone reads as calm, wary or alarmed at a glance.
export function guardCone(guard) {
  if (guard.state === 'alert') {
    return { range: CONFIG.VISION_RANGE, half: CONFIG.VISION_HALF_ANGLE, colour: CONFIG.COLOUR_CONE_ALERT };
  }
  if (guard.state === 'suspicious' || guard.state === 'search') {
    return { range: CONFIG.VISION_RANGE, half: CONFIG.VISION_HALF_ANGLE, colour: CONFIG.COLOUR_CONE_SUSPICIOUS };
  }
  return { range: CONFIG.VISION_RANGE, half: CONFIG.VISION_HALF_ANGLE, colour: CONFIG.COLOUR_CONE_PATROL };
}
