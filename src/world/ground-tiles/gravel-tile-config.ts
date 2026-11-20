import type { Range } from '../../core/random';

type Colour = readonly [red: number, green: number, blue: number];

// The surface's own colours (albedo) on the scale on which clean dry coral sand is (0.72, 0.715,
// 0.70), measured against sunlit sand in the photographs of Majuro's rubble and grove floor: the
// stones' tops lie between about 0.52 and 0.76, and the whole bed comes out about 0.85 as light
// as the sand. What is really dark is thin crevices and the odd hole, not the ground between.
const tones = {
  // Fresh-broken and sun-bleached coral, as light as the sand.
  bleached: [0.76, 0.754, 0.738],
  // Most pieces: weathered coral a little darker than the sand.
  paleWarmGrey: [0.7, 0.69, 0.667],
  weatheredGrey: [0.615, 0.607, 0.589],
  // Pieces that lay long in the shallows, darkened by algae.
  algaeStained: [0.55, 0.547, 0.512],
  // Coralline crust and old shell.
  pinkish: [0.68, 0.64, 0.625],
  tan: [0.68, 0.652, 0.605],
} satisfies Record<string, Colour>;

export type ToneName = keyof typeof tones;

/** How one kind of piece looks, apart from its outline. */
export interface PieceLook {
  /** How often each tone is chosen, as shares that need not add up to one. */
  toneShares: Partial<Record<ToneName, number>>;
  /** How far a piece's lightness strays from its tone, as a share either way. */
  lightnessSpread: number;
  /** How dark a piece's sides are, as a share of its top. */
  sideShade: number;
  /** Knobs and hollows a dot or two across on its face, as a share of its colour either way. */
  relief: number;
  /** The share of a piece's dots that are holes, and how dark a hole is as a share of the stone round it. */
  holes: number;
  holeShade: number;
  /** Blotches of a few millimetres on its face, as a share of its colour either way. */
  mottle: number;
  /** How far its edge wanders from the clean outline, in dots: over a dot or two, and over a few centimetres. */
  ragged: number;
  wander: number;
}

export const gravelTileConfig = {
  // A power of two, so that the picture can be mipmapped and repeated.
  dotsEachWay: 1024,
  // A dot is then about 2.9 mm of ground.
  span: 3,
  // The lighting multiplies by about 1.3 in full sun: nothing may be lighter than sand in sun.
  brightest: 0.8,
  tones,

  /** The fine gravel and coarse sand between the stones, with no rank. */
  matrix: {
    // A pale warm grey, only a little darker than the stones.
    colour: [0.62, 0.61, 0.588] satisfies Colour,
    // Each dot a grain of its own, as a share of the colour either way.
    grain: 0.1,
    // Bits of gravel a few millimetres across, lighter and darker.
    fineGravel: 0.14,
    // Patches a few centimetres across, a little lighter or darker.
    patches: 0.06,
  },

  /**
   * The dark of a stone's contact shadow: on whatever lies under its edge, fading out over its
   * rim. Light alone, it goes dark where the rims of two stones meet in a crevice.
   */
  contactShadow: {
    atTheEdge: 0.3,
    // The rim's width in dots: a pebble's, and the most a big stone's grows to.
    rimWidth: [1, 2] satisfies Range,
    // A stone's rim is this share of its thickness, between those two.
    rimPerThickness: 0.18,
  },

  // Each stone's rank, its alpha, is fixed by its size, a little shuffled so that a threshold
  // never cuts cleanly at one size: sizes are multiplied by up to this much either way.
  rankShuffle: 0.3,
  lowestRank: 0.05,
  // Alpha fades to nothing over the outer dots of a stone's rim.
  alphaEdgeDots: 2,

  // Pieces are laid biggest first, each where no more than this share of it lies on pieces
  // already laid, so that they pack as gravel does rather than heaping up.
  overlapAllowed: 0.3,
  // The ground already taken is kept on a grid of squares this many dots a side.
  takenSquareDots: 4,
  // The density of stones wanders by this share either way over patches of this many dots
  // (a power of two).
  crowding: 0.35,
  crowdingPatchDots: 128,

  /**
   * The pieces, each kind with how many are tried on a square metre (fewer are laid, where
   * there is no room) and their sizes in metres. None is larger than about 8 cm: anything big
   * enough to stand up off the ground is modelled in the game, and painted it would read flat.
   */
  kinds: {
    // Thin broken plates of table coral, which lie flat.
    plate: {
      perSquareMetre: 2.5,
      size: [0.035, 0.07] satisfies Range,
      // How far its corners are worn round, as a share of its half-width.
      roundness: 0.25,
      look: {
        toneShares: { paleWarmGrey: 3, bleached: 1.5, weatheredGrey: 1.5, tan: 0.5 },
        lightnessSpread: 0.05,
        sideShade: 0.88,
        relief: 0.06,
        holes: 0.015,
        holeShade: 0.8,
        mottle: 0.08,
        ragged: 0.7,
        wander: 1,
      } satisfies PieceLook,
    },
    // Irregular lumps of massive coral and reef rock.
    lump: {
      perSquareMetre: 42,
      // Across its main body: with the smaller pieces grown onto it, a lump reaches a fifth further.
      size: [0.025, 0.065] satisfies Range,
      roundness: 0.5,
      look: {
        toneShares: {
          paleWarmGrey: 5,
          weatheredGrey: 2,
          algaeStained: 0.4,
          bleached: 1.5,
          tan: 0.5,
          pinkish: 0.3,
        },
        lightnessSpread: 0.06,
        sideShade: 0.8,
        relief: 0.1,
        holes: 0.025,
        holeShade: 0.75,
        mottle: 0.1,
        ragged: 0.7,
        wander: 1.2,
      } satisfies PieceLook,
    },
    // Broken fingers of branching coral, the signature of atoll rubble: curved, knobbly, sometimes forked.
    finger: {
      perSquareMetre: 55,
      length: [0.03, 0.08] satisfies Range,
      thickness: [0.012, 0.025] satisfies Range,
      // The middle of the spine moves this share of the length off a straight line, either way.
      bend: 0.12,
      forkedShare: 0.25,
      look: {
        toneShares: {
          bleached: 4,
          paleWarmGrey: 4,
          weatheredGrey: 1,
          algaeStained: 0.2,
          pinkish: 0.3,
        },
        lightnessSpread: 0.06,
        sideShade: 0.8,
        relief: 0.08,
        holes: 0.02,
        holeShade: 0.8,
        mottle: 0.08,
        ragged: 0.35,
        wander: 0.25,
      } satisfies PieceLook,
    },
    shell: {
      perSquareMetre: 9,
      size: [0.01, 0.025] satisfies Range,
      roundness: 0.7,
      look: {
        toneShares: { bleached: 3, tan: 1, pinkish: 1 },
        lightnessSpread: 0.05,
        sideShade: 0.86,
        relief: 0.04,
        holes: 0,
        holeShade: 1,
        mottle: 0.06,
        ragged: 0.3,
        wander: 0.3,
      } satisfies PieceLook,
    },
    pebble: {
      perSquareMetre: 1400,
      size: [0.017, 0.05] satisfies Range,
      roundness: 0.15,
      look: {
        toneShares: {
          paleWarmGrey: 5,
          weatheredGrey: 2.5,
          bleached: 2,
          algaeStained: 0.4,
          tan: 0.5,
        },
        lightnessSpread: 0.07,
        sideShade: 0.84,
        relief: 0.06,
        holes: 0.01,
        holeShade: 0.8,
        mottle: 0.08,
        ragged: 0.35,
        wander: 0.25,
      } satisfies PieceLook,
    },
  },
};
