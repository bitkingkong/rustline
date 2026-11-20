// Rustline — random.js
// RNG deterministik (mulberry32) + hash string ke seed.
// Dipakai agar screenshot ?shot=&seed= bisa direproduksi persis.

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed) {
    if (typeof seed === 'string') seed = hashSeed(seed);
    this.seed = (seed >>> 0) || 1;
    this.next = mulberry32(this.seed);
  }
  // float [0, 1)
  f() {
    return this.next();
  }
  // float [min, max)
  range(min, max) {
    return min + this.next() * (max - min);
  }
  // int [min, max] inklusif
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
  // true dengan peluang p
  chance(p) {
    return this.next() < p;
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  // pilihan -1 / +1
  sign() {
    return this.next() < 0.5 ? -1 : 1;
  }
}
