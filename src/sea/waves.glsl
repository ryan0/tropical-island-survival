// The wave model: the height of the sea's surface at any point and moment, how far its water is pushed towards the
// shore, and the foam on it. water.vert.glsl moves the wave mesh by it.
//
// The waves have no sea floor of their own. They read the real one from two pictures (sea-floor-pictures.ts): how
// long each swell takes to arrive at a spot, and how long ago it first crossed water of four depths on its way
// there. A crest lies wherever a swell's arrival time and the clock agree, so crests slow over the reef and bend
// round shallows. Each wave has its own size (sets, and peaks along its crest). It grows as the water shallows and
// breaks where it is 0.78 of the depth high, so a big wave breaks further out than a small one, and the break runs
// along a crest wherever the floor is uneven. Its breaking then runs on seconds: it steepens and stands up, its lip
// falls for as long as gravity takes, lands, and the wave runs in as white water. A wave that meets a sudden
// shallow throws a lip; one that shoals gently crumbles.
//
// The beach is still a formula (shore.glsl): the swash and its run-up, and the fade up the sand.
//
// wave-model.ts is the program's copy of waveF, for all that must know where the water is. What the two must agree
// on about sizes and timing is written once, in wave-timing/timing.glsl, which both use; the shapes here are written
// again there, and a test (tests/wave-mirror.spec.ts) draws this one's wave heights and compares them with the
// program's.
//
// Needs from outside:
//   uDebugMode    a uniform, declared by the includer: 1 switches the waves off, 2 the falling lip
//   uBreakerArc   a uniform of its own, which whoever draws with it sets (see below)
//   SEA_PICTURE_SPAN, OPEN_SEA_SPEED   defines: the pictures' span in metres, and a swell's speed in the open sea
//   WAVE_MESH_FADES_FROM, WAVE_MESH_ENDS   defines: where the wave mesh ends, in metres along the reef, and where
//                 the swell begins to fade towards that
//   SWELLS, SWELLS_FOAM   defines: one SWELL(...) for each swell, with its numbers, and one SWELL_FOAM(...) for
//                 each, added together (water-materials.ts)
//   shoreH, islandR and openSea, from island-shape/shore.glsl (included here)
// Gives the includer waveF, and foamLeftBehind.
//
// RULES (docs/DEVICE_NOTES.md): no out or inout parameters, no loops, no arrays, branch-free maths, guarded pow and
// divisions. The swells are written out one after another by SWELLS, never looped over.
#include "../world/island-shape/shore"
#include "wave-timing/timing"
#include "../shaders/shared/turns"

// The sea floor as the waves know it (sea-floor-pictures.ts). uSeaFloor: (the main swell's delay, the second
// swell's, the depth). uBreakTimes: the seconds since the main swell crossed each of timing.glsl's four depths.
uniform sampler2D uSeaFloor;
uniform sampler2D uBreakTimes;

// The front of a breaking wave is not the sea's to draw: its face and its lip overhang, and they are the breaker's
// own mesh's (breaker.ts), which keeps to the crest. uBreakerArc: the directions that mesh can follow a crest in,
// as the middle of their arc and half its width (radians). A wave throws a lip wherever in that arc the floor
// makes it. The mesh draws the face, the lip, the crest and the top of the back. The sea keeps the rest of the
// wave's back: a slope BACK_LENGTH front heights long, which the mesh's own back lies along for its first
// BACK_UNDER_MESH of them. Under the mesh the sea falls away smoothly to the trough, inside the wave and out of
// the mesh's way. (breaker-shapes.ts has the same two numbers and the same slope.)
uniform vec2 uBreakerArc;
const float BACK_LENGTH = 5.5;
const float BACK_UNDER_MESH = 0.8;

// How far inside that arc a direction lies: 1 inside, 0 outside, fading over its last few degrees.
float inBreakerArc(float th) {
  float fromMiddle = abs(mod(th - uBreakerArc.x + HALF_TURN, FULL_TURN) - HALF_TURN);
  return 1.0 - smoothstep(uBreakerArc.y - 0.12, uBreakerArc.y - 0.04, fromMiddle);
}

