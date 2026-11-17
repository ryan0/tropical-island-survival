// The colour of the sea: ripples, the sky, clouds, sun and moon mirrored in them, the colour of the water itself by
// depth, the glow of a wave's face, foam and lace, white horses in a high wind, the small waves on the lagoon's
// beaches, foam round rocks in the surf, the clouds' shadows, haze, and the surface seen from under water.
//
// One shader colours three sheets of water (water-materials.ts, water.ts):
//   the wave mesh             uIsFlatSheet 0, uIsShoreBand 0   the ring round the ocean beach, moved by water.vert.glsl
//   the far sea               uIsFlatSheet 1, uIsShoreBand 0   flat out to the horizon, with a hole cut for the wave mesh; it is
//                                               also the calm water of the lagoon
//   the lagoon's shore band   uIsFlatSheet 1, uIsShoreBand 1   lifted into small waves in a high wind by lagoon-shore-band.vert.glsl
//
// Needs
//   the uniforms and varyings below, and three.js's cameraPosition (given to every ShaderMaterial);
//   these defines, which water-materials.ts writes from the configs:
//     WATER_SWELL, LONG_SWELL_SLOPE   the swell's trains (sea-config.ts)
//     HOME_ISLET, REEF_MAP_SPAN       the middle, and the side, of the square round home that the reef's map covers
//     CLOUD_SHADE_SPAN_M              the side of the square that the map of the clouds' shadows covers
//     USUAL_WIND                      the island's usual breeze (sky-config.ts): the ripples are as strong as they
//                                     were tuned at this wind
//     MOON_DIRECTION                  towards the moon, where the sky draws it (clouds-config.ts); normalised where
//                                     it is used
//     BAND_UP_BEACH                   how far up the beach the lagoon's shore band reaches (water-config.ts)
//     BAND_SHOWN_WITHIN               the band is drawn within this distance of the eye (water-config.ts)
//     LAGOON_WIND_DIRECTION           which lagwave.glsl uses;
//   from the chunks it includes: hash, noise and fbm (noise.glsl); islandR, openSea, landW, hgt, sandbankX,
//     sandbankZ and SEA_FLOOR_DEPTH (island-shape/island.glsl and shore.glsl); WIND_DIR, LW_T, lagExposure, lagWave
//     and lagFoam (lagwave.glsl).

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
// 1 to colour the water by how much of it the eye looks through, 0 by the rules that replaces (a debug switch,
// while the new rule is judged: see "How much water the eye looks through").
uniform float uColourByPath;
// The unit vector towards the sun, and the sun's colour.
uniform vec3 uSunDirection;
uniform vec3 uSunColour;
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
// The 16 biggest things standing in the surf: x, z, radius. An empty place has a negative radius.
uniform vec3 uSurfObstacles[16];
// The detail texture (detail-texture.ts): red and green the slope of a field of small waves, blue their height, alpha
// a net of lines.
uniform sampler2D uDetail;
// The map of how high the coral heads stand (reef-map.ts).
uniform sampler2D uReefMap;
uniform sampler2D uSeaFloor;      // the sea floor as the waves know it: (delay of swell 0, of swell 1, depth, unused)
uniform sampler2D uBreakTimes;      // seconds since the main swell crossed each of four depths (sea-floor-pictures.ts)
// The two sky pictures being blended, and how far from A to B (clouds.ts); the colours of cloud in the sun and in
// shade.
uniform sampler2D uSkyPictureFrom;
uniform sampler2D uSkyPictureTo;
uniform float uSkyPictureBlend;
uniform vec3 uCloudInSun;
uniform vec3 uCloudInShade;
// The map of the clouds' shadows, and how much of the sun reaches the camera through the clouds.
uniform sampler2D uCloudShadeMap;
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

#include "../shaders/shared/turns"
#include "../shaders/shared/noise"

#include "../world/island-shape/island"

#include "../shaders/shared/lagwave"
#include "wave-timing/timing"

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

// The two families of white horses' crests: how far apart they are, and how fast they run (metres a second).
const float CRESTS_A_SPACING = 14.0;
const float CRESTS_A_SPEED = 4.0;
const float CRESTS_B_SPACING = 10.5;
const float CRESTS_B_SPEED = 3.5;

