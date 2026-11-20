// The sky dome: the gradient, the sun, the moon, the stars, the milky way, shooting stars, and the clouds looked
// up in two sky pictures (clouds.ts, cloud-bake.frag.glsl).
//
// Needs the defines
//   EARTH_CURVE      1/(2R) for the small earth the clouds sit on
//   SLIDE_HEIGHT     the height (km) whose drift a sky picture is slid by, as the pictures are drawn with
//   HALF_A_DOT       half a dot of a sky picture, across and up
// the varying vViewDirection from sky.vert.glsl, hash, fbm and fbm5 from the noise chunk, distanceUpTo
// (distance-up-to.glsl), and skyGradient and sunsBroadGlow (sky-gradient.glsl).

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
// From the camera, which is the dome's middle, towards this dot.
varying vec3 vViewDirection;

#include "../shaders/shared/turns"
#include "../shaders/shared/noise"
#include "distance-up-to"
#include "sky-gradient"

// The colours of the sky's parts (the gradient's are in sky-gradient.glsl).
const vec3 MILKY_WAY_COLOUR = vec3(0.15, 0.17, 0.26);
const vec3 SHOOTING_STAR_COLOUR = vec3(1.0, 0.95, 0.8);
const vec3 MOON_COLOUR = vec3(0.92, 0.95, 1.0);
// The moon's disc: how far its edge is from its middle (radians: the sun's is drawn as wide), how wide the soft
// edge is, and how much darker its seas and its limb are than the rest of its face.
const float MOON_RADIUS = 0.034;
const float MOON_EDGE = 0.003;
const float MOON_SEAS_DARKER = 0.30;
const float MOON_LIMB_DARKER = 0.16;
// The disc is drawn in full from this far into the night (uNight, 0 day to 1 night).
const float MOON_SHOWS_BY_NIGHT = 0.4;
const vec3 MOON_GLOW_COLOUR = vec3(0.20, 0.26, 0.42);
// The low sun's light on a cloud's lower parts, as a share of its light on the top.
const vec3 LOW_SUN_ON_CLOUD = vec3(0.95, 0.66, 0.58);
// Square to the plane of the milky way (normalised where it is used).
const vec3 MILKY_WAY_POLE = vec3(0.35, 0.5, -0.79);

// Near enough the angle between two unit directions: the straight line between them across a ball of radius 1.
float angleBetween(vec3 a, vec3 b) {
  return sqrt(max(0.0, 2.0 - 2.0 * dot(a, b)));
}

// What a sky picture shows in direction d, the picture having been made `shift` km of wind drift ago: find the
// spot at the clouds' usual height that d looks at, step back upwind, and look up the direction of that spot.
vec4 lookUpSkyPicture(sampler2D picture, vec3 d, vec2 shift) {
  float rise = max(d.y, 0.0);
  float curve = (1.0 - rise * rise) * EARTH_CURVE;
  float toSlideHeight = distanceUpTo(SLIDE_HEIGHT, rise, curve);
  vec3 spot = d * toSlideHeight;
  spot.xz -= shift;
  spot.y = SLIDE_HEIGHT - dot(spot.xz, spot.xz) * EARTH_CURVE;
  vec3 towardsSpot = normalize(spot);

  // Where that direction is in the picture, laid out as cloud-bake.frag.glsl draws it.
  float across = atan(towardsSpot.z, towardsSpot.x) / FULL_TURN + 0.5;
  float up = -0.5 + sqrt(0.25 + 2.0 * asin(clamp(towardsSpot.y, 0.0, 1.0)) / QUARTER_TURN);
  vec2 uv = vec2(across, up);
  // (read twice, half a dot apart each way, and averaged: that smooths away the grain the picture's stepping
  // leaves)
  vec4 halfADotOn = texture2D(picture, uv + HALF_A_DOT);
  vec4 halfADotBack = texture2D(picture, uv - HALF_A_DOT);
  return 0.5 * (halfADotOn + halfADotBack);
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

  // The night sky: stars, the milky way, shooting stars and the moon.
  if (uNight > 0.004) {
    float clearOfHorizon = smoothstep(0.0, 0.2, direction.y);

    // Stars: the sky cut into little cubes, with a star in the middle of one in 400.
    vec3 inStarCells = direction * 180.0;
    vec3 starCell = floor(inStarCells);
    vec3 inCell = fract(inStarCells) - 0.5;
    float isStar = step(0.9975, hash(starCell.xy + starCell.z * vec2(17.3, 31.7)));
    float starDot = smoothstep(0.45, 0.05, length(inCell));
    float star = isStar * starDot * uNight * clearOfHorizon;
    float twinkle = 0.7 + 0.3 * sin(uTime * 2.0 + starCell.x + starCell.z);
    sky += star * twinkle * 1.4;

    // The milky way: a band round the sky, mottled.
    vec3 milkyWayPole = normalize(MILKY_WAY_POLE);
    float acrossMilkyWay = dot(direction, milkyWayPole) * 3.2;
    float milkyWayBand = exp(-acrossMilkyWay * acrossMilkyWay);
    float milkyWayMottle = fbm5(direction.xz * 3.0 + direction.y * 2.5);
    float milkyWayLight = 0.25 + 0.75 * milkyWayMottle;
    sky += uNight * milkyWayBand * milkyWayLight * smoothstep(-0.05, 0.3, direction.y) * MILKY_WAY_COLOUR;

    // Faint stars, in finer cubes: more of them in the milky way.
    vec3 faintStarCell = floor(direction * 420.0);
    float faintStarChance = hash(faintStarCell.xy + faintStarCell.z * vec2(13.1, 29.7));
    float isFaintStar = step(0.9965 - 0.006 * milkyWayBand * milkyWayMottle, faintStarChance);
    sky += isFaintStar * uNight * clearOfHorizon * 0.32;

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

    // The moon: its glow, and its disc, which hides the stars behind it. The disc is as wide as the sun's, as the
    // real one is; it is paler towards the middle than at the limb, with the grey seas of its face, which keep
    // their places on it wherever in the sky it stands.
    float fromMoon = angleBetween(direction, uMoonDirection);
    sky += uNight * MOON_GLOW_COLOUR * exp(-fromMoon * 8.0);
    if (fromMoon < MOON_RADIUS) {
      vec3 acrossMoon = normalize(cross(vec3(0.0, 1.0, 0.0), uMoonDirection));
      vec3 upMoon = cross(uMoonDirection, acrossMoon);
      vec2 onDisc = vec2(dot(direction, acrossMoon), dot(direction, upMoon)) / MOON_RADIUS;
      float seas = smoothstep(0.40, 0.62, fbm(onDisc * 1.7 + vec2(4.0, 9.0)));
      float towardsLimb = dot(onDisc, onDisc);
      vec3 face = MOON_COLOUR * (1.0 - MOON_SEAS_DARKER * seas) * (1.0 - MOON_LIMB_DARKER * towardsLimb);
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
  sky = mix(sky, uUnderWaterColour, uUnderWater);
  // (a dot's worth of noise: it breaks up the bands a smooth gradient shows in 8-bit colour)
  sky += (hash(gl_FragCoord.xy) - 0.5) * (2.0 / 255.0);
  gl_FragColor = vec4(sky, 1.0);
}
