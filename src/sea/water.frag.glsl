// The colour of the sea: ripples, the sky, clouds, sun and moon mirrored in them, the colour of the water itself by
// how much of it the eye looks through, the light through a wave's thin top, foam and lace, white horses in a high
// wind, the small waves on the lagoon's beaches, foam round rocks in the surf, the clouds' shadows, haze, and the
// surface seen from under water.
//
// One shader colours four sheets of water (water-materials.ts, water.ts, breaker.ts):
//   the wave mesh             uIsFlatSheet 0, uIsShoreBand 0   the ring round the ocean beach, moved by water.vert.glsl
//   the breaker's own mesh    uIsFlatSheet 0, uIsShoreBand 0   the front of a breaking wave, moved by breaker.vert.glsl
//   the far sea               uIsFlatSheet 1, uIsShoreBand 0   flat out to the horizon, with a hole cut for the wave mesh; it is
//                                               also the calm water of the lagoon
//   the lagoon's shore band   uIsFlatSheet 1, uIsShoreBand 1   lifted into small waves in a high wind by lagoon-shore-band.vert.glsl
// Each is compiled with only what it can show: WATER_STANDS_STEEP for the two meshes whose water can stand steep,
// and WATER_HAS_TORN_EDGE for the breaker's (the materials' defines). All four read the ground's height and the
// shore from pictures (WATER_FLOOR_FROM_PICTURE, WATER_SHORE_FROM_PICTURE), where the formulas were worked out
// for every dot: a debug switch goes back to each formula, to compare. Other debug switches draw the wave mesh in
// one colour (WATER_BARE) or end the colouring part-way (WATER_STOPS_AFTER_...), to read from the frame rate what
// each part costs (docs/DEVICE_NOTES.md).
//
// Needs
//   the uniforms and varyings below, and three.js's cameraPosition (given to every ShaderMaterial);
//   these defines, which water-materials.ts writes from the configs:
//     WATER_SWELL, LONG_SWELL_SLOPE   the swell's trains (sea-config.ts)
//     HOME_ISLET, REEF_MAP_SPAN       the middle, and the side, of the square round home that the reef's map covers
//     OBSTACLE_FOAM_REACH, OBSTACLE_FOAM_REACH_BY_RADIUS   how far beyond its edge a thing in the surf has foam
//                                     (water-config.ts)
//     FLOOR_HEIGHT_SPAN               the side of the square that the picture of the ground's height covers
//     SHORE_ROUND_FROM                the radius the shore's picture measures the shoreline from (sea-config.ts)
//     CLOUD_SHADE_SPAN_M              the side of the square that the map of the clouds' shadows covers
//     USUAL_WIND                      the island's usual breeze (sky-config.ts): the ripples are as strong as they
//                                     were tuned at this wind
//     BAND_UP_BEACH                   how far up the beach the lagoon's shore band reaches (water-config.ts)
//     BAND_SHOWN_WITHIN               the band is drawn within this distance of the eye (water-config.ts)
//     LAGOON_WIND_DIRECTION           which lagwave.glsl uses;
//   from the chunks it includes: hash, noise and fbm (noise.glsl); islandR, reefShare, landW, hgt, sandbankX,
//     sandbankZ, REEF_BEGINS and SEA_FLOOR_DEPTH (island-shape/island.glsl and shore.glsl); WIND_DIR, LW_T,
//     LAGOON_WAVES_FROM_WIND, lagExposure, lagWave and lagFoam (lagwave.glsl); skyGradient and sunsBroadGlow
//     (sky/sky-gradient.glsl).

// Seconds on the clock.
uniform float uTime;
// 0 by day .. 1 at night.
uniform float uNight;
// Daylight: 0 with the sun at the horizon .. 1 in full day.
uniform float uDaylight;
// The height of the still sea surface.
uniform float uSeaLevel;
// 1 when the camera is under water, and the water's own colour there.
uniform float uUnderWater;
uniform vec3 uUnderWaterColour;
// A debug switch: 0 normal, 1 waves off, 2 no falling lip (the vertex shader's), 3 plain water colour.
uniform float uDebugMode;
// The unit vector towards the sun, and the sun's colour.
uniform vec3 uSunDirection;
uniform vec3 uSunColour;
// The unit vector towards the moon.
uniform vec3 uMoonDirection;
// The sky's colour overhead and at the horizon.
uniform vec3 uSkyOverhead;
uniform vec3 uSkyHorizon;
// Which sheet this is (see above).
uniform float uIsFlatSheet;
uniform float uIsShoreBand;
// 1 while the lagoon's shore band is shown (in a high wind, with the eye above water).
uniform float uShoreBandShown;
// The wind's strength: 0 none, 0.33 low, 0.66 medium, 1 high.
uniform float uWind;
// The 16 biggest things standing in the surf: x, z, radius. An empty place has a negative radius. They lie in four
// groups of four neighbours, and round each group a circle (x, z, radius) that holds all its foam.
uniform vec3 uSurfObstacles[16];
uniform vec3 uSurfObstacleGroups[4];
// The detail texture (detail-texture.ts): red and green the slope of a field of small waves, blue their height, alpha
// a net of lines.
uniform sampler2D uDetail;
// The map of how high the coral heads stand (reef-map.ts).
uniform sampler2D uReefMap;
uniform sampler2D uSeaFloor;      // the sea floor as the waves know it: (delay of swell 0, of swell 1, depth, unused)
uniform sampler2D uBreakTimes;      // seconds since the main swell crossed each of four depths (sea-floor-pictures.ts)
// The shore in each direction from the centre, as a picture one dot high (shore-round-picture.ts): read in place
// of the shore's formula while WATER_SHORE_FROM_PICTURE is defined, which it is but for a debug switch.
uniform sampler2D uShoreRound;
// The ground's height as a picture (floor-height-picture.ts): read in place of the island's formula while
// WATER_FLOOR_FROM_PICTURE is defined, which it is wherever the picture could be drawn.
uniform sampler2D uFloorHeight;
// The two sky pictures being blended, and how far from A to B (clouds.ts); the colours of cloud in the sun and in
// shade.
uniform sampler2D uSkyPictureFrom;
uniform sampler2D uSkyPictureTo;
uniform float uSkyPictureBlend;
uniform vec3 uCloudInSun;
uniform vec3 uCloudInShade;
// The map of the clouds' shadows, and how much of the sun reaches the camera through the clouds.
uniform sampler2D uCloudShadeMap;
// What is under the sea, as a picture drawn before the frame (under-water-picture.ts): each thing as it is, with
// its depth under the sea in alpha (water-veil.glsl). uPictureDrawn is 1 while it is drawn; uDotOfPicture is one
// dot of the screen as a share of it; uPictureScale is how many shares of it a metre spans a metre from the eye.
uniform sampler2D uUnderWaterPicture;
uniform float uPictureDrawn;
uniform vec2 uDotOfPicture;
uniform vec2 uPictureScale;
// How much of the ripples' bending, and of the raising, is drawn: 1 but for a debug switch (shared-uniforms.ts).
uniform float uBendingShare;
uniform float uRaisingShare;
// The height above the sea of the eye that the raising is worked out for (under-water-picture.ts).
uniform float uEyeForRaising;
uniform float uSunThroughCloud;

// The point on the water and the normal of the sheet there (the waves', without the ripples).
varying vec3 vWaterPosition;
varying vec3 vWaterNormal;
// From the wave model (water.vert.glsl): x = how much foam it puts here (0..1), y = metres off the ocean beach,
// z = how high the wave lifts the water. The flat sheets have (0, 200, 0).
varying vec3 vWaveState;
// How much water lies behind the surface, level with it, in metres: the sea has no far side (100), but the front of
// a breaking wave does, and its lip is a sheet (breaker.vert.glsl).
varying float vWaterBehind;
// How near the torn top of a breaking wave's white mass this point is, 0 to 1 (torn-edge.glsl).
varying float vTornEdge;
// The white mass that a landed lip throws up (breaker.vert.glsl): how far this point is part of it, 0 to 1, and
// how far along the mesh's cross-section it lies, in metres.
varying vec2 vWhiteMass;

#include "../shaders/shared/turns"
#include "../shaders/shared/noise"

#include "../world/island-shape/island"

#include "../shaders/shared/lagwave"
#include "wave-timing/timing"
#include "../sky/sky-gradient"
#include "../shaders/shared/through-water"
#include "../shaders/shared/water-veil"
#include "../shaders/shared/depth-in-sea-picture"
#include "../shaders/shared/raised-through-surface"
#include "torn-edge"
#include "foam-in-this-light"

// ---- Numbers to retune ----

// White horses begin at this wind.
const float WHITECAPS_FROM_WIND = 0.74;

// The hole cut in the far sea for the wave mesh: from this far up the ocean beach to this far short of the mesh's
// outer edge, a little inside the mesh's own edges (waterConfig.waveMesh.rows: change them together).
const float FAR_SEA_HOLE_UP_BEACH = 8.6;
const float FAR_SEA_HOLE_SHORT_OF_EDGE = 2.0;
// The lagoon's shore band reaches this far out into the lagoon, a little short of its mesh's last row
// (waterConfig.lagoonShoreBand.rows: change them together).
const float BAND_OUT_INTO_LAGOON = 13.0;
// (The sandbank in the lagoon is a round island SANDBANK_RADIUS across from its middle: island.glsl.)

// How much thinner a white horse's foam is in sheltered water than on the open sea.
const float SHELTERED_FOAM_THINNER = 0.45;
// The two families of white horses' crests: how far apart they are, and how fast they run (metres a second).
const float CRESTS_A_SPACING = 14.0;
const float CRESTS_A_SPEED = 4.0;
const float CRESTS_B_SPACING = 10.5;
const float CRESTS_B_SPEED = 3.5;

// (The colour of the water itself, and how it hides what is under it, are water-veil.glsl's.)
// Added where the ripples face the sun.
const vec3 SUNLIT_RIPPLE_TINT = vec3(0.0, 0.10, 0.08);
// Water full of bubbles where waves have just broken.
const vec3 AERATED_WATER = vec3(0.52, 0.87, 0.85);
// The water under a white horse's foam.
const vec3 UNDER_WHITECAP = vec3(0.34, 0.66, 0.74);
// Foam (its colour in the light of the hour is foam-in-this-light.glsl's): thin foam; foam turned away from the sun.
const vec3 THIN_FOAM = vec3(0.66, 0.90, 0.92);
// How much of what is under it thin foam hides, against thick foam's all.
const float THIN_FOAM_HIDES = 0.25;
const float THIN_FOAM_HIDES_ON_SAND = 0.12;
const vec3 SHADED_FOAM = vec3(0.70, 0.80, 0.88);
// On the sheet of water that runs up the sand - water shallower than the first of these depths, and not at all
// by the second - foam is lace until it is LACE_UNTIL thick (0 to 1), and by then its threads have spread over
// LACE_OPENS_BY of the lace pattern's range (laceThresholdOnSand); thicker, it closes up into a sheet.
const vec2 SHEET_ON_SAND_UNDER = vec2(0.2, 0.6);
// The scallops of the foam's edge towards the beach: how many of the pattern's cells to a metre, and how far off
// the beach the foam ends between two tongues (metres).
const float SCALLOPS_A_METRE = 0.6;
const float SCALLOPS_REACH = 1.3;
const float LACE_UNTIL = 0.72;
const float LACE_OPENS_BY = 0.5;
// How far the pattern of a sheet of foam lying flat tilts it, for its shading.
const float FLAT_FOAM_LUMPS = 0.3;
// The sun's sparkle on ripples too fine to draw: how rough those make the water in a calm and how much rougher
// in a high wind (the mean square of their slope: some two thirds of what is measured at sea, Cox and Munk's
// figures, since the ripples that are drawn carry the rest); how many dots of the picture a sparkle's cell is
// across; and how bright one is.
const float SPARKLE_IN_A_CALM = 0.004;
const float SPARKLE_BY_WIND = 0.02;
const float SPARKLE_DOTS_ACROSS = 3.5;
// Sparkles are drawn within the first of these distances of the eye (metres), and none beyond the second.
const vec2 SPARKLES_SEEN_WITHIN = vec2(90.0, 200.0);
const float SPARKLE_BRIGHT = 2.5;
// The sun's whole image on glassy water: the power its mirrored direction's closeness to the sun is raised to
// (12000 is an image some two sun's widths across).
const float SUNS_IMAGE_SHARP = 12000.0;
// It shows only below this wind: from it on the sun is all glitter.
const float GLASSY_BELOW_WIND = 0.4;
// The moon's light mirrored in the water.
const vec3 MOONLIGHT = vec3(0.55, 0.62, 0.80);
// How bright its faint sheen is, and its glitter.
const float MOON_SHEEN = 0.05;
const float MOON_GLITTER = 0.7;
// From under water (seenFromUnderWater).
// How much slower light goes in water than in air, which is what bends it at the surface; and the share of light
// that water mirrors when met square on (the rest is Fresnel's law, as Schlick wrote it).
const float WATER_INDEX = 1.33;
const float MIRRORED_SQUARE_ON = 0.02;
// How much brighter the sky is drawn through the window than from the beach: an eye in the dim of the water is
// opened wider.
const float WINDOW_BRIGHTER = 1.2;
// The sun through the window is no disc: the ripples smear it into a dazzle this wide (radians), this bright.
// (Narrower, each ripple that swept the eye's line across the sun drew it as a thin bright ring with a dark
// middle: wide enough, the ring closes into a white piece.)
const float SUNS_DAZZLE_ACROSS = 0.09;
const float SUNS_DAZZLE = 3.0;
// How steep the ripples are from below, in a calm and in the usual breeze, against how the top side draws them (a
// ripple bends the light that comes down through it far more than it tilts the light it mirrors); and how much
// brighter and darker they make the window, gathering the light and spreading it.
const vec2 RIPPLES_FROM_BELOW = vec2(1.0, 1.9);
const float WINDOW_LENSED = 0.7;
// Outside the window the surface is a mirror, but never a clean one: its finest facets tip far enough, here and
// there, to show the low sky, as crisp glints. They are thick just outside the window's edge and die away
// outwards (over so much of seenFromUnderWater's getsOut), with a faint sheen under them at the edge itself.
// A facet glints where the fine pattern is above the first of GLINTS_FROM far from the window (or far from the
// sun, for the sun's own glints in the window), the second at it: the pattern is mostly near a half. GLINT_EDGE is
// how soft a glint's edge is, in the same measure.
const float SHEEN_AT_WINDOWS_EDGE = 0.1;
const float GLINTS_DIE_OVER = 0.35;
const vec2 GLINTS_FROM = vec2(0.66, 0.52);
const float GLINT_EDGE = 0.035;
// The sun's glints in the window: how far from the sun they reach (radians, in air), and how bright they are.
const float SUN_GLINTS_OVER = 0.55;
const float SUN_GLINTS = 1.0;
// (they begin at these levels of the fine pattern, far from the sun and at it, as the mirror's do at GLINTS_FROM)
const vec2 SUN_GLINTS_FROM = vec2(0.68, 0.59);
// What the mirror shows: the floor under the water, pale sand or a dark coral head, as far off as this at most.
const vec3 FLOOR_IN_THE_MIRROR = vec3(0.80, 0.80, 0.76);
const vec3 HEAD_IN_THE_MIRROR = vec3(0.34, 0.40, 0.33);
const float MIRROR_REACHES = 45.0;
// Foam from below: a ceiling of bubbles with the daylight in it, pale where it is thin and a little greyer where
// it is thick enough to keep some of the light out.
const vec3 THIN_FOAM_FROM_BELOW = vec3(0.82, 0.95, 0.96);
const vec3 THICK_FOAM_FROM_BELOW = vec3(0.66, 0.82, 0.86);
// Debug switch 3.
const vec3 PLAIN_WATER = vec3(0.03, 0.25, 0.50);

