// Rustline — world.js
// Dunia game: state, loop update, pemain, kendaraan, polisi, wanted,
// tabrakan, save/load, dan penghubung semua modul.
// Mengekspos `hud` + `audio` (dipakai staging shot & main).

import * as THREE from 'three';
import { CFG, PLACES, COLORS } from './config.js';
import { RNG } from './random.js';
import { Input } from './input.js';
import { createRenderer, createScene, CameraRig, resizeRenderer } from './render.js';
import { buildCity, collideCircle, surfaceAt } from './city.js';
import { makeVehicle, driveVehicle, syncVehicleMesh, updateTrafficVehicle } from './vehicles.js';
import { makePerson, animateWalk, idlePose, syncPersonMesh, updatePedestrian, updateCop } from './people.js';
import { punchHit, hitscan, makeTracer, updateTracers, makeImpact, updateImpacts } from './combat.js';
import { MissionManager } from './missions.js';
import { HUD } from './hud.js';
import { AudioEngine } from './audio.js';

const TRAFFIC_COLORS = [0xc23b2a, 0x2e6f6a, 0xd8a928, 0x4a6fa5, 0x7a4a8a, 0x8a8a80, 0xe0d8c8];

export class World {
  constructor(canvas, seed, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.rng = new RNG(seed || 'rustline-1');
    this.time = 0;
    this.state = 'title'; // title | playing | paused | over
    this.overTimer = 0;
    this.overKind = null;

    this.renderer = createRenderer(canvas);
    const s = createScene();
    this.scene = s.scene;
    this.camera = s.camera;
    this.rig = new CameraRig(this.camera);

    this.city = buildCity(this.scene, this.rng);
    this.colliders = this.city.colliders;

    this.input = new Input();
    this.input.attach(window);
    this.hud = new HUD();
    this.audio = new AudioEngine();
    this.missions = new MissionManager(this.scene);

    // ---- pemain ----
    this.money = CFG.startMoney;
    this.hp = CFG.playerHP;
    this.ammo = CFG.pistolAmmo;
    this.reserve = CFG.pistolReserve;
    this.wanted = 0;
    this.armed = true; // pistol di tangan
    this.inVehicle = null;
    this.fireDelay = 0;
    this.punchDelay = 0;
    this.hurtCooldown = 0;
    this.crimeTimer = 0; // waktu sejak kejahatan terakhir
    this.decayTimer = 0;
    this.crimePoint = null;
    this.crimePointUntil = 0;

    this.player = makePerson(this.scene, 'player', PLACES.playerStart.x, PLACES.playerStart.z, 0, 0);
    this.player.hp = this.hp;

    // ---- truk pemain ----
    this.truck = makeVehicle(this.scene, 'truck', COLORS.truckRed, PLACES.truckStart.x, PLACES.truckStart.z, Math.PI / 2);
    this.truck.driver = null;
    this.truck.condition = 100;

    // ---- traffic NPC ----
    this.traffic = [];
    for (let i = 0; i < CFG.trafficCount; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const kind = this.rng.pick(['car', 'car', 'pickup', 'van']);
      const v = makeVehicle(
        this.scene, kind, TRAFFIC_COLORS[i % TRAFFIC_COLORS.length],
        this.rng.range(-280, 280), dir > 0 ? -CFG.highway.laneZ : CFG.highway.laneZ,
        dir > 0 ? Math.PI / 2 : -Math.PI / 2
      );
      v.driver = 'npc';
      v.npcDir = dir;
      v.npcSpeed = this.rng.range(CFG.trafficSpeed[0], CFG.trafficSpeed[1]);
      v.speed = v.npcSpeed;
      this.traffic.push(v);
    }
    // mobil parkir di kota (bisa dicuri)
    this.parked = [];
    const parkSpots = [[-20, 12, 0], [8, -12, Math.PI], [60, 12, 0]];
    for (const [px, pz, h] of parkSpots) {
      const v = makeVehicle(this.scene, this.rng.pick(['car', 'pickup']), undefined, px, pz, h);
      v.driver = null;
      this.parked.push(v);
    }

    // ---- pejalan kaki ----
    this.peds = [];
    for (let i = 0; i < CFG.pedCount; i++) {
      const p = makePerson(
        this.scene, 'ped',
        this.rng.range(-75, 75), (this.rng.chance(0.5) ? -1 : 1) * this.rng.range(9.5, 12.5),
        this.rng.range(0, Math.PI * 2), i
      );
      this.peds.push(p);
    }

    // ---- polisi ----
    this.policeCars = [];
    this.cops = [];
    this.policeSpawnTimer = 0;
    this.shotFreeze = false; // mode screenshot: polisi diam di tempat (komposisi stabil)

    // ---- roadblock (wanted 5) di x=-120 ----
    this.roadblock = this._buildRoadblock();
    this.roadblockActive = false;

    // ---- pickup tersebar ----
    this.pickups = [];
    this._spawnPickups();

    this.tracers = [];
    this.impacts = [];

    // banner misi pertama
    this.hud.setContinueAvailable(this.hasSave());
    window.addEventListener('resize', () => {
      resizeRenderer(this.renderer);
      this.rig.resize();
    });
  }

