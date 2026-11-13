import { skyConfig } from './sky-config';

/** One of the two things the weather is made of: how cloudy it is, or how windy. */
export interface Spells {
  /** Its strength at the moment. */
  readonly now: number;
  /** Holds it at a strength, reached in a few seconds; null lets it follow its spells again. */
  choose(strength: number | null): void;
}

export interface Weather {
  /** 0 a clear sky to 1 the full field of cloud. */
  cloudCover: Spells;
  /** 0 none, 0.33 light, 0.66 moderate, 1 high. */
  wind: Spells;
  update(dt: number): void;
  /** For tests, whose clock stands still: this weather at once, or the usual if none is given. */
  set(cloudCover?: number, wind?: number): void;
}

interface SpellsConfig {
  /** [how strong, for how many seconds], gone through over and over. */
  spells: readonly (readonly [strength: number, seconds: number])[];
  secondsToChange: number;
  secondsToChangeWhenChosen: number;
}

interface RunningSpells extends Spells {
  update(dt: number): void;
  set(strength: number): void;
}

/** Steps through the spells, easing from each strength to the next rather than switching. */
function createSpells(config: SpellsConfig): RunningSpells {
  let index = 0;
  let secondsLeft = config.spells[0][1];
  let now = config.spells[0][0];
  let chosen: number | null = null;

  return {
    get now() {
      return now;
    },

    choose(strength) {
      chosen = strength;
    },

    set(strength) {
      now = strength;
    },

    update(dt) {
      secondsLeft -= dt;
      if (secondsLeft <= 0) {
        index = (index + 1) % config.spells.length;
        secondsLeft = config.spells[index][1];
      }
      const most =
        chosen !== null ? dt / config.secondsToChangeWhenChosen : dt / config.secondsToChange;
      const wanted = chosen ?? config.spells[index][0];
      now += Math.max(-most, Math.min(most, wanted - now));
    },
  };
}

export function createWeather(): Weather {
  const cloudCover = createSpells(skyConfig.cloudCover);
  const wind = createSpells(skyConfig.wind);

  return {
    cloudCover,
    wind,

    update(dt) {
      wind.update(dt);
      cloudCover.update(dt);
    },

    set(
      cover = skyConfig.cloudCover.whenClockIsStopped,
      windStrength = skyConfig.wind.whenClockIsStopped,
    ) {
      cloudCover.set(cover);
      wind.set(windStrength);
    },
  };
}
