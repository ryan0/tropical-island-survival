import { FULL_TURN } from '../../core/maths';
import { within, type Random, type Range } from '../../core/random';
import { seaBedConfig, type Octaves } from './sea-bed-config';

// The tools the sea floor's painters share. Every field is a Float32Array of one number a dot, row
// after row, and every tool goes round the picture's edges, so that what it paints wraps.

export const SIZE = seaBedConfig.size;
export const MASK = SIZE - 1;
export const DOTS = SIZE * SIZE;
export const DOTS_PER_METRE = SIZE / seaBedConfig.span;

/** A place on the picture, in dots. */
export interface Place {
  x: number;
  y: number;
}

/** Calls `paint` for every dot within `reach` dots of a place, going round the edges, with its offset from the place. */
export function forDotsNear(
  { x, y }: Place,
  reach: number,
  paint: (dot: number, dx: number, dy: number) => void,
): void {
  const left = Math.floor(x - reach);
  const right = Math.ceil(x + reach);
  const top = Math.floor(y - reach);
  const bottom = Math.ceil(y + reach);
  for (let row = top; row <= bottom; row++) {
    const rowStart = (row & MASK) * SIZE;
    const dy = row + 0.5 - y;
    for (let column = left; column <= right; column++) {
      paint(rowStart + (column & MASK), column + 0.5 - x, dy);
    }
  }
}

export function randomPlace(random: Random): Place {
  return { x: random() * SIZE, y: random() * SIZE };
}

/** A place within `distance` dots of another, in any direction. */
export function placeNear(random: Random, { x, y }: Place, distance: number): Place {
  const direction = random() * FULL_TURN;
  const reach = distance * Math.sqrt(random());
  return { x: x + reach * Math.cos(direction), y: y + reach * Math.sin(direction) };
}

/** A length in metres, drawn from a range, as dots. */
export function dotsWithin(random: Random, range: Range): number {
  return within(random, range) * DOTS_PER_METRE;
}

/** A size drawn from a range so that small ones are common and big ones rare: the higher `bias`, the more so. */
export function mostlySmall(random: Random, [smallest, largest]: Range, bias: number): number {
  return smallest * (largest / smallest) ** (random() ** bias);
}

/**
 * Adds smooth noise that wraps to a field: random values either way up to `amplitude`, every
 * `cellDots` dots (a power of two), blended between. Each layer's grid is shifted at random so that
 * the grids of several layers do not line up.
 */
export function addSmoothNoise(
  random: Random,
  field: Float32Array,
  cellDots: number,
  amplitude: number,
): void {
  const cells = SIZE / cellDots;
  const corners = new Float32Array(cells * cells);
  for (let i = 0; i < corners.length; i++) corners[i] = amplitude * (2 * random() - 1);
  const blend = new Float32Array(cellDots);
  for (let step = 0; step < cellDots; step++) {
    const share = step / cellDots;
    blend[step] = share * share * (3 - 2 * share);
  }
  const shift = Math.log2(cellDots);
  const withinCell = cellDots - 1;
  const wrapCells = cells - 1;
  const shiftAcross = Math.floor(random() * SIZE);
  const shiftDown = Math.floor(random() * SIZE);
  const leftCell = new Int32Array(SIZE);
  const acrossCell = new Float32Array(SIZE);
  for (let column = 0; column < SIZE; column++) {
    const shiftedColumn = (column + shiftAcross) & MASK;
    leftCell[column] = shiftedColumn >> shift;
    acrossCell[column] = blend[shiftedColumn & withinCell];
  }

  // Each row's corners are blended down first, so that a dot only blends across.
  const rowCorners = new Float32Array(cells + 1);
  for (let row = 0; row < SIZE; row++) {
    const shiftedRow = (row + shiftDown) & MASK;
    const above = shiftedRow >> shift;
    const aboveStart = above * cells;
    const belowStart = ((above + 1) & wrapCells) * cells;
    const down = blend[shiftedRow & withinCell];
    for (let cell = 0; cell < cells; cell++) {
      const upper = corners[aboveStart + cell];
      rowCorners[cell] = upper + (corners[belowStart + cell] - upper) * down;
    }
    rowCorners[cells] = rowCorners[0];
    const rowStart = row * SIZE;
    for (let column = 0; column < SIZE; column++) {
      const left = rowCorners[leftCell[column]];
      field[rowStart + column] +=
        left + (rowCorners[leftCell[column] + 1] - left) * acrossCell[column];
    }
  }
}

/** Adds noise of several octaves, from cells `broadest` metres across down to `finest`. */
export function addOctaves(random: Random, field: Float32Array, octaves: Octaves): void {
  const broadestDots = 2 ** Math.round(Math.log2(octaves.broadest * DOTS_PER_METRE));
  const finestDots = Math.max(1, octaves.finest * DOTS_PER_METRE);
  let amplitude = octaves.amplitude;
  for (let cellDots = broadestDots; cellDots >= finestDots; cellDots /= 2) {
    addSmoothNoise(random, field, cellDots, amplitude);
    amplitude *= octaves.falloff;
  }
}

export function octaveField(random: Random, octaves: Octaves): Float32Array {
  const field = new Float32Array(DOTS);
  addOctaves(random, field, octaves);
  return field;
}

