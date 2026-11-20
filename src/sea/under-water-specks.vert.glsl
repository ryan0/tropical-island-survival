// Fine specks hanging in the water round the camera while it is under (under-water-specks.ts): marine snow. Each
// speck has a home in a box that repeats through the water, drifts and wanders from there, and is drawn in the copy
// of the box round the camera, so that the specks keep their places in the water as the eye moves through them.
//
// Needs the attributes position (the speck's home in the box) and aSeed (its own number, 0 up to 1); the shared
// uniforms uTime, uCameraPosition, uDaylight and uNight; uSurfaceHeight and uPixelsPerMetre from
// under-water-specks.ts, and the defines it writes from the config (sea-config.ts, `specks`): SPECK_BOX, EDGE_FADE,
// DRIFT, WANDER, WANDER_PACE, SINKING, SIZE, SIZED_NO_NEARER_THAN, FADES_NEAR, FADES_FAR, CLEAR_OF_SURFACE,
// FADES_UNDER_SURFACE, MOST_OPACITY, SPECK_COLOUR, LIGHT_AT_SUNSET and LIGHT_AT_NIGHT.
// Hands under-water-specks.frag.glsl the speck's colour as vColour and its opacity as vOpacity.

attribute float aSeed;
uniform float uTime;    // seconds on the clock the waves run by
uniform vec3 uCameraPosition;
uniform float uDaylight;    // 0 at night to 1 in full day
uniform float uNight;    // 0 by day to 1 at night
uniform float uSurfaceHeight;    // the height of the water's surface over the camera
uniform float uPixelsPerMetre;    // how many pixels a metre spans at a metre away
varying vec3 vColour;
varying float vOpacity;

// A point drawn smaller than this would cover one pixel or none as it moves, and twinkle: a smaller speck is drawn
// this big and fainter, by as much as it is smaller.
const float SMALLEST_POINT_PIXELS = 2.0;
// Where a speck that is not drawn goes: outside the picture, so that no pixel of it is drawn.
const vec4 OFF_SCREEN = vec4(2.0, 2.0, 2.0, 1.0);
// (0.004 is about one step of 8-bit colour: nothing that could be seen is dropped)
const float FAINTEST_DRAWN = 0.004;

void main() {
  // its own traits, from its seed: each multiple is far from a whole number, so the traits do not follow one another
  float wanderPace = mix(WANDER_PACE.x, WANDER_PACE.y, fract(aSeed * 5.71));
  float wanderPhase = aSeed * 61.0;
  float sinkShare = 0.3 + 0.7 * fract(aSeed * 3.37);
  float sizeShare = fract(aSeed * 7.31);
  float opacityShare = fract(aSeed * 11.13);

  vec3 drifted = position + DRIFT * uTime;
  drifted.y -= SINKING * sinkShare * uTime;
  float swayAlong = uTime * wanderPace + wanderPhase;
  float swayAcross = uTime * wanderPace * 0.73 + wanderPhase * 1.7;
  drifted += WANDER * vec3(sin(swayAlong), 0.5 * cos(swayAcross), sin(swayAcross));

  // the copy of its place nearest the camera
  vec3 halfBox = 0.5 * SPECK_BOX;
  vec3 fromCamera = mod(drifted - uCameraPosition + halfBox, SPECK_BOX) - halfBox;
  vec3 worldPosition = uCameraPosition + fromCamera;
  vec4 viewPosition = modelViewMatrix * vec4(worldPosition, 1.0);
  float distanceAway = length(fromCamera);
  float distanceAhead = -viewPosition.z;

  vec3 outTowardsEdge = abs(fromCamera) / halfBox;
  float furthestOut = max(max(outTowardsEdge.x, outTowardsEdge.y), outTowardsEdge.z);
  float edgeFade = 1.0 - smoothstep(1.0 - EDGE_FADE, 1.0, furthestOut);
  float nearFade = smoothstep(FADES_NEAR.x, FADES_NEAR.y, distanceAway);
  float farFade = 1.0 - smoothstep(FADES_FAR.x, FADES_FAR.y, distanceAway);
  float underClearLine = uSurfaceHeight - CLEAR_OF_SURFACE - worldPosition.y;
  float surfaceFade = smoothstep(0.0, FADES_UNDER_SURFACE, underClearLine);

  // most are small and faint
  float sizeAcross = mix(SIZE.x, SIZE.y, sizeShare * sizeShare);
  float pixelsAcross = sizeAcross * uPixelsPerMetre / max(distanceAhead, SIZED_NO_NEARER_THAN);
  float pointPixels = max(pixelsAcross, SMALLEST_POINT_PIXELS);
  float shareOfPoint = pixelsAcross / pointPixels;
  float ownOpacity = MOST_OPACITY * (0.3 + 0.7 * opacityShare * opacityShare);

  vOpacity = ownOpacity * edgeFade * nearFade * farFade * surfaceFade * shareOfPoint;
  // lit by the light that comes down through the water: less with the sun down, barely any at night
  float light = mix(mix(LIGHT_AT_SUNSET, 1.0, uDaylight), LIGHT_AT_NIGHT, uNight);
  vColour = SPECK_COLOUR * light;

  float isDrawn = step(FAINTEST_DRAWN, vOpacity);
  gl_PointSize = pointPixels;
  gl_Position = mix(OFF_SCREEN, projectionMatrix * viewPosition, isDrawn);
}
