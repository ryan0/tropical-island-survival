import { DataTexture, LinearFilter, RepeatWrapping, RGBAFormat } from 'three';
import { smoothstep } from '../core/maths';
import type { Random } from '../core/random';
import { createCloudRandom, type CloudPicture } from './cloud-noise';
import { cloudsConfig } from './clouds-config';

// The weather map: where over the sea there is cloud, repeating every `weatherMapSpan` km.
//   red    how much fair-weather cumulus (patchy: fields of it, and clear stretches)
//   green  where the few great towers stand
//   blue   how tall the clouds grow just there
//   alpha  the cirrus: long streaks

/** One layer of soft noise: how many cells across and down, and its weight in the sum. */
type Layer = readonly [across: number, down: number, weight: number];

const SIZE = cloudsConfig.weatherMapSize;
const SEED = 1234567;

// Each channel is soft noise in layers, coarse to fine. The cirrus's cells are several times wider
// than they are tall, which draws it out into streaks.
const LAYERS_OF_EACH_CHANNEL: readonly (readonly Layer[])[] = [
  // cumulus
  [
    [5, 5, 0.5],
    [10, 10, 0.27],
    [20, 20, 0.15],
    [40, 40, 0.08],
  ],
  // towers
  [
    [5, 5, 0.5],
    [10, 10, 0.3],
    [20, 20, 0.2],
  ],
  // how tall
  [
    [9, 9, 0.65],
    [18, 18, 0.35],
  ],
  // cirrus
  [
    [3, 13, 0.5],
    [6, 26, 0.3],
    [12, 52, 0.2],
  ],
];

function mix(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

/** Adds into `field` random values at the corners of the layer's cells, blended smoothly between. */
function addLayer(field: Float32Array, random: Random, [across, down, weight]: Layer): void {
  const corners = new Float32Array(across * down);
  for (let i = 0; i < corners.length; i++) corners[i] = random();
  const corner = (x: number, y: number) => corners[y * across + x];

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cellX = ((x + 0.5) / SIZE) * across;
      const cellY = ((y + 0.5) / SIZE) * down;
      const x0 = Math.floor(cellX);
      const y0 = Math.floor(cellY);
      const x1 = (x0 + 1) % across;
      const y1 = (y0 + 1) % down;
      const tx = smoothstep(0, 1, cellX - x0);
      const ty = smoothstep(0, 1, cellY - y0);
      const top = mix(corner(x0, y0), corner(x1, y0), tx);
      const bottom = mix(corner(x0, y1), corner(x1, y1), tx);
      field[y * SIZE + x] += weight * mix(top, bottom, ty);
    }
  }
}

export function createWeatherMap(): CloudPicture {
  const random = createCloudRandom(SEED);
  const pixels = new Uint8Array(SIZE * SIZE * 4);

  LAYERS_OF_EACH_CHANNEL.forEach((layers, channel) => {
    const field = new Float32Array(SIZE * SIZE);
    for (const layer of layers) addLayer(field, random, layer);
    const lowest = field.reduce((low, value) => Math.min(low, value));
    const highest = field.reduce((high, value) => Math.max(high, value));
    for (let i = 0; i < field.length; i++) {
      pixels[i * 4 + channel] = Math.round((255 * (field[i] - lowest)) / (highest - lowest));
    }
  });

  const texture = new DataTexture(pixels, SIZE, SIZE, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return { texture, pixels };
}
