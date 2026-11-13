// Smooth random values in space, for the rocks' shapes. They depend only on a seed, never on the
// island's layout, so a rock keeps its shape whatever else changes.

export interface Vector {
  x: number;
  y: number;
  z: number;
}

/** A random number from 0 up to 1 for each corner of a grid of whole numbers, and each seed. */
export function latticeRandom(i: number, j: number, k: number, seed: number): number {
  let n =
    Math.imul(i, 374761393) ^
    Math.imul(j, 668265263) ^
    Math.imul(k, 1274126177) ^
    Math.imul(seed, 974634721);
  n = Math.imul(n ^ (n >>> 13), 1103515245);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

/** The grid's random numbers blended smoothly between its corners: 0 to 1. */
export function valueNoise(x: number, y: number, z: number, seed: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const k = Math.floor(z);
  const u = easeInOut(x - i);
  const v = easeInOut(y - j);
  const w = easeInOut(z - k);
  const near = mix(
    mix(latticeRandom(i, j, k, seed), latticeRandom(i + 1, j, k, seed), u),
    mix(latticeRandom(i, j + 1, k, seed), latticeRandom(i + 1, j + 1, k, seed), u),
    v,
  );
  const far = mix(
    mix(latticeRandom(i, j, k + 1, seed), latticeRandom(i + 1, j, k + 1, seed), u),
    mix(latticeRandom(i, j + 1, k + 1, seed), latticeRandom(i + 1, j + 1, k + 1, seed), u),
    v,
  );
  return mix(near, far, w);
}

/**
 * Value noise in `layers`, each finer and fainter than the last and shifted so that their grids
 * do not line up: 0 to 1.
 */
export function layeredNoise(
  x: number,
  y: number,
  z: number,
  seed: number,
  layers: number,
): number {
  let sum = 0;
  let weight = 0.5;
  let totalWeight = 0;
  let layerX = x;
  let layerY = y;
  let layerZ = z;
  for (let layer = 0; layer < layers; layer++) {
    sum += weight * valueNoise(layerX, layerY, layerZ, seed + layer * 7);
    totalWeight += weight;
    weight *= 0.5;
    layerX = layerX * 2.03 + 1.7;
    layerY = layerY * 2.03 + 3.1;
    layerZ = layerZ * 2.03 + 5.3;
  }
  return sum / totalWeight;
}

/** Value noise folded about its middle: 1 along sharp crests, falling to 0 between them. */
export function ridgeNoise(x: number, y: number, z: number, seed: number): number {
  return 1 - Math.abs(2 * valueNoise(x, y, z, seed) - 1);
}

/** A direction (of length 1) that depends only on the seed and `index`. */
export function randomDirection(seed: number, index: number): Vector {
  const y = latticeRandom(index, 1, 2, seed) * 2 - 1;
  const around = latticeRandom(index, 3, 4, seed) * 6.283;
  const across = Math.sqrt(1 - y * y);
  return { x: across * Math.cos(around), y, z: across * Math.sin(around) };
}
