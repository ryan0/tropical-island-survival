import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  RGBAFormat,
} from 'three';
import { FULL_TURN } from '../core/maths';
import type { Random } from '../core/random';
import { worldConfig } from './world-config';

// The ripples that small waves leave in the sand of a shallow sea floor, as a picture for the
// ground's colouring: long low ridges a hand's length apart, running across the way the waves
// come, wandering, forking and joining, and fading out in patches. Worked out with a cosine for
// every dot they shimmered and showed bands further off; a picture with mipmaps blurs to flat
// sand there, as the real thing does to the eye.

const config = worldConfig.sandRipples;

export interface SandRipplesPicture {
  texture: DataTexture;
  /** How many metres of sea floor one repeat of the picture covers. */
  span: number;
}

/** A smooth field that wraps at the picture's edges: a few waves of whole numbers of turns across it. */
function wanderingField(random: Random, waves: number, mostTurns: number) {
  const parts = Array.from({ length: waves }, () => ({
    across: Math.round((random() * 2 - 1) * mostTurns),
    down: Math.round((random() * 2 - 1) * mostTurns),
    phase: random() * FULL_TURN,
    strength: 0.5 + random(),
  }));
  const total = parts.reduce((sum, part) => sum + part.strength, 0);
  return (u: number, v: number): number => {
    let value = 0;
    for (const part of parts) {
      value += part.strength * Math.sin(FULL_TURN * (part.across * u + part.down * v) + part.phase);
    }
    return value / total;
  };
}

/**
 * The picture. Red is the sand's height in a ripple, 0 in a trough to 1 on a crest; green and blue
 * are how steeply it rises across the picture and down it (a half is level), for shading against
 * the sun; alpha is how strongly the ripples stand here, 0 where they have faded out.
 */
export function createSandRipplesPicture(random: Random): SandRipplesPicture {
  const { size, span, ridges, wander, crestSharpness } = config;
  const wanders = wanderingField(random, 7, 3);
  const patches = wanderingField(random, 6, 2);
  const heights = new Float32Array(size * size);
  const strengths = new Float32Array(size * size);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const u = column / size;
      const v = row / size;
      // (the ridges run across the picture: their phase goes down it, pushed about by the wander)
      const phase = FULL_TURN * (ridges * v + wander * wanders(u, v));
      // (a crest is narrower than a trough)
      const ridge = Math.pow(0.5 + 0.5 * Math.cos(phase), crestSharpness);
      const strength = Math.min(1, Math.max(0, 0.6 + 1.4 * patches(u, v)));
      heights[row * size + column] = ridge * strength;
      strengths[row * size + column] = strength;
    }
  }

  const data = new Uint8Array(size * size * 4);
  const wrapped = (index: number) => (index + size) % size;
  // How much a slope of one height in a dot is written as: steep enough ripples use the whole range.
  const slopeScale = size / (ridges * 8);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const here = row * size + column;
      const acrossSlope =
        heights[row * size + wrapped(column + 1)] - heights[row * size + wrapped(column - 1)];
      const downSlope =
        heights[wrapped(row + 1) * size + column] - heights[wrapped(row - 1) * size + column];
      const byte = (value: number) => Math.round(255 * Math.min(1, Math.max(0, value)));
      data[here * 4] = byte(heights[here]);
      data[here * 4 + 1] = byte(0.5 + 0.5 * slopeScale * acrossSlope);
      data[here * 4 + 2] = byte(0.5 + 0.5 * slopeScale * downSlope);
      data[here * 4 + 3] = byte(strengths[here]);
    }
  }

  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return { texture, span };
}
