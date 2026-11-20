// Rustline — city.js
// Membangun kota gurun Rustline: tanah, highway, jalan tanah, gedung prosedural,
// pom bensin, motel, diner, bengkel, gudang, menara air, hideout, checkpoint,
// dune, kaktus, batu, tiang telepon, billboard, dan lampu jalan.
// Mengembalikan colliders (AABB) + posisi landmark untuk misi & minimap.

import * as THREE from 'three';
import { CFG, PLACES, COLORS } from './config.js';
import {
  adobeTexture,
  windowTexture,
  roadTexture,
  sandTexture,
  dirtTexture,
  signTexture,
} from './textures.js';

function box(w, h, d, mat, x, y, z, shadow) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (shadow !== false) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  return m;
}

// Gabung beberapa BufferGeometry (non-indexed) jadi satu — untuk InstancedMesh.
function mergeGeoms(geoms) {
  let posLen = 0;
  let normLen = 0;
  let uvLen = 0;
  const parts = geoms.map((g) => {
    const ng = g.index ? g.toNonIndexed() : g;
    posLen += ng.attributes.position.array.length;
    normLen += ng.attributes.normal.array.length;
    uvLen += ng.attributes.uv ? ng.attributes.uv.array.length : 0;
    return ng;
  });
  const pos = new Float32Array(posLen);
  const norm = new Float32Array(normLen);
  const uv = new Float32Array(uvLen);
  let po = 0;
  let no = 0;
  let uo = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, po);
    po += g.attributes.position.array.length;
    norm.set(g.attributes.normal.array, no);
    no += g.attributes.normal.array.length;
    if (g.attributes.uv) {
      uv.set(g.attributes.uv.array, uo);
      uo += g.attributes.uv.array.length;
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  if (uvLen > 0) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _euler = new THREE.Euler();
function setInstance(mesh, i, x, y, z, ry, sx, sy, sz) {
  _euler.set(0, ry || 0, 0);
  _q.setFromEuler(_euler);
  _m4.compose(
    new THREE.Vector3(x, y, z),
    _q,
    new THREE.Vector3(sx || 1, sy || 1, sz || 1)
  );
  mesh.setMatrixAt(i, _m4);
}

export function buildCity(scene, rng) {
  const colliders = [];
  const landmarks = {};
  const animated = { neon: [], lampLights: [] };
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  const addCollider = (x, z, hw, hd) => {
    colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
  };

  // ---------- tanah gurun ----------
  const sandTex = sandTexture();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 760),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // ---------- highway timur-barat ----------
  const roadTex = roadTexture();
  const highway = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 12),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9 })
  );
  highway.rotation.x = -Math.PI / 2;
  highway.position.set(0, 0.02, 0);
  highway.receiveShadow = true;
  group.add(highway);

  // ---------- jalan tanah utara-selatan ----------
  const dirtTex = dirtTexture();
  for (const dx of CFG.dirtRoads) {
    const dirt = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 420),
      new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 1 })
    );
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.set(dx, 0.03, 0);
    dirt.receiveShadow = true;
    group.add(dirt);
  }

  // ---------- trotoar kota ----------
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9c8a72, roughness: 1 });
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(160, 0.18, 5), sidewalkMat);
    walk.position.set(0, 0.09, side * 9.5);
    walk.receiveShadow = true;
    group.add(walk);
  }

  // ---------- material gedung ----------
  const adobeA = new THREE.MeshStandardMaterial({ map: adobeTexture('#d9a066', '#a87a44'), roughness: 0.95 });
  const adobeB = new THREE.MeshStandardMaterial({ map: adobeTexture('#c98f5a', '#9c6a38'), roughness: 0.95 });
  const adobeC = new THREE.MeshStandardMaterial({ map: adobeTexture('#e0b47e', '#b5854a'), roughness: 0.95 });
  const winMat = new THREE.MeshStandardMaterial({ map: windowTexture('#c98f5a', true), roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: COLORS.roof, roughness: 1 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x6a6f75, roughness: 0.5, metalness: 0.6 });

  function building(x, z, w, h, d, mat, signText, signBg, signFg, signSub) {
    const g = new THREE.Group();
    const body = box(w, h, d, mat || adobeA, 0, h / 2, 0);
    g.add(body);
    const front = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.92, h * 0.8),
      winMat
    );
    front.position.set(0, h * 0.48, d / 2 + 0.02);
    g.add(front);
    const roof = box(w + 0.6, 0.35, d + 0.6, roofMat, 0, h + 0.17, 0);
    g.add(roof);
    if (signText) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(w * 0.9, 10), Math.min(w * 0.45, 5)),
        new THREE.MeshBasicMaterial({ map: signTexture(signText, signBg || '#20202a', signFg || '#ffd98a', signSub || '') })
      );
      sign.position.set(0, h + 1.6, d / 2 + 0.05);
      g.add(sign);
      animated.neon.push(sign.material);
    }
    g.position.set(x, 0, z);
    group.add(g);
    addCollider(x, z, w / 2 + 0.2, d / 2 + 0.2);
    return g;
  }

  // ---------- gedung kota (menghadap highway) ----------
  building(PLACES.gasStation.x, PLACES.gasStation.z + 6, 14, 5, 9, adobeB, 'GAS', '#123a2a', '#7dffb0', '24 JAM');
  building(PLACES.motel.x, PLACES.motel.z + 6, 22, 6, 9, adobeA, 'MOTEL', '#3a1020', '#ff9ec4', 'VACANCY');
  building(PLACES.diner.x, PLACES.diner.z - 6, 12, 5, 8, adobeC, 'DINER', '#20203a', '#8fd8ff', 'PIE • KOPI');
  building(PLACES.garage.x, PLACES.garage.z - 6, 13, 5.5, 10, adobeB, 'BETO', '#2a2a12', '#ffe08a', 'BENGKEL');
  building(PLACES.warehouse.x, PLACES.warehouse.z - 6, 16, 7, 11, adobeB, 'COYOTE', '#241a10', '#ffb347', 'GUDANG');
  building(-70, 16, 10, 4.5, 8, adobeC);
  building(-48, -15, 11, 5, 8, adobeA);
  building(-22, 15, 9, 4, 7, adobeB);
  building(4, 15, 10, 4.5, 8, adobeC);
  building(30, -15, 11, 5, 8, adobeA);
  building(44, 16, 9, 4, 7, adobeB);
  building(66, -15, 10, 4.5, 8, adobeC);
  building(-64, -16, 9, 4, 7, adobeA);
  building(76, 15, 10, 5, 8, adobeB);

  // ---------- pom bensin: kanopi + pompa ----------
  const canopy = box(16, 0.5, 10, new THREE.MeshStandardMaterial({ color: 0x1d4a32, roughness: 0.6 }), PLACES.gasStation.x, 5.4, 8);
  group.add(canopy);
  for (const px of [-6, 6]) {
    const pole = box(0.5, 5.4, 0.5, metalMat, PLACES.gasStation.x + px, 2.7, 8);
    group.add(pole);
  }
  const pumpMat = new THREE.MeshStandardMaterial({ color: 0xc22e2e, roughness: 0.5 });
  for (const px of [-2, 2]) {
    const pump = box(1, 1.8, 0.8, pumpMat, PLACES.gasStation.x + px, 0.9, 8);
    group.add(pump);
    addCollider(PLACES.gasStation.x + px, 8, 0.6, 0.5);
  }

  // ---------- menara air ----------
  const towerLegs = new THREE.Group();
  for (const [lx, lz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    towerLegs.add(box(0.4, 12, 0.4, metalMat, PLACES.waterTower.x + lx, 6, PLACES.waterTower.z + lz));
  }
  group.add(towerLegs);
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4, 5, 16),
    new THREE.MeshStandardMaterial({ color: 0xb8c4c8, roughness: 0.55, metalness: 0.35 })
  );
  tank.position.set(PLACES.waterTower.x, 14.5, PLACES.waterTower.z);
  tank.castShadow = true;
  group.add(tank);
  const tankTop = new THREE.Mesh(
    new THREE.ConeGeometry(4.2, 2, 16),
    new THREE.MeshStandardMaterial({ color: 0x8a2f2f, roughness: 0.7 })
  );
  tankTop.position.set(PLACES.waterTower.x, 18, PLACES.waterTower.z);
  tankTop.castShadow = true;
  group.add(tankTop);
  addCollider(PLACES.waterTower.x, PLACES.waterTower.z, 3, 3);
  landmarks.waterTower = { x: PLACES.waterTower.x, z: PLACES.waterTower.z };

  // ---------- gudang Coyote: pintu besar + tumpukan peti ----------
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 1 });
  for (let i = 0; i < 6; i++) {
    const cx = PLACES.warehouse.x - 10 + (i % 3) * 2.4;
    const cz = PLACES.warehouse.z - 2 + Math.floor(i / 3) * 2.4;
    const crate = box(2, 2, 2, crateMat, cx, 1, cz);
    group.add(crate);
    addCollider(cx, cz, 1.1, 1.1);
  }

  // ---------- hideout: gudang tua di bukit pasir ----------
  const hide = new THREE.Group();
  const hideBody = box(14, 6, 10, new THREE.MeshStandardMaterial({ map: adobeTexture('#a8763e', '#7a5226'), roughness: 1 }), 0, 3, 0);
  hide.add(hideBody);
  const hideRoof = box(15, 0.4, 11, roofMat, 0, 6.2, 0);
  hide.add(hideRoof);
  const hideSign = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 4),
    new THREE.MeshBasicMaterial({ map: signTexture('HIDEOUT', '#1a1210', '#ff9a3d', '') })
  );
  hideSign.position.set(0, 8, 5.1);
  hide.add(hideSign);
  hide.position.set(PLACES.hideout.x, 0, PLACES.hideout.z);
  group.add(hide);
  addCollider(PLACES.hideout.x, PLACES.hideout.z, 7.2, 5.2);
  landmarks.hideout = { x: PLACES.hideout.x, z: PLACES.hideout.z };

  // ---------- checkpoint polisi di x=120 ----------
  const check = new THREE.Group();
  const booth = box(4, 3.2, 3, new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.8 }), 0, 1.6, 7);
  check.add(booth);
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.6 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xc22e2e, roughness: 0.6 });
  for (const bx of [-4.5, -1.5, 1.5, 4.5]) {
    const bar = box(2.6, 0.5, 0.3, bx % 2 === 0 ? barrierMat : stripeMat, bx, 1.0, -2);
    check.add(bar);
    const leg = box(0.25, 1.0, 0.25, barrierMat, bx, 0.5, -2);
    check.add(leg);
  }
  const checkSign = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 2.2),
    new THREE.MeshBasicMaterial({ map: signTexture('CHECKPOINT', '#101018', '#ffd98a', 'POLISI') })
  );
  checkSign.position.set(0, 5.2, 7);
  check.add(checkSign);
  check.position.set(PLACES.checkpoint.x, 0, 0);
  group.add(check);
  addCollider(PLACES.checkpoint.x, 7, 2.2, 1.7);
  addCollider(PLACES.checkpoint.x - 4.5, -2, 1.4, 0.4);
  addCollider(PLACES.checkpoint.x - 1.5, -2, 1.4, 0.4);
  addCollider(PLACES.checkpoint.x + 1.5, -2, 1.4, 0.4);
  addCollider(PLACES.checkpoint.x + 4.5, -2, 1.4, 0.4);
  landmarks.checkpoint = { x: PLACES.checkpoint.x, z: 0 };

  // ---------- billboard di tepi highway ----------
  const billboard = new THREE.Group();
  const bb = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 8),
    new THREE.MeshBasicMaterial({ map: signTexture('RUSTLINE', '#2a1020', '#ff6a9a', 'KOTA TERAKHIR SEBELUM GURUN') })
  );
  bb.position.set(0, 9, 0);
  billboard.add(bb);
  for (const px of [-6, 6]) {
    billboard.add(box(0.6, 6, 0.6, metalMat, px, 3, 0));
  }
  billboard.position.set(-180, 0, -14);
  billboard.rotation.y = 0.25;
  group.add(billboard);
  addCollider(-180, -14, 7, 1);

  // ---------- dune (kerucut pipih) — 1 InstancedMesh ----------
  const duneMat = new THREE.MeshStandardMaterial({ color: COLORS.sandDark, roughness: 1 });
  const duneGeo = new THREE.ConeGeometry(1, 1, 10);
  duneGeo.translate(0, 0.5, 0);
  const duneSpots = [];
  for (let i = 0; i < 46; i++) {
    const dx = rng.range(-310, 310);
    const dz = rng.range(-190, 190);
    if (Math.abs(dz) < 14) continue; // jangan menutup highway
    if (Math.abs(dx) < 95 && Math.abs(dz) < 26) continue; // jangan menutup kota
    duneSpots.push({ x: dx, z: dz, r: rng.range(6, 22), h: rng.range(1.5, 4.5) });
  }
  const dunes = new THREE.InstancedMesh(duneGeo, duneMat, Math.max(1, duneSpots.length));
  duneSpots.forEach((d, i) => {
    setInstance(dunes, i, d.x, 0, d.z, 0, d.r, d.h * 0.55, d.r);
  });
  dunes.receiveShadow = true;
  dunes.instanceMatrix.needsUpdate = true;
  group.add(dunes);

  // ---------- kaktus & batu — InstancedMesh ----------
  const cactusMat = new THREE.MeshStandardMaterial({ color: 0x3d7a3a, roughness: 0.9 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 1 });
  const cactusGeo = mergeGeoms([
    new THREE.BoxGeometry(0.7, 2.6, 0.7).translate(0, 1.3, 0),
    new THREE.BoxGeometry(0.5, 1.1, 0.5).translate(-0.6, 1.43, 0),
    new THREE.BoxGeometry(0.5, 1.1, 0.5).translate(0.6, 1.82, 0),
  ]);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const cactusSpots = [];
  const rockSpots = [];
  for (let i = 0; i < 90; i++) {
    const dx = rng.range(-310, 310);
    const dz = rng.range(-190, 190);
    if (Math.abs(dz) < 9) continue;
    if (Math.abs(dx) < 92 && Math.abs(dz) < 24) continue;
    if (rng.chance(0.55)) {
      cactusSpots.push({ x: dx, z: dz, h: rng.range(1.6, 3.6), s: rng.range(0.8, 1.3) });
      addCollider(dx, dz, 0.6, 0.6);
    } else {
      rockSpots.push({ x: dx, z: dz, s: rng.range(0.5, 1.8), ry: rng.range(0, 3) });
      addCollider(dx, dz, 1, 1);
    }
  }
  const cacti = new THREE.InstancedMesh(cactusGeo, cactusMat, Math.max(1, cactusSpots.length));
  cactusSpots.forEach((c, i) => setInstance(cacti, i, c.x, 0, c.z, 0, c.s, c.h / 2.6, c.s));
  cacti.instanceMatrix.needsUpdate = true;
  group.add(cacti);
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, Math.max(1, rockSpots.length));
  rockSpots.forEach((r, i) => setInstance(rocks, i, r.x, 0.4 * r.s, r.z, r.ry, r.s, r.s, r.s));
  rocks.instanceMatrix.needsUpdate = true;
  group.add(rocks);

  // ---------- tiang telepon di sepanjang highway — 1 InstancedMesh ----------
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x5a4026, roughness: 1 });
  const poleGeo = mergeGeoms([
    new THREE.BoxGeometry(0.35, 8, 0.35).translate(0, 4, 0),
    new THREE.BoxGeometry(3.2, 0.25, 0.25).translate(0, 7.2, 0),
  ]);
  const poleXs = [];
  for (let x = -290; x <= 290; x += 40) poleXs.push(x);
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, poleXs.length);
  poleXs.forEach((x, i) => {
    setInstance(poles, i, x, 0, -9, 0, 1, 1, 1);
    addCollider(x, -9, 0.4, 0.4);
  });
  poles.instanceMatrix.needsUpdate = true;
  group.add(poles);

  // ---------- lampu jalan kota ----------
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.5 });
  for (let x = -76; x <= 76; x += 19) {
    for (const side of [-1, 1]) {
      const lx = x;
      const lz = side * 8;
      group.add(box(0.3, 6.5, 0.3, lampMat, lx, 3.25, lz));
      const arm = box(0.25, 0.25, 2.2, lampMat, lx, 6.4, lz - side * 1);
      group.add(arm);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd98a })
      );
      bulb.position.set(lx, 6.3, lz - side * 2);
      group.add(bulb);
      // Hanya sebagian lampu memakai PointLight sungguhan (hemat GPU /
      // SwiftShader); sisanya cukup bola lampu emissive.
      if (side === 1 && (x + 76) % 38 === 0) {
        const light = new THREE.PointLight(0xffc46a, 14, 26, 1.8);
        light.position.set(lx, 6.1, lz - side * 2);
        group.add(light);
        animated.lampLights.push(light);
      }
    }
  }

  // landmark lain
  landmarks.warehouse = { x: PLACES.warehouse.x, z: PLACES.warehouse.z };
  landmarks.gasStation = { x: PLACES.gasStation.x, z: PLACES.gasStation.z };
  landmarks.motel = { x: PLACES.motel.x, z: PLACES.motel.z };
  landmarks.garage = { x: PLACES.garage.x, z: PLACES.garage.z };
  landmarks.diner = { x: PLACES.diner.x, z: PLACES.diner.z };

  return { group, colliders, landmarks, animated };
}

