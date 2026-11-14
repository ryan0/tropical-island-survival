/** A stream of numbers from 0 up to 1. A stream of the same name gives the same numbers each run. */
export type Random = () => number;

export type Range = readonly [low: number, high: number];

export function within(random: Random, [low, high]: Range): number {
  return low + (high - low) * random();
}

/**
 * Seeded streams, so that the island is the same on every load and a screenshot or a bug report
 * always refers to the same rock. Each part that scatters things draws from its own stream, by
 * name, so that changing how one kind of thing is placed does not move all the others.
 */
export function createRandomStreams(seed: number): (name: string) => Random {
  return (name) => {
    let state = seed >>> 0;
    for (let i = 0; i < name.length; i++) {
      state = Math.imul(state ^ name.charCodeAt(i), 0x9e3779b1) >>> 0;
    }
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  };
}
