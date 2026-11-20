// The views the look is measured through (draw-views.ts draws them; the boards name parts of
// them). They are in the tests' own form, so that the tests' page helper can draw them, but they
// are not the tests' views: those are chosen to catch what is broken, these to put one material
// squarely in front of the eye, in the usual breeze under a nearly clear sky, where a photograph
// of the same thing can be laid beside it.
//
// A view's name is its picture's file name. A board that names a part of a view ('C3:E4') goes
// by where things stand in it: move a view's pose and every board that uses it must be looked
// over again.

import type { Moment, ReferenceView } from '../../tests/reference-views.ts';

type Pose = ReferenceView['pose'];

const NOON = 0.5;
const SUNSET = 0.84;
const USUAL_BREEZE = 0.66;
const LIGHT_BREEZE = 0.33;
const NEARLY_CLEAR = 0.2;

function moment(changes: Partial<Moment> = {}): Moment {
  return {
    waveTime: 20,
    wind: USUAL_BREEZE,
    cloudCover: NEARLY_CLEAR,
    sun: { dayPhase: NOON },
    ...changes,
  };
}

function view(
  name: string,
  shows: string,
  pose: Pose,
  changes: Partial<Moment> = {},
  options: { heightIsAboveGround?: boolean; fieldOfView?: number } = {},
): ReferenceView {
  return { name, shows, pose, fieldOfView: 60, ...options, moments: [moment(changes)] };
}

const aboveGround = { heightIsAboveGround: true };
const calm = { wind: LIGHT_BREEZE };
const atSunset = { sun: { dayPhase: SUNSET } };

const HOME_BEACH: Pose = [3, 2.3, 160, Math.PI, -0.02];
const HOME_CLEARING: Pose = [-8, 5.2, 144.5, 0.7, -0.1];
const INLAND_FROM_BEACH: Pose = [3, 3.1, 160, 0, 0];
const ALONG_THE_BEACH: Pose = [-20, 1.9, 161, Math.PI / 2, 0];
const TOWARDS_THE_SETTING_SUN = 2.24;

