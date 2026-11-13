// The coconut palms. Sizes and distances are metres; a height is the ground's, above still sea
// level. A palm's size is a multiple of its shape as given here. Colours are red, green, blue,
// multiplying the pictures'; angles are radians.

/** The four shapes of trunk, in the order they are built and drawn. */
export const TRUNK_KINDS = ['ordinary', 'tall', 'leaning', 'young'] as const;

export type TrunkKind = (typeof TRUNK_KINDS)[number];

type Rgb = readonly [number, number, number];

/** A point in a trunk's own upright plane: x outwards, y up from where it meets the ground. */
type PlanePoint = readonly [x: number, y: number];

/** A number drawn at random, from `from` up to `range` more. */
export interface Spread {
  from: number;
  range: number;
}

export interface TrunkConfig {
  /** The line of the trunk: a curve from its foot, drawn towards `bend`, to its top. */
  foot: PlanePoint;
  bend: PlanePoint;
  top: PlanePoint;
  /** How thick it is, as a multiple of the usual. */
  girth: number;
  size: Spread;
  /** It leans at random by up to half this either way, on top of the lean of its shape. */
  lean: number;
  /** The size of its crown, at random or always the same. */
  crown: Spread | { always: number };
  /** Its fronds' size, as a multiple of the crown's. */
  frondSize: number;
}

/** How a palm of one kind is chosen: it is the first whose bound its random number is below. */
export interface KindChance {
  kind: TrunkKind;
  below: number;
}

export interface TrunkDetail {
  segmentsAlong: number;
  segmentsRound: number;
  coconutSegmentsRound: number;
  coconutSegmentsDown: number;
}

/** A tier of fronds: how steeply they stand out from the crown, how big and what colour they are. */
export interface FrondTier {
  pitch: number;
  size: number;
  tint: Rgb;
}

export const palmsConfig = {
  /** At most this many palms are planted, in at most this many tries; three more stand on the sandbank. */
  count: 200,
  tries: 60000,
  /** They grow on ground between these heights. */
  ground: [1.5, 8],
  /** No two palms stand closer than this. */
  apart: 2.7,
  /** No palm stands this near the hut, the footpaths or a rock. */
  clearOfHut: 6,
  clearOfPaths: 2.2,
  clearOfRocks: 0.4,
  /** A spot is planted with this chance, and up to `plantedNearHome` more the nearer home it is. */
  plantedAnywhere: 0.35,
  plantedNearHome: 0.65,
  /** Where the sandbank's palms stand, from its middle: x, z. */
  onTheSandbank: [
    [2, 1],
    [-4, -2],
    [1, 6],
  ],

  /** Ground lower than this is the edge of the beach. */
  beachBelow: 2.7,
  // Palms at the edge of the beach mostly lean out over it; inland they grow tall to reach the light.
  kindsOnTheBeach: [
    { kind: 'leaning', below: 0.55 },
    { kind: 'young', below: 0.75 },
    { kind: 'ordinary', below: 0.9 },
    { kind: 'tall', below: 1 },
  ] satisfies readonly KindChance[],
  kindsInland: [
    { kind: 'tall', below: 0.4 },
    { kind: 'ordinary', below: 0.78 },
    { kind: 'young', below: 0.9 },
    { kind: 'leaning', below: 1 },
  ] satisfies readonly KindChance[],
  /** A leaning palm on the beach leans out to sea, turned at random by up to half this either way. */
  seawardSpread: 1.2,

  trunks: {
    /** A gentle curve. */
    ordinary: {
      foot: [0, -0.4],
      bend: [0.2, 3.6],
      top: [1.7, 7.0],
      girth: 1.0,
      size: { from: 0.72, range: 0.55 },
      lean: 0.22,
      crown: { from: 0.92, range: 0.2 },
      frondSize: 1,
    },
    /** Tall and slender, nearly straight. */
    tall: {
      foot: [0, -0.4],
      bend: [0.9, 5.2],
      top: [0.7, 10.0],
      girth: 0.85,
      size: { from: 0.72, range: 0.55 },
      lean: 0.22,
      crown: { from: 0.92, range: 0.2 },
      frondSize: 1,
    },
    /** Leaning far out, then turning up. Its shape leans enough; it leans less at random. */
    leaning: {
      foot: [0, -0.4],
      bend: [2.9, 1.7],
      top: [4.6, 6.4],
      girth: 1.0,
      size: { from: 0.72, range: 0.55 },
      lean: 0.12,
      crown: { from: 0.92, range: 0.2 },
      frondSize: 1,
    },
    /** Young: short and stout, with big fronds for its size. */
    young: {
      foot: [0, -0.3],
      bend: [0.1, 1.3],
      top: [0.5, 2.7],
      girth: 1.25,
      size: { from: 0.8, range: 0.55 },
      lean: 0.22,
      crown: { always: 1.05 },
      frondSize: 1.15,
    },
  } satisfies Record<TrunkKind, TrunkConfig>,
  /** The trunks close up, and the simpler ones drawn further away. */
  trunkDetail: {
    full: { segmentsAlong: 12, segmentsRound: 7, coconutSegmentsRound: 8, coconutSegmentsDown: 6 },
    simpler: {
      segmentsAlong: 5,
      segmentsRound: 5,
      coconutSegmentsRound: 5,
      coconutSegmentsDown: 4,
    },
  } satisfies Record<string, TrunkDetail>,
  /** Coconuts hang under the crown, set round the trunk this far apart (in radians) and out from it. */
  coconuts: {
    count: 3,
    radius: 0.21,
    /** How much taller a coconut is than it is wide. */
    tallness: 1.15,
    apart: 2.1,
    out: 0.3,
    belowTop: 0.4,
    colour: [0.76, 0.82, 0.42],
  },

  fronds: {
    perPalm: 20,
    /** Frond by frond, they wind this many times round the crown. */
    turnsRound: 3,
    /** They spring from this far below the top of the trunk. */
    belowTop: 0.05,
    length: 4.6,
    halfWidth: 1.3,
    /** A frond's strip is made of this many pieces along its length, and fewer further away. */
    pieces: 10,
    piecesFromAfar: 5,
    /**
     * Four tiers, frond by frond in turn: a spear and young fronds standing up, bright; the
     * spreading crown; a skirt hanging down; and old yellowing fronds against the trunk.
     */
    tiers: [
      { pitch: 0.95, size: 0.72, tint: [1.05, 1.08, 0.86] },
      { pitch: 0.48, size: 1, tint: [1, 1, 0.92] },
      { pitch: 0.05, size: 1, tint: [1, 1, 0.92] },
      { pitch: -0.62, size: 0.86, tint: [1.08, 1.0, 0.7] },
    ] satisfies readonly FrondTier[],
    /** On this share of palms every other old frond is dead and brown. */
    shareOfPalmsWithDeadFronds: 0.6,
    deadTint: [1.5, 0.92, 0.5],
    /** Each frond is pitched and rolled at random by up to half these either way... */
    pitchSpread: 0.36,
    rollSpread: 0.5,
    /** ...and turned round the crown by up to this more. */
    turnSpread: 0.6,
    size: { from: 0.88, range: 0.24 },
    /** How much more or less a frond arches than the strip's own shape. */
    arch: { from: 0.85, range: 0.3 },
    brightness: { from: 0.8, range: 0.32 },
  },

  /** How far a palm, fronds and all, can reach from its foot. */
  reach: 13,
  /** Palms are drawn with their simpler shapes from this distance on. */
  simplerBeyond: 50,
  cellSize: 32,
} as const;
