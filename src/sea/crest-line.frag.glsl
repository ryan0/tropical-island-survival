// The debug line along the breaking crest (crest-line.vert.glsl): plain yellow.

varying float vShown;   // how much of the line shows here, 0 to 1

void main() {
  if (vShown < 0.02) discard;
  gl_FragColor = vec4(1.0, 0.85, 0.1, vShown);
}
