// The colour of the ground: dry and wet sand, turf, soil, footpaths, rock, the reef flat, what the water over it does
// to its colour, and the net of light that ripples throw on the sea floor.
//
// terrain.ts puts this block, in braces, inside three.js's Lambert fragment shader just after <color_fragment>. It
// replaces diffuseColor.rgb outright, so three.js's lighting and shadows still apply to it; and it sets netOfLight
// and shadowFilledIn, which say what the water does to the sun's light (shaders/sunlight-under-water.ts).
// Needs from three.js: diffuseColor, and the ground's grit picture: the material's map, vUv, and texelColor (the map
//   already read at vUv).
// Needs from terrain-declarations.glsl: the uniforms and the varying vGroundPosition; fleck, pebble and dimples; and from the
//   groundNoise, groundFbm and randomsOf; and from the
//   chunks it includes: footpathDistance (footpaths.glsl); islandR, openSea and
//   landW (island-shape/shore.glsl and island.glsl); lagHi, lagEx, lagExposure, lagWave, lagFoam and LW_T
//   (lagwave.glsl); the net of light's readings and lightOfNet (light-net.glsl); turfLushness, turfDryness,
//   soilPatches and layerEdgeWander (ground-patterns/turf.glsl), which the grass follows.
// Needs the defines TERRAIN_HOME and REEF_MAP_SPAN (the middle, and the side, of the square round home that the
//   reef's map covers), CLOUD_SHADE_SPAN_M, CAUSTICS_BRIGHTEST (caustics-texture.ts), and THIN_TURF, LUSH_TURF and
//   DRY_TURF (the turf's colours, which the grass shares: ground-patterns.ts), written by terrain.ts.

// ---- Numbers to retune ----
// (heights are metres above still sea level, depths metres of water, distances metres from the camera)

// Beyond this depth the sea floor is plain sand: it is only ever seen dimly, through the water or when diving.
const float PLAIN_FLOOR_DEPTH = 8.6;
const vec3 PLAIN_FLOOR_SAND = vec3(0.77, 0.72, 0.61);

// Each close-up detail fades with distance; beyond where it has faded to nothing it is not worked out at all.
const float DIMPLES_WITHIN = 120.0;
const float WIND_RIPPLES_WITHIN = 90.0;
const float SHELLS_WITHIN = 45.0;
const float LITTER_WITHIN = 150.0;

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

// The colours of the ground.
// (The sand is kept well under 1: in full sun the lighting multiplies it by about 1.3, and sand that clips to pure
// white shows no relief.)
const vec3 WARM_SAND = vec3(0.725, 0.715, 0.69);
const vec3 GREY_SAND = vec3(0.71, 0.71, 0.70);
const vec3 VINE_GREEN = vec3(0.17, 0.36, 0.12);
const vec3 BARE_SOIL = vec3(0.80, 0.73, 0.56);
const vec3 SOIL_BROWN = vec3(0.50, 0.38, 0.25);
const vec3 LITTER_BROWN = vec3(0.50, 0.40, 0.25);
const vec3 PATH_SAND = vec3(0.80, 0.70, 0.50);
const vec3 ROCK_GREY = vec3(0.46, 0.44, 0.39);
const vec3 BROWN_CORAL = vec3(0.30, 0.25, 0.17);
const vec3 OLIVE_CORAL = vec3(0.13, 0.23, 0.15);
const vec3 DARK_REEF_ROCK = vec3(0.40, 0.37, 0.31);
const vec3 PALE_REEF_ROCK = vec3(0.68, 0.64, 0.56);
const vec3 PINK_CRUST = vec3(0.76, 0.58, 0.60);

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

