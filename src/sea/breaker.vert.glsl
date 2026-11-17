// The breaker's own mesh: a ribbon that keeps to the crest of the main swell's breaking wave and draws its front -
// the face, the lip with its two sides, the crest and the top of the back. The rest of the wave's back is the
// sea's own, which this mesh's back lies along and dips under (waves.glsl). The colouring is water.frag.glsl's,
// as for all water.
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
// SHAPE_FACE_ENDS, SHAPE_TOP_ENDS, SHAPE_LAST_OFF_BACK, SHAPE_BACK_FROM (water-materials.ts).
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

// (the wave model as the sea would be if it did not sink out of this mesh's way: see mainSwellNotSunk)
#define SEA_NOT_SUNK_UNDER_MESH
#include "waves"
#include "breaker-state"

// The surface's slope is measured between places this far apart along the path.
const float SLOPE_STEP = 0.012;
// On the back, where the path rides on the sea's own surface, that surface's slope is measured over this many
// metres.
const float SEA_SLOPE_OVER = 0.4;
// The white mass a landed lip throws up billows: its height and its reach vary by these shares along the crest,
// in lumps a few metres long that keep changing. A billow is round on top with a crease between it and the next,
// which is the shape of a sine with its troughs folded up.
const float BILLOWS_HIGH = 0.35;
const float BILLOWS_REACH = 0.3;
// (what such a pair of folded sines comes to on average, so that the billows add no height of their own)
const float BILLOWS_MEAN = 0.637;
// How much water lies behind the front, level with a point of it, in front heights: the lip is a sheet this thick;
// the wave's body is as thick as its crest at the top, and thicker by BODY_WIDENS for each front height below it
// (its back is a slope three front heights long).
const float LIP_SHEET = 0.15;
const float CREST_THICK = 0.25;
const float BODY_WIDENS = 3.0;
// Where it is not shown, the ribbon lies this far under the sea.
const float SUNK = 4.0;