// The colour of the water itself: pale aqua over the sand, turquoise where it deepens, blue where it is deep.
const vec3 OVER_SAND_AQUA = vec3(0.15, 0.74, 0.72);
const vec3 TURQUOISE = vec3(0.03, 0.55, 0.70);
const vec3 OCEAN_BLUE = vec3(0.006, 0.12, 0.34);
// Added where the ripples face the sun.
const vec3 SUNLIT_RIPPLE_TINT = vec3(0.0, 0.10, 0.08);
// The light through a wave standing up.
const vec3 WAVE_GLOW_GREEN = vec3(0.18, 0.78, 0.68);
// The lagoon's shore waves: where they stand above still water, and on a steep face.
const vec3 SHORE_WAVE_GREEN = vec3(0.16, 0.74, 0.66);
const vec3 SHORE_WAVE_FACE_GREEN = vec3(0.05, 0.50, 0.47);
// The steep face of a breaking wave: at its foot, and towards the lip.
const vec3 WAVE_FACE_FOOT = vec3(0.0, 0.21, 0.29);
const vec3 WAVE_FACE_LIP = vec3(0.10, 0.66, 0.62);
// Water full of bubbles where waves have just broken.
const vec3 AERATED_WATER = vec3(0.52, 0.87, 0.85);
// The water's colour multiplied by this with the sun at the horizon.
const vec3 LOW_SUN_WATER_TINT = vec3(0.62, 0.45, 0.55);
// The water under a white horse's foam.
const vec3 UNDER_WHITECAP = vec3(0.34, 0.66, 0.74);
// Foam: its colour with the sun at the horizon; thin foam; foam turned away from the sun.
const vec3 LOW_SUN_FOAM = vec3(1.0, 0.8, 0.75);
const vec3 THIN_FOAM = vec3(0.66, 0.90, 0.92);
const vec3 SHADED_FOAM = vec3(0.60, 0.72, 0.84);
// The moon's light mirrored in the water.
const vec3 MOONLIGHT = vec3(0.55, 0.62, 0.80);
// From under water: the surface away from the sky, and the bright window of sky overhead; and the light with the sun
// at the horizon.
const vec3 UNDERSIDE_DARK = vec3(0.02, 0.28, 0.40);
const vec3 UNDERSIDE_WINDOW = vec3(0.60, 0.92, 0.96);
const vec3 LOW_SUN_UNDER_WATER = vec3(0.6, 0.45, 0.5);
// Debug switch 3.
const vec3 PLAIN_WATER = vec3(0.03, 0.25, 0.50);

// Light bends as it enters water: the sine of its angle to the surface's normal shrinks by this (1 / 1.33).
const float INTO_WATER = 0.75;
// The floor is never far under a ray that runs along through shallow water, and lights it from below: such a ray
// counts as going down at least this steeply, or a wave's foot over the reef would be as dark as the open sea.
const float LEAST_WAY_DOWN = 0.2;
// The light that comes through a wave from behind it: through a sheet of water, and through three metres and more.
const vec3 LIGHT_THROUGH_THIN = vec3(0.42, 0.90, 0.88);
const vec3 LIGHT_THROUGH_THICK = vec3(0.05, 0.52, 0.62);
// No light comes through more water than this (metres).
const float NO_LIGHT_THROUGH = 7.0;

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
  // (the place along a crest, scaled for the noise that says where it breaks)
  float alongCrest = dot(xz, alongCrests) * 0.075;
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

// Foam of this density drawn over a lace pattern: the more foam, the more of the pattern it covers, from lace where
// it is thin to a white sheet with holes where it is thick. Its edges are softer further from the eye.
float foamAsLace(float density, float lacePattern, float cameraDistance) {
  float threshold = laceThreshold(density);
  float laceFullFrom = threshold + 0.14 + 0.5 * smoothstep(15.0, 90.0, cameraDistance);
  return smoothstep(threshold, laceFullFrom, lacePattern) * (0.62 + 0.38 * density);
}

// Foam round the things standing in the surf: 1 at a rock's edge, fading out over half a metre and more (more round
// a bigger rock).
float foamRoundObstacles(vec2 xz) {
  float foam = 0.0;
  for (int i = 0; i < 16; i++) {
    vec3 obstacle = uSurfObstacles[i];
    if (obstacle.z > 0.0) {
      float fromEdge = length(xz - obstacle.xy) - obstacle.z;
      foam = max(foam, 1.0 - smoothstep(0.02, 0.5 + 0.35 * obstacle.z, fromEdge));
    }
  }
  return foam;
}

