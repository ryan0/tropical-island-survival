// Coral colour: plain matt colour, mottled, with the sea's tint and the net of light the ripples throw (seatint.glsl,
// as terrain-colour.glsl draws them on the sand). Runs inside three.js's Lambert shader: reef-material.ts puts it in
// place of <color_fragment>, wrapped in braces. It starts from the colour painted on the model (diffuseColor, already
// multiplied by vColor) and leaves the result there for three.js to light, with the sun's light as netOfLight and
// shadowFilledIn say (shaders/sunlight-under-water.ts). Needs uDetail, uCoralSurface, uCameraPosition,
// vSurfacePosition, vSurfaceFacing, vSurfaceKind, seaTint, netOfLightUnderSea and shadowFilledUnderSea from
// coral-declarations.glsl, and the defines CORAL_SURFACE_SPAN and CORAL_SURFACE_AVERAGES (reef-material.ts).

// The net of light falls on what looks up. A coral is all knobs and branches, which its model's facing only
// roughly follows: so no part of one is taken to look up less than this.
const float CORAL_FACES_UP_AT_LEAST = 0.3;
// A surface seen edge on is this much as bright as one seen square on.
const float EDGE_ON_DARKER = 0.62;
// The detail texture's blotches are read this many times to a metre for the broad mottling (it repeats every
// 2.7 m), and this many for the mottling a hand's breadth across.
const float BROAD_MOTTLE_SCALE = 0.37;
const float HAND_MOTTLE_SCALE = 2.3;
// Coral gets half the water's greying and loss of red that rock gets: its colour is the point of it.
const float CORAL_TINT_STRENGTH = 0.5;
// How much darker a hollow of the coral's surface is, and how much lighter what stands proud, than its shade
// overall (the picture's whole range is 1).
const float SURFACE_RELIEF = 0.9;
// Blotches: the picture's alpha between which a pale patch comes in, and what it multiplies the colour by.
const vec2 BLOTCHES_FROM = vec2(0.66, 0.76);
const vec3 PALE_BLOTCH = vec3(1.22, 1.2, 1.14);

// Broad mottling: the detail texture's soft blotches read large, laid on from above and shifted by height so
// that steep sides are not streaked. (Read small as well, with its net of fine lines, it smeared every coral
// with the same lace: the coral's own surface, below, is what shows close to now.)
vec2 mottleUv = vec2(vSurfacePosition.x + vSurfacePosition.y * 0.8, vSurfacePosition.z - vSurfacePosition.y * 0.6);
float broadBlotches = texture2D(uDetail, mottleUv * BROAD_MOTTLE_SCALE).b;
// (and read at a hand's breadth, for the lumps and hollows that a coral seen from a few metres up still shows,
// when its own surface has blurred away)
float handBlotches = texture2D(uDetail, mottleUv * HAND_MOTTLE_SCALE).b;
diffuseColor.rgb *= (0.9 + 0.2 * broadBlotches) * (0.84 + 0.32 * handBlotches);

// Close up, the coral's own surface: a brain coral's winding ridges, a boulder coral's fine skin, the warts of
// the branching kinds, as its model says (vSurfaceKind). It is a picture of the real things, laid on from three
// sides by which way the surface faces, so that no side of a dome is streaked; it darkens the hollows and
// lights what stands proud, and leaves the coral's shade overall as it was. The picture blurs to nothing with
// distance by itself. (The three reads are made whatever the coral, and not skipped by a branch: a mipmapped
// texture read inside one goes wrong on some phones, docs/DEVICE_NOTES.md.)
vec3 facing = vSurfaceFacing * vSurfaceFacing;
facing /= facing.x + facing.y + facing.z + 1e-4;
vec3 onSurface = vSurfacePosition / CORAL_SURFACE_SPAN;
vec4 surface = texture2D(uCoralSurface, onSurface.zy) * facing.x
  + texture2D(uCoralSurface, onSurface.xz) * facing.y
  + texture2D(uCoralSurface, onSurface.xy) * facing.z;
float standsProud = dot(surface.rgb, vSurfaceKind) - dot(CORAL_SURFACE_AVERAGES, vSurfaceKind);
diffuseColor.rgb *= 1.0 + SURFACE_RELIEF * standsProud;
// (and pale patches, where it is growing or has been bitten, on any kind: the picture's own blotches, and
// only where the broad ones allow, so that the picture's repeat does not show on a big coral)
float hasSurface = min(vSurfaceKind.x + vSurfaceKind.y + vSurfaceKind.z, 1.0);
float palePatch = smoothstep(BLOTCHES_FROM.x, BLOTCHES_FROM.y, 0.55 * surface.a + 0.45 * broadBlotches);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * PALE_BLOTCH, palePatch * hasSurface);

// What is round shows round: a surface seen edge on is darker than one seen square on, as a coral's fuzz of
// polyps makes it. (Under water the light comes from all round, and without this a branch was a flat plank
// and a mound a flat disc.)
vec3 facingOut = normalize(vSurfaceFacing);
float seenSquareOn = abs(dot(facingOut, normalize(uCameraPosition - vSurfacePosition)));
diffuseColor.rgb *= mix(EDGE_ON_DARKER, 1.0, seenSquareOn);

// The sea's tint and its net of light
diffuseColor.rgb = seaTint(diffuseColor.rgb, vSurfacePosition, CORAL_TINT_STRENGTH);
netOfLight = netOfLightUnderSea(vSurfacePosition, max(facingOut.y, CORAL_FACES_UP_AT_LEAST));
shadowFilledIn = shadowFilledUnderSea(vSurfacePosition);
