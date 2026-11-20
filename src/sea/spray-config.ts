// Distances are metres, times seconds, angles radians. Lips and bores are measured from 0 to 1, as
// the wave model gives them. A chance is for a frame of a thirtieth of a second (see
// `chanceFrameRate`).

export const sprayConfig = {
  /** Droplets and puffs of mist in the air at most: past that, a new one replaces the oldest. */
  poolSize: 2600,

  /** Spray is thrown only while the camera is within this distance of the outer shoreline. */
  nearShoreline: 270,
  /** Spots on the reef sampled each frame for breaking water. */
  spotsSampled: 170,
  /** Half of them lie round the stretch of reef the camera faces, this far ahead of it. */
  lookAhead: 30,
  /** How far round the reef the spots are spread: those ahead of the camera, and those beside. */
  spreadAhead: 0.32,
  spreadBeside: 0.6,
  /**
   * They lie from this far inside the line where the swell breaks to `breakingWidth` further out,
   * along the reef: where the swell breaks on the upper fore reef, and the white water crossing
   * the crest.
   */
  insideBreakLine: 34,
  breakingWidth: 56,
  /** The chances are for frames this many a second: a shorter frame has less, a longer no more. */
  chanceFrameRate: 30,

  /**
   * Spray along the main swell's crest itself, where its lip falls and lands (the crest picture
   * says where that is): the spots above, scattered over the reef, seldom fall on so narrow a line.
   */
  onCrest: {
    /** Spots sampled along it each frame, spread round the reef as the others are. */
    spotsSampled: 48,
    /** They lie between these distances ahead of the crest, shorewards, where a lip lands. */
    aheadOfCrest: [1, 3.5],
    /** The chance of throwing on a frame, for each unit of lip landing, and of lip falling. */
    landingChance: 0.7,
    fallingChance: 0.5,
    /**
     * Where the lip has landed the white mass sheds this many droplets and this many small clouds
     * of mist, so bright: the mist is what softens the mass's outline and shows it to be moving.
     * They start between these heights above the water ahead of the wave, in wave heights: at the
     * mass's top and over it (the breaker's own mesh draws it, higher than the wave), or they
     * would be hidden inside it. And they are thrown on with the wave, between these speeds
     * (metres a second), or it would leave them behind.
     */
    droplets: 4,
    mists: 2,
    mistBrightness: 0.13,
    startAt: [1, 1.6],
    thrownOnAt: [2.5, 5],
  },

  landingLip: {
    throwsAbove: 0.12,
    /** Its chance of throwing on a frame, for each unit of lip landing. */
    chance: 1.6,
    /** It throws at least this many droplets, and up to this many more for each metre of wave. */
    fewestDroplets: 3,
    dropletsPerMetre: 9,
    /**
     * Its droplets start between these heights above the water, in wave heights: in the white mass
     * the landed lip throws up (the breaker's own mesh draws it, higher than the wave), up to its
     * top, so that they fly off it and are not hidden inside it.
     */
    dropletsStartAt: [0.4, 1.1],
    /** The chance of a puff of mist with them. */
    puffChance: 0.5,
    /**
     * A wave higher than this also throws a brighter cloud well above itself where its lip lands:
     * this many times as fast upwards as the others, and this bright.
     */
    highCloudAbove: 0.9,
    highCloudLift: 1.7,
    highCloudBrightness: 0.2,
  },

  fallingLip: {
    throwsAbove: 0.3,
    chance: 0.6,
    /** The chance of spindrift with each droplet. */
    spindriftChance: 0.7,
  },

  bore: {
    throwsAbove: 0.4,
    chance: 0.45,
    /** The chance of a second, higher cloud of mist with the first. */
    secondCloudChance: 0.35,
  },

  /** Water hitting a rock or post standing in the surf. */
  obstacles: {
    /** Only once the water stands this far above the ground at its foot. */
    wetAbove: 0.06,
    /**
     * How hard the water hits: this much for each metre a second it rises faster than
     * `risingFasterThan`, this much for each unit of bore, and one for each unit of lip landing.
     */
    fromRising: 0.8,
    risingFasterThan: 0.7,
    fromBore: 0.7,
    /** How hard it must be hit, in those units, to throw spray. */
    throwsAbove: 0.35,
    /** For each unit of force: a chance a second, not a frame. */
    chancePerSecond: 22,
    /** It throws at least this many droplets, and up to this many more for each unit of force. */
    fewestDroplets: 2,
    dropletsPerForce: 5,
    puffChance: 0.3,
  },

  /** How much is breaking near the camera, which sets how loud the surf is. */
  surfSound: {
    /** A lip landing counts this many times as much as a bore. */
    landingLipWeight: 2,
    /** The surf is at its loudest when the spots sampled add up to this much breaking. */
    loudestAt: 14,
    /** How quickly the sound follows: the share of the way a second. */
    easing: 3,
  },

  /**
   * Bubbles, seen from under water, where breaking water would throw spray above it: where a lip
   * lands it drives a billowing cloud of them down into the water, and behind white water a
   * thinner layer hangs under the surface. Each puff of the cloud is driven down, soon stopped by
   * the water, and then rises and thins (bubble-plumes.ts).
   */
  bubblePlumes: {
    /** Puffs in the water at most: past that, a new one replaces the oldest. */
    poolSize: 500,
    /**
     * None is released further than this from the eye: the water hides them from 18 m and takes
     * their colour (bubble-plumes.vert.glsl), and the pool is kept for the near ones.
     */
    releasedWithin: 20,
    /** They are released between these depths under the surface. */
    releasedBelow: [0.15, 0.5],
    /**
     * A puff's middle is kept at least this many times its size under the surface and above the
     * floor: a sprite is drawn all at one distance, so either would cut a straight edge across it.
     */
    keptOffSurfaceAndFloor: 0.5,
    /**
     * How fast the water stops a puff: the share of its speed, beyond its rising, it loses in a
     * second is 1 - exp(-drag). Once stopped it rises at a speed between these.
     */
    drag: 2.2,
    riseSpeed: [0.2, 0.5],
    /**
     * A puff keeps its depth under the surface as a wave passes over it, so the surface over this
     * many of them is asked for each frame, in turn. Each follows the last surface found over it,
     * so as not to jump: in a frame of dt seconds, 1 - exp(-surfaceFollowing * dt) of the way.
     */
    surfacesSampled: 48,
    surfaceFollowing: 12,
    /** How much it grows across, a second, as its bubbles spread. */
    growth: 0.1,
    /** It fades in over this many seconds, and out over this share of its life, at the end. */
    fadeIn: 0.3,
    fadeOutOver: 0.7,
    /** A puff this deep under the surface gets half the daylight. */
    halfLightDepth: 2.5,
    /** Milky white, slightly towards cyan: the colour of a cloud of bubbles in daylight. */
    colour: [0.86, 0.95, 0.97],

    /**
     * Of the spots where a lip lands, this share drives puffs down: the spray's spots lie far
     * thicker along a breaking wave than the pool could hold puffs for. Each drives at least this
     * many down, and up to this many more for each metre of wave: scattered this far round the
     * spot, carried on with the wave between these speeds and driven down between these (metres a
     * second). They are between these sizes across, last between these times and are at most so
     * opaque, so that many overlap into a cloud.
     */
    landingLip: {
      chance: 0.4,
      fewestPuffs: 3,
      puffsPerMetre: 1.5,
      scatter: 0.5,
      inwardSpeed: [0.3, 0.9],
      downwardSpeed: [1.5, 3.5],
      size: [0.5, 1.1],
      seconds: [2.5, 4],
      opacity: 0.6,
    },
    /** A falling lip and white water each drive one puff down, more slowly, smaller and fainter. */
    fallingLip: {
      scatter: 0.3,
      inwardSpeed: [0.2, 0.6],
      downwardSpeed: [0.4, 1],
      size: [0.3, 0.6],
      seconds: [1.8, 3],
      opacity: 0.4,
    },
    bore: {
      scatter: 0.6,
      inwardSpeed: [0.6, 1.4],
      downwardSpeed: [0.4, 1],
      size: [0.25, 0.7],
      seconds: [2, 3.5],
      opacity: 0.32,
    },
  },

  /** How droplets and mist move once thrown. */
  flight: {
    /** Metres a second gained each second. Mist hangs in the air; droplets fall. */
    dropletFall: 6.8,
    mistFall: 2.6,
    /** Anything that grows faster than this, in metres a second, is mist. */
    mistGrowsFasterThan: 0.5,
    /** How fast the air slows it: the share of its speed it loses in a second, at first. */
    drag: 1.1,
    /** It fades in over the first 1/fadeInSpeed of its life, and out over the rest. */
    fadeInSpeed: 9,
  },
} as const;
