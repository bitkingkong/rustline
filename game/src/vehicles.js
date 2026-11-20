// Rustline — vehicles.js
// Pembuatan kendaraan (truk, mobil, pickup, van, polisi) + fisika mengemudi
// arcade: gas, rem, mundur, setir, rem tangan, faktor permukaan.
// Setiap kendaraan menyimpan `wheels` dan `lightBar` (polisi) untuk animasi.

import * as THREE from 'three';
import { CFG, COLORS } from './config.js';

const PALETTE = [0xc23b2a, 0x2e6f6a, 0xd8a928, 0x4a6fa5, 0x7a4a8a, 0x8a8a80, 0x3a3a3a, 0xe0d8c8];

function makeWheel(r) {
  const wheel = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, r * 0.7, 14),
    new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.95 })
  );
  tire.rotation.z = Math.PI / 2;
  wheel.add(tire);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.5, r * 0.5, r * 0.72, 10),
    new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.4, metalness: 0.6 })
  );
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  return wheel;
}

function bodyBox(w, h, d, color, x, y, z, metal) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color,
      roughness: metal ? 0.35 : 0.55,
      metalness: metal ? 0.5 : 0.15,
    })
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// kind: 'truck' | 'car' | 'pickup' | 'van' | 'police'
export function makeVehicle(scene, kind, color, x, z, heading) {
  const g = new THREE.Group();
  const wheels = [];
  let lightBar = null;
  let length = 4.4;
  let width = 2.0;

  const paint = color !== undefined ? color : PALETTE[Math.floor(Math.random() * PALETTE.length)];

  if (kind === 'truck') {
    length = 6.4;
    width = 2.3;
    // bak kargo
    g.add(bodyBox(2.3, 1.9, 4.2, 0x7a6a55, 0, 1.35, -1.0));
    g.add(bodyBox(2.34, 0.25, 4.24, 0x5a4a38, 0, 2.4, -1.0));
    // kabin
    g.add(bodyBox(2.3, 1.7, 1.9, paint, 0, 1.25, 1.9));
    // kaca depan
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.8, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.15, metalness: 0.7 })
    );
    glass.position.set(0, 1.55, 2.86);
    g.add(glass);
    // lampu depan
    for (const s of [-1, 1]) {
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.25, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 })
      );
      lamp.position.set(s * 0.85, 0.85, 2.87);
      g.add(lamp);
    }
  } else if (kind === 'police') {
    length = 4.8;
    width = 2.0;
    g.add(bodyBox(2.0, 0.85, 4.8, 0xf0f0e8, 0, 0.75, 0));
    g.add(bodyBox(1.8, 0.7, 2.4, 0x1a1a22, 0, 1.5, -0.2));
    // strip pintu hitam-putih
    g.add(bodyBox(2.02, 0.3, 2.2, 0x14141a, 0, 0.85, 0.3));
    // light bar merah-biru
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: COLORS.policeRed })
    );
    red.position.set(-0.4, 0, 0);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: COLORS.policeBlue })
    );
    blue.position.set(0.4, 0, 0);
    lightBar.add(red);
    lightBar.add(blue);
    lightBar.position.set(0, 2.05, -0.2);
    lightBar.userData.red = red;
    lightBar.userData.blue = blue;
    g.add(lightBar);
  } else if (kind === 'van') {
    length = 5.2;
    width = 2.1;
    g.add(bodyBox(2.1, 2.0, 5.2, paint, 0, 1.4, 0));
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.8, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.15, metalness: 0.7 })
    );
    glass.position.set(0, 1.7, 2.62);
    g.add(glass);
  } else if (kind === 'pickup') {
    length = 4.9;
    width = 2.0;
    g.add(bodyBox(2.0, 1.0, 4.9, paint, 0, 0.85, 0));
    g.add(bodyBox(1.9, 0.9, 2.0, paint, 0, 1.65, 1.2));
    g.add(bodyBox(1.86, 0.15, 2.4, 0x2a2a2a, 0, 1.32, -1.1));
  } else {
    // car
    length = 4.4;
    width = 1.9;
    g.add(bodyBox(1.9, 0.8, 4.4, paint, 0, 0.7, 0));
    g.add(bodyBox(1.7, 0.65, 2.2, paint, 0, 1.4, -0.3));
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.55, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.15, metalness: 0.7 })
    );
    glass.position.set(0, 1.45, 0.85);
    g.add(glass);
  }

  // roda: depan bisa belok (steer), belakang tetap
  const wheelR = kind === 'truck' ? 0.55 : 0.42;
  const wheelZ = length / 2 - 0.9;
  for (const [sx, sz, steer] of [[-1, wheelZ, true], [1, wheelZ, true], [-1, -wheelZ, false], [1, -wheelZ, false]]) {
    const w = makeWheel(wheelR);
    w.position.set(sx * (width / 2), wheelR, sz);
    w.userData.steer = steer;
    g.add(w);
    wheels.push(w);
  }

  g.position.set(x, 0, z);
  g.rotation.y = heading || 0;
  scene.add(g);

  return {
    group: g,
    kind,
    wheels,
    lightBar,
    length,
    width,
    heading: heading || 0,
    speed: 0,
    steer: 0,
    x,
    z,
    y: 0, // kendaraan selalu di permukaan tanah (dipakai CameraRig)
    radius: Math.max(length, width) / 2,
    driver: null, // 'player' | 'npc' | 'police' | null (parkir)
    npcLane: 0,
    npcSpeed: 0,
    npcDir: 1,
    sirenPhase: 0,
    stuck: 0,
  };
}

