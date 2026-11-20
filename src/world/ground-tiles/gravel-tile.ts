import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  RGBAFormat,
} from 'three';
import type { Random } from '../../core/random';
import { layGravel, type Piece } from './gravel-laying';
import { gravelTileConfig } from './gravel-tile-config';
import type { GroundTile } from './ground-tile';

const { dotsEachWay: SIZE, span: SPAN, contactShadow } = gravelTileConfig;
const WRAP = SIZE - 1;
const DOTS = SIZE * SIZE;

// The picture as it is painted: red, green, blue and rank, four numbers to a dot, side by side
// so that painting a dot reads and writes one place in memory, not four.
const RED = 0;
const GREEN = 1;
const BLUE = 2;
const RANK = 3;
// Noise read by every piece and by the bed between, made once for the whole picture and laid
// out in the same way: a different number 0 to 1 at every dot; smooth noise -1 to 1 over a
// couple of dots; and smooth noise -1 to 1 over a couple of centimetres.
const SPECKLE = 0;
const FINE = 1;
const BLOTCHES = 2;
const NUMBERS_TO_A_DOT = 4;

/** Room for the numbers painting works out for one row at a time, made once for every piece. */
interface Scratch {
  span: Float64Array;
  rowDistances: Float64Array;
}

/**
 * Writes smooth noise -1 to 1 that wraps at the picture's edges into one place of every dot:
 * random values every `cellDots` dots (a power of two), blended between.
 */
function writeWrappingNoise(
  random: Random,
  cellDots: number,
  surface: Float32Array,
  place: number,
): void {
  const cells = SIZE / cellDots;
  const corners = new Float32Array(cells * cells);
  for (let i = 0; i < corners.length; i++) corners[i] = 2 * random() - 1;
  const blend = new Float32Array(cellDots);
  for (let step = 0; step < cellDots; step++) {
    const share = step / cellDots;
    blend[step] = share * share * (3 - 2 * share);
  }
  const shift = Math.log2(cellDots);
  const withinCell = cellDots - 1;
  const wrapCells = cells - 1;

  for (let row = 0; row < SIZE; row++) {
    const above = row >> shift;
    const aboveStart = above * cells;
    const belowStart = ((above + 1) & wrapCells) * cells;
    const down = blend[row & withinCell];
    for (let column = 0; column < SIZE; column++) {
      const left = column >> shift;
      const right = (left + 1) & wrapCells;
      const across = blend[column & withinCell];
      const top = corners[aboveStart + left] * (1 - across) + corners[aboveStart + right] * across;
      const bottom =
        corners[belowStart + left] * (1 - across) + corners[belowStart + right] * across;
      surface[(row * SIZE + column) * NUMBERS_TO_A_DOT + place] = top + (bottom - top) * down;
    }
  }
}

function createSurface(random: Random): Float32Array {
  const surface = new Float32Array(DOTS * NUMBERS_TO_A_DOT);
  // A million numbers, one for each dot: drawn by a quick shift-and-mix generator seeded from
  // the stream, since the stream's own would take several times as long at start-up.
  let state = Math.floor(random() * 0xffffffff) | 1;
  for (let at = SPECKLE; at < surface.length; at += NUMBERS_TO_A_DOT) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    surface[at] = (state >>> 0) / 0x100000000;
  }
  writeWrappingNoise(random, 2, surface, FINE);
  writeWrappingNoise(random, 8, surface, BLOTCHES);
  return surface;
}

function paintTheBedBetween(bed: Float32Array, surface: Float32Array): void {
  const { colour, grain, fineGravel, patches } = gravelTileConfig.matrix;
  for (let at = 0; at < bed.length; at += NUMBERS_TO_A_DOT) {
    const tone =
      1 +
      grain * (2 * surface[at + SPECKLE] - 1) +
      fineGravel * surface[at + FINE] +
      patches * surface[at + BLOTCHES];
    bed[at + RED] = colour[0] * tone;
    bed[at + GREEN] = colour[1] * tone;
    bed[at + BLUE] = colour[2] * tone;
  }
}

/**
 * Lays one piece on the bed: its top lighter than its sides, relief, holes and blotches on its
 * face, and a contact shadow on whatever lies under its edge, fading over its rim. Its rank
 * covers the rim too, so that a stone shown alone on sand keeps a thin dark line where it
 * touches the ground.
 */
