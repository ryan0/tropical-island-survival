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
   * The ground's height as a picture, which the water's shader can read in place of the island's
   * formula (floor-height-picture.ts): the square it covers, centred on the atoll and reaching past
   * the wave mesh on every side, and its dots across, half a metre each.
   */
  floorHeightPicture: { span: 1024, size: 2048 },

  /**
   * The shore in each direction from the centre, as a picture one dot high, which the water's
   * shader reads in place of the shore's formula (shore-round-picture.ts): its dots across, and
   * the radius its shoreline is measured from (about the atoll's own, so that the numbers kept
   * are small).
   */
  shoreRoundPicture: { size: 4096, radiusKeptFrom: 150 },

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
    stages: 96,
    firstStage: -1.4,
    lastStage: 3.4,
  },

  /** The breaker's own mesh (breaker.ts). */
  breaker: {
    /** Its columns are this far apart along the crest (metres). */
    columnsApart: 1.2,
    /** It is cut into pieces of this many columns; a piece out of view is not drawn. */
    columnsInAPiece: 48,
    /**
     * Each piece exists at three levels of detail, the finest first: so many rows across the
     * wave's front, from the trough ahead of it to the end of its back, and every so many of its
     * columns.
     */
    levels: [
      { rows: 40, everyColumn: 1 },
      { rows: 28, everyColumn: 2 },
      { rows: 18, everyColumn: 4 },
    ],
    /** A piece shows the finest while the eye is this near it (metres), and the next this near. */
    finestWithin: 70,
    middleWithin: 200,
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

  /** How far the eye can see in air, as the fog's near and far distances. */
  fogInAir: [220, 2600],

  /**
   * The picture of what is under the sea, which the sea's surface reads (under-water-picture.ts).
   */
  underWaterPicture: {
    /**
     * Its size as a share of the screen's, each way. Larger is sharper under shallow water (the
     * net of light most of all) and dearer: every dot of it is a dot of the scene coloured again.
     */
    shareOfScreen: 0.5,
    /**
     * A thing whose lowest point is this far above the still sea (m) is never drawn into it: no
     * wave stands so high where anything stands.
     */
    clearOfTheSea: 1.5,
    /**
     * With the debug panel's `steady raising` on, the raising is worked out for an eye that
     * follows the real one's height over the water under it this slowly (the share of the way a
     * second, at first): a step's bob and a wave ridden are over before it has moved.
     */
    steadyRaisingFollows: 0.35,
  },

  /**
   * The water's own colour to an eye under it, looking level: what everything fades into with
   * distance (shaders/shared/through-water.glsl has how fast). Red, green, blue from 0 to 1, as
   * photographs taken under water measure them (docs/LOOK.md, "Under water").
   */
  underWater: {
    /** Over pale sand a few metres down the water is lit from below as well: a bright turquoise. */
    colourOverSand: [0.23, 0.55, 0.635],
    /** Over deep water it is a darker, purer blue. */
    colourOverDeep: [0.0, 0.42, 0.615],
    /** The floor's depth under the eye at which the one begins to give way to the other, and has. */
    sandLightsItTo: 2.5,
    deepFrom: 14,
    /** How much of its light it keeps with the sun on the horizon, and how much it loses at night. */
    lightAtSunset: 0.5,
    nightDimming: 0.55,
    /** Under a cloud across the sun it keeps this much. */
    lightUnderCloud: 0.8,
  },

  /**
   * Shafts of sunlight hanging in the water, seen from under it (light-shafts.ts): ripples on the
   * surface gather the sun's light into them. Each hangs from a spot of its own in a square of a
   * grid on the surface, and the grid repeats over the whole sea. The copy of it round the eye is
   * drawn, and a shaft has faded out before it reaches that copy's edge, so none ever pops in.
   */
  lightShafts: {
    /** How much of the light gathered over a shaft's spot is its own, so that neighbours are not alike. */
    ownShare: 0.4,
    /** How far a shaft leans from the light's own way as a ripple tilts over it (a slope). */
    sway: 0.05,
    /** Its light comes in over this far below the surface. */
    comesInOver: 0.25,
    /** The sun's colour is tinted this way, towards the water's. */
    tint: [0.75, 1.0, 0.95],
    /**
     * Full from this height of the sun (the upward part of the unit vector towards it): there are
     * none with the sun at the horizon.
     */
    fullWithSunAbove: 0.35,

    /**
     * Two kinds, as the photographs have them (docs/LOOK.md, "Under water"). For each:
     * - squareSize, squaresAcross: the grid's squares, metres on a side, and how many on a side (so
     *   many shafts in all, their square). The grid reaches half its width either side of the eye:
     *   past that none shows, whatever `far` says.
     * - width, length: each shaft's lie between these; most are nearer the thin end.
     * - showsFrom: a shaft shows from this much light gathered over its spot by the ripples
     *   passing (0 to 1, a half on average) and is at its brightest by the second.
     * - fadesAMetre: the share of its light it loses with each metre down.
     * - near: gone this near the eye and whole from the second distance, so that the eye is never
     *   inside a bright sheet. far: whole as far as the first distance, gone by the second.
     * - brightest: the most it adds to the picture looking across it, as a share of white.
     * - acrossTheLight: how strongly it shows looking across the light, where looking towards
     *   the sun is 1.
     * - mostThrough: looking nearly along a shaft the eye sees through more of it: at most so
     *   many times as bright.
     */
    kinds: {
      /** Broad soft shafts: from the side, slanting bands of light. As thin lines they read as scratches. */
      broad: {
        squareSize: 1.25,
        squaresAcross: 20,
        width: [0.2, 1.0],
        length: [7, 14],
        showsFrom: [0.42, 0.9],
        fadesAMetre: 0.17,
        near: [0.5, 1.4],
        far: [6, 14],
        brightest: 0.2,
        acrossTheLight: 0.2,
        mostThrough: 3,
      },
      /**
       * Fine rays close round the line from the eye to the sun: looking up, the burst of streaks
       * about the sun. From the side they do not show.
       */
      fine: {
        squareSize: 0.42,
        squaresAcross: 22,
        width: [0.03, 0.13],
        length: [5, 10],
        showsFrom: [0.38, 0.8],
        fadesAMetre: 0.2,
        near: [0.3, 0.9],
        far: [3, 4.6],
        brightest: 0.2,
        acrossTheLight: 0.03,
        mostThrough: 7,
      },
    },
  },

  /**
   * Fine pale specks hanging in the water round the camera while it is under: marine snow
   * (under-water-specks.ts). They drift slowly with the water and stream past as the eye moves
   * through it, which shows that the water has depth.
   */
  specks: {
    count: 900,
    /**
     * Each has a home in a box this many metres across and deep, which repeats through the water;
     * it is drawn in the copy of the box round the camera.
     */
    box: { across: 12, deep: 6 },
    /**
     * A speck fades as it nears the box's sides, top or bottom, over this share of the way out
     * from the middle, so that it is gone before it leaves one side for the other.
     */
    edgeFade: 0.25,
    /** The water's slow drift, which carries all of them: metres a second, (x, y, z). With the wind. */
    drift: [-0.03, 0, 0.012],
    /**
     * Each wanders this far (metres) about its drifting place, taking between these numbers of
     * seconds to sway once.
     */
    wander: 0.08,
    wanderSeconds: [12, 24],
    /** The fastest any sinks, metres a second; most sink more slowly. */
    sinking: 0.005,
    /**
     * How big each is across, smallest and largest (metres): about 1.5 to 5 pixels at a metre away
     * in a picture 560 pixels high that spans 60 degrees. Most are small.
     */
    size: [0.004, 0.012],
    /** Nearer than this (metres) a speck grows no bigger, so that one passing the eye is not a blob. */
    sizedNoNearerThan: 0.5,
    /** A speck fades as it comes nearer than the second distance, and is gone at the first. */
    fadesNear: [0.25, 0.6],
    /** A speck fades as it goes further than the first distance, and is gone at the second. */
    fadesFar: [3, 9],
    /**
     * None is drawn within the first distance (metres) of the surface over the camera; one fades in
     * over the second below that.
     */
    clearOfSurface: 0.1,
    fadesUnderSurface: 0.2,
    /** The most opaque any is; most are much fainter. */
    opacity: 0.65,
    /** Their colour in full day: pale, a little blue-green. */
    colour: [0.78, 0.9, 0.86],
    /** The share of their brightness in full day that they keep with the sun just down, and at night. */
    lightAtSunset: 0.5,
    lightAtNight: 0.15,
  },
} as const;
