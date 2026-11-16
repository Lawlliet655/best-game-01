// render.js — everything the player sees on the board canvas: the night
// garden, the stone path, the Heart Bloom, towers, moths and sparks.
// All art is drawn in code; there are no image files.

import {
  TILE, COLS, ROWS, BOARD_W, BOARD_H,
  PATH_TILES, BLOOM_TILE, tileCenter, isBuildable,
} from './board.js';
import { towerRange } from './towers.js';

/** Draw one full frame of the board. `state` is the game's live state. */
export function drawGame(ctx, state) {
  drawGarden(ctx, state);
  drawPath(ctx);
  drawBloom(ctx, state);
  drawTowers(ctx, state);
  drawEnemies(ctx, state);
  drawProjectiles(ctx, state);
  drawParticles(ctx, state);
  drawFloaters(ctx, state);
  drawPlacement(ctx, state);
}

/** The garden floor: dark indigo tiles with a faint checker and fireflies. */
function drawGarden(ctx, state) {
  ctx.fillStyle = '#14102e';
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE;
      const y = row * TILE;
      // A gentle checker so the board reads as a grid.
      ctx.fillStyle = (col + row) % 2 === 0 ? '#181338' : '#151030';
      ctx.fillRect(x, y, TILE, TILE);
      // Tiny grass tufts on buildable tiles (deterministic per tile).
      if (isBuildable(col, row)) {
        const seed = (col * 31 + row * 17) % 5;
        ctx.strokeStyle = 'rgba(110, 231, 216, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 14 + seed * 6, y + 46);
        ctx.lineTo(x + 17 + seed * 6, y + 36);
        ctx.moveTo(x + 22 + seed * 6, y + 46);
        ctx.lineTo(x + 22 + seed * 6, y + 38);
        ctx.stroke();
      }
    }
  }
  // A few drifting fireflies for life (positions from the clock, no state).
  const t = state.time;
  ctx.fillStyle = 'rgba(255, 213, 106, 0.5)';
  for (let i = 0; i < 8; i++) {
    const fx = (i * 137 + t * (12 + i * 3)) % BOARD_W;
    const fy = 40 + ((i * 89) % (BOARD_H - 80)) + Math.sin(t * 1.3 + i * 2) * 10;
    ctx.beginPath();
    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The stone path: warm slabs with a soft amber edge glow and a dashed guide line. */
function drawPath(ctx) {
  // Edge glow under the path.
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.3)';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, 90);
  ctx.lineTo(810, 90);
  ctx.lineTo(810, 210);
  ctx.lineTo(150, 210);
  ctx.lineTo(150, 330);
  ctx.lineTo(810, 330);
  ctx.lineTo(810, 450);
  ctx.lineTo(150, 450);
  ctx.lineTo(150, 510);
  ctx.lineTo(930, 510);
  ctx.stroke();
  // Slabs: much lighter than the garden floor so the path reads at a glance.
  for (const key of PATH_TILES) {
    const [col, row] = key.split(',').map(Number);
    const x = col * TILE;
    const y = row * TILE;
    ctx.fillStyle = '#4d3a85';
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.fillRect(x + 2, y + 2, TILE - 4, 8);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
  }
  // A dashed amber guide line down the middle of the path.
  ctx.strokeStyle = 'rgba(255, 213, 106, 0.55)';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(-10, 90);
  ctx.lineTo(810, 90);
  ctx.lineTo(810, 210);
  ctx.lineTo(150, 210);
  ctx.lineTo(150, 330);
  ctx.lineTo(810, 330);
  ctx.lineTo(810, 450);
  ctx.lineTo(150, 450);
  ctx.lineTo(150, 510);
  ctx.lineTo(930, 510);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** The Heart Bloom: a big glowing flower the moths want to eat. */
function drawBloom(ctx, state) {
  const c = tileCenter(BLOOM_TILE.col, BLOOM_TILE.row);
  const pulse = 1 + Math.sin(state.time * 3) * 0.08;
  const hpFrac = Math.max(0, state.bloomHp / state.bloomMax);
  // Glow.
  const glow = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 52 * pulse);
  glow.addColorStop(0, 'rgba(255, 122, 217, 0.55)');
  glow.addColorStop(1, 'rgba(255, 122, 217, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 52 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Petals (fewer petals as it gets hurt).
  const petals = 3 + Math.ceil(hpFrac * 5);
  ctx.fillStyle = hpFrac > 0.5 ? '#ff7ad9' : '#d96aa8';
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 + state.time * 0.4;
    const px = c.x + Math.cos(a) * 18;
    const py = c.y + Math.sin(a) * 18;
    ctx.beginPath();
    ctx.ellipse(px, py, 11, 7, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // Heart of the flower.
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 9 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(c.x - 2, c.y - 2, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

/** Towers: a spiky plant, a glowing flower, a teal crystal. Level pips on top. */
function drawTowers(ctx, state) {
  for (const tower of state.towers) {
    const { x, y } = tower;
    // Base ring.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (tower.kind === 'thorn') {
      ctx.fillStyle = '#4a7a2e';
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9be15d';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = tower.angle + (i - 2.5) * 0.35;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
        ctx.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22);
        ctx.stroke();
      }
      ctx.fillStyle = '#c8f79a';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (tower.kind === 'ember') {
      ctx.fillStyle = '#b34a12';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      const flick = 1 + Math.sin(state.time * 6 + x) * 0.12;
      ctx.fillStyle = '#ff9a3d';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + state.time * 0.5;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 11, y + Math.sin(a) * 11, 8 * flick, 5 * flick, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // frost: a teal crystal shard
      ctx.fillStyle = '#1f7a6e';
      ctx.beginPath();
      ctx.moveTo(x, y - 20);
      ctx.lineTo(x + 13, y + 8);
      ctx.lineTo(x - 13, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6ee7d8';
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x + 7, y + 5);
      ctx.lineTo(x - 7, y + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(x - 3, y - 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Level pips.
    ctx.fillStyle = '#ffd76a';
    for (let i = 0; i < tower.level; i++) {
      ctx.beginPath();
      ctx.arc(x - 10 + i * 10, y + 22, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Range ring for the selected tower.
    if (state.selectedTower === tower) {
      ctx.strokeStyle = 'rgba(255, 213, 106, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(x, y, towerRange(tower), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

/** Enemies: fluttering moths, a lumbering beetle, the Moth Queen. */
function drawEnemies(ctx, state) {
  for (const enemy of state.enemies) {
    const { x, y } = enemy;
    const type = enemy.type;
    const flap = Math.sin(enemy.wobble) * 0.5;
    const slowed = enemy.slowFactor < 1;
    // Shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + enemy.radius * 0.7, enemy.radius * 0.9, enemy.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.kind === 'beetle') {
      ctx.fillStyle = type.body;
      ctx.beginPath();
      ctx.arc(x, y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = type.wing;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, enemy.radius - 5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      // Wings (they flap).
      ctx.fillStyle = type.wing;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(side * (0.5 + flap * 0.35));
        ctx.beginPath();
        ctx.ellipse(side * enemy.radius * 0.75, -enemy.radius * 0.3, enemy.radius * 0.85, enemy.radius * 0.5, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Body.
      ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : type.body;
      ctx.beginPath();
      ctx.ellipse(x, y, enemy.radius * 0.55, enemy.radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Antennae for the boss.
      if (enemy.kind === 'boss') {
        ctx.strokeStyle = type.glow;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 4, y - enemy.radius * 0.7);
        ctx.quadraticCurveTo(x - 12, y - enemy.radius * 1.5, x - 18, y - enemy.radius * 1.3);
        ctx.moveTo(x + 4, y - enemy.radius * 0.7);
        ctx.quadraticCurveTo(x + 12, y - enemy.radius * 1.5, x + 18, y - enemy.radius * 1.3);
        ctx.stroke();
      }
    }
    // Glowing eyes.
    ctx.fillStyle = type.eye;
    ctx.beginPath();
    ctx.arc(x - 4, y - 3, 2.2, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Frost tint while slowed.
    if (slowed) {
      ctx.strokeStyle = 'rgba(110, 231, 216, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, enemy.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Health bar when hurt.
    if (enemy.hp < enemy.maxHp) {
      const w = enemy.radius * 2;
      const frac = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(x - w / 2, y - enemy.radius - 10, w, 5);
      ctx.fillStyle = frac > 0.5 ? '#9be15d' : frac > 0.25 ? '#ffd76a' : '#ff5d73';
      ctx.fillRect(x - w / 2, y - enemy.radius - 10, w * frac, 5);
    }
  }
}

/** Projectiles: thorn darts, ember fireballs, frost shards. */
function drawProjectiles(ctx, state) {
  for (const shot of state.projectiles) {
    if (shot.kind === 'ember') {
      ctx.fillStyle = '#ff9a3d';
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (shot.kind === 'frost') {
      ctx.fillStyle = '#6ee7d8';
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(Math.atan2(shot.lastY - shot.y, shot.lastX - shot.x));
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -4);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.strokeStyle = '#c8f79a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y);
      ctx.lineTo(shot.x - 8, shot.y + 2);
      ctx.stroke();
      ctx.fillStyle = '#9be15d';
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Sparks and embers from hits and kills. */
function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Floating gold and warning texts. */
function drawFloaters(ctx, state) {
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

/** The placement ghost: range ring and green/red tile under the cursor. */
function drawPlacement(ctx, state) {
  if (state.screen !== 'playing' || !state.hoverTile) return;
  const { col, row } = state.hoverTile;
  const x = col * TILE;
  const y = row * TILE;
  if (state.selectedTowerType) {
    const ok = state.canPlaceHere;
    ctx.fillStyle = ok ? 'rgba(155, 225, 93, 0.3)' : 'rgba(255, 93, 115, 0.3)';
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = ok ? '#9be15d' : '#ff5d73';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
    if (ok) {
      const c = { x: x + TILE / 2, y: y + TILE / 2 };
      ctx.strokeStyle = 'rgba(255, 213, 106, 0.5)';
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(c.x, c.y, state.selectedTowerRange, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  } else if (state.hoverTower) {
    ctx.strokeStyle = 'rgba(255, 213, 106, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
  }
}
