// Spray droplets and puffs of mist: soft round point sprites.
// Needs uSprayColour (the spray's colour, from spray-droplets.ts) and vOpacity (the sprite's opacity, from spray.vert.glsl).
uniform vec3 uSprayColour;
varying float vOpacity;

void main() {
  float distanceFromCentre = length(gl_PointCoord - 0.5);
  float alpha = (1.0 - smoothstep(0.08, 0.5, distanceFromCentre)) * vOpacity;
  // (0.004 is about one step of 8-bit colour: nothing that could be seen is dropped)
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uSprayColour, alpha);
}