// How much water lies behind the surface of a wave, level with it, where the wave's shape is not known: for the
// colouring, which lets the light through a wave's thin top (water.frag.glsl). A wave is thinner the nearer its
// top, and the water stands higher there. So, roughly: so many metres where the water stands at the still sea's
// level, less by so many for each metre it stands above that, and never less than a sheet. (At the still sea's
// level it must be more than any thickness the light comes through - water.frag.glsl's LIGHT_COMES_THROUGH - or
// the flat sea would glow.)
const float WATER_BEHIND_AT_REST = 3.6;
const float WATER_BEHIND_THINS = 2.4;
float waterBehindWave(float aboveStillSea) {
  return max(WATER_BEHIND_AT_REST - WATER_BEHIND_THINS * max(aboveStillSea, 0.0), 0.3);
}

// shore.glsl's beach: s metres off it the sea is BEACH_CURVE_DEPTH * ((1 + s / BEACH_CURVE_LENGTH)^2 - 1) deep. The
// model reads the curve backwards, from the depth to how far off the beach a point is. (Both numbers are
// shore.glsl's: keep them the same.)
const float BEACH_CURVE_LENGTH = 55.0;
const float BEACH_CURVE_DEPTH = 5.0;

// What waveOfTrain is asked for (`part`). The sea's own shader asks for the sea's surface; the breaker's mesh also
// asks, of the same sums, when and how high the wave's front stands (breaker-state.glsl).
const float THE_SURFACE = 0.0;
const float THE_FRONTS_TIMING = 1.0;
const float THE_FRONTS_HEIGHTS = 2.0;

