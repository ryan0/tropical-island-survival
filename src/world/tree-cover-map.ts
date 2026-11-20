import { DataTexture, LinearFilter, RGBAFormat } from 'three';
import { smoothstep } from '../core/maths';
import { worldConfig } from './world-config';

// A map of what stands over the ground, for the ground's colouring: under a palm's crown lie its
// dead fronds and husks, under a tree its leaves, and creepers run out over the sand from the foot
// of a shrub. Without it the litter lay where a pattern of noise put it, which was nowhere in
// particular. It is drawn once, from where the palms and the plants were put.

const { span, size } = worldConfig.treeCoverMap;

/** What kind of plant a crown is: each drops its litter differently. */
export type CrownKind = 'palm' | 'tree' | 'shrub';

/** The crown of one plant, seen from above. */
export interface Crown {
  x: number;
  z: number;
  /** How far it reaches from its middle, in metres. */
  reach: number;
  kind: CrownKind;
}

/**
 * How each kind marks the ground, by how many of its reaches out a spot lies. Litter is all there
 * within the first and gone by the second; plants at its foot likewise.
 */
const marks: Record<
  CrownKind,
  {
    litter: readonly [number, number];
    plantsAtFoot: readonly [number, number] | null;
    litterMost: number;
  }
> = {
  // A palm drops whole fronds and nuts, which lie out to where its crown reaches.
  palm: { litter: [0.35, 1.25], plantsAtFoot: null, litterMost: 1 },
  tree: { litter: [0.6, 1.2], plantsAtFoot: null, litterMost: 0.9 },
  // Little lies under a shrub that can be seen; creepers and seedlings gather round its foot.
  shrub: { litter: [0.5, 1.1], plantsAtFoot: [1.0, 2.4], litterMost: 0.5 },
};

/** Dots are drawn for a crown this many reaches out, beyond the reach of any mark. */
const DRAWN_WITHIN = 2.5;
/** Blue, how deep the shade is, is full where this many crowns stand over a spot. */
const CROWNS_FOR_DEEP_SHADE = 3;

/** Where a distance from the atoll's centre falls on the map, in dots from its edge. */
function dotsAcross(fromCentre: number): number {
  return (fromCentre / span) * size + size / 2;
}

function drawCrown(pixels: Uint8Array, crown: Crown): void {
  const mark = marks[crown.kind];
  const middleColumn = dotsAcross(crown.x);
  const middleRow = dotsAcross(crown.z);
  const reach = ((crown.reach * DRAWN_WITHIN) / span) * size;
  const firstRow = Math.max(0, Math.floor(middleRow - reach));
  const lastRow = Math.min(size - 1, Math.ceil(middleRow + reach));
  const firstColumn = Math.max(0, Math.floor(middleColumn - reach));
  const lastColumn = Math.min(size - 1, Math.ceil(middleColumn + reach));

  for (let row = firstRow; row <= lastRow; row++) {
    for (let column = firstColumn; column <= lastColumn; column++) {
      const metresAcross = ((column + 0.5 - middleColumn) / size) * span;
      const metresDown = ((row + 0.5 - middleRow) / size) * span;
      const reachesOut = Math.hypot(metresAcross, metresDown) / crown.reach;
      const red = (row * size + column) * 4;
      const litter = mark.litterMost * (1 - smoothstep(mark.litter[0], mark.litter[1], reachesOut));
      pixels[red] = Math.max(pixels[red], Math.round(255 * litter));
      if (mark.plantsAtFoot !== null) {
        const atFoot = 1 - smoothstep(mark.plantsAtFoot[0], mark.plantsAtFoot[1], reachesOut);
        pixels[red + 1] = Math.max(pixels[red + 1], Math.round(255 * atFoot));
      }
      const shade = 1 - smoothstep(0.7, 1.1, reachesOut);
      pixels[red + 2] = Math.min(
        255,
        pixels[red + 2] + Math.round((255 * shade) / CROWNS_FOR_DEEP_SHADE),
      );
    }
  }
}

/** The side of a square of the grid `crownsOver` keeps, in metres. */
const GRID_SQUARE = 1;

/**
 * Whether a point lies under any of the crowns, for the program (what falls from a palm lies
 * under it): a grid over the same square as the map, quick to ask of many thousands of points.
 */
export function crownsOver(crowns: readonly Crown[]): (x: number, z: number) => boolean {
  const squares = Math.ceil(span / GRID_SQUARE);
  const isUnder = new Uint8Array(squares * squares);
  const squareOf = (fromCentre: number) => Math.floor((fromCentre + span / 2) / GRID_SQUARE);
  for (const crown of crowns) {
    const firstRow = Math.max(0, squareOf(crown.z - crown.reach));
    const lastRow = Math.min(squares - 1, squareOf(crown.z + crown.reach));
    const firstColumn = Math.max(0, squareOf(crown.x - crown.reach));
    const lastColumn = Math.min(squares - 1, squareOf(crown.x + crown.reach));
    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        const x = (column + 0.5) * GRID_SQUARE - span / 2;
        const z = (row + 0.5) * GRID_SQUARE - span / 2;
        if (Math.hypot(x - crown.x, z - crown.z) <= crown.reach)
          isUnder[row * squares + column] = 1;
      }
    }
  }
  return (x, z) => {
    const row = squareOf(z);
    const column = squareOf(x);
    if (row < 0 || row >= squares || column < 0 || column >= squares) return false;
    return isUnder[row * squares + column] === 1;
  };
}

/**
 * The map, `span` metres square about the atoll's centre. Red: how much litter lies here, under
 * a crown. Green: how near the foot of a shrub this is, where creepers gather. Blue: how deep the
 * shade is, by how many crowns stand over the spot. Smoothly filtered and without mipmaps, so
 * that it may be read inside a branch (docs/DEVICE_NOTES.md).
 */
export function createTreeCoverMap(crowns: readonly Crown[]): DataTexture {
  const pixels = new Uint8Array(size * size * 4);
  for (const crown of crowns) drawCrown(pixels, crown);
  const map = new DataTexture(pixels, size, size, RGBAFormat);
  map.magFilter = LinearFilter;
  map.minFilter = LinearFilter;
  map.needsUpdate = true;
  return map;
}
