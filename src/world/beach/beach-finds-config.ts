// Distances are metres. A pair is a range: lowest, highest. Ground heights are measured from
// still sea level. Hues, saturations and lightnesses run from 0 to 1.

export const beachFindsConfig = {
  /** All lie on the sand between these heights, this far at most from the middle of home. */
  ground: [0.05, 1.2],
  reachFromHome: 75,
  clearOfRocks: 0.1,
  triesEach: 600,

  starfish: {
    count: 40,
    size: [0.8, 1.4],
    hue: [0.0, 0.08],
    saturation: 0.85,
    lightness: [0.4, 0.55],
  },
  shells: {
    count: 120,
    size: [0.6, 1.3],
    hue: [0.06, 0.12],
    saturation: [0.1, 0.4],
    lightness: [0.75, 0.92],
  },
  pebbles: {
    count: 250,
    size: [0.4, 1.3],
    /** Grey, a little warm. */
    brightness: [0.25, 0.6],
  },
} as const;
