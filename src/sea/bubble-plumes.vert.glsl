// Puffs of bubbles under breaking water (bubble-plumes.ts), one point sprite each: its size in pixels from its size and
// its distance, and how much water lies between it and the eye.
// Needs the attributes aSize (how big it is across), aAlpha (how strongly it shows, 0..1) and aLight (how much daylight
// reaches it, 0..1), and the uniforms uPixelsPerMetre (how many pixels a metre spans at a metre away) and uCameraPosition.
// Hands bubble-plumes.frag.glsl vOpacity, vLight and vFromEye (how far from the eye it is, in metres, and how high the
// direction from the eye to it, -1 straight down to 1 straight up).
attribute float aSize;
attribute float aAlpha;
attribute float aLight;
uniform float uPixelsPerMetre;
uniform vec3 uCameraPosition;
varying float vOpacity;
varying float vLight;
varying vec2 vFromEye;

// Beyond these distances the water hides a puff.
const float HIDING_FROM = 18.0;
const float HIDDEN_AT = 28.0;
// A puff fades out as it comes nearer the eye than CLEAR_OF and is gone at NEAREST, so that the eye is never inside a
// white disc.
const float CLEAR_OF = 1.2;
const float NEAREST = 0.4;
// No puff is drawn bigger than this, in pixels across.
const float MAX_SPRITE_PIXELS = 320.0;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * worldPosition;
  float distanceAhead = -viewPosition.z;
  vec3 fromEye = worldPosition.xyz - uCameraPosition;
  float distanceFromEye = length(fromEye);

  float hiddenByWater = smoothstep(HIDING_FROM, HIDDEN_AT, distanceFromEye);
  float clearOfEye = smoothstep(NEAREST, CLEAR_OF, distanceFromEye);
  vOpacity = aAlpha * (1.0 - hiddenByWater) * clearOfEye;
  vLight = aLight;
  // (kept from 0.2 m, as below)
  vFromEye = vec2(distanceFromEye, fromEye.y / max(distanceFromEye, 0.2));

  // (the distance is kept from 0.2 m, so that a puff at the camera does not divide by nothing)
  gl_PointSize = min(aSize * uPixelsPerMetre / max(distanceAhead, 0.2), MAX_SPRITE_PIXELS);
  gl_Position = projectionMatrix * viewPosition;
}
