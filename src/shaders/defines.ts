// Numbers from a config reach a shader as defines: three.js writes `#define NAME value` at the
// top of the shader, and the shader uses the name.

/**
 * Four decimal places, as build 78 wrote its numbers into its shaders. The rounding is part of
 * the picture: a define written more exactly would move what the shader draws.
 */
export function glslFloat(value: number): string {
  return value.toFixed(4);
}

export function glslVec2(x: number, y: number): string {
  return `vec2(${glslFloat(x)},${glslFloat(y)})`;
}
