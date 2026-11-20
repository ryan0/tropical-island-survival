// The broad patterns of what grows on the land, which the grass follows: how lush it is, how dried out, where
// banks of bare gravel lie, and how the plants' edge wanders. THIS FILE IS THE ONLY DEFINITION. terrain-colour.glsl draws them on the ground, and the
// build also turns them into JavaScript functions of the same names (tools/glsl-for-program-plugin.ts), so that the
// grass grows where the ground shows turf (plants/grass-placement.ts).
//
// Keep to the subset the converter understands (island-shape/island.glsl says what it is). Needs nothing from
// outside. Each function takes a point on the ground, (x, z).

// How lush the turf is, 0..1.
float turfLushness(float x, float z) {
  float lushWaveX = sin(x * 0.07 + 1.9 * sin(z * 0.05 + 0.4));
  float lushWaveZ = sin(z * 0.09 + 1.3 * sin(x * 0.06));
  return 0.5 + 0.5 * lushWaveX * lushWaveZ;
}

// How dried out the turf is, 0..1.
float turfDryness(float x, float z) {
  return 0.5 + 0.5 * sin(x * 0.13 + 2.1) * sin(z * 0.11 + 0.7);
}

// The broad pattern of the banks of bare gravel among the plants, -1..1: high where they lie. (When the ground
// was a lawn these were its patches of bare soil, and the name has stayed.)
float soilPatches(float x, float z) {
  return sin(x * 0.23 + 1.1 * sin(z * 0.17)) * sin(z * 0.21 + 1.4 * sin(x * 0.19) + 2.0);
}

// How far the edges of the layers towards the vegetation (the back of the beach, the turf) wander up and down the
// beach: metres added to the ground's height.
float layerEdgeWander(float x, float z) {
  return 0.45 * sin(x * 0.31 + z * 0.17) + 0.3 * sin(z * 0.43 - x * 0.23 + 1.0);
}
