// The breaker's own mesh is drawn twice. This is the first time, before the sea, into the depth picture alone: so
// that the sea is not drawn where the mesh will hide it. Both are see-through, and water drawn twice over is twice
// as deep in colour. The second time, after the sea, water.frag.glsl colours it (breaker.ts).
uniform float uDebugMode;     // 5: the sea is drained, and nothing of it is drawn
uniform float uUnderWater;    // 1 when the camera is under water: nothing is torn away then (water.frag.glsl)
uniform float uTime;    // seconds on the clock the waves run by
uniform float uSeaLevel;   // the height of the still sea surface
uniform sampler2D uDetail;    // the detail texture (detail-texture.ts)

varying vec3 vWaterPosition;      // this point's position in the world
varying float vTornEdge;      // how near the torn top of the white mass it is (torn-edge.glsl)

#include "../shaders/shared/turns"
#include "torn-edge"

void main() {
  float tornAway = isTornAway(vWaterPosition, vTornEdge) * (1.0 - uUnderWater);
  if (uDebugMode > 4.5 || tornAway > 0.5) discard;
  gl_FragColor = vec4(0.0);
}
