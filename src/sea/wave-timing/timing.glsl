// The swell's timing: what the wave shaders and the program must agree on. It is shared with the program as the
// island's shape is (tools/glsl-for-program-plugin.ts), so only float functions and float constants may be written
// here.

const float GRAVITY = 9.81;
// The swell feels no depth beyond DEEPEST_FELT, and up the sand it keeps the speed of water SHALLOWEST_FELT deep:
// the swash.
const float SHALLOWEST_FELT = 0.15;
const float DEEPEST_FELT = 12.0;

// Metres a second, in water `depth` metres deep: a long wave travels at the square root of gravity times the depth.
float swellSpeed(float depth) {
  return sqrt(GRAVITY * min(max(depth, SHALLOWEST_FELT), DEEPEST_FELT));
}
