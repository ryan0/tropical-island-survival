// Looking up a sky picture (clouds.ts, cloud-bake.frag.glsl): what the clouds show in a direction. The dome reads it
// for every dot of sky (sky.frag.glsl), and the stars for each star (stars.vert.glsl), so that cloud hides them.
//
// Needs the defines
//   EARTH_CURVE      1/(2R) for the small earth the clouds sit on
//   SLIDE_HEIGHT     the height (km) whose drift a sky picture is slid by, as the pictures are drawn with
//   HALF_A_DOT       half a dot of a sky picture, across and up
// The pictures have no mipmaps, so they may be read anywhere, inside a branch or in a vertex shader.

#include "../shaders/shared/turns"
#include "distance-up-to"

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
