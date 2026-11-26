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
// The reef off the ocean beach, zone by zone (shore.glsl says where each begins; docs/REEF.md says what a real
// reef has in each, and where these sizes come from). Depths are below the still sea, which is the sea at
// mid-tide: a tide of half a metre either way is planned for, so the highest of the reef is just awash at low
// water.
// The shallows are sand under SHALLOWS_DEPTH of water, to wade in. The gardens lie about GARDENS_DEPTH down and
// rise and fall GARDENS_RELIEF either way: pools, and mounds that nearly reach the surface. Here and there
// their floor falls away into a basin some fifty metres across, BASIN_DEPTH deeper and evener: deep water behind
// the crest, out of the open sea, to dive in. (Ryan, 26 November 2026: the gardens "slightly deeper", and
// "deeper areas here (think 10-20 ft) for the player to explore while protected from the open ocean". They
// were 2.3 m down, give or take 1.7, with no basins.)
const float SHALLOWS_DEPTH = 0.95;
const float GARDENS_DEPTH = 2.7;
const float GARDENS_RELIEF = 1.9;
const float BASIN_DEPTH = 2.8;
// The crest. Where the sea beats on it, it is a ridge. Where the reef bulges towards the sea the ridge is high:
// its top RIDGE_TOP down, and behind it a bare flat BEHIND_RIDGE down. Where the reef curves away it is a low
// arch, ARCH_TOP down, with the gardens close behind it, BEHIND_ARCH down. Where little sea reaches it (the west)
// it is flat rock CREST_DEPTH down.
const float RIDGE_TOP = 0.4;
const float BEHIND_RIDGE = 1.5;
// Just behind the crest, on the sides the sea beats on, lies a strip of low heads that stand to HEAD_TOPS under
// the sea, with pothole pools between them, POTHOLE_DEPTH deeper than the floor round them (docs/REEF.md, the
// gardens). A real head is 1 to 8 m across, flat-topped and awash at low water, and a pothole 1.5 to 3: ours
// are some 6 and 5, the least the ground's squares can draw, and their sides slope. (Flat-topped and half a
// metre down, they were white slabs with stepped outlines from the air: the ground's squares cannot draw a
// round rim, and so near the surface the floor is drawn as sand.)
const float HEAD_TOPS = 0.85;
const float POTHOLE_DEPTH = 1.3;
const float ARCH_TOP = 0.55;
const float BEHIND_ARCH = 0.8;
const float CREST_DEPTH = 0.65;
// The fore reef. First its spurs, whose tops slope evenly from SPURS_BEGIN_DEPTH at the crest's edge to
// SPURS_END_DEPTH at SPURS_END along the reef, 1 in 10: the swell stands up and breaks on them, the usual wave
// within a few metres of the crest's edge and the biggest some ten metres out. Between the spurs lie
// grooves with flat floors and steep walls, GROOVE_DEEP_AT_EDGE below the spurs at the crest's edge and
// GROOVE_DEEP_AT_END at their outer end, deeper still on the flanks; they run on into a high ridge as its surge
// channels. There are SPURS_ROUND spurs to the full turn (a whole number, or the ground has a seam due west) where
// they are an average distance apart, and they crowd together round the south, up to 1 + SPURS_CROWD_SOUTH times
// as close. The spurs end, some sooner than SPURS_END and some later, in a step down to a terrace, which slopes
// from TERRACE_DEPTH to FORE_REEF_FOOT; big coral heads stand on it here and there, up to TERRACE_HEAD_HEIGHT
// high (lumps of the ground, for now). The deepest grooves run on across the terrace as chutes of sand,
// CHUTE_SHARE as deep as the groove was, and notch the drop-off's lip. (A groove's floor is about 4 m wide and
// its walls 2 m: the wide end of what real ones are, so that the ground's squares can draw them.)
const float SPURS_BEGIN_DEPTH = 0.75;
const float SPURS_END_DEPTH = 4.6;
const float SPURS_END = 183.0;
const float GROOVE_DEEP_AT_EDGE = 1.3;
const float GROOVE_DEEP_AT_END = 2.6;
const float SPURS_ROUND = 88.0;
const float SPURS_CROWD_SOUTH = 0.9;
const float TERRACE_DEPTH = 7.0;
const float FORE_REEF_FOOT = 11.5;
const float TERRACE_HEAD_HEIGHT = 1.5;
const float CHUTE_SHARE = 0.3;
// The drop-off falls from the terrace to the sea floor, SEA_FLOOR_DEPTH down, and the ground goes no deeper. Its
// lip wanders in and out with the spurs' ends, and lumps stand out of its face.
const float SEA_FLOOR_DEPTH = 30.5;
// Storm notches: bays that storms have broken out of the reef's edge on the swell's side, floored with fallen
// blocks. Each has the direction it lies in, half its width at its mouth, and how far along the reef it reaches in
// from the crest's edge. The direction is written as its cosine and sine (X and Z), so that finding a notch costs
// the shaders no trigonometry: the wide one lies at 2.05 radians (south-south-west), the east one at 0.95
// (south-east), the small one at 2.6 (south-west). The floor of a notch is NOTCH_DEPTH_AT_HEAD down at its head
// and slopes out to the terrace, where the rubble that fell from it lies spread below its mouth.
const float NOTCH_DEPTH_AT_HEAD = 3.0;
const float WIDE_NOTCH_X = -0.4611;
const float WIDE_NOTCH_Z = 0.8874;
const float WIDE_NOTCH_HALF_WIDTH = 22.0;
const float WIDE_NOTCH_REACH = 18.0;
const float EAST_NOTCH_X = 0.5817;
const float EAST_NOTCH_Z = 0.8134;
const float EAST_NOTCH_HALF_WIDTH = 12.0;
const float EAST_NOTCH_REACH = 13.0;
const float SMALL_NOTCH_X = -0.8569;
const float SMALL_NOTCH_Z = 0.5155;
const float SMALL_NOTCH_HALF_WIDTH = 8.0;
const float SMALL_NOTCH_REACH = 10.0;
// Water comes in over the reef on the side the swell breaks on, and leaves on the sheltered side, the north. So
// the north is the reef's open side: there the crest is no wall but a sill LEE_SILL_DEPTH down, with patches of
// reef still standing on it. Outside the sill there are no spurs and no terrace: the reef falls to the sea floor
// in one wall, within LEE_WALL_WIDTH along the reef: rounded masses stand out of it, and it has ledges on the way
// down.
const float LEE_SILL_DEPTH = 2.2;
const float LEE_WALL_WIDTH = 40.0;
// The inlet through the sandbar is a channel through sand, not through reef: it is INLET_DEPTH deeper than the
// floor beside it where it leaves the sandbar, shoals away within 40 m, and ends in a fan of sand that spreads out
// over the reef and down across the sill.
const float INLET_DEPTH = 3.5;
// The pass: one gap through the crest, in the west-north-west: 3.55 radians, written as its cosine and sine
// (PASS_X, PASS_Z), so that finding it costs the shaders no trigonometry. Inside the reef its mouth is a wide
// funnel in the gardens; it narrows to PASS_THROAT either side of its middle line at the crest. Its floor is
// flat, scoured by the current, and sinks from PASS_DEPTH_INSIDE to PASS_DEPTH_AT_CREST. A low ridge of coral lies
// across it PASS_RIDGE_AT along the reef, PASS_RIDGE_HEIGHT high. Outside the crest the current drops its sand
// in a fan: it widens by PASS_LOBE_WIDER to either side, is highest along its middle, where it slopes gently to
// PASS_LOBE_DEPTH at PASS_LOBE_SLOPES_TO along the reef and then falls away to the sea floor by PASS_LOBE_ENDS,
// and it lies PASS_LOBE_SIDES_FALL lower at its edges.
const float PASS_X = -0.9178;
const float PASS_Z = -0.3971;
const float PASS_THROAT = 22.0;
const float PASS_MOUTH_WIDER = 30.0;
const float PASS_DEPTH_INSIDE = 3.0;
const float PASS_DEPTH_AT_CREST = 9.0;
const float PASS_RIDGE_AT = 128.0;
const float PASS_RIDGE_HEIGHT = 1.8;
const float PASS_LOBE_WIDER = 34.0;
const float PASS_LOBE_DEPTH = 12.5;
const float PASS_LOBE_SLOPES_TO = 212.0;
const float PASS_LOBE_ENDS = 262.0;
const float PASS_LOBE_SIDES_FALL = 8.0;
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

