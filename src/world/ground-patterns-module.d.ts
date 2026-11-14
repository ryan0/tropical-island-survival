// The functions the build makes from src/world/ground-patterns/*.glsl (tools/glsl-for-program-plugin.ts),
// under the names they have in the shaders. Each takes a point on the ground.
declare module 'virtual:ground-patterns' {
  export function turfLushness(x: number, z: number): number;
  export function turfDryness(x: number, z: number): number;
  export function soilPatches(x: number, z: number): number;
  export function layerEdgeWander(x: number, z: number): number;
}
