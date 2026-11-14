import type { DirectionalLight, WebGLRenderer } from 'three';
import type { View } from './view';

export interface AutomaticQuality {
  /** How many steps down have been taken; `SETTLED` once it has stopped measuring. */
  readonly stage: number;
  /** `realSeconds` is the true time since the last frame. Nothing is measured while `isPaused`. */
  update(realSeconds: number, isPaused: boolean): void;
}

/** The stage at which it stops measuring, having either stepped down three times or found the phone fast enough. */
export const SETTLED = 3;

// Frames are timed in batches of this many. A batch slower than about 28 a second takes a step
// down; one faster than about 42 settles it.
const FRAMES_IN_A_BATCH = 90;
const TOO_SLOW = 0.036;
const FAST_ENOUGH = 0.024;
// A frame this long is a pause (the tab was hidden), not a slow phone.
const A_PAUSE = 1;

/**
 * If the phone cannot keep up, drops the resolution, then the shadows, then the resolution
 * again. `isOff` starts it settled: the tests draw far slower than any phone.
 */
export function createAutomaticQuality(
  renderer: WebGLRenderer,
  view: View,
  sunLight: DirectionalLight,
  isOff: boolean,
): AutomaticQuality {
  let stage = isOff ? SETTLED : 0;
  let frames = 0;
  let seconds = 0;

  function stepDown(): void {
    stage++;
    if (stage === 2) {
      sunLight.castShadow = false;
      return;
    }
    renderer.setPixelRatio(stage === 1 ? 1 : 0.75);
    renderer.setSize(view.width, view.height);
  }

  return {
    get stage() {
      return stage;
    },

    update(realSeconds, isPaused) {
      if (isPaused || stage >= SETTLED || realSeconds >= A_PAUSE) return;

      frames++;
      seconds += realSeconds;
      if (frames < FRAMES_IN_A_BATCH) return;

      const secondsAFrame = seconds / frames;
      frames = 0;
      seconds = 0;
      if (secondsAFrame > TOO_SLOW) stepDown();
      else if (secondsAFrame < FAST_ENOUGH) stage = SETTLED;
    },
  };
}
