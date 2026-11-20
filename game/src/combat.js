// Rustline — combat.js
// Tinju jarak dekat + pistol hitscan + kerusakan.
// Fungsi-fungsi ini murni terhadap state (world) agar mudah diuji.

import * as THREE from 'three';
import { CFG } from './config.js';

// Tinju: semua orang dalam jarak & di depan penyerang kena damage.
export function punchHit(attacker, targets, damage) {
  const hits = [];
  const ax = Math.sin(attacker.heading);
  const az = Math.cos(attacker.heading);
  for (const t of targets) {
    if (t === attacker || t.hp <= 0) continue;
    const dx = t.x - attacker.x;
    const dz = t.z - attacker.z;
    const d = Math.hypot(dx, dz);
    if (d > CFG.punchRange) continue;
    const dot = (dx * ax + dz * az) / (d || 1);
    if (dot < 0.1) continue; // harus di depan
    t.hp -= damage;
    hits.push(t);
  }
  return hits;
}

// Tembakan hitscan dari posisi kamera/pemain ke arah bidikan.
// targets: array orang/kendaraan dengan {x,z,radius,hp}.
// Mengembalikan target pertama yang kena, atau null.
export function hitscan(origin, dir, targets, maxRange) {
  let best = null;
  let bestT = maxRange;
  for (const t of targets) {
    if (t.hp !== undefined && t.hp <= 0) continue;
    const rx = t.x - origin.x;
    const rz = t.z - origin.z;
    const along = rx * dir.x + rz * dir.z;
    if (along < 0 || along > bestT) continue;
    const perpX = rx - dir.x * along;
    const perpZ = rz - dir.z * along;
    const perp = Math.hypot(perpX, perpZ);
    const radius = t.radius || 0.7;
    if (perp < radius) {
      best = t;
      bestT = along;
    }
  }
  return best ? { target: best, distance: bestT } : null;
}

// Efek visual singkat: garis tembakan + percikan.
export function makeTracer(scene, from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(from.x, from.y, from.z),
    new THREE.Vector3(to.x, to.y, to.z),
  ]);
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 })
  );
  scene.add(line);
  return { line, life: 0.09 };
}

export function updateTracers(tracers, dt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    tracers[i].life -= dt;
    if (tracers[i].life <= 0) {
      tracers[i].line.geometry.dispose();
      tracers[i].line.material.dispose();
      tracers[i].line.parent.remove(tracers[i].line);
      tracers.splice(i, 1);
    }
  }
}

// Percikan darah / debu kecil (partikel kotak yang jatuh & memudar).
export function makeImpact(scene, x, y, z, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: color || 0xc22e2e });
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), mat);
    p.position.set(x, y, z);
    p.userData.vx = (Math.random() - 0.5) * 4;
    p.userData.vy = Math.random() * 3 + 1;
    p.userData.vz = (Math.random() - 0.5) * 4;
    g.add(p);
  }
  scene.add(g);
  return { group: g, life: 0.5 };
}

export function updateImpacts(impacts, dt) {
  for (let i = impacts.length - 1; i >= 0; i--) {
    const im = impacts[i];
    im.life -= dt;
    for (const p of im.group.children) {
      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;
      p.userData.vy -= 12 * dt;
    }
    if (im.life <= 0) {
      im.group.parent.remove(im.group);
      impacts.splice(i, 1);
    }
  }
}
