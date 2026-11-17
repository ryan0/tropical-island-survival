// The main swell's breaking wave as its own mesh needs to know it (breaker.vert.glsl). All of it is asked of the
// sea's own wave model (waveOfTrain, in waves.glsl), so that the mesh and the sea agree where the crest is, how
// high the wave stands and how far its breaking has gone: nothing of the model is written again here.
//
// Needs waves.glsl, and the defines MAIN_SWELL_TOWARDS, MAIN_SWELL_PERIOD, MAIN_SWELL_SIZE, MAIN_SWELL_VARIETY,
// MAIN_SWELL_CAN_PLUNGE, and SWELL_1_TOWARDS, SWELL_1_PERIOD, SECOND_SWELL_SIZE and SECOND_SWELL_VARIETY.
// `seaFloor` and `sinceCrossings` are the sea floor's two pictures at p.
// RULES (docs/DEVICE_NOTES.md) as for waves.glsl.

// How far off the beach p is, as waveF measures it: by the beach as the swash feels it (shore.glsl).
float offBeachAt(vec2 p) {
  return BEACH_CURVE_LENGTH * (sqrt(max(1.0 - shoreH(p.x, p.y) / BEACH_CURVE_DEPTH, 0.04)) - 1.0);
}

// What every swell meets at p, as waveF works it out: (its slowness in seconds a metre, the depth on the beach, a
// gate that is 1 in the water and fades to nothing up the beach, the foam's fade at the waterline).
vec4 siteAt(vec2 p, float depth) {
  float offBeach = offBeachAt(p);
  return vec4(1.0 / swellSpeed(depth), clamp(-shoreH(p.x, p.y), 0.12, 6.0), smoothstep(-1.5, 0.3, offBeach),
    smoothstep(-0.4, 0.9, offBeach));
}

// How much of the swell reaches p (waveF's swellStrength).
float swellReachingAt(vec2 p) {
  return swellReaching(atan(p.y, p.x), offBeachAt(p));
}

// The main swell's wave at p, as waveF's SWELL asks waveOfTrain for it: `part` is what is asked (waves.glsl).
vec4 mainSwellAt(vec2 p, float t, vec4 seaFloor, vec4 sinceCrossings, float part) {
  float th = atan(p.y, p.x);
  float fullSize = MAIN_SWELL_SIZE * swellReachingAt(p) * alongShoreSwing(th, t, MAIN_SWELL_VARIETY);
  float turns = (t - dot(p, MAIN_SWELL_TOWARDS) / OPEN_SEA_SPEED - seaFloor.x) / MAIN_SWELL_PERIOD + 0.5;
  return waveOfTrain(FULL_TURN * (fract(turns) - 0.25), turns, fullSize, FULL_TURN / MAIN_SWELL_PERIOD,
    MAIN_SWELL_VARIETY, MAIN_SWELL_CAN_PLUNGE, th, seaFloor.z, sinceCrossings, siteAt(p, seaFloor.z), part);
}

// When and where: (the metres from p ahead, the way the swell travels, to the wave's crest; the stage of its
// breaking at its crest; how much of a lip it throws, 0 to 1; how high it stands as it breaks).
vec4 breakerTiming(vec2 p, float t, vec4 seaFloor, vec4 sinceCrossings) {
  return mainSwellAt(p, t, seaFloor, sinceCrossings, THE_FRONTS_TIMING);
}

// How high: (the height its front stands, from its foot to its crest; the level of its foot, from the still sea).
vec2 breakerHeights(vec2 p, float t, vec4 seaFloor, vec4 sinceCrossings) {
  return mainSwellAt(p, t, seaFloor, sinceCrossings, THE_FRONTS_HEIGHTS).xy;
}

// The main swell's own wave at p as the sea draws it, but not sunk out of the mesh's way where it stands up (this
// shader is compiled with SEA_NOT_SUNK_UNDER_MESH): (its height from the still sea, its crest height, the foam
// on the sea there). The mesh lays itself along this, so that it and the sea are one surface whatever the wave is
// doing, and wears the sea's foam. (The foam is the swell's own and the patchy foam where waves break, as waveF
// has them; what waves gone by have left is foamLeftBehind's.)
vec3 mainSwellNotSunk(vec2 p, float t) {
  vec4 seaFloor = texture2D(uSeaFloor, p / SEA_PICTURE_SPAN + 0.5);
  vec4 sinceCrossings = texture2D(uBreakTimes, p / SEA_PICTURE_SPAN + 0.5);
  vec4 wave = mainSwellAt(p, t, seaFloor, sinceCrossings, THE_SURFACE);
  float whereWavesBreak = smoothstep(-2.0, -0.5, sinceCrossings.z) * (1.0 - smoothstep(1.0, 4.0, sinceCrossings.z));
  float patchyFoam = 0.15 * swellReachingAt(p) * whereWavesBreak;
  return vec3(wave.x, wave.w, wave.z + patchyFoam);
}

// The sea's height at p besides the main swell's own wave: the second swell (x), and how much higher the water
// stands where its crest crosses the main swell's, for each metre of that crest's height (y). These are waveF's
// own sums. The breaker's mesh stands on them, as the sea's own wave does. (A third swell, if there ever is one,
// belongs here too.)
vec2 heightBesidesMainSwell(vec2 p, float t, vec4 seaFloor, vec4 sinceCrossings) {
  float th = atan(p.y, p.x);
  float fullSize = SECOND_SWELL_SIZE * swellReachingAt(p) * alongShoreSwing(th, t, SECOND_SWELL_VARIETY);
  float turns = (t - dot(p, SWELL_1_TOWARDS) / OPEN_SEA_SPEED - seaFloor.y) / SWELL_1_PERIOD + 0.5;
  vec4 second = waveOfTrain(FULL_TURN * (fract(turns) - 0.25), turns, fullSize, FULL_TURN / SWELL_1_PERIOD,
    SECOND_SWELL_VARIETY, 0.0, th, seaFloor.z, sinceCrossings, siteAt(p, seaFloor.z), THE_SURFACE);
  return vec2(second.x, 0.9 * second.w);
}
