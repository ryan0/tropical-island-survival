// Which point of the ground is seen along a line from the eye that goes down through a flat sea.
//
// A thing's corners are drawn where they seem to be through the surface (raised-through-surface.glsl), and what
// lies between two corners goes in proportion. But the raising does not go in proportion: from a low eye it
// changes steeply with distance, and the ground's corners are two metres apart. So the sand between them lay
// up to a degree on the screen from where the law of refraction puts it, in a pattern that slid over the floor
// as the eye moved: a level floor seemed to work like dough under a wader. (The ground alone is drawn in such
// wide pieces; a rock's or a coral's corners are close together.)
//
// For one dot the law needs no searching: the eye's line through the dot is known, it is bent as it enters the
// water, and it runs on down to the ground. So in the picture of what is under the sea each dot of the ground
// finds for itself the point it shows, and is coloured as that point.
//
// eye: where the eye is. towards: any point on the eye's line that lies under the sea's level. level: the height
// of the sea. groundHeight: the ground's height where the line comes down (the caller's best knowledge of it).
// Returns the point's x and z.

#include "raised-through-surface"

vec2 seenThroughSurface(vec3 eye, vec3 towards, float level, float groundHeight) {
  vec3 line = normalize(towards - eye);
  // (a line that looks level never reaches the sea: it is taken to dip a little)
  float dips = min(line.y, -1e-3);
  vec2 entersAt = eye.xz + line.xz * ((level - eye.y) / dips);
  // The sine of the line's angle to straight down is BENT_LEAVING_WATER times as great in the water as in the air:
  // so is the level part of its direction, and this is the part that goes down.
  float downInWater = sqrt(1.0 - BENT_LEAVING_WATER * BENT_LEAVING_WATER * (1.0 - line.y * line.y));
  return entersAt + line.xz * (BENT_LEAVING_WATER * max(level - groundHeight, 0.0) / downInWater);
}