/** Sky, sea, sand, plants, coral and shade by day, and the sunset: what the colour board measures. */
const colour: ReferenceView[] = [
  view(
    'beach-out-to-sea',
    'the sea over the reef, the sky and dry sand, from home beach',
    HOME_BEACH,
  ),
  view(
    'beach-along-palms',
    'sand, shrubs and palm crowns along the beach',
    ALONG_THE_BEACH,
    {},
    aboveGround,
  ),
  view('inland-from-beach', 'turf, shrubs and palms looking inland', INLAND_FROM_BEACH),
  view('home-clearing', 'the grove from the home clearing', HOME_CLEARING),
  view(
    'above-inland',
    'a palm crown, shrubs, turf and a path from above',
    [-5, 13, 140, 0.7, -1.15],
    {},
    aboveGround,
  ),
  view(
    'lagoon-from-above',
    'the deep lagoon, its sandbank and coral heads from 70 m up',
    [20, 70, 30, 0.5, -1.25],
  ),
  view('aerial', 'the whole atoll in the open sea', [-230, 190, 400, -0.5, -0.42]),
  view(
    'lagoon-from-shore',
    'the lagoon and the far shore from wading height',
    [8, 1.6, 88, 0.3, 0.04],
  ),
  view(
    'sunset-at-sea',
    'the sunset over the reef',
    [0, 1.6, 300, TOWARDS_THE_SETTING_SUN, 0.06],
    atSunset,
  ),
  view('sky-high', 'the sky from the horizon to high up', [3, 2.3, 160, Math.PI, 0.85]),
  view('open-sea', 'the sea out beyond the reef', [0, 3, 300, Math.PI, -0.03]),
  view(
    'far-grove',
    'a grove across the deep lagoon',
    [40, 1.6, 40, 2.4, 0.03],
    {},
    { fieldOfView: 30 },
  ),
  view(
    'sunset-from-beach',
    'the sunset from home beach',
    [3, 2.3, 160, TOWARDS_THE_SETTING_SUN, 0.05],
    atSunset,
  ),
  view('reef-flat-wade', 'clear shallow water over sand, wading on the reef flat', [
    5,
    1.6,
    190,
    Math.PI,
    -0.3,
  ]),
  view('under-lagoon-head', 'a coral head from under water', [8, -0.8, 80, 0.3, -0.05], calm),
  view(
    'head-from-above',
    'a coral head and the sand floor through the surface',
    [14, 2.5, 84, 0.6, -0.7],
    calm,
  ),
  view('head-top-down', 'the sand floor and its shadows from 9 m up', [20, 9, 70, 0.6, -1.4], calm),
  view('under-head-close', 'two coral heads from under water', [14, -1.2, 78, 0.9, -0.1], calm),
  view('head-top-close', "a head's corals from straight above", [73, 5, 56, 0, -1.5], calm),
  view(
    'head-top-close-2',
    "another head's corals from straight above",
    [-41, 5, 90, 0, -1.5],
    calm,
  ),
  view(
    'head-side-wading',
    'a head near a beach from wading height',
    [66, 1.2, 50, 0.8, -0.35],
    calm,
  ),
  view(
    'shade-from-above',
    "a palm's shade on a lagoon beach, and the waterline by a head",
    [-43, 16, 96, 0, -1.5],
    calm,
  ),
  view(
    'shade-low',
    "a palm's shade on sand from standing height",
    [84, 2.2, 66, 0.85, -0.35],
    calm,
  ),
  view(
    'shade-beach-top',
    'sun and shade on sand at the top of the beach',
    [14, 1.7, 158, 0.3, -0.45],
    calm,
    aboveGround,
  ),
  view(
    'grove-floor',
    'the path and the turf under the palms',
    [-8, 1.7, 144.5, 0.7, -0.6],
    calm,
    aboveGround,
  ),
];

/** The low sun from other sides and at other moments. */
const evening: ReferenceView[] = [
  view(
    'sunset-away-from-sun',
    'the sky opposite the setting sun',
    [3, 2.3, 160, 5.4, 0.05],
    atSunset,
  ),
  view('sunset-inland', 'the grove at sunset', [3, 2.3, 160, 0.3, 0.08], atSunset),
  view(
    'golden-hour-beach',
    'the beach an hour before sunset',
    [3, 2.3, 160, TOWARDS_THE_SETTING_SUN, 0.05],
    {
      sun: { dayPhase: 0.754 },
    },
  ),
  view(
    'sunset-low-over-reef',
    'the sun on the horizon from just above the water',
    [0, 1.2, 230, 2.6, 0.12],
    {
      sun: { dayPhase: 0.825 },
    },
  ),
  view('dusk-beach', 'the beach just after sunset', [3, 2.3, 160, TOWARDS_THE_SETTING_SUN, 0.05], {
    sun: { dayPhase: 0.86 },
  }),
  view('dawn-beach', 'sunrise along the beach', [3, 2.3, 160, -1.716, 0.02], {
    sun: { dayPhase: 0.19 },
  }),
];

/** Other light and weather: a change of colour made for a clear noon must hold up in these. */
const weather: ReferenceView[] = [
  view('beach-cloudy', 'home beach under cloud', HOME_BEACH, { cloudCover: 0.95 }),
  view('inland-cloudy', 'inland under cloud', INLAND_FROM_BEACH, { cloudCover: 0.95 }),
  view('beach-morning', 'home beach in the morning', HOME_BEACH, {
    cloudCover: 0.3,
    sun: { dayPhase: 0.3 },
  }),
  view(
    'night-along-the-beach',
    'the beach by moonlight',
    [-20, 1.9, 161, Math.PI / 2, -0.12],
    { ...calm, cloudCover: 0.25, sun: { dayPhase: 0 } },
    aboveGround,
  ),
  view('night-home-clearing', 'the grove by moonlight', HOME_CLEARING, {
    ...calm,
    cloudCover: 0.25,
    sun: { dayPhase: 0 },
  }),
  view('lagoon-high-wind', 'the lagoon in a high wind', [8, 1.6, 88, 0.3, 0], {
    wind: 1,
    cloudCover: 0.5,
  }),
];

