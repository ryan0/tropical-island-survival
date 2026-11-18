import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
} from 'three';
import { FULL_TURN, wrap } from '../core/maths';

const SIZE = 256;
const DOTS = SIZE * SIZE;
// A number of its own, so that nothing else's pattern moves.
const SEED = 20261118;
// The small waves that bend the light: how many, and how many crests the longest and the shortest
// have across the tile.
const WAVE_COUNT = 48;
const FEWEST_CRESTS = 4;
const MOST_CRESTS = 32;
// A wave's height falls off as this power of its crests per tile: the short ones are low.
const HEIGHT_FALLS_OFF = 1.4;
// Most of them run with the wind (along the tile, within this many radians either way), as ripples
// do; the rest run every way. It is this that draws the net out into long flowing lines that
// branch and join: waves running every way alike make a net of even cells, like a honeycomb.
const SHARE_WITH_THE_WIND = 0.55;
const SPREAD_ABOUT_THE_WIND = 1.0;
// Rays followed down from each dot of the surface, along each side.
const RAYS_ACROSS_A_DOT = 3;
/**
 * How far down the light is followed for each colour: 1 is the depth at which waves of the usual
 * curvature bring it to a focus. Red is short of the focus (a soft net, as in ankle-deep water),
 * green at it (thin bright lines), blue past it (the lines doubled and broader, as in deep water).
 */
const FOCUS = [0.3, 0.7, 1.3];
/** Light this many times the average fills a byte: the shaders multiply by it to get the light back. */
export const CAUSTICS_BRIGHTEST = 4;

type Random = () => number;

function createRandom(): Random {
  let state = SEED;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** The slopes of the small waves, across and down, at each dot; each wave fits the tile a whole number of times. */
function createSlopes(random: Random): { across: Float32Array; down: Float32Array } {
  const across = new Float32Array(DOTS);
  const down = new Float32Array(DOTS);
  const cosineAcross = new Float32Array(SIZE);
  const sineAcross = new Float32Array(SIZE);
  const cosineDown = new Float32Array(SIZE);
  const sineDown = new Float32Array(SIZE);

  for (let wave = 0; wave < WAVE_COUNT; wave++) {
    const crestsPerTile = FEWEST_CRESTS * Math.pow(MOST_CRESTS / FEWEST_CRESTS, random());
    const direction =
      random() < SHARE_WITH_THE_WIND
        ? (random() * 2 - 1) * SPREAD_ABOUT_THE_WIND
        : random() * FULL_TURN;
    let countAcross = Math.round(crestsPerTile * Math.cos(direction));
    const countDown = Math.round(crestsPerTile * Math.sin(direction));
    if (!countAcross && !countDown) countAcross = FEWEST_CRESTS;
    const amplitude = Math.pow(Math.hypot(countAcross, countDown), -HEIGHT_FALLS_OFF);
    const phase = random() * FULL_TURN;

    for (let x = 0; x < SIZE; x++) {
      cosineAcross[x] = Math.cos((FULL_TURN * countAcross * x) / SIZE + phase);
      sineAcross[x] = Math.sin((FULL_TURN * countAcross * x) / SIZE + phase);
      cosineDown[x] = Math.cos((FULL_TURN * countDown * x) / SIZE);
      sineDown[x] = Math.sin((FULL_TURN * countDown * x) / SIZE);
    }
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0, dot = y * SIZE; x < SIZE; x++, dot++) {
        const sine = sineAcross[x] * cosineDown[y] + cosineAcross[x] * sineDown[y];
        across[dot] -= amplitude * countAcross * sine;
        down[dot] -= amplitude * countDown * sine;
      }
    }
  }
  return { across, down };
}

/** How fast the slope changes from one dot to the next, typically: what brings light to a focus. */
function typicalCurvature(slopes: { across: Float32Array; down: Float32Array }): number {
  let squares = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dot = y * SIZE + x;
      const acrossChange = slopes.across[y * SIZE + wrap(x + 1, SIZE)] - slopes.across[dot];
      const downChange = slopes.down[wrap(y + 1, SIZE) * SIZE + x] - slopes.down[dot];
      squares += acrossChange * acrossChange + downChange * downChange;
    }
  }
  return Math.sqrt(squares / (2 * DOTS));
}

