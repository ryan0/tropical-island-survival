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
//   SEA_PICTURE_SPAN, OPEN_SEA_SPEED   defines: the pictures' span in metres, and a swell's speed in the open sea
//   SWELLS        a define: one SWELL(...) for each swell, with its numbers (water-materials.ts)
//   shoreH, islandR and openSea, from island-shape/shore.glsl (included here)
// Gives the includer waveF.
//
// RULES (docs/DEVICE_NOTES.md): no out or inout parameters, no loops, no arrays, branch-free maths, guarded pow and
// divisions. The swells are written out one after another by SWELLS, never looped over.
#include "../world/island-shape/shore"
#include "wave-timing/timing"
#include "../shaders/shared/turns"

// The sea floor as the waves know it (sea-floor-pictures.ts). uSeaFloor: (the main swell's delay, the second
// swell's, the depth, unused). uBreakTimes: the seconds since the main swell crossed each of timing.glsl's four
// depths.
uniform sampler2D uSeaFloor;
uniform sampler2D uBreakTimes;

// shore.glsl's beach: s metres off it the sea is BEACH_CURVE_DEPTH * ((1 + s / BEACH_CURVE_LENGTH)^2 - 1) deep. The
// model reads the curve backwards, from the depth to how far off the beach a point is. (Both numbers are
// shore.glsl's: keep them the same.)
const float BEACH_CURVE_LENGTH = 55.0;
const float BEACH_CURVE_DEPTH = 5.0;

// The breaking wave's front: where a point of it ends up (x ahead of the crest, y up; both in wave heights).
// From the foot of the face (fromCrest -1.2) up a hollow face to the lip, then out along the lip's underside to its
// tip and back along its top to the crest.
//   fromCrest    the phase ahead of (-) or behind (+) the crest
//   lipFall      0..1: how far the lip has fallen
//   hollowness   0..1: a big wave throws its lip further out over a deeper face, which leaves a tube under it
// (Branch-free on purpose: each part is picked out by step and mix.)
vec2 breakingFront(float fromCrest, float lipFall, float hollowness) {
  // Where the lip's tip is: thrown out ahead, and falling.
  float tipAhead = 0.10 * smoothstep(0.0, 0.2, lipFall) + (0.48 + 0.40 * hollowness) * lipFall;
  float tipHeight = 1.0 - LIP_DROPS * lipFall * lipFall;
  // (the lip starts as nothing and thickens as it is thrown)
  float lipThickness = 0.15 + 0.85 * smoothstep(0.0, 0.25, lipFall);

  // The face, from its foot (fromCrest -1.2) up to where the lip leaves it (-0.7).
  float upTheFace = clamp((fromCrest + 1.2) / 0.5, 0.0, 1.0) * QUARTER_TURN;
  float faceAhead = 0.62 + 0.33 * hollowness - (0.63 + 0.33 * hollowness) * sin(upTheFace);
  vec2 face = vec2(faceAhead, 0.75 - 0.75 * cos(upTheFace));

  // The lip: its top from the crest (fromCrest 0.1) out to the tip (-0.3), its underside from the tip back to the
  // face (-0.7).
  float underLip = step(fromCrest, -0.3);
  float outAlongTop = 1.0 - clamp((fromCrest + 0.3) / 0.4, 0.0, 1.0);
  float outAlongUnderside = clamp((fromCrest + 0.7) / 0.4, 0.0, 1.0);
  float outAlongLip = mix(outAlongTop, outAlongUnderside, underLip);
  vec2 topOfLip = vec2(-0.05 + (tipAhead + 0.05) * outAlongLip, 1.0 - (1.0 - tipHeight) * outAlongLip * outAlongLip);
  vec2 belowTop = underLip * lipThickness * vec2(0.04 * (1.0 - outAlongLip), -0.18 * (1.0 - outAlongLip) - 0.07);
  vec2 lip = topOfLip + belowTop;

  return mix(lip, face, step(fromCrest, -0.7));
}

