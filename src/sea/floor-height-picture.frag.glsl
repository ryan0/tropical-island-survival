// The ground's height at each dot of the floor's height picture (floor-height-picture.ts): the island's formula,
// worked out once for every dot, so that the water's shader can read it in place of working it out itself.
//
// Needs the defines FLOOR_HEIGHT_SPAN (the side of the square the picture covers, in metres, centred on the atoll)
// and FLOOR_HEIGHT_SIZE (its dots across).

#include "../shaders/shared/turns"
#include "../shaders/shared/noise"
#include "../world/island-shape/island"

void main() {
  vec2 xz = (gl_FragCoord.xy / FLOOR_HEIGHT_SIZE - 0.5) * FLOOR_HEIGHT_SPAN;
  gl_FragColor = vec4(hgt(xz.x, xz.y), 0.0, 0.0, 1.0);
}
