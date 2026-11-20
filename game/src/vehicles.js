// Cars and the smuggler's truck: mesh factory, arcade driving (with off-road
// slowdown on dirt and sand), highway traffic AI, and parked cars (including
// the mission truck by the warehouse). All meshes are boxes and cylinders.
import * as THREE from 'three';
import { CAR, WORLD } from './config.js';
import { clamp, dist2D, pick } from './random.js';
import { collideCircle, surfaceFactor } from './city.js';

const BODY_COLORS = [0xc23b2e, 0x2e6fc2, 0xe8c832, 0x3aa655, 0xe8e8e8, 0x22242a, 0x7a4a9e, 0xd97b2e];

export function makeCarMesh(color, police = false) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: police ? 0xf0f0f0 : color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a2028 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.75, 2.0), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 1.8), darkMat);
  cabin.position.set(-0.2, 1.2, 0);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheelPositions = [[1.5, 0.95], [1.5, -0.95], [-1.5, 0.95], [-1.5, -0.95]];
  const wheels = [];
  for (const [wx, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.38, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const z of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.35), headMat);
    head.position.set(2.22, 0.6, z);
    group.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const z of [-0.7, 0.7]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.35), tailMat);
    tail.position.set(-2.22, 0.6, z);
    group.add(tail);
  }
  let lightBar = null;
  if (police) {
    const bar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    red.position.set(0, 0, -0.45);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    blue.position.set(0, 0, 0.45);
    bar.add(red);
    bar.add(blue);
    bar.position.set(-0.2, 1.65, 0);
    group.add(bar);
    lightBar = { red: red.material, blue: blue.material, phase: 0 };
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.42, 0.2, 2.02), new THREE.MeshLambertMaterial({ color: 0x2040c0 }));
    stripe.position.y = 0.55;
    group.add(stripe);
  }
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, wheels, lightBar };
}

// The smuggler's pickup truck: long cab + open bed with tarp-covered cargo.
export function makeTruckMesh(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a2028 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 2.0), bodyMat);
  bed.position.set(-1.4, 0.6, 0);
  bed.castShadow = true;
  group.add(bed);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 2.0), bodyMat);
  cab.position.set(1.4, 0.85, 0);
  cab.castShadow = true;
  group.add(cab);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 1.8), darkMat);
  windshield.position.set(2.35, 1.0, 0);
  group.add(windshield);
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.7), new THREE.MeshLambertMaterial({ color: 0x6a5a3a }));
  cargo.position.set(-1.4, 1.4, 0);
  cargo.castShadow = true;
  group.add(cargo);
  const tarp = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.15, 1.8), new THREE.MeshLambertMaterial({ color: 0x4a5a3a }));
  tarp.position.set(-1.4, 1.9, 0);
  group.add(tarp);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [wx, wz] of [[2.0, 0.95], [2.0, -0.95], [-2.2, 0.95], [-2.2, -0.95]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const z of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.35), headMat);
    head.position.set(2.45, 0.65, z);
    group.add(head);
  }
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, wheels, lightBar: null };
}

export function createPlayerCar(scene, color, x, z, heading) {
  const { group, wheels, lightBar } = makeCarMesh(color, false);
  group.position.set(x, 0, z);
  group.rotation.y = heading - Math.PI / 2;
  scene.add(group);
  return {
    mesh: group, wheels, lightBar, x, z, heading,
    speed: 0, color, isPlayer: true, police: false, truck: false,
  };
}

export function stepPlayerCar(car, input, dt, colliders, others) {
  const forward = input.moveY();
  const steer = input.moveX();
  // Off-road: dirt roads are slower, open sand much slower.
  const factor = surfaceFactor(car.x, car.z);
  const maxSpeed = CAR.maxSpeed * (0.35 + 0.65 * factor);
  if (forward > 0) car.speed += CAR.accel * dt * factor;
  else if (forward < 0) {
    car.speed -= car.speed > 0.5 ? CAR.brake * dt : CAR.reverseAccel * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  }
  if (input.handbrake()) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), CAR.handbrake * dt);
  car.speed = clamp(car.speed, -CAR.maxReverse, maxSpeed);
  const steerAmount = steer * CAR.steerRate * dt * clamp(Math.abs(car.speed) / 8, 0, 1) * (car.speed < 0 ? -1 : 1);
  car.heading -= steerAmount;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const resolved = collideCircle(colliders, nx, nz, CAR.radius);
  if (resolved.hit && Math.abs(car.speed) > 3) car.speed *= 0.4;
  car.x = clamp(resolved.x, -WORLD.halfX - 6, WORLD.halfX + 6);
  car.z = clamp(resolved.z, -WORLD.halfZ - 6, WORLD.halfZ + 6);
  for (const other of others) {
    if (other === car) continue;
    const d = dist2D(car.x, car.z, other.x, other.z);
    if (d < CAR.radius * 2 && d > 0.01) {
      const push = (CAR.radius * 2 - d) / 2;
      car.x += ((car.x - other.x) / d) * push;
      car.z += ((car.z - other.z) / d) * push;
      car.speed *= 0.85;
    }
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading - Math.PI / 2;
  const spin = car.speed * dt * 2.6;
  for (const w of car.wheels || []) w.rotation.z -= spin;
}