function paintPiece(
  bed: Float32Array,
  surface: Float32Array,
  piece: Piece,
  scratch: Scratch,
): void {
  const { x: middleX, y: middleY, outline, look, rank } = piece;
  const [ownRed, ownGreen, ownBlue] = piece.colour;
  const { thickness } = outline;
  const { span, rowDistances } = scratch;
  const { ragged, wander, sideShade, relief, mottle, holes, holeShade } = look;
  const [narrowestRim, widestRim] = contactShadow.rimWidth;
  const rim = Math.min(
    widestRim,
    Math.max(narrowestRim, contactShadow.rimPerThickness * thickness),
  );
  const shadowAtTheEdge = contactShadow.atTheEdge;
  const perRim = 1 / rim;
  const perRankEdge = 1 / Math.min(gravelTileConfig.alphaEdgeDots, rim + 0.5);
  const perThickness = 1 / thickness;
  const edgeWanders = ragged + wander;
  const extent = outline.reach + rim + edgeWanders;
  const top = Math.floor(middleY - extent);
  const bottom = Math.ceil(middleY + extent);

  for (let row = top; row <= bottom; row++) {
    const y = row + 0.5 - middleY;
    outline.rowSpan(y, rim + edgeWanders, span);
    // The dots whose middles, half a dot in from their left edges, lie within the span.
    const first = Math.ceil(middleX + Math.max(-extent, span[0]) - 0.5);
    const last = Math.floor(middleX + Math.min(extent, span[1]) - 0.5);
    if (last < first) continue;

    outline.distancesAlongRow(y, first + 0.5 - middleX, last - first + 1, rowDistances);
    const rowStart = (row & WRAP) * SIZE;
    for (let column = first; column <= last; column++) {
      const cleanDistance = rowDistances[column - first];
      if (cleanDistance - edgeWanders >= rim) continue;

      const at = (rowStart + (column & WRAP)) * NUMBERS_TO_A_DOT;
      const fine = surface[at + FINE];
      const blotches = surface[at + BLOTCHES];
      const distance = cleanDistance + ragged * fine + wander * blotches;
      if (distance >= rim) continue;

      const rankCover = Math.min(1, (rim - distance) * perRankEdge);
      bed[at + RANK] += (rank - bed[at + RANK]) * rankCover;
      const outsideShare = Math.max(0, distance) * perRim;
      const shadowUnder = 1 - shadowAtTheEdge * (1 - outsideShare) * (1 - outsideShare);
      if (distance >= 0.5) {
        bed[at + RED] *= shadowUnder;
        bed[at + GREEN] *= shadowUnder;
        bed[at + BLUE] *= shadowUnder;
        continue;
      }

      const cover = Math.min(1, 0.5 - distance);
      const depth = Math.min(1, Math.max(0, -distance) * perThickness);
      const rounded = 1 - (1 - depth) * (1 - depth);
      let tone = sideShade + (1 - sideShade) * rounded;
      tone *= (1 + relief * fine) * (1 + mottle * blotches);
      if (surface[at + SPECKLE] < holes) tone *= holeShade;
      const under = shadowUnder * (1 - cover);
      const tint = tone * cover;
      bed[at + RED] = bed[at + RED] * under + ownRed * tint;
      bed[at + GREEN] = bed[at + GREEN] * under + ownGreen * tint;
      bed[at + BLUE] = bed[at + BLUE] * under + ownBlue * tint;
    }
  }
}

/** The bed as bytes, red, green, blue and rank; and the average colour where the rank is above nothing. */
function bytesOf(bed: Float32Array): {
  bytes: Uint8Array<ArrayBuffer>;
  averageColour: [number, number, number];
} {
  const bytes = new Uint8Array(bed.length);
  // Clamped, so that each value is rounded and kept within 0 to 255 as it is written.
  const clamped = new Uint8ClampedArray(bytes.buffer);
  const brightest = gravelTileConfig.brightest * 255;
  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  let ranked = 0;
  for (let at = 0; at < bed.length; at += NUMBERS_TO_A_DOT) {
    clamped[at + RED] = Math.min(brightest, bed[at + RED] * 255);
    clamped[at + GREEN] = Math.min(brightest, bed[at + GREEN] * 255);
    clamped[at + BLUE] = Math.min(brightest, bed[at + BLUE] * 255);
    clamped[at + RANK] = bed[at + RANK] * 255;
    if (bytes[at + RANK] === 0) continue;

    redSum += bytes[at + RED];
    greenSum += bytes[at + GREEN];
    blueSum += bytes[at + BLUE];
    ranked++;
  }
  const scale = 1 / Math.max(1, ranked) / 255;
  return { bytes, averageColour: [redSum * scale, greenSum * scale, blueSum * scale] };
}

/**
 * Coral gravel and rubble seen from straight above, as it lies under the palms and at the back
 * of a beach: broken fingers of branching coral, lumps, plates, shells and pebbles over fine
 * gravel and coarse sand. Red, green and blue are the whole bed; alpha is each stone's rank, 0
 * in the bed between them, so that a shader can show only the bigger stones over its own sand.
 * It is a DataTexture, not a canvas: a canvas keeps colour multiplied by alpha, and would lose
 * the bed's colour wherever the rank is 0.
 */
export function createGravelTile(random: Random): GroundTile {
  const surface = createSurface(random);
  const bed = new Float32Array(DOTS * NUMBERS_TO_A_DOT);
  paintTheBedBetween(bed, surface);
  const scratch: Scratch = { span: new Float64Array(2), rowDistances: new Float64Array(SIZE) };
  for (const piece of layGravel(random)) paintPiece(bed, surface, piece, scratch);

  const { bytes, averageColour } = bytesOf(bed);
  const texture = new DataTexture(bytes, SIZE, SIZE, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return { texture, span: SPAN, averageColour };
}
