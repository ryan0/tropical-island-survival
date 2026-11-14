// Small wind waves coming ashore on the lagoon's beaches. water.frag.glsl draws them on the water,
// terrain-colour.glsl draws what they do on the sand, and in a high wind lagoon-shore-band.vert.glsl gives them real
// height; all three must agree, so all three use this.
//   light air: none (the lagoon's edge only laps)
//   medium wind: small ones, flat, drawn by shading and foam alone
//   high wind: 2.3 times the size, with real height, coming in sets, running further up the sand
//
// Needs from outside: the chunk "noise" (shaders/shared/noise.glsl) and the uniform uWind (the wind's strength, 0 to
// 1), both from the includer, and the define LAGOON_WIND_DIRECTION. Gives WIND_DIR, LW_T, lagHi, lagEx, lagExposure,
// lagWave and lagFoam. It runs in a vertex shader too, so the vertex-shader rules apply (docs/DEVICE_NOTES.md).

// the way the wind blows (level, unit length)
const vec2 WIND_DIR = LAGOON_WIND_DIRECTION;
// seconds between waves
const float LW_T = 2.1;

// 0 up to a medium wind, 1 in a high one
float lagHi() {
  return smoothstep(0.7, 1.0, uWind);
}

// How open the lagoon shore near p is to the wind's waves: 1 where the wind blows onto the beach, 0.2 in the lee.
// Round the sandbank in the middle, where "outwards" says nothing about which way a beach faces, middling.
float lagEx(vec2 p) {
  float r = length(p);
  float facingTheWind = clamp(0.55 + 0.6 * dot(WIND_DIR, p / max(r, 1.0)), 0.2, 1.0);
  return mix(0.6, facingTheWind, smoothstep(40.0, 80.0, r));
}

// How strong the waves are on the shore near p: 0 in light airs, lagEx in a medium wind, 2.3 times that in a high one.
float lagExposure(vec2 p) {
  return lagEx(p) * (smoothstep(0.4, 0.66, uWind) + 1.3 * lagHi());
}

// p = the place, depth = the depth of still water there (0 or less on the sand above the water's edge), t = the time.
// Returns x = seconds since a crest last passed here (on the sand: since it reached the water's edge),
//         y = how big that wave was along this stretch of shore (0..1, up to 1.5 in a high wind: they come in
//             stretches a few metres long, and in a high wind in sets - some half as big again, some half the size),
//         z = the same for the wave that comes next.
// The crests follow the depth: a wave slows as the water shallows (timeToEdge = the seconds it still needs to reach
// the edge, on a beach that falls 1 in 7, as the lagoon's do just under water), so the lines close up towards the
// shore. They do not arrive all at once along a beach: they come in at a slant, from the wind's side, and unevenly.
vec3 lagWave(vec2 p, float depth, float t) {
  // (a broken wave does not stall at the edge: it arrives at walking pace)
  float timeToEdge = 4.56 * (sqrt(clamp(depth, 0.0, 0.69) + 0.04) - 0.2) + max(depth - 0.69, 0.0) * 2.75;
  float slant = dot(p, WIND_DIR) * 0.06;
  float unevenness = 1.3 * noise(p * 0.045);
  // (a crest is never a ruled line)
  float raggedness = 0.15 * (noise(p * 1.9) - 0.5);
  float wavesGoneBy = (t + timeToEdge) / LW_T - slant + unevenness + raggedness;
  float wave = floor(wavesGoneBy);

  // The sizes of this wave and the next: in stretches along the shore, and in a high wind in sets.
  vec2 thisAndNext = vec2(wave, wave + 1.0);
  vec2 inSets = 0.95 + 0.3 * sin(thisAndNext * 1.93) + 0.25 * sin(thisAndNext * 0.71 + 2.0);
  vec2 setSize = mix(vec2(1.0), inSets, lagHi());
  float thisStretch = smoothstep(0.34, 0.62, noise(p * 0.16 + wave * vec2(5.3, 2.1)));
  float nextStretch = smoothstep(0.34, 0.62, noise(p * 0.16 + (wave + 1.0) * vec2(5.3, 2.1)));

  return vec3((wavesGoneBy - wave) * LW_T, thisStretch * setSize.x, nextStretch * setSize.y);
}

// The foam a broken wave of the given size leaves, sinceCrest seconds after its crest passed: white at once, lace
// within a second (a bigger wave's lasts a little longer).
float lagFoam(float sinceCrest, float size) {
  float white = 1.0 - smoothstep(0.0, 0.3, sinceCrest);
  float lace = 0.8 * exp(-sinceCrest / (0.7 + 0.25 * min(size, 2.0)));
  return smoothstep(0.06, 0.28, size) * max(white, lace);
}
