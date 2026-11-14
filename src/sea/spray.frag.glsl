// Spray droplets and puffs of mist: soft round point sprites.
// Needs uCol (the spray's colour, from spray-droplets.ts) and vA (the sprite's opacity, from spray.vert.glsl).
uniform vec3 uCol;
varying float vA;

void main() {
  float distanceFromCentre = length(gl_PointCoord - 0.5);
  float alpha = (1.0 - smoothstep(0.08, 0.5, distanceFromCentre)) * vA;
  // (0.004 is about one step of 8-bit colour: nothing that could be seen is dropped)
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uCol, alpha);
}
