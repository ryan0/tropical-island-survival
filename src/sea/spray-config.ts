// Distances are metres, times seconds, angles radians. Lips and bores are measured from 0 to 1, as
// the wave model gives them. A chance is for a frame of a thirtieth of a second (see
// `chanceFrameRate`).

export const sprayConfig = {
  /** Droplets and puffs of mist in the air at most: past that, a new one replaces the oldest. */
  poolSize: 2600,

  /** Spray is thrown only while the camera is within this distance of the outer shoreline. */
  nearShoreline: 110,
  /** Spots on the reef sampled each frame for breaking water. */
  spotsSampled: 170,
  /** Half of them lie round the stretch of reef the camera faces, this far ahead of it. */
  lookAhead: 30,
  /** How far round the reef the spots are spread: those ahead of the camera, and those beside. */
  spreadAhead: 0.32,
  spreadBeside: 0.6,
  /**
   * They lie from this far inside the line where the swell breaks to `breakingWidth` further out:
   * where the swell breaks on the reef's edge, and the white water just inside it.
   */
  insideBreakLine: 11,
  breakingWidth: 21,
  /** The chances are for frames this many a second: a shorter frame has less, a longer no more. */
  chanceFrameRate: 30,

  landingLip: {
    throwsAbove: 0.12,
    /** Its chance of throwing on a frame, for each unit of lip landing. */
    chance: 1.6,
    /** It throws at least this many droplets, and up to this many more for each metre of wave. */
    fewestDroplets: 3,
    dropletsPerMetre: 9,
    /** The chance of a puff of mist with them. */
    puffChance: 0.5,
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