// Where a place on the front lies (x ahead of the crest, y up from the foot, in front heights; on the back, y is
// how far over the sea's own surface), at a stage of the wave's breaking, for a wave so hollow that throws so much
// of a lip (`plunging`, 0 to 1). The picture is two wide, a wave that is not hollow on the left and a hollow one
// on the right; each dot holds the front of a wave that throws a full lip, and where the path lies hidden in one
// that throws none. `onBack` is 1 for a row on the back: its dots hold another kind of number than the rest, so
// such a row is never read from between the two kinds, nor a row off the back.
vec2 frontPoint(float partWay, float crestStage, float hollowness, float plunging, float onBack) {
  float place = mix(min(clamp(partWay, 0.0, 1.0), SHAPE_LAST_OFF_BACK), max(partWay, SHAPE_BACK_FROM), onBack);
  float across = (min(place, 1.0) * (SHAPE_PLACES - 1.0) + 0.5) / (2.0 * SHAPE_PLACES);
  float down = (crestStage - SHAPE_FIRST_STAGE) / (SHAPE_LAST_STAGE - SHAPE_FIRST_STAGE);
  vec4 plain = texture2D(uBreakerShapes, vec2(across, down));
  vec4 hollow = texture2D(uBreakerShapes, vec2(across + 0.5, down));
  vec4 both = mix(plain, hollow, hollowness);
  return mix(both.zw, both.xy, plunging);
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
  float burst = smoothstep(1.0, 1.3, crestStage);
  vec2 lumps = vec2(th * 460.0 + uTime * 1.9, th * 233.0 - uTime * 1.3 + 1.3);
  vec2 reaches = vec2(th * 281.0 - uTime * 1.6 + 2.0, th * 173.0 + uTime * 1.1);
  vec2 billows = burst * vec2(
    BILLOWS_HIGH * (0.5 * (abs(sin(lumps.x)) + abs(sin(lumps.y))) - BILLOWS_MEAN),
    BILLOWS_REACH * (0.5 * (abs(sin(reaches.x)) + abs(sin(reaches.y))) - BILLOWS_MEAN));
  float billowsSlope = burst * BILLOWS_HIGH * 0.5
    * (460.0 * sign(sin(lumps.x)) * cos(lumps.x) + 233.0 * sign(sin(lumps.y)) * cos(lumps.y))
    / max(lineFromCentre, 1.0);

  // Where this row lies.
  float onBack = step(SHAPE_TOP_ENDS, partWay);
  vec2 unbillowed = frontPoint(partWay, crestStage, hollowness, plunging, onBack);
  vec2 onFront = billowed(unbillowed, billows);

  // Where there is no crest to follow the ribbon lies sunk under the sea. Everywhere else it is where the wave
  // is: hidden in the sea until the wave stands up, and again once its white water has taken over.
  float inPicture = 1.0 - smoothstep(0.4 * MAIN_SWELL_PERIOD, 0.5 * MAIN_SWELL_PERIOD, abs(sinceCrossing));
  float shown = crest.w * inPicture;

  // It stands on what else the sea is doing there: the second swell, and more near the crest where the two
  // swells' crests cross.
  vec2 besides = heightBesidesMainSwell(crestPoint, uTime, seaFloor, sinceCrossings);
  float crestOfSwell = 0.62 * frontHeight / FRONT_STANDS;
  float onTheSea = besides.x + besides.y * crestOfSwell * clamp(onFront.y, 0.0, 1.0);

  vec2 p = crestPoint + heading * onFront.x * frontHeight;
  float frontStands = heights.y + onFront.y * frontHeight + onTheSea;

  // The back rides on the sea's own surface, as that would be if it did not sink out of this mesh's way: the
  // picture says how far over it. So the mesh's back and the sea's are one surface at every moment of the wave's
  // standing up and collapse. (Every row works this out, to keep the shader free of branches; the back's rows use
  // it.)
  vec3 seaHere = mainSwellNotSunk(p, uTime);
  float backRides = seaHere.x + besides.x + besides.y * seaHere.y + onFront.y * frontHeight;
  float height = mix(frontStands, backRides, onBack) - SUNK * (1.0 - shown);

  // The hard limit: a vertex stays inside a box around its place on the line. If the GPU returns anything outside
  // it (huge, infinite or not-a-number), the vertex is left there, sunk.
  vec3 rest = vec3(onLine.x, uSeaLevel - SUNK, onLine.y);
  vec3 displacement = vec3(p.x, uSeaLevel + height, p.y) - rest;
  vec3 limited = clamp(displacement, vec3(-70.0, -2.5, -70.0), vec3(70.0, 10.0, 70.0));
  vec3 excess = abs(limited - displacement);
  float isWithinLimit = (excess.x + excess.y + excess.z < 1e-5) ? 1.0 : 0.0;
  vec3 placed = isWithinLimit > 0.5 ? rest + limited : rest;
  gl_Position = projectionMatrix * viewMatrix * vec4(placed, 1.0);

  // The rest is for the colouring. (The mesh's first drawing, into the depth picture alone, has no use for it:
  // breaker-depth.frag.glsl.)
  #ifndef BREAKER_DEPTH_ONLY

  // The surface faces out of the path: ahead on the face, down under the lip, up on its top. On the back it faces
  // as the sea's own back does, whose slope is measured here: the path's dive under the sea at its end is no slope
  // to be seen, and shaded as one it showed as a darker edge. The billows tilt it along the crest as well.
  vec2 justBefore = billowed(frontPoint(partWay - SLOPE_STEP, crestStage, hollowness, plunging, onBack), billows);
  vec2 justAfter = billowed(frontPoint(partWay + SLOPE_STEP, crestStage, hollowness, plunging, onBack), billows);
  vec3 seaBehind = mainSwellNotSunk(p - heading * SEA_SLOPE_OVER, uTime);
  vec2 alongPath = justAfter - justBefore;
  float seaRises = (seaHere.x + besides.y * seaHere.y - seaBehind.x - besides.y * seaBehind.y) / SEA_SLOPE_OVER;
  alongPath.y = mix(alongPath.y, seaRises * alongPath.x, onBack);
  vec2 outOfPath = vec2(alongPath.y, -alongPath.x) / max(length(alongPath), 1e-4);
  vec3 facing = vec3(heading.x * outOfPath.x, outOfPath.y, heading.y * outOfPath.x);
  float risesAlongCrest = billowsSlope * unbillowed.y * frontHeight;
  vec3 tilted = facing - vec3(-outwards.y, 0.0, outwards.x) * risesAlongCrest;
  vec3 normal = tilted / max(length(tilted), 1e-4);

  // Foam: the lip whitens as it falls, and the whole front is white water once it has landed. Under that the
  // mesh wears the foam the sea has where it stands, or it would show as a clean strip through foamy water.
  float onLip = step(SHAPE_FACE_ENDS, partWay) * step(partWay, SHAPE_TOP_ENDS);
  float lipFall = clamp(crestStage, 0.0, 1.0);
  float ownFoam = max(onLip * (0.1 + 0.9 * smoothstep(0.2, 0.8, lipFall)), smoothstep(1.0, 1.25, crestStage));
  float foam = max(ownFoam, min(seaHere.z + foamLeftBehind(p, uTime), 1.0));

  vWaterPosition = placed;
  vWaterNormal = isWithinLimit > 0.5 ? normal : vec3(0.0, 1.0, 0.0);
  vWaveState = vec3(foam, max(length(p) - islandR(th), 0.0), height);
  float bodyBehind = CREST_THICK + BODY_WIDENS * (1.0 - clamp(unbillowed.y, 0.0, 1.0));
  vWaterBehind = frontHeight * mix(bodyBehind, LIP_SHEET, onLip);

  #endif
}
