// What the water over a thing does to the light that reaches it: the thing's own colour under the sea, whoever
// looks at it and from where. The light is dimmed a little and loses its red with every metre it comes down.
// (What the water between the thing and an eye does is another matter, and never the thing's to draw: for an eye
// above the sea it is the surface's, water-veil.glsl; for an eye under the water it is the fog's,
// through-water.glsl.)
//
// Needs nothing from outside.

// The loss begins this far below the still sea (m): the strip the waves run up and drain off is dry half the time.
const float SEA_TINT_STARTS = 0.2;
// How much of each colour of light the water takes for each metre it comes down: red goes first.
const vec3 SEA_TAKES_A_METRE = vec3(0.36, 0.085, 0.045);
// The light is dimmed to this over the first depth (m). (It must start at exactly 1: a step draws a dark line
// along the waterline.)
const float DIMMEST_UNDER_SEA = 0.87;
const float DIMMED_BY_DEPTH = 0.7;
// An eye under water gets used to the light there, as a camera's white balance does: the red that the water over a
// thing has taken from the light on it is missed far less than an eye above the sea misses it. (Photographs taken
// a few metres down in daylight show corals tan and sand pale, not green.) So to an eye under water, the water
// over a thing takes this share of what it takes to an eye above.
const float TAKEN_TO_AN_EYE_UNDER_WATER = 0.15;

// The share of each colour of light left on a thing. tintDepth: how far it lies below where the loss begins.
// strength: 1 for sand and rock; less for living coral, whose colour is the point of it. eyeUnderWater: 1 while
// the eye is under the water, 0 above it.
vec3 lightLeftUnderSea(float tintDepth, float strength, float eyeUnderWater) {
  float dimming = mix(1.0, DIMMEST_UNDER_SEA, smoothstep(0.0, DIMMED_BY_DEPTH, tintDepth));
  float taken = strength * mix(1.0, TAKEN_TO_AN_EYE_UNDER_WATER, eyeUnderWater);
  return dimming * exp(-tintDepth * taken * SEA_TAKES_A_METRE);
}
