// The colour of foam, and of the spray thrown off it, in the light of the hour: white by day, warmer with the sun
// low, and by night the moon's cold light, dimmed. One rule for both, so that spray is never another colour than
// the white water it flies from. (The spray kept a rule of its own once, warm whenever the sun was down: by
// night it was tan against a blue sea, as the foam had been before it.)
// daylight: 0 with the sun at the horizon to 1 by day. night: 0 by day to 1 at night.
const vec3 LOW_SUN_FOAM = vec3(1.0, 0.86, 0.74);
const vec3 MOONLIT_FOAM = vec3(0.66, 0.78, 1.0);
const float NIGHT_TAKES_FROM_FOAM = 0.75;

vec3 foamInThisLight(float daylight, float night) {
  return mix(mix(LOW_SUN_FOAM, vec3(1.0), daylight), MOONLIT_FOAM, night) * (1.0 - NIGHT_TAKES_FROM_FOAM * night);
}
