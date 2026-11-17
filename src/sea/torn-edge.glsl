// The top of the white mass that a landed lip throws up is torn: tufts of white water with gaps between them, not
// an edge. The breaker's mesh says how near that top a point of it is (vTornEdge, 0 to 1: breaker.vert.glsl), and a
// pattern laid along the shore and up the water's height, in tufts a forearm or so across that climb as they
// go, says which points are gaps. Both of the mesh's drawings leave the gaps out (water.frag.glsl,
// breaker-depth.frag.glsl), so that through a gap the eye sees what is behind it: more of the white mass, or at
// its very top the sea and the sky.
//
// Needs uDetail, uTime and uSeaLevel, declared by the includer, and FULL_TURN (shaders/shared/turns).

// How many times the pattern goes round the atoll (a whole number of times, so that it has no seam). The pattern's
// numbers lie between about 0.45 and 0.8: a point is a gap where its number is under a mark that rises from the
// first of TORN_EDGE_GAPS, where the tearing begins, to the second at the very top, which leaves little but gaps.
const float TORN_EDGE_ROUND = 700.0 / FULL_TURN;
const vec2 TORN_EDGE_GAPS = vec2(0.42, 0.80);

// 1 where a point of the surface is a gap, 0 where it is not. (The texture is read whatever the answer: a mipmapped
// texture is never read inside a branch.)
float isTornAway(vec3 waterPosition, float tornEdge) {
  float round = atan(waterPosition.z, waterPosition.x);
  vec4 tufts = texture2D(uDetail, vec2(round * TORN_EDGE_ROUND, (waterPosition.y - uSeaLevel) * 0.4 - uTime * 0.35));
  // (no gaps at all where the edge is nowhere near)
  float mark = mix(TORN_EDGE_GAPS.x, TORN_EDGE_GAPS.y, tornEdge) - (1.0 - min(tornEdge * 10.0, 1.0));
  return step(tufts.a * 0.6 + tufts.b * 0.4, mark);
}
