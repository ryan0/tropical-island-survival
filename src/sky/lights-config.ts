// Distances are metres. Colours are 0xRRGGBB, or red, green, blue from 0 to 1 where they may go past 1.

export const lightsConfig = {
  shadows: {
    /** Dots along each side of the shadow map. */
    mapSize: 2048,
    bias: -0.0004,
    /** Half the box's width at each size, smallest first. */
    boxHalfWidths: [48, 72, 108, 162, 243],
    /** On foot the box is the smallest; every metre of camera height adds this much to the half-width wanted. */
    halfWidthAtGround: 48,
    halfWidthPerMetreOfHeight: 0.9,
    /** The camera's height may pass a boundary by this much before the box changes size, so it does not flip back and forth. */
    sizeSlack: 6,
    /** The box sits ahead of the camera, no further than this share of its half-width. */
    furthestAheadShare: 0.6,
    /** Looking up to this far below the horizon, the view never meets the ground. */
    lookDownLimit: -0.02,
    /** How far ahead when the view never meets the ground. */
    skyReach: 1e9,
    /** Looking straight up or down has no direction along the ground. */
    flatLookLimit: 1e-4,
    /** The box moves in steps of this many dots, so shadows never shimmer. */
    stepInDots: 109,
    /** The shadow camera sits this far behind the box's middle: a multiple of the half-width, plus a distance. */
    reachPerHalfWidth: 1.3,
    reachExtra: 160,
    /** Lifts a surface by this many dots, enough to stop it shading itself. */
    normalBiasInDots: 2.5,
    /** The sun straight overhead has no sideways direction; this is used instead. */
    overheadRight: [1, 0, 0],
    overheadLimit: 1e-6,
    /** The map is redrawn when the box has moved further than this (squared) or the sun has turned past this cosine. */
    moveThresholdSquared: 1e-4,
    sunTurnCosine: 0.999999,
  },

  hemisphere: {
    /** Light from the sky, red, green, blue, with the sun low and by day. */
    skyInLowSun: [0.74, 0.66, 0.74],
    skyByDay: [0.78, 0.9, 1.06],
    /** Light bounced up off the sand, with the sun low and by day. */
    groundInLowSun: [0.62, 0.42, 0.34],
    groundByDay: [0.86, 0.78, 0.6],
    base: 0.15,
    dayShare: 0.36,
    nightDimming: 0.85,
    dayFloor: 0.6,
    dayRange: 0.4,
    /** The glow of the whole evening sky. */
    eveningGlow: 0.22,
    /** A cloud across the sun dims it by up to this much. */
    cloudFloor: 0.84,
    cloudRange: 0.16,
  },

  sun: {
    base: 0.5,
    dayRange: 0.8,
    /** A low sun strikes flat ground at a shallow angle, so it is made stronger, as an eye adapts. */
    lowSunBoost: 1.2,
    /** The boost is gone by the time the sun is this high (radians), and full at the lower one. */
    boostFullElevation: 0.08,
    boostGoneElevation: 0.55,
    /** The sun fades in over the first part of its climb. */
    fadeInSlope: 6,
    fadeInOffset: 0.6,
    /** A cloud across the sun leaves at least this much. */
    cloudFloor: 0.22,
    cloudRange: 0.78,
    /** Below this the lamp is switched off. */
    visibleAbove: 0.02,
  },

  moon: {
    colour: 0x8fa8ff,
    position: [-60, 66, -54],
    /** Its strength at full night. */
    strengthAtNight: 0.34,
  },
} as const;
