// One picture of all the clouds in the sky (see clouds.ts). Each dot is a direction: across = bearing, up =
// elevation (finer near the horizon). The shader walks out along that direction through the cloud field, adding
// up the cloud it passes, how much light reaches each bit of it, and how much haze lies in front. Distances in km.
//
// What the picture holds for each direction (each part already multiplied by how much of it shows through nearer
// cloud):
//   red     sunlit cloud, divided by BRIGHTEST_SUNLIT
//   green   cloud lit by the sky
//   blue    cloud lost in haze
//   alpha   how much the clouds hide of what is behind them
//
// Needs
//   uLightDirection  the unit vector towards the sun (towards the moon at night)
//   uPictureSize   the size of the picture, in dots
// the cloud field (cloud-field.glsl) with its own uniforms and defines, and hash from the noise chunk.

uniform vec3 uLightDirection;
uniform vec2 uPictureSize;

#include "../shaders/shared/noise"
#include "cloud-field"

// The highest any cloud's top reaches; the walk gives up this far out.
const float CLOUD_LAYER_TOP = 7.2;
const float FURTHEST_WALKED = 105.0;
// The walk out: this many steps, each walked in this many parts where cloud may be.
const int STEPS_OUT = 64;
const int PARTS_OF_A_STEP = 6;
// The walk from a bit of cloud towards the sun: this many steps, the first about this long, each the next this
// many times longer.
const int STEPS_TO_SUN = 6;
const float FIRST_STEP_TO_SUN = 0.07;
const float STEP_TO_SUN_GROWTH = 1.8;
// How much a km of full cloud hides of what is behind it, and how much it dims the sunlight passing through it.
const float CLOUD_OPACITY = 11.0;
const float SUNLIGHT_OPACITY = 5.0;
// The depth of air in which cloud is lost in haze.
const float HAZE_DEPTH = 70.0;
// Once only this much shows through the clouds, nothing further away is worth walking to.
const float NEARLY_HIDDEN = 0.012;
// The cirrus: one thin sheet this high up, drifting this many times as fast as the cloud field.
const float CIRRUS_HEIGHT = 9.0;
const float CIRRUS_DRIFT = 7.5;
// The brightest that sunlit cloud gets (1 + 1.3, where the forward scatter is strongest): red is divided by it
// to fit in the picture.
const float BRIGHTEST_SUNLIT = 2.3;

// How far a line rising at `rise` (the sine of its elevation) goes to reach `height` above the sea, which curves
// away below it: the root of s * rise + s * s * curve = height, in the form that still holds when `curve` is 0
// (the line straight up).
float distanceUpTo(float height, float rise, float curve) {
  return 2.0 * height / (rise + sqrt(rise * rise + 4.0 * curve * height));
}

// How much cloud lies between p and the sun: STEPS_TO_SUN steps towards it, each longer than the last.
float cloudTowardsSun(vec3 p, float firstStep) {
  vec3 onTheWay = p;
  float stepLength = firstStep;
  float cloudPassed = 0.0;
  for (int i = 0; i < STEPS_TO_SUN; i++) {
    onTheWay += uLightDirection * stepLength;
    cloudPassed += cloudAt(onTheWay, weatherAt(onTheWay), false).x * stepLength;
    stepLength *= STEP_TO_SUN_GROWTH;
  }
  return cloudPassed;
}

