// The functions the build makes from src/sea/wave-timing/*.glsl (tools/glsl-for-program-plugin.ts), under the
// names they have in the shaders.
declare module 'virtual:wave-timing' {
  export function swellSpeed(depth: number): number;
}
