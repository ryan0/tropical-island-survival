/** Three numbers: x, y and z, or red, green and blue. */
export type Triple = readonly [number, number, number];
/** A colour as red, green and blue. */
export type Rgb = readonly [red: number, green: number, blue: number];

/**
 * A full turn as build 78 wrote it in most places. Rounded, not 2π: where everything placed with
 * it falls, and every picture drawn with it, depends on the exact number.
 */
export const FULL_TURN = 6.283;
/**
 * A full turn as build 78 wrote it where it laid points out round the atoll. Math.PI * 2 would
 * move them by a rounding step.
 */
export const FULL_TURN_TO_EIGHT_FIGURES = 6.2831853;

export function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

/** 0 at `from`, 1 at `to`, easing in and out between. `from` may be the larger of the two. */
export function smoothstep(from: number, to: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/**
 * `share` of the way from `from` to `to`. Not GLSL's mix, `from * (1 - share) + to * share`,
 * which rounds differently.
 */
export function mix(from: number, to: number, share: number): number {
  return from + (to - from) * share;
}

/** As GLSL's mix: the pictures made for the shaders blend this way, and the rounding is part of them. */
export function mixAsShadersDo(from: number, to: number, share: number): number {
  return from * (1 - share) + to * share;
}

/** `index` brought into 0 up to `count`, going round: -1 is the last. */
export function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}
