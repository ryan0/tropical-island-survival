// The island's other plants (the palms and the grass have their own files), and the things lying
// on the ground under them. Sizes and distances are metres; a height is the ground's, above
// still sea level. A plant's size is a multiple of its model's.

export interface PlantKindConfig {
  /** At most this many are planted, in at most this many tries. */
  count: number;
  tries: number;
  /** It grows on ground between these heights. */
  ground: readonly [lowest: number, highest: number];
  /** How far it reaches from its foot. */
  reach: number;
  /** It is not drawn beyond this distance. */
  shownWithin: number;
  /** It is drawn with its simpler model from this distance on; 0 for a kind with only one model. */
  simplerBeyond: number;
  castsShadow: boolean;
}

export const plantsConfig = {
  /** Nothing is planted this near the hut or the footpaths. */
  clearOfHut: 6.5,
  clearOfPaths: 2.3,

  kinds: {
    /** Rounded mounds of glossy paddle-leaved scrub (naupaka), packed into a hedge along the back of the beach. */
    beachShrub: {
      count: 480,
      tries: 90000,
      ground: [1.6, 9],
      reach: 3.5,
      shownWithin: 170,
      simplerBeyond: 34,
      castsShadow: true,
    },
    /** Small spreading trees, a canopy of leaf masses on bending limbs. */
    broadleafTree: {
      count: 46,
      tries: 40000,
      ground: [2.5, 9],
      reach: 7,
      shownWithin: 420,
      simplerBeyond: 60,
      castsShadow: true,
    },
    /** Taller and looser than the beach shrub: masses of the same leaves on leaning stems, inland. */
    scrubBush: {
      count: 200,
      tries: 60000,
      ground: [2.0, 11],
      reach: 3.5,
      shownWithin: 170,
      simplerBeyond: 34,
      castsShadow: true,
    },
    /** Pandanus: a forking stem on stilt roots, every branch ending in a mop of long drooping blades. */
    screwPine: {
      count: 70,
      tries: 40000,
      ground: [1.7, 6],
      reach: 4,
      shownWithin: 200,
      simplerBeyond: 40,
      castsShadow: true,
    },
    /** Knee-high stars of strap leaves on the ground. */
    rosette: {
      count: 420,
      tries: 60000,
      ground: [1.8, 10],
      reach: 2,
      shownWithin: 70,
      simplerBeyond: 20,
      castsShadow: true,
    },
    /** A dried palm frond lying under the trees. */
    fallenFrond: {
      count: 240,
      tries: 40000,
      ground: [1.8, 9],
      reach: 3.5,
      shownWithin: 110,
      simplerBeyond: 0,
      castsShadow: false,
    },
    /** A mat of creeping beach vine. */
    vineMat: {
      count: 260,
      tries: 60000,
      ground: [1.55, 8],
      reach: 2.5,
      shownWithin: 70,
      simplerBeyond: 16,
      castsShadow: false,
    },
    /** Lumps of coral rock washed up on the beach. */
    coralLump: {
      count: 520,
      tries: 80000,
      ground: [0.35, 1.9],
      reach: 1,
      shownWithin: 60,
      simplerBeyond: 0,
      castsShadow: true,
    },
    coconut: {
      count: 70,
      tries: 40000,
      ground: [0.6, 2.6],
      reach: 1,
      shownWithin: 90,
      simplerBeyond: 0,
      castsShadow: true,
    },
    /** The snapped-off foot of a palm. */
    stump: {
      count: 26,
      tries: 20000,
      ground: [2, 8],
      reach: 2,
      shownWithin: 200,
      simplerBeyond: 0,
      castsShadow: true,
    },
  } satisfies Record<string, PlantKindConfig>,
} as const;
