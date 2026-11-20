// How the sea veils what is under it, to an eye above the sea. A thing under water is seen by the light that comes
// up from it through the water over it: the water takes that light by degrees and puts its own colour in its
// place. How much goes by how many metres of water the light passes through, which is the thing's own depth,
// times a little: light leaving the sea bends at the surface, so however far off the eye is and however low, the
// light it sees by has come up through the water at no more than 49 degrees from straight up, through at most one
// and a half times the depth. (To an eye under the water with the thing it is the plain distance between them:
// through-water.glsl.)
//
// Two things draw the veil between them, and both use these rules, so that it is one veil. Each thing under the
// sea draws most of it on itself, by its own depth (the fog that every material has: sea/water-as-fog.ts). The
// sea's surface draws the rest, by the depth of the floor under each spot of it, with all that the surface alone
// knows: the swell's shading, the clouds' shadows, the foam's cloudiness (sea/water.frag.glsl). When the surface
// drew all of it, it could go only by the depth under each spot of the surface: a coral head was hidden by the
// depth of the sand beside it, and the rim of a pool was the edge of a lid with clear water under it.
//
// Needs nothing from outside.

// The colour of the water itself: pale aqua over the sand, turquoise where it deepens, blue where it is deep.
const vec3 OVER_SAND_AQUA = vec3(0.24, 0.71, 0.67);
const vec3 TURQUOISE = vec3(0.11, 0.49, 0.58);
const vec3 OCEAN_BLUE = vec3(0.0, 0.14, 0.30);
// What the water's colour is multiplied by when the sun is at the horizon (full daylight leaves it as it is),
// and the share of it that goes with the night.
const vec3 LOW_SUN_WATER_TINT = vec3(0.46, 0.45, 0.48);
const float NIGHT_TAKES_FROM_WATER = 0.82;
// How many metres of water hide two thirds of what is behind them (half as many hide a fifth, twice as many
// nearly all). It goes by degrees, with no depth at which the water turns solid.
const float HIDES_BY_METRES = 4.6;
// The share of the veil that the sea's surface draws, by the depth of the floor under it: the rest each thing
// draws on itself. (Lower, and the swell's shading and the clouds' shadows show less on water of a middling
// depth; higher, and the surface is a lid again.)
const float SURFACE_DRAWS = 0.35;
// Light bends as it leaves water: the sine of its angle to straight up is this many times smaller in the water
// than in the air (1 / 1.33).
const float BENT_AT_THE_SURFACE = 0.75;

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

// The share of what is behind so many metres of water that the water hides. share: how much of the whole veil is
// being drawn (SURFACE_DRAWS by the surface, the rest by the thing: together they hide what one veil would).
float hiddenByWater(float metres, float share) {
  float veils = metres / HIDES_BY_METRES;
  return 1.0 - exp(-share * veils * veils);
}

// How many metres of water the light from a thing passes through on its way to an eye above the sea. depth: how
// far under the sea the thing is. rise: the height of the direction from the eye to the thing, -1 straight down
// to 0 level.
float metresOfWaterOver(float depth, float rise) {
  float levelInAir = 1.0 - rise * rise;
  return depth / sqrt(1.0 - BENT_AT_THE_SURFACE * BENT_AT_THE_SURFACE * levelInAir);
}