const LAGOON_FLOOR: Pose = [8, -1.0, 80, 0.3, -0.05];
// A wave of a set stands up on the south-east fore reef and is about to throw its lip at this moment on the wave
// clock, just east of this spot (the tests' view `photo-barrel` looks at it from above the water).
const A_SET_WAVE_BREAKS = 72.6;
const BESIDE_THE_BREAK: Pose = [44, -1.5, 322, 4.86, 0.2];
// The sun stands due south at noon, 41 degrees up: a yaw of half a turn looks towards it.
const TOWARDS_THE_NOON_SUN = Math.PI;

/** From under water: how colour goes with distance, the surface from below, light in the water. */
const underWater: ReferenceView[] = [
  view('under-level-lagoon', 'level across the lagoon floor to a coral head', LAGOON_FLOOR, calm),
  view(
    'under-level-towards-sun',
    'level, towards the sun',
    [8, -1.2, 80, TOWARDS_THE_NOON_SUN, 0.12],
    calm,
  ),
  view('under-level-away-from-sun', 'level, away from the sun', [8, -1.2, 80, 0, 0.05], calm),
  view(
    'under-up-towards-sun',
    'up at the surface towards the sun',
    [8, -1.6, 80, TOWARDS_THE_NOON_SUN, 0.7],
    calm,
  ),
  view('under-straight-up', 'straight up at the surface', [8, -1.6, 80, 0.3, 1.35], calm),
  view('under-down-at-sand', 'down at the sand floor', [8, -0.8, 84, 0.3, -1.0], calm),
  view('under-head-close', 'two coral heads from a few metres', [14, -1.2, 78, 0.9, -0.1], calm),
  view('under-coral-near', "a head's corals from close by", [68.8, -1.0, 51.8, 3.927, -0.1], calm),
  view('under-reef-flat', 'the shallow reef flat', [5, -0.6, 190, Math.PI, 0.2], calm),
  view('under-fore-reef', 'the fore reef, 4 m down', [0, -4, 340, Math.PI, -0.1], calm),
  view('under-drop-off', 'down the drop-off into deep water', [0, -6, 368, Math.PI, -0.3], calm),
  view('under-usual-breeze', 'the lagoon floor in the usual breeze', LAGOON_FLOOR),
  view('under-cloudy', 'the lagoon floor under cloud', LAGOON_FLOOR, { ...calm, cloudCover: 0.95 }),
  view(
    'under-low-sun',
    'the lagoon towards a low sun',
    [8, -1.2, 80, TOWARDS_THE_SETTING_SUN, 0.15],
    {
      ...calm,
      sun: { dayPhase: 0.78 },
    },
  ),
  view('under-night', 'the lagoon floor by moonlight', LAGOON_FLOOR, {
    ...calm,
    sun: { dayPhase: 0 },
  }),
  // The light in the water, and the far surface: rays towards the sun, up at it and from one side.
  view(
    'under-deep-towards-sun',
    'the fore reef 5 m down, towards the sun',
    [0, -5, 345, TOWARDS_THE_NOON_SUN, 0.25],
    calm,
  ),
  view(
    'under-deep-up-at-sun',
    'the sun through the surface from 5 m down',
    [0, -5, 345, TOWARDS_THE_NOON_SUN, 0.75],
    calm,
  ),
  view(
    'under-lagoon-towards-sun',
    'the lagoon, towards the sun',
    [8, -1.6, 80, TOWARDS_THE_NOON_SUN, 0.2],
    calm,
  ),
  view(
    'under-sun-to-one-side',
    'the lagoon with the sun to one side',
    [8, -1.6, 80, 1.9, 0.1],
    calm,
  ),
  view(
    'under-low-angle',
    'the surface from just under it, at a low angle',
    [8, -0.5, 80, 0.3, 0.12],
  ),
  // A wave of a set breaking on the south-east fore reef, from under water beside it and under it.
  view('under-wave-standing', 'a wave standing up, from beside it', BESIDE_THE_BREAK, {
    waveTime: A_SET_WAVE_BREAKS,
  }),
  view('under-wave-landed', 'the same wave a second on, its lip landed', BESIDE_THE_BREAK, {
    waveTime: A_SET_WAVE_BREAKS + 1,
  }),
  view('under-wave-overhead', 'its white water from below', [56, -2.5, 321, 4.86, 0.9], {
    waveTime: A_SET_WAVE_BREAKS + 1,
  }),
  view('under-behind-wave', 'the back of the wave from the reef side', [62, -2.2, 316, 1.2, 0.35], {
    waveTime: A_SET_WAVE_BREAKS + 0.6,
  }),
];

