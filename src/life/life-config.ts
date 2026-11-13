// Distances are metres, times seconds, angles radians. A pair is a range: lowest, highest.
// Ground heights are measured from still sea level, so a negative one is a depth of water.
// Hues, saturations and lightnesses run from 0 to 1.

export const lifeConfig = {
  gulls: {
    count: 7,
    /** Each flies a figure of eight. Where its middle lies, from the middle of the home islet. */
    centreX: [-25, 25],
    centreZ: [-20, 30],
    /** How far the figure reaches to each side of its middle. */
    reachX: [14, 32],
    reachZ: [14, 28],
    /** Radians a second round the figure. Every other gull flies it the other way. */
    pace: [0.1, 0.2],
    height: [14, 38],
    /** How far it drifts above and below that height. */
    drift: 2,
    /** Radians a second of the wing beat. */
    wingPace: [6, 9],
    /** 1 is pure white. */
    whiteness: [0.85, 1],
    /** The most it leans into a turn. */
    steepestBank: 0.6,
  },

  fish: {
    /** How tall the body is for its length; the reef's fish are other shapes of the same model. */
    bodyDepth: 0.5,
    length: [0.25, 0.4],
    /** Three kinds, by hue. Most of a school are one kind and the rest the next. */
    hues: [0.08, 0.5, 0.12],
    hueSpread: [-0.03, 0.03],
    shareOfMainKind: 0.7,
    saturation: 0.9,
    lightness: 0.55,
    /** Radians a second round its place in the school; half of them circle the other way. */
    circlingPace: [0.25, 0.55],
    /** Each fish's own multiple of that pace. */
    paceVariation: [0.7, 1.3],
    /** A fish swims between this far above the ground and this far below the surface. */
    clearOfGround: 0.2,
    belowSurface: -0.25,
    /** Ground higher than this is too shallow to swim over. */
    shallowestGround: -0.7,

    /** Schools that mill about one spot. The first is by the pier. */
    homeSchools: {
      count: 3,
      fishInEach: 30,
      /** How far from the middle of the home islet a school may settle. */
      reachFromHome: 70,
      /** How far the school wanders from its spot, and how fast (radians a second). */
      wander: 2.5,
      wanderPaceX: 0.15,
      wanderPaceZ: 0.11,
      /** How far from the middle of the school a fish circles. */
      circle: [0.8, 4],
      deepestGround: -3,
    },
    /** Small parties that travel wide loops through the lagoon, so fish pass almost anywhere. */
    roamingParties: {
      count: 10,
      fishInEach: 8,
      reachFromHome: 130,
      /** The widest loop tried; each one that leaves the water is followed by a narrower. */
      widestLoop: 42,
      narrowestLoop: 4,
      narrowingStep: 0.8,
      /** A loop's two half-widths, as shares of the width being tried. */
      loopShare: [0.7, 1],
      /** Metres a second round the loop. */
      speed: [0.5, 0.9],
      /** The pace across the loop as a share of the pace along it, so the loop never repeats. */
      crossPaceShare: [0.6, 0.9],
      /** The ground all the way round a loop must lie between these. */
      loopGround: [-6, -0.9],
      circle: [0.4, 1.6],
      deepestGround: -7,
    },
    /** Where the school by the pier may settle: to each side of it, and past its far end. */
    byThePier: {
      toEachSide: 7,
      fromShareOfLength: 0.6,
      pastTheEnd: 8,
      ground: [-2.6, -1.0],
      tries: 3000,
    },
    /** Ground a school or a party may settle over. */
    settlingGround: [-2.6, -1.2],
    settlingTries: 5000,
  },

  crabs: {
    count: 8,
    /** They live on the sand just above the water, this far at most from the middle of home. */
    reachFromHome: 75,
    startingGround: [0.15, 0.9],
    walkableGround: [0.1, 0.95],
    startingTries: 20000,
    hue: [0.02, 0.07],
    saturation: [0.45, 0.62],
    lightness: [0.3, 0.42],
    /** A crab runs from the player inside this distance. */
    fleeWithin: 4,
    fleeSpeed: 2.4,
    scuttleSpeed: 0.7,
    /** It scuttles for a while, rests for a while, and rests again when it meets water or grass. */
    scuttleSeconds: [0.3, 0.9],
    restSeconds: [0.8, 3],
    restWhenBlockedSeconds: [0.5, 1.5],
    firstRestSeconds: [0, 2],
    /** Height of the shell's middle above the sand, and how far its scuttle bobs it. */
    standsAt: 0.035,
    bob: 0.008,
  },

  turtle: {
    shell: 0x6b5a33,
    flippers: 0x7f8f55,
    /** It swims a ring round the lagoon: where the ground first drops this low, looking outward. */
    ringGround: -3,
    ringFrom: 40,
    ringTo: 120,
    /** Radians a second round the ring, and where on it the turtle starts. */
    pace: 0.012,
    startsAt: 1.2,
    /** The shell's depth below the water's surface, and how far it rises and falls. */
    depth: 0.5,
    drift: 0.12,
  },

  beachFinds: {
    /** All lie on the sand between these heights, this far at most from the middle of home. */
    ground: [0.05, 1.2],
    reachFromHome: 75,
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
  },

  flowers: {
    count: 350,
    /** They grow on high ground within this far of the middle of home. */
    lowestGround: 1.9,
    reachFromHome: 60,
    triesEach: 800,
    size: [0.7, 1.4],
    stemHeight: 0.2,
    stem: 0x3f7a2c,
    blooms: [0xff7fb0, 0xffffff, 0xffe14a, 0xe02a2a],
  },

  butterflies: {
    count: 14,
    lowestGround: 1.9,
    reachFromHome: 50,
    tries: 3000,
    colours: [0xff8c1a, 0xffe14a, 0x4aa3ff, 0xffffff, 0xff5fa0],
    /** Each one's own multiple of the pace it wanders at. */
    paceVariation: [0.6, 1.2],
    /** It flies between this far above the ground and that much higher again. */
    lowestFlight: 0.5,
    climb: [0.3, 1.4],
    /** Radians a second of the wing beat. */
    wingPace: [22, 32],
    /** They are out only while there is this much daylight (0 night, 1 full day). */
    outAboveDaylight: 0.3,
  },

  fireflies: {
    count: 80,
    /** This many gather round the hut, within this far of it; the rest are over high ground. */
    roundTheHut: 30,
    reachFromHut: 8,
    lowestGround: 1.7,
    reachFromHome: 50,
    tries: 2000,
    heightAboveGround: [0.4, 2],
    size: 0.14,
    colour: 0xd8ff70,
    /** They show only when it is at least this much night (0 day, 1 night). */
    outAboveNight: 0.01,
  },

  dolphins: {
    colour: 0x6f8796,
    count: 2,
    /** The first leaps this often, and each one after it that much less often and that much later. */
    secondsBetweenLeaps: 9,
    secondsMoreForEach: 2.5,
    secondsLaterForEach: 4.3,
    leapSeconds: 2.2,
    leapHeight: 3.2,
    leapLength: 8,
    /** How far the body sits under the surface at each end of a leap. */
    startsBelowSurface: 1,
    /** They leap off the south side: the direction from the atoll's centre, and its spread. */
    direction: 1.45,
    directionApart: 0.22,
    directionSpread: 0.55,
    /** Outside the reef: this far beyond the outer shoreline, give or take. */
    beyondTheShore: 64,
    beyondTheShoreSpread: 7,
  },
} as const;
