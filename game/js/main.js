// main.js — Ember Garden: the game state, the loop, wave flow, winning and
// losing, and all the wiring between the board, the towers and the DOM.
// The game is a tower defense: moths walk the stone path to the Heart Bloom;
// towers stop them; survive all 12 waves to win.

import { TILE, tileAt, tileCenter } from './board.js';
import { updateEnemies } from './enemies.js';
import {
  TOWER_TYPES, placeTower, upgradeTower, sellTower,
  updateTowers, canPlace, towerRange,
} from './towers.js';
import { TOTAL_WAVES, startWave, updateWaves, waveClearBonus } from './waves.js';
import {
  fireProjectile, updateProjectiles, updateParticles, updateFloaters, addFloater,
} from './projectiles.js';
import { audio } from './audio.js';
import { drawGame } from './render.js';
import {
  buildShop, refreshShop, refreshHud, refreshPicked,
  showScreen, fillWinScreen, fillLoseScreen,
} from './ui.js';

/** A fresh game: 150 gold, a full-health Heart Bloom, no towers, wave 0. */
function freshState() {
  return {
    screen: 'title', // title | playing | paused | won | lost
    time: 0,
    gold: 150,
    score: 0,
    bloomHp: 20,
    bloomMax: 20,
    wave: 0,
    waveInProgress: false,
    waveTime: 0,
    spawnQueue: [],
    enemies: [],
    towers: [],
    projectiles: [],
    particles: [],
    floaters: [],
    selectedTowerType: null,
    selectedTower: null,
    selectedTowerRange: 0,
    canPlaceHere: false,
    hoverTile: null,
    hoverTower: null,
    speed: 1,
    muted: false,
    kills: 0,
    leaked: 0,
    lastBonus: 0,
    silent: false, // true during the headless autotest: skip DOM refresh
  };
}

const state = freshState();
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

// ------------------------------------------------------------- game flow

/** Start a brand-new game from the title or an end screen. */
function startGame() {
  const keepMuted = state.muted;
  const keepSpeed = state.speed;
  Object.assign(state, freshState());
  state.muted = keepMuted;
  state.speed = keepSpeed;
  state.screen = 'playing';
  showScreen(null);
  audio.ensure();
  audio.click();
  refreshAll();
}

/** Send the next wave, if the garden is at peace between waves. */
function sendNextWave() {
  if (state.screen !== 'playing') return;
  if (state.waveInProgress || state.wave >= TOTAL_WAVES) return;
  startWave(state, state.wave + 1);
  audio.waveStart();
  addFloater(state, 480, 300, `Wave ${state.wave}!`, '#ffd76a');
  refreshAll();
}

/** The Heart Bloom has fallen: the garden is lost. */
function loseGame() {
  state.screen = 'lost';
  state.bloomHp = 0;
  fillLoseScreen(state);
  showScreen('lose');
  audio.lose();
  refreshAll();
}

/** All 12 waves are beaten: the garden blooms. */
function winGame() {
  state.screen = 'won';
  fillWinScreen(state);
  showScreen('win');
  audio.win();
  refreshAll();
}

function pauseGame() {
  if (state.screen !== 'playing') return;
  state.screen = 'paused';
  showScreen('pause');
  audio.click();
}

function resumeGame() {
  if (state.screen !== 'paused') return;
  state.screen = 'playing';
  showScreen(null);
  audio.click();
}

// ------------------------------------------------------------- the loop

let lastNow = performance.now();
let uiTimer = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;
  if (state.screen === 'playing') {
    update(dt * state.speed);
  } else {
    // The garden still breathes behind the overlays.
    state.time += dt;
  }
  drawGame(ctx, state);
  uiTimer += dt;
  if (uiTimer > 0.1 && !state.silent) {
    uiTimer = 0;
    refreshAll();
  }
}

