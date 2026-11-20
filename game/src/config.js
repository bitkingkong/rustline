// RUSTLINE — shared constants. All original: a fictional desert highway town
// at dusk. The highway runs east-west (X axis) at z = 0; the town sits in the
// middle; dirt roads branch north/south into the dunes.
export const WORLD = {
  halfX: 300, // highway runs x = -300 .. 300
  halfZ: 160, // desert extends z = -160 .. 160
  highwayZ: 0,
  highwayWidth: 12,
  dirtRoads: [-140, 140], // north-south dirt roads at these x
  dirtWidth: 8,
  townMinX: -85,
  townMaxX: 85,
  townMinZ: -50,
  townMaxZ: 50,
  checkpoint: { x: 120, z: 0, radius: 14 },
  hideout: { x: -230, z: -95 },
  warehouse: { x: -45, z: -28 },
  gasStation: { x: 55, z: 18 },
  motel: { x: -75, z: 30 },
  diner: { x: 20, z: -25 },
  garage: { x: 78, z: -25 },
  waterTower: { x: 0, z: -45 },
  spawn: { x: -75, z: 38 }, // motel forecourt; also the respawn point
};

export const PLAYER = {
  walkSpeed: 4.2,
  runSpeed: 7.2,
  jumpSpeed: 7.5,
  radius: 0.55,
  health: 100,
};

export const CAR = {
  accel: 16,
  brake: 26,
  reverseAccel: 10,
  maxSpeed: 30,
  maxReverse: 9,
  steerRate: 1.9,
  handbrake: 30,
  radius: 2.3,
  dirtFactor: 0.8, // dirt road: slower
  sandFactor: 0.55, // open sand: much slower
};

export const WANTED = {
  maxStars: 5,
  decaySeconds: 25,
  policeCars: [0, 1, 2, 3, 3, 4],
  footCops: [0, 0, 1, 2, 2, 3],
};

export const MISSIONS = [
  {
    id: 'first-load',
    title: 'Muatan Pertama',
    giver: 'Coyote',
    briefing: 'Kargo di gudangku harus sampai ke pom bensin. Jangan telat, Rosa.',
    reward: 200,
    objectives: [
      { type: 'goto', text: 'Ambil kargo di gudang Coyote', x: -45, z: -20, radius: 6 },
      { type: 'deliver', text: 'Antar kargo ke pom bensin (120 dtk)', x: 55, z: 12, radius: 7, timeLimit: 120 },
    ],
  },
  {
    id: 'rat-run',
    title: 'Jalur Tikus',
    giver: 'Coyote',
    briefing: 'Barang ini panas. Lewat jalan tanah ke motel — jangan sentuh checkpoint di highway.',
    reward: 400,
    objectives: [
      { type: 'goto', text: 'Ambil muatan di gudang Coyote', x: -45, z: -20, radius: 6 },
      { type: 'deliver', text: 'Antar ke motel lewat jalan tanah (150 dtk)', x: -75, z: 24, radius: 7, timeLimit: 150, avoidCheckpoint: true },
    ],
  },
  {
    id: 'last-convoy',
    title: 'Konvoi Terakhir',
    giver: 'Beto',
    briefing: 'Polisi sudah mengendusmu, Rosa. Bertahan 60 detik, lalu hilang ke gudang tua di bukit pasir.',
    reward: 700,
    objectives: [
      { type: 'survive', text: 'Bertahan dari kejaran polisi (60 dtk)', timeLimit: 60, wanted: 3 },
      { type: 'escape', text: 'Capai hideout di bukit pasir', x: -230, z: -95, radius: 8 },
    ],
  },
];

export const SAVE_KEY = 'rustline-save-v1';
export const PALETTE = {
  sky: 0xc96a3e, // dusk orange
  skyTop: 0x5a3a6e, // dusk purple (used by the gradient dome)
  fog: 0xc98a5e, // dust haze
  sun: 0xffd9a0,
  ground: 0xb98a56, // sand
  sandDark: 0x9a6a3e,
  road: 0x33302c,
  dirt: 0x8a6238,
  sidewalk: 0x7a6a55,
  building: [0xc98a5e, 0xa8704a, 0xd6b08a, 0x8a5a4a, 0xb08a6a, 0x9a7a5a],
  carColors: [0xc23b2e, 0x2e6fc2, 0xe8c832, 0x3aa655, 0xe8e8e8, 0x22242a, 0x7a4a9e, 0xd97b2e],
  truckColor: 0x8a2f24,
};