// The gardens' basins: 1 on the floor of one, 0 outside. A broad pattern of their own, bent out of line, so that
// some half dozen lie round the atoll; and only within the gardens (`along` is the distance along the reef),
// clear of the shallows a wader keeps to and of the crest the swell breaks on.
float gardenBasins(float x, float z, float along) {
  float bentX = x + 22.0 * sin(z * 0.017 + 0.4);
  float bentZ = z + 22.0 * sin(x * 0.015 + 1.7);
  // (their rims wander with a finer pattern, or each would be a rounded square)
  float rim = 0.16 * sin(x * 0.083 + z * 0.041 + 1.2) * sin(z * 0.077 - x * 0.036 + 0.7);
  return smoothstep(0.35, 0.7, sin(bentX * 0.026 + 2.6) * sin(bentZ * 0.029 + 0.3) + rim)
    * smoothstep(GARDENS_BEGIN + 6.0, GARDENS_BEGIN + 22.0, along)
    * (1.0 - smoothstep(CREST_BEGINS - 30.0, CREST_BEGINS - 14.0, along));
}

// How hard the sea beats on a stretch of the reef: 1 round the south, where the swell arrives; about a half on the
// east, which the wind's waves reach; a third on the west; 0 round the north.
float seaExposure(float direction) {
  return clamp(0.45 + 0.6 * sin(direction) + 0.1 * cos(direction), 0.0, 1.0);
}

