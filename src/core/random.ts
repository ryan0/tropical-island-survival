/** A stream of numbers from 0 up to 1. A stream of the same name gives the same numbers each run. */
export type Random = () => number;

export type Range = readonly [low: number, high: number];

export function within(random: Random, [low, high]: Range): number {
  return low + (high - low) * random();
}
