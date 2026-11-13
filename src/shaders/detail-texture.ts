import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
} from 'three';

const SIZE = 256;
const DOTS = SIZE * SIZE;
const TAU = 6.2831853;
// A number of its own, so that the island's layout (which has its own generator) is untouched.
const SEED = 20260711;
const WAVE_COUNT = 46;
// Scales the slope so that this many times the typical slope fills the 0..255 range.
const SLOPE_RANGE = 2.6;
// Smooth blotches at four sizes (cells per tile), from the broad one to the fine one.
const BLOTCH_CELLS = [4, 8, 16, 32];
const BLOTCH_WEIGHTS = [0.5, 0.27, 0.15, 0.08];
// Cells per tile of the two nets of lines: the coarse one and the fine one.
const COARSE_NET_CELLS = 17;
const FINE_NET_CELLS = 41;

type Random = () => number;

interface SmallWaves {
  height: Float32Array;
  slopeAcross: Float32Array;
  slopeDown: Float32Array;
}

function createRandom(): Random {
  let state = SEED;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** 46 sine waves that each fit the tile a whole number of times, most of them running with the wind. */
function createSmallWaves(random: Random): SmallWaves {
  const height = new Float32Array(DOTS);
  const slopeAcross = new Float32Array(DOTS);
  const slopeDown = new Float32Array(DOTS);
  const cosineAcross = new Float32Array(SIZE);
  const sineAcross = new Float32Array(SIZE);
  const cosineDown = new Float32Array(SIZE);
  const sineDown = new Float32Array(SIZE);

  for (let wave = 0; wave < WAVE_COUNT; wave++) {
    const crestsPerTile = 2 * Math.pow(13, random());
    const direction = random() < 0.7 ? 0.6 + (random() - 0.5) * 1.9 : random() * TAU;
    let countAcross = Math.round(crestsPerTile * Math.cos(direction));
    const countDown = Math.round(crestsPerTile * Math.sin(direction));
    if (!countAcross && !countDown) countAcross = 2;
    const amplitude = Math.pow(Math.hypot(countAcross, countDown), -1.7);
    const phase = random() * TAU;

    for (let x = 0; x < SIZE; x++) {
      cosineAcross[x] = Math.cos((TAU * countAcross * x) / SIZE + phase);
      sineAcross[x] = Math.sin((TAU * countAcross * x) / SIZE + phase);
      cosineDown[x] = Math.cos((TAU * countDown * x) / SIZE);
      sineDown[x] = Math.sin((TAU * countDown * x) / SIZE);
    }

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0, dot = y * SIZE; x < SIZE; x++, dot++) {
        const cosine = cosineAcross[x] * cosineDown[y] - sineAcross[x] * sineDown[y];
        const sine = sineAcross[x] * cosineDown[y] + cosineAcross[x] * sineDown[y];
        height[dot] += amplitude * cosine;
        slopeAcross[dot] -= amplitude * countAcross * sine;
        slopeDown[dot] -= amplitude * countDown * sine;
      }
    }
  }
  return { height, slopeAcross, slopeDown };
}

/** Sharper crests and flatter troughs. Returns the scale that maps the slopes into the 0..255 range. */
function sharpenCrests(waves: SmallWaves): { heightSpread: number; slopeScale: number } {
  const { height, slopeAcross, slopeDown } = waves;
  let heightSquares = 0;
  for (let dot = 0; dot < DOTS; dot++) heightSquares += height[dot] * height[dot];
  const heightSpread = Math.sqrt(heightSquares / DOTS);

  let slopeSquares = 0;
  for (let dot = 0; dot < DOTS; dot++) {
    const sharpening = Math.max(0.2, 1 + (0.7 * height[dot]) / heightSpread);
    slopeAcross[dot] *= sharpening;
    slopeDown[dot] *= sharpening;
    slopeSquares += slopeAcross[dot] * slopeAcross[dot] + slopeDown[dot] * slopeDown[dot];
  }
  return { heightSpread, slopeScale: Math.sqrt(slopeSquares / DOTS) * SLOPE_RANGE };
}

