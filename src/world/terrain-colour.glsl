// The colour of the ground: dry and wet sand, turf, soil, footpaths, rock, the reef flat, what the water over it does
// to its colour, and the net of light that ripples throw on the sea floor.
//
// terrain.ts puts this block, in braces, inside three.js's Lambert fragment shader just after <color_fragment>. It
// replaces diffuseColor.rgb outright, so three.js's lighting and shadows still apply to it.
// Needs from three.js: diffuseColor, and the ground's grit picture: the material's map, vUv, and texelColor (the map
//   already read at vUv).
// Needs from terrain-declarations.glsl: the uniforms and the varying vWp; fleck, pebble and dimples; and from the
//   chunks it includes: footpathDistance (footpaths.glsl); hash, noise and fbm (noise.glsl); islandR and openSea
//   (island-shape/shore.glsl); lagHi, lagEx, lagExposure, lagWave, lagFoam and LW_T (lagwave.glsl).
// Needs the defines TERRAIN_HOME and CLOUD_SHADE_SPAN_M, written by terrain.ts.

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

// The share of the light left where the clouds let no sunlight through.
const float CLOUD_SHADOW_LIGHT = 0.45;

// The side of the square round home that the reef's map covers (mapSpan in reef-config.ts: keep the two the same).
const float REEF_MAP_SPAN = 300.0;

// The colours of the ground.
// (The sand is kept well under 1: in full sun the lighting multiplies it by about 1.3, and sand that clips to pure
// white shows no relief.)
const vec3 WARM_SAND = vec3(0.725, 0.715, 0.69);
const vec3 GREY_SAND = vec3(0.71, 0.71, 0.70);
const vec3 THIN_TURF = vec3(0.56, 0.62, 0.26);
const vec3 LUSH_TURF = vec3(0.36, 0.52, 0.19);
const vec3 DRY_TURF = vec3(0.72, 0.66, 0.40);
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

float height = vWp.y;
vec2 xz = vWp.xz;
float waterDepth = max(uLevel - height, 0.0);

// (uCam, not three.js's cameraPosition: three.js does not fill that in for this kind of material, and for a long time
// every close-up detail below was faded out as if the camera stood in the middle of the lagoon)
vec3 toCamera = uCam - vWp;
float cameraDistance = length(toCamera);
float nearness = exp(-cameraDistance * 0.05);   // how much close-up detail shows: 1 at the camera, gone by 90 m

// Which side of the land this is: lagoonSide is 1 on the lagoon's side (still water, no surf), 0 on the ocean's.
float directionFromCentre = atan(xz.y, xz.x);
float metresOffshore = length(xz) - islandR(directionFromCentre);   // outside the ocean beach line (negative inland)
// (this is landW() of island.glsl, which this shader does not have: keep the two the same)
float landWidth = 26.0 + 44.0 * pow(0.5 + 0.5 * sin(directionFromCentre), 1.6)
  + 4.0 * sin(5.0 * directionFromCentre + 1.0);
float lagoonSide = 1.0 - smoothstep(-0.7, -0.4, metresOffshore / landWidth);

vec2 towardsSun = normalize(uSunDir.xz + 1e-4);

// ---- The net of light, and the grit ----

// The net of light that ripples throw on the sea floor: the detail texture's net of lines, made to wander by its
// small waves. It is also the lace of the foam on the lagoon's sand. (Read here, before any branch:
// docs/DEVICE_NOTES.md.)
vec2 lightNetUv = xz * 0.34 + vec2(uTime * 0.010, uTime * 0.006);
vec2 lightNetWobble = (texture2D(uDet, lightNetUv * 0.31 + vec2(uTime * 0.017, -uTime * 0.013)).rg - 0.5) * 0.16;

// Grit: the ground's speckle picture (the material's own map, which three.js has already read into texelColor).
// Everything below replaces the colour outright, so the speckle is put back at the end; it fades out with distance.
// It is read twice: grain close up (a dot is 1.4 cm), and the same picture four times larger for mottling further
// off.
float fineGrit = (texelColor.g - uGritMean) * exp(-cameraDistance * 0.02);
float coarseGrit = (texture2D(map, vUv * 0.23 + 0.37).g - uGritMean) * 0.10 * exp(-cameraDistance * 0.006);
float grit = (fineGrit + coarseGrit) * (1.0 - 0.75 * smoothstep(0.0, 0.5, waterDepth));

