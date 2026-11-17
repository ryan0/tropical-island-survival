// Distances are metres. The wave mesh's rows are measured off the ocean beach, along the reef
// (negative up the beach); the lagoon shore band's on the land side of the water's
// edge (negative out into the lagoon).

/** Rows `spacing` apart, from where the stretch before ended down to `to`. */
export interface RowStretch {
  to: number;
  spacing: number;
}

export const waterConfig = {
  /** The side of the flat sheet of sea that follows the player out to the horizon. */
  farSeaSize: 6500,

  waveMesh: {
    /** The ring is cut round the atoll into this many sectors... */
    sectors: 16,
    /** Columns round the ring: a multiple of four times the sectors, for the coarse levels. */
    columns: 640,
    /**
     * The columns are closer together to the south, where the swell is biggest: up to 1 + `extra`
     * times as close, rising between directions that face `from` and `to` south (the sine of the
     * direction: 1 due south, -1 due north).
     */
    southernColumns: { extra: 1.6, from: -0.4, to: 0.8 },

    /**
     * The rows, from the open sea inwards, by distance along the reef: metres off the ocean beach
     * as the reef lies due south (island-shape/shore.glsl has its zones; round the north the same
     * rows lie closer together). They carry swell, the back of a breaking wave and lines of white
     * water; the breaking wave's front is not theirs but the breaker's own mesh's (breaker.ts), so
     * they need be no closer where the swell breaks than a wave's narrowed crest asks. They are
     * closest at the waterline. water.frag.glsl cuts the matching hole in the far sea and waves.glsl fades the swell
     * out over the last `swellFadesOver` metres before the outer edge.
     */
    rows: {
      outerEdge: 262,
      swellFadesOver: 33,
      /** Out at sea each gap is the one before divided by `shrinkFactor`, down to the least... */
      openSea: { firstSpacing: 4.8, shrinkFactor: 1.1, leastSpacing: 0.8 },
      /** ...as far as here, where the stretches begin. */
      stretchesFrom: 168,
      stretches: [
        // where the waves stand up and break, on the upper fore reef and the crest's outer edge
        // (the rows further in are spaced on from its last row: 0.568 leaves them where they were tuned)
        { to: 134, spacing: 0.568 },
        // the crest: white water
        { to: 118, spacing: 0.7 },
        // the gardens
        { to: 45, spacing: 1.1 },
        // the shallows
        { to: 7, spacing: 0.8 },
        { to: 1.6, spacing: 0.2 },
        // the waterline
        { to: -1.6, spacing: 0.1 },
        { to: -4, spacing: 0.3 },
        { to: -9, spacing: 1 },
      ] satisfies RowStretch[],
      innerEdge: -9,
    },

    /**
     * ...and each sector across into tiles, at these distances along the reef, from the open sea
     * inwards: the crest and all outside it; the gardens; the shallows and the beach. A tile out of
     * view is not drawn, and each is drawn as finely as its own distance from the eye calls for:
     * from the beach the break, 150 m off, is not drawn at its finest, and from the reef the
     * waterline is not. (The mesh's vertex shader is the dearest thing in the scene: on the phone,
     * whole sectors at their finest cost ten frames a second of sixty.)
     */
    cutAcrossAt: [118, 45],
    /** Each tile exists at three levels of detail: every point, every 2nd, every 4th each way. */
    detailStrides: [1, 2, 4],
    /** A tile shows the finest while the nearest of its probe points is this near the camera... */
    finestDetailWithin: 60,
    /** ...and the next this near. */
    middleDetailWithin: 220,

    /** A tile's probe points lie over it no further apart than this, along the reef. */
    probesAtMostApart: 50,
    /** It is drawn only if a ball this big round one of them is in view. */
    probeRadius: 32,
  },

  lagoonShoreBand: {
    /** It is shown only while the wind is stronger than this: in a high wind. */
    shownAboveWind: 0.705,
    /**
     * A piece is drawn only while the eye is within this distance of its bounds. water.frag.glsl
     * leaves the gap for the band in the flat sea within the same distance: change them together.
     */
    shownWithin: 150,
    /**
     * The rows: closest near the edge, where the waves stand up and break. water.frag.glsl and
     * lagoon-shore-band.vert.glsl expect the band to reach from 2.5 m up the beach to 13 m out.
     */
    rows: {
      first: 2.5,
      stretches: [
        { to: -6.2, spacing: 0.4 },
        { to: -13.3, spacing: 0.7 },
      ] satisfies RowStretch[],
      last: -13.3,
    },
    /** Columns about this far apart along the shore... */
    columnSpacing: 1.3,
    /** ...and round the sandbank, along a circle this far from its middle (about halfway out). */
    sandbankColumnsAt: 25,
    /** The band is cut into pieces of this many columns, each drawn or left out on its own. */
    columnsPerPiece: 24,
  },
} as const;
