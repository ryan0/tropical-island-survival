// Distances are metres, times seconds, angles radians.

/** One train of the swell, wrapped round the island. */
export interface WaveTrain {
  /** Radians a second: the period is a full turn divided by this. */
  frequency: number;
  /** How many crests fit round the island; the sign is the way the pattern turns. */
  crests: number;
  phase: number;
  /** In deep water. The south side gets all of it, the sheltered north side about two thirds. */
  amplitude: number;
  /** How quickly the train swells and fades, which is what makes sets. */
  setPace: number;
  /** An offset that makes the waves differ in size from crest to crest and along a crest. */
  variety: number;
  /** How far its swash runs up the beach, relative to the others. */
  runUp: number;
  /** 1: it may plunge with a falling lip when steep enough. 0: it always spills. */
  canPlunge: 0 | 1;
}

/** One swell arriving from the open sea. */
export interface Swell {
  /** Seconds from one crest to the next. */
  period: number;
  /** The way it travels, as (x, z) of length 1: (0, -1) is northwards, from the south. */
  towards: readonly [number, number];
}

export const seaConfig = {
  /** Height of the still sea surface. */
  level: 0,

  /**
   * The swells. Two from nearly the same quarter whose periods differ a little: they beat, so a
   * set of bigger waves comes round every 45 s (1 / (1/9 - 1/11.25)), with a wave about every 10 s.
   */
  swells: [
    { period: 9, towards: [0, -1] },
    { period: 11.25, towards: [0.309, -0.951] },
  ] satisfies Swell[],

  /**
   * The sea floor as the waves know it: a picture of its depth, and of how long each swell takes to
   * reach every spot of it (sea-floor-pictures.ts).
   */
  floorPicture: {
    /** Metres across, centred on the atoll: it reaches past the wave mesh on every side. */
    span: 640,
    /** Dots across: 1.25 m each. */
    size: 512,
    /**
     * The depth is averaged over this many dots each way, 9 m in all: a wave feels the floor over
     * some metres, not each spur and groove of the reef's edge, which would break it raggedly.
     */
    smoothedOver: 3,
    /**
     * A wave breaks where the water is about as shallow as the wave is high. The picture keeps, for
     * four depths, how long ago the swell first crossed water that shallow: small waves break at
     * the first depths, set waves at the last.
     */
    breakDepths: [0.7, 1.2, 1.7, 2.4],
    /** Times before and after a crossing are kept up to this many seconds. */
    longestKept: 30,
  },

  /** The swell: three trains. The wave shader and the program's copy of it both read this. */
  waveTrains: [
    {
      frequency: 1.21,
      crests: 5,
      phase: 0.0,
      amplitude: 0.46,
      setPace: 0.09,
      variety: 0.0,
      runUp: 0.14,
      canPlunge: 1,
    },
    {
      frequency: 1.61,
      crests: -7,
      phase: 2.1,
      amplitude: 0.13,
      setPace: 0.117,
      variety: 2.1,
      runUp: 0.1,
      canPlunge: 0,
    },
    {
      frequency: 0.885,
      crests: 3,
      phase: 4.2,
      amplitude: 0.3,
      setPace: 0.144,
      variety: 4.2,
      runUp: 0.12,
      canPlunge: 1,
    },
  ] satisfies WaveTrain[],

  /**
   * The swell breaks on the outer edge of the reef flat, which is about 46 m wide. The wave model
   * treats a line this far off the beach as the place where the water runs out, so small waves
   * break about 3 m outside it and the biggest about 8 m outside, right on top of the drop-off.
   */
  reefBreak: 40,

  /** Out at sea a longer, slower swell that the reef's wave model does not carry: its height. */
  longSwell: 0.5,

  /** How far the eye can see, as the fog's near and far distances: in air, and under water. */
  fogInAir: [220, 2600],
  fogUnderWater: [0.5, 55],
  /** Bubbles rising round the camera while it is under water. */
  bubbles: 46,
} as const;
