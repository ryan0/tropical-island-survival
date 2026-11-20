// What the colouring of the ground (terrain-colour.glsl) needs from outside main(): its uniforms and varying, the
// chunks it calls, the noise its patterns are made of, how much a ground tile's things cover and how they are
// lit, and the dimples of loose sand.
// terrain.ts puts this in front of three.js's Lambert fragment shader. The chunks need the defines
// TERRAIN_FOOTPATHS (footpaths.glsl) and LAGOON_WIND_DIRECTION (lagwave.glsl), and groundNoise needs
// GROUND_NOISE_PERIOD (world-config.ts), all of which terrain.ts writes.
//
// Five things the colouring once worked out by arithmetic for every dot it reads from pictures, which Ryan's
// phone finds far cheaper: its noise (groundNoise, below), the random numbers its single things are placed by
// (randomsOf, below), the shore's shape (uShoreRound), the reef's cover (uReefCover) and the turf's broad patterns
// (uTurfPatterns). The pictures' own defines (GROUND_NOISE_PERIOD, GROUND_RANDOMS_SIZE, REEF_COVER_SPAN,
// SHORE_ROUND_FROM, TURF_PICTURE_SPAN, TURF_WANDER_KEPT) come from terrain.ts.

uniform float uDebugMode;      // a debug switch: 5 drains the sea, to see its floor
uniform float uTime;       // seconds on the clock the waves run by
uniform float uSeaLevel;      // the height of the still sea surface
uniform float uUnderWater;    // 1 while the eye is under water
uniform float uDaylight;        // daylight, 0 at night to 1 by day
uniform float uGritAverage;   // the grit picture's average brightness (ground-grit.ts)
uniform float uWind;       // the wind's strength, 0 (none) to 1 (high)
uniform vec3 uCameraPosition;         // the camera's position
uniform vec3 uSunDirection;      // the unit vector towards the sun
uniform vec3 uSkyHorizon;         // the sky's colour at the horizon
uniform sampler2D uDetail;          // the detail texture (detail-texture.ts)
uniform sampler2D uCaustics;        // the caustics texture (caustics-texture.ts)
uniform sampler2D uCloudShadeMap;   // the map of the clouds' shadows
uniform sampler2D uReefMap;         // the map of the coral heads (reef-map.ts)
uniform sampler2D uGroundNoise;     // the noise the ground's patterns are made of (ground-noise.ts)
uniform sampler2D uGroundRandoms;   // plain random numbers, four to a dot (ground-noise.ts)
uniform sampler2D uShoreRound;      // the shore in each direction from the centre (sea/shore-round-picture.ts)
uniform sampler2D uReefCover;       // what covers the reef's floor (reef-cover-picture.ts)
uniform sampler2D uTurfPatterns;    // the turf's broad patterns (turf-picture.ts)
uniform sampler2D uTreeCover;       // what stands over the ground (tree-cover-map.ts)
uniform sampler2D uGravelTile;      // coral gravel and rubble, seen from above (ground-tiles.ts)
uniform sampler2D uLitterTile;      // the trees' litter, likewise
uniform sampler2D uLowPlantsTile;   // creepers and seedlings, likewise

varying vec3 vGroundPosition;   // this point's position in the world

#include "../shaders/shared/turns"
#include "../shaders/shared/noise"

#include "footpaths"

#include "island-shape/shore"

#include "../shaders/shared/lagwave"

#include "../shaders/shared/light-net"

// The noise the ground's own patterns are made of, 0 to 1 with one rise and fall to a cell of p, as noise() gives:
// read from a picture of such noise (ground-noise.ts), where every call was worked out by arithmetic. On Ryan's
// phone that arithmetic, some fifty calls for a dot of turf, was the dearest thing the ground did, and a reading
// costs next to nothing. The picture repeats every GROUND_NOISE_PERIOD cells, and has no mipmaps, so that it may be
// read inside a branch.
float groundNoise(vec2 p) {
  return texture2D(uGroundNoise, p * (1.0 / GROUND_NOISE_PERIOD)).r;
}