// One swell at one spot. Returns, as `part` asks:
//   THE_SURFACE          (height, push towards the shore, foam 0..1, crest height)
//   THE_FRONTS_TIMING    (the metres from here ahead, the way the swell travels, to the wave's crest; the stage of
//                        its breaking at its crest; how much of a lip it throws, 0 to 1; how high it stands as it
//                        breaks)
//   THE_FRONTS_HEIGHTS   (the height its front stands, from its foot to its crest; the level of its foot, from the
//                        still sea; nothing; nothing)
//   trainPhase     the swell's phase here: a quarter turn where its crest is
//   turns          its crests gone by here, whole and part
//   fullSize       its size here, before sets
//   frequency, variety, canPlunge   the swell's own numbers (see SWELL); frequency in radians a second
//   th             the direction from the atoll's centre
//   depth          the sea floor's depth here
//   sinceCrossings the breaks picture here
//   site           what every swell meets here (see waveF)
vec4 waveOfTrain(
  float trainPhase,
  float turns,
  float fullSize,
  float frequency,
  float variety,
  float canPlunge,
  float th,
  float depth,
  vec4 sinceCrossings,
  vec4 site,
  float part
) {
  float slowness = site.x;
  float depthAtBeach = site.y;
  float gate = site.z;
  float foamAtWaterline = site.w;

  // This wave's own size, and the usual size of the swell's waves about now, which sets how far the water draws
  // down between crests. A bigger wave runs a little ahead of the rest in the shallows.
  float waveSize = sizeOfWave(fullSize, th, turns, variety);
  float usualSize = usualSizeOfWave(fullSize, turns, variety);
  float inShallows = 1.0 - smoothstep(3.0, 9.0, depth);
  float phase = trainPhase + RUNS_AHEAD * frequency * (waveSize - usualSize) * inShallows;

  // Shoaling, and the depth it breaks in: for this wave, and for the swell's usual wave.
  float feltDepth = clamp(depth, 0.12, 6.0);
  float shoaling = pow(6.0 / feltDepth, 0.25);
  float offshoreHeight = offshoreHeightOf(waveSize);
  float usualOffshoreHeight = offshoreHeightOf(usualSize);
  float breakingDepth = breakingDepthOf(offshoreHeight);
  float usualBreakingDepth = breakingDepthOf(usualOffshoreHeight);
  float breakerHeight = 0.78 * breakingDepth;
  float usualBreakerHeight = 0.78 * usualBreakingDepth;

  // The breaking stage here: from the seconds since this wave broke on its way to this spot (negative: still to
  // go), which the picture's four depths give.
  float lipFallTime = lipFallSeconds(breakerHeight);
  float sinceBroke =
    sinceCrossing(sinceCrossings.x, sinceCrossings.y, sinceCrossings.z, sinceCrossings.w, breakingDepth);
  float usualSinceBroke =
    sinceCrossing(sinceCrossings.x, sinceCrossings.y, sinceCrossings.z, sinceCrossings.w, usualBreakingDepth);
  float stage = stageOf(sinceBroke, lipFallTime);
  float usualStage = stageOf(usualSinceBroke, lipFallSeconds(usualBreakerHeight));
  float steepening = steepeningAt(stage);

  // Where this point is on the wave: phaseFromCrest in the swell's own radians, ahead of the crest (negative) or
  // behind it; fromCrest in the front's radians, which go by metres (timing.glsl).
  float waveNumber = frequency * slowness;
  float phaseFromCrest = mod(phase - QUARTER_TURN + leanOf(waveNumber) * steepening + HALF_TURN, FULL_TURN) - HALF_TURN;
  float fromCrest = frontFromCrest(phaseFromCrest, waveNumber);
  // crestStage: how far along its breaking THIS WAVE is - the stage where its crest is, not at this point. Every
  // point of the wave's front then agrees on the stage, so the face and the lip hold their shape as the wave
  // travels.
  float crestStage = stageOf(sinceBroke + secondsFromCrest(fromCrest, slowness), lipFallTime);
  float broken = smoothstep(0.95, 1.6, crestStage);
  float usualBroken = smoothstep(0.95, 1.6, usualStage);
  // (the metres one stage takes once the wave has broken)
  float breakingSpan = SECONDS_A_STAGE_AFTER / slowness;

  // After breaking: white water that loses height as it crosses the flat, down to a small wave that reaches the beach.
  // The shore break: where the sand rises to the beach, what is left of the wave stands up again - up to three times
  // as high as it crossed the flat, a hand to a knee - until the water is too shallow to carry it (heightLimit) and
  // it breaks on the sand. shoreBreak is how far that has gone: 0 out on the flat, 1 in the last metre or two.
  float shoreBreak = 1.0 - smoothstep(0.35, 1.3, depthAtBeach);
  float heightLimit = 0.66 * depthAtBeach + 0.04;
  // (white water keeps more of its height where the floor falls away again behind the break)
  float deeperThanItBroke = max(feltDepth - 0.6 * breakingDepth, 0.0);
  float boreOnFlat = 0.05 + 0.12 * breakerHeight + 0.55 * deeperThanItBroke
    + 0.66 * breakerHeight * (1.0 - smoothstep(1.5, 6.0, crestStage));
  float boreHeight = min(min(breakerHeight, boreOnFlat * (1.0 + 2.2 * shoreBreak)), heightLimit);
  // (The usual wave sets how far the water draws down between crests, so it grows much less in the shore break, or
  // the sea would stand a hand lower all along the beach.)
  float usualDeeperThanItBroke = max(feltDepth - 0.6 * usualBreakingDepth, 0.0);
  float usualBoreOnFlat = 0.05 + 0.12 * usualBreakerHeight + 0.55 * usualDeeperThanItBroke
    + 0.5 * usualBreakerHeight * (1.0 - smoothstep(1.5, 6.0, usualStage));
  float usualBoreHeight = min(min(usualBreakerHeight, usualBoreOnFlat * (1.0 + 0.8 * shoreBreak)), heightLimit);
  float shoaledHeight = min(offshoreHeight * shoaling, breakerHeight * 1.05);
  float usualShoaledHeight = min(usualOffshoreHeight * shoaling, usualBreakerHeight * 1.05);
  float height = mix(shoaledHeight, boreHeight, broken) * gate;
  float usualHeight = mix(usualShoaledHeight, usualBoreHeight, usualBroken) * gate;

  // A wave that meets a sudden shallow throws a lip; one that shoals gently crumbles.
  float shoalsIn =
    shoalingSeconds(sinceCrossings.x, sinceCrossings.y, sinceCrossings.z, sinceCrossings.w, breakingDepth);
  float plunging = plungingFor(shoalsIn) * canPlunge * inBreakerArc(th);
  // The wave stands up into a steep hollow face before its lip starts to fall.
  float standingUp = standingUpAt(crestStage) * plunging;
  // (uDebugMode 2: no falling lip)
  standingUp *= abs(uDebugMode - 2.0) < 0.5 ? 0.0 : 1.0;

  // Out at sea a swell is a long round back. In shallow water it stops being a sine: the crest narrows to a peak a
  // few metres wide, and the trough goes long and flat.
  float crestNarrowing = 1.0 + (max(0.55 / waveNumber, 1.0) - 1.0) * narrowingAt(stage);
  float shapePhase = clamp(phaseFromCrest * crestNarrowing, -HALF_TURN, HALF_TURN) + QUARTER_TURN - 0.45 * steepening;
  float sine = 0.5 + 0.5 * sin(shapePhase + 0.45 * steepening * sin(shapePhase));
  float swellShape = pow(max(sine, 1e-4), 2.4 + 3.6 * steepening);
  // The white water's front is about 1.4 m deep; at the beach, where the wave stands up again, half a metre.
  float boreFront = min(0.75, 1.4 * FRONT_WAVE_NUMBER) * (1.0 - 0.6 * shoreBreak);
  // White water: a steep front and a back that falls away over a few metres (2.5 m to lose two thirds; at the beach
  // half that: there it is a wave again, with a crest, not a low hump).
  float steepFront = smoothstep(-0.2 - boreFront, -0.2, fromCrest);
  float fallingBack = exp(-max(fromCrest, 0.0) * max(0.6, 0.4 / FRONT_WAVE_NUMBER) * (1.0 + 0.9 * shoreBreak));
  float boreShape = steepFront * fallingBack * (1.0 - smoothstep(1.2, 2.2, fromCrest));
  // (white water is lumpy: its height varies along the front and keeps changing)
  boreShape *= 1.0 + 0.30 * sin(th * 190.0 + fromCrest * 3.0 + variety) * sin(th * 67.0 - trainPhase * 0.5);
  float shape = mix(swellShape, boreShape, broken);
  float crestHeight = 0.62 * height * shape;
  float profileHeight = crestHeight - 0.22 * usualHeight;

  // Where the wave stands up, the sea is the wave's back and the trough ahead of it; the breaker's own mesh is
  // the rest. The back is a slope up towards the crest, which sinks to the trough before it gets there, hidden
  // under the mesh's own back. Ahead of the crest the water is drawn down, over some eight metres, to the foot of
  // the face, so that the trough runs level into it. (The front stands as high as the wave was when it broke,
  // until it has collapsed: not the white water's height, which the wave's own height turns to.)
  float standingHeight = shoaledHeight * gate;
  float frontHeight = FRONT_STANDS * standingHeight;
  float frontBase = -0.22 * usualHeight - 0.10 * standingHeight;
  float behindCrest = max(fromCrest, 0.0) / (FRONT_WAVE_NUMBER * max(frontHeight, 0.05));
  // (the slope is steepest at the crest and runs out level at its foot, so that the back has no edge where it
  // begins)
  float downBack = max(1.0 - behindCrest / BACK_LENGTH, 0.0);
  float backSlope = downBack * downBack;
  // (The mesh's own shader asks for the back as it would be if it did not sink, to lay its own back along it:
  // SEA_NOT_SUNK_UNDER_MESH is its define. Ahead of the crest it is given the trough, as the sea has it.)
  #ifdef SEA_NOT_SUNK_UNDER_MESH
  float backShows = step(-0.03, fromCrest);
  #else
  float backShows = smoothstep(0.25 * BACK_UNDER_MESH, BACK_UNDER_MESH, behindCrest);
  #endif
  float backFades = 1.0 - smoothstep(0.75 * BACK_LENGTH, BACK_LENGTH, behindCrest);
  float drawnDown = smoothstep(-2.4, -0.35, fromCrest);
  float frontLift = (frontBase + frontHeight * backSlope * backShows - profileHeight) * backFades * drawnDown
    * standingUp;
  // The lip lands and throws up a mound.
  float lipLanding = smoothstep(0.9, 1.15, crestStage) * (1.0 - smoothstep(1.5, 2.4, crestStage)) * plunging;
  float fromLanding = fromCrest + 0.40;
  float mound = 0.45 * breakerHeight * lipLanding * exp(-fromLanding * fromLanding / 0.16);

  // Foam. (The lip's is the breaker's own mesh's.)
  float bigness = clamp(waveSize / 0.4, 0.0, 1.0);
  // Thick behind the break, thinning out over the flat, a little again where the last of the wave meets the beach
  // (the shore break whitens from about knee depth in).
  float fadingOverFlat = exp(-max(stage - 1.6, 0.0) * breakingSpan * 0.13);
  float foamLeft = min(fadingOverFlat + 1.0 - smoothstep(0.3, 0.85, depthAtBeach), 1.0);
  float behindBoreFront = smoothstep(-0.2 - 1.25 * boreFront, -0.2 - 0.4 * boreFront, fromCrest);
  float boreFoamFade = max(mix(1.6, 1.1, bigness), 0.28 / FRONT_WAVE_NUMBER);
  float freshFoam = broken * behindBoreFront * exp(-max(fromCrest, 0.0) * boreFoamFade)
    * (1.0 - smoothstep(1.3, 2.2, fromCrest)) * foamLeft * foamAtWaterline;
  // (Foam lies only where the wave went by already broken: without this the whole band would whiten at once behind
  // a wave at the moment it broke, out to where it was still green. What it leaves lying behind it for the seconds
  // that follow is foamLeftBehind's.)
  float boreFoam = freshFoam * smoothstep(0.0, 0.6, sinceBroke);
  float whitecap = smoothstep(0.93, 1.0, swellShape) * steepening * 0.4 * (1.0 - broken) * (1.0 - standingUp);
  float landingFoam = lipLanding * exp(-fromLanding * fromLanding / 0.9) * 1.2;
  float foam = (boreFoam * (0.6 + 0.4 * bigness) + whitecap + landingFoam) * smoothstep(0.03, 0.10, waveSize);

  // The push towards the shore: under a steepening crest, and in the shore break, which leans towards the beach
  // as it stands up, which is what makes its face steep - but not in the last half metre of depth, where waveF
  // lays the swash sheet on the sand and it must not be pushed about.
  float swellPush = 0.45 * height * steepening * swellShape * (1.0 - broken) * (1.0 - standingUp);
  float shoreBreakLean = 0.9 * height * boreShape * broken * shoreBreak * smoothstep(0.5, 0.75, depthAtBeach);
  float surface = profileHeight + frontLift + mound;
  float push = swellPush + shoreBreakLean;
  // (the front's own answers: here behind the crest, fromCrest is above 0, and the crest is that far ahead; and no
  // lip is thrown up the beach, nor with uDebugMode 2)
  float lipThrown = plunging * gate * (abs(uDebugMode - 2.0) < 0.5 ? 0.0 : 1.0);
  vec4 frontsTiming = vec4(fromCrest / FRONT_WAVE_NUMBER, crestStage, lipThrown, breakerHeight);
  vec4 frontsHeights = vec4(frontHeight, frontBase, 0.0, 0.0);
  vec4 theSurface = vec4(surface, push, foam, crestHeight);
  // (chosen by arithmetic, not by branching: docs/DEVICE_NOTES.md)
  return mix(mix(theSurface, frontsTiming, step(0.5, part)), frontsHeights, step(1.5, part));
}

