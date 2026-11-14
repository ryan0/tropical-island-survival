// The clouds' shadows on the sea and the island: a map, seen from above, of how much sunlight gets down through
// the clouds (red: 1 = full sun). Distances in km.
//
// Needs
//   uLightDirection   the unit vector towards the sun
//   uPictureSize      the size of the map, in dots
//   uShadowStrength   how much of the shadow to show (0: none)
//   SHADE_SPAN        a define: how many km a side the map covers, the island in the middle
//   SHADOW_DENSITY    a define: how much a km of cloud dims the light
// and the cloud field (cloud-field.glsl) with its own uniforms and defines, among them CLOUD_BASE.

uniform vec3 uLightDirection;
uniform vec2 uPictureSize;
uniform float uShadowStrength;

#include "../shaders/shared/noise"
#include "cloud-field"

// The walk towards the sun climbs from the cloud bases to this height, in this many steps.
const float WALK_TOP = 4.2;
const int WALK_STEPS = 14;

void main() {
  vec2 ground = (gl_FragCoord.xy / uPictureSize - 0.5) * SHADE_SPAN;

  // From the spot on the ground towards the sun, from the height of the cloud bases to WALK_TOP.
  float sunRise = max(uLightDirection.y, 0.06);
  float stepLength = (WALK_TOP - CLOUD_BASE) / sunRise / float(WALK_STEPS);
  vec3 walkStart = vec3(ground.x, 0.0, ground.y) + uLightDirection * (CLOUD_BASE / sunRise);
  float cloudPassed = 0.0;
  for (int i = 0; i < WALK_STEPS; i++) {
    vec3 p = walkStart + uLightDirection * (stepLength * (float(i) + 0.5));
    cloudPassed += cloudAt(p, weatherAt(p), false).x * stepLength;
  }

  float sunThrough = exp(-cloudPassed * SHADOW_DENSITY);
  gl_FragColor = vec4(mix(1.0, sunThrough, uShadowStrength), 0.0, 0.0, 1.0);
}
