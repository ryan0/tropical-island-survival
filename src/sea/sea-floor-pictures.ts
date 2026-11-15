import {
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RGBAFormat,
} from 'three';
import { swellSpeed } from 'virtual:wave-timing';
import type { GroundHeight } from '../world/landmarks';
import { seaConfig } from './sea-config';

// The sea floor as the waves know it. The waves have no formula of their own for where the water
// shallows: they read it from two pictures made here, once, from the ground itself. Whatever the
// ground becomes, the waves follow.
//
// The floor picture holds the depth, and for each swell how long it takes to arrive: a swell
// travels at the speed its depth allows (wave-timing/timing.glsl), so its crests slow over the
// reef and bend round shallows. A crest lies wherever the arrival time and the clock agree.
//
// The breaks picture holds, for four depths, how many seconds ago the main swell first crossed
// water that shallow on its way to each spot: negative while that is still ahead of it. A wave
// breaks where the water is about as shallow as the wave is high, so this is the clock its
// breaking runs by, and it differs along a crest wherever the floor does.
//
// The shaders read the pictures as textures; the program reads the same numbers.

const { span, size, smoothedOver, breakDepths, longestKept } = seaConfig.floorPicture;
const CHANNELS = 4;
const METRES_A_DOT = span / size;
/** An arrival time for a dot no swell has reached yet. */
const UNREACHED = 1e6;
/** A time since crossing for a dot whose swell has not crossed that depth, so far. */
const NOT_YET = -1e6;
// The swell is left as it comes in, a plane wave, on the dots this far upstream of the centre:
// beyond the reef on every side.
const PLANE_WAVE_BEYOND = span * 0.43;
// The travel times are worked out by sweeping the picture from each corner in turn until they
// settle (the fast sweeping method); a dozen rounds is far more than it needs.
const MOST_ROUNDS = 12;
const SETTLED_WITHIN_SECONDS = 1e-3;
// A ray is followed this many dots at a time when a crossing is carried along it.
const DOTS_A_STEP = 1.5;

export interface SeaFloorPictures {
  /** Metres across, centred on the atoll; and dots across. */
  readonly span: number;
  readonly size: number;
  /** Each dot: the delay of swell 0, the delay of swell 1, the depth; the fourth is unused. */
  readonly floor: DataTexture;
  /** Each dot: seconds since the main swell first crossed each of the four break depths. */
  readonly breaks: DataTexture;
  /** The pictures' numbers for the program, exactly as the textures hold them. */
  readonly floorValues: Float32Array;
  readonly breakValues: Float32Array;
  /** Metres a second in the open sea: a swell's delay is how far behind this it has fallen. */
  readonly openSeaSpeed: number;
  /** How long the pictures took to make, for the debug panel. */
  readonly madeInMilliseconds: number;
}

function metresAt(dot: number): number {
  return (dot + 0.5) * METRES_A_DOT - span / 2;
}

/** The depth of the sea floor at each dot, positive down, averaged over its neighbours. */
function depthOfTheFloor(groundHeight: GroundHeight): Float32Array {
  const depth = new Float32Array(size * size);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      depth[row * size + column] = -groundHeight(metresAt(column), metresAt(row));
    }
  }
  // Averaged along the rows, then along the columns.
  const averaged = new Float32Array(size * size);
  for (const [step, lineStep] of [
    [1, size],
    [size, 1],
  ]) {
    for (let line = 0; line < size; line++) {
      for (let along = 0; along < size; along++) {
        let sum = 0;
        let count = 0;
        for (let offset = -smoothedOver; offset <= smoothedOver; offset++) {
          const neighbour = along + offset;
          if (neighbour < 0 || neighbour >= size) continue;
          sum += depth[line * lineStep + neighbour * step];
          count++;
        }
        averaged[line * lineStep + along * step] = sum / count;
      }
    }
    depth.set(averaged);
  }
  return depth;
}

/**
 * When a swell travelling `towards` reaches each dot, in seconds: 0 at the atoll's centre if the
 * sea were open and deep all the way.
 */
