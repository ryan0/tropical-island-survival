import type { Range } from '../../core/random';

// Lengths are metres of sea floor, seen from straight above. The sizes are those of the photographs of
// reef pavement and lagoon sand in reference-photos/sea-floor and reference-photos/coral.

/** Smooth noise made of octaves: its broadest cells and its finest, in metres, and how much weaker each finer octave is. */
export interface Octaves {
  broadest: number;
  finest: number;
  /** The broadest octave's value either way. */
  amplitude: number;
  falloff: number;
}

export const seaBedConfig = {
  /** Dots along each side. A power of two, so that the picture wraps by a mask and can be mipmapped. */
  size: 1024,
  /** Metres one repeat covers: a dot is then about 4 mm. */
  span: 4,

  /** The most anisotropic filtering asked of the graphics card for it: dearer the higher. */
  mostAnisotropy: 4,

  /** Alpha: the hard floor's height, before it is turned into ranks. Heights are metres. */
  relief: {
    /** Regions a metre or two across stand higher or lower, so that the share of rock wanders. */
    broadSwell: { broadest: 1, finest: 0.5, amplitude: 0.09, falloff: 0.5 } satisfies Octaves,
    /**
     * Old coral heads cemented into the pavement: rounded knobs and low humps. One is tried in each square
     * of a grid this many metres a side, and this share of the squares is left empty, for pools.
     */
    heads: {
      spacing: 0.32,
      emptyShare: 0.14,
      /** The smallest and largest radius: most are small, for `smallBias` above 1 draws towards the smallest. */
      radius: [0.1, 0.45] satisfies Range,
      smallBias: 1.6,
      /** Height as a share of the radius, the least and the most: a head is a low dome, not a ball. */
      heightPerRadius: [0.25, 0.75] satisfies Range,
      /** Below 1 a dome is flat-topped with steep sides, a ledge; at 1 it is round. */
      flatness: [0.25, 0.9] satisfies Range,
      /**
       * A head is a cluster of domes, as old coral grew and was cemented: its own and this many
       * lobes, each of a share of its radius and height, within a share of its radius of its middle.
       */
      lobes: [1, 4] satisfies Range,
      lobeRadius: [0.35, 0.75] satisfies Range,
      lobeHeight: [0.55, 1] satisfies Range,
      lobeReach: 0.7,
    },
    /**
     * Each outline is pushed about by noise, so that edges are ragged at every size from lobes of a
     * hand's width down to a centimetre.
     */
    ragged: { broadest: 0.12, finest: 0.03, amplitude: 0.035, falloff: 0.7 } satisfies Octaves,
    /** How much of that a lump's or a hole's outline is pushed, at most: a small one less. */
    bumpRaggedness: 0.6,
    /** Gutters cut between the heads: how many, how wide and how long, and how deep. */
    gutters: {
      count: 18,
      width: [0.1, 0.36] satisfies Range,
      length: [0.3, 1] satisfies Range,
      depth: [0.06, 0.16] satisfies Range,
      /** How fast a gutter turns as it runs, radians a metre either way, and the chance it forks. */
      turning: 3,
      forkChance: 0.5,
    },
    /** Small lumps of rubble and of old coral, on the heads and between them: count a square metre, radius, height. */
    lumps: {
      perSquareMetre: 60,
      radius: [0.01, 0.06] satisfies Range,
      height: [0.01, 0.06] satisfies Range,
    },
    /** Holes in the rock, where sand gathers when little else of the rock is under it. */
    holes: {
      perSquareMetre: 9,
      radius: [0.015, 0.07] satisfies Range,
      depth: [0.03, 0.1] satisfies Range,
    },
    /**
     * Knobs of 2 to 8 cm over everything, rounded on top with creases between (the noise's size
     * taken either way), so that the rock is knobbly and no outline is a smooth curve.
     */
    knobs: { broadest: 0.06, finest: 0.016, amplitude: 0.022, falloff: 0.6 } satisfies Octaves,
  },

  /** Red: the hard floor's light and dark, about 0.5 on average. */
  shade: {
    /** Every dot a little lighter or darker than the next: the fuzz of turf, the grain of the rock. */
    speckle: 0.11,
    /** The mottle of turf algae, a few centimetres across. */
    mottle: { broadest: 0.06, finest: 0.03, amplitude: 1, falloff: 0.7 } satisfies Octaves,
    mottleShade: 0.1,
    /**
     * Pores and pits over all the rock, one to three dots across: where fine noise is lowest a pore
     * goes nearly black; where it is highest a fleck goes pale.
     */
    pores: { broadest: 0.016, finest: 0.008, amplitude: 1, falloff: 0.8 } satisfies Octaves,
    poreLevel: [-0.6, -1.05] satisfies Range,
    poreDark: 0.45,
    fleckLevel: [0.8, 1.15] satisfies Range,
    fleckLight: 0.3,
    /**
     * The fine relief shows in the light and dark too: a knob's top paler, the crevice under its edge
     * darker, for each metre it stands above or lies below the floor within `reach`.
     */
    fineRelief: { lightPerMetre: 6, darkPerMetre: 22, reach: 0.03 },
    /** Clusters of bore holes: how many clusters, holes in each, how far they spread, each hole's radius, its dark. */
    boreHoles: {
      clusters: 140,
      holesEach: [4, 18] satisfies Range,
      spread: [0.03, 0.12] satisfies Range,
      radius: [0.0025, 0.01] satisfies Range,
      shade: [0.03, 0.12] satisfies Range,
    },
    /** Grooves an urchin wears in the rock. */
    urchinGrooves: {
      count: 6,
      width: [0.03, 0.06] satisfies Range,
      length: [0.1, 0.3] satisfies Range,
      shade: 0.25,
    },
    /** Thin dark cracks. */
    cracks: {
      count: 26,
      length: [0.08, 0.4] satisfies Range,
      width: 0.004,
      darken: 0.18,
    },
  },

  /** Green: what covers the hard floor, as a place on the shader's ramp of colours. */
  cover: {
    /** Patches of turf and old rock, from the darkest turf to the plainest rock, in patches of these sizes. */
    patchwork: {
      range: [0.08, 0.56] satisfies Range,
      octaves: { broadest: 0.5, finest: 0.12, amplitude: 1, falloff: 0.6 } satisfies Octaves,
    },
    /** Turf grows thickest down the sides of a gutter: the place on the ramp drops this much a metre below the floor round it. */
    gutterTurfPerMetre: 3,
    gutterReach: 0.1,
    /**
     * Crust of coralline alga, in sheets that run together along the tops of the knobs and break up
     * into flecks: it lies where the old-rock side of the patchwork, the standing of the floor above
     * the floor round it and its fine relief, weighed together, pass `level`. The weights are a share
     * of the patchwork's spread for each metre of standing or of fine relief.
     */
    crust: {
      level: 0.6,
      edge: 0.06,
      standingWeight: 9,
      fineReliefWeight: 10,
      /** Turf overgrows it in places: the weight of the turf's mottle against it. */
      turfWeight: 0.3,
      /** Its inside, from old rock to pink, as the mottle has it. */
      place: [0.6, 0.8] satisfies Range,
      /** Old rock round a crust, this far below its level, so that crust passes to turf by rock, not by khaki. */
      rockBelow: 0.35,
      rockPlace: 0.5,
      /** A pale growing edge, on the part of the edges where the turf's mottle is lightest. */
      paleEdgeLift: 0.15,
    },
    /** Clusters of a parrotfish's bites, pale and fresh. */
    bites: {
      clusters: 34,
      bitesEach: [3, 12] satisfies Range,
      spread: [0.03, 0.1] satisfies Range,
      length: [0.01, 0.03] satisfies Range,
      place: [0.9, 1] satisfies Range,
    },
    /** Small low coral colonies, sitting on heads. */
    colonies: {
      count: [6, 10] satisfies Range,
      radius: [0.04, 0.15] satisfies Range,
      height: [0.02, 0.06] satisfies Range,
      place: [0.2, 0.3] satisfies Range,
      /** A colony is a cluster of this many rounded lumps. */
      lumps: [3, 8] satisfies Range,
      /** The pale growing rim, as a share of the radius, and how much lighter it is. */
      rim: 0.18,
      rimLift: 0.06,
    },
    /** Pieces of dead white coral lodged in the gutters: sticks and lumps. */
    deadCoral: {
      count: 40,
      length: [0.03, 0.12] satisfies Range,
      /** Width as a share of length: a stick is narrow, a lump nearly round. */
      widthShare: [0.2, 0.8] satisfies Range,
      height: [0.01, 0.03] satisfies Range,
      place: [0.85, 1] satisfies Range,
      /** Tried this many times each to find a place lower than the floor round it. */
      tries: 30,
    },
  },

  /** Blue: the relief of lived-in sand, level at `level`. */
  sand: {
    level: 0.35,
    /** Level sand is not dead flat. */
    unevenness: { broadest: 0.06, finest: 0.03, amplitude: 0.025, falloff: 0.6 } satisfies Octaves,
    /** Shrimps' and worms' mounds, cones with rounded shoulders. Most are small, old and slumped; a few big and fresh. */
    mounds: {
      count: 32,
      radius: [0.125, 0.4] satisfies Range,
      smallBias: 1.8,
      freshShare: 0.22,
      oldHeight: [0.05, 0.35] satisfies Range,
      freshHeight: [0.4, 0.65] satisfies Range,
      ventRadius: 0.012,
      ventDepth: 0.12,
      /** How far an outline is pushed about, as a share of the radius. */
      ragged: 0.25,
    },
    /** Funnel pits, most within half a metre of a mound. */
    pits: {
      shareOfMounds: 0.75,
      distance: [0.15, 0.5] satisfies Range,
      radius: [0.05, 0.15] satisfies Range,
      depth: [0.12, 0.35] satisfies Range,
    },
    /**
     * Long trails a creature left: a furrow with low raised sides. It runs in straight stretches,
     * turns suddenly between them and now and then loops; its depth fades in and out along it.
     */
    trails: {
      count: 3,
      length: [1.5, 3.5] satisfies Range,
      width: [0.02, 0.035] satisfies Range,
      depth: 0.03,
      sides: 0.01,
      stretch: [0.08, 0.5] satisfies Range,
      /** How far a stretch bends over its length, radians either way, and a sudden turn between stretches. */
      bend: 0.5,
      turn: [0.3, 1.8] satisfies Range,
      loopChance: 0.12,
      loopRadius: [0.05, 0.12] satisfies Range,
      /** Along this many metres the depth fades between none and full. */
      fadeLength: 0.4,
    },
    /** Coiled heaps of a worm's casts. */
    casts: {
      count: 9,
      radius: [0.015, 0.04] satisfies Range,
      height: 0.12,
      thread: 0.004,
    },
    /** Shallow dishes where a ray fed. */
    rayDishes: { count: 2, radius: [0.15, 0.25] satisfies Range, depth: 0.08, rim: 0.025 },
  },
};