/** One simulation step: waves, enemies, towers, shots, sparks, texts. */
function update(dt) {
  state.time += dt;
  const wasRunning = state.waveInProgress;
  updateWaves(state, dt);
  if (wasRunning && !state.waveInProgress && state.wave > 0) {
    // The wave is cleared: pay the bonus, and check for the win.
    const bonus = waveClearBonus(state.wave);
    state.gold += bonus;
    state.lastBonus = bonus;
    state.score += 50;
    addFloater(state, 480, 280, `Wave cleared! +${bonus} gold`, '#ffd76a');
    audio.waveClear();
    if (state.wave >= TOTAL_WAVES) {
      winGame();
      return;
    }
  }
  const leaked = updateEnemies(state, dt);
  for (const enemy of leaked) {
    state.bloomHp -= enemy.leak;
    state.leaked += enemy.leak;
    const bloom = tileCenter(15, 8);
    addFloater(state, bloom.x, bloom.y - 30, `-${enemy.leak} HP!`, '#ff5d73');
    audio.leak();
    if (state.bloomHp <= 0) {
      loseGame();
      return;
    }
  }
  updateTowers(state, dt, (tower, target) => {
    fireProjectile(state, tower, target);
    if (tower.kind === 'ember') audio.emberShot();
    else if (tower.kind === 'frost') audio.frostShot();
    else audio.shoot();
  });
  updateProjectiles(state, dt);
  updateParticles(state, dt);
  updateFloaters(state, dt);
}

function refreshAll() {
  refreshHud(state);
  refreshShop(state);
  refreshPicked(state, onUpgradeClicked, onSellClicked);
}

// ------------------------------------------------------------- input

function onUpgradeClicked() {
  if (!state.selectedTower) return;
  if (upgradeTower(state, state.selectedTower)) {
    audio.place();
    refreshAll();
  } else {
    audio.error();
  }
}

function onSellClicked() {
  if (!state.selectedTower) return;
  sellTower(state, state.selectedTower);
  audio.click();
  refreshAll();
}

/** Pick a tower kind in the shop (keys 1/2/3 or a card click). */
function pickTowerType(kind) {
  if (state.screen !== 'playing') return;
  state.selectedTower = null;
  state.selectedTowerType = state.selectedTowerType === kind ? null : kind;
  if (state.selectedTowerType) {
    state.selectedTowerRange = TOWER_TYPES[kind].range;
    audio.click();
  }
  refreshAll();
}

function boardClick(event) {
  if (state.screen !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const px = (event.clientX - rect.left) * (canvas.width / rect.width);
  const py = (event.clientY - rect.top) * (canvas.height / rect.height);
  const tile = tileAt(px, py);
  if (!tile) return;
  // A tower type is picked: try to build on this tile.
  if (state.selectedTowerType) {
    const tower = placeTower(state, state.selectedTowerType, tile.col, tile.row);
    if (tower) {
      audio.place();
      if (state.gold < TOWER_TYPES[state.selectedTowerType].cost) state.selectedTowerType = null;
    } else {
      audio.error();
    }
    refreshAll();
    return;
  }
  // No type picked: select a tower on this tile, or clear the selection.
  const tower = state.towers.find((t) => t.col === tile.col && t.row === tile.row);
  state.selectedTower = tower || null;
  if (tower) audio.click();
  refreshAll();
}

function boardMove(event) {
  const rect = canvas.getBoundingClientRect();
  const px = (event.clientX - rect.left) * (canvas.width / rect.width);
  const py = (event.clientY - rect.top) * (canvas.height / rect.height);
  const tile = tileAt(px, py);
  state.hoverTile = tile;
  state.hoverTower = tile
    ? state.towers.find((t) => t.col === tile.col && t.row === tile.row) || null
    : null;
  state.canPlaceHere = !!(tile && state.selectedTowerType &&
    state.gold >= TOWER_TYPES[state.selectedTowerType].cost &&
    canPlace(state, tile.col, tile.row));
}

function onKey(event) {
  if (event.key === '1') pickTowerType('thorn');
  else if (event.key === '2') pickTowerType('ember');
  else if (event.key === '3') pickTowerType('frost');
  else if (event.code === 'Space') {
    event.preventDefault();
    if (state.screen === 'title') startGame();
    else if (state.screen === 'playing') sendNextWave();
    else if (state.screen === 'won' || state.screen === 'lost') startGame();
  } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
    if (state.screen === 'playing') pauseGame();
    else if (state.screen === 'paused') resumeGame();
  } else if (event.key === 'f' || event.key === 'F') {
    state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1;
    refreshAll();
  } else if (event.key === 'm' || event.key === 'M') {
    toggleMute();
  } else if (event.key === 'r' || event.key === 'R') {
    startGame();
  }
}

function toggleMute() {
  state.muted = !state.muted;
  audio.setMuted(state.muted);
  refreshAll();
}

function cycleSpeed() {
  state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1;
  audio.click();
  refreshAll();
}

