// Three.js scene, low dusk sun, dust fog, and the third-person follow camera.
// Rendering only; the rules live in world.js.
import * as THREE from 'three';
import { PALETTE } from './config.js';
import { angleLerp, clamp, lerp } from './random.js';
import { skyTexture } from './textures.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  // Gradient sky dome (inside-out sphere) so the horizon glows orange.
  const skyGeo = new THREE.SphereGeometry(700, 16, 12);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 160, 520);
  const hemi = new THREE.HemisphereLight(0xd9a0c0, 0x8a6a4a, 0.85);
  scene.add(hemi);
  // Low sun in the west (-x), long shadows across the highway.
  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.4);
  sun.position.set(-220, 55, 90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 700;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
  // The sun disc itself, low over the western dunes.
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe0a0, fog: false }),
  );
  disc.position.set(-560, 42, 60);
  disc.lookAt(0, 20, 0);
  scene.add(disc);
  return { scene, sun };
}

// Third-person camera: orbits the player, follows behind while driving.
export function createCamera() {
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  return {
    camera,
    yaw: Math.PI,
    pitch: 0.32,
    distance: 10,
    update(targetX, targetY, targetZ, targetHeading, driving, dt, orbit) {
      this.yaw -= orbit.dx * 0.005;
      this.pitch = clamp(this.pitch + orbit.dy * 0.004, 0.08, 1.1);
      if (driving) {
        // Behind the car: the camera sits opposite the travel direction.
        const behind = targetHeading;
        this.yaw = angleLerp(this.yaw, behind, Math.min(1, dt * 1.8));
      }
      const dist = driving ? 13 : 9.5;
      const height = driving ? 5 : 3.6;
      this.distance = lerp(this.distance, dist, Math.min(1, dt * 3));
      const cx = targetX - Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
      const cz = targetZ - Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;
      const cy = targetY + Math.sin(this.pitch) * this.distance + height * 0.4;
      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(targetX, targetY + 1.6, targetZ);
    },
    resize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    },
  };
}
