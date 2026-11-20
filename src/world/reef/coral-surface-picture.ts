import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
} from 'three';
import { FULL_TURN, mix, smoothstep, wrap } from '../../core/maths';
import { within, type Random } from '../../core/random';
import { coralSurfaceConfig } from './coral-surface-config';

export interface CoralSurfacePicture {
  texture: DataTexture;
  /** How many metres of coral one repeat of the picture covers. */
  span: number;
  /** The average of each channel, 0 to 1, so that the shader can keep a coral's overall shade as it is. */
  averages: readonly [number, number, number, number];
}

const {
  size: SIZE,
  span: SPAN,
  tones,
  stretchBeyond,
  broadSize,
  spreadingPasses,
} = coralSurfaceConfig;
const MASK = SIZE - 1;
const DOTS = SIZE * SIZE;

/** One whole wave of a cosine and of a sine, in SIZE steps. */
interface WaveTable {
  cosine: Float32Array;
  sine: Float32Array;
}

/** A plane wave that fits the tile a whole number of times each way, so that the picture wraps. */
interface Wave {
  across: number;
  down: number;
  /** Where its crests fall, in SIZE-ths of a wave. */
  shift: number;
  amplitude: number;
}

function createWaveTable(): WaveTable {
  const cosine = new Float32Array(SIZE);
  const sine = new Float32Array(SIZE);
  for (let step = 0; step < SIZE; step++) {
    cosine[step] = Math.cos((FULL_TURN * step) / SIZE);
    sine[step] = Math.sin((FULL_TURN * step) / SIZE);
  }
  return { cosine, sine };
}

/** The wave that fits the tile nearest to the number of waves across it and the direction asked for. */
function randomWave(random: Random, wavesPerTile: number, direction: number): Wave {
  let across = Math.round(wavesPerTile * Math.cos(direction));
  const down = Math.round(wavesPerTile * Math.sin(direction));
  if (across === 0 && down === 0) across = 1;
  return { across, down, shift: Math.floor(random() * SIZE), amplitude: 1 };
}

/**
 * Up to `count` different waves between two lengths in metres, chosen at random from every wave of
 * those lengths that fits the tile. Where only a few fit, all of them are taken, in every direction
 * there is, so that the broadest patterns, which have the fewest waves to choose from, lean no way.
 */
function randomWaves(
  random: Random,
  count: number,
  lengths: readonly [number, number],
  amplitude = 1,
): Wave[] {
  const fewestPerTile = SPAN / lengths[1];
  const mostPerTile = SPAN / lengths[0];
  const reach = Math.floor(mostPerTile);
  const fitting: Wave[] = [];
  // Half the waves: a wave and its reverse are the same wave.
  for (let down = 0; down <= reach; down++) {
    for (let across = down === 0 ? 1 : -reach; across <= reach; across++) {
      const wavesPerTile = Math.hypot(across, down);
      if (wavesPerTile < fewestPerTile || wavesPerTile > mostPerTile) continue;

      fitting.push({ across, down, shift: 0, amplitude });
    }
  }

  const chosen = Math.min(count, fitting.length);
  for (let i = 0; i < chosen; i++) {
    const pick = i + Math.floor(random() * (fitting.length - i));
    [fitting[i], fitting[pick]] = [fitting[pick], fitting[i]];
    fitting[i].shift = Math.floor(random() * SIZE);
  }
  return fitting.slice(0, chosen);
}

/** The waves summed, on a grid `size` dots a side (a power of two no larger than the picture). */
function sumWaves(waves: readonly Wave[], size: number, { cosine }: WaveTable): Float32Array {
  const count = waves.length;
  const dotWidth = SIZE / size;
  const stepAcross = Int32Array.from(waves, (wave) => wave.across * dotWidth);
  const amplitude = Float32Array.from(waves, (wave) => wave.amplitude);
  const rowStart = new Int32Array(count);
  const field = new Float32Array(size * size);
  for (let y = 0, dot = 0; y < size; y++) {
    for (let i = 0; i < count; i++) rowStart[i] = waves[i].down * dotWidth * y + waves[i].shift;
    for (let x = 0; x < size; x++, dot++) {
      let sum = 0;
      for (let i = 0; i < count; i++) {
        sum += amplitude[i] * cosine[(rowStart[i] + stepAcross[i] * x) & MASK];
      }
      field[dot] = sum;
    }
  }
  return field;
}

/** Scales a field so that its typical value (the root of its mean square) is 1. */
function normalise(field: Float32Array): Float32Array {
  let squares = 0;
  for (const value of field) squares += value * value;
  const scale = 1 / Math.sqrt(squares / field.length);
  for (let i = 0; i < field.length; i++) field[i] *= scale;
  return field;
}

