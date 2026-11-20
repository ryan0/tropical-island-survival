// A star (stars.ts): a soft spot, the bell of a normal curve, added to the sky behind it.
// Needs vColour, the star's colour at its middle, from stars.vert.glsl, and the define SPREADS_ACROSS, how many of
// the curve's spreads its point is wide.
varying vec3 vColour;

void main() {
  vec2 fromMiddle = (gl_PointCoord - 0.5) * SPREADS_ACROSS;
  float spot = exp(-0.5 * dot(fromMiddle, fromMiddle));
  gl_FragColor = vec4(vColour * spot, 1.0);
}