function arrivalTimes(
  depth: Float32Array,
  towards: readonly [number, number],
  openSeaSpeed: number,
): Float32Array {
  const arrival = new Float32Array(size * size).fill(UNREACHED);
  const isGiven = new Uint8Array(size * size);
  // Seconds to cross a dot.
  const crossing = new Float32Array(size * size);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const at = row * size + column;
      crossing[at] = METRES_A_DOT / swellSpeed(depth[at]);
      const along = metresAt(column) * towards[0] + metresAt(row) * towards[1];
      if (along < -PLANE_WAVE_BEYOND) {
        arrival[at] = along / openSeaSpeed;
        isGiven[at] = 1;
      }
    }
  }

  const last = size - 1;
  for (let round = 0; round < MOST_ROUNDS; round++) {
    let mostChanged = 0;
    for (let sweep = 0; sweep < 4; sweep++) {
      const rowStep = sweep < 2 ? 1 : -1;
      const columnStep = sweep % 2 === 0 ? 1 : -1;
      for (let r = 0; r < size; r++) {
        const row = rowStep > 0 ? r : last - r;
        for (let c = 0; c < size; c++) {
          const column = columnStep > 0 ? c : last - c;
          const at = row * size + column;
          if (isGiven[at] === 1) continue;

          // The earlier of the two neighbours each way: the swell comes from them.
          const alongRow = Math.min(
            column > 0 ? arrival[at - 1] : UNREACHED,
            column < last ? arrival[at + 1] : UNREACHED,
          );
          const alongColumn = Math.min(
            row > 0 ? arrival[at - size] : UNREACHED,
            row < last ? arrival[at + size] : UNREACHED,
          );
          const apart = Math.abs(alongRow - alongColumn);
          const time = crossing[at];
          const arrives =
            apart >= time
              ? Math.min(alongRow, alongColumn) + time
              : 0.5 * (alongRow + alongColumn + Math.sqrt(2 * time * time - apart * apart));
          if (arrives < arrival[at]) {
            mostChanged = Math.max(mostChanged, arrival[at] - arrives);
            arrival[at] = arrives;
          }
        }
      }
    }
    if (mostChanged < SETTLED_WITHIN_SECONDS) break;
  }
  return arrival;
}

/**
 * For each break depth, the seconds since the swell first crossed water that shallow on its way to
 * each dot: negative where the crossing is still ahead of it, and no more than `longestKept`
 * either way. Four numbers a dot, one for each depth.
 */
function timesSinceCrossing(depth: Float32Array, arrival: Float32Array): Float32Array {
  const since = new Float32Array(size * size * CHANNELS).fill(NOT_YET);
  const last = size - 1;

  // The way the swell travels at each dot, as a step of DOTS_A_STEP dots.
  const stepColumns = new Float32Array(size * size);
  const stepRows = new Float32Array(size * size);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const at = row * size + column;
      const alongRow = arrival[at + (column < last ? 1 : 0)] - arrival[at - (column > 0 ? 1 : 0)];
      const alongColumn =
        arrival[at + (row < last ? size : 0)] - arrival[at - (row > 0 ? size : 0)];
      const length = Math.hypot(alongRow, alongColumn);
      if (length < 1e-9) continue;
      stepColumns[at] = (alongRow / length) * DOTS_A_STEP;
      stepRows[at] = (alongColumn / length) * DOTS_A_STEP;
    }
  }

  // The dots in the order the swell reaches them.
  const order = new Uint32Array(size * size);
  for (let at = 0; at < order.length; at++) order[at] = at;
  order.sort((a, b) => arrival[a] - arrival[b]);

  // What the four dots round a point between dots say, each weighed by how near it is. Only the
  // dots that know are counted; `found` says whether the nearest of them did.
  const corners = new Uint32Array(4);
  const weights = new Float32Array(4);
  function lookRound(column: number, row: number): void {
    const c = Math.max(0, Math.min(last - 1e-3, column));
    const r = Math.max(0, Math.min(last - 1e-3, row));
    const c0 = Math.floor(c);
    const r0 = Math.floor(r);
    const fc = c - c0;
    const fr = r - r0;
    corners[0] = r0 * size + c0;
    corners[1] = corners[0] + 1;
    corners[2] = corners[0] + size;
    corners[3] = corners[2] + 1;
    weights[0] = (1 - fc) * (1 - fr);
    weights[1] = fc * (1 - fr);
    weights[2] = (1 - fc) * fr;
    weights[3] = fc * fr;
  }
  function weighed(values: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < 4; i++) sum += values[corners[i]] * weights[i];
    return sum;
  }

  // What is carried along a ray is the moment of its crossing, which is the same all the way along
  // it: carrying the seconds since would add up a little error at every dot, differently on
  // neighbouring rays.
  //
  // Forwards, as the swell travels: a dot behind a crossing takes the crossing's moment from the
  // dots before it.
  const crossedAt = since;
  for (const at of order) {
    if (arrival[at] >= UNREACHED / 2) continue;
    const column = at % size;
    const row = (at - column) / size;
    lookRound(column - stepColumns[at], row - stepRows[at]);
    const arrivalBefore = Math.min(arrival[at], weighed(arrival));
    const depthBefore = weighed(depth);

    for (let level = 0; level < CHANNELS; level++) {
      let known = 0;
      let sum = 0;
      let nearest = 0;
      for (let i = 0; i < 4; i++) {
        const value = crossedAt[corners[i] * CHANNELS + level];
        if (weights[i] > weights[nearest]) nearest = i;
        if (value <= NOT_YET / 2) continue;
        known += weights[i];
        sum += value * weights[i];
      }
      const hasCrossedBefore = crossedAt[corners[nearest] * CHANNELS + level] > NOT_YET / 2;
      if (hasCrossedBefore && known > 0) {
        crossedAt[at * CHANNELS + level] = sum / known;
      } else if (depth[at] <= breakDepths[level]) {
        // It crosses between the dots before and this one: part of the way along.
        const fall = depthBefore - depth[at];
        const share = fall > 1e-6 ? (depthBefore - breakDepths[level]) / fall : 1;
        crossedAt[at * CHANNELS + level] =
          arrivalBefore + (arrival[at] - arrivalBefore) * Math.max(0, Math.min(1, share));
      }
    }
  }

  // Backwards: a dot ahead of a crossing takes its moment from the dots after it.
  for (let i = order.length - 1; i >= 0; i--) {
    const at = order[i];
    const column = at % size;
    const row = (at - column) / size;
    lookRound(column + stepColumns[at], row + stepRows[at]);

    for (let level = 0; level < CHANNELS; level++) {
      const here = at * CHANNELS + level;
      if (crossedAt[here] > NOT_YET / 2) continue;

      let known = 0;
      let sum = 0;
      for (let corner = 0; corner < 4; corner++) {
        const value = crossedAt[corners[corner] * CHANNELS + level];
        if (value <= NOT_YET / 2 || corners[corner] === at) continue;
        known += weights[corner];
        sum += value * weights[corner];
      }
      if (known > 0) crossedAt[here] = sum / known;
    }
  }

  // The seconds since: a swell that never crosses the depth is always a long way short of it.
  for (let at = 0; at < size * size; at++) {
    for (let level = 0; level < CHANNELS; level++) {
      const here = at * CHANNELS + level;
      const seconds = crossedAt[here] > NOT_YET / 2 ? arrival[at] - crossedAt[here] : -longestKept;
      since[here] = Math.max(-longestKept, Math.min(longestKept, seconds));
    }
  }
  return evenedOut(since);
}

