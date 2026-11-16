// The shape of the land. THIS FILE (with shore.glsl) IS THE ONLY DEFINITION.
// The build embeds it as the shader chunk "island" and also turns it into JavaScript functions of the same names
// (tools/glsl-for-program-plugin.ts), so that the program and the shaders can never disagree about where the ground is.
//
// Keep to the subset the converter understands: float functions of float arguments, float locals, `const float`
// numbers, + - * / and sin cos exp sqrt abs min max pow floor atan(y, x) clamp mix step smoothstep mod. (The last
// five it learnt after this file was written, which is why smoothstep and clamp are written out here.) Names must be legal in JavaScript and in every GLSL version ("flat", "sample", "input", "output"
// and "smooth" are reserved words).
//
// The atoll, from the outside in:   deep sea | drop-off | fore reef | reef crest | gardens | shallows | ocean beach |
// land | lagoon beach | lagoon
// It is a crescent of land around the lagoon; the opening (north) is mostly closed by a sandbar with one channel.
#include "shore"

// The band of land is LAND_WIDTH_NORTH wide facing north, and LAND_WIDTH_ADDED_SOUTH wider facing south (home).
const float LAND_WIDTH_NORTH = 26.0;
const float LAND_WIDTH_ADDED_SOUTH = 44.0;
// The low plateau that the land rises to (atolls are flat).
const float PLATEAU_HEIGHT = 2.9;
// The lagoon. Its beach shelves down as steeply as a floor LAGOON_BEACH_FALLS_TO deep would make it, then levels
// off into a shelf of sand LAGOON_SHELF_DEPTH down, to wade and swim over, about LAGOON_SHELF_WIDTH wide. Beyond the
// shelf lies the basin, LAGOON_DEPTH down, with patch reefs standing up to PATCH_REEF_HEIGHT above it. In it there
// is one deep hole, HOLE_DEPTH down and HOLE_RADIUS across from its middle. (A lagoon this small is shallow; the
// hole is a rare thing, chosen for the diving.)
const float LAGOON_BEACH_FALLS_TO = 6.5;
const float LAGOON_SHELF_DEPTH = 1.6;
const float LAGOON_SHELF_WIDTH = 22.0;
const float LAGOON_DEPTH = 3.8;
const float PATCH_REEF_HEIGHT = 3.0;
const float HOLE_DEPTH = 13.0;
const float HOLE_RADIUS = 20.0;
// The reef off the ocean beach, zone by zone (shore.glsl says where each begins). The shallows are sand under
// SHALLOWS_DEPTH of water, to wade in. The gardens lie about GARDENS_DEPTH down and rise and fall GARDENS_RELIEF
// either way: pools, and mounds that nearly reach the surface. The crest is the shallowest of the reef, CREST_DEPTH
// down, where the white water runs out. The fore reef slopes from just under the crest to FORE_REEF_FOOT in spurs
// and grooves SPURS_ROUND to the full turn (a whole number, or the ground has a seam due west), the grooves up to
// GROOVE_DEPTH deep: the swell breaks on its upper part. The drop-off falls from there to the sea floor,
// SEA_FLOOR_DEPTH down, and the ground goes no deeper.
const float SHALLOWS_DEPTH = 0.95;
const float GARDENS_DEPTH = 2.3;
const float GARDENS_RELIEF = 1.7;
const float CREST_DEPTH = 0.65;
const float FORE_REEF_FOOT = 10.5;
const float SPURS_ROUND = 150.0;
const float GROOVE_DEPTH = 1.4;
const float SEA_FLOOR_DEPTH = 30.5;
// Water comes in over the reef on the side the swell breaks on, and leaves on the sheltered side, the north. So
// the north is the reef's open side: there the crest is no wall but a sill LEE_SILL_DEPTH down, with patches of
// reef still standing on it.
const float LEE_SILL_DEPTH = 2.2;
// The inlet through the sandbar is a channel through sand, not through reef: it is INLET_DEPTH deeper than the
// floor beside it where it leaves the sandbar, shoals away within 40 m, and ends in a fan of sand that spreads out
// over the reef and down across the sill.
const float INLET_DEPTH = 3.5;
// The pass: one gap through the crest, in the west-north-west (PASS_DIRECTION, radians). Inside the reef its mouth
// is a wide funnel in the gardens; it narrows to PASS_THROAT either side of its middle line at the crest. Its sandy
// floor sinks from PASS_DEPTH_INSIDE to PASS_DEPTH_AT_CREST, where the fore reef falls away below it.
const float PASS_DIRECTION = 3.55;
const float PASS_THROAT = 22.0;
const float PASS_MOUTH_WIDER = 30.0;
const float PASS_DEPTH_INSIDE = 3.0;
const float PASS_DEPTH_AT_CREST = 9.0;
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

