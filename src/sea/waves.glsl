// The wave model: the height of the sea's surface at any point and moment, how far its water is pushed towards the
// shore, and the foam on it. water.vert.glsl moves the wave mesh by it.
//
// wave-model.ts is the program's copy, function for function (its heightAt is waveF here, addTrain is waveOfTrain;
// sizeAlongCrest, sizeOfWave and runUpOf have the same names in both). The two must change together: a test
// (tests/wave-mirror.spec.ts) draws this one's wave heights and compares them with the program's.
//
// The swell meets the atoll twice. It breaks on the outer edge of the reef flat (REEF_BREAK metres off the beach),
// crosses the flat as a line of white water that dies down, and what is left laps onto the beach as a small wave.
// Each wave shoals by Green's law (its height grows as the depth to the power -1/4) and starts to break where it is
// 0.78 of the depth high. Its breaking stage then runs from 0 to 1 while the crest throws a lip that falls ahead of
// it, from 1 to 1.6 while that collapses, and afterwards the wave runs in as a bore.
//
// Needs from outside:
//   uDebugMode          a uniform, declared by the includer: 1 switches the waves off, 2 the falling lip
//   WAVE_TRAINS   a define: one WAVE_TRAIN(...) for each train, with its numbers (water-materials.ts)
//   REEF_BREAK    a define: how many metres off the beach the swell breaks on the reef
//   shoreH and openSea, from island-shape/shore.glsl (included here)
// Gives the includer waveF.
//
// RULES (docs/DEVICE_NOTES.md): no out or inout parameters, no loops, no arrays, branch-free maths, guarded pow and
// divisions. The trains are written out one after another by WAVE_TRAINS, never looped over.
#include "../world/island-shape/shore"

// shore.glsl's beach: s metres off it the sea is BEACH_CURVE_DEPTH * ((1 + s / BEACH_CURVE_LENGTH)^2 - 1) deep. The
// model reads the curve backwards, from the depth to how far off the beach the swell feels itself, and lays it at the
// reef break for the depth the swell feels on its way in. (Both numbers are shore.glsl's: keep them the same.)
const float BEACH_CURVE_LENGTH = 55.0;
const float BEACH_CURVE_DEPTH = 5.0;
// The speed the swell's lines travel at out at sea, in metres a second (water-materials.ts has it too).
const float SWELL_SPEED = 4.95;

// The size of one wave along its crest: big peaks, small shoulders. alongShore is where along the shore (an angle),
// variety the train's own number, which gives each train its own pattern.
float sizeAlongCrest(float trainSize, float alongShore, float variety) {
  float peakWave = 0.5 + 0.5 * sin(alongShore * 18.0 + 2.5 * sin(alongShore * 6.0 + variety) + variety);
  float peaks = pow(max(peakWave, 1e-4), 2.2);
  float slowSwing = 0.5 + 0.5 * sin(alongShore * 9.0 + variety * 5.0);
  return trainSize * (0.62 + 0.55 * peaks + 0.25 * slowSwing);
}

// Every wave has its own size. Half way between two crests the sizes meet, so that the surface has no step there.
// turns counts the train's crests gone by, whole and part.
float sizeOfWave(float trainSize, float th, float turns, float crests, float variety) {
  float crestsGoneBy = floor(turns);
  float ownSize = sizeAlongCrest(trainSize, th - 6.2832 * crestsGoneBy / crests, variety);
  return mix(ownSize, 0.95 * trainSize, smoothstep(0.75, 1.0, abs(turns - crestsGoneBy - 0.5) * 2.0));
}

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
  float tipHeight = 1.0 - 0.90 * lipFall * lipFall;
  // (the lip starts as nothing and thickens as it is thrown)
  float lipThickness = 0.15 + 0.85 * smoothstep(0.0, 0.25, lipFall);

  // The face, from its foot (fromCrest -1.2) up to where the lip leaves it (-0.7).
  float upTheFace = clamp((fromCrest + 1.2) / 0.5, 0.0, 1.0) * 1.5708;
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

