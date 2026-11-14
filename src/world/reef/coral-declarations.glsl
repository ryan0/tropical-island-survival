// Declarations for the coral colouring; put in front of three.js's Lambert fragment shader by reef-material.ts.

// the detail texture: red and green the slope of small waves, blue soft blotches, alpha a net of thin lines
uniform sampler2D uDet;
// seconds on the clock the waves run by
uniform float uTime;
// daylight: 0 at night, 1 by day
uniform float uDay;
// the height of the still sea surface
uniform float uLevel;
// wind strength, 0..1
uniform float uWind;
// the camera's position: three.js does not fill in cameraPosition for a Lambert material
uniform vec3 uCam;

// where the point is in the world
varying vec3 vRp;

#include "../../shaders/shared/seatint"