// The foam one wave left lying here when it went by `secondsSince` ago: none if it went by unbroken, more behind a
// big wave, less the further it had run since it broke, and thinning as it ages - a big wave's lasts longer.
//   wavesGoneBy   the wave's number in its swell
//   fullSize, variety, th, sinceCrossings   as for waveOfTrain
const float FOAM_LEFT = 0.5;
const float SMALL_WAVES_FOAM_LASTS = 3.0;
const float BIG_WAVES_FOAM_LASTS = 8.0;
float foamLeftByWave(float wavesGoneBy, float secondsSince, float fullSize, float variety, float th, vec4 sinceCrossings) {
  float waveSize = sizeAlongCrest(fullSize * setShare(wavesGoneBy, variety), th + PEAKS_SHIFT * wavesGoneBy, variety);
  float breakingDepth = breakingDepthOf(offshoreHeightOf(waveSize));
  float breakerHeight = 0.78 * breakingDepth;
  // (its stage as its crest went by here)
  float sinceBroke =
    sinceCrossing(sinceCrossings.x, sinceCrossings.y, sinceCrossings.z, sinceCrossings.w, breakingDepth);
  float stageThen = stageOf(sinceBroke, lipFallSeconds(breakerHeight));
  float wasBroken = smoothstep(0.95, 1.6, stageThen);
  float runOut = exp(-max(stageThen - 1.6, 0.0) * 0.12);
  float bigness = smoothstep(0.5, 1.5, breakerHeight);
  float lasts = mix(SMALL_WAVES_FOAM_LASTS, BIG_WAVES_FOAM_LASTS, bigness);
  // (it settles out of the white water over the first second, and is gone before a third wave has passed)
  float aged = smoothstep(0.0, 0.8, secondsSince) * exp(-max(secondsSince, 0.0) / lasts)
    * (1.0 - smoothstep(18.0, 24.0, secondsSince));
  return FOAM_LEFT * (0.4 + 0.6 * bigness) * wasBroken * runOut * aged * smoothstep(0.03, 0.10, waveSize);
}

