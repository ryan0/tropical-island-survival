// The colour of the ground: dry and wet sand, the stones, litter and low plants that lie on it inland, footpaths,
// rock, the reef flat, what the water over it does to its colour, and the net of light that ripples throw on the
// sea floor.
//
// terrain.ts puts this block, in braces, inside three.js's Lambert fragment shader just after <color_fragment>. It
// replaces diffuseColor.rgb outright, so three.js's lighting and shadows still apply to it; and it sets netOfLight
// and shadowFilledIn, which say what the water does to the sun's light (shaders/sunlight-under-water.ts).
// Needs from three.js: diffuseColor, and the ground's grit picture: the material's map, vUv, and texelColor (the map
//   already read at vUv). Only the map's green is grit: its red and blue are the slopes of the sea floor's sand
//   ripples (ground-grit.ts).
// Needs from terrain-declarations.glsl: the uniforms and the varying vGroundPosition; groundNoise, groundFbm and
//   randomsOf; coverOf, litAgainstSun and dimples; and from the chunks it includes: footpathDistance (footpaths.glsl);
//   openSea and the reef's zones (island-shape/shore.glsl); lagHi, lagEx, lagExposure, lagWave, lagFoam and LW_T
//   (lagwave.glsl); the net of light's readings and lightOfNet (light-net.glsl). The shore's shape, the
//   reef's cover, the turf's broad patterns, what stands over the ground and what lies on it, it reads from
//   pictures (uShoreRound, uReefCover, uTurfPatterns, uTreeCover, uGravelTile, uLitterTile, uLowPlantsTile).
// Needs the defines TERRAIN_HOME and REEF_MAP_SPAN (the middle, and the side, of the square round home that the
//   reef's map covers), CLOUD_SHADE_SPAN_M, CAUSTICS_BRIGHTEST (caustics-texture.ts), and for each ground tile
//   its span in metres and the share of it its things cover (GRAVEL_TILE_SPAN, GRAVEL_FULL_COVER and so on),
//   written by terrain.ts.

// ---- Numbers to retune ----
// (heights are metres above still sea level, depths metres of water, distances metres from the camera)

// Beyond this depth the sea floor is plain sand: it is only ever seen dimly, through the water or when diving.
const float PLAIN_FLOOR_DEPTH = 8.6;
const vec3 PLAIN_FLOOR_SAND = vec3(0.77, 0.72, 0.61);

// Each close-up detail fades with distance; beyond where it has faded to nothing it is not worked out at all.
const float DIMPLES_WITHIN = 120.0;
const float WIND_RIPPLES_WITHIN = 90.0;
const float SHELLS_WITHIN = 45.0;

// The highest a lagoon wave can run up the sand, as a height.
const float LAGOON_RUN_UP = 0.42;
// The band of heights that the water's edge wets: from this far under the still sea (and as much lower again as
// the lagoon's waves stand high) to this far above it. Below it nothing that the wet sand, the swash's lines and
// the lagoon's film and foam add is anything but exactly nothing, and above it likewise: change these only with
// the numbers in "Wet sand towards the water", which they bound.
const float WETTED_FROM = -0.4;
const float WETTED_TO = 1.0;
// Loose dry sand, with its dimples and wind ripples, lies no higher than this.
const float LOOSE_SAND_TO = 2.1;

// The share of the light left where the clouds let no sunlight through.
const float CLOUD_SHADOW_LIGHT = 0.45;

// The sea floor seen through ripples: how far its markings swim under them (metres, in water over a metre deep);
// and how much of the net of light they throw on it (light-net.glsl) there is out on the ocean's reef, against
// the middle of the lagoon.
const float FLOOR_SWIMS = 0.3;
const float NET_ON_OUTER_REEF = 0.45;
// How far a shadow on ground as bright as white is filled in by the light the ground round it throws back (sand
// is about 0.85 as bright, and turf 0.4).
const float GROUND_FILLS_SHADOWS = 0.5;

// The colours of the ground.
// (The sand is kept well under 1: in full sun the lighting multiplies it by about 1.3, and sand that clips to pure
// white shows no relief.)
const vec3 WARM_SAND = vec3(0.722, 0.715, 0.703);
const vec3 GREY_SAND = vec3(0.706, 0.71, 0.712);
// Inland the sand is a shade greyer than the beach's, for the dust of old leaves (the sand's colour is multiplied
// by this); and in deep shade, where what falls rots where it lies, it and the litter are darker and browner.
const vec3 GROVE_SAND = vec3(0.85, 0.845, 0.83);
const vec3 DEEP_SHADE_STAIN = vec3(0.80, 0.76, 0.70);
// Litter that has lain in the open bleaches to straw and silver (its colour is multiplied by this).
const vec3 BLEACHED_LITTER = vec3(1.14, 1.16, 1.18);
// A path's gravel is trodden a little darker than loose gravel.
const float PATH_TRODDEN = 0.95;
// The pictures' own colours are multiplied by these, to bring each to what the photographs measure with the game's
// light on it (docs/LOOK.md, "Colour, measured"): the gravel a grey with next to no colour in it (the sun's
// light warms it), the litter a greyer straw.
const vec3 GRAVEL_TINT = vec3(0.84, 0.845, 0.855);
// (A stone lying by itself on sand is bleached nearly as pale as the sand: it is a bank of them that is grey.
// As dark as the bank's, a scatter of stones on white sand was a leopard's coat.)
const vec3 LONE_STONE_TINT = vec3(1.04, 1.035, 1.03);
const vec3 LITTER_TINT = vec3(0.99, 0.975, 0.94);
const vec3 ROCK_GREY = vec3(0.46, 0.44, 0.39);
const vec3 BROWN_CORAL = vec3(0.30, 0.25, 0.17);
const vec3 OLIVE_CORAL = vec3(0.13, 0.23, 0.15);
const vec3 DARK_REEF_ROCK = vec3(0.40, 0.37, 0.31);
const vec3 PALE_REEF_ROCK = vec3(0.68, 0.64, 0.56);
const vec3 PINK_CRUST = vec3(0.76, 0.58, 0.60);
// The old reef round a coral head begins where the water is this deep, and is all there by the second depth (m).
const vec2 OLD_REEF_BELOW = vec2(0.45, 1.3);

