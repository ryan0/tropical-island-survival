// Distances are metres, times seconds, angles radians. A pair is a range: lowest, highest.
// Ground heights are measured from still sea level, so a negative one is a depth of water.
// The view's yaw is 0 facing north (towards -z) and grows turning left; its pitch is up.

export const playerConfig = {
  start: {
    /** On the ocean beach in front of home: inlandOfBeach in from where it reaches beachHeight. */
    x: 3,
    beachHeight: 1.0,
    inlandOfBeach: 1.5,
    /** The eye starts here and settles to its height while the fly-in hides it. */
    eyeHeight: 3,
    /** Looking south-west, out to sea. */
    yaw: Math.PI - 0.75,
    pitch: -0.02,
  },

  /** The player cannot go further than this from the atoll's centre. */
  farthestFromCentre: 620,
  /** How quickly the eye follows the ground and the water: the larger, the more closely. */
  eyeFollowRate: 7,

  /** Flying, switched on in the debug panel: for looking at the scene from anywhere. */
  flying: {
    /** Metres a second close to the ground or the sea, and how much faster for each metre above it. */
    speed: 6,
    speedPerMetreOfHeight: 0.35,
    /** The eye comes no nearer the ground or the sea floor than this, and goes no higher than `highest`. */
    lowestAboveGround: 0.4,
    highest: 400,
    farthestFromCentre: 1200,
    /** How many times as fast it flies while Shift is held, or with the `fast` button on. */
    hurry: 4,
    /**
     * The mouse wheel sets the pace, for a close look or a long way to go: each notch of the wheel
     * multiplies it by `perWheelNotch`, between `slowest` and `fastest` times the usual speed.
     */
    pace: { perWheelNotch: 1.25, slowest: 0.1, fastest: 8 },
  },

  walking: {
    speed: 6.5,
    eyeHeight: 1.7,
    /** How far the eye bobs with each step, and how fast: radians a second at full push. */
    bob: 0.035,
    stepRate: 9,
  },

  /** Over ground lower than this the player wades, slower. */
  wading: { below: -0.2, speed: 4.2 },

  swimming: {
    /** Over ground lower than this the player swims. */
    below: -1.2,
    speed: 3.6,
    /** The bob of the step keeps this slower time while swimming. */
    strokeRate: 4,
    /** Eye heights: at the surface, and the nearest a dive comes to the sea floor. */
    surfaceEyeHeight: 0.5,
    aboveSeaFloor: 0.55,
    /** The waves carry the eye while it is higher than this. */
    ridesWavesAbove: 0.2,
    /**
     * The eye rises and falls, floatRate radians a second: by float near the surface, by
     * floatDived once lower than floatsAbove.
     */
    floatRate: 1.6,
    float: 0.04,
    floatDived: 0.02,
    floatsAbove: 0.3,
    hint: { title: 'Swimming', subtitle: 'look down and push forward to dive', seconds: 5 },
  },

  look: {
    /** Radians the view turns for each pixel the picture is dragged. */
    perPixel: 0.0055,
    /** The furthest the view tips up or down. */
    steepest: 1.2,
    /** Radians a second the left and right arrow keys turn the view. */
    arrowTurnRate: 1.6,
  },

  /** The opening fly-in: from high over the sea down to the player's eye. */
  intro: {
    seconds: 9,
    /** Any press hurries it on, this many times as fast. */
    hurriedPace: 5,
    /** It starts this far west of the player, this high, this far south, looking at lookingAt. */
    fromWest: 150,
    fromHeight: 205,
    fromSouth: 225,
    lookingAt: [0, 0, 25],
    /** It swings up above the straight way down by this much at the middle. */
    lift: 5,
    /** The title fades once this share of the way is done. */
    titleFadesAt: 0.5,
  },

  placeNames: {
    seconds: 4.5,
    campfire: { title: 'Campfire', subtitle: 'warmer after dark', within: 3.2 },
    shelter: { title: 'Shelter', subtitle: 'a roof of fronds', within: 6.5 },
    sandbank: {
      title: 'The Sandbank',
      subtitle: 'you swam all this way',
      within: 19,
      /** Only once out of the water. */
      groundAbove: 0.3,
    },
    /** Swimming at least this far inside the ring of land. */
    lagoon: { title: 'The Lagoon', subtitle: 'still water inside the ring', insideTheLand: 8 },
    /** Swimming at least this far beyond the outer shore. */
    openWater: {
      title: 'Open Water',
      subtitle: 'the atoll looks small from here',
      beyondTheShore: 75,
    },
  },

  footprints: {
    /** The oldest print gives way to the newest. */
    count: 70,
    /** A print is left each time the player has gone this far. */
    stride: 0.72,
    /** In dry sand only: where the ground is between these heights. */
    dryGround: [0.1, 1.7],
    /** Each foot falls this far to its side of the way walked. */
    footFromMiddle: 0.13,
    aboveGround: 0.025,
    halfWidth: 0.075,
    lengthToWidth: 1.9,
    colour: 0x7a6646,
    opacity: 0.34,
    /** The swash washes a print away once it runs this high over the sand there. */
    washedAwayBy: 0.02,
  },
} as const;
