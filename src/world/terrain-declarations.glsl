// What the colouring of the ground (terrain-colour.glsl) needs from outside main(): its uniforms and varying, the
// chunks it calls, and three patterns of small things lying on the ground. terrain.ts puts this in front of
// three.js's Lambert fragment shader. The chunks need the defines TERRAIN_FOOTPATHS (footpaths.glsl) and
// LAGOON_WIND_DIRECTION (lagwave.glsl), which terrain.ts writes.

uniform float uTime;       // seconds on the clock the waves run by
uniform float uSeaLevel;      // the height of the still sea surface
uniform float uDaylight;        // daylight, 0 at night to 1 by day
uniform float uGritAverage;   // the grit picture's average brightness (ground-grit.ts)
uniform float uWind;       // the wind's strength, 0 (none) to 1 (high)
uniform vec3 uCameraPosition;         // the camera's position
uniform vec3 uSunDirection;      // the unit vector towards the sun
uniform vec3 uSkyHorizon;         // the sky's colour at the horizon
uniform sampler2D uDetail;          // the detail texture (detail-texture.ts)
uniform sampler2D uCloudShadeMap;   // the map of the clouds' shadows
uniform sampler2D uReefMap;         // the map of the coral heads (reef-map.ts)

varying vec3 vGroundPosition;   // this point's position in the world

#include "../shaders/shared/noise"

#include "footpaths"

#include "island-shape/island"

#include "ground-patterns/turf"

#include "../shaders/shared/lagwave"

// Bits of leaf litter and twig lying on sand: at most one short dark fleck in each square of p, at its own angle.
// Returns how much of this spot the fleck covers, 0 to 1.
float fleck(vec2 p) {
  vec2 square = floor(p);
  vec2 middle = vec2(hash(square + 13.0), hash(square + 29.0)) * 0.6 + 0.2;
  vec2 d = fract(p) - middle;
  float angle = hash(square + 41.0) * 6.283;
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
  float angle = hash(square + 33.0) * 3.1416;
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
  float angle = hash(square + 23.0) * 3.1416;
  float c = cos(angle);
  float s = sin(angle);
  float oval = 1.0 + 0.9 * hash(square + 37.0);
  vec2 e = vec2(d.x * c + d.y * s, (-d.x * s + d.y * c) * oval);
  float bowl = max(1.0 - dot(e, e), 0.0);   // 1 at the bottom of the hollow, 0 at its rim and beyond
  float isThere = step(0.3, hash(square + 19.0));
  float depth = 0.35 + 0.65 * hash(square + 43.0);
  return -dot(d, sunAlongGround) * bowl * sqrt(bowl) * isThere * depth;
}
