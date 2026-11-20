// Fine specks hanging in the water (under-water-specks.ts): a soft round dot each.
// Needs vColour and vOpacity, the speck's colour and opacity, from under-water-specks.vert.glsl.
varying vec3 vColour;
varying float vOpacity;

void main() {
  float fromCentre = length(gl_PointCoord - 0.5);
  // whole in the middle, soft round its rim and gone at the edge of the point's square: a point of a pixel or two
  // keeps most of its strength, and a bigger one reads round
  float inDot = 1.0 - smoothstep(0.2, 0.5, fromCentre);
  gl_FragColor = vec4(vColour, inDot * vOpacity);
}
