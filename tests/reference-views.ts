// The views the refactor is judged by: each is drawn from build 78 and from the page under
// test, and the two pictures must be the same (pictures.spec.ts).
//
// A view is where the camera stands; its moments are when: the wave clock, the wind, the cloud
// cover and the sun. Wind is 0 (none), 0.33, 0.66 or 1 (high); cloud cover is 0 (clear) to 1.

export type Sun =
  /** Time of day: 0 midnight, 0.19 dawn, 0.5 noon, 0.754 golden hour, 0.825 sunset. */
  | { dayPhase: number }
  /** A fixed sun height in radians, as build 78's picture tools set it: 0.72 is full day. */
  | { elevation: number };

export interface Moment {
  /** Seconds on the wave clock, which stands still while the picture is taken. */
  waveTime: number;
  wind: number;
  cloudCover: number;
  sun: Sun;
}

export interface ReferenceView {
  /** Names the test and the pictures it saves. */
  name: string;
  shows: string;
  /** x, y, z, yaw, pitch. The camera looks along (-sin yaw, -cos yaw). */
  pose: [number, number, number, number, number];
  /** The pose's y is the eye's height above the ground there, not above still sea level. */
  heightIsAboveGround?: boolean;
  /** Degrees, top to bottom. */
  fieldOfView: number;
  /** Leaves the joystick, buttons and captions in the picture. */
  showsControls?: boolean;
  moments: Moment[];
}

const MIDDAY: Moment = { waveTime: 20, wind: 1, cloudCover: 1, sun: { dayPhase: 0.5 } };

function at(changes: Partial<Moment> = {}): Moment {
  return { ...MIDDAY, ...changes };
}

// Build 78's own picture tools fixed the sun's height and left the wind at its usual 0.66.
function legacyToolsAt(elevation: number, waveTime = 20): Moment {
  return at({ waveTime, wind: 0.66, sun: { elevation } });
}

const DAWN = { dayPhase: 0.19 };
const GOLDEN_HOUR = { dayPhase: 0.754 };
const SUNSET = { dayPhase: 0.825 };
const MIDNIGHT = { dayPhase: 0 };

const wavesOnTheLagoonBeach = [20, 20.7, 21.4].flatMap((waveTime) => [
  at({ waveTime, wind: 0.66 }),
  at({ waveTime, wind: 1 }),
]);
const aWaveBreakingOnTheOceanBeach = [34.7, 35.0, 35.3, 35.9].map((waveTime) =>
  at({ waveTime, wind: 0.66 }),
);
const clearAndPartlyCloudy = (sun: Sun): Moment[] => [
  at({ sun, wind: 0.66, cloudCover: 0 }),
  at({ sun, wind: 0.66, cloudCover: 0.45 }),
];