// The middle of the deep hole in the lagoon, north-east of the sandbank.
float holeX() {
  return 40.0;
}

float holeZ() {
  return -36.0;
}

// The middle of the sandbank in the lagoon (functions rather than constants, so that the program has them too).
float sandbankX() {
  return 4.0;
}

float sandbankZ() {
  return -8.0;
}

// The gardens' pools and mounds: -1 in the deepest of a pool, +1 on the top of a mound. Two egg-box patterns across
// each other, bent out of line (or the mounds would lie in rows, each like the next), and a broader swell under
// them, so that here the mounds crowd together and there the pools run into one another.
float gardenMounds(float x, float z) {
  float bentX = x + 18.0 * sin(z * 0.023 + 1.1) + 7.0 * sin(z * 0.061 + x * 0.013);
  float bentZ = z + 18.0 * sin(x * 0.019 + 2.3) + 7.0 * sin(x * 0.057 - z * 0.017);
  return 0.5 * sin(bentX * 0.071 + 0.9) * sin(bentZ * 0.066 + 2.1)
    + 0.3 * sin(bentX * 0.153 + bentZ * 0.047) * sin(bentZ * 0.139 - bentX * 0.031 + 1.3)
    + 0.2 * sin(x * 0.027 + 0.5) * sin(z * 0.031 + 1.9);
}

// The fore reef's grooves: 1 in the bed of a groove, 0 on a spur. The grooves are narrow and the spurs between
// them broad; no two are the same distance apart, some are deep and some faint, and they start and end at different
// heights on the slope. `downTheForeReef` is 0 at its top and 1 at its foot. (Every number that multiplies the
// direction is whole, or the ground would have a seam due west.)
float foreReefGroove(float direction, float distanceFromCentre, float downTheForeReef) {
  float across = direction * SPURS_ROUND + 1.8 * sin(direction * 23.0 + 0.7)
    + 1.2 * sin(direction * 57.0 + distanceFromCentre * 0.021) + 0.9 * sin(distanceFromCentre * 0.05 + direction * 11.0);
  float bed = pow(max(0.5 + 0.5 * sin(across), 1e-4), 2.5);
  float deepHere = 0.55 + 0.45 * sin(direction * 31.0 + 1.3);
  float reach = sin(3.1416 * clamp(downTheForeReef * (1.15 + 0.25 * sin(direction * 17.0)), 0.0, 1.0));
  return bed * deepHere * reach;
}

// How far along the reef a spot lies for the purpose of its zones: a few metres more or less than its distance,
// so that the zones' edges wander.
float alongReefZones(float x, float z, float along) {
  return along + 5.0 * sin(x * 0.045 + 1.7) * sin(z * 0.051 + 0.3) * smoothstep(20.0, 60.0, along);
}

// How far round to the sheltered side a direction lies: 0 round the south and the flanks, 1 round the north.
float leeSide(float direction) {
  return smoothstep(0.62, 0.85, 0.5 - 0.5 * sin(direction));
}

// The patches of reef still standing on the lee side's sill: 1 on a patch, 0 between.
float leePatches(float x, float z) {
  return smoothstep(0.1, 0.4, gardenMounds(x + 137.0, z + 59.0));
}

// The fan of sand outside the inlet: 1 on it, 0 off it. It widens as it runs out, and is gone by 80 m off the
// sandbar.
float inletFan(float direction, float distanceFromCentre, float offshore) {
  return passChannel(direction, distanceFromCentre, 0.02) * smoothstep(-2.0, 8.0, offshore)
    * (1.0 - smoothstep(35.0, 80.0, offshore));
}

// The pass through the crest: 1 along its bed, 0 beside it. `along` is the distance along the reef. Its edges
// wander.
float reefPass(float direction, float distanceFromCentre, float along) {
  float toOneSide = distanceFromCentre * sin(direction - PASS_DIRECTION);
  float halfWidth = PASS_THROAT + PASS_MOUTH_WIDER * (1.0 - smoothstep(60.0, 125.0, along))
    + 4.0 * sin(along * 0.09 + 0.6) + 2.5 * sin(along * 0.23 + toOneSide * 0.15);
  // (only on its own side of the atoll, and only from the gardens out)
  float onItsSide = cos(direction - PASS_DIRECTION) > 0.0 ? 1.0 : 0.0;
  return (1.0 - smoothstep(0.55 * halfWidth, halfWidth, abs(toOneSide))) * smoothstep(55.0, 85.0, along) * onItsSide;
}

