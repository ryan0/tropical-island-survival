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

export const seaConfig = {
  /** Height of the still sea surface. */
  level: 0,

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
