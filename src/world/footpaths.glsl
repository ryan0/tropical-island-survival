// How far a point on the ground is from the nearest footpath, in metres.
// Needs the define TERRAIN_FOOTPATHS, written by footpathStatements in terrain.ts: one statement for each stretch of
// path, `nearest = min(nearest, distanceToSegment(p, from, to));`.

float distanceToSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float footpathDistance(vec2 p) {
  float nearest = 1e9;
  TERRAIN_FOOTPATHS
  return nearest;
}
