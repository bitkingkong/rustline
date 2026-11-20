// Rustline — config.js
// Semua konstanta tuning game. Satu-satunya sumber kebenaran untuk angka-angka
// dunia, kendaraan, ekonomi, misi, dan wanted. Tidak ada impor di sini.

export const CFG = {
  // ---- dunia ----
  highway: { xMin: -300, xMax: 300, halfWidth: 6, laneZ: 3 },
  town: { xMin: -80, xMax: 80 },
  dirtRoads: [-140, 140], // jalan tanah utara-selatan (sumbu X), lebar 8
  dirtHalfWidth: 4,
  worldBound: 320, // batas keras posisi (dinding tak terlihat)
  groundY: 0,

  // ---- pemain jalan kaki ----
  walkSpeed: 5.2,
  runSpeed: 9.0,
  jumpSpeed: 7.5,
  gravity: 22,
  playerRadius: 0.55,
  playerHP: 100,

  // ---- kendaraan ----
  driveAccel: 16,
  driveReverseAccel: 10,
  driveMaxSpeed: 34, // truk pemain, m/dtk di aspal
  driveMaxReverse: 10,
  steerRate: 1.9, // rad/dtk pada kecepatan penuh
  brakeForce: 26,
  drag: 0.55, // gesekan dasar per detik
  handbrakeDrag: 3.2,
  surfaceFactor: { road: 1.0, dirt: 0.8, sand: 0.55 },
  trafficSpeed: [9, 14],
  trafficCount: 10,
  pedCount: 12,

  // ---- combat ----
  pistolAmmo: 12,
  pistolReserve: 48,
  pistolDamage: 34,
  pistolRange: 60,
  pistolFireDelay: 0.28,
  punchDamage: 25,
  punchRange: 2.1,
  punchDelay: 0.45,
  copHP: 50,
  copPunchDamage: 8,
  copSpeed: 6.4,
  pedHP: 30,

  // ---- wanted ----
  wantedMax: 5,
  wantedDecaySeconds: 25,
  wantedDecayDistance: 60,
  bustedHoldSeconds: 1.5,
  bustedFine: 100,
  wastedFine: 50,
  policeCarMax: 4,
  roadblockAtWanted: 5,

  // ---- ekonomi & misi ----
  startMoney: 50,
  missionRewards: [200, 400, 700],
  mission1Time: 120,
  mission2Time: 150,
  mission3Survive: 60,

  // ---- kamera ----
  camDistance: 11,
  camHeight: 6.5,
  camFollowLerp: 5,

  // ---- save ----
  saveKey: 'rustline-save-v1',
};

// Posisi landmark penting (x, z) — dipakai misi, spawn, dan minimap.
export const PLACES = {
  warehouse: { x: -58, z: -16, label: 'Gudang Coyote' },
  gasStation: { x: 52, z: 14, label: 'Pom Bensin' },
  motel: { x: -34, z: 16, label: 'Motel' },
  diner: { x: 18, z: -15, label: 'Diner' },
  garage: { x: -12, z: -16, label: 'Bengkel Beto' },
  waterTower: { x: 70, z: -18, label: 'Menara Air' },
  hideout: { x: -230, z: -95, label: 'Hideout' },
  checkpoint: { x: 120, z: 0, label: 'Checkpoint Polisi' },
  motelSpawn: { x: -34, z: 10 },
  playerStart: { x: -58, z: -8 },
  truckStart: { x: -52, z: -3 },
};

// Definisi rantai misi penyelundupan.
export const MISSIONS = [
  {
    id: 1,
    name: 'Muatan Pertama',
    giver: 'Coyote',
    intro: 'Coyote: "Rosa, kargo di gudangku. Antar ke pom bensin, jangan telat."',
    pickup: 'warehouse',
    pickupText: 'Ambil kargo di gudang Coyote',
    deliver: 'gasStation',
    deliverText: 'Antar kargo ke pom bensin',
    timeLimit: 120,
    reward: 200,
  },
  {
    id: 2,
    name: 'Jalur Tikus',
    giver: 'Coyote',
    intro: 'Coyote: "Kali ini lewat jalan tanah. Checkpoint di highway x=120 — jangan lewat sana."',
    pickup: 'warehouse',
    pickupText: 'Ambil barang di gudang Coyote',
    deliver: 'motel',
    deliverText: 'Antar ke motel lewat jalan tanah',
    timeLimit: 150,
    reward: 400,
    checkpointPenalty: 2,
  },
  {
    id: 3,
    name: 'Konvoi Terakhir',
    giver: 'Beto',
    intro: 'Beto: "Mesinmu siap. Bertahan 60 detik di wanted 3, lalu kabur ke hideout."',
    pickup: 'warehouse',
    pickupText: 'Ambil muatan terakhir di gudang',
    deliver: 'hideout',
    deliverText: 'Bertahan 60 dtk, lalu capai hideout',
    timeLimit: 0,
    reward: 700,
    surviveSeconds: 60,
    forceWanted: 3,
  },
];

// Palet senja gurun Rustline.
export const COLORS = {
  skyTop: 0x2b1a4e,
  skyMid: 0xc65a2e,
  skyLow: 0xff9a3d,
  sun: 0xffb347,
  sand: 0xc98d4e,
  sandDark: 0xa96f36,
  asphalt: 0x3a3a40,
  dirt: 0x8a6238,
  adobe: 0xd9a066,
  adobeDark: 0xb57e46,
  roof: 0x7a4a2b,
  neonPink: 0xff4d8d,
  neonCyan: 0x35e0d2,
  policeRed: 0xff2a2a,
  policeBlue: 0x2a5cff,
  truckRed: 0xa83226,
  truckTeal: 0x2e6f6a,
};
