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
    overhead: { lowSun: [0.17, 0.19, 0.45], day: [0.07, 0.36, 0.84], night: [0.01, 0.015, 0.06] },
    /** How fast the overhead colour turns to day as daylight grows: less is sooner. */
    overheadEagerness: 0.55,
    horizon: { lowSun: [1, 0.6, 0.34], day: [0.7, 0.88, 0.97], night: [0.07, 0.09, 0.22] },
    /** The sun itself, and the light it gives. It stays golden well up the sky. */
    sun: { low: [1, 0.46, 0.14], high: [1, 0.96, 0.82] },
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
} as const;
