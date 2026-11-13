import { within, type Random, type Range } from '../core/random';

export interface Point {
  x: number;
  z: number;
}

/** Height of the ground at a point; below zero it is under the sea. */
export type GroundHeight = (x: number, z: number) => number;

export interface Area {
  x: Range;
  z: Range;
}

export interface Place extends Point {
  height: number;
}

// Build 78 wrote a full turn as 6.28. A truer one would turn everything placed with it a hair.
export const ANY_DIRECTION: Range = [0, 6.28];

export function squareAround(centre: Point, reach: number): Area {
  return { x: [centre.x - reach, centre.x + reach], z: [centre.z - reach, centre.z + reach] };
}

/** Tries points at random in the area until one suits; null when none of `tries` does. */
export function findPlace(
  random: Random,
  groundHeight: GroundHeight,
  area: Area,
  tries: number,
  suits: (height: number, x: number, z: number) => boolean,
): Place | null {
  for (let i = 0; i < tries; i++) {
    const x = within(random, area.x);
    const z = within(random, area.z);
    const height = groundHeight(x, z);
    if (suits(height, x, z)) return { x, z, height };
  }
  return null;
}

/** As `findPlace`, for something the scene cannot do without. */
export function mustFindPlace(what: string, ...search: Parameters<typeof findPlace>): Place {
  const place = findPlace(...search);
  if (place === null) throw new Error(`nowhere found for ${what}`);
  return place;
}