// How fast each of the three readings of the ripples runs, in rounds of the detail texture a second: 1.1, 1.0 and
// 0.65 metres a second, the broadest first, mostly down the wind. That is about the speed of real ripples of
// their lengths (one a metre long runs at 1.25 m/s; the broad readings stand for the wind's gusts as much as for
// waves, and a lagoon has no long waves). At a quarter of it the surface hardly changed in two seconds, and lay
// on the lagoon like a pane of glass. (To the nearest thousandth of a round, so that after RIPPLES_REPEAT seconds
// every reading has run a whole number of rounds.)
const vec2 LARGE_RIPPLES_RUN = vec2(0.025, 0.016);
const vec2 MEDIUM_RIPPLES_RUN = vec2(-0.046, 0.054);
const vec2 SMALL_RIPPLES_RUN = vec2(0.131, 0.072);
const float RIPPLES_REPEAT = 1000.0;

// The lines that run up a wave's face: how many times the detail texture goes round the atoll for them (one line
// to some 20 cm of the wave's length), and how far they tilt the face.
const float FACE_LINES_ROUND = 816.0 / FULL_TURN;
const float FACE_LINES_TILT = 1.6;
const float FACE_LINES_SHADE = 0.55;
// How much brighter the water is on a slope turned full to the sun than on one edge on to it.
const float SUN_ON_SLOPES = 0.6;

// Foam on steep water: how many times the detail texture goes round the atoll for it (about three metres of the
// shore to one round of the texture); and for white water piled up, how far its lumps tilt it and how much
// darker the hollows between them are.
const float STEEP_FOAM_ROUND = 628.0 / FULL_TURN;
const float STEEP_FOAM_FALLS = 1.4;
const float PILED_LUMPS = 2.6;
const float PILED_HOLLOWS = 0.22;

// The mirrored sky begins to hide what is under a ripple's side where the eye looks this far along that side, and
// hides all it can from the second number on (1 less the cosine of the angle from square on to it: 0.7 is 73
// degrees, 0.96 is 88). (Nearer than that it hid the aqua of the shallows, which real water keeps for a long way
// out.)
const vec2 MIRROR_HIDES_FROM = vec2(0.7, 0.96);
// (That is so where what lies under the surface is bright, in the sun: pale sand, or shallow water's own aqua. It
// fades out between these depths, and with the daylight and under a cloud: over deep water, and at dusk, the
// mirror is as strong as the angle makes it.)
const vec2 MIRROR_DROWNED_OVER = vec2(1.0, 6.0);
// How much more ruffled water mirrors than smooth, looked at from a middling angle: a gust is a patch of the
// sky's deep blue on clear water. (At 0.3 the patches could hardly be told from the water between them.)
const float RUFFLED_MIRRORS = 0.5;
// With no wind the broad ripples keep this share of the slope they have in the usual breeze.
const float NEVER_QUITE_STILL = 0.25;
// How much of the middling ripples (the second reading) wholly sheltered water keeps.
const float MIDDLING_RIPPLES_IN_SHELTER = 0.8;
// The ripples' steepness, up to the usual breeze, goes as the wind's strength to this power.
const float RUFFLES_BY_WIND = 0.6;
const float SMALL_RIPPLES_STEEPEST = 1.5;
// How much higher up the sky the smoothest water mirrors it from than a true mirror would (as a share of the way
// to straight up, before the square root that spreads the sky's colours): in a calm, and how much more from a
// light air on.
const vec2 MIRRORS_FROM_HIGHER = vec2(0.1, 0.3);

// The white mass a landed lip throws up: how many times the detail texture goes round the atoll for its lumps (a
// round to some ten metres, so a lump is a metre or so across); how far the lumps tilt it, and how much the small
// lumps on them count beside them; its colour where it is turned from the sun; and how much darker the hollows
// between the lumps are.
const float MASS_LUMPS_ROUND = 207.0 / FULL_TURN;
const float MASS_LUMPS_TILT = 3.2;
const float MASS_SMALL_LUMPS = 0.7;
const vec3 MASS_IN_SHADE = vec3(0.81, 0.88, 0.95);
const float MASS_HOLLOWS = 0.17;

// Light bends as it enters water: the sine of its angle to the surface's normal shrinks by this (1 / 1.33).
const float INTO_WATER = 0.75;
// How far water's colour goes by its depth averaged round about, and not its own (below).
const float DEPTH_SPREADS = 0.8;
// The surface reads what is behind it from the picture of what is under the sea (under-water-picture.ts), which
// holds each thing where it seems to be through a flat sea (raised-through-surface.glsl). The ripples bend the
// eye's line a little more: a ray that goes into water through a slope is turned by a quarter of the slope, so
// it lands that share of the thing's depth to one side; this is that share, and the depth it is taken over at
// most (m). (At 0.3 a stone's width changed by a third from one moment to the next: if what is under the water
// still wobbles too much on the phone, this is the number.)
// It is the broad and middling ripples that bend it, and not the fine ones: bent by those too, everything under
// shallow water shivered, which was a third of all that moved on the screen there and tiring to look into; the
// slow sway is the others'. (The surface's own streaks of sky and its glints still go by every ripple.)
const float BENDS = 0.14;
const float BENDS_NO_DEEPER_THAN = 5.0;
// (Wherever the surface is drawn, it is drawn whole, over the picture: only the picture holds what is seen
// through water. The frame's own drawing, straight behind the surface, was let show through the shallowest
// water at first, being sharper: but it is drawn by straight lines, and looking along a shore a straight line
// through even a film of water runs on over the falling floor to something else. A dark line lay along the
// beach's edge, with whatever stood off the shore showing in it a second time, where it truly stands.)
// The picture is half as fine as the screen, and along the outline of a thing that stands out of the sea its
// dots are part that thing and part the sea floor beyond: their depth reads as next to nothing, and their colour
// is the thing's, smeared a dot or two over the water. So where the picture says the thing behind lies in less
// than the first of these depths of water, and the water at this spot is deeper than the second (m), the
// picture is looked at this many dots of the screen to each side, and the deepest of what is found is taken.
const vec2 OUTLINE_SUSPECTED = vec2(0.12, 0.25);
const float OUTLINE_LOOKED_PAST = 4.0;
// The picture is drawn for a flat sea at its still level. Where a wave has run up a beach the surface lies on
// sand that stands above that level, and where it has drawn back, on sand below it: that sand is in the picture
// lower or higher than it is, by its height from the still sea (raised-through-surface.glsl), and the surface
// reads it from there. Only where the water is a sheet on the sand, thinner than the first of these (m), and
// not at all where it is deeper than the second: read so under a swell, the whole floor would heave with it.
const vec2 A_SHEET_ON_THE_SAND = vec2(0.15, 0.6);
// Where the swell breaks the water is churned up and never quite clear: it is this much cloudier than clear
// water (water-veil.glsl's hiddenByWater).
const float CHURNED_CLOUDIER = 0.8;
// How much of a thing under more than a little water goes to grey (water-veil.glsl's seenDownThroughWater): on
// the ocean's side, and in the lagoon's glassy water.
const vec2 GREYS_UNDER_WATER = vec2(0.5, 0.28);
// The floor is never far under a ray that runs along through shallow water, and lights it from below: such a ray
// counts as going down at least this steeply, or a wave over the reef would be as dark as the open sea.
const float LEAST_WAY_DOWN = 0.33;
// The light that comes through a wave from behind it: through a sheet of water, and through a metre and a half.
const vec3 LIGHT_THROUGH_THIN = vec3(0.40, 0.88, 0.86);
const vec3 LIGHT_THROUGH_THICK = vec3(0.06, 0.52, 0.64);
// How bright that light is with the sun behind the eye, and looking straight towards the sun.
const float LIGHT_THROUGH_DIM = 0.75;
const float LIGHT_THROUGH_GLOW = 1.15;
// Light comes through a wave's water freely up to the first of these thicknesses (metres), and not at all through
// the second: through more than that the wave is a wall, as deep in colour as the sea behind it.
const vec2 LIGHT_COMES_THROUGH = vec2(0.9, 3.4);

// ---- Functions ----

// One swell train's tilt of the surface across its lines, for the shading of the open sea (see "Swell lines" in
// main). WATER_SWELL, a define written by water-materials.ts from the sea's config, adds up one SWELL_LINE(...) for
// each train, which hands this its numbers and main's swellTime, directionFromCentre and swellWobble.
float swellLine(float slope, float setPace, float variety, float frequency, float crests, float phase,
                float swellTime, float directionFromCentre, float swellWobble) {
  // (each train swells and fades, so the lines are uneven along their length)
  float setHeight = 0.70 + 0.30 * sin(uTime * setPace + directionFromCentre * 2.0 + variety);
  return slope * setHeight * cos(frequency * swellTime + crests * directionFromCentre + phase + swellWobble);
}

#define SWELL_LINE(SLOPE, SET_PACE, VARIETY, FREQUENCY, CRESTS, PHASE) swellLine(SLOPE, SET_PACE, VARIETY, FREQUENCY, CRESTS, PHASE, swellTime, directionFromCentre, swellWobble)

// One of the swells the wave model draws (waves.glsl), as the far sea shades it out past the wave mesh: its tilt of
// the surface here, + on a line's face and - on its back. It goes by the wave model's clock, so its lines run on
// into the mesh's waves: `arrival` is when the swell reaches this spot, and a crest is where `turns` is a whole
// number and a half. MODELLED_SWELL, a define written by water-materials.ts, adds up one MODELLED_SWELL_LINE(...)
// for each swell, as a tilt against the way it travels.
float modelledSwellLine(float arrival, float slope, float period, float variety, float swellWobble) {
  float turns = (uTime - arrival) / period + 0.5;
  return slope * setShare(turns, variety) * cos(6.2832 * (turns - 0.25) + swellWobble);
}

#define MODELLED_SWELL_LINE(TOWARDS, DELAY, SLOPE, PERIOD, VARIETY) (-TOWARDS * modelledSwellLine(dot(xz, TOWARDS) / OPEN_SEA_SPEED + seaFloorHere.DELAY, SLOPE, PERIOD, VARIETY, swellWobble))

// White horses: one family of wind-driven crests, `spacing` metres apart, travelling at `speed` m/s along
// `direction`.
//   xz          the place; `bend` = metres by which the crests are bent here, so that they are not ruled lines
//   ragged      small-scale unevenness, so that a patch of foam has a ragged outline
//   bandDepth   how deep the white band at a crest is
//   seed        sets where this family's crests break, apart from the other family's
//   rarity      how rarely a crest breaks
//   look        the level direction in which the eye looks at this place
//   rise        how many metres of water a breaking crest hides behind itself, seen from the eye (its height x
//               distance / the eye's height): it is this, not the foam lying flat, that shows as white dashes far out
//               on a real sea
//   crestsPerPixel   how far the place, counted in crests, changes from one pixel to the next
//   lyingFoamShows   how much of the foam lying on the water can be made out at this distance (0..1)
// Returns x = foam lying on the water behind a crest, y = the white of a breaking crest standing up.
// A crest only breaks along stretches of itself, and each stretch only for a couple of seconds.
vec2 whiteHorses(vec2 xz, float bend, float ragged, float bandDepth, vec2 direction, float spacing, float speed,
                 float time, float seed, float rarity, vec2 look, float rise, float crestsPerPixel,
                 float lyingFoamShows) {
  vec2 alongCrests = vec2(-direction.y, direction.x);
  // where this is, counted in crests
  float crests = (dot(xz, direction) + bend - speed * time) / spacing;
  float lookAlongCrests = dot(look, alongCrests);
  // (The place along a crest, scaled for the noise that says where it breaks. Where the white band is deeper
  // against the crests' size - sheltered water - the stretches that break are as much shorter: long ones were
  // ribbons of white lying on the water.)
  float alongCrest = dot(xz, alongCrests) * 0.075 * bandDepth;
  vec2 foam = vec2(0.0);

  // The foam lying on the water behind the crest ahead.
  if (lyingFoamShows > 0.01) {
    float crestAhead = ceil(crests);
    // 0 at the crest, growing behind it
    float behindCrest = crestAhead - crests;
    float metresBehind = behindCrest * spacing;
    // seconds since the crest passed here
    float age = metresBehind / speed;
    // (the crests are numbered 0 to 1023 over and over, which keeps the noise's input small)
    float crestNumber = mod(crestAhead, 1024.0);
    // was this stretch breaking when the crest stood here? Then it left foam, which thins out as it ages
    float breakingThen = noise(vec2(crestNumber * 7.31 + seed + (time - age) * 0.6, alongCrest + crestNumber * 3.7));
    float leftFoam = smoothstep(rarity, rarity + 0.1, breakingThen + ragged);
    // (a white band under a metre deep at the crest; behind it foam already full of holes, thinning to a few threads)
    float whiteBandEnds = (0.7 + 5.0 * max(ragged + 0.08, 0.0)) * bandDepth;
    float whiteBand = 1.0 - smoothstep(0.2 * bandDepth, whiteBandEnds, metresBehind);
    float threads = 0.36 + 0.2 * exp(-age / 2.2);
    float goneBeforeNextCrest = 1.0 - smoothstep(0.72, 0.97, behindCrest);
    float behindTheCrestLine = smoothstep(0.0, max(crestsPerPixel * 1.2, 1e-4), behindCrest);
    foam.x = leftFoam * max(whiteBand, threads) * goneBeforeNextCrest * behindTheCrestLine * lyingFoamShows;
  }

  // The white of a breaking crest standing up between this place and the eye.
  float lookAlongTravel = dot(look, direction);
  // (1 where the eye sees the crests broadside on, 0 where it sees them edge on)
  float broadside = abs(lookAlongTravel);
  if (broadside > 0.06) {
    // Far off, crests this close together could not be told apart, so only every 2nd, 4th, 8th... is drawn
    // (`stride`), the ones in between fading out as they recede. A crest between this place and the eye hides it if
    // it is near enough (`toCrestBetween`, in crests) for its height; it is white where the stretch of it in the line
    // of sight is breaking. A crest thinner than a pixel is drawn a pixel thick and fainter, so that it does not
    // flicker. (Each crest drawn far off stands for several, so more of its length is white.)
    float detailLevel = max(log2(crestsPerPixel / 0.16), 0.0);
    float stride = exp2(floor(detailLevel));
    float strides = crests / stride;
    // 1 where the crests run towards the eye, which then sees their fronts
    float seesFronts = step(lookAlongTravel, 0.0);
    float drawnCrestAhead = ceil(strides);
    float behindDrawnCrest = drawnCrestAhead - strides;
    float toCrestBetween = mix(1.0 - behindDrawnCrest, behindDrawnCrest, seesFronts);
    // (a pixel, and the tallest a crest can stand, both measured in crests)
    float pixel = crestsPerPixel / stride * 1.25;
    float tallest = rise * broadside / (spacing * stride);
    if (toCrestBetween < min(max(tallest, pixel), 0.5)) {
      float crestBetween = drawnCrestAhead - 1.0 + seesFronts;
      float crestNumber = mod(crestBetween * stride, 1024.0);
      // where along the crest between the line of sight crosses it
      float metresToCrestBetween = toCrestBetween * spacing * stride;
      float alongCrestSeen = alongCrest - metresToCrestBetween / broadside * lookAlongCrests * 0.075;
      float threshold = rarity - 0.05 * min(detailLevel, 3.0);
      float breakingNow = noise(vec2(crestNumber * 7.31 + seed + time * 0.6, alongCrestSeen + crestNumber * 3.7));
      float breaking = smoothstep(threshold, threshold + 0.1, breakingNow);
      // (only where it breaks in earnest; a ragged top)
      float raggedTop = 0.65 + 0.35 * sin(alongCrestSeen * 31.0 + crestNumber)
        * sin(alongCrestSeen * 13.7 + 1.3 * crestNumber);
      breaking = smoothstep(0.1, 0.6, breaking) * raggedTop;
      // (less white shows from behind a crest)
      float whiteBand = tallest * mix(0.75, 1.0, seesFronts) * breaking;
      float bandDrawn = min(max(whiteBand, pixel), 0.5);
      float inWhiteBand = 1.0 - smoothstep(0.35 * bandDrawn, bandDrawn, toCrestBetween);
      float fainterIfThin = pow(min(1.0, whiteBand / pixel), 0.6);
      float fadingOut = mix(1.0, 1.0 - fract(detailLevel), mod(crestBetween, 2.0));
      float notEdgeOn = smoothstep(0.06, 0.22, broadside);
      float pastCrestLine = smoothstep(0.0, min(pixel * 0.8, bandDrawn * 0.3), toCrestBetween);
      foam.y = inWhiteBand * fainterIfThin * fadingOut * notEdgeOn * pastCrestLine;
    }
  }
  return foam;
}

