// Declarations for the coral colouring; put in front of three.js's Lambert fragment shader by reef-material.ts.

// the detail texture: red and green the slope of small waves, blue soft blotches, alpha a net of thin lines
uniform sampler2D uDetail;
// the caustics texture: the net of light on what lies under the water
uniform sampler2D uCaustics;
// seconds on the clock the waves run by
uniform float uTime;
// daylight: 0 at night, 1 by day
uniform float uDaylight;
// the height of the still sea surface
uniform float uSeaLevel;
// a debug switch: 5 drains the sea, to see its floor
uniform float uDebugMode;
// wind strength, 0..1
uniform float uWind;
// the camera's position: three.js does not fill in cameraPosition for a Lambert material
uniform vec3 uCameraPosition;

// where the point is in the world
varying vec3 vSurfacePosition;

#include "../../shaders/shared/seatint"
