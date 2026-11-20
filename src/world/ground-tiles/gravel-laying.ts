import { within, type Random } from '../../core/random';
import {
  createFinger,
  createLump,
  createPolygon,
  sizeWithin,
  type Outline,
} from './gravel-outlines';
import { gravelTileConfig, type PieceLook, type ToneName } from './gravel-tile-config';

const { dotsEachWay: SIZE, span: SPAN, kinds, takenSquareDots: SQUARE } = gravelTileConfig;
const DOTS_PER_METRE = SIZE / SPAN;
const SQUARE_METRES = SPAN * SPAN;
const SQUARES = SIZE / SQUARE;
// The share of a piece's size, across the middle, under which there must be room for it.
const ROOM_LOOKED_FOR = 0.4;

type Colour = readonly [number, number, number];

/** One piece of gravel where it lies on the picture, in dots. */
export interface Piece {
  x: number;
  y: number;
  outline: Outline;
  look: PieceLook;
  /** Its top's colour. */
  colour: Colour;
  /** Its alpha: higher for bigger pieces. */
  rank: number;
}

type UnrankedPiece = Omit<Piece, 'rank'>;

interface Kind {
  perSquareMetre: number;
  look: PieceLook;
}

/** Smooth noise 0 to 1 that wraps at the picture's edges, read at single places. */
function createWrappingNoiseAt(random: Random, cellDots: number): (x: number, y: number) => number {
  const cells = SIZE / cellDots;
  const corners = new Float32Array(cells * cells);
  for (let i = 0; i < corners.length; i++) corners[i] = random();
  const smoothStep = (share: number): number => share * share * (3 - 2 * share);
  return (x, y) => {
    const left = Math.floor(x / cellDots);
    const above = Math.floor(y / cellDots);
    const across = smoothStep(x / cellDots - left);
    const down = smoothStep(y / cellDots - above);
    const right = (left + 1) % cells;
    const below = ((above + 1) % cells) * cells;
    const top =
      corners[above * cells + left] * (1 - across) + corners[above * cells + right] * across;
    const bottom = corners[below + left] * (1 - across) + corners[below + right] * across;
    return top + (bottom - top) * down;
  };
}

function createColourPicker(look: PieceLook): (random: Random) => Colour {
  const shares = Object.entries(look.toneShares) as [ToneName, number][];
  const total = shares.reduce((sum, [, share]) => sum + share, 0);
  return (random) => {
    let pick = random() * total;
    let tone = shares[0][0];
    for (const [name, share] of shares) {
      tone = name;
      pick -= share;
      if (pick < 0) break;
    }
    const lightness = 1 + look.lightnessSpread * (2 * random() - 1);
    const [red, green, blue] = gravelTileConfig.tones[tone];
    return [red * lightness, green * lightness, blue * lightness];
  };
}

interface TakenGround {
  /** Whether a piece already covers the square that holds this point. */
  isTaken: (x: number, y: number) => boolean;
  /** The share of the ground under a circle of `reach` round a point that pieces already cover. */
  shareTaken: (x: number, y: number, reach: number) => number;
  take: (x: number, y: number, outline: Outline) => void;
}

/** The squares of a coarse grid that pieces already cover, so that new pieces mostly fill gaps. */
function createTakenGround(): TakenGround {
  const taken = new Uint8Array(SQUARES * SQUARES);
  let squaresUnder = 0;
  let squaresTaken = 0;
  const count = (square: number): void => {
    squaresUnder++;
    squaresTaken += taken[square];
  };
  const mark = (square: number): void => {
    taken[square] = 1;
  };
  const forEachSquareUnder = (
    x: number,
    y: number,
    reach: number,
    outline: Outline | undefined,
    visit: (square: number) => void,
  ): void => {
    const bottom = Math.floor((y + reach) / SQUARE);
    const right = Math.floor((x + reach) / SQUARE);
    for (let row = Math.floor((y - reach) / SQUARE); row <= bottom; row++) {
      const down = (row + 0.5) * SQUARE - y;
      for (let column = Math.floor((x - reach) / SQUARE); column <= right; column++) {
        const across = (column + 0.5) * SQUARE - x;
        const inside = outline
          ? outline.distanceAt(across, down) < 0
          : across * across + down * down < reach * reach;
        if (inside) visit((row & (SQUARES - 1)) * SQUARES + (column & (SQUARES - 1)));
      }
    }
  };

  return {
    isTaken(x, y) {
      return taken[Math.floor(y / SQUARE) * SQUARES + Math.floor(x / SQUARE)] === 1;
    },
    shareTaken(x, y, reach) {
      squaresUnder = 0;
      squaresTaken = 0;
      forEachSquareUnder(x, y, reach, undefined, count);
      return squaresUnder === 0 ? 0 : squaresTaken / squaresUnder;
    },
    take(x, y, outline) {
      forEachSquareUnder(x, y, outline.reach, outline, mark);
    },
  };
}