void main() {
  // The direction this dot shows.
  vec2 uv = gl_FragCoord.xy / uPictureSize;
  float bearing = (uv.x - 0.5) * 6.28318;
  float elevation = 1.5708 * (0.5 * uv.y + 0.5 * uv.y * uv.y);
  vec3 direction = vec3(cos(bearing) * cos(elevation), sin(elevation), sin(bearing) * cos(elevation));

  // Where the line of sight enters the cloud layer and where it leaves it (or gives up, FURTHEST_WALKED out).
  float curve = (1.0 - direction.y * direction.y) * EARTH_CURVE;
  float entersAt = distanceUpTo(CLOUD_BASE, direction.y, curve);
  float leavesAt = min(distanceUpTo(CLOUD_LAYER_TOP, direction.y, curve), FURTHEST_WALKED);

  // STEPS_OUT steps, each a fixed fraction longer than the last (far cloud is small on the screen and needs no
  // finer); where the weather map says cloud may be, each is walked in PARTS_OF_A_STEP. The walk starts at a
  // different point of the first step on every dot so that the steps do not show as bands.
  float stepGrowth = pow(leavesAt / entersAt, 1.0 / float(STEPS_OUT));
  float partsOffset = hash(gl_FragCoord.xy + uFieldPlace.w);
  float startsPartway = hash(gl_FragCoord.yx * 1.3 + uFieldPlace.w);
  float stepStart = entersAt * pow(stepGrowth, startsPartway - 1.0);

  // Cloud scatters light mostly onward: brighter looking towards the sun through thin cloud.
  float forwardScatter = 1.0 + 1.3 * pow(max(dot(direction, uLightDirection), 0.0), 5.0);

  // The walk out.
  vec3 gathered = vec3(0.0);
  float showsThrough = 1.0;
  for (int i = 0; i < STEPS_OUT; i++) {
    float stepLength = stepStart * (stepGrowth - 1.0);
    vec3 stepMiddle = direction * (stepStart + 0.5 * stepLength);
    vec2 weatherOfStep = weatherAt(stepMiddle);
    float heightAtStepStart = direction.y * stepStart + stepStart * stepStart * curve;
    if (weatherOfStep.x > 0.01 && heightAtStepStart < weatherOfStep.y) {
      for (int j = 0; j < PARTS_OF_A_STEP; j++) {
        vec3 p = direction * (stepStart + stepLength * (float(j) + partsOffset) / float(PARTS_OF_A_STEP));
        // (the weather read afresh at every point: one reading a step shows as rings)
        vec2 cloudHere = cloudAt(p, weatherAt(p), true);
        if (cloudHere.x > 0.003) {
          // (the steps towards the sun are of a length that varies from dot to dot, or they show as rings)
          float stepsVary = 0.55 + 0.9 * hash(gl_FragCoord.xy * 1.7 + float(j) * 13.1 + uFieldPlace.w);
          float depthTowardsSun = cloudTowardsSun(p, FIRST_STEP_TO_SUN * stepsVary) * SUNLIGHT_OPACITY;
          float straightBeam = exp(-depthTowardsSun);
          // (light that has bounced about inside the cloud gets much deeper than a straight beam)
          float bouncedLight = 0.68 * exp(-depthTowardsSun * 0.22);
          float sunlit = max(straightBeam, bouncedLight) * forwardScatter;
          float skylit = 0.5 + 0.5 * cloudHere.y;
          float opacity = 1.0 - exp(-CLOUD_OPACITY * cloudHere.x * stepLength / float(PARTS_OF_A_STEP));
          float haze = 1.0 - exp(-stepStart / HAZE_DEPTH);
          float clearOfHaze = 1.0 - haze;
          vec3 lightParts = vec3(clearOfHaze * sunlit / BRIGHTEST_SUNLIT, clearOfHaze * skylit, haze);
          gathered += showsThrough * opacity * lightParts;
          showsThrough *= 1.0 - opacity;
        }
      }
      if (showsThrough < NEARLY_HIDDEN) break;
    }
    stepStart *= stepGrowth;
  }

  // Cirrus, CIRRUS_HEIGHT up: one thin sheet of streaks (drifting faster, as high cloud does).
  if (showsThrough > NEARLY_HIDDEN) {
    float toCirrus = distanceUpTo(CIRRUS_HEIGHT, direction.y, curve);
    vec2 cirrusPoint = (direction * toCirrus).xz - uFieldPlace.xy * CIRRUS_DRIFT;
    // (the weather map's alpha read at two sizes: broad streaks and fine ones)
    float broadStreaks = texture2D(uWeatherMap, cirrusPoint / 110.0).a;
    float fineStreaks = texture2D(uWeatherMap, cirrusPoint / 31.0 + 0.37).a;
    float streaks = broadStreaks * 0.62 + fineStreaks * 0.38;
    float haze = 1.0 - exp(-toCirrus / HAZE_DEPTH);
    float clearOfHaze = 1.0 - haze;
    float opacity = smoothstep(0.55, 0.85, streaks) * 0.42 * smoothstep(0.05, 0.6, uCloudCover);
    vec3 lightParts = vec3(clearOfHaze * forwardScatter * 0.8 / BRIGHTEST_SUNLIT, clearOfHaze, haze);
    gathered += showsThrough * opacity * lightParts;
    showsThrough *= 1.0 - opacity;
  }

  gl_FragColor = vec4(gathered, 1.0 - showsThrough);
}
