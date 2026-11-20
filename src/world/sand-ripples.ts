import { FULL_TURN } from '../core/maths';
import type { Random } from '../core/random';
import { worldConfig } from './world-config';

// The ripples that small waves leave in the sand of a shallow sea floor: long low ridges a hand's
// length apart, running across the way the waves come, wandering, forking and joining, and fading
// out in patches. They are kept as slopes, for shading against the sun, in two channels of the
// ground's grit picture (ground-grit.ts): the ground's shader has no picture unit to spare for
// them (docs/DEVICE_NOTES.md), and the grit uses one channel of its three. Worked out with a
// cosine for every dot they would shimmer and show bands further off; a picture with mipmaps
// blurs to flat sand there, as the real thing does to the eye.

const config = worldConfig.sandRipples;

/** How steeply the rippled sand rises at each dot of a square picture: across it, and down it. */
export interface SandRippleSlopes {
  /** Each from -1 to 1, a row of dots after a row. */
  across: Float32Array;
  down: Float32Array;
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
 * The slopes of a square of rippled sand, `size` dots a side, that repeats in both directions.
 * The ridges run across the picture. Where the ripples fade out in patches the slopes are level.
 */
export function createSandRippleSlopes(random: Random, size: number): SandRippleSlopes {
  const { ridges, wander, crestSharpness } = config;
  const wanders = wanderingField(random, 7, 3);
  const patches = wanderingField(random, 6, 2);
  const heights = new Float32Array(size * size);
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
    }
  }

  const across = new Float32Array(size * size);
  const down = new Float32Array(size * size);
  const wrapped = (index: number) => (index + size) % size;
  const clamped = (slope: number) => Math.min(1, Math.max(-1, slope));
  // How much a rise of one height in a dot is kept as: the steepest ripples use the whole range.
  const slopeScale = size / (ridges * 8);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const here = row * size + column;
      across[here] = clamped(
        slopeScale *
          (heights[row * size + wrapped(column + 1)] - heights[row * size + wrapped(column - 1)]),
      );
      down[here] = clamped(
        slopeScale *
          (heights[wrapped(row + 1) * size + column] - heights[wrapped(row - 1) * size + column]),
      );
    }
  }
  return { across, down };
}
