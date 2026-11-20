import type { Random } from '../core/random';

/**
 * Smooth random lumps in space, 0 to 1, one cell of their grid to each unit of x, y and z: value
 * noise, its numbers at the grid's corners hashed from a seed the random stream gives. For the
 * pictures the sky makes at start-up (milky-way-picture.ts, moon-face-picture.ts).
 */
export function createLumps(random: Random): (x: number, y: number, z: number) => number {
  const seed = Math.floor(random() * 2 ** 31);
  const atCorner = (x: number, y: number, z: number) => {
    let h = seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x1b873593);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const fade = (t: number) => t * t * (3 - 2 * t);

  return (x, y, z) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const fx = fade(x - x0);
    const fy = fade(y - y0);
    const fz = fade(z - z0);
    const near00 = atCorner(x0, y0, z0);
    const near10 = atCorner(x0 + 1, y0, z0);
    const near01 = atCorner(x0, y0 + 1, z0);
    const near11 = atCorner(x0 + 1, y0 + 1, z0);
    const far00 = atCorner(x0, y0, z0 + 1);
    const far10 = atCorner(x0 + 1, y0, z0 + 1);
    const far01 = atCorner(x0, y0 + 1, z0 + 1);
    const far11 = atCorner(x0 + 1, y0 + 1, z0 + 1);
    const near0 = near00 + (near10 - near00) * fx;
    const near1 = near01 + (near11 - near01) * fx;
    const far0 = far00 + (far10 - far00) * fx;
    const far1 = far01 + (far11 - far01) * fx;
    const near = near0 + (near1 - near0) * fy;
    const far = far0 + (far1 - far0) * fy;
    return near + (far - near) * fz;
  };
}
