// Canvas-generated textures: adobe building facades with lit windows, desert
// asphalt, dirt, sand and a sunset billboard. No image files, no network, all
// procedural.
import * as THREE from 'three';
import { mulberry32 } from './random.js';

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')];
}

export function buildingTexture(baseColor, seed) {
  const random = mulberry32(seed);
  const [canvas, ctx] = makeCanvas(128, 256);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 256);
  // Adobe wash: slightly darker band at the base, lighter near the roof.
  const shade = ctx.createLinearGradient(0, 0, 0, 256);
  shade.addColorStop(0, 'rgba(255,220,170,0.18)');
  shade.addColorStop(0.7, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 128, 256);
  // Window grid: some lit warm (dusk lights on), some dark.
  const cols = 5;
  const rows = 6;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = random() < 0.4;
      ctx.fillStyle = lit ? '#ffd98a' : '#33241e';
      ctx.fillRect(12 + c * 22, 16 + r * 38, 14, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(12 + c * 22, 16 + r * 38, 14, 5);
    }
  }
  // Flat-roof parapet line.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0, 128, 8);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function roadTexture() {
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#33302c';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i += 1) {
    const v = Math.floor(40 + Math.random() * 30);
    ctx.fillStyle = `rgb(${v},${v - 4},${v - 8})`;
    ctx.fillRect(Math.floor(Math.random() * 128), Math.floor(Math.random() * 128), 2, 2);
  }
  ctx.fillStyle = '#c8b898';
  ctx.fillRect(0, 4, 128, 3);
  ctx.fillRect(0, 121, 128, 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function dirtTexture() {
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 700; i += 1) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,230,180,0.10)';
    ctx.fillRect(Math.floor(Math.random() * 128), Math.floor(Math.random() * 128), 3, 2);
  }
  // Tyre ruts.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(28, 0, 10, 128);
  ctx.fillRect(90, 0, 10, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function sandTexture() {
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#b98a56';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i += 1) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,235,200,0.12)';
    ctx.fillRect(Math.floor(Math.random() * 128), Math.floor(Math.random() * 128), 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function billboardTexture(lines, bgColor) {
  const [canvas, ctx] = makeCanvas(256, 128);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#f2e2c0';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 248, 120);
  ctx.fillStyle = '#fff2d0';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    ctx.fillText(line, 128, 52 + i * 38);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function skyTexture() {
  // Vertical dusk gradient: purple top, orange band, pale gold at the horizon.
  const [canvas, ctx] = makeCanvas(4, 256);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#4a2a5e');
  grad.addColorStop(0.45, '#8a4a6e');
  grad.addColorStop(0.7, '#d96a3e');
  grad.addColorStop(0.88, '#f2a45e');
  grad.addColorStop(1, '#ffd9a0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
