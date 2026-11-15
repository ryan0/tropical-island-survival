/** What the frames of the last second cost. The debug panel reports it, so that the phone can. */
export interface FrameMeter {
  readonly framesPerSecond: number;
  /** The longest wait for a frame. */
  readonly slowestFrameMilliseconds: number;
  /**
   * What the program spent on a frame, on average. The rest of a frame's time is the graphics
   * card drawing it, or the screen waiting for its next refresh.
   */
  readonly programMilliseconds: number;
  /** `realSeconds` is the true time since the last frame; `programSeconds`, what the program spent on this one. */
  update(realSeconds: number, programSeconds: number): void;
}

/** A frame this long is a pause (the tab was hidden), not a slow phone. */
export const A_PAUSE = 1;

// Long enough for steady numbers, short enough to follow the view as it turns.
const MEASURED_OVER_SECONDS = 1;

export function createFrameMeter(): FrameMeter {
  let framesPerSecond = 0;
  let slowestFrameMilliseconds = 0;
  let programMilliseconds = 0;

  let frames = 0;
  let seconds = 0;
  let slowest = 0;
  let spentByProgram = 0;

  return {
    get framesPerSecond() {
      return framesPerSecond;
    },
    get slowestFrameMilliseconds() {
      return slowestFrameMilliseconds;
    },
    get programMilliseconds() {
      return programMilliseconds;
    },

    update(realSeconds, programSeconds) {
      if (realSeconds >= A_PAUSE) return;

      frames++;
      seconds += realSeconds;
      slowest = Math.max(slowest, realSeconds);
      spentByProgram += programSeconds;
      if (seconds < MEASURED_OVER_SECONDS) return;

      framesPerSecond = frames / seconds;
      slowestFrameMilliseconds = slowest * 1000;
      programMilliseconds = (spentByProgram / frames) * 1000;
      frames = 0;
      seconds = 0;
      slowest = 0;
      spentByProgram = 0;
    },
  };
}
