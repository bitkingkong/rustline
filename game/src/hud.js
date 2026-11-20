// Rustline — hud.js
// DOM HUD: uang, HP, bintang wanted, objektif, banner, layar judul/pause/game
// over, dan minimap canvas 180x180. Semua teks Bahasa Indonesia.

import { PLACES } from './config.js';

export class HUD {
  constructor() {
    this.el = {};
    const ids = [
      'hud', 'money', 'hp-fill', 'hp-text', 'ammo', 'wanted', 'objective',
      'objective-timer', 'minimap', 'banner', 'banner-title', 'banner-sub',
      'crosshair', 'hint', 'speedo',
      'screen-title', 'screen-pause', 'screen-over',
      'btn-new', 'btn-continue', 'btn-resume', 'btn-save', 'btn-quit',
      'btn-restart', 'over-title', 'over-sub', 'title-save-note', 'pause-save-note',
    ];
    for (const id of ids) {
      this.el[id] = document.getElementById(id);
    }
    this.minimapCtx = this.el.minimap ? this.el.minimap.getContext('2d') : null;
    this.bannerTimer = 0;
    this._flashT = 0;
  }

  showGame() {
    this.setScreen(null);
    if (this.el.hud) this.el.hud.style.display = 'block';
  }

  hideGame() {
    if (this.el.hud) this.el.hud.style.display = 'none';
  }

  setScreen(name) {
    const map = {
      title: 'screen-title',
      pause: 'screen-pause',
      over: 'screen-over',
    };
    for (const key of Object.keys(map)) {
      const e = this.el[map[key]];
      if (e) e.style.display = key === name ? 'flex' : 'none';
    }
    if (!name) {
      for (const key of Object.keys(map)) {
        const e = this.el[map[key]];
        if (e) e.style.display = 'none';
      }
    }
  }