// The surface seen from under water, looking along -towardsCamera.
vec3 seenFromUnderWater(vec2 xz, vec3 towardsCamera, float cameraDistance) {
  float lookingUp = clamp(-towardsCamera.y, 0.0, 1.0);
  // (the sky shows only in a window overhead; further out the surface mirrors the water below)
  float skyWindow = smoothstep(0.5, 0.8, lookingUp);
  float ripples = fbm(xz * 0.9 + vec2(uTime * 0.3, uTime * 0.2));
  vec3 daylight = mix(LOW_SUN_UNDER_WATER, vec3(1.0), uDaylight) * (1.0 - 0.8 * uNight);
  vec3 colour = mix(UNDERSIDE_DARK, UNDERSIDE_WINDOW, skyWindow * (0.45 + 0.9 * ripples)) * daylight;
  // (the sun, its light bent towards straight overhead as it enters the water)
  vec3 sunSeenFromBelow = normalize(vec3(uSunDirection.x * 0.6, uSunDirection.y, uSunDirection.z * 0.6));
  colour += uSunColour * pow(max(dot(-towardsCamera, sunSeenFromBelow), 0.0), 40.0) * 1.2 * (1.0 - uNight);
  return mix(colour, uUnderWaterColour, 1.0 - exp(-cameraDistance * 0.05));
}

