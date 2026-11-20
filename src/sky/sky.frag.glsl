// The sky dome: the gradient, the sun, the moon, the Milky Way, shooting stars, and the clouds looked up in two sky
// pictures (clouds.ts, cloud-bake.frag.glsl). The stars are drawn over it (stars.ts).
//
// Needs the defines
//   EARTH_CURVE, SLIDE_HEIGHT, HALF_A_DOT    for reading the sky pictures (sky-picture.glsl)
//   MOON_RADIUS      how far the moon's edge is from its middle (radians)
//   MOON_UP          the moon's height (as a sine) at which its light begins to pale the sky, and at which it has
//                    paled it in full
//   SKY_POLE         the unit vector towards the sky's north pole, which the stars turn about
//   MILKY_WAY_REACHES, MILKY_WAY_COLOUR, MILKY_WAY_LOST_TO_MOONLIGHT    the Milky Way's picture's layout, its
//                    colour at its brightest, and how much of it a full moon washes out
// the varying vViewDirection from sky.vert.glsl, hash from the noise chunk, lookUpSkyPicture (sky-picture.glsl),
// and skyGradient and sunsBroadGlow (sky-gradient.glsl).

// Seconds on the clock.
uniform float uTime;
// 0 by day .. 1 at night.
uniform float uNight;
// Daylight: 0 with the sun at the horizon .. 1 in full day.
uniform float uDaylight;
// 1 when the camera is under water, and the water's own colour there.
uniform float uUnderWater;
uniform vec3 uUnderWaterColour;
// The unit vector towards the sun, and the sun's colour.
uniform vec3 uSunDirection;
uniform vec3 uSunColour;
// The unit vector towards the moon.
uniform vec3 uMoonDirection;
// The sky's colour overhead and at the horizon.
uniform vec3 uSkyOverhead;
uniform vec3 uSkyHorizon;
// The two sky pictures being blended, and how far from A to B.
uniform sampler2D uSkyPictureFrom;
uniform sampler2D uSkyPictureTo;
uniform float uSkyPictureBlend;
// How far the clouds of each picture have drifted since it was drawn, in km: A's x and z, then B's.
uniform vec4 uSkyPictureDrift;
// The colours of cloud in the sun and in shade.
uniform vec3 uCloudInSun;
uniform vec3 uCloudInShade;
// The sky's turn of the moment (sky-turn.ts): a direction in the galaxy's frame times this is one from the island.
uniform mat3 uSkyTurn;
// The Milky Way's picture (milky-way-picture.ts) and the moon's face (moon-face-picture.ts): no mipmaps, so they
// may be read inside the night's branch.
uniform sampler2D uMilkyWay;
uniform sampler2D uMoonFace;
// From the camera, which is the dome's middle, towards this dot.
varying vec3 vViewDirection;

#include "../shaders/shared/turns"
#include "../shaders/shared/noise"
#include "sky-picture"
#include "sky-gradient"
#include "../shaders/shared/through-water"

// The colours of the sky's parts (the gradient's are in sky-gradient.glsl).
const vec3 SHOOTING_STAR_COLOUR = vec3(1.0, 0.95, 0.8);
const vec3 MOON_COLOUR = vec3(0.92, 0.95, 1.0);
// The moon's disc: how wide its soft edge is, and how much darker its limb is than its middle.
const float MOON_EDGE = 0.003;
const float MOON_LIMB_DARKER = 0.16;
// The disc is drawn in full from this far into the night (uNight, 0 day to 1 night).
const float MOON_SHOWS_BY_NIGHT = 0.4;
const vec3 MOON_GLOW_COLOUR = vec3(0.20, 0.26, 0.42);
// What a full moon's light adds to the air of the sky towards the moon; less away from it.
const vec3 MOONLIT_AIR = vec3(0.020, 0.030, 0.062);
// The low sun's light on a cloud's lower parts, as a share of its light on the top.
const vec3 LOW_SUN_ON_CLOUD = vec3(0.95, 0.66, 0.58);