/** The field averaged over a square `2 radius + 1` dots a side about each dot. */
export function blurred(field: Float32Array, radius: number): Float32Array {
  const share = 1 / (2 * radius + 1);
  const across = new Float32Array(DOTS);
  for (let row = 0; row < SIZE; row++) {
    const start = row * SIZE;
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += field[start + (k & MASK)];
    for (let column = 0; column < SIZE; column++) {
      across[start + column] = sum * share;
      sum +=
        field[start + ((column + radius + 1) & MASK)] - field[start + ((column - radius) & MASK)];
    }
  }

  // Down the columns a row at a time, keeping every column's sum, so that memory is read in order.
  const result = new Float32Array(DOTS);
  const sums = new Float32Array(SIZE);
  for (let k = -radius; k <= radius; k++) {
    const start = (k & MASK) * SIZE;
    for (let column = 0; column < SIZE; column++) sums[column] += across[start + column];
  }
  for (let row = 0; row < SIZE; row++) {
    const start = row * SIZE;
    const entering = ((row + radius + 1) & MASK) * SIZE;
    const leaving = ((row - radius) & MASK) * SIZE;
    for (let column = 0; column < SIZE; column++) {
      result[start + column] = sums[column] * share;
      sums[column] += across[entering + column] - across[leaving + column];
    }
  }
  return result;
}

/** The field moved round the picture by a number of dots each way, as an independent-looking copy of it. */
export function shifted(field: Float32Array, across: number, down: number): Float32Array {
  const copy = new Float32Array(DOTS);
  for (let row = 0; row < SIZE; row++) {
    const from = ((row + down) & MASK) * SIZE;
    const to = row * SIZE;
    for (let column = 0; column < SIZE; column++) {
      copy[to + column] = field[from + ((column + across) & MASK)];
    }
  }
  return copy;
}

/**
 * Each dot's rank among all the dots, 0 to 1: a level t leaves the share 1 - t of them above it.
 * Found by sorting the values into many narrow bins.
 */
export function ranked(field: Float32Array): Float32Array {
  let lowest = Infinity;
  let highest = -Infinity;
  for (const value of field) {
    if (value < lowest) lowest = value;
    if (value > highest) highest = value;
  }
  const bins = 1 << 16;
  const scale = (bins - 1) / Math.max(1e-9, highest - lowest);
  const binOf = new Uint16Array(DOTS);
  const counts = new Uint32Array(bins);
  for (let dot = 0; dot < DOTS; dot++) {
    const bin = ((field[dot] - lowest) * scale) | 0;
    binOf[dot] = bin;
    counts[bin]++;
  }
  const rankOfBin = new Float32Array(bins);
  for (let bin = 0, below = 0; bin < bins; bin++) {
    rankOfBin[bin] = (below + 0.5 * counts[bin]) / DOTS;
    below += counts[bin];
  }
  const ranks = new Float32Array(DOTS);
  for (let dot = 0; dot < DOTS; dot++) ranks[dot] = rankOfBin[binOf[dot]];
  return ranks;
}

/**
 * A wandering line, as places `step` dots apart. It turns by up to `turning` radians a metre either
 * way, and how fast it turns changes slowly, so that it curves rather than jitters.
 */
export function wanderingLine(
  random: Random,
  start: Place,
  heading: number,
  lengthDots: number,
  step: number,
  turning: number,
): Place[] {
  const places: Place[] = [start];
  const fastestTurn = (turning / DOTS_PER_METRE) * step;
  let { x, y } = start;
  let turn = fastestTurn * (2 * random() - 1);
  for (let travelled = 0; travelled < lengthDots; travelled += step) {
    turn += 0.25 * fastestTurn * (2 * random() - 1);
    turn = Math.max(-fastestTurn, Math.min(fastestTurn, turn));
    heading += turn;
    x += step * Math.cos(heading);
    y += step * Math.sin(heading);
    places.push({ x, y });
  }
  return places;
}

/**
 * Room for painting along lines: each dot's distance to the nearest place of a line, Infinity
 * where none is near, and which place that is. Left as it was found, so that one serves every line.
 */
export interface LineRoom {
  distances: Float32Array;
  nearest: Int32Array;
}

export function roomForLines(): LineRoom {
  return { distances: new Float32Array(DOTS).fill(Infinity), nearest: new Int32Array(DOTS) };
}

/**
 * Calls `paint` once for every dot within `reach` dots of a line of places, with its distance in dots
 * to the nearest of them and which of them that is.
 */
export function paintAlongLine(
  { distances, nearest }: LineRoom,
  line: readonly Place[],
  reach: number,
  paint: (dot: number, distance: number, place: number) => void,
): void {
  line.forEach((place, index) => {
    forDotsNear(place, reach, (dot, dx, dy) => {
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance >= distances[dot]) return;

      distances[dot] = distance;
      nearest[dot] = index;
    });
  });
  for (const place of line) {
    forDotsNear(place, reach, (dot) => {
      const distance = distances[dot];
      if (distance === Infinity) return;

      distances[dot] = Infinity;
      if (distance < reach) paint(dot, distance, nearest[dot]);
    });
  }
}
