// enemies.js — the Gloom Moths and their kin: what they are, how they walk
// the stone path, and what happens when they reach the Heart Bloom.

import { PATH_POINTS_PX } from './board.js';

// Enemy kinds. hp and speed are base values for wave 1; waves scale them up.
// leak is how much Heart Bloom HP one of them eats when it gets through.
export const ENEMY_TYPES = {
  moth: {
    name: 'Gloom Moth',
    hp: 30, speed: 55, reward: 7, radius: 13, leak: 1,
    body: '#3d3358', wing: '#5a4a86', eye: '#ffb347', glow: '#ff7b2f',
  },
  flutterer: {
    name: 'Flutterer',
    hp: 18, speed: 96, reward: 8, radius: 11, leak: 1,
    body: '#2e2a52', wing: '#7a6ab0', eye: '#6ee7d8', glow: '#6ee7d8',
  },
  beetle: {
    name: 'Armored Beetle',
    hp: 115, speed: 33, reward: 15, radius: 17, leak: 2,
    body: '#4a3a2e', wing: '#6e5638', eye: '#ffd76a', glow: '#ffd76a',
  },
  boss: {
    name: 'Moth Queen',
    hp: 950, speed: 42, reward: 150, radius: 25, leak: 10,
    body: '#241a3e', wing: '#8a5adf', eye: '#ff5d73', glow: '#ff7ad9',
  },
};

// How much tougher enemies get each wave: HP grows ~22% a wave, speed ~2%.
export function waveHpMultiplier(wave) {
  return 1 + 0.22 * (wave - 1);
}
export function waveSpeedMultiplier(wave) {
  return Math.min(1.35, 1 + 0.02 * (wave - 1));
}

/** Create one enemy of a kind at the path's start, scaled for its wave. */
export function spawnEnemy(kind, wave) {
  const type = ENEMY_TYPES[kind];
  const start = PATH_POINTS_PX[0];
  return {
    kind,
    type,
    x: start.x,
    y: start.y,
    waypoint: 1, // index of the next waypoint to walk toward
    hp: Math.round(type.hp * waveHpMultiplier(wave)),
    maxHp: Math.round(type.hp * waveHpMultiplier(wave)),
    speed: type.speed * waveSpeedMultiplier(wave),
    radius: type.radius,
    reward: type.reward,
    leak: type.leak,
    slowUntil: 0, // game time until which the enemy is slowed
    slowFactor: 1, // 1 = full speed, lower = slower
    flash: 0, // hit-flash timer (seconds) for the renderer
    wobble: Math.random() * Math.PI * 2, // wing-flutter phase
    distance: 0, // total distance walked (towers target the furthest along)
    dead: false,
    leaked: false,
  };
}

/** Slow an enemy: it walks at (1 - amount) speed until `until` (game time). */
export function slowEnemy(enemy, amount, until) {
  enemy.slowFactor = Math.min(enemy.slowFactor, 1 - amount);
  enemy.slowUntil = Math.max(enemy.slowUntil, until);
}

/** Hurt an enemy; returns true when the hit killed it. */
export function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  enemy.flash = 0.12;
  if (enemy.hp <= 0) {
    enemy.dead = true;
    return true;
  }
  return false;
}

/**
 * Walk every living enemy one step along the path. Returns the list of
 * enemies that reached the Heart Bloom this step (they are removed).
 */
export function updateEnemies(state, dt) {
  const leaked = [];
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.leaked) continue;
    // A slow wears off once its time is up.
    if (state.time >= enemy.slowUntil) enemy.slowFactor = 1;
    const step = enemy.speed * enemy.slowFactor * dt;
    let left = step;
    while (left > 0 && !enemy.leaked) {
      const target = PATH_POINTS_PX[enemy.waypoint];
      if (!target) {
        enemy.leaked = true;
        break;
      }
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= left) {
        enemy.x = target.x;
        enemy.y = target.y;
        enemy.distance += dist;
        left -= dist;
        enemy.waypoint++;
        if (enemy.waypoint >= PATH_POINTS_PX.length) {
          enemy.leaked = true;
          leaked.push(enemy);
        }
      } else {
        enemy.x += (dx / dist) * left;
        enemy.y += (dy / dist) * left;
        enemy.distance += left;
        left = 0;
      }
    }
    if (enemy.flash > 0) enemy.flash -= dt;
    enemy.wobble += dt * 14;
  }
  // Drop the dead and the leaked from the live list.
  state.enemies = state.enemies.filter((e) => !e.dead && !e.leaked);
  return leaked;
}
