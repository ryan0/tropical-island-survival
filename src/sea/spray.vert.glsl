// Spray droplets and puffs of mist (spray-droplets.ts), one point sprite each: its size in pixels from its size and
// its distance.
// Needs the attributes aSize (how big it is across) and aAlpha (how strongly it shows, 0..1), and the uniform uPx:
// how many pixels a metre spans at a metre away. Hands spray.frag.glsl the sprite's opacity as vA.
attribute float aSize;
attribute float aAlpha;
uniform float uPx;
varying float vA;

// Sprites at least this big across fade out close to the camera.
const float BIG_SPRITE_SIZE = 0.3;
// No sprite is drawn bigger than this, in pixels across.
const float MAX_SPRITE_PIXELS = 240.0;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  float distanceAhead = -viewPosition.z;

  // a big sprite (a puff of mist) close to the camera would cover much of the view: fade it out from 9 m to 1.5 m
  float isBig = step(BIG_SPRITE_SIZE, aSize);
  vA = aAlpha * mix(1.0, smoothstep(1.5, 9.0, distanceAhead), isBig);

  // (the distance is kept from 0.2 m, so that a sprite at the camera does not divide by nothing)
  gl_PointSize = min(aSize * uPx / max(distanceAhead, 0.2), MAX_SPRITE_PIXELS);
  gl_Position = projectionMatrix * viewPosition;
}
