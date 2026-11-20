// Rustline — missions.js
// Rantai 3 misi penyelundupan Coyote/Beto.
// Status: idle -> pickup -> deliver -> done. Marker pilar cahaya + target minimap.
// Misi 2: lewat checkpoint highway = +2 wanted (sekali). Misi 3: bertahan 60 dtk
// di wanted 3 lalu capai hideout.

import * as THREE from 'three';
import { MISSIONS, PLACES, CFG } from './config.js';

function makeMarker(scene) {
  const geo = new THREE.CylinderGeometry(1.6, 1.6, 40, 16, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd23e,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pillar = new THREE.Mesh(geo, mat);
  pillar.position.y = 20;
  pillar.visible = false;
  scene.add(pillar);
  const ringGeo = new THREE.RingGeometry(2.2, 3.0, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd23e,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  ring.visible = false;
  scene.add(ring);
  return { pillar, ring };
}

export class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.index = 0; // misi aktif (0..2); 3 = semua selesai
    this.phase = 'idle'; // idle | pickup | deliver | done
    this.timeLeft = 0;
    this.surviveLeft = 0;
    this.carrying = false;
    this.checkpointTripped = false;
    this.target = null; // {x, z, label}
    this.marker = makeMarker(scene);
    this.objective = 'Temui Coyote di gudang untuk misi pertama.';
    this.dialogue = '';
    this.justCompleted = null; // info misi yang baru selesai (untuk banner)
    this.justFailed = null;
  }

  get current() {
    return MISSIONS[this.index] || null;
  }

  get active() {
    return this.phase === 'pickup' || this.phase === 'deliver';
  }

  get done() {
    return this.index >= MISSIONS.length;
  }

  startMission() {
    const m = this.current;
    if (!m) return;
    this.phase = 'pickup';
    this.carrying = false;
    this.checkpointTripped = false;
    this.timeLeft = m.timeLimit || 0;
    this.surviveLeft = m.surviveSeconds || 0;
    this.dialogue = m.intro;
    this.objective = m.pickupText;
    this.setTarget(PLACES[m.pickup]);
  }

  setTarget(place) {
    this.target = { x: place.x, z: place.z, label: place.label };
    this.marker.pillar.position.x = place.x;
    this.marker.pillar.position.z = place.z;
    this.marker.ring.position.x = place.x;
    this.marker.ring.position.z = place.z;
    this.marker.pillar.visible = true;
    this.marker.ring.visible = true;
  }

  hideMarker() {
    this.marker.pillar.visible = false;
    this.marker.ring.visible = false;
    this.target = null;
  }

  // Dipanggil tiap frame; world menyediakan konteks (posisi, wanted, dll).
  // Mengembalikan event string bila terjadi sesuatu: 'picked' | 'delivered' |
  // 'failed-time' | 'checkpoint' | null.
  update(dt, ctx) {
    if (this.phase === 'idle' || this.done) return null;
    const m = this.current;
    if (!m) return null;

    // denyut marker
    const pulse = 0.2 + 0.12 * Math.sin(ctx.time * 4);
    this.marker.pillar.material.opacity = pulse;

    const px = ctx.playerX;
    const pz = ctx.playerZ;

    if (this.phase === 'pickup') {
      const t = PLACES[m.pickup];
      if (Math.hypot(px - t.x, pz - t.z) < 7) {
        this.phase = 'deliver';
        this.carrying = true;
        this.objective = m.deliverText;
        this.setTarget(PLACES[m.deliver]);
        if (m.forceWanted) {
          ctx.onForceWanted(m.forceWanted);
        }
        return 'picked';
      }
      return null;
    }

    // fase deliver
    if (m.timeLimit > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.failMission('Waktu habis — kargo hangus.');
        return 'failed-time';
      }
    }

    // misi 2: checkpoint highway
    if (m.checkpointPenalty && !this.checkpointTripped) {
      if (Math.abs(px - PLACES.checkpoint.x) < 8 && Math.abs(pz) < 9) {
        this.checkpointTripped = true;
        ctx.onCheckpoint(m.checkpointPenalty);
        return 'checkpoint';
      }
    }

    // misi 3: bertahan di wanted 3
    if (m.surviveSeconds) {
      if (ctx.wanted >= 3) {
        this.surviveLeft -= dt;
        this.objective = `Bertahan di wanted 3: ${Math.ceil(this.surviveLeft)} dtk — lalu ke hideout`;
      } else {
        this.objective = 'Naik ke wanted 3 dan bertahan 60 dtk!';
      }
      if (this.surviveLeft <= 0) {
        this.objective = m.deliverText;
      }
    }

    const t = PLACES[m.deliver];
    const needSurviveDone = !m.surviveSeconds || this.surviveLeft <= 0;
    if (needSurviveDone && Math.hypot(px - t.x, pz - t.z) < 8) {
      const reward = m.reward;
      this.justCompleted = { name: m.name, reward };
      this.index += 1;
      this.carrying = false;
      if (this.done) {
        this.phase = 'done';
        this.objective = 'Semua misi selesai! Rustline milikmu, Rosa.';
        this.hideMarker();
      } else {
        this.phase = 'idle';
        this.objective = 'Kembali ke gudang Coyote untuk misi berikutnya.';
        this.hideMarker();
      }
      return 'delivered';
    }
    return null;
  }

  failMission(reason) {
    this.justFailed = reason;
    this.phase = 'idle';
    this.carrying = false;
    this.objective = 'Misi gagal. Kembali ke gudang Coyote untuk coba lagi.';
    this.hideMarker();
  }

  // Dipanggil saat pemain tiba di gudang dalam keadaan idle.
  tryStartAtWarehouse(px, pz) {
    if (this.phase !== 'idle' || this.done) return false;
    const t = PLACES.warehouse;
    if (Math.hypot(px - t.x, pz - t.z) < 7) {
      this.startMission();
      return true;
    }
    return false;
  }

  reset() {
    this.index = 0;
    this.phase = 'idle';
    this.timeLeft = 0;
    this.surviveLeft = 0;
    this.carrying = false;
    this.checkpointTripped = false;
    this.justCompleted = null;
    this.justFailed = null;
    this.objective = 'Temui Coyote di gudang untuk misi pertama.';
    this.dialogue = '';
    this.hideMarker();
  }

  serialize() {
    return { index: this.index, phase: this.phase };
  }

  deserialize(data) {
    if (!data) return;
    this.index = data.index || 0;
    this.phase = 'idle';
    this.objective = this.done
      ? 'Semua misi selesai! Rustline milikmu, Rosa.'
      : 'Kembali ke gudang Coyote untuk misi berikutnya.';
    this.hideMarker();
  }
}
