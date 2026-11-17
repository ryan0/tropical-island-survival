// The main swell's breaking wave as its own mesh needs to know it, at a spot near its crest (breaker.vert.glsl).
// These are waveOfTrain's own sums (waves.glsl) for the main swell alone, and must stay the same as its: the mesh
// and the sea have to agree where the crest is, how high the wave stands and how far its breaking has gone.
//
// Needs waves.glsl, and the defines MAIN_SWELL_TOWARDS, MAIN_SWELL_PERIOD, MAIN_SWELL_SIZE, MAIN_SWELL_VARIETY and
// MAIN_SWELL_CAN_PLUNGE. `seaFloor` and `sinceCrossings` are the sea floor's two pictures at p.
// RULES (docs/DEVICE_NOTES.md) as for waves.glsl.

// When and where: (the metres from p ahead, the way the swell travels, to the wave's crest; the stage of its
// breaking at its crest; how much of a lip it throws, 0 to 1; how high it stands as it breaks).
vec4 breakerTiming(vec2 p, float t, vec4 seaFloor, vec4 sinceCrossings) {
  float th = atan(p.y, p.x);
  float ground = shoreH(p.x, p.y);
  float offBeach = BEACH_CURVE_LENGTH * (sqrt(max(1.0 - ground / BEACH_CURVE_DEPTH, 0.04)) - 1.0);
  float depth = seaFloor.z;
  float slowness = 1.0 / swellSpeed(depth);
  float gate = smoothstep(-1.5, 0.3, offBeach);

  float fullSize = MAIN_SWELL_SIZE * swellReaching(th, offBeach) * alongShoreSwing(th, t, MAIN_SWELL_VARIETY);
  float turns = (t - dot(p, MAIN_SWELL_TOWARDS) / OPEN_SEA_SPEED - seaFloor.x) / MAIN_SWELL_PERIOD + 0.5;
  float frequency = FULL_TURN / MAIN_SWELL_PERIOD;
  float waveSize = sizeOfWave(fullSize, th, turns, MAIN_SWELL_VARIETY);
  float usualSize = usualSizeOfWave(fullSize, turns, MAIN_SWELL_VARIETY);
  float inShallows = 1.0 - smoothstep(3.0, 9.0, depth);
  float phase = FULL_TURN * (fract(turns) - 0.25) + RUNS_AHEAD * frequency * (waveSize - usualSize) * inShallows;

  float breakingDepth = breakingDepthOf(offshoreHeightOf(waveSize));
  float breakerHeight = 0.78 * breakingDepth;
  float lipFallTime = lipFallSeconds(breakerHeight);
  float sinceBroke =
    sinceCrossing(sinceCrossings.x, sinceCrossings.y, sinceCrossings.z, sinceCrossings.w, breakingDepth);
  float steepening = steepeningAt(stageOf(sinceBroke, lipFallTime));

  float waveNumber = frequency * slowness;
  float phaseFromCrest = mod(phase - QUARTER_TURN + leanOf(waveNumber) * steepening + HALF_TURN, FULL_TURN) - HALF_TURN;
  float fromCrest = frontFromCrest(phaseFromCrest, waveNumber);
  float crestStage = stageOf(sinceBroke + secondsFromCrest(fromCrest, slowness), lipFallTime);

  float shoalsIn =
    shoalingSeconds(sinceCrossings.x, sinceCrossings.y, sinceCrossings.z, sinceCrossings.w, breakingDepth);
  float plunging = plungingFor(shoalsIn) * MAIN_SWELL_CAN_PLUNGE * inBreakerArc(th) * gate;
  // (p is behind the crest where fromCrest is above 0: the crest is then that far ahead of it)
  return vec4(fromCrest / FRONT_WAVE_NUMBER, crestStage, plunging, breakerHeight);
}

// How high: (the height its front stands, from its foot to its crest; the level of its foot, from the still sea).
// `crestStage` is breakerTiming's.
vec2 breakerHeights(vec2 p, float t, vec4 seaFloor, vec4 sinceCrossings, float crestStage) {
  float th = atan(p.y, p.x);
  float ground = shoreH(p.x, p.y);
  float offBeach = BEACH_CURVE_LENGTH * (sqrt(max(1.0 - ground / BEACH_CURVE_DEPTH, 0.04)) - 1.0);
  float gate = smoothstep(-1.5, 0.3, offBeach);
  float feltDepth = clamp(seaFloor.z, 0.12, 6.0);
  float shoaling = pow(6.0 / feltDepth, 0.25);

  float fullSize = MAIN_SWELL_SIZE * swellReaching(th, offBeach) * alongShoreSwing(th, t, MAIN_SWELL_VARIETY);
  float turns = (t - dot(p, MAIN_SWELL_TOWARDS) / OPEN_SEA_SPEED - seaFloor.x) / MAIN_SWELL_PERIOD + 0.5;
  float offshoreHeight = offshoreHeightOf(sizeOfWave(fullSize, th, turns, MAIN_SWELL_VARIETY));
  float usualOffshoreHeight = offshoreHeightOf(usualSizeOfWave(fullSize, turns, MAIN_SWELL_VARIETY));
  float breakingDepth = breakingDepthOf(offshoreHeight);
  float usualBreakingDepth = breakingDepthOf(usualOffshoreHeight);
  float breakerHeight = 0.78 * breakingDepth;
  float usualBreakerHeight = 0.78 * usualBreakingDepth;

  // This wave: shoaled until it breaks, then white water that loses height (out here, far from the shore break).
  float broken = smoothstep(0.95, 1.6, crestStage);
  float boreHeight = min(breakerHeight, 0.05 + 0.12 * breakerHeight + 0.55 * max(feltDepth - 0.6 * breakingDepth, 0.0)
    + 0.66 * breakerHeight * (1.0 - smoothstep(1.5, 6.0, crestStage)));
  float height = mix(min(offshoreHeight * shoaling, breakerHeight * 1.05), boreHeight, broken) * gate;

  // The swell's usual wave, which sets how far the water draws down between crests.
  float usualSinceBroke =
    sinceCrossing(sinceCrossings.x, sinceCrossings.y, sinceCrossings.z, sinceCrossings.w, usualBreakingDepth);
  float usualStage = stageOf(usualSinceBroke, lipFallSeconds(usualBreakerHeight));
  float usualBoreHeight = min(usualBreakerHeight, 0.05 + 0.12 * usualBreakerHeight
    + 0.55 * max(feltDepth - 0.6 * usualBreakingDepth, 0.0)
    + 0.5 * usualBreakerHeight * (1.0 - smoothstep(1.5, 6.0, usualStage)));
  float usualHeight = mix(min(usualOffshoreHeight * shoaling, usualBreakerHeight * 1.05), usualBoreHeight,
    smoothstep(0.95, 1.6, usualStage)) * gate;

  return vec2(FRONT_STANDS * height, -0.22 * usualHeight - 0.10 * height);
}