// What lies on the ground (ground-tiles.ts), each as an amount from 0, none, to 1, as thick as its picture was
// painted. The pictures' single things show within the first distance and have blurred to an average by the second.
const vec2 THINGS_SHOW_WITHIN = vec2(9.0, 30.0);
// The land's cover comes in between these heights of the plants' wandering edge (metres above the sea).
const vec2 INLAND_BETWEEN = vec2(1.74, 1.84);
// Stones: a scatter inland; in a bank of gravel; in the band of rubble at the back of the beach. And on a path.
const vec3 STONES = vec3(0.34, 0.97, 0.9);
const float STONES_ON_PATH = 0.5;
// A bank of gravel comes in between these values of the land's broad pattern (-1 to 1): the higher, the less of
// the islet is gravel and the more of it sand.
const vec2 GRAVEL_BANKS = vec2(0.15, 0.6);
// In a whole bed of gravel a stone's rank stands for its height: how strongly that is shaded against the sun.
const float BED_RELIEF = 0.7;
// Litter: along the back of the beach; everywhere inland; more under a crown.
const vec3 LITTER = vec3(0.1, 0.28, 0.72);
// The wrack the sea leaves along the tide line: how thickly, at most; and how much darker than the trees' litter
// (its colour is multiplied by this).
const float WRACK = 0.42;
const vec3 WRACK_DARKER = vec3(0.62, 0.58, 0.54);
// Low plants inland: on middling ground; more where it is lush; more at a shrub's foot.
const vec3 LOW_PLANTS = vec3(-0.25, 1.1, 0.5);
// How high stones and litter stand off the ground, in centimetres, for the shadows they throw; and the lowest
// sun those are worked out for (the upward part of the unit vector towards it): lower, they would be endless.
const float STONES_STAND = 2.5;
const float LITTER_STANDS = 1.2;
const float LOWEST_SUN_FOR_SHADOWS = 0.3;

// The ripples in the sand of a shallow floor: they come in between the first two depths and are gone between
// the last two (metres of water); and how strongly a ripple is shaded by its slope towards the sun.
const vec4 RIPPLES_BETWEEN = vec4(0.25, 0.7, 4.0, 7.0);
const float RIPPLE_SHADE = 0.6;
// The gravel picture's average brightness (ground-tiles/gravel-tile.ts gives about this), and how strongly a
// stone of it is shaded against the sun on the sea floor.
const float GRAVEL_AVERAGE = 0.6;
const float RUBBLE_RELIEF = 0.5;
// How much of the rubble's light and dark shows on the reef's hard floor; how thickly dead coral lies on the old
// reef round a head (0 none to 1 a whole bed); and what its colour is multiplied by (it is grey-brown under a
// fuzz of algae, not the bleached white of the beach's).
const float RUBBLE_ON_THE_REEF = 0.7;
const float RUBBLE_ROUND_A_HEAD = 0.55;
const vec3 DEAD_CORAL_TINT = vec3(0.98, 0.95, 0.86);

// ---- Where this point is ----

float height = vGroundPosition.y;
vec2 xz = vGroundPosition.xz;
float waterDepth = max(uSeaLevel - height, 0.0);
// (how much the depth changes across a pixel, for the lines of equal depth: worked out here, before any branch)
#ifdef CAN_MEASURE_ACROSS_A_PIXEL
float depthAcrossPixel = max(fwidth(waterDepth), 1e-5);
#endif

// (uCameraPosition, not three.js's cameraPosition: three.js does not fill that in for this kind of material, and for a long time
// every close-up detail below was faded out as if the camera stood in the middle of the lagoon)
vec3 toCamera = uCameraPosition - vGroundPosition;
float cameraDistance = length(toCamera);
float nearness = exp(-cameraDistance * 0.05);   // how much close-up detail shows: 1 at the camera, gone by 90 m
// (and for the pictures of what lies on the ground: 0 where their single things show, 1 where they have blurred)
float farOff = smoothstep(THINGS_SHOW_WITHIN.x, THINGS_SHOW_WITHIN.y, cameraDistance);

// Which side of the land this is: lagoonSide is 1 on the lagoon's side (still water, no surf), 0 on the ocean's.
// (The shore's shape in this direction is read from its picture, which the water's shader reads too: the ocean
// shoreline's distance from the centre, the reef's share of its full width, the land's width.)
float directionFromCentre = atan(xz.y, xz.x);
vec4 shoreRound = texture2D(uShoreRound, vec2(directionFromCentre / FULL_TURN + 0.5, 0.5));
float shoreRadius = shoreRound.r + SHORE_ROUND_FROM;
float landWidth = shoreRound.b;
float metresOffshore = length(xz) - shoreRadius;   // outside the ocean beach line (negative inland)
float lagoonSide = 1.0 - smoothstep(-0.7, -0.4, metresOffshore / landWidth);

vec2 towardsSun = normalize(uSunDirection.xz + 1e-4);

// ---- The net of light, and the grit ----

// The net of light that ripples throw on the sea floor (light-net.glsl, which the rocks and the coral share). The
// same readings give the lace of the foam on the lagoon's sand. (Read here, before any branch:
// docs/DEVICE_NOTES.md.)
vec2 lightNetUv = lightNetUvAt(xz, uTime);
vec4 smallWaves = texture2D(uDetail, smallWavesUvAt(lightNetUv, uTime));
vec2 lightNetWobble = netWobbleOf(smallWaves);
// The floor is seen through those small waves, and each bends the eye's line a little as it passes: the floor's
// markings swim under them, further the deeper the water. (Only its markings: the ground's shape, and the shadows
// on it, stay where they are. And only for an eye above the water, with the sea not drained: uDebugMode 5.)
float seenThroughSurface = step(uSeaLevel, uCameraPosition.y) * step(uDebugMode, 4.5);
xz += (smallWaves.rg - 0.5) * FLOOR_SWIMS * smoothstep(0.1, 1.2, waterDepth) * seenThroughSurface;

// Grit: the ground's speckle picture (the material's own map, which three.js has already read into texelColor).
// Everything below replaces the colour outright, so the speckle is put back at the end; it fades out with distance.
// It is read twice: grain close up (a dot is 1.4 cm), and the same picture four times larger for mottling further
// off.
float fineGrit = (texelColor.g - uGritAverage) * exp(-cameraDistance * 0.02);
float coarseGrit = (texture2D(map, vUv * 0.23 + 0.37).g - uGritAverage) * 0.10 * exp(-cameraDistance * 0.006);
float grit = (fineGrit + coarseGrit) * (1.0 - 0.75 * smoothstep(0.0, 0.5, waterDepth));

// What lies on the ground, from its pictures (ground-tiles.ts). They have mipmaps, so they are read here, before
// any branch. Each is laid at an angle of its own, so that the three never repeat together.
vec2 onGround = xz;
vec4 gravelTile = texture2D(uGravelTile, onGround / GRAVEL_TILE_SPAN);
vec4 litterTile = texture2D(uLitterTile,
  vec2(onGround.x * 0.8 - onGround.y * 0.6, onGround.x * 0.6 + onGround.y * 0.8) / LITTER_TILE_SPAN);
vec4 lowPlantsTile = texture2D(uLowPlantsTile,
  vec2(onGround.x * 0.6 + onGround.y * 0.8, onGround.y * 0.6 - onGround.x * 0.8) / LOW_PLANTS_TILE_SPAN + 0.37);
