// The water's vertex shader: it moves the wave mesh (uIsFlatSheet 0) by the wave model and passes the far sea (uIsFlatSheet 1)
// through untouched. The colouring is water.frag.glsl's, as for all water.
//
// Needs the wave model's defines (WAVE_TRAINS and REEF_BREAK: see waves.glsl), which water-materials.ts writes.
//
// Read docs/DEVICE_NOTES.md first: the wave mesh carries position and nothing else, no function here has out or
// inout parameters, and nothing branches once the position is put together. The block at the end is the hard limit
// that keeps a bad vertex from being flung away.

uniform float uTime;    // seconds on the clock the waves run by
uniform float uSeaLevel;   // the height of the still sea surface
uniform float uIsFlatSheet;     // 1 for the far sea, which stays flat; 0 for the wave mesh
uniform float uDebugMode;     // switches parts of the water off (docs/DEVICE_NOTES.md)

varying vec3 vWaterPosition;      // this point's position in the world
varying vec3 vWaterNormal;      // the surface's normal
varying vec3 vWaveState;   // the wave model here: (foam 0..1, metres off the beach, height above still water)

#include "waves"

// The surface's slope is measured between points this many metres apart.
const float SLOPE_STEP = 0.10;

// Where the wave model moves the point p (x, z) of the still surface to: up by the wave's height, and towards the
// shore, which is towards the atoll's centre, by its push.
vec3 movedPoint(vec2 p) {
  vec4 wave = waveF(p, uTime);
  vec2 towardsShore = -normalize(p);
  return vec3(p.x + towardsShore.x * wave.y, uSeaLevel + wave.x, p.y + towardsShore.y * wave.y);
}

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWaterNormal = vec3(0.0, 1.0, 0.0);
  // (the far sea counts as open water, far off the beach)
  vWaveState = vec3(0.0, 200.0, 0.0);
  if (uIsFlatSheet < 0.5) {
    vec2 p = wp.xz;
    // (movedPoint's sums, written out again because vWaveState needs the rest of what the wave model returns, and a
    // function may hand back nothing but its value)
    vec4 wave = waveF(p, uTime);
    vec2 towardsShore = -normalize(p);
    vec3 moved = vec3(p.x + towardsShore.x * wave.y, uSeaLevel + wave.x, p.y + towardsShore.y * wave.y);
    vec3 movedAlongX = movedPoint(p + vec2(SLOPE_STEP, 0.0));
    vec3 movedAlongZ = movedPoint(p + vec2(0.0, SLOPE_STEP));

    // The hard limit: a water vertex stays inside a small box around its rest position. If the GPU returns anything
    // outside it (huge, infinite or not-a-number), the vertex is simply left at rest, so no triangle can ever be
    // stretched across the scene.
    vec3 rest = vec3(p.x, uSeaLevel, p.y);
    vec3 displacement = moved - rest;
    vec3 limited = clamp(displacement, vec3(-12.0, -2.5, -12.0), vec3(12.0, 4.0, 12.0));
    vec3 excess = abs(limited - displacement);
    float isWithinLimit = (excess.x + excess.y + excess.z < 1e-5) ? 1.0 : 0.0;
    wp.xyz = isWithinLimit > 0.5 ? rest + limited : rest;
    vWaterNormal = isWithinLimit > 0.5 ? normalize(cross(movedAlongZ - moved, movedAlongX - moved)) : vec3(0.0, 1.0, 0.0);
    // (a vertex left at rest is drawn as plain water, out past the surf)
    vWaveState = isWithinLimit > 0.5 ? vec3(wave.z, wave.w, wave.x) : vec3(0.0, 60.0, 0.0);
  }
  vWaterPosition = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