/** Smooth random values at four sizes that wrap at the tile's edge; they bend and thin the net of lines. */
function createBlotches(random: Random): (u: number, v: number) => number {
  const layers = BLOTCH_CELLS.map((cells) => {
    const values = new Float32Array(cells * cells);
    for (let i = 0; i < cells * cells; i++) values[i] = random();
    return values;
  });

  // u and v are in tiles.
  return (u, v) => {
    let sum = 0;
    for (let layer = 0; layer < layers.length; layer++) {
      const cells = BLOTCH_CELLS[layer];
      const values = layers[layer];
      const x = u * cells;
      const y = v * cells;
      const column = Math.floor(x);
      const row = Math.floor(y);
      let acrossShare = x - column;
      let downShare = y - row;
      acrossShare = acrossShare * acrossShare * (3 - 2 * acrossShare);
      downShare = downShare * downShare * (3 - 2 * downShare);
      const x0 = ((column % cells) + cells) % cells;
      const x1 = (x0 + 1) % cells;
      const y0 = ((row % cells) + cells) % cells;
      const y1 = (y0 + 1) % cells;
      sum +=
        BLOTCH_WEIGHTS[layer] *
        ((values[y0 * cells + x0] * (1 - acrossShare) + values[y0 * cells + x1] * acrossShare) *
          (1 - downShare) +
          (values[y1 * cells + x0] * (1 - acrossShare) + values[y1 * cells + x1] * acrossShare) *
            downShare);
    }
    return sum;
  };
}

function wrap(index: number, cells: number): number {
  return ((index % cells) + cells) % cells;
}

/** One random point in each cell of a square grid, as x, y pairs. */
function scatterPoints(random: Random, cells: number): Float32Array {
  const points = new Float32Array(cells * cells * 2);
  for (let i = 0; i < points.length; i++) points[i] = random();
  return points;
}

/** How close a point is to a border between cells scattered over the tile (1 = on a border). u and v are in cells. */
function distanceToBorder(points: Float32Array, cells: number, u: number, v: number): number {
  const column = Math.floor(u);
  const row = Math.floor(v);
  let nearest = 9;
  let secondNearest = 9;
  for (let down = -1; down <= 1; down++) {
    for (let across = -1; across <= 1; across++) {
      const index = (wrap(row + down, cells) * cells + wrap(column + across, cells)) * 2;
      const dx = column + across + points[index] - u;
      const dy = row + down + points[index + 1] - v;
      const squared = dx * dx + dy * dy;
      if (squared < nearest) {
        secondNearest = nearest;
        nearest = squared;
      } else if (squared < secondNearest) {
        secondNearest = squared;
      }
    }
  }
  return Math.sqrt(secondNearest) - Math.sqrt(nearest);
}

function toByte(value: number): number {
  return Math.round(255 * Math.max(0, Math.min(1, value)));
}

/**
 * The detail texture: one small repeating picture that the sea, the sea floor, the rocks and the coral read
 * several times over, each time at a different size and angle and drifting its own way, so that no repeat ever shows.
 *   red, green   the slope of a field of small waves (which way the surface tilts)
 *   blue         soft blotches (gusts on the water, foam thinning out): the height of those small waves
 *   alpha        a net of thin lines: foam lace on the surface, the net of light on the sea floor
 *
 * `maxAnisotropy` is the most anisotropic filtering the graphics card offers.
 */
export function createDetailTexture(maxAnisotropy: number): DataTexture {
  const random = createRandom();
  const waves = createSmallWaves(random);
  const { heightSpread, slopeScale } = sharpenCrests(waves);
  const blotches = createBlotches(random);
  const coarsePoints = scatterPoints(random, COARSE_NET_CELLS);
  const finePoints = scatterPoints(random, FINE_NET_CELLS);

  const pixels = new Uint8Array(DOTS * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dot = y * SIZE + x;
      const u = x / SIZE;
      const v = y / SIZE;
      const blotch = blotches(u, v);
      const bendAcross = blotches(u + 0.37, v + 0.11) - 0.5;
      const bendDown = blotches(u + 0.71, v + 0.53) - 0.5;
      const coarseBorder = distanceToBorder(
        coarsePoints,
        COARSE_NET_CELLS,
        u * COARSE_NET_CELLS + bendAcross * 1.5,
        v * COARSE_NET_CELLS + bendDown * 1.5,
      );
      const fineBorder = distanceToBorder(
        finePoints,
        FINE_NET_CELLS,
        u * FINE_NET_CELLS + bendAcross * 3,
        v * FINE_NET_CELLS + bendDown * 3,
      );
      const net = Math.max(1 - coarseBorder / 0.5, (1 - fineBorder / 0.55) * (0.62 + 0.5 * blotch));
      pixels[dot * 4] = toByte(0.5 + (0.5 * waves.slopeAcross[dot]) / slopeScale);
      pixels[dot * 4 + 1] = toByte(0.5 + (0.5 * waves.slopeDown[dot]) / slopeScale);
      pixels[dot * 4 + 2] = toByte(0.5 + waves.height[dot] / (heightSpread * 5));
      pixels[dot * 4 + 3] = toByte(net);
    }
  }

  const texture = new DataTexture(pixels, SIZE, SIZE, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = Math.min(4, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}
