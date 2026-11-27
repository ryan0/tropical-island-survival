// Which point of the ground is seen along a line from the eye that goes down through a flat sea.
//
// A thing's corners are drawn on the lines they seem to lie on through the surface (raised-through-surface.glsl),
// and what lies between two corners goes in proportion. But where a thing seems to be does not go in
// proportion: from a low eye it changes steeply with distance, and the ground's corners are two metres apart.
// So the sand between them lay up to a degree on the screen from where the law of refraction puts it, in a
// pattern that slid over the floor as the eye moved: a level floor seemed to work like dough under a wader.
// (The ground alone is drawn in such wide pieces; a rock's or a coral's corners are close together.)
//
// For one dot the law needs no searching: the eye's line through the dot is known, it is bent as it enters the
// water, and it runs on down to the ground. So in the picture of what is under the sea each dot of the ground
// finds for itself the point it shows, and is coloured as that point.
//
// The ground it runs down to is the flat piece the dot belongs to, carried on as far as need be: sloping as that
// piece slopes. (Taken to be level at the dot's own height, the line missed a steep wall by as much as the
// wall's corners had been wrongly placed between them, by a metre and more, and now on this side and now on
// that as the eye moved: the wall's rock was drawn out into streaks that crawled over it.)
//
// eye: where the eye is. line: the way the eye looks through the dot, one long. level: the height of the sea.
// onGround: any point of the dot's piece of the ground, and facing: the way that piece faces, one long and
// upward. bent: how the sea bends light (bentLeavingSea). Returns the point, or onGround where the line cannot
// be followed to it.

#include "raised-through-surface"

// The line is followed where it falls on the ground at least as squarely as the second of these (the cosine of
// its angle to the way the ground faces), and not at all where it skims it more nearly than the first: skimmed,
// the least error carries the point a long way. Nor is the point taken further from onGround than the third (m):
// a piece of the ground is a couple of metres across, and the point it shows is on it or beside it.
const vec3 FOLLOWED_TO_THE_GROUND = vec3(0.06, 0.25, 3.0);

vec3 seenThroughSurface(vec3 eye, vec3 line, float level, vec3 onGround, vec3 facing, float bent) {
  // (a line that looks level never reaches the sea: it is taken to dip a little)
  float dips = min(line.y, -1e-3);
  vec3 entersAt = vec3(eye.x + line.x * ((level - eye.y) / dips), level, eye.z + line.z * ((level - eye.y) / dips));
  // The sine of the line's angle to straight down is `bent` times as great in the water as in the air: so is the
  // level part of its direction, and this is the part that goes down.
  float downInWater = sqrt(1.0 - bent * bent * (1.0 - line.y * line.y));
  vec3 inWater = vec3(line.x * bent, -downInWater, line.z * bent);

  float fallsOn = -dot(inWater, facing);
  float runsOn = max(dot(entersAt - onGround, facing), 0.0) / max(fallsOn, FOLLOWED_TO_THE_GROUND.x);
  vec3 fromThere = entersAt + inWater * runsOn - onGround;
  fromThere *= min(1.0, FOLLOWED_TO_THE_GROUND.z * inversesqrt(max(dot(fromThere, fromThere), 1e-8)));
  return onGround + fromThere * smoothstep(FOLLOWED_TO_THE_GROUND.x, FOLLOWED_TO_THE_GROUND.y, fallsOn);
}
