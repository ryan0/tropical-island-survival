// Distances are metres. Heights are measured from still sea level. Colours are red, green,
// blue from 0 to 1. The home islet is the wide southern one; +z is south, out to the ocean.

export const worldConfig = {
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

  terrain: {
    /** The square of ground drawn, and the squares along each side of it. */
    size: 520,
    squares: 260,
    /** The sea floor beyond the reef: the lowest the island's shape goes. */
    seaFloor: -9.49,
    /** Dots along each side of the grit picture, and how many times it repeats across the ground. */
    gritSize: 256,
    gritRepeats: 150,
    /** Scattered larger specks in the grit: mostly dark grains, some bright shell chips. */
    gritSpecks: 260,
    shareOfDarkSpecks: 0.6,
  },
} as const;
