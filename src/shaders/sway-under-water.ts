import swayShader from './shared/sway-under-water.glsl';

// What lies under water sways a little, as it does seen through real water
// (shared/sway-under-water.glsl). These put that into a material of three.js's own.

/** The shared uniforms the sway reads. */
export const SWAY_UNIFORMS = [
  'uTime',
  'uSeaLevel',
  'uWind',
  'uCameraPosition',
  'uDebugMode',
  'uSwayUnderWater',
] as const;

/** Goes in front of the vertex shader. */
export const SWAY_DECLARATIONS = `uniform float uTime;
uniform float uSeaLevel;
uniform float uWind;
uniform float uDebugMode;
uniform float uSwayUnderWater;
uniform vec3 uCameraPosition;
${swayShader}`;

/**
 * Goes after three.js's `#include <project_vertex>`: moves the vertex, given the name of a vec3
 * that holds where it is in the world.
 */
export function swayOf(worldPosition: string): string {
  return ` mvPosition.xyz += (viewMatrix * vec4(swayUnderWater(${worldPosition}), 0.0)).xyz;
 gl_Position = projectionMatrix * mvPosition;`;
}