// Where on a lace pattern (0..1) foam of this density (0..1) starts to show: above the top of the pattern (nowhere)
// with no foam, below its bottom (everywhere) with thick foam.
float laceThreshold(float density) {
  return mix(1.0, -0.12, density * density * (3.0 - 2.0 * density));
}

// The same for foam on the sheet of water that runs up the sand: there it is lace - a net of white threads with
// the sand showing in every mesh of it - until it is nearly as thick as it can be, and only then a sheet. (By
// laceThreshold, anything more than thin foam on the sand was a white sheet with a few pools in it.)
float laceThresholdOnSand(float density) {
  return 1.0 - LACE_OPENS_BY * smoothstep(0.0, LACE_UNTIL, density)
    - (1.12 - LACE_OPENS_BY) * smoothstep(LACE_UNTIL, 1.0, density);
}

// Foam of this density drawn over a lace pattern, where the pattern is above `threshold` (laceThreshold of the
// density): the more foam, the more of the pattern it covers, from lace where it is thin to a white sheet with
// holes where it is thick. Its edges are softer further from the eye.
float foamAsLace(float density, float threshold, float lacePattern, float cameraDistance) {
  float laceFullFrom = threshold + 0.14 + 0.5 * smoothstep(15.0, 90.0, cameraDistance);
  return smoothstep(threshold, laceFullFrom, lacePattern) * (0.62 + 0.38 * density);
}

// Foam round the things standing in the surf: 1 at a rock's edge, fading out over half a metre and more (more round
// a bigger rock). The things are spread right round the atoll, so they come in groups of four neighbours, each
// with a circle that holds all its foam (surf-obstacles.ts): only inside a group's circle are its four asked
// after, and of those only the ones whose foam reaches here, where every dot of water near the beach used to work
// out its distance from all sixteen.
float foamRoundObstacles(vec2 xz) {
  float foam = 0.0;
  for (int group = 0; group < 4; group++) {
    vec3 circle = uSurfObstacleGroups[group];
    vec2 fromCircle = xz - circle.xy;
    if (dot(fromCircle, fromCircle) < circle.z * circle.z) {
      for (int i = 0; i < 4; i++) {
        vec3 obstacle = uSurfObstacles[group * 4 + i];
        vec2 fromObstacle = xz - obstacle.xy;
        float reach = obstacle.z + OBSTACLE_FOAM_REACH + OBSTACLE_FOAM_REACH_BY_RADIUS * obstacle.z;
        if (obstacle.z > 0.0 && dot(fromObstacle, fromObstacle) < reach * reach) {
          float fromEdge = length(fromObstacle) - obstacle.z;
          foam = max(foam, 1.0 - smoothstep(0.02, OBSTACLE_FOAM_REACH + OBSTACLE_FOAM_REACH_BY_RADIUS * obstacle.z,
            fromEdge));
        }
      }
    }
  }
  return foam;
}

// A distance off the beach as the distance it would be due south, and back (alongReef and offshoreOfReef in
// island-shape/shore.glsl), for a direction in which the reef has `share` of its full width.
float alongReefBy(float offshore, float share) {
  return min(offshore, REEF_BEGINS) + max(offshore - REEF_BEGINS, 0.0) / share;
}
float offshoreOfReefBy(float along, float share) {
  return min(along, REEF_BEGINS) + max(along - REEF_BEGINS, 0.0) * share;
}

// The ground's height at p (x, z), in metres above the still sea: the island's formula, or, with
// WATER_FLOOR_FROM_PICTURE, a reading of the picture made from it. (On Ryan's phone the formula, worked out for
// every dot of water, is the dearest arithmetic in all this colouring, and a reading costs next to nothing. The
// picture has no mipmaps, so it may be read inside a branch.)
float groundHeightAt(vec2 p) {
  #ifdef WATER_FLOOR_FROM_PICTURE
  return texture2D(uFloorHeight, p / FLOOR_HEIGHT_SPAN + 0.5).r;
  #else
  return hgt(p.x, p.y);
  #endif
}

// The surface as the ripples tilt it, for an eye under it: the wave's own slope (waveUp, the mesh's), the three
// ripple readings and the foam's finest one, turned back to the world's axes as the top side turns them. Less in
// a light air, and never quite flat.
vec3 rippledFromBelow(vec3 waveUp, vec4 ripplesLarge, vec4 ripplesMedium, vec4 ripplesSmall, vec4 finest) {
  vec2 largeSlope = ripplesLarge.rg - 0.5;
  vec2 g2 = ripplesMedium.rg - 0.5;
  vec2 g3 = ripplesSmall.rg - 0.5;
  vec2 g4 = finest.rg - 0.5;
  vec2 mediumSlope = vec2(g2.x * 0.8 + g2.y * 0.6, -g2.x * 0.6 + g2.y * 0.8);
  vec2 smallSlope = vec2(g3.x * 0.28 - g3.y * 0.96, g3.x * 0.96 + g3.y * 0.28);
  vec2 finestSlope = vec2(-g4.x - g4.y, g4.x - g4.y) * 0.71;
  float ruffling = mix(RIPPLES_FROM_BELOW.x, RIPPLES_FROM_BELOW.y, clamp(uWind / USUAL_WIND, 0.0, 1.0));
  vec2 slope = (largeSlope * 0.4 + mediumSlope * 0.5 + smallSlope * 0.5 + finestSlope * 0.4) * ruffling;
  return normalize(normalize(waveUp) + vec3(-slope.x, 0.0, -slope.y));
}

// From under water the surface is two things. Overhead, and out to about 49 degrees from straight up, it is a
// window: all the sky from horizon to horizon is drawn together into that round of it, with the sun and the clouds
// in it, and every ripple bends it. Further out no light from above comes down the line of sight at all, and the
// surface is a mirror of what lies under it: pale sand and dark coral heads in shallow water, the dark in deep.
// (Snell's window.) Between the two the mirror comes in as Fresnel's law has it, and ripples too small to draw
// leave a pale sheen on it. Foam is neither: a lit cloud. What is seen then comes to the eye through the water
// between, like anything else (through-water.glsl).
// towardsCamera: from this point of the surface to the eye. surfaceUp: the surface's normal (either way up).
// xz: where this point is. waterDepth: how deep the water is under it. gathered: how much of the light the ripples
// gather here, 0 to 1 (a half is as much as on flat water), broadly (x) and by their finest facets (y). foam: how
// much foam lies here, 0 to 1; foamLumps: its pattern, in broad lumps (x) and in bubbles (y).
vec3 seenFromUnderWater(vec3 towardsCamera, float cameraDistance, vec3 surfaceUp, vec2 xz, float waterDepth,
    vec2 gathered, float foam, vec2 foamLumps) {
  vec3 sight = -towardsCamera;
  vec3 up = surfaceUp.y < 0.0 ? -surfaceUp : surfaceUp;
  // (1 where the line of sight meets the surface square on)
  float squareness = dot(sight, up);
  // Out into the air: the line of sight is bent away from straight up, and where this is nothing or less it does
  // not get out at all.
  float getsOut = 1.0 - WATER_INDEX * WATER_INDEX * (1.0 - squareness * squareness);
  float squareInAir = sqrt(max(getsOut, 0.0));
  float slanting = 1.0 - squareInAir;
  float slanting2 = slanting * slanting;
  float mirrors = MIRRORED_SQUARE_ON + (1.0 - MIRRORED_SQUARE_ON) * slanting2 * slanting2 * slanting;
  vec3 intoAir = normalize(WATER_INDEX * sight + (squareInAir - WATER_INDEX * squareness) * up);
  float daylight = (0.25 + 0.75 * uDaylight) * (1.0 - 0.8 * uNight);

  // The sky through the window, as the sky dome draws it (sky/sky-gradient.glsl), with the sun and its glow. The
  // sun is no disc from here: the ripples smear it into a dazzle, and break that into pieces that dance.
  float sunShows = 1.0 - uNight;
  vec3 sky = skyGradient(normalize(intoAir.xz + 1e-5), clamp(intoAir.y, 0.0, 1.0));
  float fromSun = sqrt(max(0.0, 2.0 - 2.0 * dot(intoAir, uSunDirection)));
  float sunsDazzle = exp(-fromSun * fromSun / (SUNS_DAZZLE_ACROSS * SUNS_DAZZLE_ACROSS));
  // (And through ripples the sun is in a thousand places at once: every facet that bends its light to the eye
  // glints, thick about where the sun stands and thinning away from it. The window in the photographs is a field
  // of such white pieces on blue, not a smooth sky.)
  float nearTheSun = exp(-fromSun * fromSun / (SUN_GLINTS_OVER * SUN_GLINTS_OVER));
  float sunGlintsFrom = mix(SUN_GLINTS_FROM.x, SUN_GLINTS_FROM.y, nearTheSun);
  float sunGlints = smoothstep(sunGlintsFrom, sunGlintsFrom + GLINT_EDGE, gathered.y) * nearTheSun;
  sky += uSunColour * sunShows * (sunsBroadGlow(fromSun) * 1.3 + 0.45 * exp(-fromSun * 9.0)
    + SUNS_DAZZLE * sunsDazzle + SUN_GLINTS * sunGlints);
  // (the moon, by night)
  float fromMoon = sqrt(max(0.0, 2.0 - 2.0 * dot(intoAir, uMoonDirection)));
  sky += MOONLIGHT * uNight * (0.25 * exp(-fromMoon * 8.0)
    + exp(-fromMoon * fromMoon / (SUNS_DAZZLE_ACROSS * SUNS_DAZZLE_ACROSS)));
  // The clouds, from the sky's own pictures, as the top side mirrors them. (Only in the window: the pictures have
  // no mipmaps, and may be read inside a branch.)
  if (mirrors < 1.0) {
    float across = atan(intoAir.z, intoAir.x) / FULL_TURN + 0.5;
    float upSky = -0.5 + sqrt(0.25 + 2.0 * asin(clamp(intoAir.y, 0.0, 1.0)) / QUARTER_TURN);
    vec4 clouds = mix(texture2D(uSkyPictureFrom, vec2(across, upSky)), texture2D(uSkyPictureTo, vec2(across, upSky)),
      uSkyPictureBlend);
    // (red was divided by 2.3 to fit in the picture)
    sky = sky * (1.0 - clouds.a + clouds.b)
      + uCloudInSun * clouds.r * mix(2.4, 1.85, uDaylight) + uCloudInShade * clouds.g * 0.82;
  }
  float lensed = 1.0 + WINDOW_LENSED * (gathered.x - 0.5);
  vec3 window = sky * WINDOW_BRIGHTER * lensed;

  // The mirror. The line of sight goes down from the surface as steeply as it came up to it, and meets the floor
  // so far off: there the floor is as deep as its picture says, and a coral head stands or does not (the reef's
  // map: neither picture has mipmaps). So the mirror shows the pale shallows and the dark heads, bent by every
  // ripple, and beyond them the water's own colour.
  vec3 mirroredSight = sight - 2.0 * squareness * up;
  float toTheFloor = min(waterDepth / max(-mirroredSight.y, 0.1), MIRROR_REACHES);
  vec2 onFloor = xz + mirroredSight.xz * toTheFloor;
  float depthThere = max(uSeaLevel - groundHeightAt(onFloor), 0.0);
  vec2 reefUvThere = (onFloor - HOME_ISLET) / REEF_MAP_SPAN + 0.5;
  float headThere = 0.0;
  if (abs(reefUvThere.x - 0.5) < 0.49 && abs(reefUvThere.y - 0.5) < 0.49) {
    headThere = smoothstep(0.25, 0.85, texture2D(uReefMap, reefUvThere).g);
  }
  vec3 floorLit = mix(FLOOR_IN_THE_MIRROR, HEAD_IN_THE_MIRROR, headThere)
    * exp(-depthThere * vec3(0.05, 0.02, 0.015)) * daylight;
  vec3 mirror = seenThroughWater(floorLit, uUnderWaterColour, toTheFloor, mirroredSight.y);
  // (The glints: the surface's finest facets tip far enough, here and there, to show the low sky and the sun's
  // light in it. Thick just outside the window's edge, fewer further out, and each one crisp: dark mirror and
  // bright glint side by side are what make the underside look like metal.)
  float nearTheWindow = exp(min(getsOut, 0.0) / GLINTS_DIE_OVER);
  // (far off they are the tips of coarser ripples: fewer of those are let glint, so that the far surface is
  // set with small pieces and not with slabs)
  float glintsFrom = mix(GLINTS_FROM.x, GLINTS_FROM.y, nearTheWindow) + 0.05 * smoothstep(8.0, 30.0, cameraDistance);
  float glints = smoothstep(glintsFrom, glintsFrom + GLINT_EDGE, gathered.y) * (0.3 + 0.7 * nearTheWindow);
  vec3 glintLight = (0.8 * uSkyHorizon + 0.7 * uSunColour * sunShows) * WINDOW_BRIGHTER * daylight;
  mirror = mix(mirror, glintLight, clamp(glints + SHEEN_AT_WINDOWS_EDGE * nearTheWindow, 0.0, 1.0));

  vec3 colour = mix(window, mirror, mirrors);

  // Foam: a ceiling of bubbles with the daylight in it, ragged at its edges, and in it a grain of the bubbles
  // themselves.
  float foamCover = smoothstep(0.18, 0.6, foam + (foamLumps.x - 0.5) * 0.3);
  // (The lace is a bright net with dark holes: turned over, bright bubbles packed together. Faintly: drawn
  // strongly it was a hide of dark spots.)
  float bubbles = 1.0 - smoothstep(0.3, 0.8, foamLumps.y);
  vec3 foamLit = mix(THIN_FOAM_FROM_BELOW, THICK_FOAM_FROM_BELOW, smoothstep(0.45, 1.0, foam))
    * (0.74 + 0.36 * foamLumps.x + 0.07 * bubbles) * daylight;
  colour = mix(colour, foamLit, foamCover * 0.92);

  return seenThroughWater(colour, uUnderWaterColour, cameraDistance, sight.y);
}

