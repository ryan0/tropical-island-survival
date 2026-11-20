// What the sea does to the light on anything under it, as terrain-colour.glsl does to the sand's: dimmer, its red
// lost with depth (light-under-sea.glsl), and the net of light the ripples throw, mostly on faces that look up.
// Used by the rocks and the coral.
// Needs the uniforms uSeaLevel, uDaylight, uTime, uWind, uDebugMode, uUnderWater, uDetail (the detail texture) and
// uCaustics (the caustics texture), declared by the file that includes it.

#include "light-net"
#include "light-under-sea"

// How far under the sea's tint a point is: it begins a little below the still surface.
float depthUnderSeaTint(vec3 worldPosition) {
  // (with the sea drained, uDebugMode 5, nothing is under water)
  return max(uSeaLevel - worldPosition.y - SEA_TINT_STARTS, 0.0) * step(uDebugMode, 4.5);
}

// colour: the colour out of the water. worldPosition: where it is. tintStrength: how much of the water's loss of
// red to apply (1 for rock; less for living coral, whose colour is the point of it).
// (Only the light that reaches the thing: what the water between it and an eye does to the look of it is not
// the thing's to draw. light-under-sea.glsl.)
vec3 seaTint(vec3 colour, vec3 worldPosition, float tintStrength) {
  return colour * lightLeftUnderSea(depthUnderSeaTint(worldPosition), tintStrength, uUnderWater);
}

// How far a shadow on a point under the sea is filled in (light-net.glsl, sunlight-under-water.ts).
float shadowFilledUnderSea(vec3 worldPosition) {
  return shadowFilledAt(depthUnderSeaTint(worldPosition));
}

// The net of light on a point under the sea (light-net.glsl), as the sand has it: how much brighter the sun's
// light is there, less 1 (sunlight-under-water.ts). facingUp: 0..1, how much the face looks up.
float netOfLightUnderSea(vec3 worldPosition, float facingUp) {
  float depthUnderWater = depthUnderSeaTint(worldPosition);
  vec2 netUv = lightNetUvAt(worldPosition.xz, uTime);
  vec4 smallWaves = texture2D(uDetail, smallWavesUvAt(netUv, uTime));
  vec2 wobble = netWobbleOf(smallWaves);
  vec4 firstNet = texture2D(uCaustics, netUv + wobble);
  vec4 secondNet = texture2D(uCaustics, turnedNetUvAt(netUv, wobble));
  float lightNet = lightOfNet(smallWaves, firstNet, secondNet, depthUnderWater, 1.0);

  float netComesIn = smoothstep(0.1, 0.8, depthUnderWater);
  // (+ 0.2: it fades with the depth below the still surface, not below where the tint begins)
  float netFadesWithDepth = exp(-(depthUnderWater + 0.2) * 0.28);
  float netOnFace = 0.35 + 0.65 * facingUp;
  return lightNet * netComesIn * netFadesWithDepth * uDaylight * netOnFace * netInWind(uWind);
}
