// The breaker's own mesh: a ribbon that keeps to the crest of the main swell's breaking wave and draws its front -
// the face, the lip with its two sides, the crest and the top of the back - and then the white mass the landed
// lip throws up. The rest of the wave's back is the sea's own, which this mesh's back lies along and dips under
// (waves.glsl). A wave that has not stood up, or throws no lip, has no front: there the mesh lies hidden just
// under the sea's own surface, and the front grows out of that. The colouring is water.frag.glsl's, as for all
// water.
//
// The ribbon carries position and nothing else: (x, z) is the unit vector outwards from the atoll's centre, and y
// is how far along the front's cross-section this row lies, from the trough ahead of the wave (0) to the end of its
// back (1).
//
// It finds the crest as crest-line.vert.glsl does, from the crest picture; asks the wave model how far the wave's
// breaking has gone there (breaker-state.glsl); and reads where its row then lies from the picture of the front's
// cross-sections (breaker-shapes.ts), which is in front heights, ahead of the crest and up from its foot.
//
// Needs the wave model's defines (see waves.glsl); MAIN_SWELL_TOWARDS, MAIN_SWELL_PERIOD, MAIN_SWELL_SIZE,
// MAIN_SWELL_VARIETY, MAIN_SWELL_CAN_PLUNGE; BREAK_LINE_ALONG, CREST_SECONDS_BEFORE, CREST_SECONDS_AFTER;
// SHAPE_PLACES, SHAPE_FIRST_STAGE, SHAPE_LAST_STAGE, and the shares of the path that breaker-shapes.ts gives out,
// SHAPE_FACE_ENDS, SHAPE_TOP_ENDS, SHAPE_PEAK_AT, SHAPE_BURST_FORMED_BY, SHAPE_BURST_BREAKS_UP,
// SHAPE_LAST_OFF_BACK, SHAPE_BACK_FROM (water-materials.ts).
//
// Read docs/DEVICE_NOTES.md first: no function here has out or inout parameters, there are no loops, and nothing
// branches once the position is put together. The hard limit keeps a bad vertex from being flung away.

uniform float uTime;    // seconds on the clock the waves run by
uniform float uSeaLevel;   // the height of the still sea surface
uniform float uDebugMode;     // switches parts of the water off (docs/DEVICE_NOTES.md)
uniform sampler2D uCrests;    // where the main swell's crest lies (crest-picture.ts)
uniform sampler2D uBreakerShapes;    // the front's cross-sections (breaker-shapes.ts)

varying vec3 vWaterPosition;      // this point's position in the world
varying vec3 vWaterNormal;      // the surface's normal
varying vec3 vWaveState;   // (foam 0..1, metres off the beach, height above still water)
varying float vWaterBehind;   // metres of water behind the surface, level with it (see water.frag.glsl)
varying float vTornEdge;      // how near the torn top of the white mass this point is, 0 to 1 (torn-edge.glsl)
varying vec2 vWhiteMass;      // the white mass a landed lip throws up: (how far this is it, metres along the path)

// (the wave model as the sea would be if it did not sink out of this mesh's way: see mainSwellNotSunk)
#define SEA_NOT_SUNK_UNDER_MESH
#include "waves"
#include "breaker-state"