export const referenceViews: ReferenceView[] = [
  // The sea, as tuned through builds 70 to 78.
  {
    name: 'high',
    shows: 'ocean beach, reef flat, breakers, open sea',
    pose: [3, 14, 150, 3.1416, -0.12],
    fieldOfView: 60,
    moments: [at()],
  },
  {
    name: 'deep',
    shows: 'whitecaps close to and far off',
    pose: [0, 6, 300, 3.1416, -0.14],
    fieldOfView: 60,
    moments: [at(), at({ waveTime: 20.6 })],
  },
  {
    name: 'west',
    shows: 'whitecaps looking downwind',
    pose: [0, 5, 300, 1.5708, -0.1],
    fieldOfView: 60,
    moments: [at()],
  },
  {
    name: 'lagoon',
    shows: 'the whole lagoon, in a high wind, a light wind and a calm',
    pose: [30, 26, 120, 0.5, -0.42],
    fieldOfView: 65,
    moments: [at(), at({ wind: 0.33 }), at({ wind: 0 })],
  },
  {
    name: 'lagoon-low',
    shows: 'lagoon whitecaps from low down',
    pose: [5, 3.5, 70, 0.3, -0.06],
    fieldOfView: 60,
    moments: [at()],
  },
  {
    name: 'beach',
    shows: 'open sea from eye height on the beach',
    pose: [3, 2.3, 160, 3.1416, -0.02],
    fieldOfView: 60,
    moments: [at()],
  },
  {
    name: 'lagoon-shore',
    shows: 'waves on the lagoon beach',
    pose: [5, 2.0, 94.85, 1.42, -0.2],
    fieldOfView: 66,
    moments: wavesOnTheLagoonBeach,
  },
  {
    name: 'lagoon-shore-low',
    shows: 'the height of the waves on the lagoon beach',
    pose: [5, 1.25, 93.15, 1.45, -0.07],
    fieldOfView: 62,
    moments: [at({ waveTime: 20.7 })],
  },
  {
    name: 'lagoon-shore-top',
    shows: 'foam on the lagoon sand from above',
    pose: [5, 7, 95.15, 0.3, -0.95],
    fieldOfView: 60,
    moments: [at({ waveTime: 20.7 })],
  },
  {
    name: 'ocean-shore',
    shows: 'a wave breaking on the ocean beach',
    pose: [5, 1.7, 163.8, 3.1416, -0.22],
    heightIsAboveGround: true,
    fieldOfView: 66,
    moments: aWaveBreakingOnTheOceanBeach,
  },
  {
    name: 'ocean-shore-along',
    shows: 'the same wave along the beach',
    pose: [5, 1.7, 164.8, 1.85, -0.2],
    heightIsAboveGround: true,
    fieldOfView: 66,
    moments: aWaveBreakingOnTheOceanBeach,
  },

  // Build 78's standard set (legacy/tools/views.json).
  {
    name: 'top',
    shows: 'the whole atoll from straight above',
    pose: [0, 360, 10, 0, -1.5],
    fieldOfView: 70,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'aerial',
    shows: 'the atoll from the air',
    pose: [-230, 190, 400, -0.5, -0.42],
    fieldOfView: 60,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'north-pass',
    shows: 'the lagoon and its pass from the north',
    pose: [-10, 60, -290, 3.1416, -0.5],
    fieldOfView: 70,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'surf',
    shows: 'the surf from the beach, past leaves close to the camera',
    pose: [-14, 2.6, 160, 3.1416, -0.16],
    fieldOfView: 50,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'shore',
    shows: 'the home shore from the sea',
    pose: [-2, 6, 180, 0.05, -0.12],
    fieldOfView: 60,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'home-clearing',
    shows: 'the home clearing',
    pose: [-8, 5.2, 144.5, 0.7, -0.1],
    fieldOfView: 60,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'lagoon-beach',
    shows: 'the lagoon from its beach',
    pose: [5, 3.4, 101, 0.1, -0.1],
    fieldOfView: 65,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'night',
    shows: 'the beach at night',
    pose: [9, 2.6, 162, 0.67, -0.1],
    fieldOfView: 60,
    moments: [legacyToolsAt(-0.16), ...clearAndPartlyCloudy(MIDNIGHT)],
  },

  // Build 78's views for comparing with photographs (legacy/tools/gviews.json).
  {
    name: 'photo-barrel',
    shows: 'a breaking wave from beside it',
    pose: [30, 1.3, 199, 4.86, -0.03],
    fieldOfView: 32,
    moments: [legacyToolsAt(0.72, 60.8)],
  },
  {
    name: 'photo-surf',
    shows: 'the reef flat through the water',
    pose: [40, 2.0, 166, 3.45, -0.05],
    fieldOfView: 40,
    moments: [legacyToolsAt(0.72, 60.8)],
  },
  {
    name: 'photo-drone',
    shows: 'the reef and beach from a drone',
    pose: [120, 30, 150, 2.2, -0.5],
    fieldOfView: 55,
    moments: [legacyToolsAt(0.72, 60.8)],
  },
  {
    name: 'photo-shore',
    shows: 'the wet sand at the water’s edge',
    pose: [9, 1.6, 169.2, 1.9, -0.22],
    fieldOfView: 62,
    moments: [legacyToolsAt(0.72, 60.8)],
  },

  // Build 78's views for comparing two builds (legacy/tools/abviews.json), less the two that
  // repeat the standard set.
  {
    name: 'grove',
    shows: 'the palm grove',
    pose: [-6, 4.2, 150, 0.4, -0.05],
    fieldOfView: 70,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'inland',
    shows: 'looking inland from the beach',
    pose: [3, 3.1, 160, 0, 0],
    fieldOfView: 72,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'shore-from-further-out',
    shows: 'the home shore from further out',
    pose: [-2, 6, 186, 0.05, -0.05],
    fieldOfView: 60,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'behind-the-beach',
    shows: 'rocks and vegetation behind the beach',
    pose: [26, 3.2, 160, -0.5, -0.2],
    fieldOfView: 65,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'above-the-home-shore',
    shows: 'the home shore from above the reef',
    pose: [40, 28, 190, 0.5, -0.55],
    fieldOfView: 60,
    moments: [legacyToolsAt(0.72)],
  },
  {
    name: 'low-sun',
    shows: 'the beach with the sun low',
    pose: [14, 2.0, 170, 0.3, -0.03],
    fieldOfView: 60,
    moments: [legacyToolsAt(0.12)],
  },

  // Other times of day, under clear and partly cloudy skies.
  {
    name: 'dawn',
    shows: 'sunrise along the beach',
    pose: [3, 2.3, 160, -1.716, 0.02],
    fieldOfView: 60,
    moments: clearAndPartlyCloudy(DAWN),
  },
  {
    name: 'evening',
    shows: 'the sun going down over the sea',
    pose: [3, 2.3, 160, 2.6, 0.03],
    fieldOfView: 60,
    moments: [...clearAndPartlyCloudy(GOLDEN_HOUR), ...clearAndPartlyCloudy(SUNSET)],
  },

  // Under water in the lagoon.
  {
    name: 'under-water',
    shows: 'a coral head and the sea floor from under water',
    pose: [-16, 1.2, 70, 0.905, -0.05],
    heightIsAboveGround: true,
    fieldOfView: 60,
    moments: [at(), at({ wind: 0.33, cloudCover: 0 })],
  },
  {
    name: 'under-water-looking-up',
    shows: 'the surface from below',
    pose: [5, 1.0, 62, 3.0, 0.55],
    heightIsAboveGround: true,
    fieldOfView: 60,
    moments: [at({ wind: 0.66, cloudCover: 0.45 })],
  },

  // The page's own controls, which every other view leaves out.
  {
    name: 'controls',
    shows: 'the joystick, the button and the hint over the scene',
    pose: [3, 2.3, 160, 3.1416, -0.02],
    fieldOfView: 60,
    showsControls: true,
    moments: [at()],
  },
];

export function describeMoment(moment: Moment): string {
  const sun =
    'dayPhase' in moment.sun
      ? `day phase ${moment.sun.dayPhase}`
      : `sun height ${moment.sun.elevation}`;
  return `wave time ${moment.waveTime} s, wind ${moment.wind}, cloud cover ${moment.cloudCover}, ${sun}`;
}
