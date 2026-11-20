// The stars (stars.ts): each set in the sky by the sky's turn of the moment and drawn as a soft spot over the dome.
// The eye makes out fewer as daylight comes, low down, near the moon and while it is up; cloud hides them; they
// twinkle, more so low down.
//
// Needs the attributes position (the star's direction in the galaxy's frame: sky-turn.ts), aMagnitude, aColour and
// aSeed (its own number, 0 up to 1); the shared uniforms uTime, uNight, uMoonDirection, uUnderWater and the sky
// pictures' (sky-picture.glsl); uSkyTurn and uPixelRatio from stars.ts; MOON_RADIUS, MOON_UP and the sky pictures'
// defines from sky-dome.ts, SPREADS_ACROSS and the defines stars.ts writes from the config (sky-config.ts, `stars`).
// Hands stars.frag.glsl the star's colour at its middle as vColour.

attribute float aMagnitude;
attribute vec3 aColour;
attribute float aSeed;
// Turns a direction in the galaxy's frame into one from the island.
uniform mat3 uSkyTurn;
uniform float uTime;    // seconds on the clock
uniform float uNight;    // 0 by day to 1 at night
uniform vec3 uMoonDirection;
uniform float uUnderWater;    // 1 when the camera is under water
uniform sampler2D uSkyPictureFrom;
uniform sampler2D uSkyPictureTo;
uniform float uSkyPictureBlend;
uniform vec4 uSkyPictureDrift;
uniform float uPixelRatio;    // dots to a CSS pixel
varying vec3 vColour;

#include "sky-picture"

// Where a star that is not drawn goes: outside the picture, so that no pixel of it is drawn.
const vec4 OFF_SCREEN = vec4(2.0, 2.0, 2.0, 1.0);
// (0.004 is about one step of 8-bit colour: nothing that could be seen is dropped)
const float FAINTEST_DRAWN = 0.004;
// A spot narrower than this, in dots, falls between the dots it is drawn on and flickers as it moves: a narrower
// star is drawn this wide and dimmer, by as much as it is narrower.
const float NARROWEST_SPREAD = 0.5;

void main() {
  vec3 direction = uSkyTurn * position;
  float height = direction.y;

  // The faintest magnitude the eye makes out here and now: daylight hides all; low down the air dims a star; a
  // full moon's light hides the faint stars over the whole sky while it is up, and more near it.
  float moonUp = smoothstep(MOON_UP.x, MOON_UP.y, uMoonDirection.y);
  float fromMoon = sqrt(max(0.0, 2.0 - 2.0 * dot(direction, uMoonDirection)));
  float nearMoon = 1.0 - smoothstep(NEAR_MOON.x, NEAR_MOON.y, fromMoon);
  float lowDown = 1.0 - smoothstep(0.0, LOW_DOWN, height);
  float faintestSeen = mix(FAINTEST_SEEN_BY_DAY, FAINTEST_SEEN_BY_NIGHT, uNight);
  faintestSeen -= moonUp * (LOST_TO_MOONLIGHT + LOST_NEAR_MOON * nearMoon);
  // (squared: the air a line of sight crosses grows fastest at the very horizon)
  faintestSeen -= LOST_AT_HORIZON * lowDown * lowDown;
  float seen = smoothstep(faintestSeen, faintestSeen - FADES_OVER, aMagnitude);

  // What the clouds leave of the sky behind them, as the dome works it out (sky.frag.glsl).
  vec4 fromPictureA = lookUpSkyPicture(uSkyPictureFrom, direction, uSkyPictureDrift.xy);
  vec4 fromPictureB = lookUpSkyPicture(uSkyPictureTo, direction, uSkyPictureDrift.zw);
  vec4 clouds = mix(fromPictureA, fromPictureB, uSkyPictureBlend);
  float clearOfCloud = clamp(1.0 - clouds.a + clouds.b, 0.0, 1.0);

  // Twinkling: two swings at paces of the star's own, beating; stronger through the air low down.
  float ownPace = 0.7 + 0.6 * fract(aSeed * 7.31);
  float swingA = sin(uTime * TWINKLE_PACES.x * ownPace + aSeed * 61.0);
  float swingB = sin(uTime * TWINKLE_PACES.y * ownPace + aSeed * 97.0);
  float twinkleStrength = mix(TWINKLE.y, TWINKLE.x, smoothstep(0.0, 0.7, height));
  float twinkle = 1.0 + twinkleStrength * swingA * swingB;

  // Its spot: brighter and wider the brighter the star.
  float brightness = BRIGHTNESS_AT_MAGNITUDE_ZERO * exp2(-BRIGHTER_PER_MAGNITUDE * aMagnitude);
  float sizeShare = smoothstep(SPREAD_AT_MAGNITUDES.x, SPREAD_AT_MAGNITUDES.y, aMagnitude);
  float spread = mix(SPREAD.x, SPREAD.y, sizeShare) * uPixelRatio;
  float drawnSpread = max(spread, NARROWEST_SPREAD);
  float narrowerShare = spread / drawnSpread;
  brightness *= narrowerShare * narrowerShare;

  float aboveHorizon = step(0.0, height);
  float shows = brightness * seen * clearOfCloud * twinkle * aboveHorizon;
  vColour = aColour * mix(vec3(1.0), COLOUR_AT_HORIZON, lowDown) * shows;
  float pointPixels = SPREADS_ACROSS * drawnSpread;

  float behindMoon = step(fromMoon, MOON_RADIUS);
  float isDrawn = step(FAINTEST_DRAWN, shows) * step(uUnderWater, 0.5) * (1.0 - behindMoon);
  vec3 inView = (viewMatrix * vec4(direction, 0.0)).xyz;
  gl_PointSize = pointPixels;
  gl_Position = mix(OFF_SCREEN, projectionMatrix * vec4(inView * STAR_DISTANCE, 1.0), isDrawn);
}
