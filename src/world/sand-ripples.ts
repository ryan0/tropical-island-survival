import { FULL_TURN } from '../core/maths';
import type { Random } from '../core/random';
import { worldConfig } from './world-config';

// The ripples that small waves leave in the sand of a shallow sea floor: low ridges a hand's
// breadth apart, running across the way the waves come, each only a few hand's lengths long
// before it forks or joins its neighbour, so that the floor is a tight net of them and never
// combed lines. That is the shape many plain waves of nearly the same length and direction make
// together, and it is how the picture is made. They are kept as slopes, for shading against the
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
  const { ridges, waves: count, spread, crestSharpness, forkSoftening } = config;
  const waves: Wave[] = Array.from({ length: count }, () => ({
    across: Math.round(nearNought(random) * spread[0] * 1.6),
    down: ridges + Math.round(nearNought(random) * spread[1] * 1.6),
    phase: random() * FULL_TURN,
    strength: 0.4 + random(),
  }));

  // Added up plainly, such waves cancel in some places and agree in others, and the ripples came
  // in bands: strong, then none, then strong, and the same bands again with every repeat of the
  // picture. Real rippled sand is rippled all over. So the waves are added as turning arrows (a
  // cosine and a sine each), and what is kept is only which way their sum points, not how long it
  // is: ridges of one height everywhere, whose line still wanders, and which fork just where the
  // sum comes to nothing and its direction jumps, as a real ripple forks.
  const heights = new Float32Array(size * size);
  const cosines = new Float32Array(size * size);
  const sines = new Float32Array(size * size);
  let sumOfSquares = 0;
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      let cosine = 0;
      let sine = 0;
      for (const wave of waves) {
        const angle = (FULL_TURN * (wave.across * column + wave.down * row)) / size + wave.phase;
        cosine += wave.strength * Math.cos(angle);
        sine += wave.strength * Math.sin(angle);
      }
      cosines[row * size + column] = cosine;
      sines[row * size + column] = sine;
      sumOfSquares += cosine * cosine + sine * sine;
    }
  }
  // (Close to a fork the ridges sink into the sand: there the sum is short beside its usual length.)
  const softening = forkSoftening * forkSoftening * (sumOfSquares / heights.length);
  for (let i = 0; i < heights.length; i++) {
    const length = Math.sqrt(cosines[i] * cosines[i] + sines[i] * sines[i] + softening);
    // (a crest is narrower than a trough)
    heights[i] = Math.pow(0.5 + (0.5 * cosines[i]) / length, crestSharpness);
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