  update(state) {
    // state: {money, hp, maxHp, ammo, reserve, wanted, objective, timeLeft,
    //  driving, speed, armed, muted, inVehicle}
    if (this.el.money) this.el.money.textContent = '$' + Math.floor(state.money);
    const hpPct = Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100));
    if (this.el['hp-fill']) {
      this.el['hp-fill'].style.width = hpPct + '%';
      this.el['hp-fill'].style.background = hpPct > 50 ? '#37c978' : hpPct > 25 ? '#e8a928' : '#d83a2e';
    }
    if (this.el['hp-text']) this.el['hp-text'].textContent = Math.ceil(state.hp) + ' HP';
    if (this.el.ammo) {
      this.el.ammo.textContent = state.armed ? `🔫 ${state.ammo} / ${state.reserve}` : '✊ Tinju';
    }
    if (this.el.wanted) {
      let stars = '';
      for (let i = 0; i < 5; i++) {
        stars += i < state.wanted ? '★' : '☆';
      }
      this.el.wanted.textContent = stars;
      this.el.wanted.style.color = state.wanted >= 3 ? '#ff4a3a' : '#ffd23e';
    }
    if (this.el.objective) this.el.objective.textContent = state.objective || '';
    if (this.el['objective-timer']) {
      this.el['objective-timer'].textContent =
        state.timeLeft > 0 ? `⏱ ${Math.ceil(state.timeLeft)} dtk` : '';
    }
    if (this.el.speedo) {
      this.el.speedo.textContent = state.driving
        ? `${Math.round(Math.abs(state.speed) * 3.6)} km/j`
        : '';
    }
    if (this.el.crosshair) {
      this.el.crosshair.style.display = state.armed && !state.driving ? 'block' : 'none';
    }
    if (this.el.hint) {
      this.el.hint.textContent = state.driving
        ? 'W/S gas-rem • A/D setir • Space rem tangan • E keluar • H klakson • P pause'
        : 'WASD gerak • Shift lari • Space lompat • E masuk kendaraan • F pukul • Klik tembak • R reload • P pause';
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= 1 / 60;
      if (this.bannerTimer <= 0 && this.el.banner) this.el.banner.style.display = 'none';
    }
  }

  banner(title, sub, seconds) {
    if (!this.el.banner) return;
    this.el['banner-title'].textContent = title;
    this.el['banner-sub'].textContent = sub || '';
    this.el.banner.style.display = 'block';
    this.bannerTimer = seconds || 3.5;
  }

  showGameOver(kind, money) {
    this.setScreen('over');
    if (this.el['over-title']) {
      this.el['over-title'].textContent = kind === 'busted' ? 'BUSTED!' : 'WASTED!';
    }
    if (this.el['over-sub']) {
      this.el['over-sub'].textContent =
        kind === 'busted'
          ? `Polisi menangkapmu di motel. Denda $${money}.`
          : `Kamu tumbang dan dibangunkan di motel. Biaya $${money}.`;
    }
  }

  setContinueAvailable(has) {
    if (this.el['btn-continue']) {
      this.el['btn-continue'].style.display = has ? 'inline-block' : 'none';
    }
    if (this.el['title-save-note']) {
      this.el['title-save-note'].textContent = has
        ? 'Save ditemukan — lanjutkan perjalanan Rosa.'
        : 'Belum ada save. Mulai dari awal.';
    }
  }

  setPauseNote(text) {
    if (this.el['pause-save-note']) this.el['pause-save-note'].textContent = text || '';
  }

  // Minimap 180x180: highway, jalan tanah, landmark, pemain, kendaraan,
  // polisi berkedip, checkpoint, marker misi.
  drawMinimap(world, time) {
    const ctx = this.minimapCtx;
    if (!ctx) return;
    const S = 180;
    const scale = S / 660; // dunia x -330..330
    const toX = (x) => S / 2 + x * scale;
    const toY = (z) => S / 2 + z * scale;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(0, 0, S, S);
    // pasir
    ctx.fillStyle = '#6a4a28';
    ctx.fillRect(0, 0, S, S);
    // jalan tanah
    ctx.fillStyle = '#8a6238';
    for (const dx of [-140, 140]) {
      ctx.fillRect(toX(dx) - 2, 0, 4, S);
    }
    // highway
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(0, toY(0) - 3, S, 6);
    ctx.fillStyle = '#d8a928';
    for (let x = -300; x < 300; x += 16) {
      ctx.fillRect(toX(x), toY(0) - 0.5, 5, 1);
    }
    // kota
    ctx.strokeStyle = '#e0b47e';
    ctx.strokeRect(toX(-80), toY(-24), 160 * scale, 48 * scale);
    // landmark
    const dot = (place, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(toX(place.x), toY(place.z), r || 2.5, 0, Math.PI * 2);
      ctx.fill();
    };
    dot(PLACES.warehouse, '#ffb347');
    dot(PLACES.gasStation, '#37c978');
    dot(PLACES.motel, '#ff9ec4');
    dot(PLACES.hideout, '#8a5a8a');
    // checkpoint
    ctx.fillStyle = '#ff4a3a';
    ctx.fillRect(toX(120) - 2, toY(0) - 2, 4, 4);
    // marker misi (berlian kuning)
    if (world.missions.target) {
      const t = world.missions.target;
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.moveTo(toX(t.x), toY(t.z) - 5);
      ctx.lineTo(toX(t.x) + 5, toY(t.z));
      ctx.lineTo(toX(t.x), toY(t.z) + 5);
      ctx.lineTo(toX(t.x) - 5, toY(t.z));
      ctx.closePath();
      ctx.fill();
    }
    // traffic (putih)
    for (const v of world.traffic) {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(toX(v.x) - 1, toY(v.z) - 1, 2, 2);
    }
    // mobil polisi (berkedip merah/biru)
    this._flashT += 0.12;
    const flash = Math.sin(this._flashT * 6) > 0;
    for (const p of world.policeCars) {
      ctx.fillStyle = flash ? '#ff2a2a' : '#2a5cff';
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const c of world.cops) {
      ctx.fillStyle = flash ? '#ff2a2a' : '#2a5cff';
      ctx.fillRect(toX(c.x) - 1.5, toY(c.z) - 1.5, 3, 3);
    }
    // pemain (panah hijau)
    const px = toX(world.player.x);
    const py = toY(world.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-world.player.heading);
    ctx.fillStyle = '#37ff7a';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // bingkai
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, S - 2, S - 2);
  }
}
