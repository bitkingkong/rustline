// Rustline — audio.js
// Semua suara sintetis WebAudio: mesin, sirene, tembakan, pukulan, pickup,
// jingle misi, angin gurun, dan loop musik bass+hat.
// AudioContext dibuat saat gestur pertama; gagal diam-diam bila tak ada audio.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.windSrc = null;
    this.windGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.started = false;
  }

  // Dipanggil dari gestur pengguna (klik / tombol). Aman dipanggil berkali-kali.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this._startWind();
      this._startEngine();
      this._startSiren();
      this._startMusic();
      this.started = true;
      return true;
    } catch (e) {
      this.ctx = null;
      return false;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  _noiseBuffer(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _startWind() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(3);
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 320;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start();
    this.windSrc = src;
    this.windGain = g;
    // desir naik-turun pelan
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    lfo.start();
  }

  _startEngine() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    osc.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    osc.start();
    this.engineOsc = osc;
    this.engineGain = g;
    this.engineFilter = filt;
  }

  // pitch mesin mengikuti kecepatan; 0 saat jalan kaki / diam
  setEngine(speedNorm, driving) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    const target = driving ? 0.05 + speedNorm * 0.09 : 0;
    this.engineGain.gain.setTargetAtTime(target, t, 0.08);
    this.engineOsc.frequency.setTargetAtTime(52 + speedNorm * 130, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(380 + speedNorm * 900, t, 0.1);
  }

  _startSiren() {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 700;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    this.sirenOsc = osc;
    this.sirenGain = g;
    // dua nada bergantian
    const lfo = this.ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 0.9;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();
  }

  setSiren(on) {
    if (!this.ctx || !this.sirenGain) return;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.15);
  }

  _blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noiseBurst(dur, vol, filterFreq) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(dur);
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq || 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  shot() {
    this._noiseBurst(0.14, 0.5, 2600);
    this._blip(160, 0.1, 'square', 0.18, 60);
  }

  punch() {
    this._noiseBurst(0.08, 0.3, 500);
    this._blip(110, 0.09, 'sine', 0.25, 55);
  }

  pickup() {
    this._blip(880, 0.09, 'sine', 0.2);
    setTimeout(() => this._blip(1320, 0.12, 'sine', 0.2), 90);
  }

  horn() {
    this._blip(370, 0.28, 'sawtooth', 0.16);
    this._blip(466, 0.28, 'sawtooth', 0.12);
  }

  hurt() {
    this._blip(220, 0.18, 'sawtooth', 0.25, 90);
  }

  busted() {
    this._blip(520, 0.25, 'square', 0.2, 380);
    setTimeout(() => this._blip(380, 0.4, 'square', 0.2, 260), 220);
  }

  jingle() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => this._blip(n, 0.22, 'triangle', 0.22), i * 130);
    });
  }

  reload() {
    this._blip(700, 0.05, 'square', 0.12);
    setTimeout(() => this._blip(500, 0.05, 'square', 0.12), 120);
  }

  // Loop musik: bass line minor + hat noise, step 8th @ 100 BPM.
  _startMusic() {
    const bassLine = [55, 0, 55, 65.4, 55, 0, 49, 58.3];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const step = this.musicStep % 8;
      this.musicStep += 1;
      const bass = bassLine[step];
      if (bass) {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = bass;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.11, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.3);
      }
      // hat tiap step genap
      if (step % 2 === 0) this._noiseBurst(0.03, 0.05, 7000);
    }, 300);
  }

  dispose() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
  }
}
