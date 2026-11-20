import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  RGBAFormat,
} from 'three';
import { within, type Random, type Range } from '../../core/random';
import type { GroundTile } from './ground-tile';
import {
  createBit,
  createBroadLeaf,
  createHuskFlake,
  createLeaflet,
  createRib,
  createStalk,
  createTwig,
  dots,
  leafletLength,
  leafletWidth,
  pickColour,
  type LitterPiece,
  type Placement,
} from './litter-pieces';
import { createLitterPicture, paintBlade, type LitterPicture } from './litter-raster';
import { litterTileConfig } from './litter-tile-config';

const {
  size: SIZE,
  span,
  colours,
  leaflets,
  ribs,
  broadLeaves,
  huskFlakes,
  twigs,
  stalks,
  bits,
} = litterTileConfig;
// How finely the order things were laid in is divided when ranks are given out by the ground covered.
const RANK_STEPS = 4096;

function anywhere(random: Random): Placement {
  return { x: random() * SIZE, y: random() * SIZE, angle: random() * Math.PI * 2 };
}

function gaussian(random: Random): number {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}

/** Where a frond fell: its leaflets nearly parallel, side by side, much the same colour and age. */
function frondFall(random: Random): LitterPiece[] {
  const centre = anywhere(random);
  const key = within(random, leaflets.rank);
  const colour = pickColour(random, colours.leaflet);
  const count = Math.round(within(random, leaflets.perFall));
  const width = leafletWidth(random);
  const fallWidth = dots(random, [leaflets.fallWidth, leaflets.fallWidth]);
  return Array.from({ length: count }, () => {
    const length = leafletLength(random);
    const angle = centre.angle + (random() - 0.5) * 2 * leaflets.fallSpread;
    const across = (random() - 0.5) * fallWidth;
    const along = (random() - 0.5) * length * 0.4 - length / 2;
    const place = {
      x: centre.x + Math.cos(angle) * along - Math.sin(angle) * across,
      y: centre.y + Math.sin(angle) * along + Math.cos(angle) * across,
      angle,
    };
    return createLeaflet(random, place, {
      colour: pickColour(random, [colour]),
      key: key + (random() - 0.5) * 0.04,
      length,
      width: width * within(random, [0.8, 1.2]),
    });
  });
}

/** Every thing in the litter, in the order they are laid down: the lowest-ranked first. */
function scatterLitter(random: Random): LitterPiece[] {
  const pieces: LitterPiece[] = [];
  for (let i = 0; i < leaflets.frondFalls; i++) pieces.push(...frondFall(random));
  for (let i = 0; i < leaflets.singles; i++) {
    pieces.push(
      createLeaflet(random, anywhere(random), {
        colour: pickColour(random, colours.leaflet),
        key: within(random, leaflets.rank),
        length: leafletLength(random),
        width: leafletWidth(random),
      }),
    );
  }
  const scatter = (
    count: number,
    rank: Range,
    create: (random: Random, place: Placement, key: number) => LitterPiece,
  ) => {
    for (let i = 0; i < count; i++)
      pieces.push(create(random, anywhere(random), within(random, rank)));
  };
  scatter(broadLeaves.count, broadLeaves.rank, createBroadLeaf);
  scatter(huskFlakes.count, huskFlakes.rank, createHuskFlake);
  scatter(ribs.count, ribs.rank, createRib);
  scatter(twigs.count, twigs.rank, createTwig);
  scatter(stalks.count, stalks.rank, createStalk);

  // Most of the broken bits gather in drifts; the rest lie anywhere.
  const drifts = Array.from({ length: bits.drifts }, () => anywhere(random));
  const driftReach = dots(random, [bits.driftReach, bits.driftReach]);
  for (let i = 0; i < bits.count; i++) {
    const place = anywhere(random);
    if (random() > bits.shareLoose) {
      const drift = drifts[Math.floor(random() * drifts.length)];
      place.x = drift.x + gaussian(random) * driftReach;
      place.y = drift.y + gaussian(random) * driftReach;
    }
    pieces.push(createBit(random, place, within(random, bits.rank)));
  }
  return pieces.sort((one, other) => one.key - other.key);
}

/**
 * Red, green, blue and rank for each dot. Ranks are given out by the ground each thing covers,
 * so that the share of the ground covered falls evenly from its whole at threshold 0 to nothing
 * at 1: a thing's rank is the share of the covered ground lying under things laid after it.
 */
function finishPicture(
  picture: LitterPicture,
  pieces: number,
): { data: Uint8Array<ArrayBuffer>; average: [number, number, number] } {
  const { colour, order } = picture;
  const stepsPerOrder = RANK_STEPS / (pieces + 1);
  const dotsAtStep = new Float64Array(RANK_STEPS);
  let covered = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  for (let dot = 0; dot < order.length; dot++) {
    if (order[dot] === 0) continue;
    dotsAtStep[Math.floor(order[dot] * stepsPerOrder)]++;
    covered++;
    red += colour[dot * 3];
    green += colour[dot * 3 + 1];
    blue += colour[dot * 3 + 2];
  }
  const average: [number, number, number] = [red / covered, green / covered, blue / covered];
  const alphaOfStep = new Uint8Array(RANK_STEPS);
  let above = 0;
  for (let step = RANK_STEPS - 1; step >= 0; step--) {
    const rank = 1 - (above + dotsAtStep[step] / 2) / covered;
    alphaOfStep[step] = Math.max(1, Math.round(rank * 255));
    above += dotsAtStep[step];
  }

  // Bare dots take the litter's average colour, so that filtering and mipmaps never bring in black.
  const [bareRed, bareGreen, bareBlue] = average;
  const data = new Uint8Array(order.length * 4);
  for (let dot = 0; dot < order.length; dot++) {
    const at = dot * 4;
    const isBare = order[dot] === 0;
    // A Uint8Array keeps only whole numbers and wraps above 255, so each channel is rounded and held to it.
    data[at] = Math.min(255, (isBare ? bareRed : colour[dot * 3]) * 255 + 0.5);
    data[at + 1] = Math.min(255, (isBare ? bareGreen : colour[dot * 3 + 1]) * 255 + 0.5);
    data[at + 2] = Math.min(255, (isBare ? bareBlue : colour[dot * 3 + 2]) * 255 + 0.5);
    data[at + 3] = isBare ? 0 : alphaOfStep[Math.floor(order[dot] * stepsPerOrder)];
  }
  return { data, average };
}

/**
 * The litter under coconut palms and beach trees, seen from straight above: dead leaflets, dry
 * leaves, husk, twigs and a mat of broken bits. Red, green and blue are the things' own colours;
 * alpha is each thing's rank (0 where nothing lies), so that a shader showing only what is above a
 * threshold thins a thick mat down to a few things on clean sand. It wraps at the edges.
 *
 * Every thing is painted straight into the dots rather than on a canvas: a canvas keeps its colour
 * multiplied by alpha, losing it where alpha is low, and thousands of canvas calls cost too much
 * at start-up.
 */
export function createLitterTile(random: Random): GroundTile {
  const pieces = scatterLitter(random);
  const picture = createLitterPicture(colours.background);
  pieces.forEach((piece, index) => {
    for (const blade of piece.blades) paintBlade(picture, blade, piece.look, index + 1);
  });
  const { data, average } = finishPicture(picture, pieces.length);

  const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return { texture, span, averageColour: average };
}
