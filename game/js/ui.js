// ui.js — the DOM around the canvas: the HUD, the tower shop, the selected
// tower panel, and the title / pause / win / lose screens. The game logic
// lives in main.js; this file only reads state and shows it.

import { TOWER_TYPES, MAX_LEVEL, upgradeCost, sellValue, towerDamage, towerRange } from './towers.js';
import { TOTAL_WAVES, enemiesLeft } from './waves.js';

/** Build the three tower shop cards once. onPick(kind) fires on click. */
export function buildShop(onPick) {
  const host = document.getElementById('tower-cards');
  host.innerHTML = '';
  for (const [kind, def] of Object.entries(TOWER_TYPES)) {
    const card = document.createElement('button');
    card.className = 'tower-card';
    card.dataset.kind = kind;
    card.innerHTML = `
      <span class="tower-dot" style="background:${def.color}"></span>
      <span>
        <span class="t-name">${def.name}<span class="t-key">${kind === 'thorn' ? '1' : kind === 'ember' ? '2' : '3'}</span></span><br>
        <span class="t-desc">${def.desc}</span>
      </span>
      <span class="t-cost">🪙 ${def.cost}</span>`;
    card.addEventListener('click', () => onPick(kind));
    host.appendChild(card);
  }
}

/** Mark one shop card as the picked tower (or none). Grey out unaffordable. */
export function refreshShop(state) {
  for (const card of document.querySelectorAll('.tower-card')) {
    const kind = card.dataset.kind;
    card.classList.toggle('picked', state.selectedTowerType === kind);
    card.classList.toggle('disabled', state.gold < TOWER_TYPES[kind].cost);
  }
}

/** Write the live numbers into the HUD. */
export function refreshHud(state) {
  document.getElementById('gold-value').textContent = state.gold;
  document.getElementById('bloom-value').textContent = Math.max(0, state.bloomHp);
  const fill = document.getElementById('bloom-fill');
  const frac = Math.max(0, state.bloomHp / state.bloomMax) * 100;
  fill.style.width = `${frac}%`;
  fill.classList.toggle('low', frac <= 30);
  document.getElementById('wave-value').textContent = state.wave === 0 ? '–' : state.wave;
  document.getElementById('score-value').textContent = state.score;
  document.getElementById('foes-value').textContent = state.waveInProgress ? enemiesLeft(state) : 0;
  const waveBtn = document.getElementById('btn-wave');
  if (state.screen === 'playing') {
    if (state.waveInProgress) {
      waveBtn.disabled = true;
      waveBtn.textContent = `Wave ${state.wave} in progress…`;
    } else if (state.wave >= TOTAL_WAVES) {
      waveBtn.disabled = true;
      waveBtn.textContent = 'All waves cleared!';
    } else {
      waveBtn.disabled = false;
      waveBtn.innerHTML = `▶ Start wave ${state.wave + 1} <span class="key">Space</span>`;
    }
  }
  const status = document.getElementById('wave-status');
  if (state.screen === 'playing') {
    if (state.waveInProgress) {
      status.textContent = `Wave ${state.wave} of ${TOTAL_WAVES} — hold the line!`;
    } else if (state.wave === 0) {
      status.textContent = 'Build towers, then send the first wave.';
    } else if (state.wave >= TOTAL_WAVES) {
      status.textContent = 'Every wave is beaten. The garden is safe.';
    } else {
      status.textContent = `Wave ${state.wave} cleared! +${state.lastBonus} gold. Spend it, then send wave ${state.wave + 1}.`;
    }
  }
  const speedBtn = document.getElementById('btn-speed');
  speedBtn.textContent = `${state.speed}×`;
  document.getElementById('btn-mute').textContent = state.muted ? '🔇' : '🔊';
}

/** Show the selected tower's stats, upgrade and sell buttons. */
export function refreshPicked(state, onUpgrade, onSell) {
  const empty = document.getElementById('picked-empty');
  const body = document.getElementById('picked-body');
  const tower = state.selectedTower;
  if (!tower) {
    empty.hidden = false;
    body.hidden = true;
    return;
  }
  empty.hidden = true;
  body.hidden = false;
  const def = TOWER_TYPES[tower.kind];
  document.getElementById('picked-name').textContent = `${def.name} · Lv ${tower.level}`;
  document.getElementById('picked-stats').innerHTML =
    `Damage <b>${towerDamage(tower)}</b> · Range <b>${towerRange(tower)}</b> · ${tower.rate || def.rate}/s<br>` +
    `Kills <b>${tower.kills}</b> · Invested 🪙 <b>${tower.invested}</b>`;
  const upBtn = document.getElementById('btn-upgrade');
  if (tower.level >= MAX_LEVEL) {
    upBtn.disabled = true;
    upBtn.textContent = '★ Max level';
  } else {
    const cost = upgradeCost(tower);
    upBtn.disabled = state.gold < cost;
    upBtn.textContent = `⬆ Upgrade · 🪙 ${cost}`;
  }
  const sellBtn = document.getElementById('btn-sell');
  sellBtn.textContent = `💰 Sell · +${sellValue(tower)}`;
  upBtn.onclick = onUpgrade;
  sellBtn.onclick = onSell;
}

/** Show exactly one overlay screen (or none): title, pause, win, lose. */
export function showScreen(name) {
  for (const id of ['screen-title', 'screen-pause', 'screen-win', 'screen-lose']) {
    document.getElementById(id).hidden = id !== `screen-${name}`;
  }
}

/** Fill in the win screen's final numbers. */
export function fillWinScreen(state) {
  document.getElementById('win-score').textContent = state.score;
  document.getElementById('win-kills').textContent = state.kills;
  document.getElementById('win-hp').textContent = Math.max(0, state.bloomHp);
}

/** Fill in the lose screen's final numbers. */
export function fillLoseScreen(state) {
  document.getElementById('lose-wave').textContent = state.wave;
  document.getElementById('lose-score').textContent = state.score;
  document.getElementById('lose-kills').textContent = state.kills;
  document.getElementById('lose-cleared').textContent = Math.max(0, state.wave - 1);
}