// How much of the reef's floor at (x, z) is high ground, 0 to 1: the mounds of the gardens, the crest (on the lee
// side, its patches) and the spurs of the fore reef down to about 18 m. Coral and rock grow on the high ground;
// sand lies in the pools, the grooves, the pass and the inlet's fan, and over the shallows (terrain-colour.glsl).
float reefHighGround(float x, float z) {
  float distanceFromCentre = sqrt(x * x + z * z);
  float direction = atan(z, x);
  float offshore = distanceFromCentre - islandR(direction);
  float along = alongReefZones(x, z, alongReef(offshore, direction));
  float downTheForeReef = clamp((along - FORE_REEF_BEGINS) / (DROP_OFF_BEGINS - FORE_REEF_BEGINS), 0.0, 1.0);
  float mounds = smoothstep(-0.15, 0.45, gardenMounds(x, z));
  float onCrest = mix(1.0, leePatches(x, z), leeSide(direction));
  float spurs = 1.0 - smoothstep(0.08, 0.5, foreReefGroove(direction, distanceFromCentre, downTheForeReef));
  float high = mounds * smoothstep(GARDENS_BEGIN - 3.0, GARDENS_BEGIN + 13.0, along);
  high = mix(high, onCrest, smoothstep(CREST_BEGINS - 6.0, CREST_BEGINS + 6.0, along));
  high = mix(high, spurs, smoothstep(FORE_REEF_BEGINS - 5.0, FORE_REEF_BEGINS + 5.0, along));
  high *= 1.0 - smoothstep(DROP_OFF_BEGINS, DROP_OFF_ENDS - 8.0, along);
  return high * (1.0 - reefPass(direction, distanceFromCentre, along))
    * (1.0 - inletFan(direction, distanceFromCentre, offshore));
}