/** Lays pieces of one kind where there is room: `perSquareMetre` are tried, more where the crowding is high. */
function layKind(
  random: Random,
  { perSquareMetre, look }: Kind,
  sizeOf: () => number,
  shapeOf: (size: number) => Outline,
  ground: TakenGround,
  crowding: (x: number, y: number) => number,
): UnrankedPiece[] {
  const { crowding: crowdingShare, overlapAllowed } = gravelTileConfig;
  const pickColour = createColourPicker(look);
  const tries = Math.round(perSquareMetre * SQUARE_METRES * (1 + crowdingShare));
  const laid: UnrankedPiece[] = [];
  for (let attempt = 0; attempt < tries; attempt++) {
    const x = random() * SIZE;
    const y = random() * SIZE;
    if (ground.isTaken(x, y)) continue;

    const density = 1 + crowdingShare * (2 * crowding(x, y) - 1);
    if (random() * (1 + crowdingShare) > density) continue;

    const size = sizeOf();
    // Room is looked for under a circle within the piece, before an outline is made for it.
    if (ground.shareTaken(x, y, size * ROOM_LOOKED_FOR) > overlapAllowed) continue;

    const outline = shapeOf(size);
    ground.take(x, y, outline);
    laid.push({ x, y, outline, look, colour: pickColour(random) });
  }
  return laid;
}

function sidesBetween(random: Random, fewest: number, most: number): number {
  return fewest + Math.floor(random() * (most - fewest + 1));
}

/** Every piece, the biggest kinds laid first so that the small fill the gaps between them. */
function layPieces(random: Random): UnrankedPiece[] {
  const crowding = createWrappingNoiseAt(random, gravelTileConfig.crowdingPatchDots);
  const ground = createTakenGround();
  const dots = (metres: number): number => metres * DOTS_PER_METRE;
  const lay = (
    kind: Kind,
    sizeOf: () => number,
    shapeOf: (size: number) => Outline,
  ): UnrankedPiece[] => layKind(random, kind, sizeOf, shapeOf, ground, crowding);
  const { plate, lump, finger, shell, pebble } = kinds;
  const flatPlate = (size: number): Outline => {
    const half = size / 2;
    const sides = sidesBetween(random, 5, 7);
    const flat = createPolygon(
      random,
      half,
      half * within(random, [0.5, 0.85]),
      sides,
      plate.roundness,
    );
    // A plate is thin: only its very edge rounds over.
    return { ...flat, thickness: Math.min(flat.thickness, 2.5) };
  };
  const fingerOfLength = (length: number): Outline =>
    createFinger(random, {
      length,
      thickness: dots(within(random, finger.thickness)),
      bend: finger.bend,
      forked: random() < finger.forkedShare,
    });
  const brokenPiece =
    (roundness: number, fewestSides: number, mostSides: number) =>
    (size: number): Outline =>
      createPolygon(
        random,
        size / 2,
        (size / 2) * within(random, [0.45, 0.95]),
        sidesBetween(random, fewestSides, mostSides),
        roundness,
      );

  return [
    ...lay(plate, () => dots(sizeWithin(random, plate.size)), flatPlate),
    ...lay(
      lump,
      () => dots(sizeWithin(random, lump.size)),
      (size) => createLump(random, size, lump.roundness),
    ),
    ...lay(finger, () => dots(sizeWithin(random, finger.length)), fingerOfLength),
    ...lay(shell, () => dots(sizeWithin(random, shell.size)), brokenPiece(shell.roundness, 5, 7)),
    ...lay(
      pebble,
      () => dots(sizeWithin(random, pebble.size)),
      brokenPiece(pebble.roundness, 5, 6),
    ),
  ];
}

/**
 * Ranks the pieces by size, a little shuffled. A piece's rank is the share of all the ground
 * the pieces cover that smaller pieces cover, so raising a threshold takes away covered ground
 * steadily, the smallest pieces first.
 */
function rankBySize(random: Random, pieces: UnrankedPiece[]): Piece[] {
  const { rankShuffle, lowestRank } = gravelTileConfig;
  const keyed = pieces.map((piece) => ({
    piece,
    key: Math.sqrt(piece.outline.area) * (1 + rankShuffle * (2 * random() - 1)),
  }));
  keyed.sort((one, other) => one.key - other.key);
  const totalArea = pieces.reduce((sum, piece) => sum + piece.outline.area, 0);
  let areaBefore = 0;
  return keyed.map(({ piece }) => {
    const rank =
      lowestRank + ((1 - lowestRank) * (areaBefore + piece.outline.area / 2)) / totalArea;
    areaBefore += piece.outline.area;
    return { ...piece, rank };
  });
}

/**
 * The gravel's pieces, packed as gravel lies, ranked and in the order to paint them: lowest
 * rank first, so that the big lie on top of the small.
 */
export function layGravel(random: Random): Piece[] {
  return rankBySize(random, layPieces(random));
}