// Near enough the angle between two unit directions: the straight line between them across a ball of radius 1.
float angleBetween(vec3 a, vec3 b) {
  return sqrt(max(0.0, 2.0 - 2.0 * dot(a, b)));
}

void main() {
  // (SKY_BARE: a debug switch draws the dome in one colour and works out nothing more, to read what the sky costs.)
  #ifdef SKY_BARE
  gl_FragColor = vec4(uSkyHorizon, 1.0);
  return;
  #endif
  vec3 direction = normalize(vViewDirection);
  float aboveHorizon = clamp(direction.y, 0.0, 1.0);

  // The sky's own colour: the gradient, and the evening's colours (sky-gradient.glsl).
  vec3 sky = skyGradient(normalize(direction.xz + 1e-5), aboveHorizon);
  float sunShows = 1.0 - uNight;

  // The sun: its glow and its disc.
  float fromSun = angleBetween(direction, uSunDirection);
  float sunGlow = sunsBroadGlow(fromSun) + 0.5 * exp(-fromSun * 16.0);
  sky += uSunColour * sunGlow * sunShows;
  sky = mix(sky, uSunColour * 1.5 + 0.3, smoothstep(0.034, 0.026, fromSun));

  // The night sky: the Milky Way, shooting stars and the moon. (The stars are drawn over the dome: stars.ts.)
  if (uNight > 0.004) {
    // The Milky Way: its picture is laid out in the galaxy's frame, which turns with the stars; across it, the
    // galactic longitude; up it, the sine of the galactic latitude. A full moon up all but washes it out.
    vec3 inGalaxy = direction * uSkyTurn;
    float alongGalaxy = atan(inGalaxy.y, inGalaxy.x + 1e-6) / FULL_TURN + 0.5;
    float acrossGalaxy = 0.5 + 0.5 * inGalaxy.z / MILKY_WAY_REACHES;
    float milkyWayGlow = texture2D(uMilkyWay, vec2(alongGalaxy, acrossGalaxy)).r;
    float moonUp = smoothstep(MOON_UP.x, MOON_UP.y, uMoonDirection.y);
    float clearOfHorizon = smoothstep(0.0, 0.25, direction.y);
    float milkyWayShows = uNight * clearOfHorizon * (1.0 - MILKY_WAY_LOST_TO_MOONLIGHT * moonUp);
    sky += MILKY_WAY_COLOUR * milkyWayGlow * milkyWayShows;

    // Shooting stars: a new one every 1/0.12 s, seen only for the first sixth of that (age 0 to 1).
    float shootingStarClock = uTime * 0.12;
    float shootingStar = floor(shootingStarClock);
    float age = fract(shootingStarClock) * 6.0;
    float startX = hash(vec2(shootingStar, 1.0)) - 0.5;
    float startY = 0.45 + 0.4 * hash(vec2(shootingStar, 2.0));
    float startZ = hash(vec2(shootingStar, 3.0)) - 0.5;
    vec3 startsAt = normalize(vec3(startX, startY, startZ));
    float travelX = hash(vec2(shootingStar, 4.0)) - 0.5;
    float travelZ = hash(vec2(shootingStar, 5.0)) - 0.5;
    vec3 travels = normalize(vec3(travelX, -0.25, travelZ));
    vec3 head = normalize(startsAt + travels * age * 0.35);
    vec3 fromHead = direction - head;
    float behindHead = dot(fromHead, -travels);
    float offTrail = length(cross(fromHead, travels));
    float trailWidth = smoothstep(0.0045, 0.0, offTrail);
    float trailLength = smoothstep(0.13, 0.0, behindHead);
    float trail = trailWidth * trailLength * step(0.0, behindHead) * step(age, 1.0);
    sky += trail * uNight * SHOOTING_STAR_COLOUR * 1.6;

    // The moon: its glow, and its disc. The disc is as wide as the sun's, as the real one is; it is paler towards
    // the middle than at the limb, with the seas of the real moon's face (moon-face-picture.ts). Its north points
    // to the sky's pole, as the real one's does: it rises tipped over and stands upright in the south.
    float fromMoon = angleBetween(direction, uMoonDirection);
    sky += uNight * MOON_GLOW_COLOUR * exp(-fromMoon * 8.0);
    // (And a full moon lights the air of the whole sky a little, most towards itself: a moonlit sky is a deep
    // blue, not black. The old band of noise had lit most of it by accident.)
    sky += uNight * moonUp * MOONLIT_AIR * (0.45 + 0.55 * exp(-fromMoon * 1.1));
    if (fromMoon < MOON_RADIUS) {
      // (the moon never stands near the pole, so its north is never too short to normalise)
      vec3 northOnMoon = normalize(SKY_POLE - uMoonDirection * dot(SKY_POLE, uMoonDirection));
      vec3 rightOnMoon = cross(uMoonDirection, northOnMoon);
      vec2 onDisc = vec2(dot(direction, rightOnMoon), dot(direction, northOnMoon)) / MOON_RADIUS;
      float ground = texture2D(uMoonFace, 0.5 + 0.5 * onDisc).r;
      float towardsLimb = dot(onDisc, onDisc);
      vec3 face = MOON_COLOUR * ground * (1.0 - MOON_LIMB_DARKER * towardsLimb);
      // (it shows before the night has quite come: a full moon is up in the dusk)
      float moonShows = smoothstep(0.0, MOON_SHOWS_BY_NIGHT, uNight);
      sky = mix(sky, face, moonShows * smoothstep(MOON_RADIUS, MOON_RADIUS - MOON_EDGE, fromMoon));
    }
  }

  // The clouds: looked up in the two sky pictures the sky is sliding between (clouds.ts), each shifted to where
  // its clouds have drifted to by now.
  if (direction.y > -0.012) {
    vec4 fromPictureA = lookUpSkyPicture(uSkyPictureFrom, direction, uSkyPictureDrift.xy);
    vec4 fromPictureB = lookUpSkyPicture(uSkyPictureTo, direction, uSkyPictureDrift.zw);
    vec4 clouds = mix(fromPictureA, fromPictureB, uSkyPictureBlend) * smoothstep(-0.012, 0.004, direction.y);
    // The low sun's light is redder and weaker on a cloud's lower parts than on its top.
    float fullSunlight = clamp(uDaylight * 2.2 + smoothstep(0.04, 0.26, asin(aboveHorizon)), 0.0, 1.0);
    vec3 cloudInSun = uCloudInSun * mix(LOW_SUN_ON_CLOUD, vec3(1.0), fullSunlight);
    // (the sky shows where the clouds do not hide it, and through cloud lost in haze, which takes its colour)
    float skyShows = 1.0 - clouds.a + clouds.b;
    // (red was divided by 2.3 to fit in the picture)
    vec3 sunlitCloud = cloudInSun * clouds.r * mix(2.4, 1.85, uDaylight);
    vec3 shadedCloud = uCloudInShade * clouds.g * 0.82;
    sky = sky * skyShows + sunlitCloud + shadedCloud;
  }

  // Haze low down, then the water's colour when under it.
  sky = mix(sky, uSkyHorizon, smoothstep(0.07, 0.0, direction.y) * 0.55);
  // (to an eye under water what lies beyond everything else is the water's own light: through-water.glsl)
  sky = mix(sky, waterLightFrom(uUnderWaterColour, direction.y), uUnderWater);
  // (a dot's worth of noise: it breaks up the bands a smooth gradient shows in 8-bit colour)
  sky += (hash(gl_FragCoord.xy) - 0.5) * (2.0 / 255.0);
  gl_FragColor = vec4(sky, 1.0);
}
