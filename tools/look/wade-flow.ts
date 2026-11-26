// Says how what is seen under the water moves on the screen as the player moves through it:
//
//   node tools/look/wade-flow.ts <folder of a walk's frames> [<folder> ...]
//
// The frames are wade.ts's, drawn from a measuring build: a scratch copy of the code in which
// every thing is coloured by where in the world it lies, and the sea's surface shows nothing but
// what it reads from behind itself (README.md, "What moves as the eye moves", has the three edits).
// In such a frame red and green are a place's x and z, a metre to a round of colour, and blue is 1
// where the place is seen through the surface. So each dot of water says which point of the
// floor is seen there, bent and raised as the surface shows it.
//
// For spots on a grid over the screen, in each frame: which point of the floor is seen at the
// spot, and where on the screen that same point is seen in the next frame. That is how the image
// moves at the spot, its flow. An eye moving steadily over a level floor sees a flow that is the
// same from frame to frame at each spot of the screen. What changes from frame to frame is
// wobble: the ripples' bending, the bob of the eye, a wave ridden. The figure for a walk is the
// wobble in degrees a second (the flow at a spot less its own steady trend over the walk, root
// mean square, the middle one of the spots'), beside the flow itself, for the water by the feet
// and for the water further off.
//
// A walk drawn with nothing bent or raised and a steady eye gives 0.2 to 0.4 degrees a second:
// that is the floor's own unevenness and what the measure cannot tell apart.
//
// Where wade.ts was given --truth, the walk also holds what the law of refraction would show
// through a flat, still sea at spots of some frames. Then the picture is held against it: how far
// what is drawn at a spot lies from what should be seen there, in degrees on the screen (the
// middle one of the spots', and the one that nine tenths are within). Draw such a walk with `no
// bending` on, or the ripples' bending is counted as error.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

// The window fitted round a spot is 13 dots square, and the spots are 16 dots apart.
const HALF_WINDOW = 6;
const SPOTS_APART = 16;
// A dot further than this from the plane through its window (in rounds of colour) is left out
// of the fit: beside a line where the colour goes round, a dot is a blend of both sides.
const OFF_THE_PLANE = 0.012;
const LEAST_SHARE_ON_THE_PLANE = 0.6;
// A point is followed by steps that home in on it: so many at most, to within so many dots, and
// never further in one step than this (a wrong turn).
const MOST_STEPS = 6;
const NEAR_ENOUGH = 0.03;
const FURTHEST_STEP = 80;
// A spot counts if its point could be followed through this share of the walk.
const LEAST_SHARE_FOLLOWED = 0.7;
// The screen's water in two bands, by how far down the screen: further off, and by the feet.
const BANDS = [
  { name: 'further off', from: 0.5, to: 0.8 },
  { name: 'by the feet', from: 0.8, to: 1.01 },
] as const;

interface Frame {
  width: number;
  height: number;
  red: Float32Array;
  green: Float32Array;
  isWater: Uint8Array;
}

/** A plane through one colour round a spot: its value at the spot and its slope a dot. */
interface Plane {
  value: number;
  across: number;
  down: number;
}

interface Walk {
  framesASecond: number;
  fieldOfView: number;
  /** For some frames, spots of the screen as fours: across, down, and the x and z truly seen there. */
  truths?: { frame: number; spots: number[] }[];
}

function readFrame(file: string): Frame {
  const picture = PNG.sync.read(readFileSync(file));
  const dots = picture.width * picture.height;
  const frame: Frame = {
    width: picture.width,
    height: picture.height,
    red: new Float32Array(dots),
    green: new Float32Array(dots),
    isWater: new Uint8Array(dots),
  };
  for (let dot = 0; dot < dots; dot++) {
    frame.red[dot] = picture.data[dot * 4] / 255;
    frame.green[dot] = picture.data[dot * 4 + 1] / 255;
    frame.isWater[dot] = picture.data[dot * 4 + 2] >= 250 ? 1 : 0;
  }
  return frame;
}

/** The nearest way round from one colour to another: a round of colour is a metre. */
function wrapped(difference: number): number {
  return difference - Math.round(difference);
}

/** Solves three equations in three unknowns, each row its coefficients and then its sum. */
function solved(rows: number[][]): [number, number, number] | null {
  for (let column = 0; column < 3; column++) {
    let pivot = column;
    for (let row = column + 1; row < 3; row++) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    }
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    if (Math.abs(rows[column][column]) < 1e-9) return null;

    for (let row = 0; row < 3; row++) {
      if (row === column) continue;

      const share = rows[row][column] / rows[column][column];
      for (let k = column; k < 4; k++) rows[row][k] -= share * rows[column][k];
    }
  }
  return [rows[0][3] / rows[0][0], rows[1][3] / rows[1][1], rows[2][3] / rows[2][2]];
}

