// The breaker's own mesh: a ribbon that keeps to the crest of the main swell's breaking wave and draws its front -
// the face, the lip with its two sides, the crest and the back. The sea's own mesh lies under it as a plain
// surface. The colouring is water.frag.glsl's, as for all water.
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
// SHAPE_PLACES, SHAPE_FIRST_STAGE, SHAPE_LAST_STAGE (water-materials.ts).
//
// Read docs/DEVICE_NOTES.md first: no function here has out or inout parameters, there are no loops, and nothing
// branches once the position is put together. The block at the end is the hard limit that keeps a bad vertex from
// being flung away.

uniform float uTime;    // seconds on the clock the waves run by
uniform float uSeaLevel;   // the height of the still sea surface
uniform float uDebugMode;     // switches parts of the water off (docs/DEVICE_NOTES.md)
uniform sampler2D uCrests;    // where the main swell's crest lies (crest-picture.ts)
uniform sampler2D uBreakerShapes;    // the front's cross-sections (breaker-shapes.ts)

varying vec3 vWaterPosition;      // this point's position in the world
varying vec3 vWaterNormal;      // the surface's normal
varying vec3 vWaveState;   // (foam 0..1, metres off the beach, height above still water)

#include "waves"
#include "breaker-state"

// The parts of the cross-section's path, as breaker-shapes.ts shares them out: the lip is between these.
const float FACE_ENDS = 0.34;
const float TOP_ENDS = 0.84;
// The surface's slope is measured between places this far apart along the path.
const float SLOPE_STEP = 0.012;
// Where it is not shown, the ribbon lies this far under the sea.
const float SUNK = 4.0;

// Where a place on the front lies (x ahead of the crest, y up from the foot, in front heights), at a stage of the
// wave's breaking, for a wave so hollow.
vec2 frontPoint(float partWay, float crestStage, float hollowness) {
  float across = (clamp(partWay, 0.0, 1.0) * (SHAPE_PLACES - 1.0) + 0.5) / SHAPE_PLACES;
  float down = (crestStage - SHAPE_FIRST_STAGE) / (SHAPE_LAST_STAGE - SHAPE_FIRST_STAGE);
  vec4 both = texture2D(uBreakerShapes, vec2(across, down));
  return mix(both.xy, both.zw, hollowness);
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
  vec2 heights = breakerHeights(nearCrest, uTime, seaFloor, sinceCrossings, crestStage);
  float frontHeight = heights.x;
  vec2 crestPoint = nearCrest + heading * timing.x;
  float hollowness = smoothstep(0.55, 1.05, timing.w);

  // Where this row lies. A wave that only half throws a lip is half way between the swell's own crest (the first
  // of the picture's stages) and the breaking front.
  vec2 atRest = frontPoint(partWay, SHAPE_FIRST_STAGE, hollowness);
  vec2 onFront = mix(atRest, frontPoint(partWay, crestStage, hollowness), plunging);
  vec2 justBefore = mix(frontPoint(partWay - SLOPE_STEP, SHAPE_FIRST_STAGE, hollowness),
    frontPoint(partWay - SLOPE_STEP, crestStage, hollowness), plunging);
  vec2 justAfter = mix(frontPoint(partWay + SLOPE_STEP, SHAPE_FIRST_STAGE, hollowness),
    frontPoint(partWay + SLOPE_STEP, crestStage, hollowness), plunging);

  // It is shown from when the wave begins to stand up until its white water has taken over, where there is a
  // crest to follow and a lip to throw; otherwise it lies sunk under the sea.
  float inPicture = 1.0 - smoothstep(0.4 * MAIN_SWELL_PERIOD, 0.5 * MAIN_SWELL_PERIOD, abs(sinceCrossing));
  float whileBreaking = smoothstep(-1.35, -1.2, crestStage) * (1.0 - smoothstep(1.8, 2.1, crestStage));
  float shown = crest.w * inPicture * whileBreaking * smoothstep(0.03, 0.25, plunging);

  vec2 p = crestPoint + heading * onFront.x * frontHeight;
  float height = heights.y + onFront.y * frontHeight - SUNK * (1.0 - shown);

  // The surface faces out of the path: ahead on the face, down under the lip, up on its top and on the back.
  vec2 alongPath = justAfter - justBefore;
  vec2 outOfPath = vec2(alongPath.y, -alongPath.x) / max(length(alongPath), 1e-4);
  vec3 normal = vec3(heading.x * outOfPath.x, outOfPath.y, heading.y * outOfPath.x);

  // Foam: the lip whitens as it falls, and the whole front is white water once it has landed.
  float onLip = step(FACE_ENDS, partWay) * step(partWay, TOP_ENDS);
  float lipFall = clamp(crestStage, 0.0, 1.0);
  float foam = max(onLip * (0.1 + 0.9 * smoothstep(0.2, 0.8, lipFall)), 0.9 * smoothstep(1.0, 1.4, crestStage));

  // The hard limit: a vertex stays inside a box around its place on the line. If the GPU returns anything outside
  // it (huge, infinite or not-a-number), the vertex is left there, sunk.
  vec3 rest = vec3(onLine.x, uSeaLevel - SUNK, onLine.y);
  vec3 displacement = vec3(p.x, uSeaLevel + height, p.y) - rest;
  vec3 limited = clamp(displacement, vec3(-70.0, -2.5, -70.0), vec3(70.0, 10.0, 70.0));
  vec3 excess = abs(limited - displacement);
  float isWithinLimit = (excess.x + excess.y + excess.z < 1e-5) ? 1.0 : 0.0;
  vec3 placed = isWithinLimit > 0.5 ? rest + limited : rest;

  vWaterPosition = placed;
  vWaterNormal = isWithinLimit > 0.5 ? normal : vec3(0.0, 1.0, 0.0);
  vWaveState = vec3(foam, max(length(p) - islandR(th), 0.0), height);
  gl_Position = projectionMatrix * viewMatrix * vec4(placed, 1.0);
}
