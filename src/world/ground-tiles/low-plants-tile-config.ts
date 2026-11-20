import type { Rgb } from '../../core/maths';
import type { Range } from '../../core/random';

/**
 * The low plants' tile: beach morning glory, a small-leaved creeper and seedlings over sand,
 * seen from straight above. Lengths are in metres on the ground, angles in radians; colours are
 * the plants' own, under an open sky with the sun high, on the scale where sunlit sand is
 * (0.72, 0.715, 0.70).
 */
export const lowPlantsTileConfig = {
  /** Dots along each side: a power of two, so that the picture is mipmapped. */
  size: 1024,
  /** Metres of ground one repeat covers (a dot is 2.9 mm). */
  span: 3,
  /** The lowest-ranked plant's alpha; the highest-ranked plant's is 1. Where nothing grows it is 0. */
  lowestRank: 0.02,
  /** How much each dot's shade strays at random, as a share: the grain of a leaf's surface. */
  grain: 0.05,

  /**
   * Each kind of plant ranks within its own band, the longer ones higher within it: long runners
   * over the shoots off them, over seedlings and creepers, over the shoots that fill the gaps.
   * Only the order matters; the alphas are spread evenly over it afterwards.
   */
  rankBands: {
    runners: [2, 3.3] as Range,
    sideShoots: [1, 2.3] as Range,
    seedlings: [0.1, 0.7] as Range,
    creepers: [0.15, 0.65] as Range,
    gapShoots: [0, 0.6] as Range,
  },

  morningGlory: {
    /** Long runners, the ones that reach furthest and rank highest. */
    runners: 20,
    runnerLength: [0.9, 2.6] as Range,
    /** Short shoots off the long runners, and the angle they leave at. */
    sideShoots: 200,
    sideShootAngle: [0.3, 1.2] as Range,
    /** Short shoots that fill the sand still bare. */
    gapShoots: 220,
    shootLength: [0.08, 0.45] as Range,
    stemWidth: [0.004, 0.006] as Range,
    /** Ground between one leaf's node and the next, well along a runner. */
    nodeSpacing: [0.04, 0.08] as Range,
    /** Over the last metres of this length the nodes close up and the leaves shrink: the growing tip. */
    tipLength: 0.25,
    leafLength: [0.07, 0.09] as Range,
    /** A leaf's width as a share of its length, opened out: it is often wider than long. */
    leafWidth: [0.85, 1.15] as Range,
    /** Folded along the midrib and tilted up on its stalk, a leaf looks narrower from above by this share. */
    foldedWidth: [0.45, 0.85] as Range,
    /** The notch at a leaf's tip: how deep, as a share of its length, and how wide, as a share of its width. */
    notchDepth: [0.08, 0.2] as Range,
    notchWidth: [0.3, 0.5] as Range,
    stalkLength: [0.01, 0.035] as Range,
    /** The angle between a leaf's stalk and the runner ahead of it. */
    stalkAngle: [0.3, 1.0] as Range,
    /** The chance that a node puts out a branch, the angle it leaves at, and its length as a share of the runner left. */
    branchChance: 0.05,
    branchAngle: [0.4, 1.0] as Range,
    branchLength: [0.2, 0.55] as Range,
    /** The chance that a node of a long runner has lost its leaf, twice as much in the middle of a bare stretch. */
    bareNodeChance: 0.35,
    /** How long the bare and leafy stretches along a long runner are, one of each. */
    bareStretchLength: [0.3, 0.7] as Range,
    /** The chance that a leaf of a long runner, or of a short shoot, has more leaves beside it, how many, and how big. */
    clusterChance: 0.7,
    shootClusterChance: 0.2,
    leavesInCluster: [1, 3] as Range,
    clusterLeafSize: [0.6, 0.95] as Range,
    /** How fast a runner's heading wanders, in radians a metre: nearly straight, gently bent. */
    bend: 0.9,
  },

  creeper: {
    plants: 110,
    stemLength: [0.15, 0.5] as Range,
    stemWidth: 0.0035,
    nodeSpacing: [0.03, 0.055] as Range,
    leafletLength: [0.02, 0.032] as Range,
    /** A leaflet's width as a share of its length. */
    leafletWidth: [0.45, 0.7] as Range,
    /** The share of nodes that carry three leaflets; the rest carry a pair. */
    threes: 0.6,
    /** The chance that a node puts out a branch, the angle it leaves at, and its length as a share of the stem left. */
    branchChance: 0.12,
    branchAngle: [0.5, 1.1] as Range,
    branchLength: [0.3, 0.7] as Range,
    bend: 2.5,
  },

  seedlings: {
    plants: 150,
    leaves: [4, 8] as Range,
    /** One leaf's length, the rosette's longest: a rosette is twice this across. */
    leafLength: [0.03, 0.06] as Range,
    /** Each of its other leaves' lengths, as a share of that. */
    leafLengthShare: [0.6, 1.1] as Range,
    leafWidth: [0.18, 0.32] as Range,
  },

  /** What every leaf shares. */
  leaves: {
    /** Tilted up on its stalk, a leaf looks this much shorter from above, as a share. */
    foreshortening: [0.85, 1] as Range,
    /** How much each half of a leaf may be wider or narrower than the other, as a share. */
    halfWidth: [0.85, 1.15] as Range,
    /** How far an outline waves in and out, as a share of the width, and how many times. */
    wobble: [0, 0.08] as Range,
    wobbleWaves: [1, 3] as Range,
    /** Stalks shorter than this many metres hide under their leaf, and are not drawn. */
    shortestStalkSeen: 0.015,
  },

  /** How the infill (seedlings, creepers, gap shoots) seeks out the sand left bare. */
  infill: {
    /** Places tried for each plant, the barest taken. */
    placesTried: 12,
    /** Headings tried for each shoot, the one towards the barest ground this far ahead taken. */
    headingsTried: 5,
    lookAhead: 0.15,
  },

  colours: {
    /**
     * Beach morning glory's leaf: olive, a touch grey. Lit by the game (about 1.25 times), the mat
     * averages what the photographs of creepers on sand in sun measure: OKLCH 0.47, 0.065, 124.
     */
    leaf: [0.27, 0.35, 0.17] as Rgb,
    /** What a leaf moves towards as it varies: yellower, greyer, and old ones yellow-brown. */
    yellowerLeaf: [0.32, 0.37, 0.15] as Rgb,
    oldLeaf: [0.5, 0.44, 0.19] as Rgb,
    /** The shares of leaves turning yellower and greyer go as random squared, up to these. */
    mostYellowing: 0.5,
    mostGreying: 0.5,
    /** The chance that a leaf is old, and how far along it is to yellow-brown. */
    oldLeafChance: 0.03,
    oldLeafAge: [0.4, 1] as Range,
    /** How much lighter or darker one leaf is than the next, as a share. */
    leafLightness: [0.78, 1.22] as Range,
    /** How much one plant's leaves differ from the next plant's, as a share. */
    plantLightness: [0.92, 1.08] as Range,
    creeperLeaf: [0.25, 0.31, 0.2] as Rgb,
    seedlingLeaf: [0.29, 0.35, 0.2] as Rgb,
    /** Long runners range from reddish brown to tan; a short shoot's young stem is this share of the way to green. */
    stem: [0.36, 0.23, 0.16] as Rgb,
    paleStem: [0.5, 0.42, 0.3] as Rgb,
    youngStemGreen: 0.6,
    creeperStem: [0.33, 0.3, 0.18] as Rgb,
  },

  shading: {
    /** A leaf's edge is darker than its middle by this share, its midrib paler by the next. */
    leafEdge: 0.8,
    midrib: 1.12,
    /** One half of a folded leaf is lighter than the other by up to this share. */
    foldHalves: 0.16,
    /** The dark rim a leaf's edge leaves on whatever lies under it: how dark at the edge, how wide in dots. */
    rimDarkness: 0.45,
    rimWidth: 1.8,
  },
};
