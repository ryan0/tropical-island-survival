// The shape of the land. THIS FILE (with shore.glsl) IS THE ONLY DEFINITION.
// The build embeds it as the shader chunk "island" and also turns it into JavaScript functions of the same names
// (tools/glsl-for-program-plugin.ts), so that the program and the shaders can never disagree about where the ground is.
//
// Keep to the subset the converter understands: float functions of float arguments, float locals, `const float`
// numbers, + - * / and sin cos exp sqrt abs min max pow floor atan(y, x) clamp mix step smoothstep mod. (The last
// five it learnt after this file was written, which is why smoothstep and clamp are written out here.) Names must be legal in JavaScript and in every GLSL version ("flat", "sample", "input", "output"
// and "smooth" are reserved words).
//
// The atoll, from the outside in:   deep sea | drop-off | reef flat | ocean beach | land | lagoon beach | lagoon
// It is a crescent of land around the lagoon; the opening (north) is mostly closed by a sandbar with one channel.
#include "shore"

// The band of land is LAND_WIDTH_NORTH wide facing north, and LAND_WIDTH_ADDED_SOUTH wider facing south (home).
const float LAND_WIDTH_NORTH = 26.0;
const float LAND_WIDTH_ADDED_SOUTH = 44.0;
// The low plateau that the land rises to (atolls are flat).
const float PLATEAU_HEIGHT = 2.9;
// The depth of the lagoon's floor, and how far the flat tops of the patch reefs stand above it.
const float LAGOON_DEPTH = 6.5;
const float PATCH_REEF_HEIGHT = 3.4;
// The reef flat lies REEF_FLAT_DEPTH under still water off the ocean beach, deepening a little out to REEF_FLAT_WIDTH
// from the shoreline. There it drops DROP_OFF_DEPTH further over DROP_OFF_WIDTH, and the ground goes no deeper than
// SEA_FLOOR_DEPTH.
const float REEF_FLAT_DEPTH = 1.15;
const float REEF_FLAT_WIDTH = 46.0;
const float DROP_OFF_DEPTH = 9.0;
const float DROP_OFF_WIDTH = 18.0;
const float SEA_FLOOR_DEPTH = 9.5;
// The sandbank in the lagoon rises SANDBANK_HEIGHT above still water and is SANDBANK_RADIUS across at the waterline, from its
// middle.
const float SANDBANK_HEIGHT = 2.2;
const float SANDBANK_RADIUS = 20.0;
const float SANDBANK_RADIUS_SQUARED = SANDBANK_RADIUS * SANDBANK_RADIUS;

// The width of the band of land (or, across the pass, of sandbar) in a direction, measured in from the ocean
// shoreline. A crescent: thickest in the south ("home"), tapering along both horns and across the pass, where the
// same band is only a low sandbar (shore.glsl decides how high it stands). Never below 21 m: the wave mesh reaches
// 9 m up the ocean beach and must find the same ground under it that the wave model expects.
float landW(float direction) {
  float southness = 0.5 + 0.5 * sin(direction);
  float crescent = LAND_WIDTH_NORTH + LAND_WIDTH_ADDED_SOUTH * pow(southness, 1.6);
  return crescent + 4.0 * sin(5.0 * direction + 1.0);
}

// A smooth minimum: like min(a, b), but it rounds off the corner where the two meet, over about `width`.
float smin(float a, float b, float width) {
  float h = max(width - abs(a - b), 0.0) / width;
  return min(a, b) - h * h * width * 0.25;
}

// The middle of the sandbank in the lagoon (functions rather than constants, so that the program has them too).
float sandbankX() {
  return 4.0;
}

float sandbankZ() {
  return -8.0;
}

// The height of the ground at (x, z).
float hgt(float x, float z) {
  float distanceFromCentre = sqrt(x * x + z * z);
  float direction = atan(z, x);
  // metres outside the ocean shoreline (negative inland)
  float offshore = distanceFromCentre - islandR(direction);
  // metres on the land side of the lagoon shoreline (negative in the lagoon)
  float fromLagoonShore = offshore + landW(direction);

  // The lagoon: a beach that shelves down to a floor LAGOON_DEPTH deep, with flat-topped patch reefs rising from it.
  // The reefs are the peaks of an egg-box pattern, cut off flat, and grow in over the first 25 m out from the beach.
  float lagoonSide = min(fromLagoonShore, 0.0);
  float reefsGrowIn = min(-lagoonSide / 25.0, 1.0);
  float reefPattern = sin(x * 0.09 + 1.3) * sin(z * 0.085 + 0.4);
  float patchReefs = min(7.0 * max(reefPattern - 0.4, 0.0), PATCH_REEF_HEIGHT) * reefsGrowIn;
  float shelving = LAGOON_DEPTH * (1.0 - exp(lagoonSide / 24.0));
  // (on the land side the beach keeps rising, 1 in 5, until it meets the plateau)
  float lagoon = 0.2 * max(fromLagoonShore, 0.0) - shelving + patchReefs;

  // The land: the ocean beach rises to a low plateau (atolls are flat), which falls to the lagoon beach.
  float rolls = 0.5 * sin(x * 0.13 + 1.0) * sin(z * 0.11);
  float bumps = 0.35 * sin(x * 0.31) * cos(z * 0.27);
  float plateau = PLATEAU_HEIGHT + rolls + bumps;
  float oceanBeachToPlateau = smin(shoreH(x, z), plateau, 0.5);
  float land = smin(oceanBeachToPlateau, lagoon, 0.5);

  // The ocean side: where the beach reaches REEF_FLAT_DEPTH of water the reef flat begins; REEF_FLAT_WIDTH out it
  // drops away.
  float t = min(max((offshore - REEF_FLAT_WIDTH) / DROP_OFF_WIDTH, 0.0), 1.0);
  float dropOff = DROP_OFF_DEPTH * t * t * (3.0 - 2.0 * t);
  float deepening = 0.012 * max(offshore, 0.0);
  float ripples = 0.1 * sin(x * 0.6 + z * 0.3) * sin(z * 0.7);
  // More than 5 m inland the flat falls away steeply, so that it stays out of the lagoon.
  float inlandFall = 2.0 * max(-5.0 - offshore, 0.0);
  // The channel through the sandbar runs on out across the reef flat, 3 m deeper than the flat.
  float channel = 3.0 * passChannel(direction, distanceFromCentre, 0.0);
  float reefFlat = -REEF_FLAT_DEPTH - deepening - dropOff + ripples - inlandFall - channel;

  // The sandbank: a low dome in the lagoon.
  float dx = x - sandbankX();
  float dz = z - sandbankZ();
  float sandbank = SANDBANK_HEIGHT * (1.0 - (dx * dx + dz * dz) / SANDBANK_RADIUS_SQUARED);

  return max(max(max(land, reefFlat), sandbank), -SEA_FLOOR_DEPTH);
}
