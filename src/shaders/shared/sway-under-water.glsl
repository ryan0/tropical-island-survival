// What lies under water is seen through its surface, and each broad ripple that passes bends the eye's line a
// little: things on the floor sway, further the deeper they lie, where a pane of glass would show them still. The
// scene is not drawn through the water, so the sway is given to the things themselves: every vertex under the sea
// is moved sideways by three long ripples crossing, the same for the ground and for whatever stands on it, so that
// nothing slides over anything else. Only where the things under the sea stand for the surface's bending
// themselves (seen-through-surface.glsl): not where the surface bends a picture of them.
//
// Needs the uniforms uTime, uSeaLevel, uWind, uCameraPosition, uDebugMode and uPictureDrawn.

#include "seen-through-surface"

// Metres of sway for each metre of depth in the usual breeze; the share of that left in a calm; and the depth past
// which it grows no more.
const float SWAY_A_METRE_DOWN = 0.03;
const float SWAY_IN_A_CALM = 0.4;
const float SWAY_DEEPEST = 3.0;
// The three ripples: the way each runs, and (x) its radians a metre, (y) its radians a second, (z) its share.
const vec2 SWAY_RUNS_A = vec2(0.83, 0.56);
const vec2 SWAY_RUNS_B = vec2(-0.45, 0.89);
const vec2 SWAY_RUNS_C = vec2(0.31, -0.95);
const vec3 SWAY_RIPPLE_A = vec3(1.9, 1.7, 1.0);
const vec3 SWAY_RIPPLE_B = vec3(3.1, 2.3, 0.6);
const vec3 SWAY_RIPPLE_C = vec3(1.1, 1.1, 0.8);

// How far a point in the world is seen to one side of where it lies.
vec3 swayUnderWater(vec3 worldPosition) {
  float depth = min(max(uSeaLevel - worldPosition.y, 0.0), SWAY_DEEPEST);
  vec2 sway = SWAY_RUNS_A * SWAY_RIPPLE_A.z * sin(dot(worldPosition.xz, SWAY_RUNS_A) * SWAY_RIPPLE_A.x + uTime * SWAY_RIPPLE_A.y)
    + SWAY_RUNS_B * SWAY_RIPPLE_B.z * sin(dot(worldPosition.xz, SWAY_RUNS_B) * SWAY_RIPPLE_B.x - uTime * SWAY_RIPPLE_B.y)
    + SWAY_RUNS_C * SWAY_RIPPLE_C.z * sin(dot(worldPosition.xz, SWAY_RUNS_C) * SWAY_RIPPLE_C.x + uTime * SWAY_RIPPLE_C.y);
  float inWind = mix(SWAY_IN_A_CALM, 1.0, smoothstep(0.0, 0.66, uWind));
  sway *= SWAY_A_METRE_DOWN * depth * inWind * thingsBendThemselves();
  return vec3(sway.x, 0.0, sway.y);
}