/** A field painted `size` dots a side, enlarged to the picture's size by blending between its dots. */
function enlarge(field: Float32Array, size: number): Float32Array {
  const shrink = size / SIZE;
  const large = new Float32Array(DOTS);
  for (let y = 0, dot = 0; y < SIZE; y++) {
    const top = Math.floor(y * shrink);
    const down = y * shrink - top;
    const upperRow = top * size;
    const lowerRow = ((top + 1) % size) * size;
    for (let x = 0; x < SIZE; x++, dot++) {
      const left = Math.floor(x * shrink);
      const across = x * shrink - left;
      const right = (left + 1) % size;
      const upper = mix(field[upperRow + left], field[upperRow + right], across);
      const lower = mix(field[lowerRow + left], field[lowerRow + right], across);
      large[dot] = mix(upper, lower, down);
    }
  }
  return large;
}

/** Smooth random values, typically -1 to 1, in patches about half the given wave long, on the coarse grid. */
function smoothField(random: Random, waveLength: number, table: WaveTable): Float32Array {
  return normalise(
    sumWaves(randomWaves(random, 6, [waveLength / 2, waveLength]), broadSize, table),
  );
}

/**
 * A maze of winding ridges of even width, like a brain coral's. It is a sum of waves of one length;
 * in each place the waves that run one way count for more than the others (which way changes slowly
 * from place to place), so the ridges run side by side for a while and then turn, fork and join.
 * The ridges are made even by taking only each dot's place within its own ridge: the phase of the sum,
 * found with its Riesz transform (the same waves as sines, each pointing its own way).
 */
function paintBrainRidges(random: Random, table: WaveTable): Float32Array {
  const config = coralSurfaceConfig.brainRidges;
  const { waveCount, steering, valleyEdge, ridgeEdge, crestHighlight, weakestWaves } = config;
  const leanAcross = enlarge(smoothField(random, config.runLength, table), broadSize);
  const leanDown = enlarge(smoothField(random, config.runLength, table), broadSize);

  const waves: Wave[] = [];
  const twiceDirectionCos = new Float32Array(waveCount);
  const twiceDirectionSin = new Float32Array(waveCount);
  for (let i = 0; i < waveCount; i++) {
    const direction = ((i + random()) / waveCount) * Math.PI;
    waves.push(randomWave(random, SPAN / config.ridgeSpacing, direction));
    twiceDirectionCos[i] = Math.cos(2 * direction);
    twiceDirectionSin[i] = Math.sin(2 * direction);
  }
  const stepAcross = Int32Array.from(waves, (wave) => wave.across);
  const pointingAcross = Float32Array.from(
    waves,
    (wave) => wave.across / Math.hypot(wave.across, wave.down),
  );
  const pointingDown = Float32Array.from(
    waves,
    (wave) => wave.down / Math.hypot(wave.across, wave.down),
  );
  const rowStart = new Int32Array(waveCount);
  const { cosine, sine } = table;

  const ridges = new Float32Array(DOTS);
  for (let y = 0, dot = 0; y < SIZE; y++) {
    for (let i = 0; i < waveCount; i++) rowStart[i] = waves[i].down * y + waves[i].shift;
    for (let x = 0; x < SIZE; x++, dot++) {
      const steerAcross = steering * leanAcross[dot];
      const steerDown = steering * leanDown[dot];
      let height = 0;
      let slopeAcross = 0;
      let slopeDown = 0;
      let weightSquares = 0;
      for (let i = 0; i < waveCount; i++) {
        const lean = 1 + steerAcross * twiceDirectionCos[i] + steerDown * twiceDirectionSin[i];
        if (lean <= 0) continue;

        const weight = lean * lean;
        const step = (rowStart[i] + stepAcross[i] * x) & MASK;
        const slope = weight * sine[step];
        height += weight * cosine[step];
        slopeAcross += slope * pointingAcross[i];
        slopeDown += slope * pointingDown[i];
        weightSquares += weight * weight;
      }
      const strength = height * height + slopeAcross * slopeAcross + slopeDown * slopeDown;
      const weakest = weakestWaves * weakestWaves * weightSquares;
      const placeInRidge = height / Math.sqrt(strength + weakest);
      const flank = smoothstep(valleyEdge, ridgeEdge, placeInRidge);
      ridges[dot] = flank * (1 - crestHighlight + crestHighlight * Math.max(0, placeInRidge));
    }
  }
  return ridges;
}

/**
 * Points spread over the tile, one in each square of a grid `squaresAcross` a side, each anywhere in
 * its square; then pushed apart, a few times over, where two are closer than a square's width. In
 * dots, as x, y pairs.
 */
