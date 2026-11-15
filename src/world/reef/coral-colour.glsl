// Coral colour: plain matt colour, mottled, with the sea's tint and the net of light the ripples throw (seaTint,
// as terrain-colour.glsl draws it on the sand). Runs inside three.js's Lambert shader: reef-material.ts puts it in
// place of <color_fragment>, wrapped in braces. It starts from the colour painted on the model (diffuseColor, already
// multiplied by vColor) and leaves the result there for three.js to light. Needs uDetail, uCameraPosition, vSurfacePosition and seaTint from
// coral-declarations.glsl.

// How much the coral is taken to look up, for the net of light: its facing is not passed to this shader.
const float CORAL_FACING_UP = 0.6;
// Coral gets half the water's greying and loss of red that rock gets: its colour is the point of it.
const float CORAL_TINT_STRENGTH = 0.5;

// Mottling: the detail texture laid on from above, shifted by height so that steep sides are not streaked
vec2 mottleUv = vec2(vSurfacePosition.x + vSurfacePosition.y * 0.8, vSurfacePosition.z - vSurfacePosition.y * 0.6);
vec4 mottle = texture2D(uDetail, mottleUv * 1.9);
diffuseColor.rgb *= 0.86 + 0.28 * mottle.b + 0.10 * (mottle.a - 0.3);

// Close up, the polyps: a fine pitted grain (the detail texture read very small, twice). It fades with
// distance and is too faint to see beyond about 16 m. The two reads are made all the same, and not skipped by a
// branch: a mipmapped texture read inside one goes wrong on some phones (docs/DEVICE_NOTES.md).
float polypStrength = exp(-length(uCameraPosition - vSurfacePosition) * 0.22);
vec4 pitDetail = texture2D(uDetail, mottleUv * 11.0);
vec4 grainDetail = texture2D(uDetail, mottleUv.yx * 23.0);
float pits = 0.42 * (pitDetail.a - 0.35);
float grain = 0.30 * (grainDetail.b - 0.5);
diffuseColor.rgb *= 1.0 + polypStrength * (pits + grain);

// The sea's tint and its net of light
diffuseColor.rgb = seaTint(diffuseColor.rgb, vSurfacePosition, CORAL_FACING_UP, CORAL_TINT_STRENGTH);
