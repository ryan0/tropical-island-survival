import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
} from 'three';
import type { Random } from '../../core/random';
import { DOTS, MASK, ranked, SIZE } from './floor-painting';
import { paintHardFloorRelief } from './hard-floor-relief';
import { paintHardFloorSurface } from './hard-floor-surface';
import { paintLivedInSand } from './lived-in-sand';
import { seaBedConfig } from './sea-bed-config';

export interface SeaBedPicture {
  texture: DataTexture;
  /** How many metres of sea floor one repeat of the picture covers. */
  span: number;
  /** The average of each channel, 0 to 1. */
  averages: readonly [number, number, number, number];
}

/**
 * Moves a field's values so that their average is `target`, as it will be written: kept within
 * 0 to 1, so that the darkest pores and brightest flecks, which are cut off there, do not move it.
 */
function centred(field: Float32Array, target: number): Float32Array {
  let sum = 0;
  for (const value of field) sum += value < 0 ? 0 : value > 1 ? 1 : value;
  const shift = target - sum / DOTS;
  return field.map((value) => value + shift);
}

/**
 * What the sea's bed is made of (the bed's shape is another matter, and the waves' pictures of
 * it are sea/sea-floor-pictures.ts).
 *
 * The sea floor seen from straight above, for the ground's shader to lay on the floor of the reef
 * and the lagoon. It holds two floors. The reef's hard floor: alpha its height as a rank (a level t
 * leaves the share 1 - t above it, so that sand poured to that level leaves that share of rock),
 * red the light and dark of its fine detail, green what covers it as a place on the shader's ramp
 * of colours. And blue, the relief of lagoon sand that burrowers have worked over, level at 0.35.
 * It is a DataTexture, not a canvas: a canvas keeps colour multiplied by alpha.
 */
export function createSeaBedPicture(random: Random, maxAnisotropy: number): SeaBedPicture {
  if ((SIZE & MASK) !== 0) {
    throw new Error(`The sea bed picture's size, ${SIZE}, must be a power of two`);
  }

  const relief = paintHardFloorRelief(random);
  const { shade, cover } = paintHardFloorSurface(random, relief);
  const channels = [centred(shade, 0.5), cover, paintLivedInSand(random), ranked(relief.height)];

  const pixels = new Uint8Array(DOTS * 4);
  // Clamped, so that each value is rounded and kept within 0 to 255 as it is written.
  const clamped = new Uint8ClampedArray(pixels.buffer);
  const sums = [0, 0, 0, 0];
  channels.forEach((field, channel) => {
    let sum = 0;
    for (let dot = 0; dot < DOTS; dot++) {
      const at = dot * 4 + channel;
      clamped[at] = field[dot] * 255;
      sum += pixels[at];
    }
    sums[channel] = sum;
  });

  const texture = new DataTexture(pixels, SIZE, SIZE, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = Math.min(seaBedConfig.mostAnisotropy, maxAnisotropy);
  texture.needsUpdate = true;

  const average = (channel: number): number => sums[channel] / DOTS / 255;
  return {
    texture,
    span: seaBedConfig.span,
    averages: [average(0), average(1), average(2), average(3)],
  };
}
