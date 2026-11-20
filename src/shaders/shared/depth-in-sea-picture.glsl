// The picture of what is under the sea (sea/under-water-picture.ts) holds each thing's depth under the still sea
// beside its colour, as a number 0 to 1: the square root of its depth over PICTURE_HOLDS_TO metres, which keeps
// the shallows fine (a hand's breadth of depth near the surface, a forearm at ten metres). 0 is at the sea's
// level or above it; 1 is that deep or deeper, or nothing at all.
//
// Every material writes it (sea/water-as-fog.ts) and the sea's surface reads it (sea/water.frag.glsl).
// Needs nothing from outside.

const float PICTURE_HOLDS_TO = 32.0;

float depthAsHeld(float depth) {
  return sqrt(clamp(depth / PICTURE_HOLDS_TO, 0.0, 1.0));
}

float depthHeld(float held) {
  return held * held * PICTURE_HOLDS_TO;
}
