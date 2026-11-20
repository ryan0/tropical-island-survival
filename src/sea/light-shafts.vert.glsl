// Shafts of sunlight hanging in the water, seen from under it (light-shafts.ts). Each is a long narrow ribbon that
// hangs from the surface, runs down the way the sun's light travels in the water and is turned about its own length
// to face the eye. Hands light-shafts.frag.glsl where each point of it is and how strongly the shaft shows.
//
// The ribbons carry position and nothing else: x is the side of the ribbon (-1 or 1), y how far along it it is (0 at
// the surface, 1 at its foot) and z which shaft it belongs to.
// Needs SQUARE_SIZE, SQUARES_ACROSS, WIDTHS, LENGTHS, SHOWING, OWN_SHARE and SWAY, which light-shafts.ts writes.

uniform float uTime;   // seconds on the clock the waves run by
uniform vec3 uCameraPosition;
uniform vec3 uSunDirection;   // the unit vector towards the sun
uniform float uSurfaceHeight;   // the height of the water's surface over the camera

varying vec3 vWorldPosition;
varying float vAcross;   // -1 at one edge of the ribbon, 1 at the other
varying float vAlong;   // 0 at the surface, 1 at the ribbon's foot
varying float vStrength;   // how strongly the shaft shows at the moment, 0 to 1
varying vec3 vAxis;   // the unit vector down the shaft, the way its light travels
varying float vOwn;   // a number of the shaft's own, 0 to 1

const float FULL_TURN = 6.2831853;
// The grid of squares repeats this often, each way.
const float TILE = SQUARE_SIZE * SQUARES_ACROSS;
// A shaft starts to fade this far out from the eye's place in the grid, as a share of the way to the grid's edge,
// and is gone at the edge, where it wraps round to the other side.
const float EDGE_FADE_FROM = 0.7;
// The ripples that gather the light into shafts pass over the surface in three trains: each is (how many radians
// to a metre along x and along z, how many radians a second), the longest some 6 m from crest to crest. A shaft is
// bright while crests of them cross over the spot it hangs from.
const vec3 LONG_RIPPLES = vec3(0.9, 0.35, 1.9);
const vec3 CROSSING_RIPPLES = vec3(-0.45, 1.15, 2.7);
const vec3 SHORT_RIPPLES = vec3(2.3, -1.7, 4.3);

// A number from 0 to 1 that looks random, the same each time for the same n.
float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

void main() {
  float shaft = position.z;
  float row = floor((shaft + 0.5) / SQUARES_ACROSS);
  float column = shaft - row * SQUARES_ACROSS;
  float seed = shaft * 12.9898;

  // Light bends as it enters the water (Snell's law, with water's index 1.33): its sideways part becomes 0.75 of what
  // it was in air, and its downward part is what is left of a unit vector.
  vec2 sidewaysInWater = -0.75 * uSunDirection.xz;
  float downwardsInWater = sqrt(max(1.0 - dot(sidewaysInWater, sidewaysInWater), 0.0));
  vec3 lightInWater = vec3(sidewaysInWater.x, -downwardsInWater, sidewaysInWater.y);

  // The grid is wrapped round the spot on the surface whose shaft would pass through the eye, so that the shafts
  // nearest the eye are drawn, however deep it is. (The downward part is never less than about 0.66.)
  float eyeDepth = max(uSurfaceHeight - uCameraPosition.y, 0.0);
  vec2 eyeSpot = uCameraPosition.xz - sidewaysInWater * (eyeDepth / max(downwardsInWater, 0.1));
  vec2 inSquare = 0.1 + 0.8 * vec2(hash(seed + 1.0), hash(seed + 2.0));
  vec2 inGrid = (vec2(column, row) + inSquare) * SQUARE_SIZE;
  vec2 fromEyeSpot = mod(inGrid - eyeSpot + 0.5 * TILE, TILE) - 0.5 * TILE;
  vec3 top = vec3(eyeSpot.x + fromEyeSpot.x, uSurfaceHeight, eyeSpot.y + fromEyeSpot.y);
  float insideGrid = 1.0 - smoothstep(EDGE_FADE_FROM * 0.5 * TILE, 0.5 * TILE, length(fromEyeSpot));

  // How much light the ripples gather over this spot now: neighbours brighten together as a crest passes over them,
  // and each has a little of its own besides, so that no two are quite alike.
  float own = hash(seed + 3.0);
  float gathered = 0.5
    + 0.24 * sin(dot(top.xz, LONG_RIPPLES.xy) - LONG_RIPPLES.z * uTime)
    + 0.16 * sin(dot(top.xz, CROSSING_RIPPLES.xy) - CROSSING_RIPPLES.z * uTime)
    + 0.10 * sin(dot(top.xz, SHORT_RIPPLES.xy) - SHORT_RIPPLES.z * uTime + FULL_TURN * own)
    + OWN_SHARE * (own - 0.5);
  vStrength = smoothstep(SHOWING.x, SHOWING.y, gathered) * insideGrid;
  vOwn = hash(seed + 4.0);

  // A ripple tilts as it passes, and the light under it leans a little this way and that.
  vec2 lean = SWAY * vec2(sin(1.3 * uTime + FULL_TURN * hash(seed + 5.0)), sin(1.7 * uTime + FULL_TURN * hash(seed + 8.0)));
  vec3 axis = normalize(lightInWater + vec3(lean.x, 0.0, lean.y));
  vAxis = axis;

  // Most are thin. A shaft that does not show is drawn with no width, so that it costs nothing to fill.
  float widthShare = hash(seed + 6.0);
  float halfWidth = 0.5 * mix(WIDTHS.x, WIDTHS.y, widthShare * widthShare) * step(0.0001, vStrength);
  float shaftLength = mix(LENGTHS.x, LENGTHS.y, hash(seed + 7.0));

  // Turned about its own length to face the eye: the side is square to the shaft and to the line from it to the eye,
  // the same at both ends of it.
  vec3 side = cross(axis, uCameraPosition - top);
  side /= max(length(side), 0.0001);
  vec3 onAxis = top + axis * (position.y * shaftLength);
  vWorldPosition = onAxis + side * (position.x * halfWidth);
  vAcross = position.x;
  vAlong = position.y;

  gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
}
