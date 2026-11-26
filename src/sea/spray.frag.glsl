// Spray droplets and puffs of mist: soft round point sprites.
// Needs uDaylight and uNight (the light of the hour, which every shader shares) and vOpacity (the sprite's opacity,
// from spray.vert.glsl).
uniform float uDaylight;
uniform float uNight;
varying float vOpacity;

#include "foam-in-this-light"

void main() {
  float distanceFromCentre = length(gl_PointCoord - 0.5);
  float alpha = (1.0 - smoothstep(0.08, 0.5, distanceFromCentre)) * vOpacity;
  // (0.004 is about one step of 8-bit colour: nothing that could be seen is dropped)
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(foamInThisLight(uDaylight, uNight), alpha);
}