  _buildRoadblock() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.6 });
    const red = new THREE.MeshStandardMaterial({ color: 0xc22e2e, roughness: 0.6 });
    for (const bx of [-4.5, -1.5, 1.5, 4.5]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.3), bx % 2 === 0 ? mat : red);
      bar.position.set(bx, 1.0, 0);
      g.add(bar);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, 0.25), mat);
      leg.position.set(bx, 0.5, 0);
      g.add(leg);
    }
    g.position.set(-120, 0, 0);
    g.visible = false;
    this.scene.add(g);
    const colliders = [];
    for (const bx of [-4.5, -1.5, 1.5, 4.5]) {
      colliders.push({ minX: -120 + bx - 1.4, maxX: -120 + bx + 1.4, minZ: -0.5, maxZ: 0.5 });
    }
    return { group: g, colliders };
  }

  _spawnPickups() {
    const defs = [
      { type: 'medkit', x: PLACES.diner.x + 6, z: PLACES.diner.z + 4, color: 0x37c978 },
      { type: 'ammo', x: PLACES.garage.x - 6, z: PLACES.garage.z + 4, color: 0xd8a928 },
      { type: 'repair', x: PLACES.garage.x + 6, z: PLACES.garage.z - 4, color: 0x9a9a9a },
      { type: 'medkit', x: PLACES.motel.x + 8, z: PLACES.motel.z + 2, color: 0x37c978 },
      { type: 'ammo', x: PLACES.gasStation.x - 8, z: PLACES.gasStation.z + 2, color: 0xd8a928 },
      { type: 'repair', x: PLACES.hideout.x + 10, z: PLACES.hideout.z + 6, color: 0x9a9a9a },
    ];
    for (const d of defs) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.7),
        new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.4, emissive: d.color, emissiveIntensity: 0.25 })
      );
      mesh.position.set(d.x, 0.9, d.z);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.pickups.push({ ...d, mesh, taken: false, respawnIn: 0 });
    }
  }

  // ================= save / load =================
  hasSave() {
    try {
      return !!localStorage.getItem(CFG.saveKey);
    } catch (e) {
      return false;
    }
  }

  save() {
    try {
      const data = {
        money: this.money,
        hp: this.hp,
        ammo: this.ammo,
        reserve: this.reserve,
        x: this.player.x,
        z: this.player.z,
        heading: this.player.heading,
        missionIndex: this.missions.index,
        wanted: 0,
        savedAt: Date.now(),
      };
      localStorage.setItem(CFG.saveKey, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(CFG.saveKey);
      if (!raw) return false;
      const d = JSON.parse(raw);
      this.money = d.money || 0;
      this.hp = d.hp || CFG.playerHP;
      this.player.hp = this.hp;
      this.ammo = d.ammo !== undefined ? d.ammo : CFG.pistolAmmo;
      this.reserve = d.reserve || 0;
      this.player.x = d.x !== undefined ? d.x : PLACES.playerStart.x;
      this.player.z = d.z !== undefined ? d.z : PLACES.playerStart.z;
      this.player.heading = d.heading || 0;
      this.missions.deserialize({ index: d.missionIndex || 0 });
      this.wanted = 0;
      syncPersonMesh(this.player);
      return true;
    } catch (e) {
      return false;
    }
  }

  newGame() {
    this.money = CFG.startMoney;
    this.hp = CFG.playerHP;
    this.player.hp = this.hp;
    this.ammo = CFG.pistolAmmo;
    this.reserve = CFG.pistolReserve;
    this.wanted = 0;
    this.player.x = PLACES.playerStart.x;
    this.player.z = PLACES.playerStart.z;
    this.player.y = 0;
    this.player.heading = 0;
    this.inVehicle = null;
    this.truck.x = PLACES.truckStart.x;
    this.truck.z = PLACES.truckStart.z;
    this.truck.heading = Math.PI / 2;
    this.truck.speed = 0;
    this.truck.condition = 100;
    syncVehicleMesh(this.truck, 0);
    syncPersonMesh(this.player);
    this.missions.reset();
    this.clearPolice();
    this.state = 'playing';
    this.hud.showGame();
    this.hud.banner('RUSTLINE', 'Rosa Vega — temui Coyote di gudang. Misi 1 menunggu.', 4);
  }

  clearPolice() {
    for (const p of this.policeCars) this.scene.remove(p.group);
    for (const c of this.cops) this.scene.remove(c.group);
    this.policeCars = [];
    this.cops = [];
  }

  // ================= kejahatan & wanted =================
  crime(amount, point) {
    if (amount <= 0) return;
    this.wanted = Math.min(CFG.wantedMax, this.wanted + amount);
    this.crimeTimer = 0;
    this.decayTimer = 0;
    if (point) {
      this.crimePoint = { x: point.x, z: point.z };
      this.crimePointUntil = this.time + 6;
      for (const p of this.peds) {
        if (Math.hypot(p.x - point.x, p.z - point.z) < 40) {
          p.fleeUntil = this.time + 6;
        }
      }
    }
    this.audio.setSiren(this.wanted >= 1);
  }

  forceWanted(n) {
    this.wanted = Math.max(this.wanted, n);
    this.audio.setSiren(this.wanted >= 1);
  }

  nearestPoliceDist() {
    let best = 1e9;
    for (const p of this.policeCars) {
      best = Math.min(best, Math.hypot(p.x - this.player.x, p.z - this.player.z));
    }
    for (const c of this.cops) {
      best = Math.min(best, Math.hypot(c.x - this.player.x, c.z - this.player.z));
    }
    return best;
  }

  // ================= kendaraan =================
  nearestVehicle(maxDist) {
    let best = null;
    let bestD = maxDist;
    const all = [this.truck, ...this.parked, ...this.traffic];
    for (const v of all) {
      const d = Math.hypot(v.x - this.player.x, v.z - this.player.z);
      if (d < bestD) {
        best = v;
        bestD = d;
      }
    }
    return best;
  }

  enterVehicle(v) {
    if (v.driver === 'npc') {
      // curi kendaraan traffic: sopir kabur (kendaraan berhenti jadi milik pemain)
      this.crime(1, { x: v.x, z: v.z });
      this.hud.banner('KENDARAAN DICURI', '+1 wanted — polisi mengejarmu.', 2.5);
    } else if (v !== this.truck) {
      this.crime(1, { x: v.x, z: v.z });
      this.hud.banner('KENDARAAN DICURI', '+1 wanted — mobil ini bukan milikmu.', 2.5);
    }
    v.driver = 'player';
    this.inVehicle = v;
    this.player.group.visible = false;
    this.audio.ensure();
  }

  exitVehicle() {
    const v = this.inVehicle;
    if (!v) return;
    v.driver = null;
    this.inVehicle = null;
    // turun di sisi kiri kendaraan
    const sideX = v.x + Math.cos(v.heading) * 2.2;
    const sideZ = v.z - Math.sin(v.heading) * 2.2;
    const fixed = collideCircle(this.colliders, sideX, sideZ, CFG.playerRadius);
    this.player.x = fixed.x;
    this.player.z = fixed.z;
    this.player.heading = v.heading;
    this.player.group.visible = true;
    syncPersonMesh(this.player);
  }

  // ================= combat =================
  tryPunch() {
    if (this.punchDelay > 0 || this.inVehicle) return;
    this.punchDelay = CFG.punchDelay;
    this.audio.punch();
    const targets = [...this.peds, ...this.cops];
    const hits = punchHit(this.player, targets, CFG.punchDamage);
    for (const t of hits) {
      this.impacts.push(makeImpact(this.scene, t.x, 1.2, t.z, 0xc22e2e));
      if (t.kind === 'cop') {
        this.crime(1, { x: t.x, z: t.z });
        if (t.hp <= 0) {
          this.crime(1, { x: t.x, z: t.z });
          t.group.visible = false;
          this.hud.banner('POLISI TUMBANG', '+1 wanted — jangan sampai ketangkap.', 2.5);
        }
      } else if (t.kind === 'ped') {
        this.crime(1, { x: t.x, z: t.z });
        if (t.hp <= 0) {
          t.group.visible = false;
          t.respawnIn = 20;
        }
      }
    }
  }

  tryShoot() {
    if (this.fireDelay > 0 || this.inVehicle || !this.armed) return;
    if (this.ammo <= 0) {
      this.audio.reload();
      return;
    }
    this.fireDelay = CFG.pistolFireDelay;
    this.ammo -= 1;
    this.audio.shot();
    this.crime(1, { x: this.player.x, z: this.player.z });
    // arah bidik = arah kamera
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = { x: this.player.x, y: 1.5, z: this.player.z };
    const dir2 = { x: dir.x, z: dir.z };
    const len = Math.hypot(dir2.x, dir2.z) || 1;
    dir2.x /= len;
    dir2.z /= len;
    const targets = [];
    for (const p of [...this.peds, ...this.cops]) {
      if (p.group.visible) targets.push({ ...p, radius: 0.8 });
    }
    for (const v of [...this.policeCars, ...this.traffic]) {
      targets.push({ x: v.x, z: v.z, radius: 2.2, hp: 100, vehicle: v, kind: 'vehicle' });
    }
    const hit = hitscan(origin, dir2, targets, CFG.pistolRange);
    let end;
    if (hit) {
      const t = hit.target;
      end = { x: origin.x + dir2.x * hit.distance, y: 1.2, z: origin.z + dir2.z * hit.distance };
      if (t.vehicle) {
        t.vehicle.condition = (t.vehicle.condition || 100) - CFG.pistolDamage;
        this.impacts.push(makeImpact(this.scene, end.x, end.y, end.z, 0xffd23e));
        if (t.vehicle.condition <= 0 && t.vehicle.kind === 'police') {
          t.vehicle.disabled = true;
        }
      } else {
        // orang sungguhan: kurangi hp objek aslinya
        const real = [...this.peds, ...this.cops].find((p) => p.x === t.x && p.z === t.z);
        if (real) {
          real.hp -= CFG.pistolDamage;
          this.impacts.push(makeImpact(this.scene, real.x, 1.2, real.z, 0xc22e2e));
          if (real.hp <= 0) {
            real.group.visible = false;
            if (real.kind === 'cop') {
              this.crime(1, { x: real.x, z: real.z });
              this.hud.banner('POLISI TUMBANG', 'Satu polisi kurang. Wanted naik.', 2.5);
            } else {
              real.respawnIn = 20;
            }
          }
        }
      }
    } else {
      end = { x: origin.x + dir2.x * CFG.pistolRange, y: 1.2, z: origin.z + dir2.z * CFG.pistolRange };
    }
    this.tracers.push(makeTracer(this.scene, { x: origin.x, y: 1.5, z: origin.z }, end));
  }

  reload() {
    if (this.reserve <= 0 || this.ammo >= CFG.pistolAmmo) return;
    const need = CFG.pistolAmmo - this.ammo;
    const take = Math.min(need, this.reserve);
    this.ammo += take;
    this.reserve -= take;
    this.audio.reload();
  }

  hurtPlayer(dmg, fromX, fromZ) {
    if (this.hurtCooldown > 0 || this.state !== 'playing') return;
    this.hurtCooldown = 0.7;
    this.hp -= dmg;
    this.player.hp = this.hp;
    this.audio.hurt();
    if (fromX !== undefined) {
      // dorong menjauh
      const dx = this.player.x - fromX;
      const dz = this.player.z - fromZ;
      const d = Math.hypot(dx, dz) || 1;
      const fixed = collideCircle(this.colliders, this.player.x + (dx / d) * 1.2, this.player.z + (dz / d) * 1.2, CFG.playerRadius);
      this.player.x = fixed.x;
      this.player.z = fixed.z;
    }
    if (this.hp <= 0) this.die('wasted');
  }

  die(kind) {
    this.overKind = kind;
    this.state = 'over';
    this.overTimer = 2.6;
    this.audio.busted();
    const fine = kind === 'busted' ? CFG.bustedFine : CFG.wastedFine;
    this.money = Math.max(0, this.money - fine);
    this.hud.showGameOver(kind, fine);
    this.hud.hideGame();
    this.audio.setSiren(false);
    this.audio.setEngine(0, false);
  }

  respawn() {
    if (this.inVehicle) this.exitVehicle();
    this.player.x = PLACES.motelSpawn.x;
    this.player.z = PLACES.motelSpawn.z;
    this.player.y = 0;
    this.player.vy = 0;
    this.player.heading = 0;
    this.hp = CFG.playerHP;
    this.player.hp = this.hp;
    this.wanted = 0;
    this.clearPolice();
    this.audio.setSiren(false);
    syncPersonMesh(this.player);
    this.state = 'playing';
    this.hud.showGame();
    this.hud.banner('BANGUN DI MOTEL', 'Rosa kembali beraksi. Hati-hati lain kali.', 3);
  }

  // ================= polisi =================
  spawnPoliceCar() {
    const side = this.rng.sign();
    const v = makeVehicle(
      this.scene, 'police', 0xf0f0e8,
      side * 280, side > 0 ? -CFG.highway.laneZ : CFG.highway.laneZ,
      side > 0 ? -Math.PI / 2 : Math.PI / 2
    );
    v.driver = 'police';
    v.condition = 100;
    v.speed = 0;
    this.policeCars.push(v);
  }

  spawnCop() {
    const ang = this.rng.range(0, Math.PI * 2);
    const x = this.player.x + Math.sin(ang) * 26;
    const z = this.player.z + Math.cos(ang) * 26;
    const c = makePerson(this.scene, 'cop', x, z, 0, 0);
    this.cops.push(c);
  }

  updatePolice(dt) {
    if (this.shotFreeze) {
      // mode screenshot: polisi tetap di tempat, hanya animasi light bar
      for (const p of this.policeCars) syncVehicleMesh(p, dt);
      return;
    }
    const wantCars = this.wanted >= 1 ? Math.min(this.wanted, CFG.policeCarMax) : 0;
    this.policeSpawnTimer -= dt;
    if (this.policeCars.length < wantCars && this.policeSpawnTimer <= 0) {
      this.spawnPoliceCar();
      this.policeSpawnTimer = 2.5;
    }
    if (this.wanted === 0 && this.policeCars.length > 0) {
      // polisi mundur saat wanted hilang
      for (const p of this.policeCars) {
        p.speed = Math.max(0, p.speed - 20 * dt);
        p.x += Math.sin(p.heading) * p.speed * dt;
        p.z += Math.cos(p.heading) * p.speed * dt;
        syncVehicleMesh(p, dt);
        if (Math.abs(p.x) > 310) {
          this.scene.remove(p.group);
          this.policeCars.splice(this.policeCars.indexOf(p), 1);
        }
      }
    }
    const target = this.inVehicle || this.player;
    for (const p of this.policeCars) {
      if (p.disabled) {
        p.speed = Math.max(0, p.speed - 10 * dt);
        syncVehicleMesh(p, dt);
        continue;
      }
      // kejar target
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const d = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - p.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
      const targetSpeed = d > 6 ? 27 : 12;
      p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 1.2);
      const prevX = p.x;
      const prevZ = p.z;
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      const fixed = collideCircle(this.colliders, p.x, p.z, 1.4);
      if (Math.hypot(fixed.x - p.x, fixed.z - p.z) > 0.05) {
        p.x = prevX;
        p.z = prevZ;
        p.speed *= 0.4;
      }
      // tabrak kendaraan pemain
      if (this.inVehicle && d < 3.4) {
        this.inVehicle.condition = Math.max(0, (this.inVehicle.condition || 100) - 4 * dt * 10);
        this.inVehicle.speed *= 1 - Math.min(1, dt * 2);
      }
      // tabrak pemain jalan kaki
      if (!this.inVehicle && d < 2.2) {
        this.hurtPlayer(12, p.x, p.z);
      }
      syncVehicleMesh(p, dt);
    }
    // polisi jalan kaki saat wanted >= 3
    const wantCops = this.wanted >= 3 ? (this.wanted >= 5 ? 3 : 2) : 0;
    if (this.cops.length < wantCops && this.policeSpawnTimer <= 0) {
      this.spawnCop();
      this.policeSpawnTimer = 3;
    }
    for (const c of this.cops) {
      if (c.hp <= 0) continue;
      updateCop(c, dt, this.player, () => {
        this.hurtPlayer(CFG.copPunchDamage, c.x, c.z);
      });
      // busted: polisi menempel 1,5 dtk
      const d = Math.hypot(c.x - this.player.x, c.z - this.player.z);
      if (!this.inVehicle && d < 1.6) {
        c.bustedHold += dt;
        if (c.bustedHold > CFG.bustedHoldSeconds) {
          this.die('busted');
          return;
        }
      } else {
        c.bustedHold = 0;
      }
    }
    // roadblock di wanted 5
    const rb = this.wanted >= CFG.roadblockAtWanted;
    if (rb !== this.roadblockActive) {
      this.roadblockActive = rb;
      this.roadblock.group.visible = rb;
      if (rb) this.hud.banner('ROADBLOCK!', 'Polisi menutup highway. Cari jalan lain!', 3);
    }
  }

  activeColliders() {
    if (this.roadblockActive) return this.colliders.concat(this.roadblock.colliders);
    return this.colliders;
  }

  // ================= update utama =================
  step(dt, opts) {
    opts = opts || {};
    dt = Math.min(dt, 0.1); // jepit longgar agar game tetap berjalan di renderer lambat
    this.time += dt;
    if (this.state === 'playing') {
      this.update(dt);
    } else if (this.state === 'title') {
      this.updateAmbient(dt);
      // kamera orbit pelan di atas highway
      const t = this.time * 0.05;
      const tx = Math.sin(t) * 40;
      const tz = Math.cos(t * 0.7) * 20;
      this.camera.position.set(tx - 30, 14, tz + 26);
      this.camera.lookAt(0, 2, 0);
    } else if (this.state === 'over') {
      this.overTimer -= dt;
      this.updateAmbient(dt);
      if (this.overTimer <= 0) this.respawn();
    }
    updateTracers(this.tracers, dt);
    updateImpacts(this.impacts, dt);
    if (opts.render !== false) {
      this.renderer.render(this.scene, this.camera);
    }
    this.input.endFrame();
  }

  updateAmbient(dt) {
    const pv = this.inVehicle || null;
    for (const v of this.traffic) updateTrafficVehicle(v, dt, pv);
    for (const p of this.peds) {
      if (p.hp > 0 && p.group.visible) updatePedestrian(p, dt, this.time, null);
    }
  }

  update(dt) {
    const inp = this.input;
    // ---- jeda / mute ----
    if (inp.wasPressed('KeyP') || inp.wasPressed('Escape')) {
      this.state = 'paused';
      this.hud.setScreen('pause');
      this.hud.setPauseNote('');
      this.audio.setEngine(0, false);
      this.audio.setSiren(false);
      return;
    }
    if (inp.wasPressed('KeyM')) {
      this.audio.setMuted(!this.audio.muted);
    }
    this.fireDelay -= dt;
    this.punchDelay -= dt;
    this.hurtCooldown -= dt;
    this.crimeTimer += dt;

    // ---- kamera drag ----
    const mouse = inp.consumeMouse();
    if (mouse.dx || mouse.dy) this.rig.applyDrag(mouse.dx, mouse.dy);

    // ---- pemain ----
    if (this.inVehicle) {
      this.updateDriving(dt);
    } else {
      this.updateOnFoot(dt);
    }

    // ---- traffic & pejalan kaki ----
    const pv = this.inVehicle;
    for (const v of this.traffic) updateTrafficVehicle(v, dt, pv);
    for (const v of this.parked) {
      if (v.driver === null && Math.abs(v.speed) > 0.1) {
        v.speed *= 1 - Math.min(1, dt * 1.5);
        v.x += Math.sin(v.heading) * v.speed * dt;
        v.z += Math.cos(v.heading) * v.speed * dt;
        syncVehicleMesh(v, dt);
      }
    }
    for (const p of this.peds) {
      if (p.hp <= 0) {
        p.respawnIn = (p.respawnIn || 0) - dt;
        if (p.respawnIn <= 0) {
          p.hp = CFG.pedHP;
          p.x = this.rng.range(-75, 75);
          p.z = (this.rng.chance(0.5) ? -1 : 1) * this.rng.range(9.5, 12.5);
          p.group.visible = true;
          syncPersonMesh(p);
        }
        continue;
      }
      const cp = this.time < this.crimePointUntil ? this.crimePoint : null;
      updatePedestrian(p, dt, this.time, cp);
    }

    // ---- tabrakan kendaraan pemain vs traffic ----
    if (this.inVehicle) this.checkVehicleCollisions(dt);

    // ---- polisi & wanted ----
    this.updatePolice(dt);
    if (this.state !== 'playing') return; // bisa mati saat updatePolice
    if (this.wanted > 0) {
      this.decayTimer += dt;
      if (this.decayTimer > CFG.wantedDecaySeconds && this.nearestPoliceDist() > CFG.wantedDecayDistance) {
        this.wanted -= 1;
        this.decayTimer = 0;
        this.audio.setSiren(this.wanted >= 1);
      }
    }

    // ---- pickup ----
    this.updatePickups(dt);

    // ---- misi ----
    const ev = this.missions.update(dt, {
      time: this.time,
      playerX: this.player.x,
      playerZ: this.player.z,
      wanted: this.wanted,
      onForceWanted: (n) => this.forceWanted(n),
      onCheckpoint: (pen) => {
        this.crime(pen, { x: PLACES.checkpoint.x, z: 0 });
        this.hud.banner('CHECKPOINT!', `Polisi melihatmu — +${pen} wanted!`, 3);
      },
    });
    if (ev === 'picked') {
      this.audio.pickup();
      this.hud.banner('KARGO DIAMBIL', this.missions.objective, 2.5);
    } else if (ev === 'delivered') {
      const done = this.missions.justCompleted;
      if (done) {
        this.money += done.reward;
        this.audio.jingle();
        this.hud.banner('MISI SELESAI: ' + done.name.toUpperCase(), `+$${done.reward} — total $${this.money}`, 4);
        this.save(); // autosave
      }
    } else if (ev === 'failed-time') {
      this.audio.hurt();
      this.hud.banner('MISI GAGAL', this.missions.justFailed || 'Waktu habis.', 3);
    } else if (ev === 'checkpoint') {
      this.audio.hurt();
    }

    // ---- HUD & audio & kamera ----
    const speed = this.inVehicle ? Math.abs(this.inVehicle.speed) : 0;
    this.audio.setEngine(this.inVehicle ? speed / CFG.driveMaxSpeed : 0, !!this.inVehicle);
    this.audio.setSiren(this.wanted >= 1 && this.state === 'playing');
    this.hud.update({
      money: this.money,
      hp: this.hp,
      maxHp: CFG.playerHP,
      ammo: this.ammo,
      reserve: this.reserve,
      wanted: this.wanted,
      objective: this.missions.objective,
      timeLeft: this.missions.phase === 'deliver' && this.missions.current ? this.missions.timeLeft : 0,
      driving: !!this.inVehicle,
      speed: this.inVehicle ? this.inVehicle.speed : 0,
      armed: this.armed,
      muted: this.audio.muted,
      inVehicle: !!this.inVehicle,
    });
    this.hud.drawMinimap(this, this.time);
    const follow = this.inVehicle || this.player;
    const heading = this.inVehicle ? this.inVehicle.heading : null;
    this.rig.update(follow, heading, dt, false);
  }

  updateOnFoot(dt) {
    const inp = this.input;
    const mv = inp.moveVector();
    const running = inp.down('ShiftLeft') || inp.down('ShiftRight');
    const speed = running ? CFG.runSpeed : CFG.walkSpeed;
    // arah relatif kamera
    const yaw = this.rig.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    let mx = fx * mv.y + rx * mv.x;
    let mz = fz * mv.y + rz * mv.x;
    const len = Math.hypot(mx, mz);
    const moving = len > 0.01;
    if (moving) {
      mx /= len;
      mz /= len;
      const nx = this.player.x + mx * speed * dt;
      const nz = this.player.z + mz * speed * dt;
      const fixed = collideCircle(this.activeColliders(), nx, nz, CFG.playerRadius);
      this.player.x = Math.max(-CFG.worldBound, Math.min(CFG.worldBound, fixed.x));
      this.player.z = Math.max(-CFG.worldBound, Math.min(CFG.worldBound, fixed.z));
      this.player.heading = Math.atan2(mx, mz);
      animateWalk(this.player, dt, speed);
    } else {
      idlePose(this.player);
    }
    // lompat + gravitasi
    if (inp.wasPressed('Space') && this.player.onGround) {
      this.player.vy = CFG.jumpSpeed;
      this.player.onGround = false;
    }
    if (!this.player.onGround) {
      this.player.vy -= CFG.gravity * dt;
      this.player.y += this.player.vy * dt;
      if (this.player.y <= 0) {
        this.player.y = 0;
        this.player.vy = 0;
        this.player.onGround = true;
      }
    }
    syncPersonMesh(this.player);

    // E: masuk kendaraan / mulai misi di gudang
    if (inp.wasPressed('KeyE')) {
      const v = this.nearestVehicle(3.8);
      if (v) {
        this.enterVehicle(v);
      } else if (this.missions.phase === 'idle' && !this.missions.done) {
        const t = PLACES.warehouse;
        if (Math.hypot(this.player.x - t.x, this.player.z - t.z) < 9) {
          this.missions.startMission();
          this.audio.pickup();
          this.hud.banner('MISI: ' + this.missions.current.name.toUpperCase(), this.missions.dialogue, 4.5);
        }
      }
    }
    // F pukul, klik tembak, R reload, 1/2 ganti senjata
    if (inp.wasPressed('KeyF')) this.tryPunch();
    if (inp.wasPressed('KeyR')) this.reload();
    if (inp.wasPressed('Digit1')) this.armed = true;
    if (inp.wasPressed('Digit2')) this.armed = false;
    if (inp.consumeClick()) this.tryShoot();
    // tabrak pejalan kaki oleh... (jalan kaki tidak menabrak)
  }

  updateDriving(dt) {
    const inp = this.input;
    const v = this.inVehicle;
    const mv = inp.moveVector();
    // A = kiri (+1), D = kanan (-1)
    const steerInput = (inp.down('KeyA') || inp.down('ArrowLeft') ? 1 : 0) + (inp.down('KeyD') || inp.down('ArrowRight') ? -1 : 0);
    const gas = mv.y; // W=+1 gas, S=-1 rem/mundur
    const surface = CFG.surfaceFactor[surfaceAt(v.x, v.z)];
    const prevX = v.x;
    const prevZ = v.z;
    driveVehicle(v, { gas, steer: steerInput, handbrake: inp.down('Space') }, dt, surface);
    // tabrakan gedung
    const fixed = collideCircle(this.activeColliders(), v.x, v.z, 1.5);
    if (Math.hypot(fixed.x - v.x, fixed.z - v.z) > 0.05) {
      v.x = prevX;
      v.z = prevZ;
      v.speed *= -0.25;
      v.condition = Math.max(0, (v.condition || 100) - 2);
      this.audio.punch();
      syncVehicleMesh(v, dt);
    }
    // keluar batas dunia
    v.x = Math.max(-CFG.worldBound, Math.min(CFG.worldBound, v.x));
    v.z = Math.max(-CFG.worldBound, Math.min(CFG.worldBound, v.z));
    // truk pemain jadi posisi pemain untuk misi/polisi
    this.player.x = v.x;
    this.player.z = v.z;
    this.player.heading = v.heading;
    // tabrak pejalan kaki
    for (const p of this.peds) {
      if (p.hp <= 0 || !p.group.visible) continue;
      const d = Math.hypot(p.x - v.x, p.z - v.z);
      if (d < 1.8 && Math.abs(v.speed) > 3) {
        p.hp = 0;
        p.group.visible = false;
        p.respawnIn = 20;
        this.crime(1, { x: p.x, z: p.z });
        this.hud.banner('PEJALAN KAKI TERTABRAK', '+1 wanted!', 2.5);
        this.audio.punch();
      }
    }
    if (inp.wasPressed('KeyE')) this.exitVehicle();
    if (inp.wasPressed('KeyH')) this.audio.horn();
    // truk rusak parah: kecepatan dibatasi
    if ((v.condition || 100) <= 0) {
      v.speed *= 1 - Math.min(1, dt * 2);
    }
  }

  checkVehicleCollisions(dt) {
    const v = this.inVehicle;
    const others = [...this.traffic, ...this.policeCars, ...this.parked];
    for (const o of others) {
      if (o === v) continue;
      const d = Math.hypot(o.x - v.x, o.z - v.z);
      const minD = (v.length + o.length) / 2 - 0.8;
      if (d < minD && d > 0.01) {
        // dorong menjauh + tukar sedikit kecepatan
        const nx = (v.x - o.x) / d;
        const nz = (v.z - o.z) / d;
        const push = (minD - d) / 2;
        v.x += nx * push;
        v.z += nz * push;
        if (o.driver === 'npc' || o.driver === 'police') {
          o.x -= nx * push;
          o.z -= nz * push;
        }
        const rel = Math.abs(v.speed - o.speed);
        if (rel > 4) {
          v.condition = Math.max(0, (v.condition || 100) - 1);
          v.speed *= 0.85;
          if (o.driver === 'npc') o.speed *= 0.85;
          this.audio.punch();
        }
        syncVehicleMesh(v, dt);
        syncVehicleMesh(o, dt);
      }
    }
  }

  updatePickups(dt) {
    for (const pk of this.pickups) {
      if (pk.taken) {
        pk.respawnIn -= dt;
        if (pk.respawnIn <= 0) {
          pk.taken = false;
          pk.mesh.visible = true;
        }
        continue;
      }
      pk.mesh.rotation.y += dt * 1.5;
      pk.mesh.position.y = 0.9 + Math.sin(this.time * 2 + pk.x) * 0.15;
      const d = Math.hypot(pk.x - this.player.x, pk.z - this.player.z);
      if (d < 2.2) {
        pk.taken = true;
        pk.mesh.visible = false;
        pk.respawnIn = 60;
        this.audio.pickup();
        if (pk.type === 'medkit') {
          this.hp = Math.min(CFG.playerHP, this.hp + 40);
          this.player.hp = this.hp;
          this.hud.banner('MEDKIT', '+40 HP', 2);
        } else if (pk.type === 'ammo') {
          this.reserve += 24;
          this.hud.banner('AMUNISI', '+24 peluru cadangan', 2);
        } else {
          if (this.truck) this.truck.condition = 100;
          this.hud.banner('REPAIR KIT', 'Truk diperbaiki penuh', 2);
        }
      }
    }
  }
}