// Which side of the land this is: lagoonSide is 1 on the lagoon's side (still water, no surf), 0 on the ocean's.
// (The shore's shape in this direction is read from its picture, which the water's shader reads too: the ocean
// shoreline's distance from the centre, the reef's share of its full width, the land's width.)
float directionFromCentre = atan(xz.y, xz.x);
#ifdef TERRAIN_BY_ARITHMETIC
float shoreRadius = islandR(directionFromCentre);
float landWidth = landW(directionFromCentre);
#else
vec4 shoreRound = texture2D(uShoreRound, vec2(directionFromCentre / FULL_TURN + 0.5, 0.5));
float shoreRadius = shoreRound.r + SHORE_ROUND_FROM;
float landWidth = shoreRound.b;
#endif
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
    float hummocks = dot(hummockSlope - 0.5, sunAlongGround) * 0.14 * exp(-cameraDistance * 0.010);
    relief = (dimpled + windRipples + hummocks) * looseSand;
  }
  sand *= 1.0 + relief;
  sand = mix(sand, sand * vec3(0.88, 0.95, 1.06), clamp(-relief * 4.0, 0.0, 1.0));

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
  }
  diffuseColor.rgb = sand;

  if (height > -0.1) {
    // ---- Dry land, and the beach above the waterline ----

    // Towards the vegetation the ground changes in layers: sand, the back of the beach, and turf, which does not
    // stop at a line but breaks up into islands and tongues with sand between them. How far this spot is turf
    // (landCover) is worked out first: where it is none, the land's own colour is not worked out at all, and
    // where it is all turf, the beach's fringe is not. (Most of the ground is wholly the one or the other.)
    // (The turf's broad patterns are read from their picture: how lush, how dried out, the patches of bare soil,
    // and how far the layers' edges wander.)
    #ifdef TERRAIN_BY_ARITHMETIC
    float edgeWander = layerEdgeWander(xz.x, xz.y);
    #else
    vec4 turfPatterns = texture2D(uTurfPatterns, xz / TURF_PICTURE_SPAN + 0.5);
    float edgeWander = (turfPatterns.a * 2.0 - 1.0) * TURF_WANDER_KEPT;
    #endif
    float layerHeight = height + edgeWander + (groundFbm(xz * 1.7) - 0.5) * 0.5;
    float turfEdge = layerHeight + (groundFbm(xz * 0.9 + 3.0) - 0.5) * 1.3 + (groundNoise(xz * 3.3) - 0.5) * 0.30;
    float landCover = smoothstep(1.74, 1.84, turfEdge);

    vec3 land = vec3(0.0);
    if (landCover > 0.0) {
      #ifdef TERRAIN_BY_ARITHMETIC
      float lushness = turfLushness(xz.x, xz.y);
      float dryness = turfDryness(xz.x, xz.y);
      float dirtWaves = soilPatches(xz.x, xz.y);
      #else
      float lushness = turfPatterns.r;
      float dryness = turfPatterns.g;
      float dirtWaves = turfPatterns.b * 2.0 - 1.0;
      #endif
      // short sun-bleached turf: yellow-green where it is thin, greener where it is lush, straw where it has dried out
      vec3 turfTint = mix(THIN_TURF, LUSH_TURF, lushness);
      turfTint = mix(turfTint, DRY_TURF, dryness * dryness * 0.7);
      float streakAngle = groundNoise(xz * 0.13 + 4.0) * 12.566;
      vec2 streakDirection = vec2(cos(streakAngle), sin(streakAngle));
      vec2 streakUv = vec2(dot(xz, streakDirection) * 1.7, dot(xz, vec2(-streakDirection.y, streakDirection.x)) * 10.0);
      float streaks = groundNoise(streakUv + 3.0 * groundNoise(xz * 0.7));
      float greenerPatches = smoothstep(0.55, 0.68, groundFbm(xz * 0.8 + 21.0));
      vec3 greener = turfTint * vec3(1.05, 1.18, 0.95) + 0.03;
      float mottle = 0.80 + 0.40 * groundFbm(xz * 2.2);
      float streaked = 1.0 + (streaks - 0.5) * 0.45 * nearness;
      vec3 turf = mix(turfTint, greener, greenerPatches * 0.6) * vec3(0.90, 0.92, 0.82) * mottle * streaked;
      turf *= 0.86 + 0.28 * groundNoise(xz * 11.0) * nearness + 0.14 * (1.0 - nearness);
      // mats of creeping vine: darker, glossier green, speckled with small round leaves, each of its own size
      // and shade, lit on the side towards the sun (pebble() lays them: as squares of one shade each, which they
      // were, a mat was a chequerboard close up). From far off a mat is one even green.
      float vine = smoothstep(0.54, 0.66, groundFbm(xz * 0.21 + 90.0));
      if (vine > 0.0) {
        float leafSpeckle = 1.1;
        if (nearness > 0.05) {
          vec3 leaf = pebble(xz * 9.0 + 2.0, sunAlongGround, 0.9);
          vec2 turnedLeaves = vec2(xz.x * 0.6 - xz.y * 0.8, xz.x * 0.8 + xz.y * 0.6);
          vec3 leafBelow = pebble(turnedLeaves * 6.5 + 7.0, sunAlongGround, 0.9);
          float lowerLeaves = mix(0.72, 0.85 + 0.35 * leafBelow.z, leafBelow.x);
          float leaves = mix(lowerLeaves, (0.95 + 0.5 * leaf.z) * leaf.y, leaf.x);
          leafSpeckle = mix(leafSpeckle, leaves, nearness);
        }
        turf = mix(turf, VINE_GREEN * leafSpeckle, vine * 0.8);
      }
      // bare patches where the sandy soil shows through the turf
      float bare = smoothstep(0.56, 0.70, groundFbm(xz * 0.33 + 40.0) + 0.25 * (groundNoise(xz * 2.7) - 0.5));
      turf = mix(turf, BARE_SOIL * (0.85 + 0.3 * groundNoise(xz * 5.0)), bare * 0.85);

      vec3 soil = SOIL_BROWN * (0.75 + 0.5 * groundFbm(xz * 1.3));
      float hasSpeck = step(0.975, randomsOf(floor(xz * 18.0), 10.0).x);
      float inSpeck = smoothstep(0.5, 0.2, length(fract(xz * 18.0) - 0.5));
      soil *= 1.0 - 0.25 * hasSpeck * inSpeck * nearness;
      float dirt = smoothstep(0.66, 0.80, dirtWaves + (groundFbm(xz * 0.6) - 0.5) * 0.5 + (groundNoise(xz * 3.1) - 0.5) * 0.12);
      // under the trees the ground is not lawn: fallen fronds and leaf litter, brown and olive, darker than the grass
      float leafLitter = smoothstep(0.35, 0.7, groundFbm(xz * 0.35 + 70.0));
      turf = mix(turf, LITTER_BROWN * (0.7 + 0.6 * groundNoise(xz * 4.3)), leafLitter * 0.45);
      land = mix(turf, soil, dirt * 0.85);

      float fromPath = footpathDistance(xz) + (groundNoise(xz * 0.9) - 0.5) * 0.7 + (groundNoise(xz * 4.0) - 0.5) * 0.25;
      float onPath = smoothstep(1.05, 0.72, fromPath);
      vec3 pathColour = mix(soil, PATH_SAND, 0.55) * (0.9 + 0.2 * groundNoise(xz * 3.0));
      land = mix(land, pathColour, onPath);
      // (bare rock on the highest ground, of which the atoll has little)
      if (height > 9.5) {
        float rock = smoothstep(10.6, 12.6, height + (groundNoise(xz * 0.5) - 0.5) * 2.0);
        land = mix(land, ROCK_GREY * (0.7 + 0.6 * groundFbm(xz * 1.5)), rock);
      }
    }

    // ---- Towards the vegetation, in layers ----

    vec3 fringe = sand;
    if (landCover < 1.0) {
      // 1. the back of the beach: sand a shade greyer and warmer (old leaf mould), strewn with bits of leaf and twig
      float backOfBeach = smoothstep(1.15, 1.65, layerHeight);
      float leafMould = backOfBeach * (0.55 + 0.45 * smoothstep(0.3, 0.7, groundNoise(xz * 0.31 + 9.0)));
      fringe = mix(sand, sand * vec3(0.86, 0.82, 0.74), leafMould);
      float litter = 0.0;
      if (backOfBeach > 0.001 && cameraDistance < LITTER_WITHIN) {
        vec2 turned = vec2(xz.x * 0.8 + xz.y * 0.6, -xz.x * 0.6 + xz.y * 0.8);
        float flecks = max(fleck(xz * 6.0), fleck(turned * 9.0 + 3.0));
        litter = flecks * backOfBeach * smoothstep(0.2, 0.55, groundNoise(xz * 0.6 + 17.0)) * exp(-cameraDistance * 0.025);
      }
      fringe = mix(fringe, vec3(0.34, 0.25, 0.15) * (0.7 + 0.6 * randomsOf(floor(xz * 6.0), 11.0).x), litter * 0.85);
      // 3. round every patch of turf, a rim of sand stained dark by roots and humus
      float stainedRim = smoothstep(1.45, 1.74, turfEdge) * 0.7;
      fringe = mix(fringe, vec3(0.52, 0.45, 0.34) * (0.85 + 0.3 * groundNoise(xz * 4.0)), stainedRim);
      // coral rubble thrown up at the back of the beach: a band of small grey-white stones where the sand meets the
      // scrub
      float rubbleCover = smoothstep(0.95, 1.3, layerHeight) * smoothstep(0.42, 0.6, groundFbm(xz * 0.5 + 13.0));
      // Three sizes of stone laid one over another (big ones on top), at three angles, so that no grid shows; grit
      // between them. pebble() gives each (how much of this spot it covers, how it is lit, its tone).
      vec3 rubble = vec3(0.74, 0.72, 0.67) * (0.9 + 0.2 * groundNoise(xz * 9.0));
      // (only where there is rubble, and near enough for single stones to show)
      if (rubbleCover > 0.002 && nearness > 0.02) {
        vec2 turnedSmall = vec2(xz.x * 0.5 + xz.y * 0.87, -xz.x * 0.87 + xz.y * 0.5);
        vec3 smallStone = pebble(turnedSmall * 15.0 + 7.0, sunAlongGround, 0.55);
        vec3 smallColour = mix(vec3(0.56, 0.55, 0.52), vec3(0.92, 0.90, 0.86), smallStone.z) * smallStone.y;
        rubble = mix(rubble, smallColour, smallStone.x);
        vec2 turnedMiddle = vec2(xz.x * 0.94 - xz.y * 0.34, xz.x * 0.34 + xz.y * 0.94);
        vec3 middleStone = pebble(turnedMiddle * 8.3 + 3.0, sunAlongGround, 0.6);
        vec3 middleColour = mix(vec3(0.60, 0.58, 0.54), vec3(0.95, 0.93, 0.89), middleStone.z) * middleStone.y;
        rubble = mix(rubble * (1.0 - 0.25 * middleStone.x), middleColour, middleStone.x);
        vec3 bigStone = pebble(xz * 4.1, sunAlongGround, 0.45);
        vec3 bigGreyOrWhite = mix(vec3(0.66, 0.64, 0.60), vec3(0.90, 0.87, 0.80), bigStone.z);
        vec3 bigColour = mix(bigGreyOrWhite, vec3(0.80, 0.66, 0.56), step(0.85, bigStone.z)) * bigStone.y;
        rubble = mix(rubble, bigColour, bigStone.x);
      }
      fringe = mix(fringe, mix(vec3(0.74, 0.72, 0.68), rubble, nearness), rubbleCover * 0.75);
    }
    diffuseColor.rgb = mix(fringe, land, landCover);
  }
}

