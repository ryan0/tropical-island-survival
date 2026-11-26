// What the sea does to the look of a thing under it, for an eye above the sea: all of it, and the sea's surface
// draws all of it (sea/water.frag.glsl), over a picture of what is under the sea (sea/under-water-picture.ts).
// The thing is in that picture as the light that reaches it leaves it (light-under-sea.glsl), with its depth
// beside its colour; the surface bends the picture, and by each thing's own depth greys it, puts the water's
// glow in front of it, and hides it in the water's colour by degrees.
//
// (There were once five rules for this in as many files: a tint painted on the ground and another on the rocks
// and coral, a veil in every material's fog, the surface's own, and the surface's guess at what lay behind it.
// A thing was hidden by the depth of the sand beside it, the rim of a pool was the edge of a lid, and when one
// rule was changed the others were not. docs/DECISIONS.md, 16.)
//
// Needs light-under-sea.glsl's numbers, which it includes.

#include "light-under-sea"

// The colour of the water itself: pale aqua over the sand, turquoise where it deepens, blue where it is deep.
const vec3 OVER_SAND_AQUA = vec3(0.24, 0.71, 0.67);
const vec3 TURQUOISE = vec3(0.11, 0.49, 0.58);
const vec3 OCEAN_BLUE = vec3(0.0, 0.14, 0.30);
// What the water's colour is multiplied by when the sun is at the horizon (full daylight leaves it as it is),
// and the share of it that goes with the night.
const vec3 LOW_SUN_WATER_TINT = vec3(0.54, 0.53, 0.56);
const float NIGHT_TAKES_FROM_WATER = 0.82;
// How many metres of clear water hide two thirds of what is behind them (half as many hide a fifth, twice as
// many nearly all). It goes by degrees, with no depth at which the water turns solid.
const float HIDES_BY_METRES = 8.0;
// A thing under more than a little water is greyer than it is, however clear the water: the grey comes in over
// this depth (m, from where the sea's tint begins), and is this colour for a white thing.
const float GREYED_BY_DEPTH = 0.5;
const vec3 GREY_UNDER_WATER = vec3(1.04, 1.04, 1.02);
// And the water's own glow lies in front of it: its colour, how fast it comes in with depth (a metre), and how
// bright it is beside the water's own colour in the same light.
const vec3 GLOW_OF_THE_WATER = vec3(0.0, 0.075, 0.13);
const float GLOW_COMES_IN = 0.9;
const float GLOW_IN_FULL_LIGHT = 1.12;

// The water's own colour over a thing so many metres under it. (By the depth, not by how far the light runs
// through the water at a slant: a lagoon is one colour from the beach and from above it.)
vec3 waterBodyColour(float metres) {
  vec3 shallows = mix(OVER_SAND_AQUA, TURQUOISE, smoothstep(0.6, 3.2, metres));
  return mix(shallows, OCEAN_BLUE, smoothstep(3.0, 16.0, metres));
}

// What that colour is multiplied by in this light. daylight: 0 with the sun at the horizon to 1 by day. night: 0
// by day to 1 at night.
vec3 waterInThisLight(float daylight, float night) {
  return mix(LOW_SUN_WATER_TINT, vec3(1.0), daylight) * (1.0 - NIGHT_TAKES_FROM_WATER * night);
}

// The share of what is behind so many metres of water that the water hides. cloudiness: 1 for clear water, more
// where it is churned up.
float hiddenByWater(float metres, float cloudiness) {
  float veils = metres / HIDES_BY_METRES;
  return 1.0 - exp(-cloudiness * veils * veils);
}

// A thing's colour as it shows through the water over it, before the water hides it. colour: the thing as the
// picture of what is under the sea holds it. depth: how far under the still sea it lies. greys: the share of it
// that goes to grey in water deep enough. light: how bright the water's own light is (waterInThisLight and the
// clouds' shadow, with the daylight).
vec3 seenDownThroughWater(vec3 colour, float depth, float greys, vec3 light) {
  float tintDepth = max(depth - SEA_TINT_STARTS, 0.0);
  // (The grey keeps the cast of the light that reached the thing: it is the thing's brightness before the water
  // took the red from that light, with the red taken again.)
  vec3 lightLeft = exp(-tintDepth * SEA_TAKES_A_METRE);
  vec3 greyed = dot(colour / max(lightLeft, 0.02), vec3(0.3, 0.5, 0.2)) * GREY_UNDER_WATER * lightLeft;
  vec3 seen = mix(colour, greyed, greys * smoothstep(0.0, GREYED_BY_DEPTH, tintDepth));
  return seen + GLOW_OF_THE_WATER * (1.0 - exp(-tintDepth * GLOW_COMES_IN)) * GLOW_IN_FULL_LIGHT * light;
}
