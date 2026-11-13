// Distances are kilometres here, not metres: the clouds live on a far larger scale than the island.

export const cloudsConfig = {
  /** Width of a sky picture in dots, all the way round the horizon; it is an eighth as tall. */
  pictureWidth: 4096,
  /** A sky picture is redrawn in this many upright strips, one or a few a frame. */
  pictureStrips: 128,

  /**
   * The trade wind, in km a second at the usual breeze: from the east, about 20 km/h. It brings
   * the field of cumulus that starts out east of the island over it, so cloud shadows come and go.
   */
  drift: [-0.0058, 0.0012],
  /**
   * Where on the weather map the island starts out. Found by a search: towers stand opposite
   * the sunset and to one side of it and none overhead, the first cloud shadows cross the island
   * after about eight minutes, and there is no long overcast spell at midday in the first hour.
   */
  startsAt: [12, 23],
  /** The height whose drift a sky picture is slid by between redraws. */
  slideHeight: 1.2,
  /** Cloud is kept thin along the bearings the sun sets and rises on (radians from +z to +x). */
  sunsetBearing: -0.85,
  sunriseBearing: 1.5,
  /** 1/(2R): the ground curves away as for a small earth, R = 1200 km, so far clouds sink. */
  earthCurve: 1 / 2400,
  /** Towards the moon, which lights the clouds at night. The sky's shader has the same direction. */
  moonDirection: [-0.57, 0.63, -0.52],
  /** How fast the clouds drift in a moderate wind, as a multiple of 20 km/h: none in a calm. */
  driftSpeed: 3.25,
  /** How fast they change shape: this in a calm, and that much more in a moderate wind. */
  boilSpeedInCalm: 0.25,
  boilSpeedFromWind: 0.75,

  /** Noise that fills space: a cube this many dots a side, repeating in all three directions. */
  noiseSize: 64,
  /** The cube is stored as slices side by side, this many across and down one picture. */
  noiseSlicesAcross: 8,
  /** The weather map: this many dots a side, covering this many km, repeating. */
  weatherMapSize: 256,
  weatherMapSpan: 64,

  /** The map of the clouds' shadows: dots a side, and the km it covers with the island midmost. */
  shadeMapSize: 256,
  shadeMapSpan: 24,
  /** An eighth of the shade map is redrawn each frame. */
  shadeMapStrips: 8,
} as const;
