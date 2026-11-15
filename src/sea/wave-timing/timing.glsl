// The swell's timing: how big each wave is, how fast it travels, when it breaks, and how its breaking runs on.
// The wave shader (waves.glsl) and the program (wave-model.ts) must agree on all of it, so it is written once, here,
// and shared with the program as the island's shape is (tools/glsl-for-program-plugin.ts). Only float functions of
// float arguments and float constants may be written here.
//
// Distances are metres, times seconds, angles radians.

const float GRAVITY = 9.81;
// (a full turn under a name of its own: the shaders' shared one cannot be included in a file the program shares)
const float WAVE_TURN = 6.283185307179586;
const float WAVE_HALF_TURN = 3.141592653589793;

// ---- How fast a swell travels ----

// The swell feels no depth beyond DEEPEST_FELT, and up the sand it keeps the speed of water SHALLOWEST_FELT deep:
// the swash.
const float SHALLOWEST_FELT = 0.15;
const float DEEPEST_FELT = 12.0;

// Metres a second, in water `depth` metres deep: a long wave travels at the square root of gravity times the depth.
float swellSpeed(float depth) {
  return sqrt(GRAVITY * min(max(depth, SHALLOWEST_FELT), DEEPEST_FELT));
}

// ---- How big each wave is ----

// A swell comes in sets: a few big waves, then a few about half as big. This is a wave's share of the swell's full size, by how
// many waves have gone by before it (whole for a wave, or part-way for the water between two). `variety` is the
// swell's own number, which gives each swell its own pattern.
const float WAVES_IN_A_SET = 4.5;
float setShare(float wavesGoneBy, float variety) {
  float sets = sin(WAVE_TURN * wavesGoneBy / WAVES_IN_A_SET + variety);
  // (and no two sets alike)
  float unevenness = sin(WAVE_TURN * wavesGoneBy / 2.9 + 2.0 * variety);
  return 0.72 + 0.22 * sets + 0.06 * unevenness;
}

// The size of one wave along its crest: big peaks, small shoulders. alongShore is where along the shore (an angle).
float sizeAlongCrest(float waveSize, float alongShore, float variety) {
  float peakWave = 0.5 + 0.5 * sin(alongShore * 18.0 + 2.5 * sin(alongShore * 6.0 + variety) + variety);
  float peaks = pow(max(peakWave, 1e-4), 2.2);
  float slowSwing = 0.5 + 0.5 * sin(alongShore * 9.0 + variety * 5.0);
  return waveSize * (0.62 + 0.55 * peaks + 0.25 * slowSwing);
}

// The size the swell's waves have about now: the set's share without any one wave's peaks. It sets how far the
// water draws down between crests.
float usualSizeOfWave(float fullSize, float turns, float variety) {
  return fullSize * setShare(turns, variety);
}

// Every wave has its own size: its share of the set, and its own peaks along its crest (each wave's peaks lie
// PEAKS_SHIFT further round the shore than the last one's). Half way between two crests the sizes meet, so that the
// surface has no step there. `turns` counts the swell's crests gone by, whole and part; `fullSize` is the swell's
// size here, before sets.
const float PEAKS_SHIFT = 2.4;
float sizeOfWave(float fullSize, float th, float turns, float variety) {
  float wavesGoneBy = floor(turns);
  float ownSize = sizeAlongCrest(fullSize * setShare(wavesGoneBy, variety), th + PEAKS_SHIFT * wavesGoneBy, variety);
  float betweenWaves = 0.95 * usualSizeOfWave(fullSize, turns, variety);
  return mix(ownSize, betweenWaves, smoothstep(0.75, 1.0, abs(turns - wavesGoneBy - 0.5) * 2.0));
}

// The swell's size also swings gently along the shore, and the swing drifts.
float alongShoreSwing(float th, float t, float variety) {
  return 0.88 + 0.12 * sin(th * 13.0 + variety * 1.7 + t * 0.05);
}

// A wave's height in water 6 m deep: 1.65 of its size, and no more than HIGHEST_OFFSHORE.
const float HIGHEST_OFFSHORE = 1.4;
float offshoreHeightOf(float waveSize) {
  return min(1.65 * waveSize, HIGHEST_OFFSHORE);
}

// ---- When a wave breaks ----

// A wave that is `offshoreHeight` high in water 6 m deep grows as the water shallows (Green's law: as the depth to
// the power -1/4) and breaks where it is 0.78 of the depth high. This is that depth. (2.0064 is 6^(1/4) / 0.78.)
float breakingDepthOf(float offshoreHeight) {
  return pow(max(offshoreHeight, 1e-4) * 2.0064, 0.8);
}

// The breaks picture (sea-floor-pictures.ts) keeps, for these four depths, how many seconds ago the swell first
// crossed water that shallow on its way to each spot: negative while that is still ahead of it.
const float BREAK_DEPTH_0 = 0.7;
const float BREAK_DEPTH_1 = 1.2;
const float BREAK_DEPTH_2 = 1.7;
const float BREAK_DEPTH_3 = 2.4;
float breakDepth0() { return BREAK_DEPTH_0; }
float breakDepth1() { return BREAK_DEPTH_1; }
float breakDepth2() { return BREAK_DEPTH_2; }
float breakDepth3() { return BREAK_DEPTH_3; }

// How many seconds ago a wave that breaks in water `breakingDepth` deep broke, on its way to a spot where the
// picture holds since0 to since3: read between the picture's four depths. Negative: it has that long still to go.
float sinceCrossing(float since0, float since1, float since2, float since3, float breakingDepth) {
  float share01 = clamp((breakingDepth - BREAK_DEPTH_0) / (BREAK_DEPTH_1 - BREAK_DEPTH_0), 0.0, 1.0);
  float share12 = clamp((breakingDepth - BREAK_DEPTH_1) / (BREAK_DEPTH_2 - BREAK_DEPTH_1), 0.0, 1.0);
  float share23 = clamp((breakingDepth - BREAK_DEPTH_2) / (BREAK_DEPTH_3 - BREAK_DEPTH_2), 0.0, 1.0);
  return mix(mix(mix(since0, since1, share01), since2, share12), since3, share23);
}