// the net itself, read twice - the second time turned and finer - so that no repeat shows
vec2 turnedLightNetUv = vec2(lightNetUv.x * 0.6 + lightNetUv.y * 0.8, -lightNetUv.x * 0.8 + lightNetUv.y * 0.6);
float lightNet = texture2D(uDet, lightNetUv + lightNetWobble).a;
float turnedLightNet = texture2D(uDet, turnedLightNetUv * 1.63 - lightNetWobble * 1.4).a;

if (waterDepth > PLAIN_FLOOR_DEPTH) {
  diffuseColor.rgb = PLAIN_FLOOR_SAND;
} else {
  // ---- Dry sand ----

  float broadPatches = fbm(xz * 0.11);
  vec2 sunAlongGround = towardsSun * (1.0 - 0.45 * uSunDir.y);
  // The beach is in zones by height above the sea, each boundary wandering so that none is a contour line.
  float zoneWander = noise(xz * 0.23 + 7.0) - 0.5;
  float looseSand = smoothstep(0.30, 0.62, height + zoneWander * 0.2) * (1.0 - smoothstep(1.75, 2.1, height));
  // coral sand: near white, a touch warm; paler and greyer in broad patches. Most of the beach is clean.
  float broadShade = 0.94 + 0.12 * broadPatches;
  float fineShade = 0.97 + 0.06 * fbm(xz * 1.9);
  vec3 sand = mix(WARM_SAND, GREY_SAND, smoothstep(0.35, 0.7, broadPatches)) * broadShade * fineShade;

  // Loose dry sand is never flat. Close up it is dimpled - footprints and hollows, in three overlapping layers;
  // further off it rolls in low hummocks (the detail texture's small-wave field read large). Both are shaded against
  // the sun: lit on one side, darker and a little bluer on the other. Some stretches are trodden, some nearly smooth.
  vec2 hummockSlope = texture2D(uDet, xz * 0.06).rg;
  float trodden = 0.35 + 0.65 * smoothstep(0.3, 0.6, noise(xz * 0.09 + 50.0));
  float relief = 0.0;
  if (looseSand > 0.001) {   // (the dry beach only: skipped for the sea floor and the land)
    float dimpled = 0.0;
    float windRipples = 0.0;
    if (cameraDistance < DIMPLES_WITHIN) {
      vec2 turnedOnce = vec2(xz.x * 0.6 - xz.y * 0.8, xz.x * 0.8 + xz.y * 0.6);
      vec2 turnedTwice = vec2(xz.x * 0.28 + xz.y * 0.96, -xz.x * 0.96 + xz.y * 0.28);
      float largeDimples = dimples(xz * 1.5, sunAlongGround);
      float middleDimples = dimples(turnedOnce * 2.3 + 5.0, sunAlongGround);
      float smallDimples = dimples(turnedTwice * 3.7 + 11.0, sunAlongGround);
      dimpled = (largeDimples + middleDimples + smallDimples * 0.7) * 1.5 * trodden * exp(-cameraDistance * 0.03);
    }
    // where nobody has walked, the wind leaves fine ripples across the sand
    if (cameraDistance < WIND_RIPPLES_WITHIN) {
      float crests = cos(dot(xz, vec2(0.8, 0.6)) * 13.0 + 4.0 * noise(xz * 0.5));
      windRipples = crests * dot(sunAlongGround, vec2(0.8, 0.6)) * 0.07 * (1.0 - trodden) * nearness;
    }
    float hummocks = dot(hummockSlope - 0.5, sunAlongGround) * 0.14 * exp(-cameraDistance * 0.010);
    relief = (dimpled + windRipples + hummocks) * looseSand;
  }
  sand *= 1.0 + relief;
  sand = mix(sand, sand * vec3(0.88, 0.95, 1.06), clamp(-relief * 4.0, 0.0, 1.0));

  // ---- Wet sand towards the water ----

  // soaked: where the swash runs, the sand is dark, tan and packed flat. damp: above it a band that is still drying,
  // in patches. Both fade out just below the waterline (under water, the sea's own colour takes over).
  // (Wet sand is dark in the air; seen through water the same sand is bright again. Only the strip the small waves
  // actually reach, up to about 45 cm above the sea, is wet, and only a shade darker.)
  float aboveWaterline = smoothstep(-0.3, 0.0, height);
  float dampPatches = noise(xz * 1.3) - 0.5;
  float soaked = (1.0 - smoothstep(0.03, 0.30, height + zoneWander * 0.14)) * aboveWaterline;
  float damp = (1.0 - smoothstep(0.22, 0.60, height + zoneWander * 0.28 + dampPatches * 0.16)) * aboveWaterline;

  // The lagoon's edge has no swash: only a film of water that laps a hand's breadth up the sand and slides back.
  // So there the wet sand is a narrow strip (and paler), and lapHeight is how high the film reaches at this moment.
  float slowLap = 0.028 * sin(uTime * 1.25 + 6.0 * noise(xz * 0.13));
  float quickLap = 0.012 * sin(uTime * 2.7 + xz.x * 0.9 + xz.y * 0.7);
  float lapUnevenness = 0.02 * (noise(xz * 0.9) - 0.5);
  float lapHeight = 0.035 + slowLap + quickLap + lapUnevenness;

  // From a medium wind up, small waves break on the lagoon's beaches (lagwave.glsl; water.frag.glsl draws them on
  // the water) - in a high wind bigger ones. Each runs up the sand as a sheet with a foaming edge, a hand or two
  // high, and slides back before the next: then lapHeight is that sheet's edge, and the sand is wet as high as the
  // biggest of them reach.
  float shoreWaves = lagoonSide > 0.01 ? lagExposure(xz) : 0.0;
  float sheetRunningUp = 0.0;   // the sheet is still running up (its edge foams)
  float waveFoam = 0.0;   // how much foam the wave that last came in has left
  float waveLight = 0.0;   // the light the waves throw on the sand under them
  if (shoreWaves > 0.003 && height > -0.4 - lagHi() && height < 0.5) {
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
    float alongBeach = 0.55 + 0.9 * noise(xz * 0.7 + 3.0);
    float runUp = LAGOON_RUN_UP * (1.0 - exp(-0.2 * waveSize * alongBeach * shoreWaves / LAGOON_RUN_UP));
    float sheetTop = runUp * smoothstep(0.0, 0.3, wavePhase);   // as far as the sheet has got
    float sheetEdge = sheetTop * (1.0 - smoothstep(0.3, 0.95, wavePhase));
    float edgeWobble = 0.02 * (noise(xz * 3.1) - 0.5);
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

  float dampShows = damp * (0.6 + 0.4 * smoothstep(0.3, 0.7, noise(xz * 0.4 + 21.0)));
  vec3 dampTint = mix(vec3(1.0), vec3(0.955, 0.94, 0.91), dampShows);
  vec3 soakedColour = mix(vec3(0.92, 0.895, 0.85), vec3(0.945, 0.925, 0.89), lagoonSide);
  vec3 soakedTint = mix(vec3(1.0), soakedColour, soaked);
  sand *= dampTint * soakedTint;

  // The lines each retreating wave leaves behind: thin scalloped arcs, a darker wet edge with a paler rim of dried
  // foam and fine shell above it, closer together and fainter up the beach.
  // (faint, unevenly spaced, and each one peters out along the beach: they must not read as contour lines)
  float swashHeight = height + 0.16 * noise(xz * 0.33 + 3.0) + 0.03 * noise(xz * 1.7);
  float betweenLines = fract(swashHeight * 5.0 + 0.35 * sin(swashHeight * 17.0));
  float lineShows = smoothstep(0.35, 0.65, noise(vec2(xz.x * 0.5 + floor(swashHeight * 5.0) * 7.3, xz.y * 0.5)));
  float paleRim = smoothstep(0.0, 0.12, betweenLines) * (1.0 - smoothstep(0.12, 0.35, betweenLines)) * 0.035;
  float wetEdge = (1.0 - smoothstep(0.0, 0.06, betweenLines)) * 0.045;
  float swashLines = (paleRim - wetEdge) * lineShows * damp * (1.0 - 0.6 * soaked) * aboveWaterline
    * (1.0 - lagoonSide);
  sand *= 1.0 + swashLines;

  // soaked sand is glossy: at a low angle it mirrors the sky a little
  float grazing = 1.0 - clamp(normalize(toCamera).y, 0.0, 1.0);
  sand = mix(sand, uHor * 0.80, soaked * smoothstep(-0.02, 0.06, height) * grazing * grazing * grazing * 0.38);

  if (lagoonSide > 0.01) {
    // Under the film the sand shows clear but a touch cooler, and glassier; at the film's leading edge a thin broken
    // thread of white (broken along the shore and in time, so that it never reads as a drawn line).
    // (the film is painted from the lapping edge down to where the water proper starts to show, 20-30 cm under the
    // still level: without that the first metre of water looks like dry sand)
    float belowLap = 1.0 - smoothstep(lapHeight - 0.004, lapHeight + 0.004, height);
    float film = belowLap * smoothstep(-0.32, -0.2, height) * lagoonSide;
    sand = mix(sand, sand * vec3(0.90, 0.94, 0.95), film * 0.8);
    sand = mix(sand, uHor * 0.85, film * grazing * grazing * 0.36);
    float lace = max(lightNet, turnedLightNet);
    float rimWidth = mix(0.009, 0.02, sheetRunningUp);
    float onRim = exp(-pow((height - lapHeight) / rimWidth, 2.0));
    float brokenThread = smoothstep(0.42, 0.66, noise(vec2(xz.x + xz.y, xz.x - xz.y) * 1.7 + uTime * 0.15));
    float foamingEdge = 0.45 + 0.55 * smoothstep(0.2, 0.6, lace);
    float rim = onRim * mix(brokenThread, foamingEdge, sheetRunningUp) * lagoonSide;
    sand = mix(sand, vec3(0.96, 0.97, 0.97), rim * mix(0.26, 0.9, sheetRunningUp) * (0.35 + 0.65 * uDay));
    // (the foam of a broken wave: on the sheet running up the sand, and in the last hand's depth of water, which is
    // drawn here and not by water.frag.glsl: only this shader knows just where the ground meets the water. White
    // where fresh, then lace.)
    if (waveFoam > 0.01) {
      float lacePattern = lace * 0.7 + 0.3 * noise(xz * 2.3 + uTime * 0.2);
      float foamDepth = 1.0 - smoothstep(0.10, 0.2, -height);
      float foam = smoothstep(0.9 - waveFoam, 1.1 - waveFoam, lacePattern) * film * foamDepth;
      sand = mix(sand, vec3(0.90, 0.95, 0.95), film * waveFoam * 0.3);   // (the sheet itself is milky with bubbles)
      sand = mix(sand, vec3(0.97, 0.98, 0.98), foam * 0.9 * (0.35 + 0.65 * uDay));
    }
  }
  sand *= 1.0 + 0.3 * waveLight * uDay;   // (the light the lagoon's shore waves throw on the sand under them)

  // ---- Shells, coral chips and pebbles ----

  // One may sit in each 30 cm square, and nearly all squares are empty - except along the line where the last high
  // tide left its drift. Each is a small round chip, pale, pink, tan or grey, with a sliver of shadow on the side
  // away from the sun.
  if (height > 0.2 && height < 2.2 && cameraDistance < SHELLS_WITHIN) {
    vec2 grid = xz * 3.3;
    vec2 square = floor(grid);
    vec2 middle = vec2(hash(square + 31.0), hash(square + 47.0)) * 0.7 + 0.15;
    // (the lagoon's tide line is low and thin)
    float driftLine = mix(0.85, 0.34, lagoonSide);
    float driftWander = 0.25 * noise(xz * 0.21) * (1.0 - 0.6 * lagoonSide);
    float driftWidth = mix(0.13, 0.07, lagoonSide);
    float onDrift = exp(-pow((height - driftLine - driftWander) / driftWidth, 2.0));
    float shareWithChips = 0.02 + mix(0.42, 0.16, lagoonSide) * onDrift;
    float hasChip = step(1.0 - shareWithChips, hash(square + 17.0));
    float kind = hash(square + 5.0);
    float radius = 0.05 + 0.10 * kind * kind;
    vec2 fromMiddle = fract(grid) - middle;
    fromMiddle.x *= 1.0 + 0.6 * hash(square + 9.0);
    float chip = smoothstep(radius, radius * 0.55, length(fromMiddle)) * hasChip;
    vec2 fromShadow = fromMiddle + sunAlongGround * radius * 0.8;
    float chipShadow = smoothstep(radius * 1.5, radius * 0.6, length(fromShadow)) * hasChip;
    vec3 paleOrPink = mix(vec3(0.96, 0.94, 0.90), vec3(0.86, 0.62, 0.52), step(0.62, kind));
    vec3 greyOrTan = mix(vec3(0.62, 0.60, 0.58), vec3(0.74, 0.60, 0.42), step(0.5, hash(square + 2.0)));
    vec3 chipColour = mix(paleOrPink, greyOrTan, step(0.8, hash(square + 71.0)));
    vec3 shadowed = sand * (1.0 - 0.45 * chipShadow * (1.0 - chip) * nearness);
    vec3 litChip = chipColour * (0.85 + 0.3 * dot(fromMiddle, sunAlongGround) / radius);
    sand = mix(shadowed, litChip, chip * nearness);
  }
  diffuseColor.rgb = sand;

  if (height > -0.1) {
    // ---- Dry land, and the beach above the waterline ----

    float lushWaveX = sin(xz.x * 0.07 + 1.9 * sin(xz.y * 0.05 + 0.4));
    float lushWaveZ = sin(xz.y * 0.09 + 1.3 * sin(xz.x * 0.06));
    float lushness = 0.5 + 0.5 * lushWaveX * lushWaveZ;
    float dryness = 0.5 + 0.5 * sin(xz.x * 0.13 + 2.1) * sin(xz.y * 0.11 + 0.7);
    // short sun-bleached turf: yellow-green where it is thin, greener where it is lush, straw where it has dried out
    vec3 turfTint = mix(THIN_TURF, LUSH_TURF, lushness);
    turfTint = mix(turfTint, DRY_TURF, dryness * dryness * 0.7);
    float streakAngle = noise(xz * 0.13 + 4.0) * 12.566;
    vec2 streakDirection = vec2(cos(streakAngle), sin(streakAngle));
    vec2 streakUv = vec2(dot(xz, streakDirection) * 1.7, dot(xz, vec2(-streakDirection.y, streakDirection.x)) * 10.0);
    float streaks = noise(streakUv + 3.0 * noise(xz * 0.7));
    float greenerPatches = smoothstep(0.55, 0.68, fbm(xz * 0.8 + 21.0));
    vec3 greener = turfTint * vec3(1.05, 1.18, 0.95) + 0.03;
    float mottle = 0.80 + 0.40 * fbm(xz * 2.2);
    float streaked = 1.0 + (streaks - 0.5) * 0.45 * nearness;
    vec3 turf = mix(turfTint, greener, greenerPatches * 0.6) * vec3(0.90, 0.92, 0.82) * mottle * streaked;
    turf *= 0.86 + 0.28 * noise(xz * 11.0) * nearness + 0.14 * (1.0 - nearness);
    // mats of creeping vine: darker, glossier green, speckled with small round leaves
    float vine = smoothstep(0.54, 0.66, fbm(xz * 0.21 + 90.0));
    float leafSpeckle = 0.75 + 0.7 * hash(floor(xz * 7.0) + 2.0) * nearness + 0.35 * (1.0 - nearness);
    turf = mix(turf, VINE_GREEN * leafSpeckle, vine * 0.8);
    // bare patches where the sandy soil shows through the turf
    float bare = smoothstep(0.56, 0.70, fbm(xz * 0.33 + 40.0) + 0.25 * (noise(xz * 2.7) - 0.5));
    turf = mix(turf, BARE_SOIL * (0.85 + 0.3 * noise(xz * 5.0)), bare * 0.85);

    vec3 soil = SOIL_BROWN * (0.75 + 0.5 * fbm(xz * 1.3));
    float hasSpeck = step(0.975, hash(floor(xz * 18.0) + 9.0));
    float inSpeck = smoothstep(0.5, 0.2, length(fract(xz * 18.0) - 0.5));
    soil *= 1.0 - 0.25 * hasSpeck * inSpeck * nearness;
    float dirtWaves = sin(xz.x * 0.23 + 1.1 * sin(xz.y * 0.17)) * sin(xz.y * 0.21 + 1.4 * sin(xz.x * 0.19) + 2.0);
    float dirt = smoothstep(0.66, 0.80, dirtWaves + (fbm(xz * 0.6) - 0.5) * 0.5 + (noise(xz * 3.1) - 0.5) * 0.12);
    // under the trees the ground is not lawn: fallen fronds and leaf litter, brown and olive, darker than the grass
    float leafLitter = smoothstep(0.35, 0.7, fbm(xz * 0.35 + 70.0));
    turf = mix(turf, LITTER_BROWN * (0.7 + 0.6 * noise(xz * 4.3)), leafLitter * 0.45);
    vec3 land = mix(turf, soil, dirt * 0.85);

    float fromPath = footpathDistance(xz) + (noise(xz * 0.9) - 0.5) * 0.7 + (noise(xz * 4.0) - 0.5) * 0.25;
    float onPath = smoothstep(1.05, 0.72, fromPath);
    vec3 pathColour = mix(soil, PATH_SAND, 0.55) * (0.9 + 0.2 * noise(xz * 3.0));
    land = mix(land, pathColour, onPath);
    float rock = smoothstep(10.6, 12.6, height + (noise(xz * 0.5) - 0.5) * 2.0);
    land = mix(land, ROCK_GREY * (0.7 + 0.6 * fbm(xz * 1.5)), rock);

    // ---- Towards the vegetation, in layers ----

    float edgeWander = 0.45 * sin(xz.x * 0.31 + xz.y * 0.17) + 0.3 * sin(xz.y * 0.43 - xz.x * 0.23 + 1.0);
    float layerHeight = height + edgeWander + (fbm(xz * 1.7) - 0.5) * 0.5;
    // 1. the back of the beach: sand a shade greyer and warmer (old leaf mould), strewn with bits of leaf and twig
    float backOfBeach = smoothstep(1.15, 1.65, layerHeight);
    float leafMould = backOfBeach * (0.55 + 0.45 * smoothstep(0.3, 0.7, noise(xz * 0.31 + 9.0)));
    vec3 fringe = mix(sand, sand * vec3(0.86, 0.82, 0.74), leafMould);
    float litter = 0.0;
    if (backOfBeach > 0.001 && cameraDistance < LITTER_WITHIN) {
      vec2 turned = vec2(xz.x * 0.8 + xz.y * 0.6, -xz.x * 0.6 + xz.y * 0.8);
      float flecks = max(fleck(xz * 6.0), fleck(turned * 9.0 + 3.0));
      litter = flecks * backOfBeach * smoothstep(0.2, 0.55, noise(xz * 0.6 + 17.0)) * exp(-cameraDistance * 0.025);
    }
    fringe = mix(fringe, vec3(0.34, 0.25, 0.15) * (0.7 + 0.6 * hash(floor(xz * 6.0))), litter * 0.85);
    // 2. the turf does not stop at a line: it breaks up into islands and tongues, with sand between them
    float turfEdge = layerHeight + (fbm(xz * 0.9 + 3.0) - 0.5) * 1.3 + (noise(xz * 3.3) - 0.5) * 0.30;
    float landCover = smoothstep(1.74, 1.84, turfEdge);
    // 3. round every patch of turf, a rim of sand stained dark by roots and humus
    float stainedRim = smoothstep(1.45, 1.74, turfEdge) * 0.7;
    fringe = mix(fringe, vec3(0.52, 0.45, 0.34) * (0.85 + 0.3 * noise(xz * 4.0)), stainedRim);
    // coral rubble thrown up at the back of the beach: a band of small grey-white stones where the sand meets the
    // scrub
    float rubbleCover = smoothstep(0.95, 1.3, layerHeight) * smoothstep(0.42, 0.6, fbm(xz * 0.5 + 13.0));
    // Three sizes of stone laid one over another (big ones on top), at three angles, so that no grid shows; grit
    // between them. pebble() gives each (how much of this spot it covers, how it is lit, its tone).
    vec3 rubble = vec3(0.74, 0.72, 0.67) * (0.9 + 0.2 * noise(xz * 9.0));
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
    diffuseColor.rgb = mix(fringe, land, landCover);
  }
}

// ---- Cloud shadows and grit ----

// The sun lamp is already dimmed by however much cloud stands between the sun and the camera (lights.ts); this adds
// the difference between here and there, so that a shadow's edge can be seen crossing the ground.
float lightHere = mix(CLOUD_SHADOW_LIGHT, 1.0, texture2D(uCloudShade, xz / CLOUD_SHADE_SPAN_M + 0.5).r);
float lightAtCamera = mix(CLOUD_SHADOW_LIGHT, 1.0, texture2D(uCloudShade, uCam.xz / CLOUD_SHADE_SPAN_M + 0.5).r);
diffuseColor.rgb *= lightHere / lightAtCamera;
// fine and faint on the beach, coarser on soil and turf
diffuseColor.rgb *= 1.0 + grit * (height < 1.6 ? 0.55 : 1.1);

if (waterDepth > 0.0) {
  // ---- The reef flat ----

  // Dark coral heads and sea-grass beds mottle the sand in the shallows (what makes a lagoon look like one from
  // above).
  if (waterDepth > 0.6) {
    float coralDepths = smoothstep(0.6, 1.7, waterDepth) * (1.0 - smoothstep(5.5, 7.9, waterDepth));
    float coralPattern = fbm(xz * 0.17 + 31.0) + 0.30 * (fbm(xz * 0.95 + 7.0) - 0.5);
    // coral is scattered heads near the beach and closes up towards the outer edge of the flat, where the swell
    // breaks
    float nearOuterEdge = smoothstep(18.0, 40.0, metresOffshore) * (1.0 - smoothstep(46.0, 53.0, metresOffshore));
    float coralThreshold = mix(0.55, 0.64, step(0.0, metresOffshore)) - 0.21 * nearOuterEdge;
    float coral = smoothstep(coralThreshold, coralThreshold + 0.08, coralPattern) * coralDepths;
    // spur and groove: the seaward face of the reef is ribbed, dark coral ridges with sandy channels between,
    // pointing out to sea
    float ridges = 0.5 + 0.5 * sin(directionFromCentre * 280.0 + 3.0 * noise(xz * 0.06) + 1.6 * noise(xz * 0.33));
    float reefFront = smoothstep(40.0, 47.0, metresOffshore) * (1.0 - smoothstep(56.0, 64.0, metresOffshore));
    coral = max(coral, 0.62 * smoothstep(0.30, 0.55, ridges) * reefFront * (0.6 + 0.4 * noise(xz * 0.5 + 11.0)));
    coral *= 1.0 - 0.8 * smoothstep(0.12, 0.0, ridges) * smoothstep(34.0, 44.0, metresOffshore);
    float coralMottle = 0.6 + 0.8 * noise(xz * 2.3);
    float coralGrain = 0.75 + 0.5 * noise(xz * 7.0);
    vec3 coralColour = mix(BROWN_CORAL, OLIVE_CORAL, noise(xz * 0.45 + 3.0)) * coralMottle * coralGrain;
    diffuseColor.rgb = mix(diffuseColor.rgb, coralColour, coral * (0.55 + 0.3 * smoothstep(1.0, 3.0, waterDepth)));
  }

  // Round the coral heads (reef-map.ts: its map's green channel) the floor is not sand but old reef: rough pale rock,
  // crusted pink in places, strewn with coral rubble - solid at a head's foot, breaking up into the sand further out.
  // (none beyond the edge of the map)
  vec2 reefUv = (xz - TERRAIN_HOME) / REEF_MAP_SPAN + 0.5;
  float apron = texture2D(uReef, reefUv).g * step(abs(reefUv.x - 0.5), 0.49) * step(abs(reefUv.y - 0.5), 0.49);
  if (apron > 0.01) {
    float apronEdge = apron + (fbm(xz * 0.9 + 5.0) - 0.5) * 0.8 + (noise(xz * 3.7) - 0.5) * 0.25;
    float oldReef = smoothstep(0.30, 0.62, apronEdge);
    vec3 reefRock = mix(DARK_REEF_ROCK, PALE_REEF_ROCK, noise(xz * 2.3)) * (0.66 + 0.68 * noise(xz * 7.0));
    reefRock = mix(reefRock, PINK_CRUST, smoothstep(0.55, 0.72, noise(xz * 1.1 + 9.0)) * 0.55);
    vec3 stone = pebble(xz * 4.3 + 2.0, towardsSun, 0.6);
    vec3 stoneColour = mix(vec3(0.50, 0.48, 0.44), vec3(0.88, 0.85, 0.78), stone.z) * stone.y;
    reefRock = mix(reefRock, stoneColour, stone.x * 0.8);
    diffuseColor.rgb = mix(diffuseColor.rgb, reefRock, oldReef * 0.9);
  }

  // ---- Under water ----

  // The strip the waves run up and drain off (down to 20 cm below the still sea) is bare sand half the time, so the
  // underwater look starts below it: standingDepth is the depth of the water that is always there.
  float standingDepth = max(waterDepth - 0.2, 0.0);
  // under water: sand reads paler, red is absorbed with depth, and the water column adds its own blue-green glow
  vec3 greyed = vec3(dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2))) * vec3(1.04, 1.04, 1.02);
  // (less so in the lagoon's glassy shallows)
  float greying = mix(0.5, 0.28, lagoonSide) * smoothstep(0.0, 0.5, standingDepth);
  diffuseColor.rgb = mix(diffuseColor.rgb, greyed, greying);
  // (the dimming must start at exactly 1: a step here draws a dark line along the waterline)
  float dimming = mix(1.0, 0.87, smoothstep(0.0, 0.7, standingDepth));
  vec3 throughWater = exp(-standingDepth * vec3(0.36, 0.085, 0.045));
  diffuseColor.rgb *= dimming * throughWater;
  diffuseColor.rgb += vec3(0.0, 0.075, 0.13) * (1.0 - exp(-standingDepth * 0.9)) * uDay;

  // The net of light that ripples throw on the sea floor: the detail texture's lines, read twice and made to wander.
  // Ankle-deep water is too thin to bend the light into a net, so it fades in between 10 and 80 cm; and where the
  // swell breaks, the surface is too broken and foamy to focus anything (the water shader also clouds the floor under
  // foam).
  float net = lightNet * lightNet;
  net *= net * lightNet;
  float turnedNet = turnedLightNet * turnedLightNet;
  turnedNet *= turnedNet;
  float netPattern = net * 1.7 + turnedNet * 1.3 - 0.22;
  float fadeIn = smoothstep(0.1, mix(0.8, 0.45, lagoonSide), standingDepth);
  float lagoonShallows = 1.0 + 0.35 * lagoonSide * (1.0 - smoothstep(0.5, 2.5, standingDepth));
  float rippled = smoothstep(0.0, 0.45, uWind);
  float fadeWithDepth = exp(-waterDepth * 0.28);
  float surfBand = smoothstep(33.0, 40.0, metresOffshore) * (1.0 - smoothstep(50.0, 58.0, metresOffshore));
  float surfZone = surfBand * openSea(directionFromCentre);
  float notInSurf = 1.0 - 0.7 * surfZone;
  // strongest in the middle of the lagoon, gentler towards the outer reef
  float nearCentre = exp(-length(vWp) * 0.012);
  float netLight = netPattern * fadeIn * lagoonShallows * rippled * fadeWithDepth * notInSurf * uDay * nearCentre;
  diffuseColor.rgb *= 1.0 + netLight;
}
