/** Three numbers: x, y and z, or red, green and blue. */
export type Triple = readonly [number, number, number];
/** A colour as red, green and blue. */
export type Rgb = readonly [red: number, green: number, blue: number];

/** A full turn, in radians. */
export const FULL_TURN = Math.PI * 2;

export function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

/** 0 at `from`, 1 at `to`, easing in and out between. `from` may be the larger of the two. */
export function smoothstep(from: number, to: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** `share` of the way from `from` to `to`, as GLSL's mix. */
export function mix(from: number, to: number, share: number): number {
  return from + (to - from) * share;
}

/** `index` brought into 0 up to `count`, going round: -1 is the last. */
export function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}
