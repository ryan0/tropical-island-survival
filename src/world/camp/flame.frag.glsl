// Campfire flame: scrolling noise shaped into tongues, drawn on each of the three upright sheets fire.ts crosses and
// added onto what is behind them.
// Needs uTime (seconds), vUv from flame.vert.glsl, and fbm and noise from noise.glsl.
uniform float uTime;
varying vec2 vUv;

#include "../../shaders/shared/noise"

const vec3 FLAME_RED = vec3(0.85, 0.12, 0.02);
const vec3 FLAME_ORANGE = vec3(1.0, 0.55, 0.10);
const vec3 FLAME_CORE = vec3(1.0, 0.93, 0.70);
const float FLAME_BRIGHTNESS = 1.2;

void main() {
  // 0 at the foot of the sheet, 1 at its top; and -1..1 across it
  float heightOnSheet = vUv.y;
  float across = (vUv.x - 0.5) * 2.0;

  // Three noises, rising at different speeds: the body of the flame, its tongues and a quick flicker
  float body = fbm(vec2(across * 1.8, heightOnSheet * 2.4 - uTime * 2.2));
  float tongues = noise(vec2(across * 4.0 + 3.0, heightOnSheet * 5.0 - uTime * 3.6));
  // the body sways the flame, the more the higher up
  float swayedAcross = across + (body - 0.5) * 0.6 * heightOnSheet;
  float flicker = noise(vec2(swayedAcross * 7.0 - 1.0, heightOnSheet * 4.5 - uTime * 4.6));

  // The shape: less flame the higher up and the further from the middle, its edge torn by the tongues and flicker
  float rise = (1.0 - heightOnSheet) * (0.66 + 0.7 * body);
  float narrowing = abs(swayedAcross) * (1.45 + 1.2 * heightOnSheet);
  float tongueEdge = (tongues - 0.5) * 0.45 * heightOnSheet;
  float flickerEdge = (flicker - 0.5) * 0.4 * (heightOnSheet + 0.15);
  float shape = rise - narrowing - 0.10 + tongueEdge + flickerEdge;

  // soft at its edge, and faded in at the foot of the sheet so that the sheet's edge never shows
  float opacity = smoothstep(0.0, 0.26, shape) * smoothstep(0.0, 0.07, heightOnSheet);
  float core = smoothstep(0.34, 0.80, shape);

  // Red where it is thin, orange where it is thick, pale yellow at the core
  vec3 colour = mix(FLAME_RED, FLAME_ORANGE, smoothstep(0.1, 0.9, opacity));
  colour = mix(colour, FLAME_CORE, core);
  gl_FragColor = vec4(colour * opacity * FLAME_BRIGHTNESS, opacity);
}