/**
 * Each dot's four numbers averaged with its eight neighbours', the nearer counting for more. A
 * crossing is carried along each ray by itself, which leaves neighbouring rays a little out of
 * step: a wave's crest would stand up raggedly along its length, dot by dot.
 */
function evenedOut(values: Float32Array): Float32Array {
  const evened = new Float32Array(values.length);
  const last = size - 1;
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      for (let channel = 0; channel < CHANNELS; channel++) {
        let sum = 0;
        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
          for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
            const r = Math.max(0, Math.min(last, row + rowOffset));
            const c = Math.max(0, Math.min(last, column + columnOffset));
            const weight = (2 - Math.abs(rowOffset)) * (2 - Math.abs(columnOffset));
            sum += values[(r * size + c) * CHANNELS + channel] * weight;
          }
        }
        evened[(row * size + column) * CHANNELS + channel] = sum / 16;
      }
    }
  }
  return evened;
}

// A half float as a number: sign, five bits of exponent, ten of fraction.
function fromHalfFloat(half: number): number {
  const sign = half & 0x8000 ? -1 : 1;
  const exponent = (half >> 10) & 0x1f;
  const fraction = half & 0x3ff;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

/** The values as half floats for a texture, and rounded in place to what the texture will hold. */
function asTexture(values: Float32Array): DataTexture {
  const halves = new Uint16Array(values.length);
  for (let i = 0; i < values.length; i++) {
    halves[i] = DataUtils.toHalfFloat(values[i]);
    values[i] = fromHalfFloat(halves[i]);
  }
  const texture = new DataTexture(halves, size, size, RGBAFormat, HalfFloatType);
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createSeaFloorPictures(groundHeight: GroundHeight): SeaFloorPictures {
  const startedAt = performance.now();
  const depth = depthOfTheFloor(groundHeight);
  // The open sea is as deep as the picture's upstream edge.
  const [mainSwell, secondSwell] = seaConfig.swells;
  const edge = span / 2 - METRES_A_DOT;
  const openSeaSpeed = swellSpeed(
    -groundHeight(-mainSwell.towards[0] * edge, -mainSwell.towards[1] * edge),
  );

  const mainArrival = arrivalTimes(depth, mainSwell.towards, openSeaSpeed);
  const secondArrival = arrivalTimes(depth, secondSwell.towards, openSeaSpeed);
  const breakValues = timesSinceCrossing(depth, mainArrival);

  // A swell's delay is how far it has fallen behind a swell crossing open sea: a small number,
  // which a half float holds finely, where the arrival time itself is a large one.
  const floorValues = new Float32Array(size * size * CHANNELS);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const at = row * size + column;
      const x = metresAt(column);
      const z = metresAt(row);
      const delay = (arrival: Float32Array, [towardsX, towardsZ]: readonly [number, number]) =>
        Math.min(arrival[at] - (x * towardsX + z * towardsZ) / openSeaSpeed, 4 * longestKept);
      floorValues[at * CHANNELS] = delay(mainArrival, mainSwell.towards);
      floorValues[at * CHANNELS + 1] = delay(secondArrival, secondSwell.towards);
      floorValues[at * CHANNELS + 2] = depth[at];
    }
  }

  const floor = asTexture(floorValues);
  const breaks = asTexture(breakValues);
  return {
    span,
    size,
    floor,
    breaks,
    floorValues,
    breakValues,
    openSeaSpeed,
    madeInMilliseconds: performance.now() - startedAt,
  };
}