// The foam a swell's last three waves left lying here. `turns` counts its crests gone by here, as in SWELL.
float foamLeftBySwell(float turns, float period, float fullSize, float variety, float th, vec4 sinceCrossings) {
  float wavesGoneBy = floor(turns);
  float sinceCrest = (turns - wavesGoneBy - 0.5) * period;
  return foamLeftByWave(wavesGoneBy, sinceCrest, fullSize, variety, th, sinceCrossings)
    + foamLeftByWave(wavesGoneBy - 1.0, sinceCrest + period, fullSize, variety, th, sinceCrossings)
    + foamLeftByWave(wavesGoneBy - 2.0, sinceCrest + 2.0 * period, fullSize, variety, th, sinceCrossings);
}

// One swell's foam left lying, for foamLeftBehind: SWELLS_FOAM, a define written by water-materials.ts, adds up
// one of these for each swell. It is made of foamLeftBehind's local names.
#define SWELL_FOAM(DELAY, TOWARDS, PERIOD, SIZE, VARIETY) foamLeftBySwell((t - dot(p, TOWARDS) / OPEN_SEA_SPEED - seaFloor.DELAY) / PERIOD + 0.5, PERIOD, SIZE * swellStrength * alongShoreSwing(th, t, VARIETY), VARIETY, th, sinceCrossings)

