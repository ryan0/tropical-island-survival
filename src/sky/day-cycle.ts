import { skyConfig } from './sky-config';

export interface DayCycle {
  /** Where in the day it is: 0 midnight, 0.5 noon. */
  readonly phase: number;
  /** The time the day is hurrying on to, if it is. */
  readonly hurryingTo: number | null;
  /** Hurries the day on to a time, quickly at first and easing in; null lets it run as usual. */
  hurryTo(phase: number | null): void;
  /** Hurries on to whichever of the named times comes next. */
  hurryToNextNamedTime(): void;
  /** Stops the day where it is (or where it is hurrying to), or lets it run again. */
  hold(isHeld: boolean): void;
  /** For tests: puts the day at a time at once. */
  jumpTo(phase: number): void;
  /** For tests: a sun height that overrides the time of day, or null to follow it again. */
  fixSunHeight(height: number | null): void;
  /**
   * `dt` is the frame's step, `realSeconds` the true time since the last frame: the day runs
   * by the real clock, so that a slow phone still gets a ten-minute day.
   */
  update(dt: number, realSeconds: number, isClockStopped: boolean): void;
  sunHeight(): number;
  /** False in the afternoon, and whenever a test has fixed the sun's height. */
  isMorning(): boolean;
}

const config = skyConfig.day;
// A frame that took longer than this is counted as this: a pause must not skip the day on.
const LONGEST_FRAME = 0.5;
// A named time this near ahead is taken as the one the day is already at.
const ALREADY_THERE = 0.02;
const NEAR_ENOUGH = 0.001;

/** How far ahead `to` is of `from`, going forward round the day: 0 up to 1. */
function aheadOf(from: number, to: number): number {
  return (((to - from) % 1) + 1) % 1;
}

function sunHeightAt(phase: number): number {
  return config.sunHeightAtSix + config.sunHeightSwing * Math.cos(6.2831853 * (phase - 0.5));
}

export function createDayCycle(): DayCycle {
  let phase: number = config.startsAt;
  let hurryingTo: number | null = null;
  let isHeld = false;
  let fixedSunHeight: number | null = null;

  return {
    get phase() {
      return phase;
    },
    get hurryingTo() {
      return hurryingTo;
    },

    hurryTo(target) {
      hurryingTo = target;
    },

    hurryToNextNamedTime() {
      let next: number = config.namedTimes[0];
      let nearest = 9;
      for (const time of config.namedTimes) {
        const ahead = aheadOf(phase, time);
        if (ahead > ALREADY_THERE && ahead < nearest) {
          nearest = ahead;
          next = time;
        }
      }
      hurryingTo = next;
    },

    hold(held) {
      isHeld = held;
    },

    jumpTo(newPhase) {
      phase = newPhase;
    },

    fixSunHeight(height) {
      fixedSunHeight = height;
    },

    update(dt, realSeconds, isClockStopped) {
      if (hurryingTo !== null) {
        const ahead = aheadOf(phase, hurryingTo);
        const step = Math.min(ahead, dt * Math.max(config.slowestHurry, ahead * config.hurryShare));
        phase = (phase + step) % 1;
        if (ahead - step < NEAR_ENOUGH) hurryingTo = null;
      } else if (!isClockStopped && !isHeld) {
        phase = (phase + Math.min(realSeconds, LONGEST_FRAME) / config.length) % 1;
      }
    },

    sunHeight() {
      return fixedSunHeight ?? sunHeightAt(phase);
    },

    isMorning() {
      return fixedSunHeight === null && phase < 0.5;
    },
  };
}