// The height of the ground at (x, z).
float hgt(float x, float z) {
  float distanceFromCentre = sqrt(x * x + z * z);
  float direction = atan(z, x);
  // metres outside the ocean shoreline (negative inland)
  float offshore = distanceFromCentre - islandR(direction);
  // metres on the land side of the lagoon shoreline (negative in the lagoon)
  float fromLagoonShore = offshore + landW(direction);

  // The lagoon. `fromShore` is how far out from its shore this is. The beach shelves down and levels off into the shelf,
  // whose edge wanders; beyond it the floor drops to the basin, which rises and falls a little.
  float fromShore = -min(fromLagoonShore, 0.0);
  float beach = LAGOON_BEACH_FALLS_TO * (1.0 - exp(-fromShore / 24.0));
  float shelf = -smin(-beach, -(LAGOON_SHELF_DEPTH + 0.012 * fromShore), 0.5);
  float shelfEnds = LAGOON_SHELF_WIDTH + 7.0 * gardenMounds(x + 71.0, z - 43.0);
  float inBasin = smoothstep(shelfEnds, shelfEnds + 20.0, fromShore);
  float lagoonDepth = shelf + (LAGOON_DEPTH - LAGOON_SHELF_DEPTH) * inBasin
    - 0.5 * gardenMounds(x * 0.6 + 19.0, z * 0.6 - 7.0) * inBasin;
  // The way in from the inlet: along the inlet's line the floor is as deep as the basin all the way to the sandbar.
  lagoonDepth = mix(lagoonDepth, max(lagoonDepth, LAGOON_DEPTH), passChannel(direction, distanceFromCentre, 0.0));
  // The patch reefs: the tops of an uneven pattern of mounds, in the basin only.
  float patchReefs = PATCH_REEF_HEIGHT * smoothstep(0.1, 0.45, gardenMounds(x - 211.0, z + 97.0)) * inBasin;
  // The deep hole: steep-sided, its rim a little fromShore of round.
  float holeAcross = x - holeX();
  float holeAlong = z - holeZ();
  float fromHole = sqrt(holeAcross * holeAcross + holeAlong * holeAlong) + 3.0 * sin(atan(holeAlong, holeAcross) * 3.0 + 1.0);
  float hole = (HOLE_DEPTH - LAGOON_DEPTH) * (1.0 - smoothstep(0.5 * HOLE_RADIUS, HOLE_RADIUS, fromHole));
  // (no patch reef stands in the hole)
  patchReefs *= smoothstep(HOLE_RADIUS, HOLE_RADIUS + 8.0, fromHole);
  // (on the land side the beach keeps rising, 1 in 5, until it meets the plateau)
  float lagoon = 0.2 * max(fromLagoonShore, 0.0) - lagoonDepth - hole + patchReefs;

  // The land: the ocean beach rises to a low plateau (atolls are flat), which falls to the lagoon beach.
  float rolls = 0.5 * sin(x * 0.13 + 1.0) * sin(z * 0.11);
  float bumps = 0.35 * sin(x * 0.31) * cos(z * 0.27);
  float plateau = PLATEAU_HEIGHT + rolls + bumps;
  float oceanBeachToPlateau = smin(shoreH(x, z), plateau, 0.5);
  float land = smin(oceanBeachToPlateau, lagoon, 0.5);

  // The ocean side: the reef. Where the beach reaches SHALLOWS_DEPTH of water the shallows begin; each zone then
  // runs into the next over a few metres. `along` is how far off the beach this is, as it would lie due south, a
  // little more or less so that the zones' edges wander.
  float along = alongReefZones(x, z, alongReef(offshore, direction));
  float ripples = 0.1 * sin(x * 0.6 + z * 0.3) * sin(z * 0.7);
  float shallows = -SHALLOWS_DEPTH - 0.012 * min(max(offshore, 0.0), GARDENS_BEGIN) + ripples;
  float gardens = -GARDENS_DEPTH + GARDENS_RELIEF * gardenMounds(x, z) + 0.5 * ripples;
  // (the crest: on the sheltered side a sill, with patches of reef left standing on it)
  float crestTop = -CREST_DEPTH + 0.15 * sin(x * 0.21 + 0.5) * sin(z * 0.19) + 0.5 * ripples;
  float sill = -LEE_SILL_DEPTH + 0.3 * gardenMounds(x + 137.0, z + 59.0) + 0.5 * ripples;
  float crest = mix(crestTop, sill, leeSide(direction) * (1.0 - leePatches(x, z)));
  float downTheForeReef = clamp((along - FORE_REEF_BEGINS) / (DROP_OFF_BEGINS - FORE_REEF_BEGINS), 0.0, 1.0);
  float foreReef = -CREST_DEPTH - 0.6 - (FORE_REEF_FOOT - CREST_DEPTH - 0.6) * pow(downTheForeReef, 1.3)
    - GROOVE_DEPTH * foreReefGroove(direction, distanceFromCentre, downTheForeReef);
  float dropOff = -FORE_REEF_FOOT
    - (SEA_FLOOR_DEPTH - FORE_REEF_FOOT) * smoothstep(DROP_OFF_BEGINS, DROP_OFF_ENDS, along);
  float reef = mix(shallows, gardens, smoothstep(GARDENS_BEGIN - 3.0, GARDENS_BEGIN + 13.0, along));
  reef = mix(reef, crest, smoothstep(CREST_BEGINS - 6.0, CREST_BEGINS + 6.0, along));
  reef = mix(reef, foreReef, smoothstep(FORE_REEF_BEGINS - 5.0, FORE_REEF_BEGINS + 5.0, along));
  reef = mix(reef, dropOff, smoothstep(DROP_OFF_BEGINS - 4.0, DROP_OFF_BEGINS + 4.0, along));
  // The inlet's fan of sand lies smooth over whatever the reef is there, sloping down as it runs out; the inlet
  // itself is cut into it by the sandbar and shoals away.
  float fanLevel = -mix(1.2, 2.2, smoothstep(10.0, 80.0, offshore)) + ripples;
  reef = mix(reef, fanLevel, inletFan(direction, distanceFromCentre, offshore));
  reef -= INLET_DEPTH * passChannel(direction, distanceFromCentre, 0.0) * (1.0 - smoothstep(6.0, 40.0, offshore));
  // The pass: a sandy floor of its own, wherever the reef stands above it.
  float passFloor = -mix(PASS_DEPTH_INSIDE, PASS_DEPTH_AT_CREST, smoothstep(70.0, 135.0, along)) + 0.5 * ripples;
  reef = mix(reef, min(reef, passFloor), reefPass(direction, distanceFromCentre, along));
  // More than 5 m inland the reef falls away steeply, so that it stays out of the lagoon.
  float inlandFall = 2.0 * max(-5.0 - offshore, 0.0);
  float reefFlat = reef - inlandFall;

  // The sandbank: a low dome in the lagoon.
  float dx = x - sandbankX();
  float dz = z - sandbankZ();
  float sandbank = SANDBANK_HEIGHT * (1.0 - (dx * dx + dz * dz) / SANDBANK_RADIUS_SQUARED);

  return max(max(max(land, reefFlat), sandbank), -SEA_FLOOR_DEPTH);
}
