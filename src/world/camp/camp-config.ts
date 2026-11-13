// Distances are metres. Colours of the camp's model are red, green, blue from 0 to 1; those of
// the fire are as three.js takes them.

export const campConfig = {
  colours: {
    /** Driftwood, bleached by sun and sea. */
    wood: [0.7, 0.66, 0.59],
    bark: [0.42, 0.33, 0.24],
    dryFrond: [0.66, 0.55, 0.33],
    greenFrond: [0.4, 0.47, 0.2],
    coconut: [0.36, 0.27, 0.16],
  },

  leanTo: {
    rafters: 7,
    /** The roof is fronds laid in layers, like thatch. */
    roofLayers: 3,
    frondsInALayer: 24,
    /** About this share of the roof's fronds are still green. */
    shareOfGreenFronds: 0.3,
    /** Dry fronds laid on the ground under the roof to sleep on. */
    bedFronds: 6,
  },

  coconuts: 5,
  /** Sticks stacked by the fire. */
  firewood: 7,
  /** Driftwood left by the sea along the ocean beach, either side of home. */
  beachLogs: 9,

  fire: {
    coalColour: 0xff5a12,
    emberColour: 0xffa040,
    lightColour: 0xff8a35,
    /** The burnt logs under the flame. */
    logColour: 0x3a2a1c,
    embers: 40,
    logs: 4,
    /** How far its light reaches. */
    lightReach: 34,
    /** Its light's brightness by day, and how much brighter it is at night. */
    brightnessByDay: 0.25,
    brightnessAddedAtNight: 1.9,
  },
} as const;
