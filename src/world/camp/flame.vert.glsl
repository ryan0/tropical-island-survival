// Campfire flame: the three upright sheets fire.ts crosses. Hands flame.frag.glsl where on its sheet each point is.
// Needs three.js's ShaderMaterial built-ins: uv, position, modelViewMatrix and projectionMatrix.
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
