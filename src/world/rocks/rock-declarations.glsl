// Declarations for the rock colouring. rock-colour.glsl needs the defines ROCK_SCALE, ROCK_CRACK, ROCK_PIT, ROCK_BUMP,
// ROCK_BLEACH and ROCK_BARNACLE: one set for each kind of rock, written by rock-material.ts.
uniform float uLevel,uDay,uTime,uWind;uniform sampler2D uDet;varying vec3 vRp;varying vec3 vRn;

#include "../../shaders/shared/seatint"