// Three octaves of it, as fbm() is of noise(): each at twice the frequency and half the strength of the last,
// turned so that the octaves' grids never line up.
float groundFbm(vec2 p) {
  mat2 nextOctave = mat2(1.6, 1.2, -1.2, 1.6);
  vec2 second = nextOctave * p + vec2(3.1, 1.7);
  vec2 third = nextOctave * second + vec2(3.1, 1.7);
  return (0.5 * groundNoise(p) + 0.25 * groundNoise(second) + 0.125 * groundNoise(third)) / 0.875;
}

// Four numbers at random, 0 to 1 each, for a square of a grid: always the same four for the same square and the
// same `set` (a whole number: another set is another four). The ground's single things, of which there is at most
// one to a square, take their place, size, turn and shade from these. They are read from a picture of random
// numbers (ground-noise.ts), dot for dot, where each was worked out with a sine; the picture repeats every
// GROUND_RANDOMS_SIZE squares.
vec4 randomsOf(vec2 square, float set) {
  return texture2D(uGroundRandoms, (square + set * vec2(37.0, 59.0) + 0.5) * (1.0 / GROUND_RANDOMS_SIZE));
}

// How much of a spot the things in a ground tile cover (ground-tiles.ts). tile: the tile as read there, whose alpha
// is each thing's rank, so that the higher the threshold the fewer show. amount: how thickly they lie, 0 (none) to
// 1 (as thick as the tile was painted). fullCover: the share of the tile its things cover when all show. farOff: 0
// near the eye, where single things show, to 1 where the picture has blurred to its average and only how much
// there is of it can be told.
float coverOf(vec4 tile, float amount, float fullCover, float farOff) {
  float threshold = 1.0 - amount;
  float things = smoothstep(threshold, threshold + 0.07, tile.a);
  return mix(things, amount * fullCover, farOff) * step(0.004, amount);
}

// How a thing lying on the ground is lit against the sun. relief: how much more of this spot its picture covers
// than of the spot a shadow's length towards the sun, -1 to 1: above nothing on a thing's sunward edge, which
// catches the light, and below it on the ground behind a thing, in its shadow. strength: 0 to 1. Returns what to
// multiply the colour by.
float litAgainstSun(float relief, float strength) {
  return 1.0 + strength * (0.12 * max(relief, 0.0) + 0.32 * min(relief, 0.0));
}

// One layer of dimples in loose sand (footprints, hollows the wind has rounded off): at most one round hollow in each
// square of p, anywhere in it. Returns how much lighter (+) or darker (-) the spot is when lit from sunAlongGround:
// inside a hollow the wall nearer the sun is in shade and the far wall catches the light.
float dimples(vec2 p, vec2 sunAlongGround) {
  vec2 square = floor(p);
  // (its middle, across and down; its size; its angle; then how oval, whether it is there, how deep)
  vec4 placed = randomsOf(square, 6.0);
  vec4 shaped = randomsOf(square, 7.0);
  float radius = 0.20 + 0.20 * placed.z;
  vec2 d = (fract(p) - (placed.xy * 0.44 + 0.28)) / radius;
  // each hollow is an oval at its own angle (a footprint, not a hailstone dent) and its own depth
  float angle = placed.w * HALF_TURN;
  float c = cos(angle);
  float s = sin(angle);
  float oval = 1.0 + 0.9 * shaped.x;
  vec2 e = vec2(d.x * c + d.y * s, (-d.x * s + d.y * c) * oval);
  float bowl = max(1.0 - dot(e, e), 0.0);   // 1 at the bottom of the hollow, 0 at its rim and beyond
  float isThere = step(0.3, shaped.y);
  float depth = 0.35 + 0.65 * shaped.z;
  return -dot(d, sunAlongGround) * bowl * sqrt(bowl) * isThere * depth;
}