/** The ground of the islet, from standing height and from above: what the ground's board measures. */
const ground: ReferenceView[] = [
  view(
    'ground-grove-ahead',
    'the floor of the grove, looking along it',
    [-2, 1.6, 140, 0.4, -0.25],
    {},
    aboveGround,
  ),
  view(
    'ground-grove-at-feet',
    'the floor of the grove at the feet',
    [-2, 1.6, 140, 0.4, -1.0],
    {},
    aboveGround,
  ),
  view(
    'ground-grove-east',
    'the floor of the grove east of home',
    [22, 1.6, 138, 2.0, -0.4],
    {},
    aboveGround,
  ),
  view(
    'ground-grove-west',
    'the floor of the grove west of home',
    [-30, 1.6, 136, 1.2, -0.35],
    {},
    aboveGround,
  ),
  view('ground-path', 'a footpath through the grove', [-8, 1.6, 144.5, 0.7, -0.4], {}, aboveGround),
  view(
    'ground-beach-top-along',
    'where the plants begin, along the top of the beach',
    [-20, 1.6, 157, Math.PI / 2, -0.3],
    {},
    aboveGround,
  ),
  view(
    'ground-beach-top-inland',
    'the top of the beach, looking inland',
    [3, 1.6, 160, 0, -0.3],
    {},
    aboveGround,
  ),
  view(
    'ground-beach-top-at-feet',
    'the back of the beach at the feet',
    [12, 1.6, 157, 0.3, -0.9],
    {},
    aboveGround,
  ),
  view(
    'ground-lagoon-side',
    'the islet from its lagoon beach, looking inland',
    [8, 1.6, 103, Math.PI, -0.25],
    {},
    aboveGround,
  ),
  view(
    'ground-from-above',
    'the grove from thirty metres up',
    [-5, 30, 138, 0.7, -1.3],
    {},
    aboveGround,
  ),
  view(
    'ground-islet-from-above',
    'the home islet from a hundred metres up',
    [0, 110, 175, 0, -1.1],
  ),
  view(
    'ground-swash-ocean',
    'wet sand where the swash runs, on the ocean beach',
    [3, 1.5, 166, Math.PI / 2, -0.4],
    {},
    aboveGround,
  ),
  view(
    'ground-swash-lagoon',
    "wet sand at the lagoon's edge",
    [8, 1.5, 104.5, Math.PI / 2, -0.4],
    {},
    aboveGround,
  ),
  view(
    'ground-east-islet',
    'the ground of the eastern land',
    [121, 1.6, 6, 0.3, -0.3],
    {},
    aboveGround,
  ),
];

export const lookViews = { colour, evening, weather, underWater, ground };

export type ViewGroup = keyof typeof lookViews;