// How much of the swell reaches a spot: it dies away over the last of the wave mesh, out past the reef's drop-off
// (WAVE_MESH_FADES_FROM to WAVE_MESH_ENDS along the reef); it is strongest on the south side, which it comes from;
// none of it enters the inlet through the sandbar; and uDebugMode 1 switches it off.
float swellReaching(float th, float offBeach) {
  float towardsMeshEdge = 1.0 - smoothstep(WAVE_MESH_FADES_FROM, WAVE_MESH_ENDS, alongReef(offBeach, th));
  float southern = 0.68 + 0.32 * smoothstep(-0.4, 0.8, sin(th));
  float switchedOn = abs(uDebugMode - 1.0) < 0.5 ? 0.0 : 1.0;
  return towardsMeshEdge * southern * openSeaAt(th, offBeach) * switchedOn;
}

// One swell's part in the sea surface: its size here, the wave itself (kept in the variable NAME), and how far its
// swash runs up the beach. SWELLS, a define written by water-materials.ts from the sea's config, is one of these for
// each swell. DELAY is the channel of the floor picture that holds the swell's delay (x or y); TOWARDS the way it
// travels. A crest is where the clock and the swell's arrival agree: there `turns` is a whole number and a half.
// The run-up goes by the swell's arrival at the waterline. It is made of waveF's local names, so it belongs inside
// waveF and nowhere else.
#define SWELL(NAME, DELAY, TOWARDS, PERIOD, SIZE, VARIETY, CAN_PLUNGE, RUN_UP) fullSize = SIZE * swellStrength * alongShoreSwing(th, t, VARIETY); turns = (t - dot(p, TOWARDS) / OPEN_SEA_SPEED - seaFloor.DELAY) / PERIOD + 0.5; vec4 NAME = waveOfTrain(FULL_TURN * (fract(turns) - 0.25), turns, fullSize, FULL_TURN / PERIOD, VARIETY, CAN_PLUNGE, th, depth, sinceCrossings, site, THE_SURFACE); runUp += RUN_UP * runUpOf(fullSize, th, (t - dot(waterline, TOWARDS) / OPEN_SEA_SPEED - seaFloorAtWaterline.DELAY) / PERIOD, PERIOD, VARIETY);

