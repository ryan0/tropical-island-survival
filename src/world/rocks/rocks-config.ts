// Sizes are metres. Colours are red, green, blue from 0 to 1.

export type RockKind = 'boulder' | 'crag' | 'slab' | 'karst' | 'cobble';

/** How a kind's surface is drawn (rock-colour.glsl). */
export interface RockSurface {
  /** The size of the surface pattern: more is finer. */
  scale: number;
  /** How strongly cracks, pits and grain show. */
  crack: number;
  pit: number;
  bump: number;
  /** How pale the tops go in the sun. */
  bleach: number;
  /** How much white crust the tide leaves. */
  barnacle: number;
}

/**
 * A rock's own colour, where it is not given one: a brightness from `darkest` up to `range`
 * more, and for each channel how much of a second random number, the rock's warmth, to add
 * (as a share of the brightness) or, with `fixed`, a set multiple of the brightness instead.
 */
export type RockTint =
  | { darkest: number; range: number; warmth: readonly [number, number, number] }
  | { darkest: number; range: number; fixed: readonly [number, number, number] };

export interface RockKindConfig {
  /** One shape for each seed; a rock is one of them at random. */
  seeds: readonly number[];
  /** How finely the shape is divided, close up and from far off (0: only the one shape). */
  detail: number;
  detailFromAfar: number;
  /** How far its middle sits above the ground, as a share of its size. */
  sitsAbove: number;
  /** Slabs and karst lie level; the others are tipped any way. */
  liesLevel: boolean;
  surface: RockSurface;
  /** Null for a kind that is always given its colour. */
  tint: RockTint | null;
}

export const rocksConfig = {
  kinds: {
    /** Big rounded-angular blocks with flat fracture faces and a few cracks; brown to grey. */
    boulder: {
      seeds: [11, 23, 37],
      detail: 7,
      detailFromAfar: 2,
      sitsAbove: 0.16,
      liesLevel: false,
      surface: { scale: 0.11, crack: 0.7, pit: 0.4, bump: 0.9, bleach: 0.5, barnacle: 0.7 },
      tint: { darkest: 0.25, range: 0.15, warmth: [0.25, 0.08, -0.2] },
    },
    /** Dark, jagged rock with sharp ridges, standing in or at the water. */
    crag: {
      seeds: [5, 19],
      detail: 8,
      detailFromAfar: 3,
      sitsAbove: 0.2,
      liesLevel: false,
      surface: { scale: 0.15, crack: 0.5, pit: 0.5, bump: 0.8, bleach: 0.25, barnacle: 0.5 },
      tint: { darkest: 0.2, range: 0.09, warmth: [0.15, 0.08, -0.12] },
    },
    /** Low ledges of beachrock: flat-topped, stepped at the edges, half buried along the waterline. */
    slab: {
      seeds: [3, 29],
      detail: 7,
      detailFromAfar: 2,
      sitsAbove: 0.05,
      liesLevel: true,
      surface: { scale: 0.13, crack: 0.75, pit: 0.5, bump: 0.9, bleach: 0.3, barnacle: 0.4 },
      tint: null,
    },
    /** Old reef limestone: grey, pitted and spiky, at the back of the beach and on the horns. */
    karst: {
      seeds: [7, 31, 43],
      detail: 15,
      detailFromAfar: 5,
      sitsAbove: -0.1,
      liesLevel: true,
      surface: { scale: 0.36, crack: 0.6, pit: 0.9, bump: 1.2, bleach: 0.3, barnacle: 0.2 },
      tint: { darkest: 0.33, range: 0.1, fixed: [1, 1.01, 1.02] },
    },
    /** Small stones scattered round the others, and the ring round the campfire. */
    cobble: {
      seeds: [2, 13],
      detail: 2,
      detailFromAfar: 0,
      sitsAbove: 0.2,
      liesLevel: false,
      surface: { scale: 0.5, crack: 0.25, pit: 0.3, bump: 0.5, bleach: 0.4, barnacle: 0.4 },
      tint: { darkest: 0.36, range: 0.3, warmth: [0.18, 0.06, -0.14] },
    },
  } satisfies Record<RockKind, RockKindConfig>,

  /**
   * How rocky each stretch of the island is: [direction, half-width in radians, how rocky].
   * Three rocky reaches - the west side, the east point and a lesser one in the north-east -
   * and clean beach everywhere else.
   */
  reaches: [
    [2.7, 0.42, 1],
    [0.09, 0.36, 1],
    [5.32, 0.26, 0.55],
  ],
  /** Cobbles are too small to make out beyond this distance and are not drawn. */
  cobblesShownWithin: 70,
  /** A rock is drawn with its simpler shape beyond this distance. */
  simplerBeyond: 36,
} as const;
