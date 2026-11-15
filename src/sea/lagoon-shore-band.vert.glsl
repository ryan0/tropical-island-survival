// The vertex shader of the lagoon's shore-wave band (lagoon-shore-band.ts): in a high wind the small waves that come
// ashore on the lagoon's beaches have real height. The band is a strip of water mesh along the lagoon's edge (and
// round the sandbank); this lifts it. The colouring is water.frag.glsl's, as for all water.
//
// Needs the define LAGOON_WIND_DIRECTION (for lagwave.glsl), which water-materials.ts writes, and three.js's
// cameraPosition.
//
// The same rules as water.vert.glsl (docs/DEVICE_NOTES.md): position is the only attribute, no out parameters, no
// branching, guarded pow, and the hard limit at the end.

uniform float uTime;    // seconds on the clock the waves run by
uniform float uSeaLevel;   // the height of the still water surface
uniform float uWind;    // the wind's strength, 0 (none) to 1 (high)

varying vec3 vWaterPosition;      // this point's position in the world
varying vec3 vWaterNormal;      // the surface's normal
varying vec3 vWaveState;   // what water.vert.glsl hands on from the wave model; here always open, still water

#include "../shaders/shared/turns"
#include "../shaders/shared/noise"

#include "../world/island-shape/island"

#include "../shaders/shared/lagwave"

// The surface's slope is measured between points this many metres apart.
const float SLOPE_STEP = 0.15;

// The height of the water above its still level at p.
float bandHeight(vec2 p) {
  float r = length(p);
  float th = atan(p.y, p.x);
  // metres on the land side of the water's edge: of the lagoon's own shore, or of the sandbank's, whichever is nearer
  float fromLagoonShore = r - islandR(th) + landW(th);
  float fromSandbankShore = 20.0 - length(p - vec2(sandbankX(), sandbankZ()));
  float landward = max(fromLagoonShore, fromSandbankShore);
  float depth = max(uSeaLevel - hgt(p.x, p.y), 0.0);
  vec3 wave = lagWave(p, depth, uTime);
  float phase = wave.x / LW_T;

  // Each wave: a steep face ahead of its crest, a long back behind it, a shallow trough between two.
  float backOfLast = pow(max(1.0 - smoothstep(0.0, 0.5, phase), 1e-4), 1.6);
  float faceOfNext = pow(max(smoothstep(0.62, 1.0, phase), 1e-4), 2.2);
  float crest = wave.y * backOfLast + wave.z * faceOfNext;
  float trough = -0.11 * (wave.y + wave.z) * sin(HALF_TURN * phase);

  // It grows as the water shallows, breaks at about a foot of depth and comes on as a low wall of white water;
  // nothing at the band's edges (where it joins the flat lagoon), nor far from the eye (where the band is not drawn).
  float shoal = (1.0 + 0.45 * (1.0 - smoothstep(0.25, 1.1, depth))) * mix(0.3, 1.0, smoothstep(0.0, 0.3, depth));
  float fromEye = length(cameraPosition - vec3(p.x, uSeaLevel, p.y));
  float edge = smoothstep(-13.0, -8.5, landward) * (1.0 - smoothstep(0.3, 2.3, landward))
    * (1.0 - smoothstep(110.0, 145.0, fromEye));
  // (crests a hand to a foot above still water, the biggest of a set and on the windward beaches up to 40 cm: the
  // last is a ceiling that the size approaches and never passes)
  float size = 0.52 * lagEx(p) * lagHi() * shoal;
  float crestHeight = 0.5 * (1.0 - exp(-size * 0.7 * crest / 0.5));
  return edge * (crestHeight + size * trough);
}

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 p = wp.xz;
  float height = bandHeight(p);
  float heightAlongX = bandHeight(p + vec2(SLOPE_STEP, 0.0));
  float heightAlongZ = bandHeight(p + vec2(0.0, SLOPE_STEP));

  // The hard limit: the surface stays within a small range of its still level. If the GPU returns anything outside
  // it (huge, infinite or not-a-number), the vertex is left at rest.
  float limited = clamp(height, -0.5, 1.2);
  float isWithinLimit = (abs(limited - height) < 1e-5) ? 1.0 : 0.0;
  vec3 rawNormal = vec3(-(heightAlongX - height) / SLOPE_STEP, 1.0, -(heightAlongZ - height) / SLOPE_STEP);
  float isNormalWithinLimit = (abs(rawNormal.x) + abs(rawNormal.z) < 20.0) ? isWithinLimit : 0.0;
  wp.y = uSeaLevel + limited * isWithinLimit;
  vWaterNormal = normalize(vec3(rawNormal.x * isNormalWithinLimit, 1.0, rawNormal.z * isNormalWithinLimit));
  vWaveState = vec3(0.0, 200.0, 0.0);
  vWaterPosition = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