// The whole sea surface at p (x, z) at time t: (height above still water, push towards the shore, foam 0..1, metres
// off the beach).
vec4 waveF(vec2 p, float t) {
  // Where p lies on the beach as the swash feels it (shore.glsl), and so how far off the beach it is.
  float th = atan(p.y, p.x);
  float ground = shoreH(p.x, p.y);
  float offBeach = BEACH_CURVE_LENGTH * (sqrt(max(1.0 - ground / BEACH_CURVE_DEPTH, 0.04)) - 1.0);

  // The sea floor here, and at the waterline in this direction, which the swash goes by.
  vec4 seaFloor = texture2D(uSeaFloor, p / SEA_PICTURE_SPAN + 0.5);
  vec4 sinceCrossings = texture2D(uBreakTimes, p / SEA_PICTURE_SPAN + 0.5);
  vec2 waterline = vec2(cos(th), sin(th)) * islandR(th);
  vec4 seaFloorAtWaterline = texture2D(uSeaFloor, waterline / SEA_PICTURE_SPAN + 0.5);
  float depth = seaFloor.z;

  // What every swell meets here: its slowness (seconds a metre), the depth on the beach here, a gate that is 1 in
  // the water and fades to nothing up the beach, and the foam's fade at the waterline.
  float slowness = 1.0 / swellSpeed(depth);
  float depthAtBeach = clamp(-ground, 0.12, 6.0);
  float gate = smoothstep(-1.5, 0.3, offBeach);
  float foamAtWaterline = smoothstep(-0.4, 0.9, offBeach);
  vec4 site = vec4(slowness, depthAtBeach, gate, foamAtWaterline);

  float swellStrength = swellReaching(th, offBeach);

  // The swells: SWELLS sets swell0 and swell1, and adds up their run-up.
  float runUp = 0.0;
  float fullSize;
  float turns;
  SWELLS

  // Where crests cross, they stand up higher.
  float crossings = swell0.w * swell1.w;
  float height = swell0.x + swell1.x + 0.9 * crossings;

  // Foam: the two swells', extra where crests cross in the shallows, and the patchy foam that never quite clears
  // where the swell breaks. Where one swell is standing up to break, the foam the other left there is stretched thin
  // over its face.
  float foamKept0 = 1.0 - 0.88 * smoothstep(0.05, 0.30, abs(swell0.y));
  float foamKept1 = 1.0 - 0.88 * smoothstep(0.05, 0.30, abs(swell1.y));
  float swellsFoam = swell0.z * foamKept1 + swell1.z * foamKept0;
  float crossingFoam = 2.5 * crossings * (1.0 - smoothstep(2.5, 6.0, depth));
  // (where a middling wave breaks: from a little before it crosses water 1.7 m deep to a few seconds after)
  float whereWavesBreak = smoothstep(-2.0, -0.5, sinceCrossings.z) * (1.0 - smoothstep(1.0, 4.0, sinceCrossings.z));
  float patchyFoam = 0.15 * swellStrength * whereWavesBreak;
  float foam = swellsFoam + (crossingFoam + patchyFoam) * foamKept0 * foamKept1;

  // The swash lifts the water near the beach, and leaves a sheet of water on the sand where it has run up - but not
  // where a wave is pushing the water about.
  runUp *= 0.8;
  height += 0.2 * runUp * (1.0 - smoothstep(0.0, 7.0, offBeach));
  float film = clamp((runUp - ground) * 0.3, -0.2, 0.10);
  float push = swell0.y + swell1.y;
  float pushed = smoothstep(0.02, 0.14, abs(push));
  float lift = max(ground + film - height, 0.0) * step(-0.5, ground) * (1.0 - pushed);
  // (The sheet carries no foam of its own: it used to, and it showed as a band of lace sitting on the beach above
  // the waves.)
  height += lift;
  return vec4(height, push, min(foam, 1.0), offBeach);
}

// The foam that waves gone by have left lying on the water at p (x, z) at time t, 0..1: what stays behind the white
// water for the seconds after a wave has broken, thinning to lace. It is worked out for one point only, where waveF
// is asked for three to find the surface's slope, which is why it is not waveF's.
float foamLeftBehind(vec2 p, float t) {
  float th = atan(p.y, p.x);
  float ground = shoreH(p.x, p.y);
  float offBeach = BEACH_CURVE_LENGTH * (sqrt(max(1.0 - ground / BEACH_CURVE_DEPTH, 0.04)) - 1.0);
  vec4 seaFloor = texture2D(uSeaFloor, p / SEA_PICTURE_SPAN + 0.5);
  vec4 sinceCrossings = texture2D(uBreakTimes, p / SEA_PICTURE_SPAN + 0.5);
  float swellStrength = swellReaching(th, offBeach);
  float foamAtWaterline = smoothstep(-0.4, 0.9, offBeach);
  return min(SWELLS_FOAM, 1.0) * foamAtWaterline;
}
