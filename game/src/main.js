// Rustline — main.js
// Boot + loop + mode screenshot deterministik.
// Alur: judul (Continue / New Game) -> bermain -> pause (Save) -> game over.
// Mode shot: ?shot=start|drive|chase|mission&seed=N — menyiapkan adegan,
// menjalankan beberapa frame staging (render:false), lalu menandai
// window.__shotReady setelah frame pertama dirender.

import { World } from './world.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = params.get('seed') || 'rustline-1';

const canvas = document.getElementById('game');
const world = new World(canvas, seed);
window.__world = world;
window.__shotReady = false;

const hud = world.hud;

function startNewGame() {
  world.audio.ensure();
  world.newGame();
}

function continueGame() {
  world.audio.ensure();
  if (world.load()) {
    world.state = 'playing';
    hud.showGame();
    hud.banner('LANJUTKAN', 'Selamat datang kembali, Rosa.', 3);
  } else {
    startNewGame();
  }
}

function resumeGame() {
  world.audio.ensure();
  world.state = 'playing';
  hud.showGame();
}

function quitToTitle() {
  if (world.inVehicle) world.exitVehicle();
  world.clearPolice();
  world.wanted = 0;
  world.state = 'title';
  world.audio.setSiren(false);
  world.audio.setEngine(0, false);
  hud.hideGame();
  hud.setScreen('title');
  hud.setContinueAvailable(world.hasSave());
}

// ---- wiring tombol ----
function bind(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}
bind('btn-new', startNewGame);
bind('btn-continue', continueGame);
bind('btn-resume', resumeGame);
bind('btn-save', () => {
  const ok = world.save();
  hud.setPauseNote(ok ? '✓ Tersimpan — lanjutkan kapan saja.' : 'Gagal menyimpan.');
});
bind('btn-quit', quitToTitle);
bind('btn-restart', () => {
  hud.setScreen(null);
  startNewGame();
});

// klik pertama di mana saja = gestur audio
window.addEventListener('pointerdown', () => world.audio.ensure(), { once: true });
window.addEventListener('keydown', () => world.audio.ensure(), { once: true });

// ---- mode screenshot ----
let shotMode = null;
let shotFrames = 0;
if (shotName) {
  shotMode = applyShot(world, shotName);
  // staging: majukan dunia beberapa langkah tanpa render agar adegan stabil
  for (let i = 0; i < 24; i++) {
    world.step(0.05, { render: false });
  }
  if (shotMode === 'title') {
    world.state = 'title';
    hud.setScreen('title');
  } else {
    hud.showGame();
    hud.setScreen(null);
  }
} else {
  world.state = 'title';
  hud.setScreen('title');
  hud.setContinueAvailable(world.hasSave());
}

window.__gameReady = true;

// ---- loop utama ----
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  // resume dari pause lewat P / Esc (dicek sebelum step mengosongkan pressed)
  if (world.state === 'paused' && (world.input.wasPressed('KeyP') || world.input.wasPressed('Escape'))) {
    resumeGame();
  }
  world.step(dt);
  if (shotMode) {
    shotFrames += 1;
    if (shotFrames >= 5) window.__shotReady = true;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