// The surface's slope is measured between places this far apart along the path.
const float SLOPE_STEP = 0.012;
// The front's low rows lie on the sea's own surface, this far over it (in front heights): those no higher up the
// front than the first of LOW_ON_FRONT, and less and less of those up to the second (see below).
const float RIDES_OVER = 0.03;
const vec2 LOW_ON_FRONT = vec2(0.05, 0.35);
// On the back, where the path rides on the sea's own surface, that surface's slope is measured over this many
// metres.
const float SEA_SLOPE_OVER = 0.4;
// The white mass a landed lip throws up billows: its height and its reach vary by these shares along the crest,
// in lumps that keep changing. A billow is round on top with a crease between it and the next, which is the shape
// of a sine with its troughs folded up. (The lumps are some 7 m and 15 m long: the mesh's columns are 1.2 m apart
// at their closest, and lumps much shorter than six of them come out as a row of peaks. The finer lumps of white
// water are the colouring's.)
const float BILLOWS_HIGH = 0.3;
const float BILLOWS_REACH = 0.3;
// (what such a pair of folded sines comes to on average, so that the billows add no height of their own)
const float BILLOWS_MEAN = 0.637;
// How much water lies behind the front, level with a point of it, in front heights: the lip is a sheet this thick;
// the wave's body is as thick as its crest at the top, and thicker by BODY_WIDENS for each front height below it
// (its back is a long slope).
const float LIP_SHEET = 0.15;
const float CREST_THICK = 0.25;
const float BODY_WIDENS = 3.0;
// Where it is not shown, the ribbon lies this far under the sea.
const float SUNK = 4.0;
// The white mass's torn top reaches this far along the path either side of its highest place.
const float TORN_REACHES = 0.17;
// The path is about this long, in front heights.
const float PATH_LENGTH = 5.0;
// Torn this much, nothing of the mesh is left (torn-edge.glsl: its pattern's highest numbers are some 0.85).
const float ALL_TORN = 1.35;
// Edges are torn only for an eye within these distances (metres): fully within the first, not at all beyond the
// second.
const vec2 TORN_WITHIN = vec2(45.0, 110.0);
// The lip is torn this much as it lands.
const float LANDING_TORN = 0.4;
// Its edge frays as it falls: so much at the tip when it is about to land, over this much of the path either
// side of the tip.
const vec2 LIP_TIP_TORN = vec2(0.75, 0.07);
// Its foot is torn this much at the level of the sea (as a share of how torn the top is), and not at all from
// this far up it, in front heights.
const vec2 FOOT_TORN = vec2(0.85, 0.3);
// The white mass's foam thins by this much from its highest place to the end of the wave's back.
const float REAR_FOAM_THINS = 0.5;
// Where a wave has no front to show, the mesh lies this far under the sea's own surface, in front heights.
const float HIDDEN_UNDER = 0.06;

// Where a place lies on the front of a wave that has stood up and throws a full lip (x ahead of the crest, y up
// from the foot, in front heights; on the back, y is how far over the sea's own surface), at a stage of the wave's
// breaking, for a wave so hollow. The picture is two wide, a wave that is not hollow on the left and a hollow one
// on the right. `onBack` is 1 for a row on the back: its dots hold another kind of number than the rest, so such
// a row is never read from between the two kinds, nor a row off the back.
vec2 frontPoint(float partWay, float crestStage, float hollowness, float onBack) {
  float place = mix(min(clamp(partWay, 0.0, 1.0), SHAPE_LAST_OFF_BACK), max(partWay, SHAPE_BACK_FROM), onBack);
  float across = (min(place, 1.0) * (SHAPE_PLACES - 1.0) + 0.5) / (2.0 * SHAPE_PLACES);
  float down = (crestStage - SHAPE_FIRST_STAGE) / (SHAPE_LAST_STAGE - SHAPE_FIRST_STAGE);
  vec4 plain = texture2D(uBreakerShapes, vec2(across, down));
  vec4 hollow = texture2D(uBreakerShapes, vec2(across + 0.5, down));
  return mix(plain.xy, hollow.xy, hollowness);
}

// A point of the front (frontPoint's) as the billows move it: (how much higher, how much further ahead).
vec2 billowed(vec2 onFront, vec2 billows) {
  return vec2(onFront.x + billows.y * max(onFront.x, 0.0), onFront.y * (1.0 + billows.x));
}

