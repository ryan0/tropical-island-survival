// A debug line along the crest of the main swell's wave nearest the line its waves break on, to show that the crest
// picture finds it (crest-picture.ts). The breaker's own mesh will keep to the crest in the same way.
//
// The strip carries position and nothing else: (x, z) is the unit vector outwards from the atoll's centre, and y
// says which edge of the strip this is (-1 or 1).
// Needs the wave model's defines (see waves.glsl), and MAIN_SWELL_TOWARDS, MAIN_SWELL_PERIOD, BREAK_LINE_ALONG,
// CREST_SECONDS_BEFORE and CREST_SECONDS_AFTER, which crest-line.ts writes.
//
// Read docs/DEVICE_NOTES.md first: no function here has out or inout parameters, there are no loops, and nothing
// branches once the position is put together. The block at the end is the hard limit that keeps a bad vertex from
// being flung away.

uniform float uTime;    // seconds on the clock the waves run by
uniform float uSeaLevel;   // the height of the still sea surface
uniform float uDebugMode;     // switches parts of the water off (docs/DEVICE_NOTES.md)
uniform sampler2D uCrests;    // where the main swell's crest lies (crest-picture.ts)

varying float vShown;   // how much of the line shows here, 0 to 1

#include "waves"

// The strip is twice this wide, and floats this far above the water so that it is not lost in it.
const float HALF_WIDTH = 0.3;
const float ABOVE_THE_WATER = 0.12;

void main() {
  vec2 outwards = position.xz;
  float th = atan(outwards.y, outwards.x);
  float lineFromCentre = islandR(th) + offshoreOfReef(BREAK_LINE_ALONG, th);
  vec2 onLine = outwards * lineFromCentre;

  // When the swell crosses the line in this direction, and so how long ago the nearest crest did (negative while it
  // is still to come).
  float arrivalAtLine = dot(onLine, MAIN_SWELL_TOWARDS) / OPEN_SEA_SPEED
    + texture2D(uSeaFloor, onLine / SEA_PICTURE_SPAN + 0.5).x;
  float sinceCrossing = mod(uTime - arrivalAtLine + 0.5 * MAIN_SWELL_PERIOD, MAIN_SWELL_PERIOD)
    - 0.5 * MAIN_SWELL_PERIOD;
  float momentInPicture = (sinceCrossing + CREST_SECONDS_BEFORE) / (CREST_SECONDS_BEFORE + CREST_SECONDS_AFTER);
  vec4 crest = texture2D(uCrests, vec2(th / FULL_TURN + 0.5, momentInPicture));

  // The strip lies across the crest, along the way the swell is travelling.
  vec2 heading = crest.yz / max(length(crest.yz), 1e-4);
  vec2 p = outwards * (lineFromCentre + crest.x) + heading * position.y * HALF_WIDTH;
  float height = waveF(p, uTime).x;

  // The hard limit: a vertex stays inside a box around its place on the line. If the GPU returns anything outside
  // it (huge, infinite or not-a-number), the vertex is left there and not shown.
  vec3 rest = vec3(onLine.x, uSeaLevel, onLine.y);
  vec3 displacement = vec3(p.x, uSeaLevel + height + ABOVE_THE_WATER, p.y) - rest;
  vec3 limited = clamp(displacement, vec3(-70.0, -2.5, -70.0), vec3(70.0, 4.0, 70.0));
  vec3 excess = abs(limited - displacement);
  float isWithinLimit = (excess.x + excess.y + excess.z < 1e-5) ? 1.0 : 0.0;
  // (it fades out as one crest leaves the picture and the next comes into it)
  float inPicture = 1.0 - smoothstep(0.4 * MAIN_SWELL_PERIOD, 0.5 * MAIN_SWELL_PERIOD, abs(sinceCrossing));
  vShown = crest.w * inPicture * isWithinLimit;
  gl_Position = projectionMatrix * viewMatrix * vec4(isWithinLimit > 0.5 ? rest + limited : rest, 1.0);
}
