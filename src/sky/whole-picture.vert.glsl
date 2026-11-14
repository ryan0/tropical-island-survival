// Covers the whole of the picture being drawn into, for a shader that works out each dot by itself.
// Needs three.js's position, on a 2 x 2 square round the origin (clouds.ts draws a PlaneGeometry(2, 2)).

void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
