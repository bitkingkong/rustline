// Rustline — shots.js
// Penyiapan adegan deterministik untuk screenshot (?shot=&seed=).
// start: layar judul di atas highway senja.
// drive: truk di highway + traffic + misi 1 aktif.
// chase: wanted 3, 2 mobil polisi di belakang, HUD + minimap.
// mission: truk di samping gudang + marker + banner misi 1.

import { PLACES } from './config.js';
import { syncVehicleMesh } from './vehicles.js';
import { syncPersonMesh } from './people.js';

function putTruckOnHighway(world, x, z, heading, speed) {
  const t = world.truck;
  t.x = x;
  t.z = z;
  t.heading = heading;
  t.speed = speed || 0;
  t.condition = 100;
  syncVehicleMesh(t, 0);
  world.player.x = x;
  world.player.z = z;
  world.player.heading = heading;
  syncPersonMesh(world.player);
}

function enterTruck(world) {
  world.inVehicle = world.truck;
  world.truck.driver = 'player';
  world.player.group.visible = false;
}

function stageTraffic(world) {
  // rapatkan traffic di sekitar pemain agar terlihat di frame
  const spots = [
    { x: 30, z: 3, dir: 1 },
    { x: 55, z: -3, dir: -1 },
    { x: -60, z: 3, dir: 1 },
    { x: 80, z: -3, dir: -1 },
  ];
  world.traffic.forEach((v, i) => {
    const s = spots[i % spots.length];
    v.x = s.x + i * 4;
    v.z = s.z;
    v.npcDir = s.dir;
    v.heading = s.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    v.npcSpeed = 11;
    v.speed = 11;
    syncVehicleMesh(v, 0);
  });
}

export function applyShot(world, name) {
  if (name === 'start') {
    // layar judul; dunia berjalan sebagai attract mode
    world.state = 'title';
    world.hud.setScreen('title');
    world.hud.setContinueAvailable(false);
    return 'title';
  }

  world.newGame();
  world.audio.muted = true;

  if (name === 'drive') {
    world.missions.startMission();
    // staging: jalan ke gudang tidak perlu — langsung fase antar:
    // teleport sesaat ke gudang agar pickup terpicu, lalu ke highway
    world.player.x = PLACES.warehouse.x;
    world.player.z = PLACES.warehouse.z;
    world.step(0.05, { render: false });
    putTruckOnHighway(world, -40, -3, Math.PI / 2, 16);
    enterTruck(world);
    stageTraffic(world);
    world.hud.banner('MISI: MUATAN PERTAMA', 'Antar kargo ke pom bensin!', 30);
    world.rig.yaw = Math.PI / 2 + Math.PI;
    world.rig.update(world.truck, world.truck.heading, 0.1, true);
    return 'drive';
  }

  if (name === 'chase') {
    putTruckOnHighway(world, 0, -3, Math.PI / 2, 18);
    enterTruck(world);
    world.wanted = 3;
    world.audio.setSiren(false);
    // Polisi dibekukan di posisi akhir (truk melaju ~20 m selama staging):
    // dua mobil mengapit truk dari belakang, keduanya masuk frame.
    world.shotFreeze = true;
    const copSpots = [{ x: 13, z: -0.5 }, { x: 13, z: 3.5 }];
    for (let i = 0; i < 2; i++) {
      world.spawnPoliceCar();
      const p = world.policeCars[i];
      p.x = copSpots[i].x;
      p.z = copSpots[i].z;
      p.heading = Math.PI / 2;
      p.speed = 0;
      syncVehicleMesh(p, 0);
    }
    stageTraffic(world);
    world.missions.startMission();
    world.rig.yaw = Math.PI / 2 + Math.PI;
    world.rig.update(world.truck, world.truck.heading, 0.1, true);
    return 'chase';
  }

  if (name === 'mission') {
    // truk di samping gudang, Rosa jalan kaki di sebelahnya
    world.missions.startMission();
    const t = world.truck;
    t.x = PLACES.warehouse.x + 12;
    t.z = PLACES.warehouse.z + 8;
    t.heading = Math.PI;
    t.speed = 0;
    syncVehicleMesh(t, 0);
    world.player.x = PLACES.warehouse.x + 8;
    world.player.z = PLACES.warehouse.z + 8;
    world.player.heading = Math.PI * 0.75;
    world.player.group.visible = true;
    syncPersonMesh(world.player);
    world.hud.banner('MISI: MUATAN PERTAMA', 'Coyote: "Kargo di gudangku. Antar ke pom bensin."', 30);
    // kamera dari selatan (sisi highway) melihat Rosa + truk + gudang + marker
    world.rig.yaw = 0.25;
    world.rig.pitch = 0.38;
    world.rig.update(world.player, null, 0.1, true);
    return 'mission';
  }

  return 'start';
}
