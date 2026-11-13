// Declarations for the coral colouring; put in front of three.js's Lambert fragment shader by reef-material.ts.
uniform sampler2D uDet;uniform float uTime,uDay,uLevel,uWind;uniform vec3 uCam;varying vec3 vRp;

#include "../../shaders/shared/seatint"
