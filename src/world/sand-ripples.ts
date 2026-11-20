import { FULL_TURN } from '../core/maths';
import type { Random } from '../core/random';
import { worldConfig } from './world-config';

// The ripples that small waves leave in the sand of a shallow sea floor: low ridges a hand's
// breadth apart, running across the way the waves come, each only a few hand's lengths long
// before it forks, joins its neighbour or dies out, so that the floor is a tight net of them and
// never combed lines. That is what many plain waves of nearly the same length and direction add
// up to, and it is how the picture is made. They are kept as slopes, for shading against the
// sun, in two channels of the ground's grit picture (ground-grit.ts): the ground's shader has no
// picture unit to spare for them (docs/DEVICE_NOTES.md), and the grit uses one channel of its
// three. Worked out with a cosine for every dot they would shimmer and show bands further off; a
// picture with mipmaps blurs to flat sand there, as the real thing does to the eye.

const config = worldConfig.sandRipples;

/** How steeply the rippled sand rises at each dot of a square picture: across it, and down it. */
export interface SandRippleSlopes {
  /** Each from -1 to 1, a row of dots after a row. */
  across: Float32Array;
  down: Float32Array;
}

/** A plain wave that fits the picture a whole number of times each way, so that the picture repeats. */
interface Wave {
  across: number;
  down: number;
  phase: number;
  strength: number;
}

/** A number near nought: the sum of three random ones, which is bell-shaped enough. */
function nearNought(random: Random): number {
  return (random() + random() + random()) * (2 / 3) - 1;
}

/**
 * The slopes of a square of rippled sand, `size` dots a side, that repeats in both directions.
 * The ridges run across the picture.
 */
export function createSandRippleSlopes(random: Random, size: number): SandRippleSlopes {
  const { ridges, waves: count, spread, crestSharpness } = config;
  const waves: Wave[] = Array.from({ length: count }, () => ({
    across: Math.round(nearNought(random) * spread[0] * 1.6),
    down: ridges + Math.round(nearNought(random) * spread[1] * 1.6),
    phase: random() * FULL_TURN,
    strength: 0.4 + random(),
  }));

  const heights = new Float32Array(size * size);
  let highest = 0;
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      let height = 0;
      for (const wave of waves) {
        height +=
          wave.strength *
          Math.cos((FULL_TURN * (wave.across * column + wave.down * row)) / size + wave.phase);
      }
      heights[row * size + column] = height;
      highest = Math.max(highest, Math.abs(height));
    }
  }
  // (Where the waves cancel the sand is nearly level and where they agree the ridges stand high:
  // real rippled sand is more even than that, so the height is squeezed towards a ridge's.)
  for (let i = 0; i < heights.length; i++) {
    const height = Math.tanh((3 * heights[i]) / highest);
    // (a crest is narrower than a trough)
    heights[i] = Math.pow(0.5 + 0.5 * height, crestSharpness);
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