// ---- Cloud shadows and grit ----

// The sun lamp is already dimmed by however much cloud stands between the sun and the camera (lights.ts); this adds
// the difference between here and there, so that a shadow's edge can be seen crossing the ground.
float sunThroughCloudHere = texture2D(uCloudShadeMap, xz / CLOUD_SHADE_SPAN_M + 0.5).r;
float lightHere = mix(CLOUD_SHADOW_LIGHT, 1.0, sunThroughCloudHere);
float lightAtCamera = mix(CLOUD_SHADOW_LIGHT, 1.0, texture2D(uCloudShadeMap, uCameraPosition.xz / CLOUD_SHADE_SPAN_M + 0.5).r);
diffuseColor.rgb *= lightHere / lightAtCamera;
// fine and faint on the beach, coarser on soil and turf
diffuseColor.rgb *= 1.0 + grit * (height < 1.6 ? 0.55 : 1.1);

if (waterDepth > 0.0) {
  // ---- The reef flat ----

  // Coral under water. In the lagoon, dark coral heads and sea-grass beds mottle the sand (what makes a lagoon look
  // like one from above). On the reef, coral and rock cover the high ground - the gardens' mounds, the crest, the
  // fore reef's spurs - and sand lies in the pools, the grooves and the channel: dark and pale follow the shape of
  // the floor, as they do on a real reef seen from the air. A few heads are scattered over the shallows' sand.
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
      #ifdef TERRAIN_BY_ARITHMETIC
      float alongTheReef = alongReef(max(metresOffshore, 0.0), directionFromCentre);
      vec3 reefCover = vec3(reefHighGround(xz.x, xz.y), reefPavement(xz.x, xz.y), ridgeAt(directionFromCentre));
      #else
      float beyondBeachShallows = max(metresOffshore - REEF_BEGINS, 0.0);
      float alongTheReef = clamp(metresOffshore, 0.0, REEF_BEGINS) + beyondBeachShallows / shoreRound.g;
      vec3 reefCover = texture2D(uReefCover, xz / REEF_COVER_SPAN + 0.5).rgb;
      #endif
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
    float oldReef = smoothstep(0.30, 0.62, apronEdge);
    vec3 reefRock = mix(DARK_REEF_ROCK, PALE_REEF_ROCK, groundNoise(xz * 2.3)) * (0.66 + 0.68 * groundNoise(xz * 7.0));
    reefRock = mix(reefRock, PINK_CRUST, smoothstep(0.55, 0.72, groundNoise(xz * 1.1 + 9.0)) * 0.55);
    vec3 stone = pebble(xz * 4.3 + 2.0, towardsSun, 0.6);
    vec3 stoneColour = mix(vec3(0.50, 0.48, 0.44), vec3(0.88, 0.85, 0.78), stone.z) * stone.y;
    reefRock = mix(reefRock, stoneColour, stone.x * 0.8);
    diffuseColor.rgb = mix(diffuseColor.rgb, reefRock, oldReef * 0.9);
  }

  // ---- Under water ----

  // The strip the waves run up and drain off (down to 20 cm below the still sea) is bare sand half the time, so the
  // underwater look starts below it: standingDepth is the depth of the water that is always there.
  // (with the sea drained, uDebugMode 5, the ground is drawn as if no water stood over it)
  float standingDepth = max(waterDepth - 0.2, 0.0) * step(uDebugMode, 4.5);
  // under water: sand reads paler, red is absorbed with depth, and the water column adds its own blue-green glow
  vec3 greyed = vec3(dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2))) * vec3(1.04, 1.04, 1.02);
  // (less so in the lagoon's glassy shallows)
  float greying = mix(0.5, 0.28, lagoonSide) * smoothstep(0.0, 0.5, standingDepth);
  diffuseColor.rgb = mix(diffuseColor.rgb, greyed, greying);
  // (the dimming must start at exactly 1: a step here draws a dark line along the waterline)
  float dimming = mix(1.0, 0.87, smoothstep(0.0, 0.7, standingDepth));
  vec3 throughWater = exp(-standingDepth * vec3(0.36, 0.085, 0.045));
  diffuseColor.rgb *= dimming * throughWater;
  diffuseColor.rgb += vec3(0.0, 0.075, 0.13) * (1.0 - exp(-standingDepth * 0.9)) * uDaylight;

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
