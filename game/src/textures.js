// Rustline — textures.js
// Semua tekstur prosedural dari canvas 2D: adobe, jendela, aspal, pasir,
// tanah, papan tanda, dan gradien langit. Tanpa aset eksternal.

import * as THREE from 'three';

function canvasTex(w, h, draw, repeatX, repeatY) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (repeatX || repeatY) tex.repeat.set(repeatX || 1, repeatY || 1);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Dinding adobe gurun: dasar hangat + bercak + garis bata samar.
export function adobeTexture(base, dark) {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const rng = mulberryLite(7);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rng() < 0.5 ? dark : '#ffffff';
      ctx.globalAlpha = 0.05 + rng() * 0.08;
      const s = 2 + rng() * 9;
      ctx.fillRect(rng() * w, rng() * h, s, s);
    }
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    for (let y = 32; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

// Fasad dengan jendela menyala / gelap (untuk dinding depan gedung).
export function windowTexture(base, lit) {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const x = 18 + col * 58;
        const y = 22 + row * 72;
        const warm = ((row * 4 + col) % 3) !== 0;
        ctx.fillStyle = warm ? '#ffca6a' : '#2c2338';
        if (lit && !warm) ctx.fillStyle = '#ffd98a';
        ctx.fillRect(x, y, 34, 44);
        ctx.strokeStyle = '#3a2a1c';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, 34, 44);
        ctx.beginPath();
        ctx.moveTo(x + 17, y);
        ctx.lineTo(x + 17, y + 44);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, h - 26, w, 26);
  });
}

// Aspal highway: gelap + garis tengah kuning putus-putus + tepi putih.
export function roadTexture() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#33333a';
    ctx.fillRect(0, 0, w, h);
    const rng = mulberryLite(11);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#3d3d44' : '#2b2b31';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(rng() * w, rng() * h, 2, 2);
    }
    ctx.globalAlpha = 1;
    // garis tepi
    ctx.fillStyle = '#cfc8b8';
    ctx.fillRect(6, 0, 4, h);
    ctx.fillRect(w - 10, 0, 4, h);
    // garis tengah kuning putus-putus
    ctx.fillStyle = '#d8a928';
    ctx.fillRect(w / 2 - 3, 20, 6, 90);
    ctx.fillRect(w / 2 - 3, 150, 6, 90);
  }, 1, 40);
}

// Pasir gurun: dasar + bintik + riak halus.
export function sandTexture() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c98d4e';
    ctx.fillRect(0, 0, w, h);
    const rng = mulberryLite(23);
    for (let i = 0; i < 2200; i++) {
      const v = rng();
      ctx.fillStyle = v < 0.5 ? '#b57a3e' : '#e0a866';
      ctx.globalAlpha = 0.25 + rng() * 0.3;
      const s = 1 + rng() * 3;
      ctx.fillRect(rng() * w, rng() * h, s, s);
    }
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#8a5a28';
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      const y = rng() * h;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + 8, w * 0.6, y - 8, w, y + 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, 24, 24);
}

// Jalan tanah: coklat + jejak roda ganda.
export function dirtTexture() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8a6238';
    ctx.fillRect(0, 0, w, h);
    const rng = mulberryLite(31);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#77552f' : '#9d7345';
      ctx.globalAlpha = 0.4;
      ctx.fillRect(rng() * w, rng() * h, 2, 2);
    }
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#5f4423';
    ctx.fillRect(w * 0.22, 0, 14, h);
    ctx.fillRect(w * 0.72, 0, 14, h);
    ctx.globalAlpha = 1;
  }, 1, 30);
}

// Papan tanda / billboard dengan teks.
export function signTexture(text, bg, fg, sub) {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = fg;
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, sub ? h / 2 - 26 : h / 2);
    if (sub) {
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(sub, w / 2, h / 2 + 52);
    }
  });
}

// Gradien langit senja (untuk kubah langit).
export function skyTexture() {
  return canvasTex(64, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, '#1d1038');
    g.addColorStop(0.35, '#4a2358');
    g.addColorStop(0.55, '#a83e2e');
    g.addColorStop(0.72, '#e8702a');
    g.addColorStop(0.85, '#ffb347');
    g.addColorStop(1.0, '#ffd98a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// RNG kecil mandiri untuk tekstur (tidak butuh impor random.js).
function mulberryLite(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
