// What water does to the light on its way from a thing to an eye that is under the water with it. Every metre takes
// a share of the light, red first, and puts the water's own light in its place: so a coral near the eye keeps its
// colour, one ten metres off is green-blue, and by thirty metres there is only the water. (What the water over a
// thing does to the light that falls on it is another matter: seatint.glsl, terrain-colour.glsl.)
//
// The numbers go by photographs taken under water in daylight without a flash (docs/LOOK.md, "Under water").
// Needs nothing from outside.

// The share of red, green and blue light that a metre of clear lagoon water takes, absorbed or scattered aside.
// (Clear sea water takes about a third of the red in a metre. The eye, used to the water's light, misses less of
// it: in the photographs a coral three metres from the camera is still tan, one ten metres off green-blue, and at
// twenty there is the water's colour alone.)
const vec3 WATER_TAKES_A_METRE = vec3(0.16, 0.11, 0.09);
// The water's own light is brighter looking up, towards where the light comes from, and darker and bluer looking
// down into it: its colour looking level is multiplied by these straight up and straight down.
const vec3 WATER_LIGHT_ABOVE = vec3(1.2, 1.2, 1.15);
const vec3 WATER_LIGHT_BELOW = vec3(0.35, 0.5, 0.7);

// The water's own light from a direction. waterColour: its colour looking level. rise: the direction's height, -1
// straight down to 1 straight up.
vec3 waterLightFrom(vec3 waterColour, float rise) {
  vec3 lookingUp = mix(vec3(1.0), WATER_LIGHT_ABOVE, clamp(rise, 0.0, 1.0));
  vec3 lookingDown = mix(vec3(1.0), WATER_LIGHT_BELOW, clamp(-rise, 0.0, 1.0));
  return waterColour * lookingUp * lookingDown;
}

// colour: a thing's colour where it stands. waterColour: the water's colour looking level. metres: how much water
// lies between the thing and the eye. rise: the height of the direction from the eye to it, -1 to 1.
vec3 seenThroughWater(vec3 colour, vec3 waterColour, float metres, float rise) {
  vec3 comesThrough = exp(-metres * WATER_TAKES_A_METRE);
  return colour * comesThrough + waterLightFrom(waterColour, rise) * (1.0 - comesThrough);
}