/** The plane through one colour's values round a spot; null where they do not lie on one. */
function planeThrough(frame: Frame, colour: Float32Array, x: number, y: number): Plane | null {
  const middle = colour[y * frame.width + x];
  const side = 2 * HALF_WINDOW + 1;
  const values = new Float32Array(side * side);
  const isKept = new Uint8Array(side * side).fill(1);
  for (let down = -HALF_WINDOW; down <= HALF_WINDOW; down++) {
    for (let across = -HALF_WINDOW; across <= HALF_WINDOW; across++) {
      const dot = (y + down) * frame.width + x + across;
      if (frame.isWater[dot] === 0) return null;

      values[(down + HALF_WINDOW) * side + across + HALF_WINDOW] =
        middle + wrapped(colour[dot] - middle);
    }
  }

  // Fitted, then fitted again without the dots that lay off the plane.
  for (let pass = 0; pass < 3; pass++) {
    let n = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    let sv = 0;
    let sxv = 0;
    let syv = 0;
    for (let k = 0; k < values.length; k++) {
      if (isKept[k] === 0) continue;

      const across = (k % side) - HALF_WINDOW;
      const down = Math.floor(k / side) - HALF_WINDOW;
      const value = values[k];
      n++;
      sx += across;
      sy += down;
      sxx += across * across;
      syy += down * down;
      sxy += across * down;
      sv += value;
      sxv += across * value;
      syv += down * value;
    }
    if (n < values.length * LEAST_SHARE_ON_THE_PLANE) return null;

    const fitted = solved([
      [n, sx, sy, sv],
      [sx, sxx, sxy, sxv],
      [sy, sxy, syy, syv],
    ]);
    if (fitted === null) return null;

    const plane: Plane = { value: fitted[0], across: fitted[1], down: fitted[2] };
    let furthestKept = 0;
    for (let k = 0; k < values.length; k++) {
      const across = (k % side) - HALF_WINDOW;
      const down = Math.floor(k / side) - HALF_WINDOW;
      const off = Math.abs(values[k] - (plane.value + plane.across * across + plane.down * down));
      if (isKept[k] === 1) furthestKept = Math.max(furthestKept, off);
      isKept[k] = off < OFF_THE_PLANE ? 1 : 0;
    }
    if (furthestKept < OFF_THE_PLANE) return plane;
  }
  return null;
}

function placeSeenAt(frame: Frame, x: number, y: number): { x: Plane; z: Plane } | null {
  const isInside =
    x >= HALF_WINDOW &&
    y >= HALF_WINDOW &&
    x < frame.width - HALF_WINDOW &&
    y < frame.height - HALF_WINDOW;
  if (!isInside) return null;

  const placeX = planeThrough(frame, frame.red, x, y);
  if (placeX === null) return null;

  const placeZ = planeThrough(frame, frame.green, x, y);
  return placeZ === null ? null : { x: placeX, z: placeZ };
}

/**
 * How far the point of the floor seen at a spot in one frame has moved on the screen by the
 * next, in dots; null where it cannot be followed.
 */
function flowAt(from: Frame, to: Frame, x: number, y: number): [number, number] | null {
  const here = placeSeenAt(from, x, y);
  if (here === null) return null;

  let seenX = x;
  let seenY = y;
  for (let step = 0; step < MOST_STEPS; step++) {
    const nearX = Math.round(seenX);
    const nearY = Math.round(seenY);
    const there = placeSeenAt(to, nearX, nearY);
    if (there === null) return null;

    const valueThere = (plane: Plane) =>
      plane.value + plane.across * (seenX - nearX) + plane.down * (seenY - nearY);
    const shortX = wrapped(here.x.value - valueThere(there.x));
    const shortZ = wrapped(here.z.value - valueThere(there.z));
    const determinant = there.x.across * there.z.down - there.x.down * there.z.across;
    if (Math.abs(determinant) < 1e-9) return null;

    const stepX = (shortX * there.z.down - there.x.down * shortZ) / determinant;
    const stepY = (there.x.across * shortZ - shortX * there.z.across) / determinant;
    const stepped = Math.hypot(stepX, stepY);
    if (!(stepped < FURTHEST_STEP)) return null;

    seenX += stepX;
    seenY += stepY;
    if (stepped < NEAR_ENOUGH) return [seenX - x, seenY - y];
  }
  return null;
}

/** A series of values at their times, with its mean and what is left once its trend is taken off. */
function lessItsTrend(times: number[], values: number[]): { mean: number; left: number[] } {
  const count = values.length;
  const meanTime = times.reduce((sum, time) => sum + time, 0) / count;
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const spread = times.reduce((sum, time) => sum + (time - meanTime) ** 2, 0);
  const slope =
    times.reduce((sum, time, k) => sum + (time - meanTime) * (values[k] - mean), 0) / spread;
  return { mean, left: values.map((value, k) => value - mean - slope * (times[k] - meanTime)) };
}

