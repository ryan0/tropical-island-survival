// Lengths are metres of coral. The sizes are measured from the photographs in reference-photos/coral.

export const coralSurfaceConfig = {
  /** Dots along each side of the picture. A power of two, so that the waves in it can wrap by a mask. */
  size: 512,
  /** Metres of coral one repeat of the picture covers: with 512 dots, a dot is about a millimetre. */
  span: 0.5,
  /** The darkest and the lightest any pattern is painted, so that a hollow is never black. */
  tones: [0.1, 0.9] as const,
  /** Each pattern is stretched to fill those tones, all but this share of its dots at each end. */
  stretchBeyond: 0.01,
  /** Dots a side of the coarse grid on which the broad, smooth patterns are worked out before they are enlarged. */
  broadSize: 256,

  /** Red: a brain coral's maze of ridges (Leptoria, Platygyra). */
  brainRidges: {
    /** From one ridge's crest to the next. */
    ridgeSpacing: 0.008,
    /** How many waves make the maze: fewer show a pattern of their own, more cost time at start-up. */
    waveCount: 28,
    /** The size of the regions in which the ridges run side by side. */
    runLength: 0.08,
    /** How strongly the ridges keep to their region's direction: at 0 the maze winds every way. */
    steering: 1.2,
    /** Where a ridge's flank begins to rise and where it reaches the top, from -1 in a valley to 1 on a crest. */
    valleyEdge: -0.95,
    ridgeEdge: 0.1,
    /** How much brighter a ridge is along its crest than on its shoulders: it is rounded. */
    crestHighlight: 0.25,
    /** Where the waves all but cancel, a ridge fades to the middle tone rather than breaking into speckle. */
    weakestWaves: 0.1,
  },

  /** Green: a boulder coral's skin (Porites): a honeycomb of polyps on low smooth lumps. */
  boulderSkin: {
    /** From one polyp's pit to the next. */
    polypSpacing: 0.003,
    /** A pit's radius as a share of that spacing: the rest is the pale wall between pits. */
    pitRadiusShare: 0.6,
    /** The pits' share of the pattern's strength; the lumps have the rest. */
    pitShare: 0.35,
    /** From one lump's top to the next, and a lump's radius as a share of that, the smallest and the largest. */
    lumpSpacing: 0.045,
    lumpRadiusShares: [0.55, 0.75] as const,
    /** Below 1, a lump's top is broad and its fall into the hollows steep. */
    lumpFlatness: 0.5,
  },

  /** Blue: the warts of a cauliflower coral, or the branchlet tips of a table coral. */
  warts: {
    /** From one wart's middle to the next. */
    spacing: 0.0055,
    /** A wart's radius as a share of the spacing, the smallest and the largest: under a half leaves dark gaps between. */
    radiusShares: [0.5, 0.68] as const,
    /** Above 1, a wart's top is a small bright spot; below, a broad cap. */
    topPower: 0.8,
    /** The size of the clumps of higher warts, and how much lower the warts stand between them. */
    clumpSize: 0.025,
    clumpDepth: 0.3,
  },

  /** Alpha: broad blotches, for bite scars, pale growing patches and crusts of pink alga. */
  blotches: {
    /** The broadest blotches' waves, crest to crest; each finer octave is half the size. */
    broadestWave: 0.28,
    octaves: 4,
    wavesPerOctave: 24,
    /** How much weaker each finer octave is: the higher, the more ragged the blotches' edges. */
    octaveFalloff: 0.4,
    /** How far a soft blotch's edge spreads, as a share of the pattern's spread (its typical value). */
    softEdge: 2.2,
    /** How light the soft blotches are at most, beside the crisp-edged patches, which are lightest. */
    softShare: 0.75,
    /**
     * The crisp-edged patches are where the pattern is above this many times its spread (the highest
     * twentieth or so), and how far, in the same measure, their edges spread.
     */
    crispLevel: 1.5,
    crispEdge: 0.08,
  },

  /**
   * Evenly spread points (polyps, warts, lumps) are first scattered one to a square and then pushed
   * apart this many times, so that they are as even as the real thing and show no grid.
   */
  spreadingPasses: 4,
};
