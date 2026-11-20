// The turf's broad patterns at each dot of the turf picture (turf-picture.ts): ground-patterns/turf.glsl's four
// formulas, worked out once for every dot, so that the ground's colouring can read them in place of working them
// out itself. Red is how lush the turf is, green how dried out, blue the patches of bare soil (-1 to 1, kept as
// 0 to 1), alpha how far the layers' edges wander (metres either way up to TURF_WANDER_KEPT, kept as 0 to 1).
//
// Needs the defines TURF_PICTURE_SPAN (the side of the square the picture covers, in metres, centred on the
// atoll), TURF_PICTURE_SIZE (its dots across) and TURF_WANDER_KEPT.

#include "ground-patterns/turf"

void main() {
  vec2 xz = (gl_FragCoord.xy / TURF_PICTURE_SIZE - 0.5) * TURF_PICTURE_SPAN;
  gl_FragColor = vec4(
    turfLushness(xz.x, xz.y),
    turfDryness(xz.x, xz.y),
    0.5 + 0.5 * soilPatches(xz.x, xz.y),
    0.5 + 0.5 * layerEdgeWander(xz.x, xz.y) / TURF_WANDER_KEPT);
}