// Traffic: cars that cruise the highway east-west, wrapping at the ends.
export function createTraffic(scene, random, count, parkingSpots) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const lane = random() < 0.5 ? 3 : -3;
    const along = (random() * 2 - 1) * (WORLD.halfX - 10);
    const color = pick(random, BODY_COLORS);
    const { group, wheels, lightBar } = makeCarMesh(color, false);
    const car = {
      mesh: group, wheels, lightBar, color,
      lane, along, dir: random() < 0.5 ? 1 : -1,
      speed: 7 + random() * 4,
      x: 0, z: 0, heading: 0, police: false, truck: false,
    };
    scene.add(group);
    cars.push(car);
  }
  const parked = [];
  for (const spot of parkingSpots) {
    if (random() < 0.3 && spot.kind === 'parked') continue;
    const isTruck = spot.kind === 'truck';
    const color = isTruck ? 0x8a2f24 : pick(random, BODY_COLORS);
    const made = isTruck ? makeTruckMesh(color) : makeCarMesh(color, false);
    made.group.position.set(spot.x, 0, spot.z);
    made.group.rotation.y = spot.heading - Math.PI / 2;
    scene.add(made.group);
    parked.push({
      mesh: made.group, wheels: made.wheels, lightBar: made.lightBar, color,
      x: spot.x, z: spot.z, heading: spot.heading,
      speed: 0, parked: true, truck: isTruck, police: false,
    });
  }
  return { traffic: cars, parked };
}

export function stepTraffic(cars, dt, random) {
  for (const car of cars) {
    if (car.isPlayer) continue;
    car.along += car.dir * car.speed * dt;
    if (car.along > WORLD.halfX) car.along = -WORLD.halfX;
    if (car.along < -WORLD.halfX) car.along = WORLD.halfX;
    car.x = car.along;
    car.z = car.lane;
    car.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading - Math.PI / 2;
    const spin = car.speed * dt * 2.6;
    for (const w of car.wheels || []) w.rotation.z -= spin;
  }
}

// Police cars: spawn at the highway edge, chase the player, ram on contact.
export function createPoliceCar(scene, x, z) {
  const { group, wheels, lightBar } = makePoliceMesh(x, z, scene);
  return {
    mesh: group, wheels, lightBar, x, z, heading: 0, speed: 0,
    color: 0xf0f0f0, police: true, phase: Math.random() * 10, roadblock: false,
  };
}

function makePoliceMesh(x, z, scene) {
  const made = makeCarMesh(0xf0f0f0, true);
  made.group.position.set(x, 0, z);
  scene.add(made.group);
  return made;
}

// A roadblock car: parked across the highway, does not chase.
export function createRoadblockCar(scene, x, z) {
  const made = makeCarMesh(0xf0f0f0, true);
  made.group.position.set(x, 0, z);
  made.group.rotation.y = Math.PI / 2; // parked across the highway
  scene.add(made.group);
  return {
    mesh: made.group, wheels: made.wheels, lightBar: made.lightBar,
    x, z, heading: Math.PI, speed: 0,
    color: 0xf0f0f0, police: true, phase: Math.random() * 10, roadblock: true,
  };
}

export function stepPoliceCar(car, targetX, targetZ, dt, colliders) {
  if (car.roadblock) {
    if (car.lightBar) {
      car.phase += dt * 6;
      const on = Math.sin(car.phase) > 0;
      car.lightBar.red.color.setHex(on ? 0xff2020 : 0x550000);
      car.lightBar.blue.color.setHex(on ? 0x101040 : 0x2040ff);
    }
    return;
  }
  const dx = targetX - car.x;
  const dz = targetZ - car.z;
  const dist = Math.hypot(dx, dz) || 1;
  const wantHeading = Math.atan2(dx, dz);
  let diff = wantHeading - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += clamp(diff, -1.6 * dt, 1.6 * dt);
  const targetSpeed = dist > 6 ? 26 : 12;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.2);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const resolved = collideCircle(colliders, nx, nz, CAR.radius);
  car.x = clamp(resolved.x, -WORLD.halfX - 6, WORLD.halfX + 6);
  car.z = clamp(resolved.z, -WORLD.halfZ - 6, WORLD.halfZ + 6);
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading - Math.PI / 2;
  const spin = car.speed * dt * 2.6;
  for (const w of car.wheels || []) w.rotation.z -= spin;
  if (car.lightBar) {
    car.phase += dt * 6;
    const on = Math.sin(car.phase) > 0;
    car.lightBar.red.color.setHex(on ? 0xff2020 : 0x550000);
    car.lightBar.blue.color.setHex(on ? 0x101040 : 0x2040ff);
  }
}
