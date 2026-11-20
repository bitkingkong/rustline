// Rustline — people.js
// Manusia: Rosa (pemain), pejalan kaki NPC, dan polisi jalan kaki.
// Animasi jalan memakai legL/legR/armL/armR langsung (bukan `.legs`).
// Pejalan kaki kabur saat ada kejahatan di dekatnya; polisi mengejar & memukul.

import * as THREE from 'three';
import { CFG } from './config.js';

const SKIN = [0xd8a078, 0xb87a52, 0x8a5a38, 0xe8b890];
const SHIRT = [0xc23b2a, 0x2e6f6a, 0xd8a928, 0x4a6fa5, 0x7a4a8a, 0xe0d8c8, 0x3a3a3a];

function limb(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// kind: 'player' | 'ped' | 'cop'
export function makePerson(scene, kind, x, z, heading, seedColor) {
  const g = new THREE.Group();
  const skin = seedColor !== undefined ? SKIN[seedColor % SKIN.length] : SKIN[0];
  const shirt = seedColor !== undefined ? SHIRT[seedColor % SHIRT.length] : 0xc23b2a;

  let torsoColor = shirt;
  let legsColor = 0x2a2a33;
  let hatColor = null;
  if (kind === 'cop') {
    torsoColor = 0x1a2a4a;
    legsColor = 0x14141c;
    hatColor = 0x1a2a4a;
  } else if (kind === 'player') {
    torsoColor = 0xa83226; // jaket merah Rosa
    legsColor = 0x2a2a33;
    hatColor = 0x6a3a1a; // topi koboi
  }

  // torso (pivot di pinggang untuk ayunan)
  const torso = limb(0.62, 0.75, 0.34, torsoColor, 0, 1.12, 0);
  g.add(torso);

  // kepala + topi
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 10),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 })
  );
  head.position.set(0, 1.72, 0);
  head.castShadow = true;
  g.add(head);
  if (hatColor !== null) {
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.46, 0.09, 12),
      new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.9 })
    );
    hat.position.set(0, 1.92, 0);
    g.add(hat);
    const hatTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.24, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.9 })
    );
    hatTop.position.set(0, 2.02, 0);
    g.add(hatTop);
  }
  // rambut Rosa: ponytail
  if (kind === 'player') {
    const hair = limb(0.16, 0.5, 0.16, 0x1a1210, 0, 1.55, -0.28);
    g.add(hair);
  }

  // lengan & kaki — pivot di bahu / pinggul (geometri digeser ke bawah)
  function arm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.38, 1.42, 0);
    const mesh = limb(0.2, 0.72, 0.2, torsoColor, 0, -0.36, 0);
    pivot.add(mesh);
    g.add(pivot);
    return pivot;
  }
  function leg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.17, 0.78, 0);
    const mesh = limb(0.24, 0.78, 0.24, legsColor, 0, -0.39, 0);
    pivot.add(mesh);
    g.add(pivot);
    return pivot;
  }

  const armL = arm(-1);
  const armR = arm(1);
  const legL = leg(-1);
  const legR = leg(1);

  // pistol di tangan kanan (hanya pemain & polisi)
  let gun = null;
  if (kind === 'player' || kind === 'cop') {
    gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.4, metalness: 0.6 })
    );
    gun.position.set(0, -0.72, 0.12);
    armR.add(gun);
  }

  g.position.set(x, 0, z);
  g.rotation.y = heading || 0;
  scene.add(g);

  return {
    group: g,
    kind,
    legL,
    legR,
    armL,
    armR,
    gun,
    x,
    z,
    y: 0,
    vy: 0,
    heading: heading || 0,
    hp: kind === 'cop' ? CFG.copHP : kind === 'player' ? CFG.playerHP : CFG.pedHP,
    speed: 0,
    walkPhase: 0,
    moving: false,
    // AI pejalan kaki
    wanderTarget: null,
    wanderWait: 0,
    fleeing: false,
    fleeUntil: 0,
    // AI polisi
    punchCooldown: 0,
    bustedHold: 0,
    // pemain
    onGround: true,
  };
}

// Ayunan lengan/kaki saat berjalan. phase maju dengan kecepatan.
export function animateWalk(p, dt, speed) {
  p.walkPhase += dt * speed * 1.9;
  const amp = Math.min(0.85, 0.25 + speed * 0.06);
  const s = Math.sin(p.walkPhase);
  p.legL.rotation.x = s * amp;
  p.legR.rotation.x = -s * amp;
  p.armL.rotation.x = -s * amp * 0.8;
  p.armR.rotation.x = s * amp * 0.8;
  if (p.gun) {
    // tangan kanan memegang pistol ke depan saat bersenjata
    p.armR.rotation.x = -1.1;
  }
}

export function idlePose(p) {
  p.legL.rotation.x *= 0.8;
  p.legR.rotation.x *= 0.8;
  p.armL.rotation.x *= 0.8;
  if (!p.gun) p.armR.rotation.x *= 0.8;
  else p.armR.rotation.x = -1.1;
}

export function syncPersonMesh(p) {
  p.group.position.set(p.x, p.y, p.z);
  p.group.rotation.y = p.heading;
}

// Pejalan kaki: mengembara di trotoar kota; kabur dari titik kejahatan.
export function updatePedestrian(p, dt, time, crimePoint) {
  if (crimePoint && time < p.fleeUntil) {
    // kabur menjauhi titik kejahatan
    const dx = p.x - crimePoint.x;
    const dz = p.z - crimePoint.z;
    const d = Math.hypot(dx, dz) || 1;
    const sp = 7.5;
    p.x += (dx / d) * sp * dt;
    p.z += (dz / d) * sp * dt;
    p.heading = Math.atan2(dx, dz);
    p.moving = true;
    animateWalk(p, dt, sp);
  } else if (p.wanderWait > 0) {
    p.wanderWait -= dt;
    p.moving = false;
    idlePose(p);
  } else if (p.wanderTarget) {
    const dx = p.wanderTarget.x - p.x;
    const dz = p.wanderTarget.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6) {
      p.wanderTarget = null;
      p.wanderWait = 1 + Math.random() * 3;
    } else {
      const sp = 1.6;
      p.x += (dx / d) * sp * dt;
      p.z += (dz / d) * sp * dt;
      p.heading = Math.atan2(dx, dz);
      p.moving = true;
      animateWalk(p, dt, sp);
    }
  } else {
    p.wanderTarget = {
      x: -75 + Math.random() * 150,
      z: (Math.random() < 0.5 ? -1 : 1) * (9.5 + Math.random() * 3),
    };
  }
  p.x = Math.max(-300, Math.min(300, p.x));
  p.z = Math.max(-60, Math.min(60, p.z));
  syncPersonMesh(p);
}

// Polisi jalan kaki: kejar pemain, pukul bila dekat.
export function updateCop(p, dt, player, onPunch) {
  const dx = player.x - p.x;
  const dz = player.z - p.z;
  const d = Math.hypot(dx, dz);
  p.punchCooldown -= dt;
  if (d > 1.6) {
    const sp = CFG.copSpeed;
    p.x += (dx / d) * sp * dt;
    p.z += (dz / d) * sp * dt;
    p.heading = Math.atan2(dx, dz);
    p.moving = true;
    animateWalk(p, dt, sp);
  } else {
    p.moving = false;
    // ayunan pukul
    p.armR.rotation.x = -1.6 + Math.sin(p.walkPhase * 3) * 0.4;
    if (p.punchCooldown <= 0) {
      p.punchCooldown = 1.1;
      if (onPunch) onPunch(p);
    }
  }
  syncPersonMesh(p);
}