/** The value that a share of the values are no greater than: a half gives the middle one. */
function atShare(values: number[], share: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length === 0 ? Number.NaN : sorted[Math.floor((sorted.length - 1) * share)];
}

function middleOne(values: number[]): number {
  return atShare(values, 0.5);
}

/**
 * How far what is drawn at each spot lies from what refraction would show there, in dots of the
 * screen, band by band.
 */
function errorsAgainstTruth(walk: Walk, frames: Frame[]): number[][] {
  const errors: number[][] = BANDS.map(() => []);
  for (const truth of walk.truths ?? []) {
    const frame = frames[truth.frame];
    for (let k = 0; k + 3 < truth.spots.length; k += 4) {
      const [across, down, x, z] = truth.spots.slice(k, k + 4);
      const band = BANDS.findIndex(
        (each) => down >= each.from * frame.height && down < each.to * frame.height,
      );
      const seen = band < 0 ? null : placeSeenAt(frame, across, down);
      if (seen === null) continue;

      const offX = wrapped(seen.x.value - x);
      const offZ = wrapped(seen.z.value - z);
      const determinant = seen.x.across * seen.z.down - seen.x.down * seen.z.across;
      if (Math.abs(determinant) < 1e-9) continue;

      const offAcross = (offX * seen.z.down - seen.x.down * offZ) / determinant;
      const offDown = (seen.x.across * offZ - offX * seen.z.across) / determinant;
      errors[band].push(Math.hypot(offAcross, offDown));
    }
  }
  return errors;
}

function describeWalk(folder: string): string {
  const walk = JSON.parse(readFileSync(path.join(folder, 'walk.json'), 'utf8')) as Walk;
  const frames = readdirSync(folder)
    .filter((name) => /^frame-\d+\.png$/.test(name))
    .sort()
    .map((name) => readFrame(path.join(folder, name)));
  const { width, height } = frames[0];
  const degreesASecond = (walk.fieldOfView / height) * walk.framesASecond;

  const bands = BANDS.map((band) => ({ ...band, wobbles: [] as number[], flows: [] as number[] }));
  for (let y = HALF_WINDOW + 2; y < height - HALF_WINDOW - 2; y += SPOTS_APART) {
    const band = bands.find((each) => y >= each.from * height && y < each.to * height);
    if (band === undefined) continue;

    for (let x = HALF_WINDOW + 2; x < width - HALF_WINDOW - 2; x += SPOTS_APART) {
      const times: number[] = [];
      const across: number[] = [];
      const down: number[] = [];
      for (let time = 0; time + 1 < frames.length; time++) {
        const flow = flowAt(frames[time], frames[time + 1], x, y);
        if (flow === null) continue;

        times.push(time);
        across.push(flow[0]);
        down.push(flow[1]);
      }
      if (times.length < (frames.length - 1) * LEAST_SHARE_FOLLOWED) continue;

      const acrossLeft = lessItsTrend(times, across);
      const downLeft = lessItsTrend(times, down);
      const squares = acrossLeft.left.reduce(
        (sum, value, k) => sum + value * value + downLeft.left[k] ** 2,
        0,
      );
      band.wobbles.push(Math.sqrt(squares / times.length) * degreesASecond);
      band.flows.push(Math.hypot(acrossLeft.mean, downLeft.mean) * degreesASecond);
    }
  }
  const parts = bands.map(
    (band) =>
      `${band.name}: wobble ${middleOne(band.wobbles).toFixed(1)} on a flow of ` +
      `${middleOne(band.flows).toFixed(0)} deg/s (${band.wobbles.length} spots)`,
  );
  const lines = [`${path.basename(folder).padEnd(30)} ${parts.join(' | ')}`];
  if (walk.truths !== undefined && walk.truths.length > 0) {
    const degrees = walk.fieldOfView / height;
    const against = errorsAgainstTruth(walk, frames).map(
      (errors, band) =>
        `${BANDS[band].name}: ${(middleOne(errors) * degrees).toFixed(2)} deg off, nine tenths within ` +
        `${(atShare(errors, 0.9) * degrees).toFixed(2)} (${errors.length} spots)`,
    );
    lines.push(`${''.padEnd(30)} against the law of refraction: ${against.join(' | ')}`);
  }
  return lines.join('\n');
}

const folders = process.argv.slice(2);
if (folders.length === 0) throw new Error("name a folder of a walk's frames");
for (const folder of folders) console.log(describeWalk(folder));
