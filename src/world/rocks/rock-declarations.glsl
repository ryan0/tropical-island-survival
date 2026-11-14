// Declarations for the rock colouring, put in front of three.js's Lambert fragment shader by rock-material.ts.
// rock-colour.glsl also needs the defines ROCK_SCALE, ROCK_CRACK, ROCK_PIT, ROCK_BUMP, ROCK_BLEACH and ROCK_BARNACLE:
// one set for each kind of rock, written by rock-material.ts.

// the height of the still sea surface
uniform float uLevel;
// daylight: 0 at night, 1 by day
uniform float uDay;
// seconds on the clock the waves run by
uniform float uTime;
// wind strength, 0..1
uniform float uWind;
// the detail texture: red and green the slope of small waves, blue soft blotches, alpha a net of thin lines
uniform sampler2D uDet;

// where the point is in the world, and which way the surface faces there
varying vec3 vRp;
varying vec3 vRn;

#include "../../shaders/shared/seatint"
