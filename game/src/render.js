// Rustline — render.js
// Renderer WebGL + scene senja + kamera orbit pengikut.
// Semua objek 3D dunia hidup di scene yang dibuat di sini.

import * as THREE from 'three';
import { COLORS } from './config.js';
import { skyTexture } from './textures.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // MSAA sangat mahal di SwiftShader (software)
    powerPreference: 'high-performance',
  });
  // Resolusi adaptif: renderer software (SwiftShader/llvmpipe) sangat lambat
  // per piksel — turunkan backing store ke 0.5x agar game tetap bisa dimainkan
  // di headless. GPU sungguhan tetap memakai resolusi penuh.
  let pixelScale = Math.min(window.devicePixelRatio || 1, 1.5);
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const ren = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    if (ren && /swiftshader|llvmpipe|softpipe|software/i.test(String(ren))) {
      pixelScale = 0.5;
    }
  } catch (e) {
    // abaikan: pakai skala default
  }
  renderer.setPixelRatio(pixelScale);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // lebih murah dari PCFSoft di software
  renderer.toneMapping = THREE.NoToneMapping; // ACES mahal di SwiftShader
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd98a4a, 90, 420);

  // Kubah langit gradien senja.
  const skyGeo = new THREE.SphereGeometry(600, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTexture(),
    side: THREE.BackSide,
    fog: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Matahari rendah di barat (x negatif) + cakram pijar.
  const sun = new THREE.DirectionalLight(0xffb347, 2.6);
  sun.position.set(-180, 55, -60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 500;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.sun, fog: false })
  );
  sunDisc.position.set(-420, 62, -140);
  sunDisc.lookAt(0, 20, 0);
  scene.add(sunDisc);

  // Cahaya pantul langit + tanah.
  const hemi = new THREE.HemisphereLight(0x8a4a6a, 0x5a3a22, 0.85);
  scene.add(hemi);

  const camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    1200
  );
  camera.position.set(0, 8, 16);

  return { scene, camera, sun, hemi, sky };
}

// Kamera orbit: mengikuti target, yaw/pitch dari drag mouse, jarak tetap.
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = Math.PI; // menghadap +x dari belakang pemain
    this.pitch = 0.32;
    this.distance = 11;
    this.height = 6.5;
    this.target = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._pos = new THREE.Vector3();
  }

  applyDrag(dx, dy) {
    this.yaw -= dx * 0.0042;
    this.pitch += dy * 0.0028;
    this.pitch = Math.max(0.08, Math.min(1.05, this.pitch));
  }

  // target: Vector3 / objek {x,y,z} posisi yang diikuti; heading: arah hadap kendaraan/pemain
  update(target, heading, dt, snap) {
    const ty = target.y || 0;
    if (heading !== null && heading !== undefined) {
      // kamera mengendur mengikuti arah kendaraan (tidak kaku)
      let want = heading + Math.PI;
      let diff = want - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const k = snap ? 1 : Math.min(1, dt * 1.6);
      this.yaw += diff * k;
    }
    const cx = target.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
    const cz = target.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;
    const cy = ty + this.height + Math.sin(this.pitch) * this.distance * 0.55;
    this._pos.set(cx, cy, cz);
    if (snap) {
      this.camera.position.copy(this._pos);
    } else {
      this.camera.position.lerp(this._pos, Math.min(1, dt * 6));
    }
    this._look.set(target.x, ty + 1.6, target.z);
    this.camera.lookAt(this._look);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}

export function resizeRenderer(renderer) {
  renderer.setSize(window.innerWidth, window.innerHeight);
}
