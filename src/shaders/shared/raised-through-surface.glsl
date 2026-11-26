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
// is drawn into it raised to where it seems to be: every corner of every thing, by this one rule, in the one
// place every material's vertex shader passes through (sea/water-as-fog.ts), so that nothing moves against
// anything else. The surface's own shader then has only its ripples' bending to add (sea/water.frag.glsl).
// Into the picture only: on the screen things stand where they are, under the surface that hides them. (Raised
// there too, the far floor of the reef, which seems to lie a hand's depth under the sea, stood up out of the
// troughs of the waves.)
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
// (The whole of the way, and no less. Raised four fifths of the way, to see whether that was easier on the eye,
// the floor lay too low for a line of sight that skims the sea: looking along a shore, the line ran on under the
// surface over the floor again and found the deep, and a blue band lay along the beach's edge.)
// Nothing deeper than the second of these is raised, and the raising fades out from the first (m): what lies so
// deep is hidden by the water, and the floor of the open sea is one great rectangle whose corners, far off and
// raised each by its own amount, would lift the whole of it to the surface.
const vec2 NOT_RAISED_BELOW = vec2(6.0, 10.0);
// What stands out of the sea, within this height of it (m), is drawn lower by the same rule carried on up
// through the surface: all of it within that height is squeezed towards the sea's level, from both sides. Only
// a thing's corners are moved, and what lies between two corners goes in proportion. So where a triangle of the
// ground crosses the waterline, with one corner under the sea and raised and one out of it and left where it
// was, the sand at the waterline itself, which should not move at all, was raised with a share of the wet
// corner's rise: looking along the lagoon's shore, the sand in the picture and the shadows on it stood a
// hand's breadth off the screen's own, along a line as straight as the triangle's edge. (What is drawn lower
// is out of the water, and the surface reads nothing of it, but for the sand a wave has run up over: the
// surface allows for that, sea/water.frag.glsl.)
const float LOWERED_OUT_OF_SEA_WITHIN = 0.6;

// The share of its depth by which a thing just under the surface is drawn higher than it is (and of its height,
// one just over it lower). The same two things are given as below.
float raisedShareAtSurface(float levelFromEyeSquared, float eyeOverSea) {
  float eye = max(eyeOverSea, 0.02);
  float looksDown = eye * inversesqrt(levelFromEyeSquared + eye * eye);
  float goesDown = sqrt(1.0 - BENT_LEAVING_WATER * BENT_LEAVING_WATER * (1.0 - looksDown * looksDown));
  return 1.0 - BENT_LEAVING_WATER * looksDown / goesDown;
}

// How far up a thing is to be drawn from where it is, in metres: up for a thing under the sea, down (less than
// nought) for one a little out of it. levelFromEyeSquared: the square of how far off it is along the level, from
// under the eye. depth: how far under the still sea it lies (less than nought out of the water). eyeOverSea:
// how high the eye is above the still sea.
// (Where the thing seems to be depends on the angle the eye looks at, which depends on where it seems to be: it
// is worked out twice over, each time from the last answer, which is enough to settle it. No loop, and nothing
// is divided by what could be nought: docs/DEVICE_NOTES.md.)
float raisedThroughSurface(float levelFromEyeSquared, float depth, float eyeOverSea) {
  float under = max(depth, 0.0);
  float eye = max(eyeOverSea, 0.02);
  float seemsUnder = under * BENT_LEAVING_WATER;

  float down = eye + seemsUnder;
  float looksDown = down * inversesqrt(levelFromEyeSquared + down * down);
  float goesDown = sqrt(1.0 - BENT_LEAVING_WATER * BENT_LEAVING_WATER * (1.0 - looksDown * looksDown));
  seemsUnder = under * BENT_LEAVING_WATER * looksDown / goesDown;

  down = eye + seemsUnder;
  looksDown = down * inversesqrt(levelFromEyeSquared + down * down);
  goesDown = sqrt(1.0 - BENT_LEAVING_WATER * BENT_LEAVING_WATER * (1.0 - looksDown * looksDown));
  seemsUnder = under * BENT_LEAVING_WATER * looksDown / goesDown;

  float outOfSea = min(max(-depth, 0.0), LOWERED_OUT_OF_SEA_WITHIN);
  return (under - seemsUnder) * (1.0 - smoothstep(NOT_RAISED_BELOW.x, NOT_RAISED_BELOW.y, under))
    - outOfSea * raisedShareAtSurface(levelFromEyeSquared, eyeOverSea);
}
