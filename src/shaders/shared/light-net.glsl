// The net of light that ripples throw on whatever lies under the water: what the sand (terrain-colour.glsl) and
// the rocks and coral (seatint.glsl) share, so that the net runs on from the one to the other. It is read from the
// caustics texture (caustics-texture.ts), which holds the light a field of small waves brings to the floor. It is
// read twice, the second time turned and finer so that the two never line up: one reading is the bold net and the
// other makes it uneven - bright here, faint there - as light through real water is. Both are made to wander by
// a reading of the detail texture's small waves, which stretch and squeeze the net as they pass.
//
// Each shader makes the three readings itself, where the rules about reading textures let it
// (docs/DEVICE_NOTES.md), at the places these functions give, and hands them to lightOfNet.
//
// Needs CAUSTICS_BRIGHTEST, a define from caustics-texture.ts, and the uniform uLightNetShare (how much of the
// net is drawn: 1 but for a debug switch, shared-uniforms.ts).

// How many rounds of the caustics texture the broad net makes in a metre (its meshes are a forearm or so across),
// and how many times finer the second reading is (a hand across).
const float NET_ROUNDS_A_METRE = 0.27;
const float FINE_NET_FINER = 2.3;
// How fast the net drifts, and how fast the small waves that move it cross the floor: the texture's coordinates
// a second. (The small waves cross at half a metre a second: slower, the net sat on the floor like a print.)
const vec2 NET_DRIFTS = vec2(0.010, 0.006);
const vec2 SMALL_WAVES_CROSS = vec2(0.026, -0.020);
// How bright the net is: how far light of twice the average brightens the sun's light on what it falls on. The
// light, as a share of the average, that leaves the sun's light as it is: the gaps of the net have about half the
// average, so under 1 this darkens them less than the lines brighten, and the floor keeps its paleness. How much
// of the other reading's light and dark the bold net takes on. The broad light and dark the small waves gather
// the light into, and how uneven that makes the net. And how much of it all is left in a calm, when the water is
// never quite still.
// (At 0.8 the net was the largest part of what moves on a floor seen from the beach, and with the ripples'
// bending made shallow water tiring to look into: fainter, it is still plainly there.)
const float NET_OF_LIGHT = 0.5;
const float NET_LEAVES_ALONE = 0.85;
const float OTHER_NET_COUNTS = 0.55;
const float BROAD_LIGHT = 0.3;
const float NET_UNEVEN = 1.6;
const float NET_IN_A_CALM = 0.5;
// Water brings the light to a focus some way down. Over the first pair of depths (metres) the net sharpens from
// a soft dapple to thin bright lines; over the second the lines double and broaden, past their focus.
const vec2 NET_SHARPENS_OVER = vec2(0.25, 1.0);
const vec2 NET_BROADENS_OVER = vec2(1.6, 3.8);
// It is the short ripples that focus in shallow water and the longer ones deeper down: the bold net is the fine
// reading in the shallows and the broad one from the second of these depths on.
const vec2 NET_COARSENS_OVER = vec2(0.5, 1.3);

// A shadow under water is not as dark as one in air: the water scatters the sun's light into it. How far it is
// filled in, in water more than a metre deep.
const float WATER_FILLS_SHADOWS = 0.3;
// And deeper there is none: the sun's light is scattered all ways on its way down, and a shadow is gone between
// these depths (m). Nor is there one in any depth of water once the sun is low: its light glances off the sea
// and little goes in, and what does is bent steeply down, so that nothing on the shore can shade the floor far
// out. (The shadows are worked out as in air, straight: at dusk a palm's lay across the deep floor a hundred
// metres from it.) They are gone between these shares of daylight (sky-light.ts: 1 is full day).
const vec2 NO_SHADOWS_BELOW = vec2(3.5, 9.0);
const vec2 NO_SHADOWS_UNDER_WATER_BY_DAYLIGHT = vec2(0.9, 0.45);

// How far a shadow is filled in, in water so deep. (Needs uDaylight, as the net itself does.)
float shadowFilledAt(float depth) {
  float inWater = smoothstep(0.1, 1.0, depth);
  float goneWithDepth = smoothstep(NO_SHADOWS_BELOW.x, NO_SHADOWS_BELOW.y, depth);
  float goneWithTheSun = smoothstep(NO_SHADOWS_UNDER_WATER_BY_DAYLIGHT.x, NO_SHADOWS_UNDER_WATER_BY_DAYLIGHT.y, uDaylight);
  // (in the shallows by the shore a low sun's shadows stay: there they lie near what throws them)
  return inWater * mix(WATER_FILLS_SHADOWS, 1.0, max(goneWithDepth, goneWithTheSun * smoothstep(0.3, 1.5, depth)));
}

// Where to read the caustics texture for the net at a place (x, z) at a time.
vec2 lightNetUvAt(vec2 xz, float time) {
  return xz * NET_ROUNDS_A_METRE + NET_DRIFTS * time;
}

// Where to read the detail texture for the small waves, given where the net is read.
vec2 smallWavesUvAt(vec2 netUv, float time) {
  return netUv * 0.31 + SMALL_WAVES_CROSS * time;
}

// How far the small waves' reading moves the net: add it to the first reading's place.
vec2 netWobbleOf(vec4 smallWaves) {
  return (smallWaves.rg - 0.5) * 0.16;
}

// Where to read the net the second time.
vec2 turnedNetUvAt(vec2 netUv, vec2 wobble) {
  return vec2(netUv.x * 0.6 + netUv.y * 0.8, -netUv.x * 0.8 + netUv.y * 0.6) * FINE_NET_FINER - wobble * 1.4;
}

// How much of each of the texture's three colours the net is made of in water so deep: red short of the focus,
// green at it, blue past it.
vec3 netFocusAt(float depth) {
  float sharp = smoothstep(NET_SHARPENS_OVER.x, NET_SHARPENS_OVER.y, depth);
  float broad = smoothstep(NET_BROADENS_OVER.x, NET_BROADENS_OVER.y, depth);
  return vec3(1.0 - sharp, sharp * (1.0 - broad), sharp * broad);
}

// The light the net adds, as a share of what is there without it, from the three readings, in water so deep: the
// lines brighten what they fall on and the gaps between them darken it. nearEye: 1 close to, 0 far off, where
// the broad light and dark would show the texture's repeat from above.
float lightOfNet(vec4 smallWaves, vec4 broadNet, vec4 fineNet, float depth, float nearEye) {
  vec3 focus = netFocusAt(depth);
  // (each reading short of its focus is soft light and dark, with no lines of its own: it makes the other's
  // lines uneven without crossing them)
  float broad = dot(broadNet.rgb, focus) * mix(1.0, fineNet.r * CAUSTICS_BRIGHTEST, OTHER_NET_COUNTS);
  float fine = dot(fineNet.rgb, focus) * mix(1.0, broadNet.r * CAUSTICS_BRIGHTEST, OTHER_NET_COUNTS);
  float light = CAUSTICS_BRIGHTEST * mix(fine, broad, smoothstep(NET_COARSENS_OVER.x, NET_COARSENS_OVER.y, depth));
  float gathered = (smallWaves.b - 0.5) * nearEye;
  return (light - NET_LEAVES_ALONE) * NET_OF_LIGHT * (1.0 + NET_UNEVEN * gathered) + BROAD_LIGHT * gathered;
}

// How much of the net there is in a wind (0 none to 1 high): fainter in a calm, not gone.
float netInWind(float wind) {
  return mix(NET_IN_A_CALM, 1.0, smoothstep(0.0, 0.45, wind)) * uLightNetShare;
}