// How much of a ridge the crest is, 0 to 1, for the sea's exposure there: it grows only where the sea beats on
// the reef.
float ridgeFor(float exposure) {
  return smoothstep(0.3, 0.7, exposure);
}

// The same, for a direction.
float ridgeAt(float direction) {
  return ridgeFor(seaExposure(direction));
}

// And how high a ridge: 1 where the reef bulges towards the sea, 0 (a low arch) where it curves away.
float highRidgeAt(float direction) {
  return smoothstep(-0.25, 0.45, reefHeadlands(direction) / REEF_HEADLAND);
}

// The waves round the rim that no two spurs alike are made from, each -1 to 1: `spurWave` says which grooves are
// deep and which spurs long, `edgeWave` where the spurs' ends and the drop-off's lip stand further out. (Whole
// numbers multiply the direction, or the ground would have a seam due west.)
float spurWaveAt(float direction) {
  return sin(direction * 31.0 + 1.3);
}

float edgeWaveAt(float direction) {
  return sin(direction * 13.0 + 0.9);
}

// How far along the reef the spurs end, and the drop-off begins, where those waves are as given.
float spursEndFor(float spurWave, float edgeWave) {
  return SPURS_END + 8.0 * edgeWave + 5.0 * spurWave;
}

float dropOffBeginsFor(float edgeWave) {
  return DROP_OFF_BEGINS + 6.0 * edgeWave;
}

// The fore reef's grooves, the surge channels they run on into and the chutes they run out as: 1 on the flat
// floor of a deep groove, 0 on a spur or a buttress. No two are the same distance apart, some are deep and some
// faint, and each runs its own distance into the ridge. `along` is the distance along the reef, `highRidge` how
// much of a high ridge the crest is here (only a high ridge is cut by channels), `exposure` the sea's, and
// `spursEnd` where the spurs end here. (Every number that multiplies the direction is whole, or the ground would
// have a seam due west.)
float foreReefGroove(
  float direction, float distanceFromCentre, float along, float highRidge, float exposure, float spurWave,
  float spursEnd
) {
  // (the spurs wander less where they are fewer, or they would run into one another)
  float crowding = (1.0 + SPURS_CROWD_SOUTH * sin(direction)) / (1.0 + SPURS_CROWD_SOUTH);
  float across = SPURS_ROUND * (direction - SPURS_CROWD_SOUTH * cos(direction))
    + crowding * (1.8 * sin(direction * 23.0 + 0.7) + 1.2 * sin(direction * 57.0 + distanceFromCentre * 0.021)
    + 0.9 * sin(distanceFromCentre * 0.05 + direction * 11.0));
  // A groove has a floor and two walls. It begins as a slot and opens out over its first 20 m, so that a surge
  // channel in the ridge is narrow and the groove it becomes is wide.
  float begins = FORE_REEF_BEGINS + 2.0 - highRidge * (16.0 + 8.0 * sin(direction * 17.0 + 0.4));
  float opening = smoothstep(begins, begins + 20.0, along);
  float bed = smoothstep(mix(0.8, 0.33, opening), mix(0.98, 0.8, opening), 0.5 + 0.5 * sin(across));
  float deepHere = 0.55 + 0.45 * spurWave;
  float pastTheSpurs = smoothstep(spursEnd - 3.0, spursEnd + 4.0, along);
  float betweenSpurs = smoothstep(begins, begins + 7.0, along) * (1.0 - pastTheSpurs);
  // (the deepest run on across the terrace as chutes of sand, and over the drop-off's lip)
  float chute = CHUTE_SHARE * smoothstep(0.35, 0.6, spurWave) * pastTheSpurs
    * (1.0 - smoothstep(DROP_OFF_BEGINS + 10.0, DROP_OFF_BEGINS + 26.0, along));
  return bed * (deepHere * betweenSpurs + chute) * smoothstep(0.08, 0.3, exposure);
}

