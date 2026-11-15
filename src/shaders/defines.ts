// Numbers from a config reach a shader as defines: three.js writes `#define NAME value` at the
// top of the shader, and the shader uses the name.

/** The number in full, written as GLSL reads a float: a whole number gets its `.0`. */
export function glslFloat(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

export function glslVec2(x: number, y: number): string {
  return `vec2(${glslFloat(x)},${glslFloat(y)})`;
}

export function glslVec3(x: number, y: number, z: number): string {
  return `vec3(${glslFloat(x)},${glslFloat(y)},${glslFloat(z)})`;
}
