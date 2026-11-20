// What the sea does to anything under it, as terrain-colour.glsl does to the sand: to its colour (paler and greyer,
// red lost with depth, the water's own blue-green glow) and to the sun's light on it (the net of light the ripples
// throw, mostly on faces that look up). Used by the rocks and the coral.
// Needs the uniforms uSeaLevel, uDaylight, uTime, uWind, uDebugMode, uUnderWater, uDetail (the detail texture) and
// uCaustics (the caustics texture), declared by the file that includes it.

#include "light-net"

// The tint begins this far below the still sea surface.
const float SEA_TINT_START_DEPTH = 0.2;
// How much of each colour the water takes away for each metre of depth: red goes first.
const vec3 SEA_ABSORPTION = vec3(0.36, 0.085, 0.045);
// The water's own glow, in front of anything deep enough.
const vec3 SEA_GLOW = vec3(0.0, 0.075, 0.13);

// How far under the sea's tint a point is: it begins a little below the still surface.
float depthUnderSeaTint(vec3 worldPosition) {
  // (with the sea drained, uDebugMode 5, nothing is under water)
  return max(uSeaLevel - worldPosition.y - SEA_TINT_START_DEPTH, 0.0) * step(uDebugMode, 4.5);
}

// colour: the colour out of the water. worldPosition: where it is. tintStrength: how much of the water's greying
// and loss of red to apply (1 for rock; less for living coral, whose colour is the point of it).
vec3 seaTint(vec3 colour, vec3 worldPosition, float tintStrength) {
  float depthUnderWater = depthUnderSeaTint(worldPosition);
  float isUnderWater = step(0.0001, depthUnderWater);

  // Paler and greyer, and (below) the water's own glow in front of it: that is the water over it as an eye above
  // the sea looks down through it. To an eye under the water with it there is no such veil. The light that falls
  // on it has still lost its red on the way down; what the water between the two does is another rule's, by the
  // distance (through-water.glsl), so that a coral an arm's length away keeps its colour.
  float seenFromAbove = 1.0 - uUnderWater;
  vec3 paleGrey = vec3(dot(colour, vec3(0.3, 0.5, 0.2))) * vec3(1.04, 1.04, 1.02);
  float greying = 0.4 * tintStrength * smoothstep(0.0, 0.5, depthUnderWater) * seenFromAbove;
  vec3 tinted = mix(colour, paleGrey, greying);

  // Darker, and red lost with depth
  float darkening = mix(1.0, 0.87, smoothstep(0.0, 0.7, depthUnderWater));
  vec3 colourLeft = exp(-depthUnderWater * tintStrength * SEA_ABSORPTION
    * mix(1.0, TAKEN_TO_AN_EYE_UNDER_WATER, uUnderWater));
  tinted *= darkening * colourLeft;

  // The water's own glow, which needs daylight
  tinted += SEA_GLOW * (1.0 - exp(-depthUnderWater * 0.9)) * uDaylight * (0.4 + 0.6 * tintStrength) * seenFromAbove;

  // Out of the water, the colour is left exactly as it was
  return mix(colour, tinted, isUnderWater);
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
