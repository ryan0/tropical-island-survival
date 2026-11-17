// The breaker's own mesh is drawn twice. This is the first time, before the sea, into the depth picture alone: so
// that the sea is not drawn where the mesh will hide it. Both are see-through, and water drawn twice over is twice
// as deep in colour. The second time, after the sea, water.frag.glsl colours it (breaker.ts).
uniform float uDebugMode;     // 5: the sea is drained, and nothing of it is drawn

void main() {
  if (uDebugMode > 4.5) discard;
  gl_FragColor = vec4(0.0);
}
