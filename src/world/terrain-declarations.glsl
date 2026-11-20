// What the colouring of the ground (terrain-colour.glsl) needs from outside main(): its uniforms and varying, the
// chunks it calls, the noise its patterns are made of, and three patterns of small things lying on the ground.
// terrain.ts puts this in front of three.js's Lambert fragment shader. The chunks need the defines
// TERRAIN_FOOTPATHS (footpaths.glsl) and LAGOON_WIND_DIRECTION (lagwave.glsl), and groundNoise needs
// GROUND_NOISE_PERIOD (world-config.ts), all of which terrain.ts writes.
//
// Four things the colouring once worked out by arithmetic for every dot it reads from pictures, which Ryan's
// phone finds far cheaper: its noise (groundNoise, below), the shore's shape (uShoreRound), the reef's cover
// (uReefCover) and the turf's broad patterns (uTurfPatterns). With the define TERRAIN_BY_ARITHMETIC, a debug
// switch, it works all four out as it did, to compare the frame rate. The pictures' own defines
// (REEF_COVER_SPAN, SHORE_ROUND_FROM, TURF_PICTURE_SPAN, TURF_WANDER_KEPT) come from terrain.ts.

uniform float uDebugMode;      // a debug switch: 5 drains the sea, to see its floor
uniform float uTime;       // seconds on the clock the waves run by
uniform float uSeaLevel;      // the height of the still sea surface
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
uniform sampler2D uShoreRound;      // the shore in each direction from the centre (sea/shore-round-picture.ts)
uniform sampler2D uReefCover;       // what covers the reef's floor (reef-cover-picture.ts)
uniform sampler2D uTurfPatterns;    // the turf's broad patterns (turf-picture.ts)

varying vec3 vGroundPosition;   // this point's position in the world

#include "../shaders/shared/turns"
#include "../shaders/shared/noise"

#include "footpaths"

#include "island-shape/island"

#include "ground-patterns/turf"

#include "../shaders/shared/lagwave"

#include "../shaders/shared/light-net"

// The noise the ground's own patterns are made of, 0 to 1 with one rise and fall to a cell of p, as noise() gives:
// read from a picture of such noise (ground-noise.ts), where every call was worked out by arithmetic. On Ryan's
// phone that arithmetic, some fifty calls for a dot of turf, was the dearest thing the ground did, and a reading
// costs next to nothing. The picture repeats every GROUND_NOISE_PERIOD cells, and has no mipmaps, so that it may be
// read inside a branch. (TERRAIN_BY_ARITHMETIC: a debug switch goes back to noise() itself, whose patches lie
// elsewhere, to compare the frame rate.)
float groundNoise(vec2 p) {
  #ifdef TERRAIN_BY_ARITHMETIC
  return noise(p);
  #else
  return texture2D(uGroundNoise, p * (1.0 / GROUND_NOISE_PERIOD)).r;
  #endif
}

// Three octaves of it, as fbm() is of noise(): each at twice the frequency and half the strength of the last,
// turned so that the octaves' grids never line up.
float groundFbm(vec2 p) {
  mat2 nextOctave = mat2(1.6, 1.2, -1.2, 1.6);
  vec2 second = nextOctave * p + vec2(3.1, 1.7);
  vec2 third = nextOctave * second + vec2(3.1, 1.7);
  return (0.5 * groundNoise(p) + 0.25 * groundNoise(second) + 0.125 * groundNoise(third)) / 0.875;
}

// Bits of leaf litter and twig lying on sand: at most one short dark fleck in each square of p, at its own angle.
// Returns how much of this spot the fleck covers, 0 to 1.
float fleck(vec2 p) {
  vec2 square = floor(p);
  vec2 middle = vec2(hash(square + 13.0), hash(square + 29.0)) * 0.6 + 0.2;
  vec2 d = fract(p) - middle;
  float angle = hash(square + 41.0) * FULL_TURN;
  float narrowness = 2.5 + 3.0 * hash(square + 53.0);
  vec2 e = vec2(d.x * cos(angle) + d.y * sin(angle), (-d.x * sin(angle) + d.y * cos(angle)) * narrowness);
  float isThere = step(0.45, hash(square + 61.0));
  return smoothstep(0.22, 0.12, length(e)) * isThere;
}

// One layer of coral rubble: at most one stone in each square of p - anywhere in it, any size from a chip to a
// fist, oval or angular, at any angle - and many squares empty (density = the share that hold one).
// Returns (how much of this spot the stone covers, how brightly it is lit by sunAlongGround, its own tone 0 to 1).
vec3 pebble(vec2 p, vec2 sunAlongGround, float density) {
  vec2 square = floor(p);
  vec2 middle = vec2(hash(square + 3.0), hash(square + 8.0)) * 0.5 + 0.25;
  vec2 d = fract(p) - middle;
  float radius = 0.07 + 0.18 * hash(square + 15.0) * hash(square + 27.0);
  float angle = hash(square + 33.0) * HALF_TURN;
  float c = cos(angle);
  float s = sin(angle);
  float oval = 1.0 + 0.9 * hash(square + 39.0);
  vec2 e = vec2(d.x * c + d.y * s, (-d.x * s + d.y * c) * oval);
  // between a round pebble and a broken chunk
  float angularity = 0.75 * hash(square + 45.0);
  float r = mix(length(e), (abs(e.x) + abs(e.y)) * 0.8, angularity) / radius;
  float isThere = step(1.0 - density, hash(square + 21.0));
  float cover = smoothstep(1.0, 0.78, r) * isThere;
  float lit = 0.82 + 0.42 * dot(d, sunAlongGround) / radius + 0.12 * (1.0 - r);
  float tone = hash(square + 51.0);
  return vec3(cover, lit, tone);
}

// One layer of dimples in loose sand (footprints, hollows the wind has rounded off): at most one round hollow in each
// square of p, anywhere in it. Returns how much lighter (+) or darker (-) the spot is when lit from sunAlongGround:
// inside a hollow the wall nearer the sun is in shade and the far wall catches the light.
float dimples(vec2 p, vec2 sunAlongGround) {
  vec2 square = floor(p);
  vec2 middle = vec2(hash(square + 3.0), hash(square + 11.0)) * 0.44 + 0.28;
  float radius = 0.20 + 0.20 * hash(square + 7.0);
  vec2 d = (fract(p) - middle) / radius;
  // each hollow is an oval at its own angle (a footprint, not a hailstone dent) and its own depth
  float angle = hash(square + 23.0) * HALF_TURN;
  float c = cos(angle);
  float s = sin(angle);
  float oval = 1.0 + 0.9 * hash(square + 37.0);
  vec2 e = vec2(d.x * c + d.y * s, (-d.x * s + d.y * c) * oval);
  float bowl = max(1.0 - dot(e, e), 0.0);   // 1 at the bottom of the hollow, 0 at its rim and beyond
  float isThere = step(0.3, hash(square + 19.0));
  float depth = 0.35 + 0.65 * hash(square + 43.0);
  return -dot(d, sunAlongGround) * bowl * sqrt(bowl) * isThere * depth;
}
