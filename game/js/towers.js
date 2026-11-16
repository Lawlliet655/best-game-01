// towers.js — the three tower kinds, placement, targeting, upgrades, selling.

import { isBuildable, tileCenter } from './board.js';

// Tower kinds. damage/rate are per level 1; upgrades multiply damage by 1.45
// and range by 1.08 per level. splash is the blast radius in pixels (0 = none).
// slow is how much an enemy is slowed (0.45 = 45% slower) for slowDur seconds.
export const TOWER_TYPES = {
  thorn: {
    name: 'Thornspike',
    short: 'Thorn',
    cost: 50,
    range: 132,
    damage: 12,
    rate: 2.0,
    splash: 0,
    slow: 0,
    slowDur: 0,
    projectileSpeed: 420,
    color: '#9be15d',
    dark: '#4a7a2e',
    desc: 'Cheap and quick. Sharp thorns, steady shots.',
  },
  ember: {
    name: 'Emberbloom',
    short: 'Ember',
    cost: 100,
    range: 122,
    damage: 26,
    rate: 0.8,
    splash: 62,
    slow: 0,
    slowDur: 0,
    projectileSpeed: 300,
    color: '#ff9a3d',
    dark: '#b34a12',
    desc: 'Slow, heavy fireballs that burst and scorch a patch.',
  },
  frost: {
    name: 'Frostshard',
    short: 'Frost',
    cost: 75,
    range: 146,
    damage: 6,
    rate: 1.5,
    splash: 0,
    slow: 0.45,
    slowDur: 1.6,
    projectileSpeed: 380,
    color: '#6ee7d8',
    dark: '#1f7a6e',
    desc: 'Icy shards that chill moths and slow them down.',
  },
};

export const MAX_LEVEL = 3;
export const SELL_BACK = 0.7; // selling returns 70% of everything invested

/** Damage of a tower at its current level. */
export function towerDamage(tower) {
  return Math.round(TOWER_TYPES[tower.kind].damage * Math.pow(1.45, tower.level - 1));
}

/** Range of a tower at its current level, in pixels. */
export function towerRange(tower) {
  return Math.round(TOWER_TYPES[tower.kind].range * Math.pow(1.08, tower.level - 1));
}

/** Cost to upgrade a tower one level (level 1 -> 2, 2 -> 3). */
export function upgradeCost(tower) {
  return Math.round(TOWER_TYPES[tower.kind].cost * 0.8 * tower.level);
}

/** Gold returned when a tower is sold. */
export function sellValue(tower) {
  return Math.floor(tower.invested * SELL_BACK);
}

/** Is this tile free for a new tower? (Buildable and not already taken.) */
export function canPlace(state, col, row) {
  if (!isBuildable(col, row)) return false;
  return !state.towers.some((t) => t.col === col && t.row === row);
}

/**
 * Build a tower. Returns the new tower, or null when it cannot be built
 * (not enough gold, or the tile is taken). Deducts the gold on success.
 */
export function placeTower(state, kind, col, row) {
  const def = TOWER_TYPES[kind];
  if (!def) return null;
  if (state.gold < def.cost) return null;
  if (!canPlace(state, col, row)) return null;
  const center = tileCenter(col, row);
  const tower = {
    kind,
    col,
    row,
    x: center.x,
    y: center.y,
    level: 1,
    invested: def.cost,
    kills: 0,
    cooldown: 0,
    angle: -Math.PI / 2,
  };
  state.gold -= def.cost;
  state.towers.push(tower);
  return tower;
}

/** Upgrade a tower one level. Returns true when it worked. */
export function upgradeTower(state, tower) {
  if (tower.level >= MAX_LEVEL) return false;
  const cost = upgradeCost(tower);
  if (state.gold < cost) return false;
  state.gold -= cost;
  tower.invested += cost;
  tower.level++;
  return true;
}

/** Sell a tower: refund part of what was invested and remove it. */
export function sellTower(state, tower) {
  const refund = sellValue(tower);
  state.gold += refund;
  state.towers = state.towers.filter((t) => t !== tower);
  if (state.selectedTower === tower) state.selectedTower = null;
  return refund;
}

/**
 * Pick the best target for a tower: the living enemy inside its range that
 * has walked furthest along the path (closest to the Heart Bloom).
 */
export function pickTarget(tower, enemies) {
  const range = towerRange(tower);
  let best = null;
  for (const enemy of enemies) {
    if (enemy.dead || enemy.leaked) continue;
    const d = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
    if (d > range + enemy.radius) continue;
    if (!best || enemy.distance > best.distance) best = enemy;
  }
  return best;
}

/**
 * Let every tower shoot. Fires a projectile at its target when its cooldown
 * is ready; calls onFire(tower, target) for each shot so main.js can add the
 * projectile and play the sound.
 */
export function updateTowers(state, dt, onFire) {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    const target = pickTarget(tower, state.enemies);
    if (!target) continue;
    tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    if (tower.cooldown > 0) continue;
    tower.cooldown = 1 / TOWER_TYPES[tower.kind].rate;
    onFire(tower, target);
  }
}