function scatter(random: Random, squaresAcross: number): Float32Array {
  const square = SIZE / squaresAcross;
  let points = new Float32Array(squaresAcross * squaresAcross * 2);
  for (let row = 0, i = 0; row < squaresAcross; row++) {
    for (let column = 0; column < squaresAcross; column++, i += 2) {
      points[i] = (column + random()) * square;
      points[i + 1] = (row + random()) * square;
    }
  }

  for (let pass = 0; pass < spreadingPasses; pass++) {
    const spread = new Float32Array(points.length);
    for (let row = 0, i = 0; row < squaresAcross; row++) {
      for (let column = 0; column < squaresAcross; column++, i += 2) {
        let pushAcross = 0;
        let pushDown = 0;
        for (let down = -1; down <= 1; down++) {
          const neighbourRow = aroundTheTile(row + down, squaresAcross);
          for (let across = -1; across <= 1; across++) {
            const neighbourColumn = aroundTheTile(column + across, squaresAcross);
            const j = (neighbourRow * squaresAcross + neighbourColumn) * 2;
            const dx = nearerWayRound(points[i] - points[j]);
            const dy = nearerWayRound(points[i + 1] - points[j + 1]);
            const apart = Math.sqrt(dx * dx + dy * dy);
            if (apart >= square || apart === 0) continue;

            const push = (0.5 * (square - apart)) / apart;
            pushAcross += dx * push;
            pushDown += dy * push;
          }
        }
        spread[i] = wrap(points[i] + pushAcross, SIZE);
        spread[i + 1] = wrap(points[i + 1] + pushDown, SIZE);
      }
    }
    points = spread;
  }
  return points;
}

/** A row or column that may be one off either side of the grid, brought back onto it from the other side. */
function aroundTheTile(index: number, count: number): number {
  return index < 0 ? index + count : index >= count ? index - count : index;
}

/** A difference between two places on the tile, taken the shorter way round. */
function nearerWayRound(difference: number): number {
  return difference > SIZE / 2
    ? difference - SIZE
    : difference < -SIZE / 2
      ? difference + SIZE
      : difference;
}

/**
 * For every dot, how near it is to the nearest of the points, as a share of that point's own
 * radius: 0 at a point, 1 at its radius or beyond.
 */
function nearestInRadii(points: Float32Array, radii: Float32Array): Float32Array {
  const nearestSquared = new Float32Array(DOTS).fill(1);
  let largestRadius = 0;
  for (const radius of radii) largestRadius = Math.max(largestRadius, radius);
  const reach = Math.ceil(largestRadius);
  for (let i = 0; i < radii.length; i++) {
    const pointX = points[i * 2];
    const pointY = points[i * 2 + 1];
    const inverseRadiusSquared = 1 / (radii[i] * radii[i]);
    const left = Math.floor(pointX);
    const top = Math.floor(pointY);
    for (let y = top - reach; y <= top + reach + 1; y++) {
      const row = (y & MASK) * SIZE;
      const dy = y - pointY;
      for (let x = left - reach; x <= left + reach + 1; x++) {
        const dx = x - pointX;
        const shareSquared = (dx * dx + dy * dy) * inverseRadiusSquared;
        const dot = row + (x & MASK);
        if (shareSquared < nearestSquared[dot]) nearestSquared[dot] = shareSquared;
      }
    }
  }
  return nearestSquared.map(Math.sqrt);
}

/** Round spots about `spacing` metres apart, as in `nearestInRadii`, each of a radius that is a share of that. */
function spots(
  random: Random,
  spacing: number,
  radiusShares: readonly [number, number],
): Float32Array {
  const across = Math.round(SPAN / spacing);
  const middles = scatter(random, across);
  const radii = new Float32Array(across * across);
  for (let i = 0; i < radii.length; i++) radii[i] = within(random, radiusShares) * (SIZE / across);
  return nearestInRadii(middles, radii);
}

/**
 * A boulder coral's skin: a honeycomb of shallow polyp pits over close-packed rounded lumps. Each
 * lump is a dome round a point of a scatter, so the hollows between are darkest where three meet.
 */
function paintBoulderSkin(random: Random): Float32Array {
  const { polypSpacing, pitRadiusShare, pitShare, lumpSpacing, lumpRadiusShares, lumpFlatness } =
    coralSurfaceConfig.boulderSkin;
  const lumps = spots(random, lumpSpacing, lumpRadiusShares);
  const pits = spots(random, polypSpacing, [pitRadiusShare, pitRadiusShare]);
  return lumps.map((share, dot) => {
    const lump = (1 - share * share) ** lumpFlatness;
    return (1 - pitShare) * lump + pitShare * pits[dot] * pits[dot];
  });
}

