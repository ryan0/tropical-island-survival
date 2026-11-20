// Who stands for what the sea's surface does to the line of an eye above it.
//
// Each ripple bends the eye's line, so that what is under the water is seen a little to one side of where it lies,
// by more the deeper it lies. Two things can draw that, and only one of them may at a time, or what is under the
// water is moved twice, and whatever is moved by one rule and not the other slides over its neighbours:
//
//   - The sea's surface, where the scene under it has been drawn to a picture that the surface reads a little to
//     one side (sea/under-water-picture.ts, water.frag.glsl). It moves everything alike, each thing by its own
//     depth, whatever its material.
//   - The things themselves, where there is no such picture: each must then be drawn already moved. The ground,
//     the rocks and the coral sway (sway-under-water.glsl), and the ground's markings swim
//     (terrain-colour.glsl). What has neither rule (the fish, the weed) stands still.
//
// Every rule of the second kind asks this, and nothing else, whether it is in force. A new rule of that kind must
// ask it too; and a new way for the surface to draw the bending is told of here, not in each of them.
//
// Needs the uniforms uSeaLevel, uCameraPosition, uDebugMode and uPictureDrawn.

// 1 where the things under the sea must themselves be drawn moved, 0 where the surface bends them or nothing
// does: the eye is under the water with them, or the sea is drained (uDebugMode 5).
float thingsBendThemselves() {
  float eyeIsAboveSea = step(uSeaLevel, uCameraPosition.y);
  float seaIsThere = step(uDebugMode, 4.5);
  return eyeIsAboveSea * seaIsThere * (1.0 - uPictureDrawn);
}