// One storm notch and the line of rubble below it: 1 in it, 0 to either side. In plan the notch is half an oval,
// widest at its mouth on the crest's edge and round at its head; below the mouth the line widens, as the rubble
// that fell from the notch spread. (towardsX, towardsZ) is the unit vector from the atoll's centre towards it;
// `sideWander` and `widthWander` make its sides wander.
float notchAt(
  float x, float z, float along, float towardsX, float towardsZ, float halfWidth, float reach, float sideWander,
  float widthWander
) {
  float toOneSide = z * towardsX - x * towardsZ + sideWander;
  float inFromMouth = clamp((FORE_REEF_BEGINS + 4.0 - along) / reach, 0.0, 1.0);
  float spread = 1.0 + 0.5 * smoothstep(FORE_REEF_BEGINS + 4.0, SPURS_END + 10.0, along);
  float widthHere = halfWidth * sqrt(max(1.0 - inFromMouth * inFromMouth, 0.0)) * widthWander * spread;
  // (only on its own side of the atoll)
  return (1.0 - smoothstep(widthHere - 4.0, widthHere, abs(toOneSide))) * step(0.0, x * towardsX + z * towardsZ);
}

// The storm notches and the lines of rubble below them: 1 in any of them, 0 outside. `lumps` is reefLumps there:
// it scallops their sides.
float stormNotches(float x, float z, float along, float lumps) {
  float sideWander = 3.0 * sin(along * 0.29) + 1.2 * lumps;
  float widthWander = 1.0 + 0.2 * sin(along * 0.17);
  float wide = notchAt(x, z, along, WIDE_NOTCH_X, WIDE_NOTCH_Z, WIDE_NOTCH_HALF_WIDTH, WIDE_NOTCH_REACH,
    sideWander, widthWander);
  float east = notchAt(x, z, along, EAST_NOTCH_X, EAST_NOTCH_Z, EAST_NOTCH_HALF_WIDTH, EAST_NOTCH_REACH,
    sideWander, widthWander);
  float small = notchAt(x, z, along, SMALL_NOTCH_X, SMALL_NOTCH_Z, SMALL_NOTCH_HALF_WIDTH, SMALL_NOTCH_REACH,
    sideWander, widthWander);
  return max(wide, max(east, small));
}

// Of a notch's line, the part where the reef is cut away (down to the spurs' ends), and the part below where its
// rubble lies on the terrace.
float notchCutAt(float along, float spursEnd) {
  return 1.0 - smoothstep(spursEnd - 12.0, spursEnd + 4.0, along);
}