// One swell at one spot. Returns (height, push towards the shore, foam 0..1, crest height).
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
  vec4 site
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
  // (big waves are hollow)
  float hollowness = smoothstep(0.55, 1.05, breakerHeight);

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

  // A wave that meets a sudden shallow throws a lip; one that shoals gently crumbles.
  float shoalsIn =
    shoalingSeconds(sinceCrossings.x, sinceCrossings.y, sinceCrossings.z, sinceCrossings.w, breakingDepth);
  float plunging = plungingFor(shoalsIn) * canPlunge;
  // The wave stands up into a steep hollow face before its lip starts to fall (lipFall).
  float standingUp = standingUpAt(crestStage) * plunging;
  // (uDebugMode 2: no falling lip)
  standingUp *= abs(uDebugMode - 2.0) < 0.5 ? 0.0 : 1.0;
  float frontHeight = FRONT_STANDS * height;
  float lipFall = clamp(crestStage, 0.0, 1.0);

  // The breaking front: each point of it is moved from where the swell has it to where breakingFront puts it.
  // The water just ahead (fromCrest -1.5 to -1.2) is drawn in flat to the foot of the face, so the trough runs right
  // up to it.
  float inFront = step(-1.5, fromCrest) * step(fromCrest, 0.1);
  float inLip = step(-0.7, fromCrest) * inFront;
  vec2 frontPoint = breakingFront(fromCrest, lipFall, hollowness);
  float intoFace = smoothstep(-1.5, -1.2, fromCrest);
  // (the back of the wave: about 3.6 m long)
  float onBack =
    (1.0 - smoothstep(0.0, 1.0, (fromCrest - 0.1) / min(1.1, 3.6 * FRONT_WAVE_NUMBER))) * step(0.1, fromCrest);
  float frontBase = -0.22 * usualHeight - 0.10 * height;
  float pushInFront = (frontHeight * frontPoint.x + fromCrest / FRONT_WAVE_NUMBER) * intoFace * inFront;
  float pushOnBack = (-0.05 * frontHeight + 0.1 / FRONT_WAVE_NUMBER) * onBack;
  // (The water is drawn in to the face early in the standing up, and lifted all through it: the front steepens
  // first and then grows. Drawn in only as it is lifted, the face would arrive as a ledge sliding in ahead of the
  // crest.)
  float frontPush = (pushInFront + pushOnBack) * smoothstep(0.0, 0.35, standingUp);
  float liftInFront = (frontBase + frontHeight * frontPoint.y - profileHeight) * intoFace * inFront;
  float liftOnBack = (frontBase + frontHeight - profileHeight) * onBack;
  float frontLift = (liftInFront + liftOnBack) * standingUp;
  // The face draws up the water ahead of it: the trough there sinks.
  float aheadOfFace = fromCrest + 1.4;
  float suck = -0.10 * height * standingUp * exp(-aheadOfFace * aheadOfFace / 0.35);
  // The lip lands and throws up a mound.
  float lipLanding = smoothstep(0.9, 1.15, crestStage) * (1.0 - smoothstep(1.5, 2.4, crestStage)) * plunging;
  float fromLanding = fromCrest + 0.40;
  float mound = 0.45 * breakerHeight * lipLanding * exp(-fromLanding * fromLanding / 0.16);

  // Foam. The lip is a sheet of clear water that whitens from its edge inwards as it falls.
  float bigness = clamp(waveSize / 0.4, 0.0, 1.0);
  float lipEdge = clamp(1.0 - abs(fromCrest + 0.3) / 0.4, 0.0, 1.0);
  float foamOnLip = inLip * (0.10 + smoothstep(0.25, 0.8, lipFall) * (0.25 + 0.75 * lipEdge));
  float foamOnFace = (inFront - inLip) * intoFace * clamp((fromCrest + 1.2) / 0.5, 0.0, 1.0)
    * smoothstep(0.7, 1.0, lipFall) * 0.6;
  float lipFoam = standingUp * (foamOnLip + foamOnFace);
  // Thick behind the break, thinning out over the flat, a little again where the last of the wave meets the beach
  // (the shore break whitens from about knee depth in).
  float fadingOverFlat = exp(-max(stage - 1.6, 0.0) * breakingSpan * 0.13);
  float foamLeft = min(fadingOverFlat + 1.0 - smoothstep(0.3, 0.85, depthAtBeach), 1.0);
  float behindBoreFront = smoothstep(-0.2 - 1.25 * boreFront, -0.2 - 0.4 * boreFront, fromCrest);
  float boreFoamFade = max(mix(1.6, 1.1, bigness), 0.28 / FRONT_WAVE_NUMBER);
  float freshFoam = broken * behindBoreFront * exp(-max(fromCrest, 0.0) * boreFoamFade)
    * (1.0 - smoothstep(1.3, 2.2, fromCrest)) * foamLeft * foamAtWaterline;
  // And long after the white water has gone by, thin foam is still lying there in streaks, until the next wave.
  float lyingFoam = broken * behindBoreFront * 0.30 * bigness * exp(-max(fromCrest, 0.0) * 0.30)
    * (1.0 - smoothstep(2.3, 3.0, fromCrest)) * min(foamLeft * 1.6, 1.0) * foamAtWaterline;
  // (Foam lies only where the wave went by already broken: without this the whole band would whiten at once behind
  // a wave at the moment it broke, out to where it was still green.)
  float boreFoam = (freshFoam + lyingFoam) * smoothstep(0.0, 0.6, sinceBroke);
  float whitecap = smoothstep(0.93, 1.0, swellShape) * steepening * 0.4 * (1.0 - broken) * (1.0 - standingUp);
  float landingFoam = lipLanding * exp(-fromLanding * fromLanding / 0.9) * 1.2;
  float foam = (lipFoam + boreFoam * (0.6 + 0.4 * bigness) + whitecap + landingFoam) * smoothstep(0.03, 0.10, waveSize);

  // The push towards the shore: under a steepening crest, across the breaking front, and in the shore break, which
  // leans towards the beach as it stands up, which is what makes its face steep - but not in the last half metre of
  // depth, where waveF lays the swash sheet on the sand and it must not be pushed about.
  float swellPush = 0.45 * height * steepening * swellShape * (1.0 - broken) * (1.0 - standingUp);
  float shoreBreakLean = 0.9 * height * boreShape * broken * shoreBreak * smoothstep(0.5, 0.75, depthAtBeach);
  float surface = profileHeight + frontLift + suck + mound;
  float push = swellPush + frontPush + shoreBreakLean;
  return vec4(surface, push, foam, crestHeight);
}

