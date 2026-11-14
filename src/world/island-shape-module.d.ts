// The functions the build makes from src/world/island-shape/*.glsl (tools/island-shape-plugin.ts),
// under the names they have in the shaders. `th` is the direction from the atoll's centre.
declare module 'virtual:island-shape' {
  export function hgt(x: number, z: number): number;
  export function islandR(th: number): number;
  export function landW(th: number): number;
  export function passGap(th: number): number;
  export function openSea(th: number): number;
  export function shoreH(x: number, z: number): number;
  export function sandbankX(): number;
  export function sandbankZ(): number;
}