float notchRubbleAt(float along, float spursEnd) {
  return smoothstep(spursEnd - 14.0, spursEnd + 2.0, along) * (1.0 - smoothstep(spursEnd + 12.0, spursEnd + 30.0, along));
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

// The lee side's own pattern of mounds: its sill's rises and falls, the patches of reef left standing on the sill,
// and the lumps of the wall outside it.
float leeMounds(float x, float z) {
  return gardenMounds(x + 137.0, z + 59.0);
}

// The patches of reef still standing on the lee side's sill: 1 on a patch, 0 between. `mounds` is leeMounds there.
float leePatches(float mounds) {
  return smoothstep(0.1, 0.4, mounds);
}

// The bare flat behind a high ridge: 1 on it, 0 where the gardens grow. `highRidge` is how much of a high ridge
// the crest is here, `along` the distance along the reef.
float bareBehindRidge(float highRidge, float along) {
  return highRidge * smoothstep(78.0, 102.0, along);
}

// The fan of sand outside the inlet: 1 on it, 0 off it. It widens as it runs out, and is gone by 80 m off the
// sandbar.
float inletFan(float direction, float distanceFromCentre, float offshore) {
  return passChannel(direction, distanceFromCentre, 0.02) * smoothstep(-2.0, 8.0, offshore)
    * (1.0 - smoothstep(35.0, 80.0, offshore));
}

// How far to one side of the pass's middle line a spot lies (metres, one side negative), and whether it is on the
// pass's side of the atoll at all (1, or 0).
float besideThePass(float x, float z) {
  return z * PASS_X - x * PASS_Z;
}

float onThePassSide(float x, float z) {
  return step(0.0, x * PASS_X + z * PASS_Z);
}

// The pass through the reef: 1 along its bed, 0 beside it. `toOneSide` is besideThePass, `along` the distance
// along the reef. Its edges wander. (Only from the gardens out.)
float reefPass(float toOneSide, float along) {
  float halfWidth = PASS_THROAT + PASS_MOUTH_WIDER * (1.0 - smoothstep(60.0, 125.0, along))
    + 4.0 * sin(along * 0.09 + 0.6) + 2.5 * sin(along * 0.23 + toOneSide * 0.15);
  return (1.0 - smoothstep(0.55 * halfWidth, halfWidth, abs(toOneSide))) * smoothstep(55.0, 85.0, along);
}

// The ridge of coral across the pass: 1 along its top, 0 off it.
float passRidge(float along) {
  return 1.0 - smoothstep(3.0, 8.0, abs(along - PASS_RIDGE_AT));
}

// The fan of sand outside the pass. How far across it a spot lies: 0 on its middle line, 1 at its edge.
float acrossPassLobe(float toOneSide, float along) {
  float halfWidth = PASS_THROAT + PASS_LOBE_WIDER * smoothstep(FORE_REEF_BEGINS, PASS_LOBE_SLOPES_TO, along);
  return abs(toOneSide) / halfWidth;
}

// And how high its surface lies there: the ground rises to it wherever the reef is lower.
float passLobeHeight(float acrossLobe, float along) {
  float middle = -PASS_DEPTH_AT_CREST
    - (PASS_LOBE_DEPTH - PASS_DEPTH_AT_CREST) * smoothstep(FORE_REEF_BEGINS + 5.0, PASS_LOBE_SLOPES_TO, along)
    - (SEA_FLOOR_DEPTH - PASS_LOBE_DEPTH) * smoothstep(PASS_LOBE_SLOPES_TO, PASS_LOBE_ENDS, along);
  return middle - PASS_LOBE_SIDES_FALL * acrossLobe * acrossLobe;
}

// The reef's small bumps, a hand high: 1 on the top of one, -1 in a dip.
float reefBumps(float x, float z) {
  return sin(x * 0.6 + z * 0.3) * sin(z * 0.7);
}

// The reef's lumps: 1 on the top of one, -1 between. Some 4 m across, in no rows. They are the fallen blocks of
// the notches, the coral heads of the terrace and the spurs, and the rounded masses of the walls. (All
// placeholders for things that will be made on their own.)
float reefLumps(float x, float z) {
  return sin(x * 0.75 + 1.7 * sin(z * 0.33)) * sin(z * 0.7 + 1.7 * sin(x * 0.29));
}

// The strip of heads and potholes behind the crest: 1 in it, 0 outside. `along` is the distance along the reef,
// `ridge` how much of a ridge the crest is here (none on the sheltered sides, where there is no strip).
float behindCrestStrip(float along, float ridge) {
  return ridge * smoothstep(CREST_BEGINS - 28.0, CREST_BEGINS - 20.0, along)
    * (1.0 - smoothstep(CREST_BEGINS - 7.0, CREST_BEGINS + 1.0, along));
}

// The strip's flat-topped heads (1 on one, 0 between) and its potholes (1 in one): each from the reef's lumps,
// read at a size of its own, so that neither lies in the other's rows.
float stripHeads(float x, float z) {
  // (crowded here and few there, by the gardens' broad pattern: evenly spaced, they were a string of beads
  // from the air)
  float crowding = 0.3 * gardenMounds(x * 1.4 + 50.0, z * 1.4 - 20.0);
  return smoothstep(0.05, 0.6, reefLumps(x * 0.62 + 3.0, z * 0.62 + 11.0) + crowding);
}

float stripPotholes(float x, float z) {
  return smoothstep(0.4, 0.6, reefLumps(x * 0.8 - 7.0, z * 0.8 + 2.0)) * (1.0 - stripHeads(x, z));
}

// Fallen blocks, where the lumps are as given: 1 on the top of one, 0 on the floor between, over a quarter of it.
float fallenBlocks(float lumps) {
  return smoothstep(0.1, 0.7, lumps);
}

// The big coral heads of the terrace: 1 on one, 0 between. They stand in a few clusters. `gardenPattern` is
// gardenMounds there.
float terraceHeads(float lumps, float gardenPattern) {
  return smoothstep(0.45, 0.85, lumps) * smoothstep(0.2, 0.55, gardenPattern);
}

// The rounded masses that stand out of a wall: 1 in the middle of one, 0 between. `pattern` is a broad pattern
// of mounds there (-1 to 1): where it is high the masses are many and large, where it is low few and small.
float wallMasses(float lumps, float pattern) {
  return smoothstep(0.1, 0.8, lumps + 0.6 * pattern - 0.4);
}

// How much of the reef's floor at (x, z) is high ground, 0 to 1: the mounds of the gardens (few on the bare flat
// behind a high ridge), the crest between its surge channels (on the lee side, its patches), the spurs of the fore
// reef, the heads and patches of the terrace, the blocks in a storm notch and below it, and the ridge across the
// pass. Coral and rock grow on the high ground; sand lies in the pools, the grooves and their chutes, the pass, its
// fan and the inlet's, and over the shallows (terrain-colour.glsl).
float reefHighGround(float x, float z) {
  float distanceFromCentre = sqrt(x * x + z * z);
  float direction = atan(z, x);
  float offshore = distanceFromCentre - islandR(direction);
  float along = alongReefZones(x, z, alongReef(offshore, direction));
  float lee = leeSide(direction);
  float gardenPattern = gardenMounds(x, z);
  float lumps = reefLumps(x, z);
  float exposure = seaExposure(direction);
  float highRidge = ridgeFor(exposure) * highRidgeAt(direction);
  float spurWave = spurWaveAt(direction);
  float edgeWave = edgeWaveAt(direction);
  float spursEnd = spursEndFor(spurWave, edgeWave);
  // (a basin's floor is sand; behind the crest the heads are rock and coral, and a pothole's floor sand)
  float mounds = smoothstep(-0.15, 0.45, gardenPattern) * (1.0 - 0.8 * bareBehindRidge(highRidge, along))
    * (1.0 - gardenBasins(x, z, along));
  float strip = behindCrestStrip(along, ridgeFor(exposure));
  mounds = max(mounds, strip * stripHeads(x, z)) * (1.0 - strip * stripPotholes(x, z));
  float groove = foreReefGroove(direction, distanceFromCentre, along, highRidge, exposure, spurWave, spursEnd);
  float betweenGrooves = 1.0 - smoothstep(0.08, 0.5, groove);
  float onCrest = mix(betweenGrooves, leePatches(leeMounds(x, z)), lee);
  // (on the terrace: patches and heads of coral, and the chutes' sand between)
  float onTerrace = max(smoothstep(-0.3, 0.3, gardenPattern), terraceHeads(lumps, gardenPattern))
    * (1.0 - smoothstep(0.05, 0.2, groove));
  float spurs = mix(betweenGrooves, onTerrace, smoothstep(spursEnd, spursEnd + 8.0, along));
  float high = mounds * smoothstep(GARDENS_BEGIN - 3.0, GARDENS_BEGIN + 13.0, along);
  high = mix(high, onCrest, smoothstep(CREST_BEGINS - 6.0, CREST_BEGINS + 6.0, along));
  high = mix(high, spurs, smoothstep(FORE_REEF_BEGINS - 5.0, FORE_REEF_BEGINS + 5.0, along));
  float dropBegins = dropOffBeginsFor(edgeWave);
  high *= 1.0 - smoothstep(dropBegins, dropBegins + 16.0, along);
  float inNotchLine = stormNotches(x, z, along, lumps);
  high = mix(high, fallenBlocks(lumps), inNotchLine * max(notchCutAt(along, spursEnd), notchRubbleAt(along, spursEnd)));
  float besidePass = besideThePass(x, z);
  float passSide = onThePassSide(x, z);
  high = mix(high, passRidge(along), reefPass(besidePass, along) * passSide);
  // (the pass's fan is sand, where it lies beyond the spurs)
  float onPassLobe = (1.0 - smoothstep(0.7, 1.0, acrossPassLobe(besidePass, along)))
    * smoothstep(spursEnd - 5.0, spursEnd + 5.0, along) * passSide;
  return high * (1.0 - onPassLobe) * (1.0 - inletFan(direction, distanceFromCentre, offshore));
}

// How much of the floor at (x, z) is bare reef rock, 0 to 1: the flat behind a high ridge. (The crest's own rock
// is told by its zone: terrain-colour.glsl.)
float reefPavement(float x, float z) {
  float distanceFromCentre = sqrt(x * x + z * z);
  float direction = atan(z, x);
  float along = alongReefZones(x, z, alongReef(distanceFromCentre - islandR(direction), direction));
  return bareBehindRidge(ridgeAt(direction) * highRidgeAt(direction), along)
    * (1.0 - reefPass(besideThePass(x, z), along) * onThePassSide(x, z));
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
  // (its edge runs in lobes: a broad wander and a finer one)
  float shelfEnds = LAGOON_SHELF_WIDTH + 7.0 * gardenMounds(x + 71.0, z - 43.0)
    + 5.0 * sin(x * 0.11 + 0.8) * sin(z * 0.097 + 2.4);
  float inBasin = smoothstep(shelfEnds, shelfEnds + 20.0, fromShore);
  float lagoonDepth = shelf + (LAGOON_DEPTH - LAGOON_SHELF_DEPTH) * inBasin
    - 0.5 * gardenMounds(x * 0.6 + 19.0, z * 0.6 - 7.0) * inBasin;
  // The way in from the inlet: along the inlet's line the floor is as deep as the basin all the way to the sandbar.
  // Its sides are broad, some fifteen degrees of the turn, and wander: cut as the inlet is cut through the
  // sandbar (passChannel), they were two straight ledges of bare rock across the lagoon's shelf, plain from the
  // air once the water was made clearer.
  float alongInlet = 0.5 + 0.5 * cos(direction - CHANNEL_DIRECTION - 0.05 * sin(distanceFromCentre * 0.05));
  float wayIn = smoothstep(CHANNEL_EDGE - 0.022 + 0.008 * gardenMounds(x * 1.7 + 40.0, z * 1.7 - 90.0),
    CHANNEL_EDGE + CHANNEL_EDGE_WIDTH, alongInlet);
  lagoonDepth = mix(lagoonDepth, max(lagoonDepth, LAGOON_DEPTH), wayIn);
  // The patch reefs, in the basin only: knolls with flat tops and steep sides, some eight metres across, in
  // clusters where an uneven pattern of mounds stands high (docs/REEF.md: a lagoon's patch reefs are
  // steep-sided and flat-topped, not domes).
  // (few enough that the ground, which is cut finer wherever it bends sharply, costs the lagoon's views little)
  float knolls = smoothstep(0.38, 0.62, reefLumps(x * 0.36 + 9.0, z * 0.36 - 4.0));
  float patchReefs = PATCH_REEF_HEIGHT * knolls * smoothstep(0.15, 0.35, gardenMounds(x - 211.0, z + 97.0)) * inBasin;
  // The deep hole: steep-sided, its rim a little out of round.
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
  float exposure = seaExposure(direction);
  float ridge = ridgeFor(exposure);
  float highRidge = ridge * highRidgeAt(direction);
  float lee = leeSide(direction);
  float ripples = 0.1 * reefBumps(x, z);
  float lumps = reefLumps(x, z);
  float blocks = fallenBlocks(lumps);
  float spurWave = spurWaveAt(direction);
  float edgeWave = edgeWaveAt(direction);
  float spursEnd = spursEndFor(spurWave, edgeWave);
  float dropBegins = dropOffBeginsFor(edgeWave);
  float shallows = -SHALLOWS_DEPTH - 0.012 * min(max(offshore, 0.0), GARDENS_BEGIN) + ripples;
  // The gardens; behind a high ridge their outer part is a bare flat instead, nearly level.
  float gardenPattern = gardenMounds(x, z);
  float gardens = -GARDENS_DEPTH + GARDENS_RELIEF * gardenPattern + 0.5 * ripples;
  float bareFlat = -BEHIND_RIDGE + 0.3 * gardenPattern + 0.5 * ripples;
  gardens = mix(gardens, bareFlat, bareBehindRidge(highRidge, along));
  // (a basin lies wherever its pattern has it, in the bare flat as in the gardens)
  float basinFloor = -GARDENS_DEPTH - BASIN_DEPTH + 0.5 * GARDENS_RELIEF * gardenPattern + 0.5 * ripples;
  gardens = mix(gardens, min(gardens, basinFloor), gardenBasins(x, z, along));
  // (behind the crest: the heads stand up from whatever the floor is there, and the potholes are sunk in it)
  float strip = behindCrestStrip(along, ridge);
  gardens = mix(gardens, max(gardens, -HEAD_TOPS + 0.3 * ripples), strip * stripHeads(x, z));
  gardens -= POTHOLE_DEPTH * strip * stripPotholes(x, z);
  // The crest rises from its back to its top, which lies towards the sea. On the sheltered side it is a sill,
  // with patches of reef left standing on it.
  float crestBack = mix(CREST_DEPTH, mix(BEHIND_ARCH, BEHIND_RIDGE, highRidge), ridge);
  float crestTop = mix(CREST_DEPTH, mix(ARCH_TOP, RIDGE_TOP, highRidge), ridge);
  float open = -mix(crestBack, crestTop, smoothstep(CREST_BEGINS + 1.0, CREST_BEGINS + 15.0, along))
    + 0.1 * sin(x * 0.21 + 0.5) * sin(z * 0.19) + 0.5 * ripples;
  float leePattern = leeMounds(x, z);
  float sill = -LEE_SILL_DEPTH + 0.3 * leePattern + 0.5 * ripples;
  float crest = mix(open, sill, lee * (1.0 - leePatches(leePattern)));
  // The fore reef: the spurs' tops, the step down at their ends, and the terrace with its coral heads.
  float downTheSpurs = clamp((along - FORE_REEF_BEGINS) / (SPURS_END - FORE_REEF_BEGINS), 0.0, 1.5);
  float spurTops = -SPURS_BEGIN_DEPTH - (SPURS_END_DEPTH - SPURS_BEGIN_DEPTH) * downTheSpurs;
  float downTheTerrace = clamp((along - spursEnd - 5.0) / (dropBegins - spursEnd - 5.0), 0.0, 1.0);
  float terrace = -TERRACE_DEPTH - (FORE_REEF_FOOT - TERRACE_DEPTH) * downTheTerrace + ripples
    + TERRACE_HEAD_HEIGHT * terraceHeads(lumps, gardenPattern);
  float swellSide = mix(spurTops, terrace, smoothstep(spursEnd - 1.0, spursEnd + 7.0, along));
  // On the sheltered side, the wall: its line wanders, rounded masses stand out of it, and it has three ledges
  // on the way down.
  float downTheWall = smoothstep(FORE_REEF_BEGINS + 2.0, FORE_REEF_BEGINS + 2.0 + LEE_WALL_WIDTH,
    along - 8.0 * wallMasses(lumps, leePattern) + 6.0 * leePattern);
  float leeWall = -LEE_SILL_DEPTH - 0.5
    - (SEA_FLOOR_DEPTH - LEE_SILL_DEPTH - 0.5) * (downTheWall + 0.05 * sin(downTheWall * 18.85));
  float foreReef = mix(swellSide, leeWall, lee);
  // The drop-off: rounded masses stand out of its face too, most halfway down.
  float downTheDrop = max(smoothstep(dropBegins, dropBegins + DROP_OFF_ENDS - DROP_OFF_BEGINS, along), lee);
  float dropOff = -FORE_REEF_FOOT - (SEA_FLOOR_DEPTH - FORE_REEF_FOOT) * downTheDrop
    + 10.0 * wallMasses(lumps, gardenPattern) * downTheDrop * (1.0 - downTheDrop);
  float reef = mix(shallows, gardens, smoothstep(GARDENS_BEGIN - 3.0, GARDENS_BEGIN + 13.0, along));
  reef = mix(reef, crest, smoothstep(CREST_BEGINS - 6.0, CREST_BEGINS + 6.0, along));
  reef = mix(reef, foreReef, smoothstep(FORE_REEF_BEGINS - 5.0, FORE_REEF_BEGINS + 5.0, along));
  reef = mix(reef, dropOff, smoothstep(dropBegins - 4.0, dropBegins + 4.0, along));
  // The grooves between the spurs, the surge channels they run on into and the chutes they run out as: deeper
  // down the reef, and on the flanks, where the spurs stand taller.
  float grooveDeep = mix(GROOVE_DEEP_AT_EDGE, GROOVE_DEEP_AT_END, smoothstep(FORE_REEF_BEGINS, SPURS_END, along))
    * (1.35 - 0.35 * exposure);
  reef -= grooveDeep * (1.0 - lee)
    * foreReefGroove(direction, distanceFromCentre, along, highRidge, exposure, spurWave, spursEnd);
  // The storm notches: the reef is cut down to a floor of fallen blocks, bigger in places, which slopes out to
  // the terrace; and below each the rubble that fell from it lies on the terrace.
  float inNotchLine = stormNotches(x, z, along, lumps);
  float notchFloor = -NOTCH_DEPTH_AT_HEAD
    - (TERRACE_DEPTH - NOTCH_DEPTH_AT_HEAD) * smoothstep(FORE_REEF_BEGINS - 15.0, SPURS_END + 5.0, along)
    + (1.0 + 1.2 * smoothstep(0.1, 0.5, gardenPattern)) * blocks;
  reef = mix(reef, min(reef, notchFloor), inNotchLine * notchCutAt(along, spursEnd));
  reef += 1.1 * blocks * inNotchLine * notchRubbleAt(along, spursEnd);
  // The inlet's fan of sand lies smooth over whatever the reef is there, sloping down as it runs out; the inlet
  // itself is cut into it by the sandbar and shoals away.
  float fanLevel = -mix(1.2, 2.2, smoothstep(10.0, 80.0, offshore)) + ripples;
  reef = mix(reef, fanLevel, inletFan(direction, distanceFromCentre, offshore));
  reef -= INLET_DEPTH * passChannel(direction, distanceFromCentre, 0.0) * (1.0 - smoothstep(6.0, 40.0, offshore));
  // The pass: through the reef, a flat floor of its own wherever the reef stands above it, with its ridge of
  // coral across; outside, the ground rises to its fan of sand wherever the reef is lower.
  float besidePass = besideThePass(x, z);
  float passSide = onThePassSide(x, z);
  float passFloor = -mix(PASS_DEPTH_INSIDE, PASS_DEPTH_AT_CREST, smoothstep(70.0, 135.0, along))
    + PASS_RIDGE_HEIGHT * passRidge(along) * (0.6 + 0.4 * blocks);
  reef = mix(reef, min(reef, passFloor), reefPass(besidePass, along) * passSide);
  float passLobe = passLobeHeight(acrossPassLobe(besidePass, along), along);
  reef = mix(reef, max(reef, passLobe), smoothstep(FORE_REEF_BEGINS + 1.0, FORE_REEF_BEGINS + 15.0, along) * passSide);
  // More than 5 m inland the reef falls away steeply, so that it stays out of the lagoon.
  float inlandFall = 2.0 * max(-5.0 - offshore, 0.0);
  float reefFlat = reef - inlandFall;

  // The sandbank: a low dome in the lagoon.
  float dx = x - sandbankX();
  float dz = z - sandbankZ();
  float sandbank = SANDBANK_HEIGHT * (1.0 - (dx * dx + dz * dz) / SANDBANK_RADIUS_SQUARED);

  return max(max(max(land, reefFlat), sandbank), -SEA_FLOOR_DEPTH);
}
