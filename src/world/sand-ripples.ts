import { FULL_TURN, smoothstep } from '../core/maths';
import type { Random } from '../core/random';
import { worldConfig } from './world-config';

// The ripples that small waves leave in the sand of a shallow sea floor: low ridges a hand's
// breadth apart, running across the way the waves come. A ridge runs on for a stride or two,
// wandering a little, and now and then one ends, or one forks into two: single faults, scattered,
// with whole ridges all round them. That is how the picture is made: even ridges, a slow wander
// laid over them, and a number of extra lengths of ridge let in, each of which ends in a fork at
// both of its ends.
//
// (Twice it was made as the sum of many plain waves of nearly one length and direction. Such a
// sum comes to nothing along lines that run across the ridges, and on either side of such a line
// the ridges are out of step: as heights that was bands of ripples and bands of none, and as
// ridges of one height it was a seam down the picture at which every ridge kinked. Ryan found
// both.)
//
// They are kept as slopes, for shading against the sun, in two channels of the ground's grit
// picture (ground-grit.ts): the ground's shader has no picture unit to spare for them
// (docs/DEVICE_NOTES.md), and the grit uses one channel of its three. Worked out with a cosine for
// every dot they would shimmer and show bands further off; a picture with mipmaps blurs to flat
// sand there, as the real thing does to the eye.

const config = worldConfig.sandRipples;
const HALF_TURN = FULL_TURN / 2;

/** How steeply the rippled sand rises at each dot of a square picture: across it, and down it. */
export interface SandRippleSlopes {
  /** Each from -1 to 1, a row of dots after a row. */
  across: Float32Array;
  down: Float32Array;
}

/** The nearest way from one place on the picture to another, which repeats: -0.5 to 0.5 of it. */
function nearestWay(distance: number): number {
  return distance - Math.round(distance);
}

/**
 * A slow wander for the ridges, in ridge spacings, that repeats with the picture: a few waves of
 * whole numbers of turns across it and down it.
 */
function wanderOf(random: Random): (u: number, v: number) => number {
  const { waves, mostTurns, farthest } = config.wander;
  const parts = Array.from({ length: waves }, () => ({
    across: Math.round((random() * 2 - 1) * mostTurns[0]),
    down: Math.round((random() * 2 - 1) * mostTurns[1]),
    phase: random() * FULL_TURN,
    strength: 0.5 + random(),
  }));
  const total = parts.reduce((sum, part) => sum + part.strength, 0);
  return (u, v) => {
    let wander = 0;
    for (const part of parts) {
      wander +=
        part.strength * Math.sin(FULL_TURN * (part.across * u + part.down * v) + part.phase);
    }
    return (farthest * wander) / total;
  };
}

/**
 * Lets extra lengths of ridge into the picture: adds to `turns` (how many turns of a ridge and a
 * trough each dot is through, as an angle) and takes from `height` (the ridges' height, 0 to 1)
 * round each end, where a ridge runs down into the sand.
 *
 * An extra length lies across the picture from one end to the other; between its ends the
 * column of ridges holds one more than beside them, a little closer together, and at each end
 * a ridge forks. The angle each end adds is the one that goes once round the end and repeats down
 * the picture (the angle of sinh(pi z), for z the place from the end); the two ends' angles
 * cancel away from the length between them.
 */
function letInExtraRidges(
  random: Random,
  size: number,
  turns: Float32Array,
  height: Float32Array,
): void {
  const { count, length, sinksWithin } = config.extraRidges;
  const sinhOfColumn = new Float64Array(size * 2);
  const coshOfColumn = new Float64Array(size * 2);
  const fades = new Float64Array(size);
  for (let extra = 0; extra < count; extra++) {
    const middle = random();
    const row = random();
    const halfLength = (length[0] + (length[1] - length[0]) * random()) / 2;
    const way = random() < 0.5 ? 1 : -1;

    for (let column = 0; column < size; column++) {
      const fromMiddle = nearestWay(column / size - middle);
      for (let end = 0; end < 2; end++) {
        const fromEnd = HALF_TURN * (fromMiddle + (end === 0 ? halfLength : -halfLength));
        sinhOfColumn[column * 2 + end] = Math.sinh(fromEnd);
        coshOfColumn[column * 2 + end] = Math.cosh(fromEnd);
      }
      // (What is left of the two angles far from the length is next to nothing, and is faded
      // out before the picture's far side, where the nearest way to the length changes sides.)
      fades[column] = 1 - smoothstep(0.32, 0.5, Math.abs(fromMiddle));
    }

    for (let y = 0; y < size; y++) {
      const down = y / size - row;
      const sine = Math.sin(HALF_TURN * down);
      const cosine = Math.cos(HALF_TURN * down);
      const downToEnd = nearestWay(down);
      for (let column = 0; column < size; column++) {
        const dot = y * size + column;
        const roundFirst = Math.atan2(
          coshOfColumn[column * 2] * sine,
          sinhOfColumn[column * 2] * cosine,
        );
        const roundSecond = Math.atan2(
          coshOfColumn[column * 2 + 1] * sine,
          sinhOfColumn[column * 2 + 1] * cosine,
        );
        turns[dot] += way * (roundFirst - roundSecond) * fades[column];

        const fromMiddle = nearestWay(column / size - middle);
        const toNearerEnd = Math.hypot(Math.abs(fromMiddle) - halfLength, downToEnd);
        if (toNearerEnd < sinksWithin) height[dot] *= smoothstep(0, sinksWithin, toNearerEnd);
      }
    }
  }
}

/**
 * The slopes of a square of rippled sand, `size` dots a side, that repeats in both directions.
 * The ridges run across the picture.
 */
export function createSandRippleSlopes(random: Random, size: number): SandRippleSlopes {
  const { ridges, crestSharpness } = config;
  const wander = wanderOf(random);
  const turns = new Float32Array(size * size);
  const height = new Float32Array(size * size).fill(1);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const u = column / size;
      const v = row / size;
      turns[row * size + column] = FULL_TURN * (ridges * v + wander(u, v));
    }
  }
  letInExtraRidges(random, size, turns, height);

  const heights = new Float32Array(size * size);
  for (let i = 0; i < heights.length; i++) {
    // (a crest is narrower than a trough)
    heights[i] = height[i] * Math.pow(0.5 + 0.5 * Math.cos(turns[i]), crestSharpness);
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
