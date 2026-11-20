import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  RGBAFormat,
} from 'three';
import type { Random } from '../../core/random';
import type { GroundTile } from './ground-tile';
import { growLowPlants } from './low-plants-growth';
import {
  BLUE,
  COVERED,
  createPainting,
  GREEN,
  paintLeaf,
  paintStem,
  RANK,
  RED,
  VALUES_A_DOT,
  type Painting,
} from './low-plants-painting';
import { lowPlantsTileConfig } from './low-plants-tile-config';

const { size: SIZE, span, lowestRank, grain } = lowPlantsTileConfig;
const DOTS = SIZE * SIZE;
// Ranks are sorted into this many bins to even them out.
const RANK_BINS = 4096;
// The average colour and the spread of ranks are taken from every so many dots: as good as all
// of them, in a quarter of the time.
const DOTS_SAMPLED_EVERY = 4;

/**
 * Each rank turned into an alpha, so that the dots of plants above a threshold thin out evenly
 * as it rises: as many dots hold an alpha between 0.2 and 0.3 as between 0.7 and 0.8.
 */
function alphaOfEachRankBin(dotsInBin: Uint32Array, dotsCovered: number): Uint8Array {
  const alphas = new Uint8Array(RANK_BINS);
  let below = 0;
  for (let bin = 0; bin < RANK_BINS; bin++) {
    const share = (below + dotsInBin[bin] / 2) / dotsCovered;
    alphas[bin] = Math.max(1, Math.round((lowestRank + (1 - lowestRank) * share) * 255));
    below += dotsInBin[bin];
  }
  return alphas;
}

interface Pixels {
  pixels: Uint8Array<ArrayBuffer>;
  average: [number, number, number];
}

/** Red, green, blue and alpha for each dot: the plants' colours, their rank, and under bare dots their average colour. */
function pixelsOf({ dots }: Painting, random: Random): Pixels {
  // The plants' average colour, and how many dots each rank holds, from every so many dots.
  const sum = [0, 0, 0];
  let coverage = 0;
  let dotsCovered = 0;
  const dotsInBin = new Uint32Array(RANK_BINS);
  for (let dot = 0; dot < DOTS; dot += DOTS_SAMPLED_EVERY) {
    const at = dot * VALUES_A_DOT;
    const cover = dots[at + COVERED];
    if (cover === 0) continue;
    sum[0] += dots[at + RED];
    sum[1] += dots[at + GREEN];
    sum[2] += dots[at + BLUE];
    coverage += cover;
    dotsCovered++;
    dotsInBin[Math.min(RANK_BINS - 1, Math.floor(dots[at + RANK] * RANK_BINS))]++;
  }
  const average: [number, number, number] = [
    sum[0] / coverage,
    sum[1] / coverage,
    sum[2] / coverage,
  ];
  const alphas = alphaOfEachRankBin(dotsInBin, dotsCovered);

  const pixels = new Uint8Array(DOTS * 4);
  const bareRed = Math.round(average[0] * 255);
  const bareGreen = Math.round(average[1] * 255);
  const bareBlue = Math.round(average[2] * 255);
  let grainState = Math.floor(random() * 0xffffffff) | 1;
  for (let dot = 0; dot < DOTS; dot++) {
    const at = dot * VALUES_A_DOT;
    const pixel = dot * 4;
    const cover = dots[at + COVERED];
    if (cover === 0) {
      pixels[pixel] = bareRed;
      pixels[pixel + 1] = bareGreen;
      pixels[pixel + 2] = bareBlue;
      continue;
    }
    grainState ^= grainState << 13;
    grainState ^= grainState >>> 17;
    grainState ^= grainState << 5;
    const shade = ((1 + grain * ((grainState >>> 0) / 0x80000000 - 1)) * 255) / cover;
    pixels[pixel] = Math.min(255, dots[at + RED] * shade + 0.5);
    pixels[pixel + 1] = Math.min(255, dots[at + GREEN] * shade + 0.5);
    pixels[pixel + 2] = Math.min(255, dots[at + BLUE] * shade + 0.5);
    pixels[pixel + 3] = alphas[Math.min(RANK_BINS - 1, Math.floor(dots[at + RANK] * RANK_BINS))];
  }
  return { pixels, average };
}

/**
 * The ground's low green plants seen from straight above, repeating every `span` metres: runners
 * of beach morning glory a metre or two long, short shoots, a small-leaved creeper and seedlings,
 * painted as a dense mat. Alpha is each plant's rank, highest for the runners that reach
 * furthest, so that a shader showing only what lies above a threshold can thin the mat to a few
 * runners over clean sand; where nothing grows it is 0, and the colour there is the plants'
 * average, so that mipmaps never bring in black.
 */
export function createLowPlantsTile(random: Random): GroundTile {
  const plants = growLowPlants(random);
  const painting = createPainting();
  plants.forEach((plant, order) => {
    for (const stem of plant.stems) paintStem(painting, stem, (order + 1) / plants.length);
  });
  plants.forEach((plant, order) => {
    for (const leaf of plant.leaves) paintLeaf(painting, leaf, (order + 1) / plants.length);
  });
  const { pixels, average } = pixelsOf(painting, random);

  const texture = new DataTexture(pixels, SIZE, SIZE, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return { texture, span, averageColour: average };
}
