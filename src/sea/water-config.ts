import { seaConfig } from './sea-config';

// Distances are metres. The wave mesh's rows are measured off the ocean beach (outwards from
// island.radius, negative up the beach); the lagoon shore band's on the land side of the water's
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
    /** The ring is cut into this many sectors; a sector out of view is not drawn. */
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
     * The rows, from the open sea inwards. The falling lip is a thin sheet, so they are closest
     * where the swell breaks on the reef edge; the reef flat only has to carry lines of white
     * water. water.frag.glsl cuts the matching hole in the far sea and waves.glsl fades the swell
     * out by the outer edge: change them together.
     */
    rows: {
      outerEdge: 95,
      /** Out at sea each gap is the one before divided by `shrinkFactor`, down to the least... */
      openSea: { firstSpacing: 4.8, shrinkFactor: 1.1, leastSpacing: 0.8 },
      /** ...as far as here, where the stretches begin. */
      stretchesFrom: seaConfig.reefBreak + 13,
      stretches: [
        // where the biggest waves start to stand up
        { to: seaConfig.reefBreak + 10.2, spacing: 0.22 },
        // the break on the reef edge
        { to: seaConfig.reefBreak - 5, spacing: 0.18 },
        { to: seaConfig.reefBreak - 7, spacing: 0.3 },
        // the reef flat
        { to: 7, spacing: 0.5 },
        { to: 1.6, spacing: 0.2 },
        // the waterline
        { to: -1.6, spacing: 0.1 },
        { to: -4, spacing: 0.3 },
        { to: -9, spacing: 1 },
      ] satisfies RowStretch[],
      innerEdge: -9,
    },

    /** Each sector exists at three levels of detail: every point, every 2nd, every 4th each way. */
    detailStrides: [1, 2, 4],
    /** A sector shows the finest while its middle is this near the camera, the next this near. */
    finestDetailWithin: 135,
    middleDetailWithin: 300,

    /** A sector is drawn only if a ball this big round one of its probe points is in view... */
    probeRadius: 32,
    /** ...which lie at these distances off the beach, from the ring's inner edge to its outer. */
    probesOffBeach: [-9, 22, 58, 95],
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
