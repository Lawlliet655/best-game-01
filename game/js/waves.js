// waves.js — the 12 waves: what marches in each one, and when.

import { spawnEnemy } from './enemies.js';

export const TOTAL_WAVES = 12;

// Gold for clearing a wave: a base amount plus a little more each wave.
export function waveClearBonus(wave) {
  return 25 + 5 * wave;
}

/**
 * The spawn list for a wave: an array of {kind, at} where `at` is the second
 * (from the wave's start) the enemy walks in. Wave 1 is gentle; later waves
 * add fast Flutterers, then Armored Beetles, and wave 12 brings the Moth
 * Queen with an escort.
 */
export function buildWaveSpawns(wave) {
  const spawns = [];
  let t = 0.5;
  const moths = 5 + wave * 2;
  const interval = Math.max(0.45, 0.95 - wave * 0.04);
  for (let i = 0; i < moths; i++) {
    spawns.push({ kind: 'moth', at: t });
    t += interval;
  }
  // Fast Flutterers join from wave 3, in small packs between the moths.
  if (wave >= 3) {
    const flutterers = Math.min(2 + wave, 12);
    for (let i = 0; i < flutterers; i++) {
      spawns.push({ kind: 'flutterer', at: 1.5 + i * 1.7 });
    }
  }
  // Armored Beetles lumber in from wave 5, spaced out.
  if (wave >= 5) {
    const beetles = Math.min(1 + Math.floor((wave - 3) / 2), 6);
    for (let i = 0; i < beetles; i++) {
      spawns.push({ kind: 'beetle', at: 4 + i * 3.5 });
    }
  }
  // Wave 12: the Moth Queen herself, with an escort of moths and beetles.
  if (wave === TOTAL_WAVES) {
    spawns.push({ kind: 'boss', at: 8 });
    for (let i = 0; i < 6; i++) spawns.push({ kind: 'moth', at: 10 + i * 1.2 });
    for (let i = 0; i < 3; i++) spawns.push({ kind: 'beetle', at: 12 + i * 3 });
  }
  spawns.sort((a, b) => a.at - b.at);
  return spawns;
}

/** How many enemies a wave holds in total (for the HUD's "left" count). */
export function waveEnemyCount(wave) {
  return buildWaveSpawns(wave).length;
}

/** Start a wave: queue its spawns and mark the wave as running. */
export function startWave(state, wave) {
  state.wave = wave;
  state.spawnQueue = buildWaveSpawns(wave).map((s) => ({ ...s }));
  state.waveTime = 0;
  state.waveInProgress = true;
}

/**
 * Spawn the enemies whose time has come. Returns how many were spawned.
 * A wave is cleared when its queue is empty and no enemy is left alive.
 */
export function updateWaves(state, dt) {
  if (!state.waveInProgress) return 0;
  state.waveTime += dt;
  let spawned = 0;
  while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.waveTime) {
    const next = state.spawnQueue.shift();
    state.enemies.push(spawnEnemy(next.kind, state.wave));
    spawned++;
  }
  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveInProgress = false;
    state.waveClearedAt = state.time;
  }
  return spawned;
}

/** Enemies still to come plus enemies still alive (for the HUD). */
export function enemiesLeft(state) {
  return state.spawnQueue.length + state.enemies.length;
}