// ------------------------------------------------------------- demo + autotest

// Good tower spots near the path, used by the demo board and the autotest.
const DEMO_SPOTS = [
  [12, 0, 'thorn'], [12, 2, 'ember'], [3, 2, 'frost'], [3, 4, 'thorn'],
  [12, 4, 'ember'], [12, 6, 'frost'], [3, 6, 'thorn'], [1, 9, 'ember'],
  [13, 9, 'frost'], [5, 0, 'thorn'], [5, 2, 'ember'], [10, 2, 'frost'],
  [5, 4, 'thorn'], [10, 4, 'ember'], [5, 6, 'frost'], [10, 6, 'thorn'],
];

/** Place the demo towers (free gold) for screenshots and the autotest. */
function buildDemoBoard() {
  state.gold = 100000;
  for (const [col, row, kind] of DEMO_SPOTS.slice(0, 8)) {
    placeTower(state, kind, col, row);
  }
  state.gold = 150;
}

/** Buy the next demo tower, or upgrade one, while gold allows. */
function autoBuy() {
  for (const [col, row, kind] of DEMO_SPOTS) {
    const taken = state.towers.some((t) => t.col === col && t.row === row);
    if (!taken && state.gold >= TOWER_TYPES[kind].cost) {
      placeTower(state, kind, col, row);
      return;
    }
  }
  for (const tower of state.towers) {
    if (tower.level < 3 && state.gold >= 200) {
      upgradeTower(state, tower);
      return;
    }
  }
}

/**
 * Headless balance test (?autotest=1): play the whole game in a tight loop
 * with no rendering and report the result in the title and the console.
 */
function runAutotest() {
  state.silent = true;
  state.speed = 4;
  startGame();
  // Honest economy: only the starting 150 gold, spent by the same greedy
  // buyer that keeps buying between waves. No free demo towers.
  autoBuy();
  sendNextWave();
  let steps = 0;
  while (state.screen === 'playing' && steps < 400000) {
    update(0.05);
    steps++;
    if (!state.waveInProgress && state.wave < TOTAL_WAVES && state.screen === 'playing') {
      autoBuy();
      sendNextWave();
    }
  }
  const result = state.screen === 'won'
    ? `AUTOTEST WIN score=${state.score} kills=${state.kills} hp=${state.bloomHp} steps=${steps}`
    : `AUTOTEST LOSE wave=${state.wave} score=${state.score} kills=${state.kills} steps=${steps}`;
  document.title = result;
  console.log(result);
}

// ------------------------------------------------------------- boot

function boot() {
  buildShop(pickTowerType);
  canvas.addEventListener('click', boardClick);
  canvas.addEventListener('mousemove', boardMove);
  canvas.addEventListener('mouseleave', () => { state.hoverTile = null; state.hoverTower = null; });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    state.selectedTowerType = null;
    state.selectedTower = null;
    refreshAll();
  });
  document.addEventListener('keydown', onKey);
  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-wave').addEventListener('click', sendNextWave);
  document.getElementById('btn-speed').addEventListener('click', cycleSpeed);
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (state.screen === 'playing') pauseGame();
    else if (state.screen === 'paused') resumeGame();
  });
  document.getElementById('btn-mute').addEventListener('click', toggleMute);
  document.getElementById('btn-restart').addEventListener('click', startGame);
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-restart2').addEventListener('click', startGame);
  document.getElementById('btn-again-win').addEventListener('click', startGame);
  document.getElementById('btn-again-lose').addEventListener('click', startGame);
  audio.setMuted(false);
  refreshAll();
  showScreen('title');

  // Debug hooks (URL params) for screenshots and balance testing.
  const params = new URLSearchParams(window.location.search);
  if (params.get('autotest') === '1') {
    runAutotest();
  } else if (params.get('debug') === 'win') {
    startGame();
    buildDemoBoard();
    state.wave = TOTAL_WAVES;
    state.score = 2840;
    state.kills = 187;
    state.bloomHp = 14;
    winGame();
  } else if (params.get('debug') === 'lose') {
    startGame();
    buildDemoBoard();
    state.wave = 7;
    state.score = 640;
    state.kills = 41;
    state.bloomHp = 0;
    loseGame();
  } else if (params.get('debug') === 'demo') {
    startGame();
    buildDemoBoard();
    sendNextWave();
  }
  requestAnimationFrame(frame);
}

boot();