// Tabrakan lingkaran vs daftar AABB. Kembalikan posisi yang sudah dikoreksi.
export function collideCircle(colliders, x, z, r) {
  let px = x;
  let pz = z;
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(px, c.maxX));
    const cz = Math.max(c.minZ, Math.min(pz, c.maxZ));
    const dx = px - cx;
    const dz = pz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 0.000001) {
        const d = Math.sqrt(d2);
        px = cx + (dx / d) * r;
        pz = cz + (dz / d) * r;
      } else {
        // tepat di dalam: dorong ke sisi terdekat
        const pushL = px - c.minX;
        const pushR = c.maxX - px;
        const pushT = pz - c.minZ;
        const pushB = c.maxZ - pz;
        const m = Math.min(pushL, pushR, pushT, pushB);
        if (m === pushL) px = c.minX - r;
        else if (m === pushR) px = c.maxX + r;
        else if (m === pushT) pz = c.minZ - r;
        else pz = c.maxZ + r;
      }
    }
  }
  return { x: px, z: pz };
}

// Jenis permukaan di (x, z): road | dirt | sand.
export function surfaceAt(x, z) {
  if (Math.abs(z) <= CFG.highway.halfWidth && x >= CFG.highway.xMin && x <= CFG.highway.xMax) {
    return 'road';
  }
  for (const dx of CFG.dirtRoads) {
    if (Math.abs(x - dx) <= CFG.dirtHalfWidth) return 'dirt';
  }
  return 'sand';
}