// How abruptly the floor rises to where a wave breaks: the seconds the wave takes over its last LAST_SHOALING
// metres of shoaling. A wave that meets a sudden shallow throws a lip; one that shoals gently crumbles.
const float LAST_SHOALING = 0.6;
float shoalingSeconds(float since0, float since1, float since2, float since3, float breakingDepth) {
  return sinceCrossing(since0, since1, since2, since3, breakingDepth + LAST_SHOALING)
    - sinceCrossing(since0, since1, since2, since3, breakingDepth);
}

// ---- How its breaking runs on ----

// The breaking wave's front stands FRONT_STANDS of the wave's height high, and its lip falls LIP_DROPS of that
// before it lands: freely, so in the time gravity takes.
const float FRONT_STANDS = 1.15;
const float LIP_DROPS = 0.9;
float lipFallSeconds(float breakerHeight) {
  return sqrt(2.0 * LIP_DROPS * FRONT_STANDS * max(breakerHeight, 0.05) / GRAVITY);
}

// A wave's breaking is told by its stage. Before it breaks the stage is negative: it steepens, and stands up. From
// 0 to 1 its lip is in the air; from 1 on it has landed, collapses, and runs in as white water. Before and after,
// a stage lasts these many seconds; in between, as long as the lip takes to fall.
const float SECONDS_A_STAGE_BEFORE = 1.7;
const float SECONDS_A_STAGE_AFTER = 1.2;
float secondsAStageAfter() { return SECONDS_A_STAGE_AFTER; }
float stageOf(float sinceBreaking, float lipFall) {
  return min(sinceBreaking, 0.0) / SECONDS_A_STAGE_BEFORE
    + clamp(sinceBreaking, 0.0, lipFall) / lipFall
    + max(sinceBreaking - lipFall, 0.0) / SECONDS_A_STAGE_AFTER;
}

// How far a wave has steepened towards breaking, 0 to 1: its crest sharpens and leans forward over the last
// three seconds.
float steepeningAt(float stage) {
  return smoothstep(-1.8, 0.0, stage);
}

// How far its crest has narrowed, 0 to 1: from a long swell's round back to a peak a few metres wide, between
// four seconds and one second before it breaks.
float narrowingAt(float stage) {
  return smoothstep(-2.4, -0.6, stage);
}

// How far a wave that throws a lip has stood up into a steep hollow face, 0 to 1: over its last two seconds, and
// down again once the lip has landed. `crestStage` is the stage at the wave's crest.
float standingUpAt(float crestStage) {
  return smoothstep(-1.3, -0.1, crestStage) * (1.0 - smoothstep(1.0, 1.8, crestStage));
}

// Whether a wave throws a lip (1) or crumbles (0), by the seconds its last shoaling takes (shoalingSeconds).
float plungingFor(float shoaling) {
  return 1.0 - smoothstep(1.5, 4.0, shoaling);
}

// The front, the lip and the white water are shaped by how far a point is from the crest in metres, whatever the
// swell's own length: FRONT_WAVE_NUMBER of their radians to a metre. (They were drawn for a swell of that many
// radians a metre.) This turns a point's phase from the crest into them; `waveNumber` is the swell's own radians a
// metre here.
const float FRONT_WAVE_NUMBER = 0.244;
float frontWaveNumber() { return FRONT_WAVE_NUMBER; }
float frontFromCrest(float phaseFromCrest, float waveNumber) {
  return clamp(phaseFromCrest * FRONT_WAVE_NUMBER / max(waveNumber, 1e-3), -WAVE_HALF_TURN, WAVE_HALF_TURN);
}

// A steepening crest leans forward CREST_LEANS metres: so many radians of the swell.
const float CREST_LEANS = 1.84;
float leanOf(float waveNumber) {
  return min(0.45, CREST_LEANS * waveNumber);
}

// The seconds by which a point of the wave's front is ahead of the crest (negative) or behind it, so that the
// whole front can go by the stage at the crest and hold its shape as it travels. `slowness` is seconds a metre.
float secondsFromCrest(float fromCrest, float slowness) {
  return clamp(fromCrest, -1.6, 1.4) * (1.0 - smoothstep(2.2, 3.0, abs(fromCrest))) * slowness / FRONT_WAVE_NUMBER;
}

// ---- The swash ----

// A bigger wave runs a little ahead of the rest in the shallows: this many seconds for each metre of size.
const float RUNS_AHEAD = 1.3;
float runsAhead() { return RUNS_AHEAD; }

// How far up the beach the water is running (metres above sea level): one pulse for each wave, as it arrives.
// turnsAtWaterline counts the swell's crests that have reached the waterline, whole and part.
float runUpOf(float fullSize, float th, float turnsAtWaterline, float period, float variety) {
  float waveSize = sizeOfWave(fullSize, th, turnsAtWaterline, variety);
  float usualSize = usualSizeOfWave(fullSize, turnsAtWaterline, variety);
  float sinceCrest = (turnsAtWaterline - floor(turnsAtWaterline)) * period + RUNS_AHEAD * (waveSize - usualSize);
  float reach = min(1.9 * waveSize * (1.0 + 1.8 * waveSize), 1.0);
  return reach * smoothstep(0.0, 0.8, sinceCrest) * (1.0 - smoothstep(1.0, 3.1, sinceCrest));
}
