// Procedural Rustline: a desert highway town at dusk. A long east-west highway,
// a small town in the middle (gas station, motel, diner, garage, warehouse,
// water tower, houses), two dirt roads branching into dune country, cacti,
// rocks, telephone poles, billboards and a police checkpoint on the highway.
// Returns the colliders (building AABBs), parking spots, and the surface-speed
// helper for off-road driving.
import * as THREE from 'three';
import { PALETTE, WORLD } from './config.js';
import { mulberry32, range, rangeInt, pick } from './random.js';
import { buildingTexture, roadTexture, dirtTexture, sandTexture, billboardTexture } from './textures.js';

function hex(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// Speed factor for driving: 1 on the highway, 0.8 on dirt roads, 0.9 in town,
// 0.55 on open sand.
export function surfaceFactor(x, z) {
  if (Math.abs(z) <= WORLD.highwayWidth / 2 + 1) return 1;
  for (const dx of WORLD.dirtRoads) {
    if (Math.abs(x - dx) <= WORLD.dirtWidth / 2 + 1) return 0.8;
  }
  if (x >= WORLD.townMinX && x <= WORLD.townMaxX && z >= WORLD.townMinZ && z <= WORLD.townMaxZ) return 0.9;
  return 0.55;
}

function inTown(x, z) {
  return x >= WORLD.townMinX - 10 && x <= WORLD.townMaxX + 10 && z >= WORLD.townMinZ - 10 && z <= WORLD.townMaxZ + 10;
}
function onRoad(x, z) {
  if (Math.abs(z) <= WORLD.highwayWidth / 2 + 2) return true;
  for (const dx of WORLD.dirtRoads) {
    if (Math.abs(x - dx) <= WORLD.dirtWidth / 2 + 2) return true;
  }
  return false;
}

export function createCity(scene, seed) {
  const random = mulberry32(seed);
  const colliders = [];
  const parkingSpots = [];
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  const halfX = WORLD.halfX;
  const halfZ = WORLD.halfZ;

  // Ground: desert sand everywhere.
  const sandTex = sandTexture();
  sandTex.repeat.set(24, 12);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(halfX * 2 + 120, halfZ * 2 + 120),
    new THREE.MeshLambertMaterial({ map: sandTex }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // Highway: dark asphalt strip east-west.
  const roadTex = roadTexture();
  roadTex.repeat.set(30, 1);
  const highway = new THREE.Mesh(
    new THREE.PlaneGeometry(halfX * 2, WORLD.highwayWidth),
    new THREE.MeshLambertMaterial({ map: roadTex }),
  );
  highway.rotation.x = -Math.PI / 2;
  highway.position.set(0, 0, WORLD.highwayZ);
  highway.receiveShadow = true;
  group.add(highway);

  // Centre dashes along the highway.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c890 });
  const dashGeo = new THREE.PlaneGeometry(3, 0.35);
  for (let x = -halfX + 6; x < halfX - 6; x += 12) {
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.03, 0);
    group.add(dash);
  }

  // Dirt roads: north-south strips at x = -140 and x = 140.
  const dirtTex = dirtTexture();
  dirtTex.repeat.set(1, 20);
  for (const dx of WORLD.dirtRoads) {
    const dirt = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.dirtWidth, halfZ * 2),
      new THREE.MeshLambertMaterial({ map: dirtTex }),
    );
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.set(dx, 0.01, 0);
    dirt.receiveShadow = true;
    group.add(dirt);
  }

  // Town streets: two short cross streets in town (z = -20 and z = 26).
  for (const sz of [-20, 26]) {
    const street = new THREE.Mesh(
      new THREE.PlaneGeometry(170, 8),
      new THREE.MeshLambertMaterial({ map: roadTex }),
    );
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, 0.01, sz);
    street.receiveShadow = true;
    group.add(street);
  }

  // Sidewalks flanking the highway through town.
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  for (const off of [-8.5, 8.5]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(180, 4), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(0, 0.02, off);
    walk.receiveShadow = true;
    group.add(walk);
  }

  // Named buildings (all procedural boxes with canvas facades).
  const variants = PALETTE.building.slice(0, 4).map((color, i) => ({
    texture: buildingTexture(hex(color), seed + i * 977),
  }));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const placements = [
    // Warehouse (Coyote) — big corrugated box, rust red.
    { x: -45, z: -28, w: 26, d: 15, h: 9, variant: 1, name: 'warehouse' },
    // Diner — low, cream.
    { x: 20, z: -25, w: 15, d: 10, h: 6, variant: 2, name: 'diner' },
    // Garage (Beto) — grey-brown.
    { x: 78, z: -25, w: 16, d: 12, h: 7, variant: 3, name: 'garage' },
    // Motel — long low block with a row of doors.
    { x: -75, z: 32, w: 30, d: 10, h: 6, variant: 0, name: 'motel' },
    // Gas station office.
    { x: 62, z: 28, w: 10, d: 8, h: 5, variant: 2, name: 'gas-office' },
    // Old warehouse / hideout far west in the dunes.
    { x: -230, z: -95, w: 20, d: 12, h: 7, variant: 1, name: 'hideout' },
  ];
  // Houses along the town edges.
  const houseSpots = [
    [-60, 42], [-30, 42], [5, 42], [35, 42], [-55, -42], [-15, -42], [45, -42], [65, 42],
  ];
  for (const [hx, hz] of houseSpots) {
    placements.push({
      x: hx + range(random, -3, 3), z: hz + range(random, -2, 2),
      w: range(random, 8, 11), d: range(random, 7, 9), h: range(random, 4, 5.5),
      variant: rangeInt(random, 0, 3), name: 'house',
    });
  }
  for (const [vi, variant] of variants.entries()) {
    const list = placements.filter((p) => p.variant === vi);
    if (list.length === 0) continue;
    const mesh = new THREE.InstancedMesh(
      boxGeo,
      new THREE.MeshLambertMaterial({ map: variant.texture }),
      list.length,
    );
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const pos = new THREE.Vector3();
    list.forEach((p, i) => {
      pos.set(p.x, 0, p.z);
      scale.set(p.w, p.h, p.d);
      matrix.compose(pos, quat, scale);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  for (const p of placements) {
    colliders.push({ minX: p.x - p.w / 2, maxX: p.x + p.w / 2, minZ: p.z - p.d / 2, maxZ: p.z + p.d / 2 });
  }

  // Gas station canopy + pumps.
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0xd94a2a });
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 12), canopyMat);
  canopy.position.set(48, 5.2, 16);
  canopy.castShadow = true;
  group.add(canopy);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  for (const [px, pz] of [[40, 11], [56, 11], [40, 21], [56, 21]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 5.2, 6), postMat);
    post.position.set(px, 2.6, pz);
    group.add(post);
  }
  const pumpMat = new THREE.MeshLambertMaterial({ color: 0xe8e0c8 });
  for (const [px, pz] of [[44, 16], [52, 16]]) {
    const pump = new THREE.Mesh(new THREE.BoxGeometry(1, 1.6, 0.8), pumpMat);
    pump.position.set(px, 0.8, pz);
    pump.castShadow = true;
    group.add(pump);
    colliders.push({ minX: px - 0.6, maxX: px + 0.6, minZ: pz - 0.5, maxZ: pz + 0.5 });
  }

  // Water tower.
  const towerMat = new THREE.MeshLambertMaterial({ color: 0x8a94a0 });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 5, 12), towerMat);
  tank.position.set(WORLD.waterTower.x, 11, WORLD.waterTower.z);
  tank.castShadow = true;
  group.add(tank);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2, 12), new THREE.MeshLambertMaterial({ color: 0x6a4a3a }));
  cone.position.set(WORLD.waterTower.x, 14.5, WORLD.waterTower.z);
  group.add(cone);
  for (const [lx, lz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 9, 6), postMat);
    leg.position.set(WORLD.waterTower.x + lx, 4.5, WORLD.waterTower.z + lz);
    group.add(leg);
  }
  colliders.push({
    minX: WORLD.waterTower.x - 3, maxX: WORLD.waterTower.x + 3,
    minZ: WORLD.waterTower.z - 3, maxZ: WORLD.waterTower.z + 3,
  });

  // Billboards along the highway.
  const boards = [
    { x: -180, z: -11, lines: ['RUSTLINE', 'GAS · MOTEL · DINER'], bg: '#5a2a3a' },
    { x: 200, z: 11, lines: ['COYOTE', 'FREIGHT CO.'], bg: '#2a4a5a' },
  ];
  for (const b of boards) {
    const tex = billboardTexture(b.lines, b.bg);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 7),
      new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    board.position.set(b.x, 8, b.z);
    board.rotation.y = b.z < 0 ? 0 : Math.PI;
    board.castShadow = true;
    group.add(board);
    for (const [lx, lz] of [[-5, 0], [5, 0]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5, 6), postMat);
      leg.position.set(b.x + lx, 2.5, b.z);
      group.add(leg);
    }
  }

  // Telephone poles along the highway (south side).
  const poleGeo = new THREE.CylinderGeometry(0.14, 0.18, 7, 6);
  const crossGeo = new THREE.BoxGeometry(2.2, 0.18, 0.18);
  for (let x = -280; x <= 280; x += 40) {
    const pole = new THREE.Mesh(poleGeo, postMat);
    pole.position.set(x, 3.5, -9.5);
    pole.castShadow = true;
    group.add(pole);
    const cross = new THREE.Mesh(crossGeo, postMat);
    cross.position.set(x, 6.4, -9.5);
    group.add(cross);
  }

  // Streetlights in town.
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0 });
  const lampGeo = new THREE.SphereGeometry(0.35, 8, 6);
  for (let x = -80; x <= 80; x += 32) {
    for (const z of [-8, 8]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), postMat);
      pole.position.set(x, 3, z);
      group.add(pole);
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(x, 6.1, z);
      group.add(lamp);
    }
  }

  // Police checkpoint on the highway (x = 120): striped barriers + sign.
  const ck = WORLD.checkpoint;
  const barrierMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xd94a2a });
  for (const z of [-3, 3]) {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 5.5), barrierMat);
    barrier.position.set(ck.x, 0.55, z);
    barrier.castShadow = true;
    group.add(barrier);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.25, 5.5), stripeMat);
    stripe.position.set(ck.x, 1.0, z);
    group.add(stripe);
  }
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 2.4),
    new THREE.MeshLambertMaterial({ map: billboardTexture(['CHECKPOINT', 'POLISI'], '#3a3a3a'), side: THREE.DoubleSide }),
  );
  sign.position.set(ck.x, 4.5, -7.5);
  group.add(sign);
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.4, 6), postMat);
  signPost.position.set(ck.x, 1.7, -7.5);
  group.add(signPost);

  // Dunes: big flattened cones outside town and off the roads.
  const duneMat = new THREE.MeshLambertMaterial({ color: 0xc99a62 });
  const duneGeo = new THREE.ConeGeometry(1, 1, 10);
  for (let i = 0; i < 22; i += 1) {
    let x = range(random, -halfX, halfX);
    let z = range(random, -halfZ, halfZ);
    let tries = 0;
    while ((inTown(x, z) || onRoad(x, z) || dist2D(x, z, WORLD.hideout.x, WORLD.hideout.z) < 25) && tries < 12) {
      x = range(random, -halfX, halfX);
      z = range(random, -halfZ, halfZ);
      tries += 1;
    }
    const r = range(random, 14, 34);
    const h = range(random, 3, 9);
    const dune = new THREE.Mesh(duneGeo, duneMat);
    dune.scale.set(r, h, r * range(random, 0.6, 1));
    dune.position.set(x, h / 2 - 0.4, z);
    dune.rotation.y = random() * Math.PI;
    dune.receiveShadow = true;
    group.add(dune);
  }

  // Cacti: trunk + arms, scattered in the desert.
  const cactusMat = new THREE.MeshLambertMaterial({ color: 0x3a7a44 });
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 3.2, 7);
  const armGeo = new THREE.CylinderGeometry(0.22, 0.26, 1.4, 6);
  for (let i = 0; i < 42; i += 1) {
    let x = range(random, -halfX, halfX);
    let z = range(random, -halfZ, halfZ);
    let tries = 0;
    while ((inTown(x, z) || onRoad(x, z)) && tries < 12) {
      x = range(random, -halfX, halfX);
      z = range(random, -halfZ, halfZ);
      tries += 1;
    }
    const s = range(random, 0.8, 1.6);
    const trunk = new THREE.Mesh(trunkGeo, cactusMat);
    trunk.position.set(x, 1.6 * s, z);
    trunk.scale.setScalar(s);
    trunk.castShadow = true;
    group.add(trunk);
    const arm = new THREE.Mesh(armGeo, cactusMat);
    arm.position.set(x + 0.6 * s, 1.8 * s, z);
    arm.rotation.z = -0.7;
    group.add(arm);
  }

  // Rocks.
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x8a7a68 });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 30; i += 1) {
    let x = range(random, -halfX, halfX);
    let z = range(random, -halfZ, halfZ);
    let tries = 0;
    while ((inTown(x, z) || onRoad(x, z)) && tries < 12) {
      x = range(random, -halfX, halfX);
      z = range(random, -halfZ, halfZ);
      tries += 1;
    }
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const s = range(random, 0.6, 2.2);
    rock.scale.set(s, s * 0.7, s);
    rock.position.set(x, 0.3 * s, z);
    rock.rotation.y = random() * Math.PI;
    rock.castShadow = true;
    group.add(rock);
  }

  // Parking spots along the highway through town; the smuggler's truck parks
  // by the warehouse.
  for (let x = -70; x <= 70; x += 28) {
    if (random() < 0.3) continue;
    parkingSpots.push({ x, z: 9.5, heading: Math.PI / 2, kind: 'parked' });
    parkingSpots.push({ x: x + 14, z: -9.5, heading: -Math.PI / 2, kind: 'parked' });
  }
  parkingSpots.push({ x: -45, z: -14, heading: Math.PI, kind: 'truck' });
  parkingSpots.push({ x: 70, z: -14, heading: Math.PI / 2, kind: 'parked' });

  return { group, colliders, parkingSpots };
}

function dist2D(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

// Circle (x, z, radius) vs building AABBs: push the circle out, return true on hit.
export function collideCircle(colliders, x, z, radius) {
  let hit = false;
  let nx = x;
  let nz = z;
  for (const b of colliders) {
    const cx = Math.max(b.minX, Math.min(nx, b.maxX));
    const cz = Math.max(b.minZ, Math.min(nz, b.maxZ));
    const dx = nx - cx;
    const dz = nz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        nx = cx + (dx / d) * radius;
        nz = cz + (dz / d) * radius;
      } else {
        const pl = nx - b.minX;
        const pr = b.maxX - nx;
        const pt = nz - b.minZ;
        const pb = b.maxZ - nz;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) nx = b.minX - radius;
        else if (m === pr) nx = b.maxX + radius;
        else if (m === pt) nz = b.minZ - radius;
        else nz = b.maxZ + radius;
      }
    }
  }
  return { hit, x: nx, z: nz };
}