// Fisika mengemudi arcade untuk kendaraan yang dikemudikan pemain.
// input: { gas: -1..1, steer: -1..1, handbrake: bool }
// surfaceFactor: 1.0 aspal, 0.8 tanah, 0.55 pasir.
export function driveVehicle(v, input, dt, surfaceFactor) {
  const maxSpeed = CFG.driveMaxSpeed * surfaceFactor;
  const maxReverse = CFG.driveMaxReverse * surfaceFactor;
  const accel = CFG.driveAccel * surfaceFactor;

  if (input.gas > 0) {
    v.speed += accel * input.gas * dt;
  } else if (input.gas < 0) {
    if (v.speed > 0.5) {
      v.speed -= CFG.brakeForce * dt; // rem dulu
    } else {
      v.speed += CFG.driveReverseAccel * surfaceFactor * input.gas * dt;
    }
  } else {
    // melambat alami
    v.speed -= Math.sign(v.speed) * CFG.drag * 2.2 * dt;
    if (Math.abs(v.speed) < 0.15) v.speed = 0;
  }

  if (input.handbrake) {
    v.speed -= Math.sign(v.speed) * CFG.handbrakeDrag * 8 * dt;
    if (Math.abs(v.speed) < 0.4) v.speed = 0;
  }

  v.speed = Math.max(-maxReverse, Math.min(maxSpeed, v.speed));

  // setir: makin cepat makin kecil pengaruhnya, mundur membalik arah setir
  const speedFactor = Math.min(1, Math.abs(v.speed) / 12);
  const targetSteer = input.steer * CFG.steerRate * speedFactor;
  v.steer += (targetSteer - v.steer) * Math.min(1, dt * 8);
  v.heading += v.steer * dt * Math.sign(v.speed || 1) * (v.speed >= 0 ? 1 : -1);
  if (input.handbrake && Math.abs(v.speed) > 4) {
    v.heading += input.steer * dt * 1.4 * Math.sign(v.speed);
  }

  v.x += Math.sin(v.heading) * v.speed * dt;
  v.z += Math.cos(v.heading) * v.speed * dt;

  syncVehicleMesh(v, dt);
}

// Sinkronkan mesh dengan state (dipakai juga kendaraan NPC/polisi).
export function syncVehicleMesh(v, dt) {
  v.group.position.set(v.x, 0, v.z);
  v.group.rotation.y = v.heading;
  const spin = (v.speed / 0.42) * dt;
  for (const w of v.wheels) {
    // putar roda pada sumbu lokal X (setelah rotasi z=90 pada ban, pakai rotation.x)
    w.rotation.x += spin;
    if (w.userData.steer) {
      w.rotation.y = -v.steer * 0.35;
    }
  }
  if (v.lightBar) {
    v.sirenPhase += dt * 9;
    const on = Math.sin(v.sirenPhase) > 0;
    v.lightBar.userData.red.material.color.setHex(on ? 0xff2a2a : 0x550000);
    v.lightBar.userData.blue.material.color.setHex(on ? 0x111144 : 0x2a5cff);
  }
}

// Kendaraan NPC: jalan lurus di lajurnya, putar balik di ujung highway.
export function updateTrafficVehicle(v, dt, playerVehicle) {
  v.speed = v.npcSpeed;
  // menghindar: pelan bila ada kendaraan pemain tepat di depan
  if (playerVehicle) {
    const dx = playerVehicle.x - v.x;
    const dz = playerVehicle.z - v.z;
    const ahead = dx * Math.sin(v.heading) + dz * Math.cos(v.heading);
    const side = Math.abs(dx * Math.cos(v.heading) - dz * Math.sin(v.heading));
    if (ahead > 0 && ahead < 12 && side < 3) {
      v.speed = Math.max(0, v.npcSpeed - 6);
    }
  }
  v.x += Math.sin(v.heading) * v.speed * dt;
  v.z += Math.cos(v.heading) * v.speed * dt;
  if (v.x > CFG.highway.xMax + 10 || v.x < CFG.highway.xMin - 10) {
    // putar balik: teleport ke ujung berlawanan di lajur berlawanan
    v.npcDir *= -1;
    v.heading = v.npcDir > 0 ? Math.PI / 2 : -Math.PI / 2;
    v.x = v.npcDir > 0 ? CFG.highway.xMin : CFG.highway.xMax;
    v.z = v.npcDir > 0 ? -CFG.highway.laneZ : CFG.highway.laneZ;
  }
  syncVehicleMesh(v, dt);
}
