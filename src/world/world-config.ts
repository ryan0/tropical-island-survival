// Distances are metres. Heights are measured from still sea level. Colours are red, green,
// blue from 0 to 1. The home islet is the wide southern one; +z is south, out to the ocean.

export const worldConfig = {
  /** Decides where rocks, plants and animals end up: the same seed is the same island. */
  seed: 1,
  /**
   * The castaway's camp (lean-to, driftwood seats, firewood, the campfire and its ring of stones)
   * is built but left out of the scene for now: the player is to make or mend such things.
   */
  hasCamp: false as boolean,

  // Everything placed by hand sits on the home islet and is measured from its ocean beach.
  landmarks: {
    homeX: 0,
    /** The beach is taken to be where the ground, coming in from the sea, reaches this height. */
    beachHeight: 1.0,
    /** The middle of the islet lies about this far in from the beach. */
    homeInland: 32,
    hutX: -18,
    hutInland: 30,
    fireX: 5,
    fireInland: 5,
    pierX: -12,
    /** The pier leaves the beach a step behind where the ground reaches this height. */
    pierBeachHeight: 0.9,
    pierBehindBeach: 1,
    pierLength: 20,
    /** The lagoon path ends where the ground, going north, drops below this height. */
    lagoonPathEndsAt: 0.7,
    /** Plants are scattered thickly within the first distance of home, thinning to this share by the second. */
    nearHomeWithin: 70,
    farFromHomeBeyond: 170,
    shareFarFromHome: 0.2,
  },

  /**
   * The picture of noise that the ground's patterns are read from (ground-noise.ts): how many
   * cells of the noise it holds across before it repeats, and how many dots it gives each cell.
   * A pattern read at 0.2 cells a metre repeats every 320 m. And the dots across of the picture of
   * plain random numbers that the ground's single things are placed by: pebbles, at 15 squares a
   * metre, repeat every 17 m.
   */
  groundNoise: { period: 64, dotsACell: 8, randomsSize: 256 },

  /**
   * What covers the reef's floor, as a picture the ground's colouring reads in place of the
   * island's formulas (reef-cover-picture.ts): the side of the square it covers, in metres, centred
   * on the atoll (it reaches past the drop-off on every side), and its dots across: a metre each,
   * where the smallest thing in it, a lump of the reef, is some 4 m across. (At half a metre a dot
   * no view was any different to the eye, for four times the memory.)
   */
  reefCoverPicture: { span: 1024, size: 1024 },

  /**
   * The turf's broad patterns as a picture the ground's colouring reads in place of turf.glsl's
   * formulas (turf-picture.ts): the side of the square it covers, in metres,
   * centred on the atoll (all the land lies inside it); its dots across (under a metre each, where
   * the shortest of the patterns' waves is 13 m); and how far either way, in metres, it can keep
   * the wander of the layers' edges (the formula's two waves add up to 0.75).
   */
  turfPicture: { span: 400, size: 512, wanderKept: 1 },

  terrain: {
    /** The square of ground drawn, and the squares along each side of it. */
    size: 960,
    squares: 480,
    /**
     * A square is cut into four where the ground bends too sharply for it: where a corner stands
     * more than this above or below the middle of its neighbours (metres). That is the walls of
     * the reef's grooves and channels, the edges of its notches and of the pass, the foot of its
     * walls. A lower number cuts more squares, each for six more triangles.
     */
    cutInFourWhereBendsOver: 0.5,
    /**
     * The ground is drawn in square tiles this many metres across, each left out when it is out of
     * view: drawn whole, two thirds and more of its triangles were worked out every frame for
     * nothing. Smaller tiles leave out more, at one more draw for each tile in view.
     */
    tileSide: 80,
    /** The sea floor beyond the reef: the lowest the island's shape goes. */
    seaFloor: -30.49,
    /** Dots along each side of the grit picture, and how many times it repeats across the ground. */
    gritSize: 256,
    gritRepeats: 150,
    /** Scattered larger specks in the grit: mostly dark grains, some bright shell chips. */
    gritSpecks: 260,
    shareOfDarkSpecks: 0.6,
  },
} as const;