// One swell train at one spot. Returns (height, push towards the shore, foam 0..1, crest height).
//   trainPhase     the train's phase here
//   trainSize      the train's size here
//   offReefBreak   metres outside the line where the swell breaks on the reef (negative: on the reef flat)
//   feltDepth      the depth the swell feels on its way in (m, kept within 0.12 to 6)
//   crests, variety, frequency, canPlunge   the train's own numbers (see WAVE_TRAIN)
//   site           what the swell meets here, the same for every train (see waveF)
// (wave-model.ts's addTrain keeps the short names these had in build 78: waveSize Aw, phase w, feltDepth dd,
// shoaling sh, offshoreHeight H0, breakingDepth db, breakerHeight Hb, breakPoint sb, hollowness ho, breakingSpan wd,
// stage q, steepening sig, fromCrest xi, waveNumber k, crestStage qc, broken post, shoreBreak sho, heightLimit lim,
// boreHeight Hp, height H, swellShape Cpk, boreFront fw, boreShape Cb, shape C, surfSimilarity xib, plunging plg,
// standingUp M, lipFall be, lipLanding cr, fromLanding xc, aheadOfFace xs; the train's usual wave adds S to them.)
vec4 waveOfTrain(
  float trainPhase,
  float trainSize,
  float offReefBreak,
  float feltDepth,
  float th,
  float crests,
  float variety,
  float frequency,
  float canPlunge,
  vec4 site
) {
  float slowness = site.x;
  float depthAtBeach = site.y;
  float gate = site.z;
  float foamAtWaterline = site.w;

  // This wave's own size; a bigger wave runs a little ahead of the rest in the shallows.
  float waveSize = sizeOfWave(trainSize, th, (trainPhase + 1.5708) / 6.2832, crests, variety);
  float phase = trainPhase + 1.6 * (waveSize - trainSize) * (1.0 - smoothstep(0.0, 45.0, offReefBreak));

  // Shoaling, and where it breaks: for this wave, and for the train's usual wave, which sets how far the water draws
  // down between crests. 2.0064 is 6^(1/4) / 0.78: breakingDepth is the depth where a wave grown by Green's law
  // (from its height in 6 m of water) reaches 0.78 of it, and breakPoint is how far outside the reef break that is.
  float shoaling = pow(6.0 / feltDepth, 0.25);
  float offshoreHeight = min(1.65 * waveSize, 1.0);
  float usualOffshoreHeight = min(1.65 * trainSize, 1.0);
  float breakingDepth = pow(max(offshoreHeight, 1e-4) * 2.0064, 0.8);
  float usualBreakingDepth = pow(max(usualOffshoreHeight, 1e-4) * 2.0064, 0.8);
  float breakerHeight = 0.78 * breakingDepth;
  float usualBreakerHeight = 0.78 * usualBreakingDepth;
  float breakPoint = BEACH_CURVE_LENGTH * (sqrt(1.0 + breakingDepth / BEACH_CURVE_DEPTH) - 1.0);
  float usualBreakPoint = BEACH_CURVE_LENGTH * (sqrt(1.0 + usualBreakingDepth / BEACH_CURVE_DEPTH) - 1.0);
  // (big waves are hollow and take longer over breaking)
  float hollowness = smoothstep(0.55, 1.05, breakerHeight);
  float breakingSpan = max(min((1.3 + 2.6 * breakerHeight) * (1.0 + 0.45 * hollowness), 0.85 * breakPoint), 0.3);
  float usualBreakingSpan = max(min(1.3 + 2.6 * usualBreakerHeight, 0.85 * usualBreakPoint), 0.3);

  // The breaking stage here (breakingSpan is the metres one stage takes), and how near breaking the swell is:
  // 0 far outside the break, 1 at it.
  float stage = (breakPoint - offReefBreak) / breakingSpan;
  float usualStage = (usualBreakPoint - offReefBreak) / usualBreakingSpan;
  float steepening = smoothstep(-1.8, 0.0, stage);
  // the phase ahead of the crest (negative) or behind it, from -pi to pi
  float fromCrest = mod(phase - 1.5708 + 0.45 * steepening + 3.1416, 6.2832) - 3.1416;
  float waveNumber = frequency * slowness;
  // crestStage: how far along its breaking THIS WAVE is - the stage measured where its crest is, not at this point.
  // Every point of the wave's front then agrees on the stage, so the face and the lip hold their shape as the wave
  // travels. (The stage changes by more than 1 across the few metres of water that are drawn up into a breaking
  // wave's front.)
  float crestStage =
    stage + clamp(fromCrest, -1.6, 1.4) * (1.0 - smoothstep(2.2, 3.0, abs(fromCrest))) / (waveNumber * breakingSpan);
  float broken = smoothstep(0.95, 1.6, crestStage);
  float usualBroken = smoothstep(0.95, 1.6, usualStage);

  // After breaking: white water that loses height as it crosses the flat, down to a small wave that reaches the beach.
  // The shore break: where the sand rises to the beach, what is left of the wave stands up again - up to three times
  // as high as it crossed the flat, a hand to a knee - until the water is too shallow to carry it (heightLimit) and
  // it breaks on the sand. shoreBreak is how far that has gone: 0 out on the flat, 1 in the last metre or two.
  float shoreBreak = 1.0 - smoothstep(0.35, 1.3, depthAtBeach);
  float heightLimit = 0.66 * depthAtBeach + 0.04;
  float boreOnFlat = 0.05 + 0.12 * breakerHeight + 0.55 * (feltDepth - 0.12)
    + 0.66 * breakerHeight * (1.0 - smoothstep(1.5, 6.0, crestStage));
  float boreHeight = min(min(breakerHeight, boreOnFlat * (1.0 + 2.2 * shoreBreak)), heightLimit);
  // (The usual wave sets how far the water draws down between crests, so it grows much less in the shore break, or
  // the sea would stand a hand lower all along the beach.)
  float usualBoreOnFlat = 0.05 + 0.12 * usualBreakerHeight + 0.55 * (feltDepth - 0.12)
    + 0.5 * usualBreakerHeight * (1.0 - smoothstep(1.5, 6.0, usualStage));
  float usualBoreHeight = min(min(usualBreakerHeight, usualBoreOnFlat * (1.0 + 0.8 * shoreBreak)), heightLimit);
  float shoaledHeight = min(offshoreHeight * shoaling, breakerHeight * 1.05);
  float usualShoaledHeight = min(usualOffshoreHeight * shoaling, usualBreakerHeight * 1.05);
  float height = mix(shoaledHeight, boreHeight, broken) * gate;
  float usualHeight = mix(usualShoaledHeight, usualBoreHeight, usualBroken) * gate;

  // In shallow water a swell stops being a sine: the crest narrows and peaks, the trough goes long and flat.
  float crestNarrowing = 1.0 + (max(0.55 / waveNumber, 1.0) - 1.0) * smoothstep(-5.0, -1.2, stage);
  float shapePhase = clamp(fromCrest * crestNarrowing, -3.1416, 3.1416) + 1.5708 - 0.45 * steepening;
  float sine = 0.5 + 0.5 * sin(shapePhase + 0.45 * steepening * sin(shapePhase));
  float swellShape = pow(max(sine, 1e-4), 2.4 + 3.6 * steepening);
  // The white water's front is about 1.4 m deep; at the beach, where the wave stands up again, half a metre.
  float boreFront = min(0.75, 1.4 * waveNumber) * (1.0 - 0.6 * shoreBreak);
  // White water: a steep front and a back that falls away over a few metres (2.5 m to lose two thirds; at the beach
  // half that: there it is a wave again, with a crest, not a low hump).
  float steepFront = smoothstep(-0.2 - boreFront, -0.2, fromCrest);
  float fallingBack = exp(-max(fromCrest, 0.0) * max(0.6, 0.4 / waveNumber) * (1.0 + 0.9 * shoreBreak));
  float boreShape = steepFront * fallingBack * (1.0 - smoothstep(1.2, 2.2, fromCrest));
  // (white water is lumpy: its height varies along the front and keeps changing)
  boreShape *= 1.0 + 0.30 * sin(th * 190.0 + fromCrest * 3.0 + variety) * sin(th * 67.0 - trainPhase * 0.5);
  float shape = mix(swellShape, boreShape, broken);
  float crestHeight = 0.62 * height * shape;
  float profileHeight = crestHeight - 0.22 * usualHeight;

  // Steep waves plunge, the rest spill. (surfSimilarity is the Iribarren number of a reef face that slopes 0.18:
  // 1.25 times the period is the square root of the wave's length in deep water.)
  float period = 6.2832 / frequency;
  float surfSimilarity = 0.18 * period * 1.25 / sqrt(max(breakerHeight, 0.02));
  float plunging = (1.0 - smoothstep(1.9, 3.2, surfSimilarity)) * canPlunge;
  // The wave stands up into a steep hollow face a little before its lip starts to fall (lipFall).
  float standingUp = smoothstep(-0.6, -0.1, crestStage) * (1.0 - smoothstep(1.0, 1.8, crestStage)) * plunging;
  // (uDebugMode 2: no falling lip)
  standingUp *= abs(uDebugMode - 2.0) < 0.5 ? 0.0 : 1.0;
  float frontHeight = 1.15 * height;
  float lipFall = clamp(crestStage, 0.0, 1.0);

  // The breaking front: each point of it is moved from where the swell has it to where breakingFront puts it.
  // The water just ahead (fromCrest -1.5 to -1.2) is drawn in flat to the foot of the face, so the trough runs right
  // up to it.
  float inFront = step(-1.5, fromCrest) * step(fromCrest, 0.1);
  float inLip = step(-0.7, fromCrest) * inFront;
  vec2 frontPoint = breakingFront(fromCrest, lipFall, hollowness);
  float intoFace = smoothstep(-1.5, -1.2, fromCrest);
  // (the back of the wave: about 3.6 m long)
  float onBack = (1.0 - smoothstep(0.0, 1.0, (fromCrest - 0.1) / min(1.1, 3.6 * waveNumber))) * step(0.1, fromCrest);
  float frontBase = -0.22 * usualHeight - 0.10 * height;
  float pushInFront = (frontHeight * frontPoint.x + fromCrest / waveNumber) * intoFace * inFront;
  float pushOnBack = (-0.05 * frontHeight + 0.1 / waveNumber) * onBack;
  float frontPush = (pushInFront + pushOnBack) * standingUp;
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
  float boreFoamFade = max(mix(1.6, 1.1, bigness), 0.28 / waveNumber);
  float freshFoam = broken * behindBoreFront * exp(-max(fromCrest, 0.0) * boreFoamFade)
    * (1.0 - smoothstep(1.3, 2.2, fromCrest)) * foamLeft * foamAtWaterline;
  // And long after the white water has gone by, thin foam is still lying there in streaks, until the next wave.
  float lyingFoam = broken * behindBoreFront * 0.30 * bigness * exp(-max(fromCrest, 0.0) * 0.30)
    * (1.0 - smoothstep(2.3, 3.0, fromCrest)) * min(foamLeft * 1.6, 1.0) * foamAtWaterline;
  float boreFoam = freshFoam + lyingFoam;
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

// How far up the beach the water is running (metres above sea level): one pulse for each wave, timed to its arrival.
// trainPhase is the train's phase at the waterline.
float runUpOf(float trainPhase, float trainSize, float th, float crests, float variety) {
  float turns = (trainPhase - 1.5708) / 6.2832;
  float sinceCrest = (turns - floor(turns)) * 6.2832;
  float waveSize = sizeOfWave(trainSize, th, turns, crests, variety);
  // (a bigger wave runs a little ahead, as in waveOfTrain)
  sinceCrest += 1.6 * (waveSize - trainSize);
  float reach = min(1.9 * waveSize * (1.0 + 1.8 * waveSize), 1.0);
  return reach * smoothstep(0.0, 1.0, sinceCrest) * (1.0 - smoothstep(1.2, 3.8, sinceCrest));
}

// A train's size here and now: it swells and fades in sets, and varies along the shore. swellStrength is how much of
// the swell reaches here.
float sizeOfTrain(
  float amplitude,
  float setPace,
  float variety,
  float alongShoreVariety,
  float swellStrength,
  float th,
  float t
) {
  float sets = 0.70 + 0.30 * sin(t * setPace + th * 2.0 + variety);
  float alongShore = 0.88 + 0.12 * sin(th * 13.0 + alongShoreVariety + t * 0.05);
  return amplitude * swellStrength * sets * alongShore;
}

// One wave train's part in the sea surface: its size here and now, the wave itself (kept in the variable NAME), and
// how far its swash runs up the beach. WAVE_TRAINS, a define written by water-materials.ts from the sea's config, is
// one of these for each train (VARIETY17 is VARIETY * 1.7). The run-up is the wave as it arrives at the waterline:
// 3.184 is timeToBeach there. It is made of waveF's local names, so it belongs inside waveF and nowhere else.
#define WAVE_TRAIN(NAME, AMPLITUDE, SET_PACE, VARIETY, VARIETY17, FREQUENCY, CRESTS, PHASE, CAN_PLUNGE, RUN_UP) trainSize = sizeOfTrain(AMPLITUDE, SET_PACE, VARIETY, VARIETY17, swellStrength, th, t); vec4 NAME = waveOfTrain(FREQUENCY * (t + timeToBeach) + CRESTS * th + PHASE, trainSize, offReefBreak, feltDepth, th, CRESTS, VARIETY, FREQUENCY, CAN_PLUNGE, site); runUp += RUN_UP * runUpOf(FREQUENCY * (t + 3.184) + CRESTS * th + PHASE, trainSize, th, CRESTS, VARIETY);

// The whole sea surface at p (x, z) at time t: (height above still water, push towards the shore, foam 0..1, metres
// off the beach).
vec4 waveF(vec2 p, float t) {
  // Where p lies on the beach as the waves feel it (shore.glsl), and so how far off the beach it is.
  float th = atan(p.y, p.x);
  float ground = shoreH(p.x, p.y);
  float offBeach = BEACH_CURVE_LENGTH * (sqrt(max(1.0 - ground / BEACH_CURVE_DEPTH, 0.04)) - 1.0);
  float offReefBreak = offBeach - REEF_BREAK;
  // The depth the swell feels on its way in: the beach curve laid at the reef break (kept within 0.12 to 6 m).
  float ur = 1.0 + offReefBreak / BEACH_CURVE_LENGTH;
  float feltDepth = clamp(BEACH_CURVE_DEPTH * (ur * ur - 1.0), 0.12, 6.0);

  // The swell slows as the water shallows: within 40 m of the beach it travels at celerity / 1.3 metres a second,
  // further out at SWELL_SPEED, and up the sand at about a metre a second. timeToBeach is the seconds it still needs
  // to reach the beach (counted from 3.184 at the waterline).
  float celerity = sqrt(clamp(offBeach, 0.0, 40.0) + 1.5);
  float timeToBeach = 2.6 * celerity + max(offBeach - 40.0, 0.0) / SWELL_SPEED + min(offBeach, 0.0) * 1.06;

  // What the swell meets here, the same for every train: its slowness (seconds a metre), the depth on the beach here,
  // a gate that is 1 in the water and fades to nothing up the beach, and the foam's fade at the waterline.
  float slowness = 1.3 / celerity;
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

  // The trains: WAVE_TRAINS sets train0, train1 and train2, and adds up their run-up.
  float runUp = 0.0;
  float trainSize;
  WAVE_TRAINS

  // Where crests cross, they stand up higher.
  float crossings = train0.w * train1.w + train0.w * train2.w + train1.w * train2.w;
  float height = train0.x + train1.x + train2.x + 0.9 * crossings;

  // Foam: the three trains', extra where crests cross, and the patchy foam that never quite clears where the swell
  // breaks. Where one train is standing up to break, the foam the others left there is stretched thin over its face.
  float foamKept0 = 1.0 - 0.88 * smoothstep(0.05, 0.30, abs(train0.y));
  float foamKept1 = 1.0 - 0.88 * smoothstep(0.05, 0.30, abs(train1.y));
  float foamKept2 = 1.0 - 0.88 * smoothstep(0.05, 0.30, abs(train2.y));
  float trainsFoam = train0.z * foamKept1 * foamKept2 + train1.z * foamKept0 * foamKept2
    + train2.z * foamKept0 * foamKept1;
  float crossingFoam = 2.5 * crossings * (1.0 - smoothstep(2.0, 12.0, offReefBreak));
  float patchyFoam = 0.15 * swellStrength * smoothstep(-16.0, -3.0, offReefBreak)
    * (1.0 - smoothstep(4.0, 9.0, offReefBreak));
  float foam = trainsFoam + (crossingFoam + patchyFoam) * foamKept0 * foamKept1 * foamKept2;

  // The swash lifts the water near the beach, and leaves a sheet of water on the sand where it has run up - but not
  // where a wave is pushing the water about.
  runUp *= 0.8;
  height += 0.2 * runUp * (1.0 - smoothstep(0.0, 7.0, offBeach));
  float film = clamp((runUp - ground) * 0.3, -0.2, 0.10);
  float push = train0.y + train1.y + train2.y;
  float pushed = smoothstep(0.02, 0.14, abs(push));
  float lift = max(ground + film - height, 0.0) * step(-0.5, ground) * (1.0 - pushed);
  // (The sheet carries no foam of its own: it used to, and it showed as a band of lace sitting on the beach above
  // the waves.)
  height += lift;
  return vec4(height, push, min(foam, 1.0), offBeach);
}
