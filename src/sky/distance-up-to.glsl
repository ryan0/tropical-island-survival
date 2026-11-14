// How far a line of sight goes to reach a height above the sea, which curves away below it as for the small earth
// the clouds sit on (EARTH_CURVE). Distances in km. cloud-field.ts has the same sum for the program.
//
// Needs nothing from outside: the caller gives `curve`, which is (1 - rise * rise) * EARTH_CURVE.

// How far a line rising at `rise` (the sine of its elevation) goes to reach `height` above the sea: the root of
// s * rise + s * s * curve = height, in the form that still holds when `curve` is 0 (the line straight up).
float distanceUpTo(float height, float rise, float curve) {
  return 2.0 * height / (rise + sqrt(rise * rise + 4.0 * curve * height));
}