// (The stones and the litter are read once more, a shadow's length towards the sun: a thing that stands a
// finger's breadth off the ground throws a shadow behind it and catches the light on its sunward edge, and
// without that a painted stone is a stain. The shadow is longer the lower the sun.)
vec2 shadowOfACentimetre = 0.01 * uSunDirection.xz / max(uSunDirection.y, LOWEST_SUN_FOR_SHADOWS);
vec2 stonesSunward = onGround + shadowOfACentimetre * STONES_STAND;
vec4 gravelTileSunward = texture2D(uGravelTile, stonesSunward / GRAVEL_TILE_SPAN);
// (The ripples that small waves leave in the sand of a shallow floor are a picture too, of their slopes: the red
// and the blue of the grit's own picture, read at a scale of their own (sand-ripples.ts). Their ridges lie across
// the way the waves come: east and west on the ocean's reef, where the swell comes from the south, and north and
// south in the lagoon, whose waves the easterly wind drives.)
vec2 sandRipples = texture2D(map, mix(onGround, onGround.yx, lagoonSide) / SAND_RIPPLES_SPAN).rb - 0.5;
vec2 litterSunward = onGround + shadowOfACentimetre * LITTER_STANDS;
vec4 litterTileSunward = texture2D(uLitterTile,
  vec2(litterSunward.x * 0.8 - litterSunward.y * 0.6, litterSunward.x * 0.6 + litterSunward.y * 0.8) / LITTER_TILE_SPAN);

// the net itself, read twice - the second time turned and finer - so that no repeat shows
vec4 lightNetRead = texture2D(uCaustics, lightNetUv + lightNetWobble);
vec4 turnedLightNetRead = texture2D(uCaustics, turnedNetUvAt(lightNetUv, lightNetWobble));
float lightNet = lightNetRead.a;
float turnedLightNet = turnedLightNetRead.a;

