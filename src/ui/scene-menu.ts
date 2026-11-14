import { createMenu, type Menu } from './menu';

export interface SceneMenuActions {
  /** A time of day to hurry to and hold (0 midnight, 0.5 noon), or null to let the day run. */
  chooseTime: (phase: number | null) => void;
  /** How cloudy to make it (0 clear to 1 cloudy), or null to let the weather follow its spells. */
  chooseCloudCover: (cloudCover: number | null) => void;
  /** How windy to make it (0 none to 1 high), or null. */
  chooseWind: (wind: number | null) => void;
  /** The button that turns the sound of the waves on and off. */
  soundButton: HTMLElement;
}

/**
 * The menu under the corner button: choose the time of day, the sky and the wind (each can be
 * left on "auto" to follow its own cycle), and turn the sound on or off. For trying things
 * out; the game will have its own.
 */
export function createSceneMenu(parent: HTMLElement, actions: SceneMenuActions): Menu {
  return createMenu(parent, [
    {
      label: 'time',
      choices: [
        ['auto', null],
        ['dawn', 0.19],
        ['day', 0.5],
        ['golden', 0.754],
        ['sunset', 0.825],
        ['night', 0],
      ],
      choose: actions.chooseTime,
    },
    {
      label: 'sky',
      choices: [
        ['auto', null],
        ['clear', 0],
        ['few clouds', 0.45],
        ['cloudy', 1],
      ],
      choose: actions.chooseCloudCover,
    },
    {
      label: 'wind',
      choices: [
        ['auto', null],
        ['none', 0],
        ['light', 0.33],
        ['moderate', 0.66],
        ['high', 1],
      ],
      choose: actions.chooseWind,
    },
    { label: 'sound', control: actions.soundButton },
  ]);
}
