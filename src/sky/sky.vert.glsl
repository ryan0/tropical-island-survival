// The sky dome's corners. The dome stays centred on the camera (sky-dome.ts), so a corner's position is also the
// direction from the camera to it: that is what sky.frag.glsl is given, as vDir.
// Needs three.js's position, modelViewMatrix and projectionMatrix.

varying vec3 vDir;

void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
