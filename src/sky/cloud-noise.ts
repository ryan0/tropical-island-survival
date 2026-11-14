import { DataTexture, LinearFilter, RGBAFormat } from 'three';
import { mixAsShadersDo, smoothstep } from '../core/maths';
import type { Random } from '../core/random';
import { cloudsConfig } from './clouds-config';

// Noise that fills space: a cube stored as its slices laid side by side in one picture, each slice
// with a one-dot border copied from its far side so that reading across its edge is seamless. It
// repeats in all three directions.
//   red    the cloud shapes: round lumps, big and middling, on soft noise
//   green  finer round lumps (read again at a smaller scale to nibble the edges into cauliflower)

/**
 * A picture the clouds are made from: the texture for the shaders, and its dots for the
 * program's own copy of the cloud field.
 */
export interface CloudPicture {
  texture: DataTexture;
  pixels: Uint8Array;
}

const SIZE = cloudsConfig.noiseSize;
const SLICES_ACROSS = cloudsConfig.noiseSlicesAcross;
const SEED = 91173;

/** A slice of the cube with its one-dot border: a tile this many dots square. */
export const NOISE_TILE = SIZE + 2;
/** The tiles lie side by side in one square picture, this many dots a side. */
export const NOISE_PICTURE_WIDTH = NOISE_TILE * SLICES_ACROSS;

/**
 * Each cloud picture has a random stream of its own, so that the clouds are the same each run.
 * The divisor is build 78's, a little over 2^32; correcting it would move every cloud.
 */
export function createCloudRandom(seed: number): Random {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4296967296;
  };
}

function inCells(dot: number, cells: number): number {
  return ((dot + 0.5) / SIZE) * cells;
}

/** A value for each dot of the cube, x fastest. `valueAt` is given the dot's middle in cells. */
function cube(cells: number, valueAt: (x: number, y: number, z: number) => number): Float32Array {
  const values = new Float32Array(SIZE ** 3);
  let dot = 0;
  for (let z = 0; z < SIZE; z++) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        values[dot++] = valueAt(inCells(x, cells), inCells(y, cells), inCells(z, cells));
      }
    }
  }
  return values;
}

/** Round lumps: `cells` cells a side with one point in each. 1 at a point, 0 a cell-width away. */
function lumps(random: Random, cells: number): Float32Array {
  const pointCount = cells ** 3;
  const pointX = new Float32Array(pointCount);
  const pointY = new Float32Array(pointCount);
  const pointZ = new Float32Array(pointCount);
  for (let i = 0; i < pointCount; i++) {
    pointX[i] = random();
    pointY[i] = random();
    pointZ[i] = random();
  }
  const wrap = (cell: number) => (cell + cells) % cells;

  // Only points within a cell-width count, and those all lie in the dot's own cell or one beside it.
  return cube(cells, (x, y, z) => {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    const cellZ = Math.floor(z);
    let nearestSquared = Infinity;
    for (let nz = cellZ - 1; nz <= cellZ + 1; nz++) {
      for (let ny = cellY - 1; ny <= cellY + 1; ny++) {
        for (let nx = cellX - 1; nx <= cellX + 1; nx++) {
          const point = (wrap(nz) * cells + wrap(ny)) * cells + wrap(nx);
          const dx = nx + pointX[point] - x;
          const dy = ny + pointY[point] - y;
          const dz = nz + pointZ[point] - z;
          nearestSquared = Math.min(nearestSquared, dx * dx + dy * dy + dz * dz);
        }
      }
    }
    return 1 - Math.min(1, Math.sqrt(nearestSquared));
  });
}

/** Soft noise: random values at the corners of `cells` cells a side, blended smoothly between. */
function softNoise(random: Random, cells: number): Float32Array {
  const corners = new Float32Array(cells ** 3);
  for (let i = 0; i < corners.length; i++) corners[i] = random();
  const corner = (x: number, y: number, z: number) => corners[(z * cells + y) * cells + x];

  return cube(cells, (x, y, z) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const x1 = (x0 + 1) % cells;
    const y1 = (y0 + 1) % cells;
    const z1 = (z0 + 1) % cells;
    const tx = smoothstep(0, 1, x - x0);
    const ty = smoothstep(0, 1, y - y0);
    const tz = smoothstep(0, 1, z - z0);
    const near = mixAsShadersDo(
      mixAsShadersDo(corner(x0, y0, z0), corner(x1, y0, z0), tx),
      mixAsShadersDo(corner(x0, y1, z0), corner(x1, y1, z0), tx),
      ty,
    );
    const far = mixAsShadersDo(
      mixAsShadersDo(corner(x0, y0, z1), corner(x1, y0, z1), tx),
      mixAsShadersDo(corner(x0, y1, z1), corner(x1, y1, z1), tx),
      ty,
    );
    return mixAsShadersDo(near, far, tz);
  });
}

export function createCloudNoise(): CloudPicture {
  const random = createCloudRandom(SEED);
  // In this order: each takes the next share of the random stream.
  const bigLumps = lumps(random, 4);
  const middlingLumps = lumps(random, 8);
  const smallLumps = lumps(random, 16);
  const bigSoft = softNoise(random, 4);
  const middlingSoft = softNoise(random, 8);
  const smallSoft = softNoise(random, 16);

  const shapes = new Float32Array(SIZE ** 3);
  for (let i = 0; i < shapes.length; i++) {
    const soft = bigSoft[i] * 0.56 + middlingSoft[i] * 0.29 + smallSoft[i] * 0.15;
    const lumpy = bigLumps[i] * 0.68 + middlingLumps[i] * 0.32;
    shapes[i] = lumpy * 0.62 + soft;
  }
  const lowest = shapes.reduce((low, value) => Math.min(low, value));
  const highest = shapes.reduce((high, value) => Math.max(high, value));
  const shapeAt = (dot: number) => (255 * (shapes[dot] - lowest)) / (highest - lowest);
  const finerLumpsAt = (dot: number) =>
    255 * Math.min(1, (middlingLumps[dot] * 0.62 + smallLumps[dot] * 0.38) * 1.25);

  const wrap = (dot: number) => (dot + SIZE) % SIZE;
  const pixels = new Uint8Array(NOISE_PICTURE_WIDTH * NOISE_PICTURE_WIDTH * 4);
  for (let z = 0; z < SIZE; z++) {
    const sliceLeft = (z % SLICES_ACROSS) * NOISE_TILE;
    const sliceTop = Math.floor(z / SLICES_ACROSS) * NOISE_TILE;
    // -1 and SIZE are the border.
    for (let y = -1; y <= SIZE; y++) {
      for (let x = -1; x <= SIZE; x++) {
        const dot = (z * SIZE + wrap(y)) * SIZE + wrap(x);
        const pixel = ((sliceTop + 1 + y) * NOISE_PICTURE_WIDTH + sliceLeft + 1 + x) * 4;
        pixels[pixel] = Math.round(shapeAt(dot));
        pixels[pixel + 1] = Math.round(finerLumpsAt(dot));
        pixels[pixel + 3] = 255;
      }
    }
  }

  const texture = new DataTexture(pixels, NOISE_PICTURE_WIDTH, NOISE_PICTURE_WIDTH, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return { texture, pixels };
}
