// Puffs of bubbles under breaking water: soft round point sprites, milky white where daylight reaches them and the
// water's own colour where it does not; and the water between takes them with distance as it takes everything
// (through-water.glsl).
// Needs uPlumeColour (the bubbles' colour in the light of the moment, from bubble-plumes.ts), uUnderWaterColour (the
// water's own colour, shared), and vOpacity, vLight and vFromEye from bubble-plumes.vert.glsl.
uniform vec3 uPlumeColour;
uniform vec3 uUnderWaterColour;
varying float vOpacity;
varying float vLight;
varying vec2 vFromEye;

#include "../shaders/shared/through-water"

void main() {
  float distanceFromCentre = length(gl_PointCoord - 0.5);
  // (soft from near the middle out, so that puffs overlap into one cloud with no edges of their own)
  float alpha = (1.0 - smoothstep(0.1, 0.5, distanceFromCentre)) * vOpacity;
  // (0.004 is about one step of 8-bit colour: nothing that could be seen is dropped)
  if (alpha < 0.004) discard;

  vec3 lit = mix(uUnderWaterColour, uPlumeColour, vLight);
  gl_FragColor = vec4(seenThroughWater(lit, uUnderWaterColour, vFromEye.x, vFromEye.y), alpha);
}