if (waterDepth > PLAIN_FLOOR_DEPTH) {
  diffuseColor.rgb = PLAIN_FLOOR_SAND;
} else {
  // ---- Dry sand ----

  float broadPatches = groundFbm(xz * 0.11);
  vec2 sunAlongGround = towardsSun * (1.0 - 0.45 * uSunDirection.y);
  // What the water's edge does to the sand - wet sand, the swash's lines, the lagoon's film and foam - reaches
  // from WETTED_FROM (lower where the lagoon's waves are up) to WETTED_TO and no further: outside that band every
  // part of it comes to exactly nothing, and none of it is worked out. (Most of the ground is outside it: the sea
  // floor and the land.)
  bool isByWatersEdge = height > WETTED_FROM - lagHi() && height < WETTED_TO;
  // The beach is in zones by height above the sea, each boundary wandering so that none is a contour line.
  // (The zones lie between the wetted band's foot and the top of the loose sand: nowhere else is the wander used.)
  float zoneWander = height > WETTED_FROM - lagHi() && height < LOOSE_SAND_TO ? groundNoise(xz * 0.23 + 7.0) - 0.5 : 0.0;
  float looseSand = smoothstep(0.30, 0.62, height + zoneWander * 0.2) * (1.0 - smoothstep(1.75, LOOSE_SAND_TO, height));
  // coral sand: near white, a touch warm; paler and greyer in broad patches. Most of the beach is clean.
  float broadShade = 0.94 + 0.12 * broadPatches;
  float fineShade = 0.97 + 0.06 * groundFbm(xz * 1.9);
  vec3 sand = mix(WARM_SAND, GREY_SAND, smoothstep(0.35, 0.7, broadPatches)) * broadShade * fineShade;

  // Loose dry sand is never flat. Close up it is dimpled - footprints and hollows, in two overlapping layers (a
  // third, of small ones, and half as much shading again made the beach look pocked: taken out 19 November 2026);
  // further off it rolls in low hummocks (the detail texture's small-wave field read large). Both are shaded against
  // the sun: lit on one side, darker and a little bluer on the other. Some stretches are trodden, some nearly smooth.
  vec2 hummockSlope = texture2D(uDetail, xz * 0.06).rg;
  float relief = 0.0;
  if (looseSand > 0.001) {   // (the dry beach only: skipped for the sea floor and the land)
    float trodden = 0.35 + 0.65 * smoothstep(0.3, 0.6, groundNoise(xz * 0.09 + 50.0));
    float dimpled = 0.0;
    float windRipples = 0.0;
    if (cameraDistance < DIMPLES_WITHIN) {
      vec2 turnedOnce = vec2(xz.x * 0.6 - xz.y * 0.8, xz.x * 0.8 + xz.y * 0.6);
      float largeDimples = dimples(xz * 1.5, sunAlongGround);
      float middleDimples = dimples(turnedOnce * 2.3 + 5.0, sunAlongGround);
      dimpled = (largeDimples + middleDimples) * trodden * exp(-cameraDistance * 0.03);
    }
    // where nobody has walked, the wind leaves fine ripples across the sand
    if (cameraDistance < WIND_RIPPLES_WITHIN) {
      float crests = cos(dot(xz, vec2(0.8, 0.6)) * 13.0 + 4.0 * groundNoise(xz * 0.5));
      windRipples = crests * dot(sunAlongGround, vec2(0.8, 0.6)) * 0.07 * (1.0 - trodden) * nearness;
    }
    float hummocks = dot(hummockSlope - 0.5, sunAlongGround) * 0.10 * exp(-cameraDistance * 0.010);
    relief = (dimpled + windRipples + hummocks) * looseSand;
  }
  sand *= 1.0 + relief;
  // (the shaded side of a hollow is a touch cooler, and no more: clean sand in photographs is all of one colour,
  // and with a blue shade ours was blotched)
  sand = mix(sand, sand * vec3(0.95, 0.975, 1.01), clamp(-relief * 4.0, 0.0, 1.0));

  // ---- Wet sand towards the water ----

  if (isByWatersEdge) {
    // soaked: where the swash runs, the sand is dark, tan and packed flat. damp: above it a band that is still drying,
    // in patches. Both fade out just below the waterline (under water, the sea's own colour takes over).
    // (Wet sand is dark in the air; seen through water the same sand is bright again. Only the strip the small waves
    // actually reach, up to about 45 cm above the sea, is wet, and only a shade darker.)
    float aboveWaterline = smoothstep(-0.3, 0.0, height);
    float dampPatches = groundNoise(xz * 1.3) - 0.5;
    float soaked = (1.0 - smoothstep(0.03, 0.30, height + zoneWander * 0.14)) * aboveWaterline;
    float damp = (1.0 - smoothstep(0.22, 0.60, height + zoneWander * 0.28 + dampPatches * 0.16)) * aboveWaterline;

    // The lagoon's edge has no swash: only a film of water that laps a hand's breadth up the sand and slides back.
    // So there the wet sand is a narrow strip (and paler), and lapHeight is how high the film reaches at this moment.
    float slowLap = 0.028 * sin(uTime * 1.25 + 6.0 * groundNoise(xz * 0.13));
    float quickLap = 0.012 * sin(uTime * 2.7 + xz.x * 0.9 + xz.y * 0.7);
    float lapUnevenness = 0.02 * (groundNoise(xz * 0.9) - 0.5);
    float lapHeight = 0.035 + slowLap + quickLap + lapUnevenness;

    // From a medium wind up, small waves break on the lagoon's beaches (lagwave.glsl; water.frag.glsl draws them on
    // the water) - in a high wind bigger ones. Each runs up the sand as a sheet with a foaming edge, a hand or two
    // high, and slides back before the next: then lapHeight is that sheet's edge, and the sand is wet as high as the
    // biggest of them reach.
    float shoreWaves = lagoonSide > 0.01 ? lagExposure(xz) : 0.0;
    float sheetRunningUp = 0.0;   // the sheet is still running up (its edge foams)
    float waveFoam = 0.0;   // how much foam the wave that last came in has left
    float waveLight = 0.0;   // the light the waves throw on the sand under them
    if (shoreWaves > 0.003 && height > WETTED_FROM - lagHi() && height < 0.5) {
      vec3 wave = lagWave(xz, -height, uTime);
      float sinceCrest = wave.x;
      float waveSize = wave.y;
      float nextWaveSize = wave.z;
      float wavePhase = sinceCrest / LW_T;   // 0 as a crest comes in, 1 as the next one does
      float crestJustIn = waveSize * (1.0 - smoothstep(0.0, 0.12, wavePhase));

      // (in a high wind the waves stand up, and the sun through them falls on the sand as moving bands: bright under
      // a crest, where the water gathers the light like a lens, dim under its face)
      float nextCrest = smoothstep(0.93, 1.0, wavePhase) * 0.9;
      float nextFace = smoothstep(0.72, 0.9, wavePhase) * (1.0 - smoothstep(0.9, 0.95, wavePhase)) * 0.55;
      float bands = crestJustIn * 0.9 + nextWaveSize * (nextCrest - nextFace);
      float shallowEnough = 1.0 - smoothstep(0.5, 1.4, -height);
      float deepEnough = smoothstep(0.03, 0.2, -height);
      waveLight = lagHi() * lagEx(xz) * shallowEnough * deepEnough * bands;

      // (how far a wave runs up differs along the beach - higher here, lower a few steps on - and its edge is never
      // straight; in a high wind the big ones reach a foot up: a step and a half of sand)
      float strength = min(shoreWaves, 1.0);
      float alongBeach = 0.55 + 0.9 * groundNoise(xz * 0.7 + 3.0);
      float runUp = LAGOON_RUN_UP * (1.0 - exp(-0.2 * waveSize * alongBeach * shoreWaves / LAGOON_RUN_UP));
      float sheetTop = runUp * smoothstep(0.0, 0.3, wavePhase);   // as far as the sheet has got
      float sheetEdge = sheetTop * (1.0 - smoothstep(0.3, 0.95, wavePhase));
      float edgeWobble = 0.02 * (groundNoise(xz * 3.1) - 0.5);
      float edgeDrop = 0.03 * (nextWaveSize * smoothstep(0.7, 1.0, wavePhase) + crestJustIn);
      lapHeight = lapHeight * (1.0 - 0.6 * strength) + sheetEdge + strength * (edgeWobble - edgeDrop);

      // (the foam comes up the sand with the sheet's edge: none above where that has got to)
      float reach = 1.0 - smoothstep(-0.004, 0.006, height - 0.01 - sheetTop);
      float breakerSize = waveSize * shoreWaves;
      float bigEnough = smoothstep(0.06, 0.28, breakerSize);
      sheetRunningUp = bigEnough * smoothstep(0.0, 0.08, wavePhase) * (1.0 - smoothstep(0.25, 0.6, wavePhase));
      waveFoam = lagFoam(sinceCrest, breakerSize) * reach;
    }
    float lagoonSoakedHeight = height + zoneWander * 0.03;
    float lagoonSoaked = 1.0 - smoothstep(0.07 + 0.10 * shoreWaves, 0.14 + 0.13 * shoreWaves, lagoonSoakedHeight);
    soaked = mix(soaked, lagoonSoaked * aboveWaterline, lagoonSide);
    float lagoonDampHeight = height + zoneWander * 0.10 + dampPatches * 0.08;
    float lagoonDamp = 1.0 - smoothstep(0.10 + 0.12 * shoreWaves, 0.28 + 0.14 * shoreWaves, lagoonDampHeight);
    damp = mix(damp, lagoonDamp * aboveWaterline, lagoonSide);

    float dampShows = damp * (0.6 + 0.4 * smoothstep(0.3, 0.7, groundNoise(xz * 0.4 + 21.0)));
    vec3 dampTint = mix(vec3(1.0), vec3(0.955, 0.94, 0.91), dampShows);
    vec3 soakedColour = mix(vec3(0.92, 0.895, 0.85), vec3(0.945, 0.925, 0.89), lagoonSide);
    vec3 soakedTint = mix(vec3(1.0), soakedColour, soaked);
    sand *= dampTint * soakedTint;

    // The lines each retreating wave leaves behind: thin scalloped arcs, a darker wet edge with a paler rim of dried
    // foam and fine shell above it, closer together and fainter up the beach.
    // (faint, unevenly spaced, and each one peters out along the beach: they must not read as contour lines)
    float swashHeight = height + 0.16 * groundNoise(xz * 0.33 + 3.0) + 0.03 * groundNoise(xz * 1.7);
    float betweenLines = fract(swashHeight * 5.0 + 0.35 * sin(swashHeight * 17.0));
    float lineShows = smoothstep(0.35, 0.65, groundNoise(vec2(xz.x * 0.5 + floor(swashHeight * 5.0) * 7.3, xz.y * 0.5)));
    float paleRim = smoothstep(0.0, 0.12, betweenLines) * (1.0 - smoothstep(0.12, 0.35, betweenLines)) * 0.035;
    float wetEdge = (1.0 - smoothstep(0.0, 0.06, betweenLines)) * 0.045;
    float swashLines = (paleRim - wetEdge) * lineShows * damp * (1.0 - 0.6 * soaked) * aboveWaterline
      * (1.0 - lagoonSide);
    sand *= 1.0 + swashLines;

    // soaked sand is glossy: at a low angle it mirrors the sky a little
    float grazing = 1.0 - clamp(normalize(toCamera).y, 0.0, 1.0);
    sand = mix(sand, uSkyHorizon * 0.80, soaked * smoothstep(-0.02, 0.06, height) * grazing * grazing * grazing * 0.38);

    if (lagoonSide > 0.01) {
      // Under the film the sand shows clear but a touch cooler, and glassier; at the film's leading edge a thin broken
      // thread of white (broken along the shore and in time, so that it never reads as a drawn line).
      // (the film is painted from the lapping edge down to where the water proper starts to show, 20-30 cm under the
      // still level: without that the first metre of water looks like dry sand)
      float belowLap = 1.0 - smoothstep(lapHeight - 0.004, lapHeight + 0.004, height);
      float film = belowLap * smoothstep(-0.32, -0.2, height) * lagoonSide;
      sand = mix(sand, sand * vec3(0.90, 0.94, 0.95), film * 0.8);
      sand = mix(sand, uSkyHorizon * 0.85, film * grazing * grazing * 0.36);
      float lace = max(lightNet, turnedLightNet);
      float rimWidth = mix(0.009, 0.02, sheetRunningUp);
      float onRim = exp(-pow((height - lapHeight) / rimWidth, 2.0));
      float brokenThread = smoothstep(0.42, 0.66, groundNoise(vec2(xz.x + xz.y, xz.x - xz.y) * 1.7 + uTime * 0.15));
      float foamingEdge = 0.45 + 0.55 * smoothstep(0.2, 0.6, lace);
      float rim = onRim * mix(brokenThread, foamingEdge, sheetRunningUp) * lagoonSide;
      sand = mix(sand, vec3(0.96, 0.97, 0.97), rim * mix(0.26, 0.9, sheetRunningUp) * (0.35 + 0.65 * uDaylight));
      // (the foam of a broken wave: on the sheet running up the sand, and in the last hand's depth of water, which is
      // drawn here and not by water.frag.glsl: only this shader knows just where the ground meets the water. White
      // where fresh, then lace.)
      if (waveFoam > 0.01) {
        float lacePattern = lace * 0.7 + 0.3 * groundNoise(xz * 2.3 + uTime * 0.2);
        float foamDepth = 1.0 - smoothstep(0.10, 0.2, -height);
        float foam = smoothstep(0.9 - waveFoam, 1.1 - waveFoam, lacePattern) * film * foamDepth;
        sand = mix(sand, vec3(0.90, 0.95, 0.95), film * waveFoam * 0.3);   // (the sheet itself is milky with bubbles)
        sand = mix(sand, vec3(0.97, 0.98, 0.98), foam * 0.9 * (0.35 + 0.65 * uDaylight));
      }
    }
    sand *= 1.0 + 0.3 * waveLight * uDaylight;   // (the light the lagoon's shore waves throw on the sand under them)
  }

  // ---- Shells, coral chips and pebbles ----

  // One may sit in each 30 cm square, and nearly all squares are empty - except along the line where the last high
  // tide left its drift. Each is a small round chip, pale, pink, tan or grey, with a sliver of shadow on the side
  // away from the sun.
  if (height > 0.2 && height < 2.2 && cameraDistance < SHELLS_WITHIN) {
    vec2 grid = xz * 3.3;
    vec2 square = floor(grid);
    // (its middle, across and down; whether there is one; its kind; then how oval, and two for its colour)
    vec4 placed = randomsOf(square, 8.0);
    vec4 shaped = randomsOf(square, 9.0);
    vec2 middle = placed.xy * 0.7 + 0.15;
    // (the lagoon's tide line is low and thin)
    float driftLine = mix(0.85, 0.34, lagoonSide);
    float driftWander = 0.25 * groundNoise(xz * 0.21) * (1.0 - 0.6 * lagoonSide);
    float driftWidth = mix(0.13, 0.07, lagoonSide);
    float onDrift = exp(-pow((height - driftLine - driftWander) / driftWidth, 2.0));
    float shareWithChips = 0.02 + mix(0.42, 0.16, lagoonSide) * onDrift;
    float hasChip = step(1.0 - shareWithChips, placed.z);
    float kind = placed.w;
    float radius = 0.05 + 0.10 * kind * kind;
    vec2 fromMiddle = fract(grid) - middle;
    fromMiddle.x *= 1.0 + 0.6 * shaped.x;
    float chip = smoothstep(radius, radius * 0.55, length(fromMiddle)) * hasChip;
    vec2 fromShadow = fromMiddle + sunAlongGround * radius * 0.8;
    float chipShadow = smoothstep(radius * 1.5, radius * 0.6, length(fromShadow)) * hasChip;
    vec3 paleOrPink = mix(vec3(0.96, 0.94, 0.90), vec3(0.86, 0.62, 0.52), step(0.62, kind));
    vec3 greyOrTan = mix(vec3(0.62, 0.60, 0.58), vec3(0.74, 0.60, 0.42), step(0.5, shaped.y));
    vec3 chipColour = mix(paleOrPink, greyOrTan, step(0.8, shaped.z));
    vec3 shadowed = sand * (1.0 - 0.45 * chipShadow * (1.0 - chip) * nearness);
    vec3 litChip = chipColour * (0.85 + 0.3 * dot(fromMiddle, sunAlongGround) / radius);
    sand = mix(shadowed, litChip, chip * nearness);
    // And along the same line the sea leaves its wrack: bits of weed, twig and husk, dark from the water, thinly
    // and in stretches, never a drawn line. (It is the litter's picture, darkened: ground-tiles.ts.)
    float wrackStretches = smoothstep(0.4, 0.62, groundNoise(xz * 0.17 + 31.0));
    float wrack = WRACK * onDrift * wrackStretches * (1.0 - smoothstep(0.6 * SHELLS_WITHIN, SHELLS_WITHIN, cameraDistance));
    float wrackCover = coverOf(litterTile, wrack, LITTER_FULL_COVER, farOff);
    float wrackTowardsSun = coverOf(litterTileSunward, wrack, LITTER_FULL_COVER, farOff);
    sand = mix(sand, litterTile.rgb * WRACK_DARKER, wrackCover)
      * litAgainstSun(wrackCover - wrackTowardsSun, (1.0 - farOff) * uDaylight);
  }
  diffuseColor.rgb = sand;

  if (height > -0.1) {
    // ---- Dry land, and the beach above the waterline ----

    // The ground of an atoll's islet is coral sand and gravel from shore to shore: there is no soil to speak of and
    // no lawn. What changes, going in from the beach, is what lies on it: stones thrown up by storms, the litter
    // of the trees, and the low plants that creep over it. Each is a picture of the real thing (ground-tiles.ts),
    // laid as thickly as this spot calls for: by how far inland it is, by the turf's broad patterns (read from
    // their picture: where it is lush, where dried out, the edges' wander), and by what stands over it (the map
    // of the trees: litter under a crown, creepers at a shrub's foot).
    vec4 turfPatterns = texture2D(uTurfPatterns, xz / TURF_PICTURE_SPAN + 0.5);
    float edgeWander = (turfPatterns.a * 2.0 - 1.0) * TURF_WANDER_KEPT;
    float layerHeight = height + edgeWander + (groundFbm(xz * 1.7) - 0.5) * 0.5;
    float plantsEdge = layerHeight + (groundFbm(xz * 0.9 + 3.0) - 0.5) * 1.3 + (groundNoise(xz * 3.3) - 0.5) * 0.30;
    // (0 on the open beach, 1 inland: it comes in over a broad, ragged band, in islands and tongues)
    float inland = smoothstep(INLAND_BETWEEN.x, INLAND_BETWEEN.y, plantsEdge);
    float backOfBeach = smoothstep(1.15, 1.65, layerHeight);

    if (backOfBeach > 0.0) {
      float lushness = turfPatterns.r;
      float dryness = turfPatterns.g;
      float broadWaves = turfPatterns.b * 2.0 - 1.0;
      vec4 treeCover = texture2D(uTreeCover, xz / TREE_COVER_SPAN + 0.5);
      float underCrown = treeCover.r;
      float atShrubsFoot = treeCover.g;
      float deepShade = treeCover.b;
      float patchy = groundFbm(xz * 0.33 + 40.0) - 0.5;

      float fromPath = footpathDistance(xz) + (groundNoise(xz * 0.9) - 0.5) * 0.7 + (groundNoise(xz * 4.0) - 0.5) * 0.25;
      float onPath = smoothstep(1.05, 0.72, fromPath) * inland;
      float offPath = 1.0 - smoothstep(1.9, 0.9, fromPath) * inland;

      // The sand itself, inland: a shade greyer for the dust of old leaves, and darker where the shade is deep
      // and what falls rots where it lies.
      vec3 ground = sand * mix(vec3(1.0), GROVE_SAND, max(inland, 0.6 * backOfBeach));
      ground *= mix(vec3(1.0), DEEP_SHADE_STAIN, deepShade * inland);

      // 1. Stones. A band of rubble at the back of the beach, where storms leave it; inland, banks of gravel
      // with sand between, and a scatter of stones everywhere. A path is trodden gravel.
      float rubbleBand = smoothstep(0.95, 1.3, layerHeight) * smoothstep(0.42, 0.6, groundFbm(xz * 0.5 + 13.0))
        * (1.0 - inland);
      float gravelBanks = smoothstep(GRAVEL_BANKS.x, GRAVEL_BANKS.y, broadWaves + patchy * 1.2);
      float stones = max(rubbleBand * STONES.z, inland * mix(STONES.x, STONES.y, gravelBanks));
      stones = mix(stones, STONES_ON_PATH, onPath);
      float stoneCover = coverOf(gravelTile, stones, GRAVEL_FULL_COVER, farOff);
      float stonesTowardsSun = coverOf(gravelTileSunward, stones, GRAVEL_FULL_COVER, farOff);
      // (thickest, it is the whole bed as painted, grit and all; and there a stone's rank stands for its height)
      float wholeBed = smoothstep(0.82, 0.98, stones);
      float stoneRelief = mix(stoneCover - stonesTowardsSun, BED_RELIEF * (gravelTile.a - gravelTileSunward.a),
        wholeBed);
      stoneCover = max(stoneCover, wholeBed);
      vec3 stoneTint = mix(LONE_STONE_TINT, GRAVEL_TINT, smoothstep(0.45, 0.9, stones));
      ground = mix(ground, gravelTile.rgb * stoneTint * mix(1.0, PATH_TRODDEN, onPath), stoneCover);
      float sunOnThings = (1.0 - farOff) * uDaylight;
      ground *= litAgainstSun(stoneRelief, sunOnThings);

      // 2. Litter. A thin drift along the back of the beach; inland a little everywhere, and thick under the
      // crowns it falls from. None on a path: feet clear it.
      float litter = backOfBeach * LITTER.x + inland * LITTER.y + underCrown * LITTER.z + patchy * 0.5;
      litter = clamp(litter, 0.0, 1.0) * offPath * backOfBeach;
      float litterCover = coverOf(litterTile, litter, LITTER_FULL_COVER, farOff);
      float litterTowardsSun = coverOf(litterTileSunward, litter, LITTER_FULL_COVER, farOff);
      // (it bleaches to straw and grey where the ground is dried out, and is darker in deep shade)
      vec3 litterColour = litterTile.rgb * LITTER_TINT * mix(vec3(1.0), BLEACHED_LITTER, dryness * dryness)
        * mix(vec3(1.0), DEEP_SHADE_STAIN, deepShade);
      ground = mix(ground, litterColour, litterCover) * litAgainstSun(litterCover - litterTowardsSun, sunOnThings);

      // 3. Low plants. Runners reach out over the sand from where the plants begin; inland they make mats where
      // the ground is lush and round the feet of shrubs, and leave the dry stretches and the deep shade bare.
      float runnersOut = smoothstep(1.25, 1.75, plantsEdge) * (1.0 - inland) * (0.25 + 0.5 * lushness);
      float mats = LOW_PLANTS.x + LOW_PLANTS.y * lushness + LOW_PLANTS.z * atShrubsFoot - 0.35 * dryness
        - 0.4 * deepShade + patchy * 0.9;
      float lowPlants = clamp(max(runnersOut, inland * mats), 0.0, 1.0) * offPath;
      float plantCover = coverOf(lowPlantsTile, lowPlants, LOW_PLANTS_FULL_COVER, farOff);
      ground = mix(ground, lowPlantsTile.rgb, plantCover);

      // (bare rock on the highest ground, of which the atoll has little)
      if (height > 9.5) {
        float rock = smoothstep(10.6, 12.6, height + (groundNoise(xz * 0.5) - 0.5) * 2.0);
        ground = mix(ground, ROCK_GREY * (0.7 + 0.6 * groundFbm(xz * 1.5)), rock);
      }
      diffuseColor.rgb = ground;
    }
  }
}

