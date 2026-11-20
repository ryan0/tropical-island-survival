// The sky's own colour in a direction, with no sun, stars or clouds on it: the gradient from the horizon to
// overhead, the warmth low down by day, golden hour, and the evening's fire, mauve band and pink. The sky dome draws
// it (sky.frag.glsl) and the water mirrors it (sea/water.frag.glsl): written once, so that the sea takes the
// evening's colours as the sky does.
//
// Needs the uniforms uSkyHorizon, uSkyOverhead, uDaylight, uNight and uSunDirection.

const vec3 DAY_HAZE_WARMTH = vec3(0.10, 0.08, 0.05);
const vec3 GOLDEN_HOUR_COLOUR = vec3(1.0, 0.80, 0.52);
const vec3 SUNSET_FIRE_COLOUR = vec3(0.90, 0.45, 0.12);
const vec3 EARTHS_SHADOW_COLOUR = vec3(0.46, 0.42, 0.56);
const vec3 EVENING_PINK_COLOUR = vec3(0.86, 0.62, 0.56);

// bearing: which way round the horizon, a unit vector (x, z). aboveHorizon: 0 at the horizon to 1 overhead (the
// direction's y).
vec3 skyGradient(vec2 bearing, float aboveHorizon) {
  // The gradient from the horizon to overhead.
  vec3 sky = mix(uSkyHorizon, uSkyOverhead * (1.0 - 0.22 * aboveHorizon), pow(aboveHorizon, 0.5));
  float sunShows = 1.0 - uNight;

  // Which way round the horizon this is, relative to the sun.
  float towardsSun = dot(bearing, normalize(uSunDirection.xz + 1e-5));

  // By day the air near the horizon is paler and warmer towards the sun.
  sky += DAY_HAZE_WARMTH * uDaylight * smoothstep(-0.2, 1.0, towardsSun) * exp(-aboveHorizon * 5.0);

  // (in full day none of the rest shows, and it is not worked out)
  if (uDaylight < 0.85) {
    float evening = smoothstep(0.40, 1.0, 1.0 - uDaylight) * sunShows;

    // Golden hour, before evening: the whole sky warms, most of all low down and towards the sun.
    float goldenHour = smoothstep(0.15, 0.5, 1.0 - uDaylight) * (1.0 - evening) * sunShows;
    float warmth = goldenHour * (0.25 + 0.35 * smoothstep(-0.4, 1.0, towardsSun)) * exp(-aboveHorizon * 3.2);
    sky = mix(sky, GOLDEN_HOUR_COLOUR, warmth);

    // Towards evening: fire low down on the sun's side, a mauve band (the earth's shadow rising) on the other, and
    // a wash of pink above both.
    sky += SUNSET_FIRE_COLOUR * evening * smoothstep(-0.3, 1.0, towardsSun) * exp(-aboveHorizon * 6.0) * 0.35;
    float earthsShadow = evening * smoothstep(0.3, -0.9, towardsSun) * exp(-aboveHorizon * 5.0) * 0.5;
    sky = mix(sky, EARTHS_SHADOW_COLOUR, earthsShadow);
    // (squared by multiplying: pow of a negative number is undefined, and below the band this is negative)
    float fromBandMiddle = (aboveHorizon - 0.16) / 0.12;
    float pinkBand = exp(-fromBandMiddle * fromBandMiddle);
    sky = mix(sky, EVENING_PINK_COLOUR, evening * pinkBand * 0.10);
  }
  return sky;
}

// The sun's broad glow in the sky round it, as a share of the sun's colour: fromSun is the angle from the sun.
float sunsBroadGlow(float fromSun) {
  return 0.28 * exp(-fromSun * 3.5);
}
