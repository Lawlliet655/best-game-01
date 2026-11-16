// audio.js — every sound in Ember Garden is made in code with WebAudio:
// little oscillator blips and filtered noise, no sound files at all.

class AudioGarden {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  /** Create the audio context on the first user gesture (browsers demand it). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.32;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.32;
  }

  /** One oscillator note: frequency, seconds, wave shape, volume, slide-to. */
  tone(freq, dur, type = 'sine', vol = 0.5, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  /** A short burst of filtered noise (hits, pops, splashes). */
  noise(dur, vol = 0.4, freq = 1200, delay = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  click() { this.tone(660, 0.06, 'sine', 0.3); }
  place() { this.tone(180, 0.12, 'triangle', 0.5, 90); this.noise(0.08, 0.25, 500); }
  error() { this.tone(140, 0.18, 'square', 0.25, 90); }
  shoot() { this.tone(880, 0.07, 'square', 0.12, 520); }
  emberShot() { this.noise(0.12, 0.2, 900); this.tone(320, 0.1, 'sawtooth', 0.12, 160); }
  frostShot() { this.tone(1240, 0.09, 'sine', 0.14, 1560); }
  kill() { this.tone(520, 0.1, 'triangle', 0.3, 780); this.noise(0.08, 0.2, 2400); }
  leak() { this.tone(220, 0.4, 'sawtooth', 0.35, 70); }
  waveStart() { this.tone(392, 0.12, 'triangle', 0.35); this.tone(523, 0.16, 'triangle', 0.35, null, 0.12); }
  waveClear() { this.tone(523, 0.1, 'triangle', 0.3); this.tone(659, 0.1, 'triangle', 0.3, null, 0.09); this.tone(784, 0.18, 'triangle', 0.35, null, 0.18); }
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.32, null, i * 0.13));
  }
  lose() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.22, null, i * 0.2));
  }
}

export const audio = new AudioGarden();
