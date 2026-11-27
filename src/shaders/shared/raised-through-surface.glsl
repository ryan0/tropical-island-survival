// Where a thing under the sea seems to be, to an eye above the sea.
//
// Light from the thing is bent as it leaves the water, so the eye's line to it is not straight: it goes to the
// spot of the surface the light came out at, and the thing seems to lie on that line carried straight on. It
// seems nearer the surface than it is: by a quarter looking straight down, by two thirds looking down at twenty
// degrees, by more the lower the eye looks. So a floor that falls away from the eye is seen spread out under
// the water, where a straight line would skim it and see past it, and a stick stood in the water seems bent
// at the waterline.
//
// The picture that the sea's surface reads (sea/under-water-picture.ts) is drawn from the eye by straight
// lines, as everything is. So that it holds what the eye would see through a flat sea, everything under the sea
// is drawn into it on the line it seems to lie on: every corner of every thing, by this one rule, in the one
// place every material's vertex shader passes through (sea/water-as-fog.ts), so that nothing moves against
// anything else. The surface's own shader then has only its ripples' bending to add (sea/water.frag.glsl).
// Into the picture only: on the screen things stand where they are, under the surface that hides them. (Moved
// there too, the far floor of the reef, which seems to lie a hand's depth under the sea, stood up out of the
// troughs of the waves.)
//
// Anywhere on that line looks the same from the eye. A thing is drawn where the line comes down to the thing's
// own depth, which is further off than it is, and not straight above itself where it seems to be. Only corners
// are moved, and what lies between two corners goes in proportion; a level floor whose corners are each moved
// along the level is still level, and whatever stands on it is moved to the same level and still stands on it.
// (Each corner was raised at first. The raising does not go in proportion, and the ground's corners are two
// metres apart: between them the floor was drawn up to a hand higher than the foot of a coral standing there,
// and from a swimmer's eye, to which everything under the sea is squeezed into a band under the surface, that
// was a third of the coral's height. Heads and corals sank into the floor and rose out of it as the eye moved,
// along edges as straight as the ground's triangles.)
//
// (First the surface read its picture straight behind itself. From the lagoon islet the eye's line skims the
// islet's slope under the water and lands in the deep basin beyond, so its shallows showed as a flat band of
// the water's colour. Then the picture was read where the bent line would land: but what should be seen there
// is edge-on or hidden in a picture drawn by straight lines, and cannot be read out of it.)
//
// Needs nothing from outside.

// Light bends as it leaves water: the sine of its angle to straight up is this many times smaller in the water
// than in the air (1 / 1.33).
const float BENT_LEAVING_WATER = 0.75;

// That number for a sea that bends light by a share of what water does: 1, which is no bending at all, for no
// share, and water's own for the whole. (The whole is what is drawn; a debug slider sets less, to judge it by.
// Every rule below is given the number, and so everything under such a sea is drawn as one law of bending
// would show it: the floor, what stands on it and the sand under a sheet of water keep their places against
// one another at any share. At first a share of the bending was a share of the way each thing was moved,
// which is no law's doing, and which the ground, working its own place out dot by dot, could not follow: at
// half, the floor slid under the corals as the eye moved.)
float bentLeavingSea(float shareOfWaters) {
  return 1.0 - (1.0 - BENT_LEAVING_WATER) * shareOfWaters;
}

// The tangent of the flattest way light can come up through such a sea and still leave it: the sine of that
// angle to straight up is `bent`. (Without end, for a sea that does not bend light: held to a hundred.)
float steepestWayOut(float bent) {
  return bent * inversesqrt(max(1.0 - bent * bent, 1e-4));
}
// No eye is taken to be nearer the sea than this (m): the rule settles less well the lower the eye, and a
// swimmer's is never so low.
const float LOWEST_EYE_RAISED_FOR = 0.1;
// (The whole of the way, and no less. Raised four fifths of the way, to see whether that was easier on the eye,
// the floor lay too low for a line of sight that skims the sea: looking along a shore, the line ran on under the
// surface over the floor again and found the deep, and a blue band lay along the beach's edge.)
// Nothing deeper than the second of these is moved, and the moving fades out from the first (m): what lies so
// deep is hidden by the water, and the floor of the open sea is one great rectangle whose corners, far off and
// moved each by its own amount, would lift the whole of it to the surface.
const vec2 NOT_RAISED_BELOW = vec2(6.0, 10.0);
// Nothing is drawn further from the eye than this (m), along the level: from an eye a hand over the water the
// line to the far floor is all but level, and comes down to the floor's depth miles off. What would be drawn
// further is drawn this far off on its line, above its depth. (The furthest the camera draws is 7000 m.)
const float FARTHEST_DRAWN = 3000.0;
// What stands out of the sea, within this height of it (m), is drawn lower by the same rule carried on up
// through the surface: all of it within that height is squeezed towards the sea's level, from both sides. Only
// a thing's corners are moved, and what lies between two corners goes in proportion. So where a triangle of the
// ground crosses the waterline, with one corner under the sea and moved and one out of it and left where it
// was, the sand at the waterline itself, which should not move at all, was moved with a share of the wet
// corner's: looking along the lagoon's shore, the sand in the picture and the shadows on it stood a
// hand's breadth off the screen's own, along a line as straight as the triangle's edge. (A corner drawn lower
// and a corner drawn further off are moved along the same line from the eye, to a first reckoning: between
// them the waterline stays on its own. What is drawn lower is out of the water, and the surface reads nothing
// of it, but for the sand a wave has run up over: the surface allows for that, sea/water.frag.glsl.)
const float LOWERED_OUT_OF_SEA_WITHIN = 0.6;

