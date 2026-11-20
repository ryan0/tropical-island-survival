// Colours are red, green, blue from 0 to 1. Angles are radians; the sun's height is its angle
// above the horizon. A time of day is a phase: 0 midnight, 0.25 morning, 0.5 noon.

export const skyConfig = {
  day: {
    /** Seconds from one midnight to the next. */
    length: 600,
    /** The island starts in mid-morning. */
    startsAt: 0.4,
    /**
     * The sun's height through the day: this at six in the morning and evening, and as much
     * higher at noon as it is lower at midnight. It is up for about 6.4 minutes of the ten.
     */
    sunHeightAtSix: 0.28,
    sunHeightSwing: 0.44,
    /**
     * The moon stands highest this share of a day after the sun does: at a half, at midnight, when
     * it is opposite the sun and full. (Its phases will come of this number.) How high it climbs,
     * and the share of the day it is above the horizon: a little longer than the sun is below it,
     * so that a full moon is already up in the east as the sun sets, and sets in the west after
     * sunrise.
     */
    moonBehindSun: 0.5,
    moonHighest: 0.72,
    moonUpShare: 0.36,
    /** The times the day can be hurried on to, one after the next: dawn, day, golden, sunset, night. */
    namedTimes: [0.19, 0.5, 0.754, 0.825, 0.0],
    /** Hurrying to a chosen time: phases a second, at least, and as a multiple of what is left. */
    slowestHurry: 0.03,
    hurryShare: 1.5,
    /** The names on the corner button change at these sun heights. */
    belowIsNight: 0,
    belowIsDawnOrSunset: 0.14,
    belowIsMorningOrGolden: 0.42,
  },

  light: {
    /** Daylight is full with the sun this high, and none with it on the horizon. */
    fullDaylightAt: 0.5,
    /** Night falls between these sun heights: complete at the first, gone by the second. */
    nightFrom: -0.14,
    nightTo: 0.04,
    /** The sun is drawn a little lower than it stands, so that it sets into the sea. */
    drawnLower: 0.09,
    /**
     * The bearing it stands on at noon, and how far to each side of that it rises and sets:
     * up in the east-north-east, down in the west-north-west, out over the sea from home.
     */
    noonBearing: 0.35,
    bearingSwing: 1.25,
  },

  colours: {
    /** Overhead: at sunset, by day, at night. It stays blue until late. */
    overhead: { lowSun: [0.08, 0.3, 0.55], day: [0.33, 0.56, 0.87], night: [0.01, 0.015, 0.06] },
    /** How fast the overhead colour turns to day as daylight grows: less is sooner. */
    overheadEagerness: 0.55,
    horizon: { lowSun: [0.83, 0.64, 0.45], day: [0.49, 0.69, 0.86], night: [0.07, 0.09, 0.22] },
    /** The sun itself, and the light it gives. It stays golden well up the sky. */
    sun: { low: [1, 0.6, 0.28], high: [1, 0.96, 0.82] },
    sunGoldenness: 1.6,
    /**
     * What the sun does to cloud: orange-pink at sunset (clouds stand high and still catch it
     * when the ground has lost it), gold as it sinks, white by day, and the moon by night.
     */
    cloudInSun: { sunset: [1, 0.6, 0.41], golden: [1, 0.83, 0.6], day: [1, 0.99, 0.97] },
    cloudInMoonlight: [0.15, 0.19, 0.3],
    /** The shade the sky fills in on a cloud: slate at dusk, blue-grey by day. */
    cloudInShade: { lowSun: [0.33, 0.34, 0.44], day: [0.68, 0.74, 0.86], night: [0.1, 0.12, 0.19] },
  },

  /**
   * How cloudy it is: 0 a clear sky, 0.45 a few small clouds, 1 the full field of cumulus and
   * towers. Each spell is [how cloudy, for how many seconds]; the list goes round and round.
   * It is 12 minutes long against a ten-minute day, so each day's weather falls at other hours.
   */
  cloudCover: {
    spells: [
      [1, 140],
      [0.45, 110],
      [0, 100],
      [0.45, 90],
      [1, 170],
      [0.45, 110],
    ],
    /** Seconds to go from clear to full: clouds thin and gather rather than switching. */
    secondsToChange: 55,
    /** A choice made in the menu is reached sooner, so that it can be looked at straight away. */
    secondsToChangeWhenChosen: 8,
    /** What a test that stops the clock gets unless it asks for something else. */
    whenClockIsStopped: 1,
  },

  /**
   * The wind: 0 none, 0.33 light, 0.66 moderate (the island's usual breeze), 1 high. It sets how
   * fast the clouds drift and boil, how ruffled the water is, and how the palms and grass sway.
   * The swell is not the wind's doing and carries on regardless. 10.7 minutes round.
   */
  wind: {
    spells: [
      [0.66, 120],
      [0.33, 90],
      [0, 70],
      [0.33, 80],
      [0.66, 100],
      [1, 100],
      [0.66, 80],
    ],
    secondsToChange: 60,
    secondsToChangeWhenChosen: 4,
    whenClockIsStopped: 0.66,
    usualBreeze: 0.66,
  },

  glare: {
    /** The glare overlay at its strongest, and how much of it a cloud across the sun leaves. */
    strongest: 0.85,
    leftByCloud: 0.15,
    /** How tightly it keeps to looking straight at the sun: more is tighter. */
    tightness: 8,
  },

  /**
   * Where the stars stand (sky-turn.ts). The island lies this far north of the equator (radians:
   * 7 degrees), so the sky's pole stands as high over the northern horizon, and the whole sky
   * turns about it once a day, east to west. The right ascension (hours) due south at midnight
   * sets the season. 20 is a night of late July: at dusk the Southern Cross and the Pointers low
   * in the south-west, Scorpius high in the south and the galaxy's bright middle climbing behind
   * it; at midnight that middle in the south-west, away from the moon, and the Milky Way over
   * the top of the sky; before dawn Pegasus, the Pleiades and the first of Orion.
   */
  starrySky: {
    latitude: 0.122,
    dueSouthAtMidnight: 20,
  },

  /** The stars (stars.ts): the real ones of star-places.ts, and the rest scattered at random. */
  stars: {
    count: 4200,
    /**
     * The random ones' magnitudes run from the first to the second, with this many times as many
     * stars at each magnitude as at the one brighter, as in the real sky.
     */
    randomMagnitudes: [2.8, 6],
    moreAtEachMagnitude: 3,
    /**
     * The random ones crowd towards the galaxy's plane: this many times as many in it as towards
     * its poles, falling off over this angle (radians) to each side.
     */
    crowdingInMilkyWay: 2.5,
    crowdingWidth: 0.35,
    /** The share of the random stars of each colour class. */
    colourShares: { B: 0.2, A: 0.25, F: 0.15, G: 0.12, K: 0.24, M: 0.04 },
    /** The colour of each class in full. The eye sees little of it (`colourShown`). */
    classColours: {
      B: [0.78, 0.86, 1],
      A: [0.9, 0.94, 1],
      F: [1, 1, 0.95],
      G: [1, 0.94, 0.82],
      K: [1, 0.84, 0.64],
      M: [1, 0.72, 0.5],
    },
    /** How much of that colour shows on the faintest stars, and on those of magnitude 0 and brighter. */
    colourShown: [0.2, 0.8],
    /**
     * The faintest magnitude the eye makes out: by day, and on a moonless night; how many
     * magnitudes a full moon's light takes from that over the whole sky, and how many more near it.
     */
    faintestSeen: { byDay: -3, byNight: 6.2, lostToMoonlight: 0.3, lostNearMoon: 2.3 },
    /** All of `lostNearMoon` is lost within the first angle of the moon, none beyond the second (radians). */
    nearMoon: [0.15, 0.5],
    /** A star fades out over this many magnitudes as it nears the faintest seen. */
    fadesOver: 0.8,
    /**
     * Low down the eye looks through more air: below this height (the sine of 15 degrees) a star
     * loses up to this many magnitudes at the horizon, and takes on this colour.
     */
    lowDown: 0.26,
    lostAtHorizon: 2.2,
    colourAtHorizon: [1, 0.8, 0.6],
    /**
     * How bright a star of magnitude 0 is drawn at its middle; and a magnitude's ratio of light
     * (2.5) is drawn as that ratio to this power, as a screen cannot show the true range.
     */
    brightnessAtMagnitudeZero: 1.8,
    contrast: 0.32,
    /**
     * Each star is a soft spot, a normal curve this wide (its spread, in CSS pixels) on the
     * faintest and on the brightest, reached at these magnitudes.
     */
    spread: [0.6, 1.5],
    spreadAtMagnitudes: [5, -1],
    /**
     * Twinkling: how far the light swings overhead and at the horizon, and the two paces
     * (radians a second) whose beat makes it, each star at its own pace a little off these.
     */
    twinkle: [0.06, 0.4],
    twinklePaces: [23, 37],
  },

  /**
   * The Milky Way (milky-way-picture.ts): its picture, laid out in the galaxy's longitude across
   * and the sine of its latitude up, to `reaches` (radians) to each side of its plane.
   */
  milkyWay: {
    pictureSize: [512, 128],
    reaches: 0.5,
    /**
     * The band and the glow of its middle are drawn this many times as wide as the tables in
     * milky-way-picture.ts have them: at their own width the band was a thin scarf, its faint
     * outer parts lost on a screen.
     */
    widened: 1.4,
    /** Its colour where it is brightest: a pale grey-blue glow to the eye, not a long exposure's. */
    colour: [0.19, 0.205, 0.26],
    /**
     * How much of it a full moon washes out. (A real full moon washes out nearly all of it. The
     * game's moon is full every night until it has phases, and the Milky Way would never be seen.)
     */
    lostToMoonlight: 0.45,
    /** How much its glow is mottled into knots, and how much the gaps between them darken it. */
    mottling: 0.55,
    gaps: 0.6,
    /** The glow is eased to this power, as the eye takes it: the fainter parts are still made out. */
    easing: 0.9,
  },

  moon: {
    /** How far the disc's edge is from its middle (radians): the sun's is drawn as wide, as the real one is. */
    radius: 0.034,
    /**
     * Its light begins to pale the sky, hiding faint stars and the Milky Way, with the moon this
     * high (the sine of its height), and has paled it in full this high.
     */
    paleningTheSky: [-0.05, 0.1],
    /** The picture of its face (moon-face-picture.ts), dots a side. */
    facePictureSize: 256,
    /** How much darker the seas are than the highlands: a full moon is bright and soft to the eye. */
    seasDarker: 0.3,
    /** How much brighter than the highlands the young craters and their rays are. */
    raysBrighter: 0.08,
  },
} as const;
