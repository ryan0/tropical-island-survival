// Distances are metres, times seconds, angles radians.

/** One family of swell lines shaded on the open sea, as rings round the island. */
export interface OpenSeaLines {
  /** Radians a second: the period is a full turn divided by this. */
  frequency: number;
  /** How many crests fit round the island; the sign is the way the pattern turns. */
  crests: number;
  phase: number;
  /** How strongly the lines show. */
  amplitude: number;
  /** How quickly the family swells and fades. */
  setPace: number;
  /** An offset that makes the lines differ from family to family. */
  variety: number;
}

/** One swell arriving from the open sea. */
export interface Swell {
  /** Seconds from one crest to the next. */
  period: number;
  /** The way it travels, as (x, z) of length 1: (0, -1) is northwards, from the south. */
  towards: readonly [number, number];
  /**
   * Its full size in deep water. A middling wave is about as high as this, a wave of the biggest
   * set half as high again: 0.9 is a one-metre swell. The south side gets all of it, the sheltered
   * north side about two thirds.
   */
  size: number;
  /** An offset that gives the swell its own sets, and its waves their own peaks along the crest. */
  variety: number;
  /** How far its swash runs up the beach, relative to the other's. */
  runUp: number;
  /** 1: its waves throw a lip where the floor rises abruptly. 0: they always crumble. */
  canPlunge: 0 | 1;
}

export const seaConfig = {
  /** Height of the still sea surface. */
  level: 0,

  /**
   * The swells the wave model draws. The main one from the south: a wave every ten seconds, in
   * sets of four or five (wave-timing/timing.glsl). A smaller, quicker one across it from the
   * south-south-west, which never throws a lip: it gives the beach a second rhythm, and peaks
   * where the two cross.
   */
  swells: [
    { period: 10, towards: [0, -1], size: 0.9, variety: 0.0, runUp: 0.2, canPlunge: 1 },
    { period: 7.4, towards: [0.309, -0.951], size: 0.22, variety: 2.1, runUp: 0.1, canPlunge: 0 },
  ] satisfies Swell[],

  /**
   * The sea floor as the waves know it: a picture of its depth, and of how long each swell takes to
   * reach every spot of it (sea-floor-pictures.ts).
   */
  floorPicture: {
    /** Metres across, centred on the atoll: it reaches past the wave mesh on every side. */
    span: 1024,
    /** Dots across: 2 m each. */
    size: 512,
    /**
     * The depth is averaged over this many dots each way, 10 m in all: a wave feels the floor over
     * some metres, not each spur and groove of the fore reef, which would break it raggedly.
     */
    smoothedOver: 2,
    /** Times before and after a crossing are kept up to this many seconds. */
    longestKept: 30,
  },

  /**
   * The picture of where the main swell's crest lies, for the breaker's own mesh (crest-picture.ts).
   */
  crestPicture: {
    /** Dots across, one for each direction round the atoll: about a metre apart on the reef's edge. */
    directions: 2048,
    /**
     * Dots down, one for each moment from `secondsBefore` the swell crosses the line its waves break
     * on to `secondsAfter`. The two together must be longer than the main swell's period, so that
     * there is always a crest in the picture.
     */
    moments: 128,
    secondsBefore: 7,
    secondsAfter: 7,
    /** The crest is looked for this far either side of that line, at steps this long (metres). */
    lookedForWithin: 60,
    lookedForEvery: 0.5,
  },

  /**
   * The picture of the breaking wave's front in cross-section, for the breaker's own mesh
   * (breaker-shapes.ts): dots across, one for each place along the front from its foot to its
   * back, and dots down, one for each stage of its breaking from `firstStage` to `lastStage`
   * (wave-timing/timing.glsl says what a stage is).
   */
  breakerShapes: {
    places: 64,
    stages: 64,
    firstStage: -1.4,
    lastStage: 2.4,
  },

  /** The breaker's own mesh (breaker.ts). */
  breaker: {
    /** Rows across the wave's front, from the trough ahead of it to the end of its back. */
    rows: 40,
    /** Its columns are this far apart along the crest (metres). */
    columnsApart: 1.2,
    /** It is cut into pieces of this many columns; a piece out of view is not drawn. */
    columnsInAPiece: 48,
    /** The crest it draws is never further than this from the line the waves break on (metres). */
    reachFromLine: 45,
  },

  /**
   * Shorter swell lines far out, beyond the wave mesh: shaded, not modelled (water.frag.glsl). They
   * give the open sea its variety of period and height.
   */
  openSeaLines: [
    { frequency: 1.21, crests: 5, phase: 0.0, amplitude: 0.46, setPace: 0.09, variety: 0.0 },
    { frequency: 1.61, crests: -7, phase: 2.1, amplitude: 0.13, setPace: 0.117, variety: 2.1 },
    { frequency: 0.885, crests: 3, phase: 4.2, amplitude: 0.3, setPace: 0.144, variety: 4.2 },
  ] satisfies OpenSeaLines[],

  /**
   * About where the swell breaks, on the upper fore reef: metres off the beach, along the reef
   * (island-shape/shore.glsl). The spray looks for breaking waves round it.
   * (Where a wave really breaks is the sea floor's to say: sea-floor-pictures.ts.)
   */
  reefBreak: 150,

  /** Out at sea a longer, slower swell that the reef's wave model does not carry: its height. */
  longSwell: 0.5,

  /** How far the eye can see, as the fog's near and far distances: in air, and under water. */
  fogInAir: [220, 2600],
  fogUnderWater: [0.5, 55],
  /** Bubbles rising round the camera while it is under water. */
  bubbles: 46,
} as const;
