import { DataTexture, LinearFilter, RGBAFormat } from 'three';
import { clamp, smoothstep } from '../../core/maths';
import type { Point } from '../landmarks';
import { reefConfig } from './reef-config';
import { bottomOfHead, HEAD_ROCK_HEIGHT, type CoralHead } from './reef-layout';

// A map of how high the coral heads stand, over a square about home, for the shaders. Over a head
// the water is shallow, so it must be drawn as clear as shallow water, not as the deep water round
// it; and the sand round a head's foot is painted with reef rock and rubble.

const { mapSize, mapSpan } = reefConfig;

/**
 * The map is read with its edges clamped, so whatever is in its outermost dots would be repeated
 * out to the horizon. They stay empty.
 */
const EMPTY_EDGE = 2;
/** Red is the height of a head's top, from this far down (0) to the surface (1). */
const RED_FROM_DEPTH = 8;
/** The rock reaches this many radii out from a head's middle. */
const ROCK_REACH = 1.08;
/** Green is 1 under a head and at its foot, falling to 0 between these many radii out. */
const GREEN_FADE = { from: 1.3, to: 3.3 };
/** Dots are drawn for a head this many radii out, beyond the reach of either colour. */
const DRAWN_WITHIN = 3.4;

/** Red: how high the top of the rock, and the corals on it, stand over the dot. */
function topOverDot(head: CoralHead, radiiOut: number): number {
  if (radiiOut >= ROCK_REACH) return 0;
  const profile = Math.pow(Math.max(0, 1 - Math.pow(radiiOut / ROCK_REACH, 3.5)), 0.5);
  const top = bottomOfHead(head) + HEAD_ROCK_HEIGHT * head.height * profile + 0.15;
  return Math.round(255 * clamp((top + RED_FROM_DEPTH) / RED_FROM_DEPTH, 0, 1));
}

/** Green: how near the head is. */
function nearness(radiiOut: number): number {
  return Math.round(255 * (1 - smoothstep(GREEN_FADE.from, GREEN_FADE.to, radiiOut)));
}

/** Where a distance from home falls on the map, in dots from its edge. */
function dotsAcross(fromHome: number): number {
  return (fromHome / mapSpan) * mapSize + mapSize / 2;
}

/** Writes a head over what is there, keeping the higher top and the nearer head of the two. */
function drawHead(pixels: Uint8Array, head: CoralHead, home: Point): void {
  const middleColumn = dotsAcross(head.x - home.x);
  const middleRow = dotsAcross(head.z - home.z);
  const reach = ((head.radius * DRAWN_WITHIN) / mapSpan) * mapSize;
  const last = mapSize - 1 - EMPTY_EDGE;
  const firstRow = Math.max(EMPTY_EDGE, Math.floor(middleRow - reach));
  const lastRow = Math.min(last, Math.ceil(middleRow + reach));
  const firstColumn = Math.max(EMPTY_EDGE, Math.floor(middleColumn - reach));
  const lastColumn = Math.min(last, Math.ceil(middleColumn + reach));

  for (let row = firstRow; row <= lastRow; row++) {
    for (let column = firstColumn; column <= lastColumn; column++) {
      const metresAcross = ((column + 0.5 - middleColumn) / mapSize) * mapSpan;
      const metresDown = ((row + 0.5 - middleRow) / mapSize) * mapSpan;
      const radiiOut = Math.hypot(metresAcross, metresDown) / head.radius;
      const red = (row * mapSize + column) * 4;
      pixels[red] = Math.max(pixels[red], topOverDot(head, radiiOut));
      pixels[red + 1] = Math.max(pixels[red + 1], nearness(radiiOut));
    }
  }
}

/**
 * A map of how high the coral heads stand, `mapSpan` metres square about home: red is the height
 * of a head's top, green how near a head is.
 */
export function createReefMap(heads: readonly CoralHead[], home: Point): DataTexture {
  const pixels = new Uint8Array(mapSize * mapSize * 4);
  for (const head of heads) drawHead(pixels, head, home);
  const map = new DataTexture(pixels, mapSize, mapSize, RGBAFormat);
  map.magFilter = LinearFilter;
  map.minFilter = LinearFilter;
  map.needsUpdate = true;
  return map;
}