/** A value between the dots of a picture that repeats. x and y are in dots. */
function between(values: Float32Array, x: number, y: number): number {
  const column = Math.floor(x);
  const row = Math.floor(y);
  const acrossShare = x - column;
  const downShare = y - row;
  const x0 = wrap(column, SIZE);
  const x1 = wrap(column + 1, SIZE);
  const y0 = wrap(row, SIZE) * SIZE;
  const y1 = wrap(row + 1, SIZE) * SIZE;
  return (
    (values[y0 + x0] * (1 - acrossShare) + values[y0 + x1] * acrossShare) * (1 - downShare) +
    (values[y1 + x0] * (1 - acrossShare) + values[y1 + x1] * acrossShare) * downShare
  );
}

/**
 * The light that reaches each dot of the floor, as a share of the average: every ray that enters
 * the surface is bent by the slope where it enters, followed `reach` dots along for each unit of
 * slope, and added to the floor where it lands. Where the waves crowd the rays together the floor
 * is bright.
 */
function lightOnFloor(
  slopes: { across: Float32Array; down: Float32Array },
  reach: number,
): Float32Array {
  const light = new Float32Array(DOTS);
  const share = 1 / (RAYS_ACROSS_A_DOT * RAYS_ACROSS_A_DOT);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      for (let rayDown = 0; rayDown < RAYS_ACROSS_A_DOT; rayDown++) {
        for (let rayAcross = 0; rayAcross < RAYS_ACROSS_A_DOT; rayAcross++) {
          const entersX = x + (rayAcross + 0.5) / RAYS_ACROSS_A_DOT - 0.5;
          const entersY = y + (rayDown + 0.5) / RAYS_ACROSS_A_DOT - 0.5;
          const landsX = entersX + reach * between(slopes.across, entersX, entersY);
          const landsY = entersY + reach * between(slopes.down, entersX, entersY);
          const column = Math.floor(landsX);
          const row = Math.floor(landsY);
          const acrossShare = landsX - column;
          const downShare = landsY - row;
          const x0 = wrap(column, SIZE);
          const x1 = wrap(column + 1, SIZE);
          const y0 = wrap(row, SIZE) * SIZE;
          const y1 = wrap(row + 1, SIZE) * SIZE;
          light[y0 + x0] += share * (1 - acrossShare) * (1 - downShare);
          light[y0 + x1] += share * acrossShare * (1 - downShare);
          light[y1 + x0] += share * (1 - acrossShare) * downShare;
          light[y1 + x1] += share * acrossShare * downShare;
        }
      }
    }
  }
  return light;
}

/**
 * The caustics texture: the net of light that ripples throw on whatever lies under the water
 * (shaders/shared/light-net.glsl), worked out once by following the light down through a field of
 * small waves. It repeats, and is read twice over at different sizes and angles.
 *   red, green, blue   the light on the floor, short of the waves' focus, at it and past it, as a
 *                      share of CAUSTICS_BRIGHTEST times the average
 *   alpha              the detail texture's net of lines, so that the shaders which read both
 *                      at one place (the foam's lace on the lagoon's sand) read once
 *
 * `detailPixels` are the detail texture's, of the same size. It is filtered plainly, as that is
 * (detail-texture.ts).
 */
export function createCausticsTexture(detailPixels: Uint8Array | Uint8ClampedArray): DataTexture {
  const slopes = createSlopes(createRandom());
  const curvature = typicalCurvature(slopes);
  const pixels = new Uint8Array(DOTS * 4);
  for (let colour = 0; colour < FOCUS.length; colour++) {
    const light = lightOnFloor(slopes, FOCUS[colour] / curvature);
    for (let dot = 0; dot < DOTS; dot++) {
      pixels[dot * 4 + colour] = Math.round(255 * Math.min(1, light[dot] / CAUSTICS_BRIGHTEST));
    }
  }
  for (let dot = 0; dot < DOTS; dot++) pixels[dot * 4 + 3] = detailPixels[dot * 4 + 3];

  const texture = new DataTexture(pixels, SIZE, SIZE, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