void main() {
  // The gaps in the torn edges of a breaking wave's white mass: only the breaker's mesh is compiled with them.
  // Not from under water, where the mesh's foot would show as a net of dark threads. (The texture is read here,
  // before any branch.)
  #ifdef WATER_HAS_TORN_EDGE
  float tornAway = isTornAway(vWaterPosition, vTornEdge) * (1.0 - uUnderWater);
  #else
  float tornAway = 0.0;
  #endif
  // (uDebugMode 5: the sea is drained, to see its floor)
  if (uDebugMode > 4.5 || tornAway > 0.5) discard;
  // (WATER_BARE: a debug switch draws the wave mesh in one colour and works out nothing more, to see what all of
  // its colouring costs.)
  #ifdef WATER_BARE
  gl_FragColor = vec4(PLAIN_WATER, 0.95);
  return;
  #endif

  // ---- Where this point is ----

  vec2 xz = vWaterPosition.xz;
  // (the metres of sea from one pixel to the next)
  vec2 pixelStepX = dFdx(vWaterPosition.xz);
  vec2 pixelStepY = dFdy(vWaterPosition.xz);
  vec3 toCamera = cameraPosition - vWaterPosition;
  float cameraDistance = length(toCamera);
  vec3 towardsCamera = toCamera / cameraDistance;
  float directionFromCentre = atan(xz.y, xz.x);
  float distanceFromCentre = length(xz);
  // The shore in this direction: how far from the centre the ocean's shoreline lies, the reef's share of its full
  // width, and the land's width. Read from a picture of them round the atoll, where every dot of water used to
  // work out their eight sines. (The picture has no mipmaps: it may be read anywhere.)
  #ifdef WATER_SHORE_FROM_PICTURE
  vec4 shoreRound = texture2D(uShoreRound, vec2(directionFromCentre / FULL_TURN + 0.5, 0.5));
  float oceanShoreRadius = shoreRound.r + SHORE_ROUND_FROM;
  float reefsShare = shoreRound.g;
  float landsWidth = shoreRound.b;
  #else
  float oceanShoreRadius = islandR(directionFromCentre);
  float reefsShare = reefShare(directionFromCentre);
  float landsWidth = landW(directionFromCentre);
  #endif

  // ---- The far sea's holes, and the lagoon ----

  float inLagoon = 0.0;
  // (The two meshes the waves move are neither: they are compiled without this.)
  #ifndef WATER_STANDS_STEEP
  if (uIsFlatSheet > 0.5) {
    float holeOutside = oceanShoreRadius
      + offshoreOfReefBy(WAVE_MESH_ENDS - FAR_SEA_HOLE_SHORT_OF_EDGE, reefsShare);
    float holeInside = oceanShoreRadius - FAR_SEA_HOLE_UP_BEACH;
    if (distanceFromCentre < holeOutside && distanceFromCentre > holeInside) discard;
    inLagoon = step(distanceFromCentre, oceanShoreRadius);
    // The lagoon's shore-wave band (lagoon-shore-band.ts, uIsShoreBand = 1; lagoon-shore-band.vert.glsl lifts it): a strip
    // of mesh from BAND_UP_BEACH up the lagoon's beaches (and the sandbank's) to BAND_OUT_INTO_LAGOON out, drawn in a
    // high wind within BAND_SHOWN_WITHIN of the eye. Where it is drawn, the flat sheet leaves a gap for it; and the band
    // draws nothing outside that.
    // (landward: metres on the land side of the water's edge, of the lagoon's own shore or of the sandbank's,
    // whichever is nearer)
    float landwardOfLagoonShore = distanceFromCentre - oceanShoreRadius + landsWidth;
    float landwardOfSandbankShore = SANDBANK_RADIUS - length(xz - vec2(sandbankX(), sandbankZ()));
    float landward = max(landwardOfLagoonShore, landwardOfSandbankShore);
    float inBand = step(-BAND_OUT_INTO_LAGOON, landward) * step(landward, BAND_UP_BEACH)
      * step(cameraDistance, BAND_SHOWN_WITHIN) * uShoreBandShown;
    if (abs(inBand - uIsShoreBand) > 0.5) discard;
  }
  #endif

  // ---- The ripples ----

  // Ripples: the detail texture read three times, 37 m, 14 m and 4.3 m across, each copy turned and running its
  // own way, so the eye finds no repeat. Far away the GPU blends each copy smooth by itself. (There was a fourth,
  // 1.3 m across: it could hardly be told in the picture, and it made the water busy close to.)
  // (The clock is wrapped, so that the readings stay
  // exact however long the game has run: after RIPPLES_REPEAT seconds each is back where it began.)
  // (They are read here, before the branch below: the underside is bent by them as the top is.)
  float rippleTime = mod(uTime, RIPPLES_REPEAT);
  vec4 ripplesLarge = texture2D(uDetail, xz * 0.027 + rippleTime * LARGE_RIPPLES_RUN);
  vec2 turnedForMedium = vec2(xz.x * 0.8 - xz.y * 0.6, xz.x * 0.6 + xz.y * 0.8);
  vec4 ripplesMedium = texture2D(uDetail, turnedForMedium * 0.071 + rippleTime * MEDIUM_RIPPLES_RUN);
  vec2 turnedForSmall = vec2(xz.x * 0.28 + xz.y * 0.96, -xz.x * 0.96 + xz.y * 0.28);
  vec4 ripplesSmall = texture2D(uDetail, turnedForSmall * 0.23 + rippleTime * SMALL_RIPPLES_RUN);
  // (And the foam's finest reading, 1.3 m across, which only drifts: further down it is the foam's lace and
  // bubbles; from under water, the surface's finest facets.)
  vec2 turnedForFine = vec2(-xz.x * 0.71 + xz.y * 0.71, -xz.x * 0.71 - xz.y * 0.71);
  vec4 foamFine = texture2D(uDetail, turnedForFine * 0.77 + uTime * vec2(-0.05, -0.06));

  // From under water none of what follows shows: the surface is its underside alone. (Not while a debug colour
  // is asked for, which the end of main lays over it.)
  if (uUnderWater > 0.5 && uDebugMode < 2.5) {
    // (the water's depth here, as "How deep the water is" works it out below: the floor's picture has no mipmaps
    // and may be read anywhere)
    float depthBelow = vWaterPosition.y + SEA_FLOOR_DEPTH;
    if (uIsFlatSheet < 0.5 || inLagoon > 0.5) depthBelow = vWaterPosition.y - groundHeightAt(xz);
    vec3 surfaceUp = rippledFromBelow(vWaterNormal, ripplesLarge, ripplesMedium, ripplesSmall, foamFine);
    // (Each ripple is a lens too: it gathers the light here and spreads it there. Broadly, by the ripples that
    // are drawn; and finely, by facets a hand across, which glint. Far off the fine ones cannot be told apart,
    // and the glints go by coarser ripples, so that the far surface still glitters.)
    // (Three sizes of ripple together, so that the glints are of all sizes and lie in drifts, not in rows: by
    // the finest alone they were polka dots.)
    float nearFacets = foamFine.b * 0.44 + ripplesSmall.b * 0.33 + ripplesMedium.b * 0.23;
    float farFacets = ripplesSmall.b * 0.45 + ripplesMedium.b * 0.55;
    float fineFacets = mix(nearFacets, farFacets, smoothstep(6.0, 22.0, cameraDistance));
    vec2 gathered = vec2(ripplesMedium.b * 0.6 + ripplesSmall.b * 0.4, fineFacets);
    // (and the foam the waves have left here: its lumps, in the ripples' own readings, and its bubbles, which
    // are the foam's lace seen from the other side)
    vec2 foamLumps = vec2(ripplesMedium.b * 0.6 + ripplesLarge.b * 0.25 + ripplesSmall.a * 0.15,
      mix(foamFine.a, ripplesSmall.a, smoothstep(6.0, 22.0, cameraDistance)));
    vec3 underside = seenFromUnderWater(towardsCamera, cameraDistance, surfaceUp, xz, depthBelow, gathered,
      vWaveState.x, foamLumps);
    gl_FragColor = vec4(underside + (hash(gl_FragCoord.xy) - 0.5) * (2.0 / 255.0), 1.0);
    return;
  }

  // ---- How deep the water is ----

  // (under the far sea the floor lies as deep as the ground ever goes)
  float waterDepth = vWaterPosition.y + SEA_FLOOR_DEPTH;
  if (uIsFlatSheet < 0.5 || inLagoon > 0.5) waterDepth = vWaterPosition.y - groundHeightAt(xz);
  // how far the lagoon's shore-wave band stands above still water here
  float bandLift = (vWaterPosition.y - uSeaLevel) * uIsShoreBand;
  // the depth of still water over the sand itself
  float depthOverSand = waterDepth - bandLift;
  // Where the floor falls away suddenly the water's colour does not: light spreads sideways in water, so the deep
  // water beside a shallow bank is lit by the bank, and the bank's edge is tinted by the deep beside it. So water
  // more than a little deep is coloured by its depth averaged over some metres round (the waves' picture of the
  // floor, sea-floor-pictures.ts). (Not the far sea, whose floor is not drawn. This is the water's own colour
  // only: how much it hides goes by the depth of the very thing behind it, below.)
  float liftOverSea = vWaterPosition.y - uSeaLevel;
  float sightLevel = max(length(towardsCamera.xz), 1e-3);
  float hasFloor = uIsFlatSheet < 0.5 || inLagoon > 0.5 ? 1.0 : 0.0;
  // (Under the far sea there is no floor to ask after: nothing is read there. The picture has no mipmaps, so it
  // may be read inside this branch.)
  // (The colour once went by the depth further on along the line of sight as well, for a low eye, as if the line
  // ran on straight under the surface. It does not: it is bent steeply down, and what is seen through a spot of
  // the surface lies nearly under it. By that rule the shallows of a shore that falls away steeply were the
  // colour of the deep beyond: a dark line along the lagoon islet's beach.)
  float depthRound = waterDepth;
  if (hasFloor > 0.5) depthRound = texture2D(uSeaFloor, xz / SEA_PICTURE_SPAN + 0.5).z + liftOverSea;
  float lightSpreads = DEPTH_SPREADS * smoothstep(0.2, 1.0, waterDepth) * hasFloor;
  float colouredAsDeep = mix(1.0, max(depthRound, 0.2) / max(waterDepth, 0.2), lightSpreads);

  // (WATER_STOPS_AFTER_...: six debug switches end the colouring here and at five places further on, and draw
  // what has been worked out so far as a rough colour, so that nothing before the place is left out and nothing
  // after it is worked out. Read with the frame rate, they say which part of the colouring costs the frames.)
  #ifdef WATER_STOPS_AFTER_DEPTH
  gl_FragColor = vec4(mix(OVER_SAND_AQUA, OCEAN_BLUE, smoothstep(0.0, 16.0, waterDepth * colouredAsDeep)), 0.9);
  return;
  #endif
  float sunShows = 1.0 - uNight;
  float waveFoam = vWaveState.x;
  float metresOffBeach = vWaveState.y;
  // (the same as a distance along the reef, whose zones lie at the same such distances all round: shore.glsl)
  float reefDistance = alongReefBy(metresOffBeach, reefsShare);
  float waveHeight = vWaveState.z;

  // ---- The detail texture ----

  // (All the readings of the detail texture are made here, outside any branch: docs/DEVICE_NOTES.md.)

  // (The ripples' three readings are made further up, before the underside is drawn.)
  // Foam lies on the water and goes with it, slowly, while the ripples run through under it: so its lace and its
  // bubbles have readings of their own that only drift, one as fine as the small ripples and one finer, 1.3 m
  // across. (The flat sheets carry only the wind's foam, which is torn and gone in a few seconds: there the
  // coarser of the two is the small ripples' own reading, and every dot of the open sea and the lagoon is spared
  // one.)
  #ifdef WATER_STANDS_STEEP
  vec4 foamSmall = texture2D(uDetail, turnedForSmall * 0.23 + uTime * vec2(0.031, 0.017));
  #else
  vec4 foamSmall = ripplesSmall;
  #endif
  // (the finer one is read further up, with the ripples: the underside's glints go by it too)

  // Once more stretched twice along the wind, for the white horses' foam: read here and not inside their branch.
  vec2 windStreaksUv = vec2(dot(xz, vec2(-WIND_DIR.y, WIND_DIR.x)) * 0.16, dot(xz, WIND_DIR) * 0.07);
  vec4 windStreaks = texture2D(uDetail, windStreaksUv + uTime * vec2(0.008, 0.02));

  // A reading laid out along the shore and stretched 3.6 times across it: streaks that run the way the waves travel
  // (foam drawn out behind white water, lines pulled up a wave's face). Its coordinates have a seam on the west side
  // of the atoll (direction = +-pi), so it is faded out just there.
  // (Only the two meshes the waves move have a shore to be laid along: the flat sheets are compiled without it.)
  float awayFromSeam = smoothstep(0.0, 0.08, HALF_TURN - abs(directionFromCentre));
  #ifdef WATER_STANDS_STEEP
  vec4 shoreStreaks = texture2D(uDetail, vec2(directionFromCentre * 25.4648, metresOffBeach * 0.035 - uTime * 0.004));
  float shoreStreak = mix(0.5, shoreStreaks.a * 0.6 + shoreStreaks.b * 0.4, awayFromSeam);
  #else
  float shoreStreak = 0.5;
  #endif

  // Two more readings for water that stands steep, which only the wave mesh and the breaker's mesh can: the flat
  // sheets are compiled without them (WATER_STANDS_STEEP is the materials' define). Both are laid out along the
  // shore, and have the same seam and the same fade.
  #ifdef WATER_STANDS_STEEP
  // Drawn out up the water's height and fine along the shore: the lines that run up a wave's face, where the water
  // is drawn up it.
  vec4 faceLines = texture2D(uDetail, vec2(directionFromCentre * FACE_LINES_ROUND,
    (vWaterPosition.y - uSeaLevel) * 0.05 + metresOffBeach * 0.01 - uTime * 0.012));
  float faceLine = (faceLines.r - 0.5) * awayFromSeam;
  float fallingStreak = faceLines.a * 0.6 + faceLines.b * 0.4;
  // Along the shore and up the water's height alike, for foam on steep water - the front of white water, the mass
  // a landed lip throws up - where the readings laid on from above would be smeared down it.
  // (It runs down the water as white water tumbles: STEEP_FOAM_FALLS metres a second.)
  vec4 steepFoam = texture2D(uDetail, vec2(directionFromCentre * STEEP_FOAM_ROUND,
    (vWaterPosition.y - uSeaLevel + uTime * STEEP_FOAM_FALLS) * 0.33));
  #else
  float faceLine = 0.0;
  float fallingStreak = 0.5;
  vec4 steepFoam = vec4(0.5);
  #endif
  // And one for the white mass a landed lip throws up, which only the breaker's mesh draws: round lumps a metre
  // or so across, laid along the shore and along the mesh's own cross-section (by height they would be drawn out
  // into streaks over the top of the mass, where it is level), which roll up and over as the mass tumbles.
  #ifdef WATER_HAS_TORN_EDGE
  // (And again four times as fine, for the small lumps on the big ones, which tumble faster.)
  vec4 massLumps = texture2D(uDetail,
    vec2(directionFromCentre * MASS_LUMPS_ROUND, vWhiteMass.y * 0.1 + uTime * 0.09));
  vec4 massSmallLumps = texture2D(uDetail,
    vec2(directionFromCentre * MASS_LUMPS_ROUND * 4.0 + 0.37, vWhiteMass.y * 0.4 + uTime * 0.31));
  float whiteMass = vWhiteMass.x * awayFromSeam;
  #else
  vec4 massLumps = vec4(0.5);
  vec4 massSmallLumps = vec4(0.5);
  float whiteMass = 0.0;
  #endif

  // One slow reading, 250 m across and drifting, for the wind's gusts and slicks (below).
  vec4 windPatches = texture2D(uDetail, xz * 0.004 + uTime * vec2(0.0015, 0.0009));

  // ---- The wind on the water ----

  // Sheltered water (shallows, close to the beach, the lagoon) carries only small ripples.
  float deepEnough = 0.35 + 0.65 * smoothstep(0.0, 2.0, waterDepth);
  float offTheBeach = mix(0.55, 1.0, clamp(reefDistance / DROP_OFF_BEGINS, 0.0, 1.0));
  float outOfLagoon = 1.0 - 0.3 * inLagoon;
  float rippleExposure = deepEnough * offTheBeach * outOfLagoon;
  // The wind does not ruffle the water evenly: gusts roughen and darken it in patches, and between them lie slicks,
  // glassy and paler, that mirror the sky - most of all on sheltered water. The slow reading, mixed with the 37 m
  // one.
  float slick = smoothstep(0.42, 0.62, windPatches.b * 0.65 + ripplesLarge.b * 0.35) * (0.55 + 0.3 * inLagoon);
  // (a light air leaves wide slicks, a calm is one great slick, a fresh breeze leaves few)
  float windOverUsual = uWind / USUAL_WIND;
  float lightAir = smoothstep(0.0, 0.5, windOverUsual);
  slick = clamp(slick * (1.6 - 0.6 * uWind / USUAL_WIND) + 1.0 - lightAir, 0.0, 1.0);
  // (gusts come and go in patches; and fine ripples count for less far from the eye, where they would otherwise
  // show as a regular hatching)
  float gust = (0.6 + 0.8 * ripplesLarge.b) * (1.0 - 0.65 * slick) * (0.4 + 0.6 * exp(-cameraDistance * 0.025));

  // The ripples' slope: the turned copies' slopes are turned back to the world's axes.
  vec2 largeSlope = ripplesLarge.rg - 0.5;
  vec2 g2 = ripplesMedium.rg - 0.5;
  vec2 g3 = ripplesSmall.rg - 0.5;
  vec2 mediumSlope = vec2(g2.x * 0.8 + g2.y * 0.6, -g2.x * 0.6 + g2.y * 0.8);
  vec2 smallSlope = vec2(g3.x * 0.28 - g3.y * 0.96, g3.x * 0.96 + g3.y * 0.28);
  // (Sheltered water has none of the long ripples, but most of the middling ones, a stride or two long: it is
  // those that show a few metres out and beyond, each drawn out level by the view into a streak of sky or a
  // window to the floor. The small ones are too fine to be made out there, and without the middling ones
  // sheltered water was a smooth sheet from ten metres out.)
  vec2 largeRipples = largeSlope * 0.40 * rippleExposure
    + mediumSlope * 0.50 * mix(MIDDLING_RIPPLES_IN_SHELTER, 1.0, rippleExposure);
  vec2 smallRipples = smallSlope * (0.70 + 0.30 * rippleExposure) * gust;
  // (the foam's own readings, turned back the same way: the small lumps of its surface)
  vec2 f3 = foamSmall.rg - 0.5;
  vec2 f4 = foamFine.rg - 0.5;
  vec2 foamSlope = vec2(f3.x * 0.28 - f3.y * 0.96, f3.x * 0.96 + f3.y * 0.28) + vec2(-f4.x - f4.y, f4.x - f4.y) * 0.71;
  // The wind ruffles the surface (windOverUsual = 1 in the island's usual breeze): none of it in a calm - the water
  // is glass - and more than usual when it blows fresh. The swell below is not the wind's and stays.
  // (A light air ruffles it nearly as steeply as a breeze does, only in smaller ripples: the steepness of a real
  // sea's ripples grows as the square root of the wind. Growing with the wind itself, a light air left the lagoon
  // a smooth sheet a few metres out, where the photos show it ruffled all over.)
  float ruffling = windOverUsual < 1.0
    ? pow(max(windOverUsual, 1e-4), RUFFLES_BY_WIND) : 1.0 + 3.6 * (windOverUsual - 1.0);
  // (But water is never quite still: with no wind at all the broad ripples are left, low and slow, and the sky
  // lies in the water in long lazy shapes.)
  // (And the small ripples are never steeper than SMALL_RIPPLES_STEEPEST times the usual: in a gale it is the
  // waves that grow, not the ripples on them.)
  vec2 broadRipplesSlope = largeRipples * max(ruffling, NEVER_QUITE_STILL);
  vec2 smallRipplesSlope = smallRipples * min(ruffling, SMALL_RIPPLES_STEEPEST);
  vec2 surfaceSlope = broadRipplesSlope + smallRipplesSlope;

  // ---- Swell lines ----

  // Out beyond the reef the sea rolls in as long low lines. Out there they are not modelled, only shaded - each line
  // tilts the surface a little towards the island on its face and away on its back, which is what makes swell show
  // as dark and light bands. The shading takes over where the modelled waves fade out, past the drop-off, and fades
  // away far out. First the swells that break on the reef (waves.glsl), before they have grown, by the wave model's
  // own clock; then, further out, shorter lines of the open sea's own, as rings round the island. All are wobbled a
  // little far out so that the lines are not ruled.
  float swellMetresOffshore = mix(metresOffBeach, distanceFromCentre - oceanShoreRadius, uIsFlatSheet);
  float swellAlongReef = alongReefBy(swellMetresOffshore, reefsShare);
  float pastModelledWaves = smoothstep(WAVE_MESH_FADES_FROM, WAVE_MESH_ENDS, swellAlongReef);
  float notFarOut = 1.0 - smoothstep(WAVE_MESH_ENDS + 150.0, WAVE_MESH_ENDS + 470.0, swellAlongReef);
  // (strongest on the side the swell comes from, the south; faint in the atoll's lee)
  // (the sine of the direction from the centre is how far south this lies, over how far out)
  float facingSwell = 0.28 + 0.72 * smoothstep(-0.4, 0.8, xz.y / max(distanceFromCentre, 1e-3));
  float wavesOn = abs(uDebugMode - 1.0) < 0.5 ? 0.0 : 1.0;
  float swellLines = pastModelledWaves * notFarOut * facingSwell * (1.0 - inLagoon)
    * wavesOn;
  // +1 on a line's face, -1 on its back
  float swellLineSide = 0.0;
  if (swellLines > 0.003) {
    float swellWobble = (ripplesLarge.b - 0.5) * 1.6 * smoothstep(WAVE_MESH_ENDS, WAVE_MESH_ENDS + 55.0, swellAlongReef);
    // (the picture has no mipmaps, so it may be read inside this branch)
    vec4 seaFloorHere = texture2D(uSeaFloor, xz / SEA_PICTURE_SPAN + 0.5);
    vec2 modelledTilt = MODELLED_SWELL;
    // (the open sea's lines keep a clock of their own: the further out, the earlier, coming in at 4.95 m/s)
    float swellTime = uTime + 16.749 + (swellMetresOffshore - 40.0) / 4.95;
    float beyondTheMesh = smoothstep(WAVE_MESH_ENDS, WAVE_MESH_ENDS + 75.0, swellAlongReef);
    float trainSlopes = (WATER_SWELL) * beyondTheMesh;
    float longSwellGrows = smoothstep(WAVE_MESH_ENDS, WAVE_MESH_ENDS + 75.0, swellAlongReef);
    float longSwellHeight = 0.55 + 0.45 * sin(uTime * 0.07 + directionFromCentre * 3.0);
    float longSwellSlope = LONG_SWELL_SLOPE * longSwellGrows * longSwellHeight
      * cos(0.70 * swellTime + 4.0 * directionFromCentre + 1.3 + swellWobble);
    // (uneven along each line: higher here, lower there)
    float unevenAlongLine = swellLines * (0.8 + 0.6 * ripplesLarge.b);
    vec2 swellTilt = (normalize(xz) * (trainSlopes + longSwellSlope) + modelledTilt) * unevenAlongLine;
    surfaceSlope += swellTilt * 1.4;
    swellLineSide = clamp(dot(swellTilt, normalize(xz)) * 4.5, -1.0, 1.0);
  }

  #ifdef WATER_STOPS_AFTER_RIPPLES
  gl_FragColor = vec4(mix(OVER_SAND_AQUA, OCEAN_BLUE, smoothstep(0.0, 16.0, waterDepth * colouredAsDeep))
    + vec3(surfaceSlope, slick * 0.2 + swellLineSide * 0.1) * 0.5, 0.9);
  return;
  #endif

  // ---- What the surface mirrors ----

  vec3 waveNormal = normalize(vWaterNormal);
  // On steep water - a wave's face, the lip - the ripples, which are laid on from above, would be smeared down it
  // in broad bands: they give way there to fine lines running up the face, which tilt it to one side and the other
  // along the wave's length.
  float steep = clamp(1.0 - waveNormal.y, 0.0, 1.0);
  vec2 alongWave = vec2(-waveNormal.z, waveNormal.x) / max(length(waveNormal.xz), 1e-3);
  vec2 ripplesOnSlope = surfaceSlope * (1.0 - 0.8 * steep) - alongWave * faceLine * FACE_LINES_TILT * steep;
  vec3 normal = normalize(waveNormal + vec3(-ripplesOnSlope.x, 0.0, -ripplesOnSlope.y));
  if (dot(normal, towardsCamera) < 0.0) normal = -normal;
  // The mirror goes by every ripple: its near side, turned to the eye, is a window into the water, and its far
  // side, turned away, a streak of sky. So clear water does not end at a line where the mirror begins: the streaks
  // of sky start a few metres out, few and far between, and crowd together with distance, as in the photos. (Far
  // off, where a ripple is smaller than a dot of the picture, the texture's own blurring runs them together.)
  float lookedAlong = 1.0 - clamp(abs(dot(waveNormal, towardsCamera)), 0.0, 1.0);
  // How much sky the surface mirrors. A real sea is too rough to be a perfect mirror even at the horizon.
  // (A ripple's far side takes up less of the eye's view than its near side does, the less the nearer it is to
  // edge on: it counts for that much less. Without this, water looked along from the beach was all far sides,
  // and all mirror.)
  float flatFacesEye = 1.0 - lookedAlong;
  float rippleFacesEye = clamp(dot(normal, towardsCamera), 0.0, 1.0);
  float facesEye = mix(flatFacesEye, rippleFacesEye, clamp(rippleFacesEye / max(flatFacesEye, 1e-3), 0.0, 1.0));
  float turnedAway = clamp(1.0 - facesEye, 0.001, 1.0);
  float turnedAwaySquared = turnedAway * turnedAway;
  // (the fifth power, by multiplying: Schlick's rule)
  float fresnel = 0.02 + 0.98 * turnedAwaySquared * turnedAwaySquared * turnedAway;
  // (a calm sea is a true mirror at a low angle)
  fresnel *= 1.0 - mix(0.40, 0.14, slick) * min(uWind * 2.3, 1.0) * fresnel;
  // (A ray mirrored a little way down into the water, off a ripple, is turned back up to the sky. One mirrored well
  // down - under a lip, or off a face seen from above - meets the sea: there the surface mirrors water like itself.)
  vec3 mirrored = reflect(-towardsCamera, normal);
  float mirrorsTheSea = smoothstep(0.15, 0.5, -mirrored.y);
  mirrored.y = abs(mirrored.y) + 0.02;
  mirrored = normalize(mirrored);
  // (The clouds are looked for by the broad ripples alone. Each small ripple mirrors its own bit of sky, and where
  // that bit was now a white cloud and now the blue beside it, a breeze was a speckle of white dashes: the eye
  // sees the small ripples' clouds run together.)
  vec2 broadSlope = ripplesOnSlope - smallRipplesSlope * (1.0 - 0.8 * steep);
  vec3 cloudsMirrored = reflect(-towardsCamera, normalize(waveNormal + vec3(-broadSlope.x, 0.0, -broadSlope.y)));
  cloudsMirrored.y = abs(cloudsMirrored.y) + 0.02;
  cloudsMirrored = normalize(cloudsMirrored);
  // (Ruffled water mirrors the sky from higher up, where it is bluer: gust patches read darker than the slicks.
  // And no water is so smooth that it mirrors the very foot of the sky, which is nearly white: without the first
  // number the sea far off is a pale sheet, where a real one is a deeper blue than the sky above it.)
  // (And in any wind each ripple carries finer ones, too small to draw, which turn its mirror up the sky: so a
  // streak of sky on clear water is the deep blue of the sky a third of the way up, darker than the sunlit
  // shallows it lies on. Mirroring the sky's pale foot, the streaks were there but could not be seen.)
  float ruffledLooksHigher = MIRRORS_FROM_HIGHER.x + MIRRORS_FROM_HIGHER.y * lightAir
    + (1.0 - slick) * (0.12 + 0.14 * max(windOverUsual - 1.0, 0.0));
  // (The sky's own colours, as the sky dome draws them (sky/sky-gradient.glsl): at golden hour and in the evening
  // the sea takes the sky's warmth, its fire towards the sun and its mauve away from it. And the sun's broad glow
  // in the sky round it, which lies on the water under a low sun as a wide pale path.)
  vec3 skyMirrored = skyGradient(normalize(mirrored.xz + 1e-5), clamp(mirrored.y + ruffledLooksHigher, 0.0, 1.0));
  skyMirrored += uSunColour * sunsBroadGlow(sqrt(max(0.0, 2.0 - 2.0 * dot(mirrored, uSunDirection)))) * sunShows;
  if (fresnel > 0.05) {
    // The clouds, mirrored: the same sky pictures the sky shows, looked up in the mirrored direction. The sky
    // slides each picture by how far the clouds have drifted since it was drawn (sky.frag.glsl); here that is
    // left out. The mirrored clouds lag by a degree or two at most, less than the waves smear them, and the
    // slide would cost every water pixel two more texture reads.
    float across = atan(cloudsMirrored.z, cloudsMirrored.x) / FULL_TURN + 0.5;
    float up = -0.5 + sqrt(0.25 + 2.0 * asin(clamp(cloudsMirrored.y, 0.0, 1.0)) / QUARTER_TURN);
    vec2 cloudUv = vec2(across, up);
    vec4 fromPictureA = texture2D(uSkyPictureFrom, cloudUv);
    vec4 fromPictureB = texture2D(uSkyPictureTo, cloudUv);
    vec4 clouds = mix(fromPictureA, fromPictureB, uSkyPictureBlend);
    float skyShows = 1.0 - clouds.a + clouds.b;
    // (red was divided by 2.3 to fit in the picture)
    vec3 sunlitCloud = uCloudInSun * clouds.r * mix(2.4, 1.85, uDaylight);
    vec3 shadedCloud = uCloudInShade * clouds.g * 0.82;
    skyMirrored = skyMirrored * skyShows + sunlitCloud + shadedCloud;
  }

  // The sun and the moon mirrored: a broad sheen, and the sun's glitter on the ripples. (Each is worked out only
  // while it is in the sky: the tests are on uniforms, which cost nothing to skip by.)
  vec3 glints = vec3(0.0);
  if (uNight < 1.0) {
    float towardsSun = max(dot(mirrored, uSunDirection), 0.0);
    glints = uSunColour * pow(towardsSun, 60.0) * 0.06 * sunShows;
    if (towardsSun > 0.985) {
      float glitter = smoothstep(0.56, 0.86, noise(xz * 17.0 + vec2(uTime * 3.0, -uTime * 2.4)));
      glints += uSunColour * pow(towardsSun, 340.0) * 7.0 * glitter * sunShows * min(uWind * 2.3, 1.3);
    }
    // Sparkle. The ripples drawn here are the larger ones; on them ride finer ones, too small to draw, and now and
    // then one of those is tilted just so and flashes the sun at the eye. How often goes by how far a facet would
    // have to be tilted from the ripple it rides on, against how rough the wind has made the water: so the sparkle
    // is thick under the sun and thins out to a few points far to either side, and those few are what show that
    // clear water has a surface. (The gate is on arithmetic, not on a texture.)
    vec3 halfway = normalize(towardsCamera + uSunDirection);
    float facetFaces = max(dot(halfway, normal), 0.05);
    float tiltNeeded = 1.0 / (facetFaces * facetFaces) - 1.0;
    // (Not far off, where the glitter above is all that could be told apart: the open sea is spared the work.)
    float sparkleChance = exp(-tiltNeeded / (SPARKLE_IN_A_CALM + SPARKLE_BY_WIND * uWind))
      * (1.0 - smoothstep(SPARKLES_SEEN_WITHIN.x, SPARKLES_SEEN_WITHIN.y, cameraDistance));
    if (sparkleChance > 0.01) {
      // (A sparkle is a few dots of the picture across, near the eye and far off: the pattern is laid at the two
      // sizes, each twice the other, that the size of a dot here falls between, and the two are blended. At one
      // size for all distances the near sparkles were white blots a finger long, and the far ones a snow of
      // specks.)
      float dotHere = max(max(length(pixelStepX), length(pixelStepY)), 1e-4);
      float sizeWanted = log2(1.0 / (SPARKLE_DOTS_ACROSS * dotHere));
      float finerSize = exp2(ceil(sizeWanted));
      vec2 sparkleDrift = vec2(uTime * 2.3, -uTime * 1.9);
      float sparkle = mix(noise(xz * finerSize + sparkleDrift), noise(xz * finerSize * 0.5 + sparkleDrift),
        ceil(sizeWanted) - sizeWanted);
      // (the noise is mostly near a half: above 0.58 lies a quarter of it, above 0.82 a few points in a thousand)
      float sparkleFrom = 0.85 - 0.24 * sqrt(sparkleChance);
      glints += uSunColour * SPARKLE_BRIGHT * smoothstep(sparkleFrom, sparkleFrom + 0.04, sparkle) * sunShows;
    }
    // (On glassy water the sun is mirrored whole, not scattered into glitter. Its image is small: drawn several
    // times the sun's own width, it lay on clear water near the eye as white blots a pace across.)
    if (uWind < GLASSY_BELOW_WIND) {
      glints += uSunColour * pow(towardsSun, SUNS_IMAGE_SHARP) * 5.0 * (1.0 - smoothstep(0.0, GLASSY_BELOW_WIND, uWind))
        * sunShows;
    }
  }
  // (The moon's light on the water is glitter too, round the moon's own small image, with a faint sheen about
  // it: as one broad patch of white it was a floodlight on ice.)
  if (uNight > 0.0) {
    float towardsMoon = max(dot(mirrored, uMoonDirection), 0.0);
    vec3 moonGlints = MOONLIGHT * pow(towardsMoon, 20.0) * MOON_SHEEN;
    if (towardsMoon > 0.97 && uNight > 0.01) {
      float glitter = smoothstep(0.5, 0.8, noise(xz * 11.0 + vec2(uTime * 2.0, -uTime * 1.6)));
      moonGlints += MOONLIGHT
        * (pow(towardsMoon, 200.0) * MOON_GLITTER * glitter + pow(towardsMoon, 1500.0) * MOON_GLITTER);
    }
    glints += moonGlints * uNight;
  }

  #ifdef WATER_STOPS_AFTER_MIRROR
  gl_FragColor = vec4(mix(mix(OVER_SAND_AQUA, OCEAN_BLUE, smoothstep(0.0, 16.0, waterDepth * colouredAsDeep)),
    skyMirrored, fresnel) + glints, 0.9);
  return;
  #endif

  // ---- How much water the eye looks through ----

  // Water has one colour rule: its colour and how much it hides go by how much of it the eye looks through. Looking
  // down through a flat sea that is the depth. Where a wave tilts the surface towards the eye, the ray runs on
  // through the water more nearly level and through more of it, so the water there is deeper in colour and hides
  // more: a swell's face is darker than its back, and the foot of a breaking wave is a wall. Where the water has a
  // far side - the upper face of a breaking wave, its lip - a ray running level may come out again before it has
  // gone down into the sea: then the eye sees the light behind the wave, through however much water that was.
  //
  // seenDepth is that path as a depth: the depth of flat water that the eye, looking the same way, would see as
  // much of. On flat water it is the depth itself, whichever way the eye looks.
  vec3 facingNormal = dot(waveNormal, towardsCamera) < 0.0 ? -waveNormal : waveNormal;
  vec3 intoWater = refract(-towardsCamera, facingNormal, INTO_WATER);
  float wayDown = max(-intoWater.y, 0.02);
  float wayAlong = sqrt(max(1.0 - intoWater.y * intoWater.y, 0.0025));
  // (how steeply the same ray would go down through a flat sea)
  float eyeAbove = clamp(towardsCamera.y, 0.0, 1.0);
  float wayDownIfFlat = sqrt(1.0 - INTO_WATER * INTO_WATER * (1.0 - eyeAbove * eyeAbove));
  // The water a wave has lifted above the sea around it, and the sea under that. (On the beach the swash is lifted
  // too, but it is a film on the sand: only as much water as there is counts as lifted.)
  float liftedWater = min(max(vWaterPosition.y - uSeaLevel, 0.0), max(waterDepth, 0.0));
  float seaUnderLift = max(waterDepth - liftedWater, 0.0);
  // The ray goes down through the lifted water into the sea, unless it comes out of the far side first. If it
  // does, and it is running level through no great thickness of water, the eye sees the light behind the wave:
  // the sky, and the sun in the water. Otherwise it goes on into the sea beyond, down to the floor.
  float pathToSea = liftedWater / wayDown;
  float pathToFarSide = vWaterBehind / wayAlong;
  float runsLevel = 1.0 - smoothstep(0.12, 0.55, wayDown);
  float thinEnough = 1.0 - smoothstep(LIGHT_COMES_THROUGH.x, LIGHT_COMES_THROUGH.y, pathToFarSide);
  float seesThrough = smoothstep(0.7, 1.5, pathToSea / max(pathToFarSide, 1e-3)) * runsLevel * thinEnough;
  float pathInLift = min(liftedWater / max(wayDown, LEAST_WAY_DOWN), pathToFarSide);
  float pathSeen = pathInLift + (1.0 - seesThrough) * seaUnderLift / max(wayDown, LEAST_WAY_DOWN);
  float seenDepth = pathSeen * wayDownIfFlat;
  // (coloured by the depth round about: above)
  seenDepth *= colouredAsDeep;
  float lightThrough = seesThrough;

  // ---- The colour of the water itself ----

  // (The lagoon's water is coloured as any other water of its depth is: only the wind treats it differently.)
  vec3 waterColour = waterBodyColour(seenDepth);
  // (the light behind a wave, seen through it: pale through a sheet, cyan through a metre of water)
  vec3 throughWave = mix(LIGHT_THROUGH_THIN, LIGHT_THROUGH_THICK, smoothstep(0.1, 1.5, pathInLift));
  // (It is the sun's light: looked at towards the sun the wave glows with it, and with the sun behind the eye it
  // is dimmer.)
  float towardsTheSun = clamp(0.5 - 0.5 * dot(towardsCamera, uSunDirection), 0.0, 1.0);
  throughWave *= mix(LIGHT_THROUGH_DIM, LIGHT_THROUGH_GLOW, towardsTheSun);
  waterColour = mix(waterColour, throughWave, lightThrough);
  float facingSun = clamp((surfaceSlope.x * uSunDirection.x + surfaceSlope.y * uSunDirection.z) * 4.0, 0.0, 1.0);
  waterColour += SUNLIT_RIPPLE_TINT * facingSun * uDaylight;
  // The sun lights the water through its surface: a slope turned to the sun takes in more of it than flat water
  // does and one turned away less, which is what shows a swell's shape from above. (Not a breaking wave's face:
  // that is lit through its back as much as its front.)
  float sunOnSlope = clamp(dot(waveNormal, uSunDirection) - uSunDirection.y, -0.45, 0.35);
  waterColour *= 1.0 + SUN_ON_SLOPES * sunOnSlope * uDaylight * (1.0 - smoothstep(0.04, 0.3, steep));
  // (the lines up a face are ridges of water: a little thicker and thinner, so a little darker and lighter)
  waterColour *= 1.0 + FACE_LINES_SHADE * faceLine * steep;
  waterColour *= 0.96 + 0.09 * slick;
  // Aerated water: where waves have just broken the water is full of bubbles and turns pale and milky.
  waterColour = mix(waterColour, AERATED_WATER, clamp(waveFoam * 0.8, 0.0, 0.72));
  waterColour *= waterInThisLight(uDaylight, uNight);

  // ---- What is behind the surface, read bent from its picture ----

  // (Not for an eye under the water, for which no picture is drawn: what follows is then for nothing, and the
  // view from below takes its place at the end. The picture has no mipmaps, so it may be read inside this branch.)
  vec4 straightBehind = vec4(0.0, 0.0, 0.0, 1.0);
  vec4 behind = straightBehind;
  if (uPictureDrawn > 0.5) {
    vec2 onPicture = gl_FragCoord.xy * uDotOfPicture;
    // (the sand under a sheet of water that lies above or below the still sea: A_SHEET_ON_THE_SAND, above)
    float sheetFromStillSea = clamp(liftOverSea, -LOWERED_OUT_OF_SEA_WITHIN, LOWERED_OUT_OF_SEA_WITHIN)
      * (1.0 - smoothstep(A_SHEET_ON_THE_SAND.x, A_SHEET_ON_THE_SAND.y, waterDepth));
    float drawnLower = sheetFromStillSea * uRaisingShare
      * raisedShareAtSurface(dot(toCamera.xz, toCamera.xz), uEyeForRaising);
    vec3 hereAsSeen = (viewMatrix * vec4(vWaterPosition, 1.0)).xyz;
    vec3 sandAsDrawn = hereAsSeen - viewMatrix[1].xyz * drawnLower;
    onPicture += (sandAsDrawn.xy / max(-sandAsDrawn.z, 0.05) - hereAsSeen.xy / max(-hereAsSeen.z, 0.05))
      * uPictureScale;
    // (by the broad and middling ripples alone: BENDS, above)
    vec3 slopeAsSeen = mat3(viewMatrix) * vec3(broadRipplesSlope.x, 0.0, broadRipplesSlope.y);
    vec2 bentAMetreDown = slopeAsSeen.xy * uPictureScale * (BENDS * uBendingShare / max(cameraDistance, 0.5));
    // A thing is moved by its own depth under the surface: the top of a coral head hardly at all, the sand at its
    // foot by more. So the picture is read twice: straight behind this spot, to find how deep what is there
    // lies, and then to one side by that depth. (Moved all alike, by the floor's depth, a head and the ground
    // round it shifted as one flat picture.)
    straightBehind = texture2D(uUnderWaterPicture, onPicture);
    // (past the smeared outline of anything that stands out of the sea: OUTLINE_SUSPECTED, above)
    if (depthHeld(straightBehind.a) < OUTLINE_SUSPECTED.x && waterDepth > OUTLINE_SUSPECTED.y) {
      vec2 aside = uDotOfPicture * OUTLINE_LOOKED_PAST;
      vec4 toTheRight = texture2D(uUnderWaterPicture, onPicture + vec2(aside.x, 0.0));
      vec4 toTheLeft = texture2D(uUnderWaterPicture, onPicture - vec2(aside.x, 0.0));
      vec4 above = texture2D(uUnderWaterPicture, onPicture + vec2(0.0, aside.y));
      vec4 below = texture2D(uUnderWaterPicture, onPicture - vec2(0.0, aside.y));
      if (toTheRight.a > straightBehind.a) straightBehind = toTheRight;
      if (toTheLeft.a > straightBehind.a) straightBehind = toTheLeft;
      if (above.a > straightBehind.a) straightBehind = above;
      if (below.a > straightBehind.a) straightBehind = below;
    }
    float itsDepth = clamp(depthHeld(straightBehind.a) + liftOverSea, 0.0, BENDS_NO_DEEPER_THAN);
    behind = texture2D(uUnderWaterPicture, onPicture + bentAMetreDown * itsDepth);
    // (A thing that stands out of the sea is not behind the water beside it: where the bent reading finds one,
    // the line is left unbent.)
    if (behind.a < 0.004) behind = straightBehind;
  }
  // (how far under the still sea the thing behind this spot lies)
  float depthBehind = depthHeld(behind.a);

  // ---- How much the water hides what is under it ----

  // By degrees, with how much water lies in front of the very thing that is behind this spot (water-veil.glsl):
  // the wave's own, and then the sea down to the thing, along the bent line. So a coral head is hidden by the
  // water over the head and not by the depth of the sand beside it, and a pool's walls fade as they go down.
  // (A film of water a few centimetres deep on the sand is all but invisible: no tint, no dark edge.)
  // (Where the swell breaks the water is churned up and never quite clear: cloudier, by the same rule. As a veil
  // of its own that came in with the first metre of depth, every swell crossing the crest turned from clear to
  // turquoise as it passed.)
  float churnedUp = smoothstep(CREST_BEGINS + 10.0, CREST_BEGINS + 20.0, reefDistance)
    * (1.0 - smoothstep(FORE_REEF_BEGINS + 12.0, FORE_REEF_BEGINS + 24.0, reefDistance));
  float metresInFront = pathInLift + (1.0 - seesThrough) * depthBehind / max(wayDown, LEAST_WAY_DOWN);
  float opacity = mix(0.07, 1.0, hiddenByWater(metresInFront, 1.0 + CHURNED_CLOUDIER * churnedUp))
    * smoothstep(0.0, 0.4, waterDepth);
  // (a wave the light comes through still hides what is behind it)
  opacity = max(opacity, lightThrough * 0.95);
  // water with foam on it or bubbles in it is cloudy: it hides the sea floor and the light playing on it
  opacity = max(opacity, smoothstep(0.03, 0.5, waveFoam) * 0.86 * smoothstep(0.06, 0.4, waterDepth));

  // ---- The clouds' shadows ----

  // The water under a cloud is duller, and the sun does not glitter there (nor anywhere, while a cloud stands between
  // the eye and a low sun).
  float cloudLight = texture2D(uCloudShadeMap, xz / CLOUD_SHADE_SPAN_M + 0.5).r;
  waterColour *= mix(0.62, 1.0, cloudLight);
  glints *= cloudLight * cloudLight * mix(uSunThroughCloud, 1.0, smoothstep(0.04, 0.16, uSunDirection.y));
  // (a swell line's face is darker, its back lighter, from whatever angle it is seen: the tilt alone only shows at a
  // low angle)
  // What the surface mirrors, and what that hides. A ripple's side that the eye looks far along shows the sky
  // and not the floor, even in clear shallow water: there the mirror lies over the water, and both over the floor.
  // A side the eye looks into more squarely lets the light up from a bright floor drown the mirror: there it only
  // tints the water, and shallow water stays clear to its floor. `mirrorHides` goes from the one to the other,
  // ripple by ripple: so near the eye a few streaks of sky lie on clear water, and far off it is all sky. And a
  // film of water on the sand mirrors nothing.
  float facetLookedAlong = 1.0 - facesEye;
  float floorDrownsMirror = (1.0 - smoothstep(MIRROR_DROWNED_OVER.x, MIRROR_DROWNED_OVER.y, seenDepth))
    * uDaylight * mix(0.5, 1.0, cloudLight);
  float mirrorHides = mix(1.0, smoothstep(MIRROR_HIDES_FROM.x, MIRROR_HIDES_FROM.y, facetLookedAlong),
    floorDrownsMirror) * smoothstep(0.05, 0.5, waterDepth);
  vec3 inMirror = mix(skyMirrored, waterColour, mirrorsTheSea);
  glints *= 1.0 - mirrorsTheSea;
  // Ruffled water mirrors more of the sky than smooth water does when it is looked down on at a middling angle:
  // the far sides of its ripples are turned nearly edge on to the eye. So a gust shows as a patch of the sky's
  // deeper blue lying on clear water, and the slick beside it as a window to the floor. (Not looked along from far
  // off, where smooth water is the better mirror.)
  // (In broad patches, the size of the gusts themselves: the 37 m reading and the slow one together, so that
  // neither's repeat shows. Broken up by the 14 m reading as well, the patches were blotches a few strides
  // across, and the water was busy with them.)
  float ruffled = (1.0 - slick) * (0.2 + 1.5 * ripplesLarge.b * (0.5 + windPatches.b))
    * min(windOverUsual, 1.5);
  // (Nor on a wave's face: a gust's patch of sky across it read as a smear of cloud on the wave.)
  float ruffledMirrors = RUFFLED_MIRRORS * ruffled * (1.0 - smoothstep(0.9, 0.99, lookedAlong))
    * (1.0 - smoothstep(0.02, 0.15, steep));
  float mirrors = min(fresnel + ruffledMirrors, 1.0) * mirrorHides;
  vec3 tinted = mix(waterColour, inMirror, fresnel * (1.0 - mirrorHides));
  float hides = 1.0 - (1.0 - opacity) * (1.0 - mirrors);
  vec3 seen = (tinted * opacity * (1.0 - mirrors) + inMirror * mirrors) / max(hides, 1e-3);
  // (The sun's and the moon's glints are light added on top of whatever the water shows. Where the water is
  // clear they would be drawn as faintly as it is: there they are given their own place in the picture.)
  float glintShows = min(max(glints.r, max(glints.g, glints.b)), 1.0);
  opacity = max(hides, glintShows);
  vec3 colour = (seen * hides + glints) / max(opacity, 1e-3) * (1.0 - 0.13 * swellLineSide);

  #ifdef WATER_STOPS_AFTER_COLOUR
  gl_FragColor = vec4(colour, opacity);
  return;
  #endif

  // ---- White horses ----

  // In a high wind the chop crests and breaks: a stretch of a crest turns white and tumbles for a couple of seconds,
  // and the foam it leaves lies on the water behind it, thinning to lace and fading as the crest runs on. Two
  // families of crests cross, 28 degrees either side of the wind, so that there are no rows and so that from any
  // side some crests are seen broadside on. In sheltered water - the lagoon, and the reef flat between the ocean
  // beach and the breakers - they are a third the size, lower and fewer, and leave little foam (on the reef flat
  // less still); in the lagoon only where it is deep, and none among the breakers themselves.
  // windFoam: foam lying on the water (the lagoon's shore waves add theirs below); whiteCrests: crests standing up.
  float windFoam = 0.0;
  float whiteCrests = 0.0;
  // (Below the wind that raises them there are none, and none of this is worked out: the test is on a uniform.)
  if (uWind > WHITECAPS_FROM_WIND) {
    float sheltered = max(inLagoon, step(reefDistance, FORE_REEF_BEGINS - 2.0));
    float openSeaWhitecaps = smoothstep(FORE_REEF_BEGINS + 5.0, FORE_REEF_BEGINS + 21.0, reefDistance)
      * smoothstep(1.0, 2.6, waterDepth);
    float reefFlatWhitecaps = (1.0 - smoothstep(CREST_BEGINS - 20.0, CREST_BEGINS - 8.0, reefDistance))
      * smoothstep(0.5, 1.1, waterDepth);
    float lagoonWhitecaps = smoothstep(1.6, 3.6, waterDepth);
    float shelteredWhitecaps = mix(reefFlatWhitecaps, lagoonWhitecaps, inLagoon);
    float whitecaps = smoothstep(WHITECAPS_FROM_WIND, 1.0, uWind) * (1.0 - uUnderWater)
      * mix(openSeaWhitecaps, shelteredWhitecaps, sheltered);
    if (whitecaps > 0.003) {
      // (in sheltered water everything is measured three times larger, so the crests come out a third the size)
      float scale = 1.0 + 2.0 * sheltered;
      float crestBend = ((ripplesMedium.b - 0.5) * 2.5 + (ripplesLarge.b - 0.5) * 5.0 + (windPatches.b - 0.5) * 30.0)
        * scale;
      vec2 scaledXz = xz * scale;
      vec2 fromCamera = xz - cameraPosition.xz;
      float levelDistance = max(length(fromCamera), 1.0);
      fromCamera /= levelDistance;
      float ragged = (ripplesMedium.b - 0.5) * 0.2 + (foamSmall.b - 0.5) * 0.12;
      float crestHeight = mix(0.6, mix(0.15, 0.2, inLagoon), sheltered) * whitecaps * scale;
      float eyeHeight = max(cameraPosition.y - vWaterPosition.y, 0.4);
      float rise = crestHeight * levelDistance / eyeHeight;
      float rarity = mix(0.75, 0.59, whitecaps) + mix(0.09, 0.06, inLagoon) * sheltered;
      float pixelSize = max(length(pixelStepX), length(pixelStepY)) * scale;
      float lyingFoamShows = (1.0 - smoothstep(1.5, 5.0, pixelSize)) * smoothstep(0.0, 0.3, whitecaps);
      float bandDepth = 1.0 + 1.5 * sheltered;
      vec2 wind = WIND_DIR;
      // (28 degrees either way)
      vec2 directionA = vec2(wind.x * 0.883 - wind.y * 0.469, wind.x * 0.469 + wind.y * 0.883);
      vec2 directionB = vec2(wind.x * 0.883 + wind.y * 0.469, -wind.x * 0.469 + wind.y * 0.883);
      float pixelAlongA = abs(dot(pixelStepX, directionA)) + abs(dot(pixelStepY, directionA));
      float pixelAlongB = abs(dot(pixelStepX, directionB)) + abs(dot(pixelStepY, directionB));
      vec2 familyA = whiteHorses(scaledXz, crestBend, ragged, bandDepth, directionA, CRESTS_A_SPACING, CRESTS_A_SPEED,
        uTime, 3.1, rarity, fromCamera, rise, pixelAlongA * scale / CRESTS_A_SPACING, lyingFoamShows);
      vec2 familyB = whiteHorses(scaledXz, -crestBend, -ragged, bandDepth, directionB, CRESTS_B_SPACING, CRESTS_B_SPEED,
        uTime, 8.7, rarity, fromCamera, rise, pixelAlongB * scale / CRESTS_B_SPACING, lyingFoamShows);
      // (in sheltered water the foam is thinner: lace with the water showing through it, not a white shape)
      windFoam = max(familyA.x, familyB.x) * (1.0 - SHELTERED_FOAM_THINNER * sheltered);
      // (right under the eye a crest is drawn by its foam alone)
      whiteCrests = max(familyA.y, familyB.y) * smoothstep(4.0, 18.0, levelDistance);
    }
  }

  // ---- The lagoon's shore waves ----

  // From a medium wind up, small waves come ashore on the lagoon's beaches (lagwave.glsl; terrain-colour.glsl draws
  // what they do on the sand; in a high wind the band mesh gives them height). The water there is too clear and thin
  // to show much: ahead of each crest its face is a faint darker band (there you look into the water, not at the
  // sky), its back a thin line of sky; from where it breaks - the bigger the wave, the further out - it is white.
  // (Only the flat sheets lie in the lagoon: the two meshes the waves move are compiled without this.)
  #ifndef WATER_STANDS_STEEP
  // (and only from the wind that raises them: below it lagExposure is nothing)
  if (uWind > LAGOON_WAVES_FROM_WIND && inLagoon > 0.5 && depthOverSand < 1.6) {
    float shoreWaves = lagExposure(xz) * (1.0 - uUnderWater);
    if (shoreWaves > 0.003) {
      vec3 shoreWave = lagWave(xz, depthOverSand, uTime);
      float secondsSinceCrest = shoreWave.x;
      // 0 as a crest passes, 1 as the next one comes
      float wavePhase = secondsSinceCrest / LW_T;
      float waveSize = shoreWave.y * shoreWaves;
      float nextWaveSize = shoreWave.z * shoreWaves;
      float shoaling = (1.0 - smoothstep(0.4, 1.5, depthOverSand)) * smoothstep(0.14, 0.28, depthOverSand)
        * min(nextWaveSize, 1.0);
      float waveFace = smoothstep(0.80, 0.95, wavePhase) * (1.0 - smoothstep(0.95, 1.0, wavePhase)) * shoaling;
      colour = mix(colour, waterColour * 0.45, waveFace * 0.7);
      opacity = max(opacity, waveFace * 0.3);
      float waveBack = smoothstep(0.94, 1.0, wavePhase) * shoaling;
      colour = mix(colour, skyMirrored * 1.05, waveBack * 0.5);
      opacity = max(opacity, waveBack * 0.32);
      // (nothing is drawn here in the last hand's depth: the sand shader draws the foam there, since only it knows
      // exactly where the ground's own triangles meet the water)
      float breaksAtDepth = 0.1 + 0.26 * min(waveSize, 1.8);
      float broken = 1.0 - smoothstep(0.6, 1.15, depthOverSand / breaksAtDepth);
      windFoam = max(windFoam, lagFoam(secondsSinceCrest, waveSize) * broken * smoothstep(0.10, 0.2, depthOverSand));
    }
  }
  #endif

  #ifdef WATER_STOPS_AFTER_WHITE_HORSES
  gl_FragColor = vec4(mix(colour, vec3(1.0), clamp(windFoam + whiteCrests, 0.0, 1.0)), opacity);
  return;
  #endif

  // ---- Foam ----

  float foam = 0.0;
  // Whether this dot may carry foam the waves made (the two meshes the waves move: where the wave model puts any,
  // at the water's edge, and near the beach, where foam lies round the rocks), and whether it carries the wind's.
  // None of the foam is worked out where there can be none, which is most of the sea.
  bool wavesMayFoam = uIsFlatSheet < 0.5 && (waveFoam > 0.003 || waterDepth < 0.09 || metresOffBeach < 16.0);
  bool windFoams = windFoam + whiteCrests > 0.003;
  if (wavesMayFoam || windFoams) {
    // The wave model says how much (waveFoam); the detail texture turns that into lace where it is thin and a white
    // sheet with holes where it is thick (soft patches only, further away, where the lace would be too fine to see).
    // The pattern drifts slowly with the ripples instead of racing ashore.
    float laceNear = max(foamSmall.a, foamFine.a * 0.9) * 0.6 + (foamSmall.b + foamFine.b) * 0.2;
    float laceFar = 0.22 + ripplesMedium.b * 0.36 + ripplesLarge.b * 0.30;
    float lace = mix(laceNear, laceFar, smoothstep(8.0, 30.0, cameraDistance)) * 0.62 + shoreStreak * 0.38;
    // (on steep water the pattern is the reading laid along it, drawn out into streaks the way the water falls)
    float steepLace = mix(steepFoam.a * 0.55 + steepFoam.b * 0.45, fallingStreak, 0.45) * awayFromSeam
      + 0.5 * (1.0 - awayFromSeam);
    lace = mix(lace, steepLace, steep);
    // (The white mass is no lace at all, nor a falling sheet: it is thick white water, in lumps.)
    lace = mix(lace, 0.6 + 0.4 * massLumps.b, whiteMass);
    // (where the lace pattern is above this the foam is white, below it blue-grey)
    float whiteLaceThreshold = 0.3;
    // (how far this is the thin sheet of water on the sand: below)
    float onSand = 0.0;
    if (wavesMayFoam) {
      // (how far this is the thin sheet on the sand, where foam stays lace: above)
      onSand = 1.0 - smoothstep(SHEET_ON_SAND_UNDER.x, SHEET_ON_SAND_UNDER.y, waterDepth);
      // (With none of the waves' foam here, the threshold is what laceThreshold gives for none, and only the foam
      // round a rock is left to draw.)
      whiteLaceThreshold = 1.0;
      if (waveFoam > 0.0) {
        // The foam's edge towards the beach is scalloped: it reaches the sand in tongues a few strides across, and
        // between them thins out short of it. (The wave model ends the foam along one even line, a stride off the
        // beach. The tongues stand still on the beach, as a beach's cusps do.)
        float foamOfWaves = waveFoam;
        if (metresOffBeach < SCALLOPS_REACH + 1.5) {
          float betweenTongues = 1.0 - smoothstep(0.3, 0.75, noise(xz * SCALLOPS_A_METRE));
          foamOfWaves *= smoothstep(-0.4, 0.8, metresOffBeach - SCALLOPS_REACH * betweenTongues);
        }
        // only foam the waves made; no standing lace along the beach
        float foamAmount = clamp(foamOfWaves * (0.75 + 0.5 * ripplesMedium.b), 0.0, 1.0);
        // the sheet of water sliding up and down the sand carries a white edge and a little lace, not a grey veil
        float offTheSheet = max(smoothstep(0.03, 0.15, waterDepth), smoothstep(0.4, 0.8, foamOfWaves));
        foamAmount *= mix(0.3, 1.0, offTheSheet);
        float threshold = mix(laceThreshold(foamAmount), laceThresholdOnSand(foamAmount), onSand);
        whiteLaceThreshold = max(threshold, -0.05);
        foam = foamAsLace(foamAmount, threshold, lace, cameraDistance);
        // from far off the lace is too fine to see: thin foam then reads as a pale veil, patchier where it is thinner
        float veil = clamp(foamAmount * (0.30 + 1.1 * lace), 0.0, 1.0);
        foam = mix(foam, veil, smoothstep(12.0, 55.0, cameraDistance) * offTheSheet);
        foam = max(foam,
          smoothstep(mix(0.72, 0.86, onSand), 1.0, foamOfWaves) * (0.55 + 0.45 * smoothstep(0.3, 0.7, lace)));
        // a line of foam at the very edge of moving water (not round a still puddle lying in a dip in the sand)
        float waterEdge = 1.0 - smoothstep(0.0, 0.06, waterDepth);
        foam = max(foam, waterEdge * smoothstep(0.45, 0.75, lace + 0.15) * smoothstep(0.06, 0.22, foamOfWaves));
      }
      if (metresOffBeach < 24.0) {
        float churned = clamp(waveHeight * 3.0 + waveFoam, 0.0, 1.0);
        foam = max(foam, foamRoundObstacles(xz) * smoothstep(0.45, 0.75, lace + 0.30 * churned));
      }
    }
    // The white horses' foam: a white sheet where it is fresh, lace as it thins - drawn out in streaks along the wind
    // (the detail texture read stretched twice that way) - and a pale veil from far off. Under it the water is full of
    // bubbles for a while, and paler.
    if (windFoam + whiteCrests > 0.003) {
      float windLace = mix(lace, windStreaks.a * 0.65 + windStreaks.b * 0.35, 0.45);
      colour = mix(colour, UNDER_WHITECAP * (0.45 + 0.55 * uDaylight) * (1.0 - 0.8 * uNight), 0.3 * windFoam);
      float whitecapFoam = foamAsLace(windFoam, laceThreshold(windFoam), windLace, cameraDistance);
      float veil = clamp(smoothstep(0.2, 0.85, windFoam) * (0.45 + 1.1 * windLace), 0.0, 1.0);
      whitecapFoam = mix(whitecapFoam, veil, smoothstep(12.0, 55.0, cameraDistance)) * (1.0 - 0.3 * inLagoon);
      whitecapFoam = max(whitecapFoam, whiteCrests * (0.82 + 0.18 * smoothstep(0.3, 0.6, lace)));
      foam = max(foam, whitecapFoam);
      whiteLaceThreshold = min(whiteLaceThreshold, mix(0.3, -0.05, max(windFoam, whiteCrests)));
    }

    // (All of the foam's shading is worked out only where there is foam: over most of the sea there is none.)
    if (foam > 0.0) {
      // Foam is white where it is thick and blue-grey where it thins; the ripples under it catch the sun, so it looks
      // frothy.
      float closeUp = 1.0 - smoothstep(5.0, 22.0, cameraDistance);
      // (The ripples are laid on from above: on steep water, and on the white mass a landed lip throws up, they would
      // be smeared down it in streaks, so there the foam goes by the readings laid along the surface instead.)
      float laidFromAbove = (1.0 - steep) * (1.0 - steep) * (1.0 - whiteMass);
      float frothTilt = dot(foamSlope, uSunDirection.xz) * 1.1 * closeUp * laidFromAbove;
      float froth = clamp(0.97 + frothTilt, 0.84, 1.07);
      vec3 foamColour = foamInThisLight(uDaylight, uNight) * froth;
      // close up, even thick foam is a mass of bubbles with water showing between them
      // (not the white mass: water showing through it in specks made it look like ice)
      float bubbles = mix(foamFine.a, steepFoam.a, steep);
      foam *= 1.0 - 0.45 * (1.0 - smoothstep(0.25, 0.75, bubbles)) * (1.0 - smoothstep(3.0, 14.0, cameraDistance))
        * (1.0 - whiteMass);
      // no foam at all on water a few centimetres deep unless the wave model put plenty there (the white edge of the swash)
      foam *= max(smoothstep(0.03, 0.10, waterDepth), smoothstep(0.2, 0.4, waveFoam));
      foam = min(foam, 0.94);
      // (Where a sheet of foam is thin - the hollows of its pattern - the water under it shows through: painted solid
      // there, in thin foam's colour, a sheet of foam looked like snow with pools of meltwater in it. Not the white
      // mass, which is thick all through.)
      float thickFoam = smoothstep(whiteLaceThreshold, whiteLaceThreshold + 0.26, lace);
      // (on the sand, less still: there the holes of the lace are wet sand, and it is their darkness against the
      // white threads that makes it lace)
      foam *= mix(mix(THIN_FOAM_HIDES, THIN_FOAM_HIDES_ON_SAND, onSand), 1.0, max(thickFoam, whiteMass));
      vec3 foamThickness = mix(THIN_FOAM, vec3(1.08), thickFoam);
      // (the foam is lit as a rougher surface than the water: the ripples' tilt counts for more close up, and the lace
      // and the streaks give it lumps of its own)
      vec3 rippleTilt = vec3(-foamSlope.x, 0.0, -foamSlope.y)
        * (1.5 + 3.5 * (1.0 - smoothstep(4.0, 30.0, cameraDistance)));
      // (Only a little: a sheet of foam lying on the water is nearly flat. Tilted more, half of it stood in its own
      // blue-grey shade, and it looked like snow lying in drifts.)
      vec3 lumps = vec3(shoreStreak - 0.5, 0.0, lace - 0.5) * FLAT_FOAM_LUMPS;
      // (Piled-up white water - steep, or standing high - is a heap of lumps: on it the lumps are those of the reading
      // laid along the surface, they tilt it more, and the hollows between them are in shade.)
      float piledUp = max(steep, smoothstep(0.5, 1.4, vWaterPosition.y - uSeaLevel));
      vec3 upTheSlope = cross(waveNormal, vec3(alongWave.x, 0.0, alongWave.y));
      vec2 steepSlope = (steepFoam.rg - 0.5) * awayFromSeam;
      vec3 steepLumps = (vec3(alongWave.x, 0.0, alongWave.y) * steepSlope.x + upTheSlope * steepSlope.y) * PILED_LUMPS;
      // (The white mass is lit as a cloud is: round lumps a metre across, bright where they face the sun and softly
      // shaded where they turn away and in the hollows between them - a pale shade, not the blue-grey of thin foam.)
      vec2 massSlope = massLumps.rg - 0.5 + MASS_SMALL_LUMPS * (massSmallLumps.rg - 0.5);
      float massHeight = mix(massLumps.b, massSmallLumps.b, 0.35);
      vec3 massTilt = (vec3(alongWave.x, 0.0, alongWave.y) * massSlope.x + upTheSlope * massSlope.y) * MASS_LUMPS_TILT;
      vec3 foamNormal = normalize(waveNormal + (rippleTilt + lumps) * laidFromAbove
        + steepLumps * piledUp * (1.0 - 0.6 * whiteMass) + massTilt * whiteMass);
      vec3 foamInShade = mix(SHADED_FOAM, MASS_IN_SHADE, whiteMass);
      vec3 foamShade = mix(foamInShade, vec3(1.06), clamp(dot(foamNormal, uSunDirection) * 1.1 + 0.2, 0.0, 1.0));
      foamShade *= 1.0 - PILED_HOLLOWS * piledUp * (1.0 - smoothstep(0.25, 0.6, lace)) * (1.0 - whiteMass);
      foamShade *= 1.0 - MASS_HOLLOWS * whiteMass * (1.0 - smoothstep(0.3, 0.62, massHeight));
      // (thin foam is a film, with no lumps to stand in each other's shade)
      foamShade = mix(vec3(1.0), foamShade, max(thickFoam, whiteMass));
      colour = mix(colour, foamColour * foamThickness * foamShade, foam);
    }
  }
  // water under a few cm deep is invisible unless it carries foam
  opacity = max(opacity * smoothstep(0.01, 0.12, waterDepth), foam * smoothstep(0.0, 0.045, waterDepth));

  #ifdef WATER_STOPS_AFTER_FOAM
  gl_FragColor = vec4(colour, opacity);
  return;
  #endif

  // ---- Haze, the view from under water, and the debug colour ----

  // haze towards the horizon, much less when looking down from high up
  float haze = 1.0 - exp(-cameraDistance * 0.00042 * (1.0 - 0.8 * clamp(towardsCamera.y, 0.0, 1.0)));
  colour = mix(colour, uSkyHorizon, haze);
  opacity = mix(opacity, 1.0, haze);
  if (uUnderWater > 0.5) {
    colour = seenFromUnderWater(towardsCamera, cameraDistance, normal, xz, waterDepth, vec2(0.5), waveFoam,
      vec2(0.5));
    opacity = 1.0;
  }
  if (abs(uDebugMode - 3.0) < 0.5) {
    colour = PLAIN_WATER;
    opacity = 0.95;
  }
  // (uDebugMode 4: the sea floor's pictures, for looking at from the air. The depth as colour, from sand through
  // green to blue; each swell's crests as lines travelling in, white for the main swell and yellow for the second;
  // and red where a middling wave, one that breaks in water 1.7 m deep, broke within the last few seconds.)
  if (abs(uDebugMode - 4.0) < 0.5) {
    vec2 pictureUv = xz / SEA_PICTURE_SPAN + 0.5;
    vec4 seaFloor = texture2D(uSeaFloor, pictureUv);
    vec4 sinceBreak = texture2D(uBreakTimes, pictureUv);
    float depth = seaFloor.z;
    vec3 shallows = mix(vec3(0.93, 0.87, 0.66), vec3(0.20, 0.78, 0.62), smoothstep(0.0, 1.5, depth));
    colour = mix(shallows, vec3(0.05, 0.22, 0.50), smoothstep(1.5, 9.0, depth));
    float brokeLately = smoothstep(0.0, 0.3, sinceBreak.z) * (1.0 - smoothstep(2.0, 6.0, sinceBreak.z));
    colour = mix(colour, vec3(0.90, 0.25, 0.20), 0.7 * brokeLately);
    float mainArrival = dot(xz, SWELL_0_TOWARDS) / OPEN_SEA_SPEED + seaFloor.x;
    float secondArrival = dot(xz, SWELL_1_TOWARDS) / OPEN_SEA_SPEED + seaFloor.y;
    float mainCrest = 1.0 - smoothstep(0.03, 0.06, abs(fract((uTime - mainArrival) / SWELL_0_PERIOD) - 0.5));
    float secondCrest = 1.0 - smoothstep(0.02, 0.04, abs(fract((uTime - secondArrival) / SWELL_1_PERIOD) - 0.5));
    colour = mix(colour, vec3(1.0, 0.92, 0.35), 0.8 * secondCrest);
    colour = mix(colour, vec3(1.0), mainCrest);
    opacity = 1.0;
  }
  // (a dot's worth of noise: it breaks up the bands a smooth gradient shows in 8-bit colour)
  colour += (hash(gl_FragCoord.xy) - 0.5) * (2.0 / 255.0);
  if (uPictureDrawn > 0.5) {
    // The surface is drawn whole, over the picture's bent reading: what shows through the water is the thing the
    // picture holds, greyed and behind the water's glow by its own depth (water-veil.glsl), and not whatever the
    // frame has drawn straight behind this spot.
    vec3 waterLight = uDaylight * waterInThisLight(uDaylight, uNight) * mix(0.62, 1.0, cloudLight);
    vec3 seenBehind = seenDownThroughWater(behind.rgb, depthBehind,
      mix(GREYS_UNDER_WATER.x, GREYS_UNDER_WATER.y, inLagoon), waterLight);
    colour = colour * opacity + seenBehind * (1.0 - opacity);
    opacity = 1.0;
  }
  gl_FragColor = vec4(colour, opacity);
}