// The share of its depth by which a thing just under the surface seems higher than it is (and of its height,
// one just over it is drawn lower). The same things are given as below.
float raisedShareAtSurface(float levelFromEyeSquared, float eyeOverSea, float bent) {
  float eye = max(eyeOverSea, LOWEST_EYE_RAISED_FOR);
  float looksDown = eye * inversesqrt(levelFromEyeSquared + eye * eye);
  float goesDown = sqrt(1.0 - bent * bent * (1.0 - looksDown * looksDown));
  return 1.0 - bent * looksDown / goesDown;
}

// One step nearer to the spot of the surface that the light from a thing comes out at on its way to the eye:
// comesOut is how far that spot lies from under the eye, along the level, as last reckoned. At the true spot the
// sine of the light's angle in the air is 1 / bent times its sine in the water; this is Newton's step towards
// that. (Nothing is divided by what could be nought: the eye is above the sea.) noFurtherBack: the least
// comesOut can be.
float nearerToWhereLightComesOut(float comesOut, float away, float under, float eye, float bent,
  float noFurtherBack) {
  float toGo = away - comesOut;
  float inAir = inversesqrt(comesOut * comesOut + eye * eye);
  float inWater = inversesqrt(toGo * toGo + under * under + 1e-8);
  float wrongBy = comesOut * inAir - toGo * inWater / bent;
  float changesBy = eye * eye * inAir * inAir * inAir + under * under * inWater * inWater * inWater / bent;
  return clamp(comesOut - wrongBy / changesBy, noFurtherBack, away);
}

// Where a thing is to be drawn from where it is: the first number is the share of its distance from under the
// eye, along the level, that it is drawn further off by, and the second how far up it is drawn, in metres.
// A thing under the sea is drawn further off at its own depth (and up only where FARTHEST_DRAWN stops it short);
// one a little out of the sea is drawn lower where it is. levelFromEyeSquared: the square of how far off it is
// along the level, from under the eye. depth: how far under the sea it lies (less than nought out of the water).
// eyeOverSea: how high the eye is above the sea. bent: how the sea bends light (bentLeavingSea).
// (Where the thing seems to be depends on where its light leaves the water, and that has to be searched for: from
// the nearer of two first guesses, the one that is right looking straight down and the one that is right
// looking along the sea, three of Newton's steps come within a twentieth of a degree on the screen of the law
// of refraction, for any eye a hand's breadth or more above the water. The rule before this one worked the
// angle out twice over from its own last answer, which settles slowly from a low eye: a swimmer's floor was
// drawn up to two degrees from where it should be, measured, and a level floor seemed to heave as he moved.
// No loop, and nothing is divided by what could be nought: docs/DEVICE_NOTES.md.)
vec2 drawnThroughSurface(float levelFromEyeSquared, float depth, float eyeOverSea, float bent) {
  float under = max(depth, 0.0);
  float eye = max(eyeOverSea, LOWEST_EYE_RAISED_FOR);
  float away = sqrt(levelFromEyeSquared);

  // (No further back from over the thing than light can come up at all: which also leaves the spot over a thing
  // that lies at the surface itself, where there is nothing to search for and a step would go astray.)
  float noFurtherBack = max(away - under * steepestWayOut(bent), 0.0);
  float comesOut = max(away * eye / (eye + under * bent), noFurtherBack);
  comesOut = nearerToWhereLightComesOut(comesOut, away, under, eye, bent, noFurtherBack);
  comesOut = nearerToWhereLightComesOut(comesOut, away, under, eye, bent, noFurtherBack);
  comesOut = nearerToWhereLightComesOut(comesOut, away, under, eye, bent, noFurtherBack);
  // The eye's line through that spot is down at the thing's own depth this many times as far off as the spot.
  float timesAsFar = min((eye + under) / eye, FARTHEST_DRAWN / max(comesOut, 1e-3));

  float moved = 1.0 - smoothstep(NOT_RAISED_BELOW.x, NOT_RAISED_BELOW.y, under);
  float outOfSea = min(max(-depth, 0.0), LOWERED_OUT_OF_SEA_WITHIN);
  return vec2(
    moved * (comesOut * timesAsFar / max(away, 1e-4) - 1.0),
    moved * (under - eye * (timesAsFar - 1.0))
      - outOfSea * raisedShareAtSurface(levelFromEyeSquared, eyeOverSea, bent));
}
