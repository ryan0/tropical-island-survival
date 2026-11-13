export function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

/** 0 at `from`, 1 at `to`, easing in and out between. `from` may be the larger of the two. */
export function smoothstep(from: number, to: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}