void main() {
  // (uDebugMode 5: the sea is drained, to see its floor)
  if (uDebugMode > 4.5) discard;

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
  float oceanShoreRadius = islandR(directionFromCentre);

  // ---- The far sea's holes, and the lagoon ----

  float inLagoon = 0.0;
  if (uIsFlatSheet > 0.5) {
    float holeOutside = oceanShoreRadius
      + offshoreOfReef(WAVE_MESH_ENDS - FAR_SEA_HOLE_SHORT_OF_EDGE, directionFromCentre);
    float holeInside = oceanShoreRadius - FAR_SEA_HOLE_UP_BEACH;
    if (distanceFromCentre < holeOutside && distanceFromCentre > holeInside) discard;
    inLagoon = step(distanceFromCentre, oceanShoreRadius);
    // The lagoon's shore-wave band (lagoon-shore-band.ts, uIsShoreBand = 1; lagoon-shore-band.vert.glsl lifts it): a strip
    // of mesh from BAND_UP_BEACH up the lagoon's beaches (and the sandbank's) to BAND_OUT_INTO_LAGOON out, drawn in a
    // high wind within BAND_SHOWN_WITHIN of the eye. Where it is drawn, the flat sheet leaves a gap for it; and the band
    // draws nothing outside that.
    // (landward: metres on the land side of the water's edge, of the lagoon's own shore or of the sandbank's,
    // whichever is nearer)
    float landwardOfLagoonShore = distanceFromCentre - oceanShoreRadius + landW(directionFromCentre);
    float landwardOfSandbankShore = SANDBANK_RADIUS - length(xz - vec2(sandbankX(), sandbankZ()));
    float landward = max(landwardOfLagoonShore, landwardOfSandbankShore);
    float inBand = step(-BAND_OUT_INTO_LAGOON, landward) * step(landward, BAND_UP_BEACH)
      * step(cameraDistance, BAND_SHOWN_WITHIN) * uShoreBandShown;
    if (abs(inBand - uIsShoreBand) > 0.5) discard;
  }

  // ---- How deep the water is ----

  // (under the far sea the floor lies as deep as the ground ever goes)
  float waterDepth = vWaterPosition.y + SEA_FLOOR_DEPTH;
  if (uIsFlatSheet < 0.5 || inLagoon > 0.5) waterDepth = vWaterPosition.y - hgt(xz.x, xz.y);
  // how far the lagoon's shore-wave band stands above still water here
  float bandLift = (vWaterPosition.y - uSeaLevel) * uIsShoreBand;
  // the depth of still water over the sand itself, coral heads apart
  float depthOverSand = waterDepth - bandLift;
  // Over a coral head the water is only as deep as the head's top (the reef's map: red 0..1 for a top 8 m down .. at
  // the surface, RED_FROM_DEPTH in reef-map.ts). Only inside the map's square: outside it the picture's edge dots
  // would repeat out to the horizon.
  vec2 reefMapUv = (xz - HOME_ISLET) / REEF_MAP_SPAN + 0.5;
  float insideMapAcross = step(abs(reefMapUv.x - 0.5), 0.49);
  float insideMapDown = step(abs(reefMapUv.y - 0.5), 0.49);
  float coralHeadTop = texture2D(uReefMap, reefMapUv).r * insideMapAcross * insideMapDown;
  if (coralHeadTop > 0.02) waterDepth = min(waterDepth, max(vWaterPosition.y - (coralHeadTop * 8.0 - 8.0), 0.05));

  float sunShows = 1.0 - uNight;
  float waveFoam = vWaveState.x;
  float metresOffBeach = vWaveState.y;
  // (the same as a distance along the reef, whose zones lie at the same such distances all round: shore.glsl)
  float reefDistance = alongReef(metresOffBeach, directionFromCentre);
  float waveHeight = vWaveState.z;

  // ---- The detail texture ----

  // (All seven readings of the detail texture are made here, outside any branch: docs/DEVICE_NOTES.md.)

  // Ripples: the detail texture read four times, from 37 m across down to 1.3 m, each copy turned and drifting its
  // own way, so the eye finds no repeat. Far away the GPU blends each copy smooth by itself.
  vec4 ripplesLarge = texture2D(uDetail, xz * 0.027 + uTime * vec2(0.006, 0.004));
  vec2 turnedForMedium = vec2(xz.x * 0.8 - xz.y * 0.6, xz.x * 0.6 + xz.y * 0.8);
  vec4 ripplesMedium = texture2D(uDetail, turnedForMedium * 0.071 + uTime * vec2(-0.011, 0.013));
  vec2 turnedForSmall = vec2(xz.x * 0.28 + xz.y * 0.96, -xz.x * 0.96 + xz.y * 0.28);
  vec4 ripplesSmall = texture2D(uDetail, turnedForSmall * 0.23 + uTime * vec2(0.031, 0.017));
  vec2 turnedForFine = vec2(-xz.x * 0.71 + xz.y * 0.71, -xz.x * 0.71 - xz.y * 0.71);
  vec4 ripplesFine = texture2D(uDetail, turnedForFine * 0.77 + uTime * vec2(-0.05, -0.06));

  // Once more stretched twice along the wind, for the white horses' foam: read here and not inside their branch.
  vec2 windStreaksUv = vec2(dot(xz, vec2(-WIND_DIR.y, WIND_DIR.x)) * 0.16, dot(xz, WIND_DIR) * 0.07);
  vec4 windStreaks = texture2D(uDetail, windStreaksUv + uTime * vec2(0.008, 0.02));

  // A reading laid out along the shore and stretched 3.6 times across it: streaks that run the way the waves travel
  // (foam drawn out behind white water, lines pulled up a wave's face). Its coordinates have a seam on the west side
  // of the atoll (direction = +-pi), so it is faded out just there.
  vec4 shoreStreaks = texture2D(uDetail, vec2(directionFromCentre * 25.4648, metresOffBeach * 0.035 - uTime * 0.004));
  float awayFromSeam = smoothstep(0.0, 0.08, HALF_TURN - abs(directionFromCentre));
  float shoreStreak = mix(0.5, shoreStreaks.a * 0.6 + shoreStreaks.b * 0.4, awayFromSeam * (1.0 - uIsFlatSheet));

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
  vec2 g4 = ripplesFine.rg - 0.5;
  vec2 mediumSlope = vec2(g2.x * 0.8 + g2.y * 0.6, -g2.x * 0.6 + g2.y * 0.8);
  vec2 smallSlope = vec2(g3.x * 0.28 - g3.y * 0.96, g3.x * 0.96 + g3.y * 0.28);
  vec2 fineSlope = vec2(-g4.x - g4.y, g4.x - g4.y) * 0.71;
  vec2 largeRipples = (largeSlope * 0.40 + mediumSlope * 0.50) * rippleExposure;
  vec2 smallRipples = (smallSlope * 1.0 + fineSlope * 0.85) * (0.70 + 0.30 * rippleExposure) * gust;
  vec2 surfaceSlope = largeRipples + smallRipples;
  // The wind ruffles the surface (windOverUsual = 1 in the island's usual breeze): none of it in a calm - the water
  // is glass - a little in a light air, more than usual when it blows fresh. The swell below is not the wind's and
  // stays.
  float ruffling = windOverUsual < 1.0 ? pow(max(windOverUsual, 1e-4), 1.4) : 1.0 + 3.6 * (windOverUsual - 1.0);
  surfaceSlope *= ruffling;

  // ---- Swell lines ----

  // Out beyond the reef the sea rolls in as long low lines. Out there they are not modelled, only shaded - each line
  // tilts the surface a little towards the island on its face and away on its back, which is what makes swell show
  // as dark and light bands. The shading takes over where the modelled waves fade out, past the drop-off, and fades
  // away far out. First the swells that break on the reef (waves.glsl), before they have grown, by the wave model's
  // own clock; then, further out, shorter lines of the open sea's own, as rings round the island. All are wobbled a
  // little far out so that the lines are not ruled.
  float swellMetresOffshore = mix(metresOffBeach, distanceFromCentre - oceanShoreRadius, uIsFlatSheet);
  float swellAlongReef = alongReef(swellMetresOffshore, directionFromCentre);
  float pastModelledWaves = smoothstep(WAVE_MESH_FADES_FROM, WAVE_MESH_ENDS, swellAlongReef);
  float notFarOut = 1.0 - smoothstep(WAVE_MESH_ENDS + 150.0, WAVE_MESH_ENDS + 470.0, swellAlongReef);
  // (strongest on the side the swell comes from, the south; faint in the atoll's lee)
  float facingSwell = 0.28 + 0.72 * smoothstep(-0.4, 0.8, sin(directionFromCentre));
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

  // ---- What the surface mirrors ----

  vec3 waveNormal = normalize(vWaterNormal);
  vec3 normal = normalize(waveNormal + vec3(-surfaceSlope.x, 0.0, -surfaceSlope.y));
  if (dot(normal, towardsCamera) < 0.0) normal = -normal;
  // How much sky the surface mirrors. A real sea is too rough to be a perfect mirror even at the horizon.
  float fresnel = 0.02 + 0.98 * pow(clamp(1.0 - dot(normal, towardsCamera), 0.001, 1.0), 5.0);
  // (a calm sea is a true mirror at a low angle)
  fresnel *= 1.0 - mix(0.40, 0.14, slick) * min(uWind * 2.3, 1.0) * fresnel;
  // (a ray mirrored down into the water is turned back up to the sky)
  vec3 mirrored = reflect(-towardsCamera, normal);
  mirrored.y = abs(mirrored.y) + 0.02;
  mirrored = normalize(mirrored);
  // (ruffled water mirrors the sky from higher up, where it is bluer: gust patches read darker than the slicks)
  float ruffledLooksHigher = (1.0 - slick) * (0.12 + 0.14 * max(windOverUsual - 1.0, 0.0));
  vec3 skyMirrored = mix(uSkyHorizon, uSkyOverhead, pow(clamp(mirrored.y + ruffledLooksHigher, 0.0, 1.0), 0.5));
  if (fresnel > 0.05) {
    // The clouds, mirrored: the same sky pictures the sky shows, looked up in the mirrored direction. The sky
    // slides each picture by how far the clouds have drifted since it was drawn (sky.frag.glsl); here that is
    // left out. The mirrored clouds lag by a degree or two at most, less than the waves smear them, and the
    // slide would cost every water pixel two more texture reads.
    float across = atan(mirrored.z, mirrored.x) / FULL_TURN + 0.5;
    float up = -0.5 + sqrt(0.25 + 2.0 * asin(clamp(mirrored.y, 0.0, 1.0)) / QUARTER_TURN);
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

  // The sun and the moon mirrored: a broad sheen, and the sun's glitter on the ripples.
  float towardsSun = max(dot(mirrored, uSunDirection), 0.0);
  vec3 glints = uSunColour * pow(towardsSun, 60.0) * 0.06 * sunShows;
  if (towardsSun > 0.985) {
    float glitter = smoothstep(0.56, 0.86, noise(xz * 17.0 + vec2(uTime * 3.0, -uTime * 2.4)));
    glints += uSunColour * pow(towardsSun, 340.0) * 7.0 * glitter * sunShows * min(uWind * 2.3, 1.3);
  }
  // (on glassy water the sun is mirrored whole, not scattered into glitter)
  glints += uSunColour * pow(towardsSun, 900.0) * 5.0 * (1.0 - smoothstep(0.0, 0.4, uWind)) * sunShows;
  float towardsMoon = max(dot(mirrored, normalize(MOON_DIRECTION)), 0.0);
  glints += MOONLIGHT * (pow(towardsMoon, 180.0) * 1.6 + pow(towardsMoon, 20.0) * 0.10) * uNight;

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
  float liftedWater = min(max(vWaveState.z, 0.0), max(waterDepth, 0.0));
  float seaUnderLift = max(waterDepth - liftedWater, 0.0);
  // The ray goes down through the lifted water into the sea, unless it comes out of the far side first. If it
  // does, and it is running level or upwards, the eye sees the light behind the wave: the sky, and the sun in the
  // water. (A ray going down through a crest comes out only to go into the sea beyond: that is as much water as
  // if the crest had no far side.)
  float pathToSea = liftedWater / wayDown;
  float pathToFarSide = vWaterBehind / wayAlong;
  float runsLevel = 1.0 - smoothstep(0.12, 0.55, wayDown);
  float seesThrough = smoothstep(0.7, 1.5, pathToSea / max(pathToFarSide, 1e-3)) * runsLevel;
  float pathInLift = mix(pathToSea, min(pathToSea, pathToFarSide), runsLevel);
  float pathSeen = pathInLift + (1.0 - seesThrough) * seaUnderLift / max(wayDown, LEAST_WAY_DOWN);
  float seenDepth = pathSeen * wayDownIfFlat;
  // (the lagoon's shore band keeps its own rules for now; and the switch)
  float byPath = uColourByPath * (1.0 - uIsShoreBand);
  float colourDepth = mix(waterDepth, seenDepth, byPath);
  float lightThrough = seesThrough * byPath
    * (1.0 - smoothstep(0.4 * NO_LIGHT_THROUGH, NO_LIGHT_THROUGH, pathInLift));

  // ---- The colour of the water itself ----

  // (The lagoon's water is coloured as any other water of its depth is: only the wind treats it differently.)
  vec3 shallows = mix(OVER_SAND_AQUA, TURQUOISE, smoothstep(0.6, 3.2, colourDepth));
  vec3 waterColour = mix(shallows, OCEAN_BLUE, smoothstep(3.0, 16.0, colourDepth));
  // (the light behind a wave, seen through it: pale through a sheet, green through a body of water)
  vec3 throughWave = mix(LIGHT_THROUGH_THIN, LIGHT_THROUGH_THICK, smoothstep(0.1, 2.4, pathInLift));
  waterColour = mix(waterColour, throughWave, lightThrough);
  float facingSun = clamp((surfaceSlope.x * uSunDirection.x + surfaceSlope.y * uSunDirection.z) * 4.0, 0.0, 1.0);
  waterColour += SUNLIT_RIPPLE_TINT * facingSun * uDaylight;
  waterColour *= 0.96 + 0.09 * slick;
  // A wave standing up lets the light through: its face glows green.
  float inSurfZone = 1.0 - smoothstep(FORE_REEF_BEGINS + 25.0, DROP_OFF_BEGINS + 10.0, reefDistance);
  waterColour = mix(waterColour, WAVE_GLOW_GREEN, clamp(waveHeight * 1.5, 0.0, 0.6) * inSurfZone * (1.0 - byPath));
  // (The lagoon's shore waves, where they have real height: clear water, so their backs show little but the sky
  // they mirror; a steep face is a small wall of water, and there you look into its green.)
  float bandSteepness = clamp((1.0 - waveNormal.y) * 4.0, 0.0, 1.0) * uIsShoreBand;
  waterColour = mix(waterColour, SHORE_WAVE_GREEN, clamp(bandLift * 2.0, 0.0, 0.35));
  waterColour = mix(waterColour, SHORE_WAVE_FACE_GREEN, bandSteepness * 0.75);
  // The steep face of a breaking wave is a wall of water: you look into it, not through it. Dark at the foot where
  // it is thick, bright green towards the lip where it thins.
  float steepFace = smoothstep(0.992, 0.80, abs(waveNormal.y)) * inSurfZone * (1.0 - uIsFlatSheet) * (1.0 - byPath);
  float towardsLip = smoothstep(-0.3, 1.1, waveHeight);
  // (a small wave in shallow water - the shore break - is never that dark: there is white sand close behind it)
  float sandBehind = 0.9 * (1.0 - smoothstep(0.5, 1.9, waterDepth));
  vec3 faceColour = mix(WAVE_FACE_FOOT, WAVE_FACE_LIP, max(towardsLip, sandBehind)) * (0.82 + 0.36 * shoreStreak);
  waterColour = mix(waterColour, faceColour, steepFace * 0.92);
  // Aerated water: where waves have just broken the water is full of bubbles and turns pale and milky.
  waterColour = mix(waterColour, AERATED_WATER, clamp(waveFoam * 0.8, 0.0, 0.72));
  waterColour *= mix(LOW_SUN_WATER_TINT, vec3(1.0), uDaylight) * (1.0 - 0.82 * uNight);

  // ---- How much the water hides what is under it ----

  // (a film of water a few centimetres deep on the sand is all but invisible: no tint, no dark edge)
  float opacity = mix(0.07, 1.0, smoothstep(0.15, 5.6, colourDepth)) * smoothstep(0.0, 0.4, waterDepth);
  // (a wave the light comes through still hides what is behind it)
  opacity = max(opacity, lightThrough * 0.95);
  opacity = max(opacity, (clamp(bandLift * 2.2, 0.0, 0.28) + bandSteepness * 0.5) * smoothstep(0.05, 0.25, waterDepth));
  // (raised water is thick water - except the sheet running up the beach, which is raised but paper-thin)
  float thickness = smoothstep(0.08, 0.5, waterDepth);
  opacity = max(opacity, smoothstep(0.12, 0.45, waveHeight) * 0.82 * inSurfZone * thickness * (1.0 - byPath));
  opacity = max(opacity, steepFace * 0.97 * thickness);
  // where the swell breaks the water is churned up and never quite clear
  float churnedUp = 0.5 * smoothstep(CREST_BEGINS + 10.0, CREST_BEGINS + 20.0, reefDistance)
    * (1.0 - smoothstep(FORE_REEF_BEGINS + 12.0, FORE_REEF_BEGINS + 24.0, reefDistance));
  opacity = max(opacity, churnedUp * smoothstep(0.3, 1.2, waterDepth));
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
  vec3 colour = (mix(waterColour, skyMirrored, fresnel) + glints) * (1.0 - 0.13 * swellLineSide);

  // ---- White horses ----

  // In a high wind the chop crests and breaks: a stretch of a crest turns white and tumbles for a couple of seconds,
  // and the foam it leaves lies on the water behind it, thinning to lace and fading as the crest runs on. Two
  // families of crests cross, 28 degrees either side of the wind, so that there are no rows and so that from any
  // side some crests are seen broadside on. In sheltered water - the lagoon, and the reef flat between the ocean
  // beach and the breakers - they are a third the size, lower and fewer, and leave little foam (on the reef flat
  // less still); in the lagoon only where it is deep, and none among the breakers themselves.
  // windFoam: foam lying on the water (the lagoon's shore waves add theirs below); whiteCrests: crests standing up.
  float sheltered = max(inLagoon, step(reefDistance, FORE_REEF_BEGINS - 2.0));
  float windFoam = 0.0;
  float whiteCrests = 0.0;
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
    float ragged = (ripplesMedium.b - 0.5) * 0.2 + (ripplesSmall.b - 0.5) * 0.12;
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
    windFoam = max(familyA.x, familyB.x) * (1.0 - mix(0.4, 0.3, inLagoon) * sheltered);
    // (right under the eye a crest is drawn by its foam alone)
    whiteCrests = max(familyA.y, familyB.y) * smoothstep(4.0, 18.0, levelDistance);
  }

  // ---- The lagoon's shore waves ----

  // From a medium wind up, small waves come ashore on the lagoon's beaches (lagwave.glsl; terrain-colour.glsl draws
  // what they do on the sand; in a high wind the band mesh gives them height). The water there is too clear and thin
  // to show much: ahead of each crest its face is a faint darker band (there you look into the water, not at the
  // sky), its back a thin line of sky; from where it breaks - the bigger the wave, the further out - it is white.
  if (inLagoon > 0.5 && depthOverSand < 1.6) {
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

  // ---- Foam ----

  // The wave model says how much (waveFoam); the detail texture turns that into lace where it is thin and a white
  // sheet with holes where it is thick (soft patches only, further away, where the lace would be too fine to see).
  // The pattern drifts slowly with the ripples instead of racing ashore.
  float laceNear = max(ripplesSmall.a, ripplesFine.a * 0.9) * 0.6 + (ripplesSmall.b + ripplesFine.b) * 0.2;
  float laceFar = 0.22 + ripplesMedium.b * 0.36 + ripplesLarge.b * 0.30;
  float lace = mix(laceNear, laceFar, smoothstep(8.0, 30.0, cameraDistance)) * 0.62 + shoreStreak * 0.38;
  float foam = 0.0;
  // (where the lace pattern is above this the foam is white, below it blue-grey)
  float whiteLaceThreshold = 0.3;
  if (uIsFlatSheet < 0.5 && (waveFoam > 0.003 || waterDepth < 0.09 || metresOffBeach < 16.0)) {
    // only foam the waves made; no standing lace along the beach
    float foamAmount = clamp(waveFoam * (0.75 + 0.5 * ripplesMedium.b), 0.0, 1.0);
    // the sheet of water sliding up and down the sand carries a white edge and a little lace, not a grey veil
    float offTheSheet = max(smoothstep(0.03, 0.15, waterDepth), smoothstep(0.4, 0.8, waveFoam));
    foamAmount *= mix(0.3, 1.0, offTheSheet);
    whiteLaceThreshold = max(laceThreshold(foamAmount), -0.05);
    foam = foamAsLace(foamAmount, lace, cameraDistance);
    // from far off the lace is too fine to see: thin foam then reads as a pale veil, patchier where it is thinner
    float veil = clamp(foamAmount * (0.30 + 1.1 * lace), 0.0, 1.0);
    foam = mix(foam, veil, smoothstep(12.0, 55.0, cameraDistance) * offTheSheet);
    foam = max(foam, smoothstep(0.72, 1.0, waveFoam) * (0.55 + 0.45 * smoothstep(0.3, 0.7, lace)));
    // a line of foam at the very edge of moving water (not round a still puddle lying in a dip in the sand)
    float waterEdge = 1.0 - smoothstep(0.0, 0.06, waterDepth);
    foam = max(foam, waterEdge * smoothstep(0.45, 0.75, lace + 0.15) * smoothstep(0.06, 0.22, waveFoam));
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
    float whitecapFoam = foamAsLace(windFoam, windLace, cameraDistance);
    float veil = clamp(smoothstep(0.2, 0.85, windFoam) * (0.45 + 1.1 * windLace), 0.0, 1.0);
    whitecapFoam = mix(whitecapFoam, veil, smoothstep(12.0, 55.0, cameraDistance)) * (1.0 - 0.3 * inLagoon);
    whitecapFoam = max(whitecapFoam, whiteCrests * (0.82 + 0.18 * smoothstep(0.3, 0.6, lace)));
    foam = max(foam, whitecapFoam);
    whiteLaceThreshold = min(whiteLaceThreshold, mix(0.3, -0.05, max(windFoam, whiteCrests)));
  }

  // Foam is white where it is thick and blue-grey where it thins; the ripples under it catch the sun, so it looks
  // frothy.
  float closeUp = 1.0 - smoothstep(5.0, 22.0, cameraDistance);
  float froth = clamp(0.97 + dot(smallSlope + fineSlope, uSunDirection.xz) * 1.1 * closeUp, 0.84, 1.07);
  vec3 foamColour = mix(LOW_SUN_FOAM, vec3(1.0), uDaylight) * (1.0 - 0.75 * uNight) * froth;
  // close up, even thick foam is a mass of bubbles with water showing between them
  foam *= 1.0 - 0.45 * (1.0 - smoothstep(0.25, 0.75, ripplesFine.a)) * (1.0 - smoothstep(3.0, 14.0, cameraDistance));
  // no foam at all on water a few centimetres deep unless the wave model put plenty there (the white edge of the swash)
  foam *= max(smoothstep(0.03, 0.10, waterDepth), smoothstep(0.2, 0.4, waveFoam));
  foam = min(foam, 0.94);
  vec3 foamThickness = mix(THIN_FOAM, vec3(1.08), smoothstep(whiteLaceThreshold, whiteLaceThreshold + 0.26, lace));
  // (the foam is lit as a rougher surface than the water: the ripples' tilt counts for more close up, and the lace
  // and the streaks give it lumps of its own)
  vec3 rippleTilt = vec3(-smallSlope.x - fineSlope.x, 0.0, -smallSlope.y - fineSlope.y)
    * (1.5 + 3.5 * (1.0 - smoothstep(4.0, 30.0, cameraDistance)));
  vec3 lumps = vec3(shoreStreak - 0.5, 0.0, lace - 0.5) * 0.9;
  vec3 foamNormal = normalize(waveNormal + rippleTilt + lumps);
  vec3 foamShade = mix(SHADED_FOAM, vec3(1.06), clamp(dot(foamNormal, uSunDirection) * 1.1 + 0.2, 0.0, 1.0));
  colour = mix(colour, foamColour * foamThickness * foamShade, foam);
  // water under a few cm deep is invisible unless it carries foam
  opacity = max(opacity * smoothstep(0.01, 0.12, waterDepth), foam * smoothstep(0.0, 0.045, waterDepth));

  // ---- Haze, the view from under water, and the debug colour ----

  // haze towards the horizon, much less when looking down from high up
  float haze = 1.0 - exp(-cameraDistance * 0.00042 * (1.0 - 0.8 * clamp(towardsCamera.y, 0.0, 1.0)));
  colour = mix(colour, uSkyHorizon, haze);
  opacity = mix(opacity, 1.0, haze);
  if (uUnderWater > 0.5) {
    colour = seenFromUnderWater(xz, towardsCamera, cameraDistance);
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
  gl_FragColor = vec4(colour, opacity);
}