/**
 * Close-set round warts of slightly different sizes, each brightest on its top; in some places they
 * stand a little lower, as the tips of a table coral's branchlets do between its clumps.
 */
function paintWarts(random: Random, table: WaveTable): Float32Array {
  const { spacing, radiusShares, topPower, clumpSize, clumpDepth } = coralSurfaceConfig.warts;
  const clumps = enlarge(smoothField(random, 2 * clumpSize, table), broadSize);
  return spots(random, spacing, radiusShares).map((share, dot) => {
    const lowered = clumpDepth * smoothstep(1, -1, clumps[dot]);
    return (1 - share * share) ** topPower * (1 - lowered);
  });
}

/**
 * Broad soft blotches with ragged edges, and on the highest of the pale ones a patch with a crisp
 * edge (a bite scar, a crust of alga), paler than any soft blotch.
 */
function paintBlotches(random: Random, table: WaveTable): Float32Array {
  const {
    broadestWave,
    octaves,
    wavesPerOctave,
    octaveFalloff,
    softEdge,
    softShare,
    crispLevel,
    crispEdge,
  } = coralSurfaceConfig.blotches;
  const waves: Wave[] = [];
  for (let octave = 0, amplitude = 1; octave < octaves; octave++, amplitude *= octaveFalloff) {
    const longest = broadestWave / 2 ** octave;
    waves.push(...randomWaves(random, wavesPerOctave, [longest / 2, longest], amplitude));
  }
  const blotches = normalise(sumWaves(waves, broadSize, table)).map((value) => {
    const soft = softShare * smoothstep(-softEdge, softEdge, value);
    const crisp = smoothstep(crispLevel - crispEdge, crispLevel + crispEdge, value);
    return Math.max(soft, crisp);
  });
  return enlarge(blotches, broadSize);
}

/**
 * The values below which and above which lie the darkest and the lightest few dots of a pattern
 * (`stretchBeyond` of them each), so that it may be stretched to fill the range of tones. Found
 * from every 17th dot: a step that is not a power of two does not fall in step with the patterns.
 */
function spreadOf(pattern: Float32Array): [number, number] {
  const sample = new Float32Array(Math.floor(DOTS / 17));
  for (let i = 0; i < sample.length; i++) sample[i] = pattern[i * 17];
  sample.sort();
  const fewest = Math.floor(stretchBeyond * sample.length);
  return [sample[fewest], sample[sample.length - 1 - fewest]];
}

/**
 * Four grey patterns of a coral's surface, one in each channel, each 1 where the surface stands
 * proud and catches the light and 0 in its hollows: red a brain coral's ridges, green a boulder
 * coral's polyps and lumps, blue a cauliflower coral's warts, alpha broad blotches for the shader
 * to tint. The picture wraps both ways and has no direction of its own, so it may be laid on a
 * coral from any side by where the coral is in the world.
 */
export function createCoralSurfacePicture(random: Random): CoralSurfacePicture {
  if ((SIZE & MASK) !== 0 || SIZE % broadSize !== 0) {
    throw new Error(
      `The coral surface picture's size, ${SIZE}, must be a power of two that its coarse grid's, ${broadSize}, divides`,
    );
  }

  const table = createWaveTable();
  const channels = [
    paintBrainRidges(random, table),
    paintBoulderSkin(random),
    paintWarts(random, table),
    paintBlotches(random, table),
  ];

  const pixels = new Uint8Array(DOTS * 4);
  const sums = [0, 0, 0, 0];
  const [darkestByte, lightestByte] = [255 * tones[0], 255 * tones[1]];
  channels.forEach((pattern, channel) => {
    const [darkest, lightest] = spreadOf(pattern);
    const scale = (lightestByte - darkestByte) / (lightest - darkest);
    let sum = 0;
    for (let dot = 0; dot < DOTS; dot++) {
      const value = darkestByte + scale * (pattern[dot] - darkest);
      const byte = value < darkestByte ? darkestByte : value > lightestByte ? lightestByte : value;
      // Rounded to the nearest whole number: the value is never negative.
      const rounded = (byte + 0.5) | 0;
      pixels[dot * 4 + channel] = rounded;
      sum += rounded;
    }
    sums[channel] = sum;
  });

  const texture = new DataTexture(pixels, SIZE, SIZE, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  const average = (channel: number): number => sums[channel] / DOTS / 255;
  return { texture, span: SPAN, averages: [average(0), average(1), average(2), average(3)] };
}
