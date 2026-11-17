import {
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RepeatWrapping,
  RGBAFormat,
} from 'three';
import { FULL_TURN } from '../core/maths';
import { seaConfig } from './sea-config';
import type { SeaFloorPictures } from './sea-floor-pictures';

// The crest picture: where the main swell's crest lies, for the breaker's own mesh, which has to
// keep to the crest as it travels. The sea floor's pictures say when the swell reaches each
// spot; this one says the opposite, where the swell has reached at each moment, so that a vertex
// shader can look it up and need not search (it may not loop: docs/DEVICE_NOTES.md).
//
// Across the picture are the directions round the atoll, from due west round through north,
// east and south and back to west. Down it are moments, counted from when the swell crosses the
// line its waves break on (`seaConfig.reefBreak` along the reef) in that direction. Each dot
// holds how far outside that line the crest then lies (red, metres: negative once it is inside),
// the way the swell is travelling there (green and blue, of unit length), and whether there is
// one answer at all (alpha, 1 or 0). Round the lee of the atoll there is not: the swell wraps
// round both sides and its arrival does not grow steadily towards the shore.

export interface CrestPicture {
  readonly texture: DataTexture;
  /** The share of the directions round the atoll in which a crest can be found. */
  readonly shareOfDirectionsFound: number;
  /** The longest unbroken arc of such directions: its middle, and half its width (radians). */
  readonly arc: { readonly middle: number; readonly halfWidth: number };
}

const { directions, moments, secondsBefore, secondsAfter, lookedForWithin, lookedForEvery } =
  seaConfig.crestPicture;
const CHANNELS = 4;
// The swell's heading is its arrival's steepest way up, measured between points this far apart.
const HEADING_MEASURED_OVER = 2;
// A swell whose arrival runs back by more than this, somewhere along a line, has no one crest there.
const RUNS_BACK = 0.02;

/** The direction of a column of the picture, as the island's shape counts directions. */
function directionOf(column: number): number {
  return ((column + 0.5) / directions - 0.5) * FULL_TURN;
}

/** The longest unbroken run of directions in which a crest is found, going round past the last column to the first. */
function longestArc(isFound: readonly boolean[]): { middle: number; halfWidth: number } {
  let longest = 0;
  let endsAt = 0;
  let run = 0;
  // (twice round, so that a run across the join is counted whole)
  for (let step = 0; step < 2 * directions; step++) {
    run = isFound[step % directions] ? Math.min(run + 1, directions) : 0;
    if (run > longest) {
      longest = run;
      endsAt = step;
    }
  }
  const middleColumn = endsAt - (longest - 1) / 2;
  return {
    middle: directionOf(middleColumn % directions),
    halfWidth: ((longest / directions) * FULL_TURN) / 2,
  };
}

/** The main swell's arrival time anywhere, read between the dots of its picture. */
function arrivalReader(seaFloor: SeaFloorPictures): (x: number, z: number) => number {
  const { size, span, mainArrival } = seaFloor;
  const last = size - 1;
  return (x, z) => {
    const across = Math.min(last, Math.max(0, ((x + span / 2) / span) * size - 0.5));
    const down = Math.min(last, Math.max(0, ((z + span / 2) / span) * size - 0.5));
    const column = Math.min(last - 1, Math.floor(across));
    const row = Math.min(last - 1, Math.floor(down));
    const alongRow = across - column;
    const alongColumn = down - row;
    const at = row * size + column;
    const near = mainArrival[at] * (1 - alongRow) + mainArrival[at + 1] * alongRow;
    const far = mainArrival[at + size] * (1 - alongRow) + mainArrival[at + size + 1] * alongRow;
    return near * (1 - alongColumn) + far * alongColumn;
  };
}

/**
 * @param breakLineFromCentre How far from the atoll's centre the line its waves break on lies, in a direction.
 */
export function createCrestPicture(
  seaFloor: SeaFloorPictures,
  breakLineFromCentre: (direction: number) => number,
): CrestPicture {
  const arrivalAt = arrivalReader(seaFloor);
  const values = new Float32Array(directions * moments * CHANNELS);
  const steps = Math.round((2 * lookedForWithin) / lookedForEvery);
  const sinceLine = new Float32Array(steps + 1);
  const isFound: boolean[] = [];

  for (let column = 0; column < directions; column++) {
    const direction = directionOf(column);
    const outX = Math.cos(direction);
    const outZ = Math.sin(direction);
    const line = breakLineFromCentre(direction);
    const arrivalAtLine = arrivalAt(outX * line, outZ * line);

    // The swell's arrival along this direction, from outside the line inwards: seconds after it
    // crosses the line. A crest can be found only if that never runs back, over the moments the
    // picture holds. (Further in, among the gardens' mounds, it may: that does not matter.)
    let latest = -Infinity;
    let runsBack = false;
    for (let step = 0; step <= steps; step++) {
      const fromCentre = line + lookedForWithin - step * lookedForEvery;
      const since = arrivalAt(outX * fromCentre, outZ * fromCentre) - arrivalAtLine;
      const isInPicture = latest > -secondsBefore && latest < secondsAfter;
      if (isInPicture && since < latest - RUNS_BACK) runsBack = true;
      latest = Math.max(latest, since);
      sinceLine[step] = latest;
    }
    isFound.push(!runsBack);

    let step = 0;
    for (let row = 0; row < moments; row++) {
      const moment = -secondsBefore + ((row + 0.5) / moments) * (secondsBefore + secondsAfter);
      while (step < steps - 1 && sinceLine[step + 1] < moment) step++;
      const within = sinceLine[step] <= moment && moment <= sinceLine[step + 1];
      const stride = sinceLine[step + 1] - sinceLine[step];
      const part = within && stride > 1e-6 ? (moment - sinceLine[step]) / stride : 0;
      const outsideLine = lookedForWithin - (step + part) * lookedForEvery;

      const x = outX * (line + outsideLine);
      const z = outZ * (line + outsideLine);
      const half = HEADING_MEASURED_OVER / 2;
      const upX = arrivalAt(x + half, z) - arrivalAt(x - half, z);
      const upZ = arrivalAt(x, z + half) - arrivalAt(x, z - half);
      const steepness = Math.hypot(upX, upZ);

      const dot = (row * directions + column) * CHANNELS;
      values[dot] = outsideLine;
      // (where the picture cannot tell, the swell is taken to head straight in)
      values[dot + 1] = steepness > 1e-9 ? upX / steepness : -outX;
      values[dot + 2] = steepness > 1e-9 ? upZ / steepness : -outZ;
      values[dot + 3] = within && !runsBack ? 1 : 0;
    }
  }

  const halves = new Uint16Array(values.length);
  for (let i = 0; i < values.length; i++) halves[i] = DataUtils.toHalfFloat(values[i]);
  const texture = new DataTexture(halves, directions, moments, RGBAFormat, HalfFloatType);
  // (round the atoll it joins up with itself)
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return {
    texture,
    shareOfDirectionsFound: isFound.filter(Boolean).length / directions,
    arc: longestArc(isFound),
  };
}
