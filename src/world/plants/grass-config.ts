// Distances and heights are metres; ground heights are measured from still sea level, so a
// negative one is a depth of water. A tuft of size 1 is as big as its cards. Colours are red,
// green, blue from 0 to 1. A random amount is `least` plus up to `spread` more.

/** In the order they are made and built, which the grass's stream of random numbers depends on. */
export const TUFT_KINDS = ['turf', 'seedHeads', 'dune'] as const;

export type TuftKind = (typeof TUFT_KINDS)[number];

export interface RandomAmount {
  least: number;
  spread: number;
}

/** A tuft's shape: upright cards crossed at its middle, each bearing a picture of the tuft. */
export interface CrossedCards {
  count: number;
  width: number;
  height: number;
}

export const grassConfig = {
  /** Short turf: most of the grass. */
  turf: {
    most: 9000,
    cards: { count: 2, width: 1.25, height: 0.62 },
    /** How far its tips bend in the wind. */
    sway: 0.09,
    /** Bigger where the turf is lush: `least`, `withLushness` times how lush, and up to `spread`. */
    size: { least: 0.5, withLushness: 0.4, spread: 0.35 },
    /** Mostly short, the odd tall clump: this share is scaled by the first, the rest by the second. */
    tallClumps: 0.12,
    tallScale: 0.9,
    shortScale: 0.55,
    /** Each tuft a shade lighter or darker than the ground it grows from. */
    shade: { least: 0.92, spread: 0.24 },
  },

  /** Taller grass with seed heads, among the turf. */
  seedHeads: {
    most: 2100,
    cards: { count: 3, width: 0.9, height: 1 },
    sway: 0.063,
    /** A tuft of turf is this instead when its pick falls between these: 18% of them. */
    pickedAbove: 0.72,
    pickedUpTo: 0.9,
    size: { least: 0.55, spread: 0.45 },
    /** Paler than the turf round it: this share of the turf's colour, with this added. */
    turfShare: 0.75,
    paler: [0.15, 0.15, 0.07],
  },

  /** Dune grass, here and there on the sand below the turf's edge. */
  dune: {
    most: 1300,
    cards: { count: 2, width: 1.1, height: 0.8 },
    sway: 0.072,
    lowestGround: 1,
    /** How far below the turf's edge it grows, measured as `land.turfEdge` is. */
    lowestEdge: 1.12,
    /** The share of the points offered there that grow it. */
    share: 0.11,
    size: { least: 0.5, spread: 0.45 },
    colour: [0.7, 0.74, 0.5],
    shade: { least: 0.9, spread: 0.2 },
  },

  /** Where grass grows on land. */
  land: {
    /** Points offered on the ring of land, fewer of them far from home; then round the sandbank. */
    pointsOnTheRing: 300000,
    pointsOnTheSandbank: 1500,
    sandbankReach: 17,
    /** Above the beach and below the bare rock of the highest ground. */
    lowestGround: 0.95,
    highestGround: 11.2,
    clearOfHut: 4.5,
    clearOfPaths: 1.25,
    /**
     * The turf begins where the ground's height, with a wobble, reaches this: where the ground
     * shows it (terrain-colour.glsl).
     */
    turfEdge: 1.8,
    /** None where the ground's pattern of bare soil passes the first; most left out past the second. */
    bareSoil: 0.74,
    soilEdge: 0.6,
    leftOutAtSoilEdge: 0.7,
    /** The red and the blue of each tuft of turf or seed heads vary by this. */
    tint: { least: 0.95, spread: 0.1 },
  },

  /** Every tuft on land. */
  tufts: {
    /** Its height as a share of its width. */
    heightShare: { least: 0.8, spread: 0.5 },
    /** How far its foot is sunk into the ground. */
    sunk: 0.03,
    /** Its colour is multiplied by this. */
    colourScale: [0.92, 0.92, 0.86],
    /** None grows within this of a rock. */
    clearOfRocks: 0.1,
    /** How far a tuft can reach from its foot. */
    reach: 2.5,
    /** Grass further off than this is not drawn. */
    shownWithin: 110,
  },

  /** Beds of short blades on the sandy floor of the lagoon, 1-4 m down. */
  seaGrass: {
    most: 1500,
    tries: 90000,
    /** Spots are tried within this far of home, along x and along z. */
    reachFromHome: 130,
    shallowestFloor: -1,
    deepestFloor: -4.2,
    /** A bed's pattern must pass a threshold drawn from this, so that it thins towards its edge. */
    bedThreshold: { least: 0.15, spread: 0.35 },
    clearOfRocks: 0.3,
    cards: { count: 3, width: 0.55, height: 1.5 },
    sway: 0.03,
    size: { least: 0.1, spread: 0.08 },
    /** Short and wide: from above a bed reads as a mottling of the sand, not as things standing on it. */
    widthShare: 4.5,
    heightShare: { least: 0.7, spread: 0.6 },
    sunk: 0.04,
    colour: { least: [0.7, 0.68, 0.48], spread: [0.14, 0.12, 0.1] },
    /** How quickly the water takes out its red, green and blue with depth. */
    dimming: [0.2, 0.06, 0.04],
    reach: 3,
    shownWithin: 60,
  },
} as const;