// ---- Cloud shadows and grit ----

// The sun lamp is already dimmed by however much cloud stands between the sun and the camera (lights.ts); this adds
// the difference between here and there, so that a shadow's edge can be seen crossing the ground.
float sunThroughCloudHere = texture2D(uCloudShadeMap, xz / CLOUD_SHADE_SPAN_M + 0.5).r;
float lightHere = mix(CLOUD_SHADOW_LIGHT, 1.0, sunThroughCloudHere);
float lightAtCamera = mix(CLOUD_SHADOW_LIGHT, 1.0, texture2D(uCloudShadeMap, uCameraPosition.xz / CLOUD_SHADE_SPAN_M + 0.5).r);
diffuseColor.rgb *= lightHere / lightAtCamera;
diffuseColor.rgb *= 1.0 + grit * 0.55;

if (waterDepth > 0.0) {
  // ---- The reef flat ----

  // Coral under water. In the lagoon, dark coral heads and sea-grass beds mottle the sand (what makes a lagoon look
  // like one from above). On the reef, coral and rock cover the high ground - the gardens' mounds, the crest, the
  // fore reef's spurs - and sand lies in the pools, the grooves and the channel: dark and pale follow the shape of
  // the floor, as they do on a real reef seen from the air. A few heads are scattered over the shallows' sand.

  // First the sand's own ripples, where the water is deep enough to be still at the edge and shallow enough for
  // the waves to reach the floor: lit on the side towards the sun, in patches that fade out. (Their picture blurs
  // to flat sand with distance by itself.)
  float ripplesHere = smoothstep(RIPPLES_BETWEEN.x, RIPPLES_BETWEEN.y, waterDepth)
    * (1.0 - smoothstep(RIPPLES_BETWEEN.z, RIPPLES_BETWEEN.w, waterDepth));
  // (the picture's slopes are across it and down it: in the lagoon it is laid turned)
  vec2 rippleSlope = mix(sandRipples, sandRipples.yx, lagoonSide);
  diffuseColor.rgb *= 1.0 + dot(rippleSlope, -towardsSun) * RIPPLE_SHADE * ripplesHere;

  // And broken coral lies on every hard floor of the reef: the gravel's picture (ground-tiles.ts), by how much
  // lighter or darker than its average each dot of it is, and shaded against the sun as on land.
  float rubbleShade = dot(gravelTile.rgb, vec3(1.0 / 3.0)) / GRAVEL_AVERAGE
    + RUBBLE_RELIEF * (gravelTile.a - gravelTileSunward.a);

  if (waterDepth > 0.3) {
    float coralPattern = groundFbm(xz * 0.17 + 31.0) + 0.30 * (groundFbm(xz * 0.95 + 7.0) - 0.5);
    float onTheReef = step(0.0, metresOffshore);
    float lagoonCoral = smoothstep(0.55, 0.63, coralPattern) * smoothstep(0.6, 1.7, waterDepth)
      * (1.0 - smoothstep(5.5, 7.9, waterDepth));
    // (and coral covers the tops of the lagoon's patch reefs, which stand up out of its basin: shallow ground well
    // out from the shore, its edge broken up by the pattern)
    float outInLagoon = -(metresOffshore + landWidth);
    float onPatchReef = (1.0 - smoothstep(1.5, 2.9, waterDepth + 1.2 * (coralPattern - 0.5)))
      * smoothstep(26.0, 40.0, outInLagoon);
    lagoonCoral = max(lagoonCoral, onPatchReef);
    // (What follows down to the crest's rock is the ocean reef's alone: in the lagoon it all comes to nothing, and
    // is not worked out.)
    float reefCoral = 0.0;
    float onCrestRidge = 0.0;
    float bareFlat = 0.0;
    float crestRockShows = 0.0;
    float ridgeHere = 0.0;
    if (onTheReef > 0.5) {
      // (The reef's cover here is read from its picture: how much is high ground, how much bare pavement, how
      // much of a ridge the crest is.)
      float beyondBeachShallows = max(metresOffshore - REEF_BEGINS, 0.0);
      float alongTheReef = clamp(metresOffshore, 0.0, REEF_BEGINS) + beyondBeachShallows / shoreRound.g;
      vec3 reefCover = texture2D(uReefCover, xz / REEF_COVER_SPAN + 0.5).rgb;
      // (the pattern breaks up the edges of the high ground, so that no patch has the outline of its mound)
      float ragged = 0.55 * (coralPattern - 0.5) + 0.3 * (groundNoise(xz * 1.3 + 4.0) - 0.5);
      float onHighGround = smoothstep(0.38, 0.62, reefCover.r + ragged);
      float scatteredHeads = 0.7 * smoothstep(0.68, 0.76, coralPattern) * smoothstep(REEF_BEGINS, GARDENS_BEGIN, alongTheReef);
      // (none in the last of the shallows, where the swash runs, and it thins out down the drop-off)
      reefCoral = max(onHighGround, scatteredHeads) * smoothstep(0.3, 0.9, waterDepth)
        * (1.0 - smoothstep(14.0, 22.0, waterDepth));
      // The crest is pounded by the white water: less coral grows there than pale rock, crusted pink in places.
      // Where it is a ridge, the pink alga that built it covers most of it; and the flat behind a high ridge is
      // the same rock, bare. (Both show however shallow they lie, where coral would not.)
      float onCrest = smoothstep(CREST_BEGINS - 8.0, CREST_BEGINS + 4.0, alongTheReef)
        * (1.0 - smoothstep(FORE_REEF_BEGINS - 2.0, FORE_REEF_BEGINS + 14.0, alongTheReef));
      ridgeHere = reefCover.b;
      bareFlat = reefCover.g * smoothstep(-0.3, 0.05, ragged);
      onCrestRidge = onCrest * ridgeHere * onHighGround;
      crestRockShows = max((0.65 + 0.3 * ridgeHere) * onCrest, 0.85 * bareFlat);
    }
    float coral = mix(lagoonCoral, reefCoral, onTheReef);
    coral = max(coral, max(onCrestRidge, bareFlat));
    // (Its colour is worked out only where there is coral or the crest's rock: over bare sand, not.)
    if (coral > 0.0) {
      float coralMottle = 0.6 + 0.8 * groundNoise(xz * 2.3);
      float coralGrain = 0.75 + 0.5 * groundNoise(xz * 7.0);
      vec3 coralColour = mix(BROWN_CORAL, OLIVE_CORAL, groundNoise(xz * 0.45 + 3.0)) * coralMottle * coralGrain;
      if (crestRockShows > 0.0) {
        vec3 crestRock = mix(DARK_REEF_ROCK, PALE_REEF_ROCK, groundNoise(xz * 2.3)) * (0.66 + 0.68 * groundNoise(xz * 7.0));
        crestRock = mix(crestRock, PINK_CRUST,
          smoothstep(0.5 - 0.25 * ridgeHere, 0.7, groundNoise(xz * 1.1 + 9.0)) * (0.5 + 0.3 * ridgeHere));
        coralColour = mix(coralColour, crestRock, crestRockShows);
      }
      // (close to, the hard floor is rubble and crust: its stones show)
      coralColour *= mix(1.0, rubbleShade, RUBBLE_ON_THE_REEF);
      diffuseColor.rgb = mix(diffuseColor.rgb, coralColour, coral * (0.55 + 0.3 * smoothstep(1.0, 3.0, waterDepth)));
    }
  }

  // Round the coral heads (reef-map.ts: its map's green channel) the floor is not sand but old reef: rough pale rock,
  // crusted pink in places, strewn with coral rubble - solid at a head's foot, breaking up into the sand further out.
  // (none beyond the edge of the map)
  vec2 reefUv = (xz - TERRAIN_HOME) / REEF_MAP_SPAN + 0.5;
  float apron = texture2D(uReefMap, reefUv).g * step(abs(reefUv.x - 0.5), 0.49) * step(abs(reefUv.y - 0.5), 0.49);
  if (apron > 0.01) {
    float apronEdge = apron + (groundFbm(xz * 0.9 + 5.0) - 0.5) * 0.8 + (groundNoise(xz * 3.7) - 0.5) * 0.25;
    // (None in the shallows by a beach, where the swash keeps the sand moving: a head that stands near the shore
    // had its old reef drawn right up to the waterline, where it stopped in a straight line. It comes in with the
    // depth, sooner here and later there, so that its edge is no line of equal depth either.)
    float deepEnough = smoothstep(OLD_REEF_BELOW.x, OLD_REEF_BELOW.y, waterDepth + (apronEdge - 0.5) * 0.6);
    float oldReef = smoothstep(0.30, 0.62, apronEdge) * deepEnough;
    vec3 reefRock = mix(DARK_REEF_ROCK, PALE_REEF_ROCK, groundNoise(xz * 2.3)) * (0.66 + 0.68 * groundNoise(xz * 7.0));
    reefRock = mix(reefRock, PINK_CRUST, smoothstep(0.55, 0.72, groundNoise(xz * 1.1 + 9.0)) * 0.55);
    // (strewn with dead coral: the gravel's picture, its stones paler than the rock they lie on)
    float stones = coverOf(gravelTile, RUBBLE_ROUND_A_HEAD, GRAVEL_FULL_COVER, farOff);
    reefRock = mix(reefRock * mix(1.0, rubbleShade, 0.6), gravelTile.rgb * DEAD_CORAL_TINT, stones);
    diffuseColor.rgb = mix(diffuseColor.rgb, reefRock, oldReef * 0.9);
  }

  // ---- Under water ----

  // The strip the waves run up and drain off (down to 20 cm below the still sea) is bare sand half the time, so the
  // underwater look starts below it: standingDepth is the depth of the water that is always there.
  // (with the sea drained, uDebugMode 5, the ground is drawn as if no water stood over it)
  float standingDepth = max(waterDepth - 0.2, 0.0) * step(uDebugMode, 4.5);
  // under water: sand reads paler, red is absorbed with depth, and the water column adds its own blue-green glow
  // (The paling and the glow are the water over the floor as an eye above the sea looks down through it. To an
  // eye under the water there is no such veil: the water between the two is another rule's, through-water.glsl.)
  float seenFromAbove = 1.0 - uUnderWater;
  vec3 greyed = vec3(dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2))) * vec3(1.04, 1.04, 1.02);
  // (less so in the lagoon's glassy shallows)
  float greying = mix(0.5, 0.28, lagoonSide) * smoothstep(0.0, 0.5, standingDepth) * seenFromAbove;
  diffuseColor.rgb = mix(diffuseColor.rgb, greyed, greying);
  // (the dimming must start at exactly 1: a step here draws a dark line along the waterline)
  float dimming = mix(1.0, 0.87, smoothstep(0.0, 0.7, standingDepth));
  vec3 throughWater = exp(-standingDepth * vec3(0.36, 0.085, 0.045)
    * mix(1.0, TAKEN_TO_AN_EYE_UNDER_WATER, uUnderWater));
  diffuseColor.rgb *= dimming * throughWater;
  diffuseColor.rgb += vec3(0.0, 0.075, 0.13) * (1.0 - exp(-standingDepth * 0.9)) * uDaylight * seenFromAbove;

  // The net of light that ripples throw on the sea floor (light-net.glsl). Ankle-deep water is too thin to bend the
  // light into a net, so it fades in between 10 and 80 cm; and where the swell breaks, the surface is too broken and
  // foamy to focus anything (the water shader also clouds the floor under foam).
  float fadeIn = smoothstep(0.1, mix(0.8, 0.45, lagoonSide), standingDepth);
  float lagoonShallows = 1.0 + 0.35 * lagoonSide * (1.0 - smoothstep(0.5, 2.5, standingDepth));
  float fadeWithDepth = exp(-waterDepth * 0.28);
  float surfBand = smoothstep(33.0, 40.0, metresOffshore) * (1.0 - smoothstep(50.0, 58.0, metresOffshore));
  float surfZone = surfBand * openSea(directionFromCentre);
  float notInSurf = 1.0 - 0.7 * surfZone;
  // strongest in the middle of the lagoon, gentler towards the outer reef
  float nearCentre = mix(NET_ON_OUTER_REEF, 1.0, exp(-length(vGroundPosition) * 0.012));
  float netLight = lightOfNet(smallWaves, lightNetRead, turnedLightNetRead, standingDepth,
    exp(-cameraDistance * 0.03))
    * fadeIn * lagoonShallows * netInWind(uWind) * fadeWithDepth * notInSurf * uDaylight * nearCentre;
  // (It is the sun's light: the sun alone is brightened by it, so that it is gone in a shadow, and under a cloud;
  // and a shadow under water is filled in a little: sunlight-under-water.ts.)
  netOfLight = netLight * sunThroughCloudHere;
  shadowFilledIn = shadowFilledAt(standingDepth);
}