// One swell's part in the sea surface: its size here, the wave itself (kept in the variable NAME), and how far its
// swash runs up the beach. SWELLS, a define written by water-materials.ts from the sea's config, is one of these for
// each swell. DELAY is the channel of the floor picture that holds the swell's delay (x or y); TOWARDS the way it
// travels. A crest is where the clock and the swell's arrival agree: there `turns` is a whole number and a half.
// The run-up goes by the swell's arrival at the waterline. It is made of waveF's local names, so it belongs inside
// waveF and nowhere else.
#define SWELL(NAME, DELAY, TOWARDS, PERIOD, SIZE, VARIETY, CAN_PLUNGE, RUN_UP) fullSize = SIZE * swellStrength * alongShoreSwing(th, t, VARIETY); turns = (t - dot(p, TOWARDS) / OPEN_SEA_SPEED - seaFloor.DELAY) / PERIOD + 0.5; vec4 NAME = waveOfTrain(FULL_TURN * (fract(turns) - 0.25), turns, fullSize, FULL_TURN / PERIOD, VARIETY, CAN_PLUNGE, th, depth, sinceCrossings, site); runUp += RUN_UP * runUpOf(fullSize, th, (t - dot(waterline, TOWARDS) / OPEN_SEA_SPEED - seaFloorAtWaterline.DELAY) / PERIOD, PERIOD, VARIETY);

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

  // How much of the swell reaches here: it dies away 62 to 95 m off the beach, where the wave mesh ends; it is
  // strongest on the south side, which it comes from; none of it enters the channel; and uDebugMode 1 switches it off.
  float towardsMeshEdge = 1.0 - smoothstep(62.0, 95.0, offBeach);
  float southern = 0.68 + 0.32 * smoothstep(-0.4, 0.8, sin(th));
  float switchedOn = abs(uDebugMode - 1.0) < 0.5 ? 0.0 : 1.0;
  float swellStrength = towardsMeshEdge * southern * openSea(th) * switchedOn;

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