void main() {
  vec2 outwards = position.xz;
  float partWay = position.y;
  float th = atan(outwards.y, outwards.x);
  float lineFromCentre = islandR(th) + offshoreOfReef(BREAK_LINE_ALONG, th);
  vec2 onLine = outwards * lineFromCentre;

  // The crest nearest the line the waves break on, as the crest picture has it (crest-line.vert.glsl).
  float arrivalAtLine = dot(onLine, MAIN_SWELL_TOWARDS) / OPEN_SEA_SPEED
    + texture2D(uSeaFloor, onLine / SEA_PICTURE_SPAN + 0.5).x;
  float sinceCrossing = mod(uTime - arrivalAtLine + 0.5 * MAIN_SWELL_PERIOD, MAIN_SWELL_PERIOD)
    - 0.5 * MAIN_SWELL_PERIOD;
  float momentInPicture = (sinceCrossing + CREST_SECONDS_BEFORE) / (CREST_SECONDS_BEFORE + CREST_SECONDS_AFTER);
  vec4 crest = texture2D(uCrests, vec2(th / FULL_TURN + 0.5, momentInPicture));
  vec2 heading = crest.yz / max(length(crest.yz), 1e-4);
  vec2 nearCrest = outwards * (lineFromCentre + crest.x);

  // The wave there: where its crest really is (it leans ahead of where the clock puts it), how far its breaking
  // has gone, and how high it stands.
  vec4 seaFloor = texture2D(uSeaFloor, nearCrest / SEA_PICTURE_SPAN + 0.5);
  vec4 sinceCrossings = texture2D(uBreakTimes, nearCrest / SEA_PICTURE_SPAN + 0.5);
  vec4 timing = breakerTiming(nearCrest, uTime, seaFloor, sinceCrossings);
  float crestStage = timing.y;
  float plunging = timing.z;
  vec2 heights = breakerHeights(nearCrest, uTime, seaFloor, sinceCrossings);
  float frontHeight = heights.x;
  vec2 crestPoint = nearCrest + heading * timing.x;
  float hollowness = smoothstep(0.55, 1.05, timing.w);

  // The billows of the white mass, once the lip has landed: two sets of lumps along the crest, one for its height
  // and one for its reach, and how steeply the first changes along the crest (a metre).
  float burst = smoothstep(1.0, SHAPE_BURST_FORMED_BY, crestStage);
  vec2 lumps = vec2(th * 150.0 + uTime * 1.1, th * 67.0 - uTime * 0.7 + 1.3);
  vec2 reaches = vec2(th * 113.0 - uTime * 0.9 + 2.0, th * 49.0 + uTime * 0.6);
  vec2 billows = burst * vec2(
    BILLOWS_HIGH * (0.5 * (abs(sin(lumps.x)) + abs(sin(lumps.y))) - BILLOWS_MEAN),
    BILLOWS_REACH * (0.5 * (abs(sin(reaches.x)) + abs(sin(reaches.y))) - BILLOWS_MEAN));
  float billowsSlope = burst * BILLOWS_HIGH * 0.5
    * (150.0 * sign(sin(lumps.x)) * cos(lumps.x) + 67.0 * sign(sin(lumps.y)) * cos(lumps.y))
    / max(lineFromCentre, 1.0);

  // Where this row lies.
  float onBack = step(SHAPE_TOP_ENDS, partWay);
  vec2 unbillowed = frontPoint(partWay, crestStage, hollowness, onBack);
  vec2 onFront = billowed(unbillowed, billows);

  // How far the front has stood up out of the swell: by the stage of the wave's breaking, and by how much of a lip
  // it throws.
  float stoodUp = standsUpBy(crestStage) * plunging;

  // Where there is no crest to follow the ribbon lies sunk under the sea. Everywhere else it is where the wave
  // is: hidden in the sea until the wave stands up, and again once its white water has taken over.
  float inPicture = 1.0 - smoothstep(0.4 * MAIN_SWELL_PERIOD, 0.5 * MAIN_SWELL_PERIOD, abs(sinceCrossing));
  float shown = crest.w * inPicture;

  // It stands on what else the sea is doing there: the second swell, and more near the crest where the two
  // swells' crests cross.
  vec2 besides = heightBesidesMainSwell(crestPoint, uTime, seaFloor, sinceCrossings);
  float crestOfSwell = 0.62 * frontHeight / FRONT_STANDS;
  vec2 p = crestPoint + heading * onFront.x * frontHeight;

  // The sea's own surface where this row is, which the mesh goes by so that the two are one surface at every moment
  // of the wave's standing up and collapse. (Every row works this out, to keep the shader free of branches.)
  //
  // Off the back, the front grows out of the swell's own shape: a wave that has not stood up has no front, and
  // there the mesh lies just under the swell's surface, hidden; as the wave stands up each row goes from there to
  // its place on the front. (The swell's own shape is its crest's height here, over the level the water draws down
  // to between crests: that level is the front's foot, less the tenth of the wave's height that a front sucks it
  // down by.)
  //
  // The back rides on the sea's surface as that would be if it did not sink out of this mesh's way: the picture
  // says how far over it, and hidden it lies as far under.
  vec3 seaHere = mainSwellNotSunk(p, uTime);
  float crossingCrests = besides.y * seaHere.y;
  float swellAlone = seaHere.y + heights.y + (0.10 / FRONT_STANDS) * frontHeight;
  float frontHidden = swellAlone + besides.x + crossingCrests - HIDDEN_UNDER * frontHeight;
  // (The front's low rows - the face's run-in along the trough, the foot of the white mass - lie on the sea's
  // own surface too, a little over it, so that the face has no edge at its foot: the trough curves up into it.)
  float frontOnItsFoot = heights.y + onFront.y * frontHeight + besides.x
    + besides.y * crestOfSwell * clamp(onFront.y, 0.0, 1.0);
  float frontOnTheSea = seaHere.x + besides.x + crossingCrests + (RIDES_OVER + onFront.y) * frontHeight;
  float lowOnFront = 1.0 - smoothstep(LOW_ON_FRONT.x, LOW_ON_FRONT.y, onFront.y);
  float frontStands = mix(frontOnItsFoot, frontOnTheSea, lowOnFront);
  float backRides = seaHere.x + besides.x + crossingCrests + mix(-HIDDEN_UNDER, onFront.y, stoodUp) * frontHeight;
  float height = mix(mix(frontHidden, frontStands, stoodUp), backRides, onBack) - SUNK * (1.0 - shown);

  // The hard limit: a vertex stays inside a box around its place on the line. If the GPU returns anything outside
  // it (huge, infinite or not-a-number), the vertex is left there, sunk.
  vec3 rest = vec3(onLine.x, uSeaLevel - SUNK, onLine.y);
  vec3 displacement = vec3(p.x, uSeaLevel + height, p.y) - rest;
  vec3 limited = clamp(displacement, vec3(-70.0, -2.5, -70.0), vec3(70.0, 10.0, 70.0));
  vec3 excess = abs(limited - displacement);
  float isWithinLimit = (excess.x + excess.y + excess.z < 1e-5) ? 1.0 : 0.0;
  vec3 placed = isWithinLimit > 0.5 ? rest + limited : rest;
  gl_Position = projectionMatrix * viewMatrix * vec4(placed, 1.0);
  vWaterPosition = placed;
  // The white mass a landed lip throws up has a torn top: nearest it where the mass is highest, and for
  // TORN_REACHES of the path either side (torn-edge.glsl). Its foot is torn too, where its front runs out over
  // the sea: a ragged edge of lace on the water, not a white wall's straight foot.
  // (The top is torn for the eye that sees it against the sky, from beside it. Looked down on, the gaps would be
  // holes in the top of the mass: so the higher the eye looks from, the less the top is torn.)
  vec3 toEye = cameraPosition - placed;
  float lookedDownOn = abs(toEye.y) / max(length(toEye), 1e-3);
  float tornTop = (1.0 - smoothstep(0.0, TORN_REACHES, abs(partWay - SHAPE_PEAK_AT)))
    * (1.0 - smoothstep(0.2, 0.6, lookedDownOn));
  float tornFoot = FOOT_TORN.x * (1.0 - smoothstep(0.0, FOOT_TORN.y, unbillowed.y)) * step(partWay, SHAPE_PEAK_AT);
  // And while the lip lands and turns into the mass, all of it but the wave's back is torn a little: the sheet
  // breaks up as it comes down, and it is then that the mesh folds through itself.
  float landing = smoothstep(0.9, 1.0, crestStage)
    * (1.0 - smoothstep(SHAPE_BURST_FORMED_BY, SHAPE_BURST_FORMED_BY + 0.12, crestStage));
  float tornLanding = LANDING_TORN * landing * step(SHAPE_FACE_ENDS, partWay) * (1.0 - onBack);
  // And the lip's own edge frays as it falls: more the further it has fallen, and only at its tip.
  float lipFalling = smoothstep(0.25, 1.0, crestStage) * (1.0 - step(1.0, crestStage));
  float tornTip = LIP_TIP_TORN.x * lipFalling
    * (1.0 - smoothstep(0.0, LIP_TIP_TORN.y, abs(partWay - SHAPE_PEAK_AT)));
  // (From far off the tufts and the gaps between them are smaller than a dot of the screen, and would only
  // glitter: nothing is torn beyond TORN_WITHIN.y metres, and less and less from TORN_WITHIN.x.)
  float nearEnough = 1.0 - smoothstep(TORN_WITHIN.x, TORN_WITHIN.y, length(toEye));
  // At the last the whole mesh breaks up into tufts and is gone (to more than 1, so that nothing is left), before
  // it sinks back under the sea.
  float breaksUp = ALL_TORN * smoothstep(SHAPE_BURST_BREAKS_UP.x, SHAPE_BURST_BREAKS_UP.y, crestStage);
  vTornEdge = stoodUp * nearEnough
    * max(max(max(smoothstep(1.1, 1.35, crestStage) * max(tornTop, tornFoot), tornLanding), tornTip), breaksUp);

  // The rest is for the colouring. (The mesh's first drawing, into the depth picture alone, has no use for it:
  // breaker-depth.frag.glsl.)
  #ifndef BREAKER_DEPTH_ONLY

  // The surface faces out of the path: ahead on the face, down under the lip, up on its top; and where the front
  // has not stood up, as the swell's own surface does, whose slope is measured here. On the back it faces as the
  // sea's own back does: the path's dive under the sea at its end is no slope to be seen, and shaded as one it
  // showed as a darker edge. The billows tilt it along the crest as well.
  vec2 justBefore = billowed(frontPoint(partWay - SLOPE_STEP, crestStage, hollowness, onBack), billows);
  vec2 justAfter = billowed(frontPoint(partWay + SLOPE_STEP, crestStage, hollowness, onBack), billows);
  vec3 seaBehind = mainSwellNotSunk(p - heading * SEA_SLOPE_OVER, uTime);
  vec2 alongPath = justAfter - justBefore;
  float swellRises = (seaHere.y - seaBehind.y) * (1.0 + besides.y) / SEA_SLOPE_OVER;
  float seaRises = (seaHere.x + besides.y * seaHere.y - seaBehind.x - besides.y * seaBehind.y) / SEA_SLOPE_OVER;
  // (The front's low rows lie on the sea, and slope as it does besides. Where the path comes up from under the
  // sea to lie on it, its own slope is no slope to be seen, as at the back's end.)
  float frontRises = alongPath.y * smoothstep(0.0, 0.02, unbillowed.y) + lowOnFront * seaRises * alongPath.x;
  alongPath.y = mix(mix(swellRises * alongPath.x, frontRises, stoodUp), seaRises * alongPath.x, onBack);
  vec2 outOfPath = vec2(alongPath.y, -alongPath.x) / max(length(alongPath), 1e-4);
  vec3 facing = vec3(heading.x * outOfPath.x, outOfPath.y, heading.y * outOfPath.x);
  float risesAlongCrest = billowsSlope * unbillowed.y * frontHeight;
  vec3 tilted = facing - vec3(-outwards.y, 0.0, outwards.x) * risesAlongCrest;
  vec3 normal = tilted / max(length(tilted), 1e-4);

  // Foam: the lip whitens as it falls, and the whole front is white water once it has landed. Under that the
  // mesh wears the foam the sea has where it stands, or it would show as a clean strip through foamy water.
  float onLip = step(SHAPE_FACE_ENDS, partWay) * step(partWay, SHAPE_TOP_ENDS);
  float lipFall = clamp(crestStage, 0.0, 1.0);
  // (The lip whitens from its tip back towards the crest: its edge breaks up as it falls, while by the crest it is
  // a clear sheet until it lands.)
  float halfTheLip = 0.5 * (SHAPE_TOP_ENDS - SHAPE_FACE_ENDS);
  float outAlongLip = 1.0 - clamp(abs(partWay - SHAPE_PEAK_AT) / halfTheLip, 0.0, 1.0);
  float lipWhitens = smoothstep(0.3, 0.85, lipFall * (0.4 + 0.8 * outAlongLip));
  // (Once the lip has landed the white spreads from where it landed: the front of the mass is white at once, its
  // rear and the wave's crest behind it a little later, as the wave falls in. And it thins towards the back,
  // where it is foam left lying on the wave and not white water thrown up: lace, as the colouring draws thin
  // foam.)
  float behindThePeak = clamp((partWay - SHAPE_PEAK_AT) / (1.0 - SHAPE_PEAK_AT), 0.0, 1.0);
  float burstWhite =
    smoothstep(1.0 + 0.2 * behindThePeak, SHAPE_BURST_FORMED_BY + 0.35 * behindThePeak, crestStage)
    * (1.0 - REAR_FOAM_THINS * behindThePeak);
  float ownFoam = max(onLip * lipWhitens, burstWhite);
  float foam = max(ownFoam, min(seaHere.z + foamLeftBehind(p, uTime), 1.0));

  // (the second number is for laying the mass's lumps along its surface: roughly, for the path's length varies)
  vWhiteMass = vec2(burst * smoothstep(0.0, 0.3, stoodUp) * (1.0 - onBack), partWay * PATH_LENGTH * frontHeight);
  vWaterNormal = isWithinLimit > 0.5 ? normal : vec3(0.0, 1.0, 0.0);
  vWaveState = vec3(foam, offBeachAt(p), height);
  // (the back, and a wave that has not stood up, go by the sea's own rough rule: waves.glsl)
  float bodyBehind = CREST_THICK + BODY_WIDENS * (1.0 - clamp(unbillowed.y, 0.0, 1.0));
  float behindFront = frontHeight * mix(bodyBehind, LIP_SHEET, onLip);
  vWaterBehind = mix(waterBehindWave(height), behindFront, smoothstep(0.3, 1.0, stoodUp) * (1.0 - onBack));

  #endif
}
