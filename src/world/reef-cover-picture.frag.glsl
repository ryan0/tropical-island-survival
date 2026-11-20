// What covers the reef's floor at each dot of the reef's cover picture (reef-cover-picture.ts): the island's
// formulas, worked out once for every dot, so that the ground's colouring can read them in place of working them
// out itself. Red is how much of the floor is high ground (reefHighGround), green how much is bare pavement
// (reefPavement), blue how much of a ridge the crest is in that direction (ridgeAt). Alpha is how nearly level the
// ground is: the upward part of its normal, 1 level to 0 a wall, from the island's height a metre to each side
// (the ground's own triangles are too coarse to say: a rule laid by their slopes had their straight edges).
//
// Needs the defines REEF_COVER_SPAN (the side of the square the picture covers, in metres, centred on the atoll)
// and REEF_COVER_SIZE (its dots across).

#include "../shaders/shared/turns"
#include "../shaders/shared/noise"
#include "island-shape/island"

void main() {
  vec2 xz = (gl_FragCoord.xy / REEF_COVER_SIZE - 0.5) * REEF_COVER_SPAN;
  vec2 rises = vec2(hgt(xz.x + 1.0, xz.y) - hgt(xz.x - 1.0, xz.y), hgt(xz.x, xz.y + 1.0) - hgt(xz.x, xz.y - 1.0)) * 0.5;
  float levelness = inversesqrt(1.0 + dot(rises, rises));
  gl_FragColor = vec4(reefHighGround(xz.x, xz.y), reefPavement(xz.x, xz.y), ridgeAt(atan(xz.y, xz.x)), levelness);
}
