// projectiles.js — shots, splashes, sparks and floating gold text.
// Projectiles home in on their target; Emberbloom shots burst and hurt
// everything nearby, Frostshard shots chill what they hit.

import { damageEnemy, slowEnemy } from './enemies.js';
import { towerDamage } from './towers.js';

/** Fire one shot from a tower at its target. */
export function fireProjectile(state, tower, target) {
  const kind = tower.kind;
  state.projectiles.push({
    kind,
    x: tower.x,
    y: tower.y,
    target,
    lastX: target.x,
    lastY: target.y,
    speed: tower.kind === 'ember' ? 300 : tower.kind === 'frost' ? 380 : 420,
    damage: towerDamage(tower),
    splash: kind === 'ember' ? 62 : 0,
    slow: kind === 'frost' ? 0.45 : 0,
    slowDur: kind === 'frost' ? 1.6 : 0,
    tower,
    dead: false,
  });
}

/** Chase the target; on arrival, deal damage (and splash / slow). */
export function updateProjectiles(state, dt) {
  for (const shot of state.projectiles) {
    if (shot.dead) continue;
    const target = shot.target;
    if (target && !target.dead && !target.leaked) {
      shot.lastX = target.x;
      shot.lastY = target.y;
    }
    const dx = shot.lastX - shot.x;
    const dy = shot.lastY - shot.y;
    const dist = Math.hypot(dx, dy);
    const step = shot.speed * dt;
    if (dist <= step + 6) {
      shot.dead = true;
      hitTarget(state, shot);
    } else {
      shot.x += (dx / dist) * step;
      shot.y += (dy / dist) * step;
    }
  }
  state.projectiles = state.projectiles.filter((s) => !s.dead);
}

function hitTarget(state, shot) {
  const target = shot.target;
  const burstAt = (x, y, color, n) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 120;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.35 + Math.random() * 0.3, maxLife: 0.65,
        size: 2 + Math.random() * 3, color,
      });
    }
  };
  // Splash shots hurt everything in the blast; others hit one enemy.
  if (shot.splash > 0) {
    burstAt(shot.lastX, shot.lastY, '#ff9a3d', 14);
    for (const enemy of [...state.enemies]) {
      if (enemy.dead || enemy.leaked) continue;
      const d = Math.hypot(enemy.x - shot.lastX, enemy.y - shot.lastY);
      if (d <= shot.splash + enemy.radius) {
        if (damageEnemy(enemy, shot.damage)) killEnemy(state, enemy, shot.tower);
      }
    }
    return;
  }
  if (!target || target.dead || target.leaked) {
    burstAt(shot.lastX, shot.lastY, '#b7aee0', 4);
    return;
  }
  burstAt(target.x, target.y, shot.kind === 'frost' ? '#6ee7d8' : '#c8f79a', 6);
  if (shot.slow > 0) slowEnemy(target, shot.slow, state.time + shot.slowDur);
  if (damageEnemy(target, shot.damage)) killEnemy(state, target, shot.tower);
}

/** Pay out a kill: gold, score, floating text and a little sparkle. */
export function killEnemy(state, enemy, tower) {
  if (tower) tower.kills++;
  state.kills++;
  state.score += 10;
  state.gold += enemy.reward;
  addFloater(state, enemy.x, enemy.y - 14, `+${enemy.reward} 🪙`, '#ffd76a');
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 30 + Math.random() * 90;
    state.particles.push({
      x: enemy.x, y: enemy.y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
      life: 0.4 + Math.random() * 0.35, maxLife: 0.75,
      size: 2 + Math.random() * 3, color: '#ffb347',
    });
  }
}

/** A short-lived text that floats up and fades (gold, damage, warnings). */
export function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color, life: 1.0 });
}

/** Drift particles and fade them out. */
export function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 60 * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

/** Float texts upward and fade them out. */
export function updateFloaters(state, dt) {
  for (const f of state.floaters) {
    f.y -= 28 * dt;
    f.life -= dt * 0.9;
  }
  state.floaters = state.floaters.filter((f) => f.life > 0);
}