// A shadow on the ground is not as dark as the sun's absence alone would make it: the sunlit ground round it
// throws light back into it, pale sand most of all. (In photographs the shade of a palm on coral sand is two thirds
// as light as the sand beside it. With nothing thrown back ours was a third as light, and blue.)
float groundsBrightness = dot(diffuseColor.rgb, vec3(1.0 / 3.0));
shadowFilledIn = max(shadowFilledIn, GROUND_FILLS_SHADOWS * groundsBrightness);

// ---- The sea drained (uDebugMode 5) ----

// Lines of equal depth, a metre apart and every fifth bolder, to read the floor's shape by.
if (uDebugMode > 4.5 && waterDepth > 0.0) {
#ifdef CAN_MEASURE_ACROSS_A_PIXEL
  float pixelsFromLine = abs(fract(waterDepth + 0.5) - 0.5) / depthAcrossPixel;
  float pixelsFromBoldLine = abs(fract(waterDepth * 0.2 + 0.5) - 0.5) * 5.0 / depthAcrossPixel;
  float line = max(0.4 * (1.0 - smoothstep(0.5, 1.3, pixelsFromLine)),
    0.7 * (1.0 - smoothstep(1.0, 2.2, pixelsFromBoldLine)));
  diffuseColor.rgb *= 1.0 - line;
#endif
}
