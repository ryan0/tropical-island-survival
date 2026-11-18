// Rock colour. The mesh brings the rock's own tone and how deep in a hollow each point is (vColor); this adds the
// surface: the detail texture laid on from three sides (so it never stretches) at two sizes gives mottling, grain,
// cracks and pits; tops are bleached by the sun; and the sea leaves its marks - a pale band of barnacles above a
// dark wet band at the waterline, and the water's own tint below it.
// rock-material.ts puts this inside three.js's Lambert fragment shader in place of <color_fragment>, wrapped in
// braces; three.js lights the diffuseColor it leaves, with the sun's light as netOfLight and shadowFilledIn say
// (shaders/sunlight-under-water.ts). Needs vColor from three.js, and from rock-declarations.glsl uDetail,
// uSeaLevel, vSurfacePosition, vSurfaceNormal, seaTint, netOfLightUnderSea, shadowFilledUnderSea and the ROCK_
// defines.

// The fine size of the detail texture: this much smaller than the coarse one, and shifted, so that the two sizes'
// patterns do not line up.
const float FINE_SCALE = ROCK_SCALE * 3.7;
const float FINE_SHIFT = 0.31;
const vec3 BLEACHED_COLOUR = vec3(0.72, 0.70, 0.66);
const vec3 BARNACLE_COLOUR = vec3(0.80, 0.78, 0.72);
// What wet rock keeps of each colour.
const vec3 WET_ROCK = vec3(0.62, 0.66, 0.58);

vec3 rockPoint = vSurfacePosition;
vec3 rockNormal = normalize(vSurfaceNormal);
// the squares of a unit normal's parts add up to 1: they weigh the three sides' reads
vec3 sideWeights = rockNormal * rockNormal;

// The detail texture from three sides, at two sizes (blue: blotches; alpha: a net of lines; red: grain)
vec4 coarseAlongX = texture2D(uDetail, rockPoint.zy * ROCK_SCALE);
vec4 coarseAlongY = texture2D(uDetail, rockPoint.xz * ROCK_SCALE);
vec4 coarseAlongZ = texture2D(uDetail, rockPoint.xy * ROCK_SCALE);
vec4 coarse = coarseAlongX * sideWeights.x + coarseAlongY * sideWeights.y + coarseAlongZ * sideWeights.z;

vec4 fineAlongX = texture2D(uDetail, rockPoint.zy * FINE_SCALE + FINE_SHIFT);
vec4 fineAlongY = texture2D(uDetail, rockPoint.xz * FINE_SCALE + FINE_SHIFT);
vec4 fineAlongZ = texture2D(uDetail, rockPoint.xy * FINE_SCALE + FINE_SHIFT);
vec4 fine = fineAlongX * sideWeights.x + fineAlongY * sideWeights.y + fineAlongZ * sideWeights.z;

// Mottling and grain
vec3 rockColour = vColor * (0.66 + 0.68 * coarse.b);
float grain = (fine.r - 0.5) * ROCK_BUMP;
float fineMottling = (fine.b - 0.5) * 0.30;
rockColour *= 1.0 + grain + fineMottling;

// Cracks: only the strongest lines of the texture's net, and only in patches - a whole net reads as dried mud
float strongestLines = smoothstep(0.86, 0.98, coarse.a);
float crackPatches = smoothstep(0.42, 0.62, coarse.b);
rockColour *= 1.0 - ROCK_CRACK * strongestLines * crackPatches;

// Pits: small dark hollows
float pitHollows = smoothstep(0.34, 0.16, fine.b);
rockColour *= 1.0 - ROCK_PIT * pitHollows * (0.4 + 0.6 * coarse.b);

// Bleached by the sun: tops, clear of the sea, in patches
float heightAboveSea = rockPoint.y - uSeaLevel;
vec3 bleached = BLEACHED_COLOUR * (0.75 + 0.5 * fine.b);
float onTop = smoothstep(0.2, 0.85, rockNormal.y);
float clearOfTheSea = smoothstep(0.25, 1.1, heightAboveSea);
float bleachPatches = smoothstep(0.3, 0.75, coarse.b);
rockColour = mix(rockColour, bleached, ROCK_BLEACH * onTop * clearOfTheSea * bleachPatches);

// Barnacles and oysters: pale crusty specks in clusters (the fine blotches, where the coarse ones allow), in a band
// that fades out 0.35 m below the still surface and 0.8 m above it
float barnacleBand = smoothstep(0.80, 0.45, heightAboveSea) * smoothstep(-0.35, 0.1, heightAboveSea);
float barnacles = barnacleBand * smoothstep(0.58, 0.72, fine.b) * smoothstep(0.35, 0.6, coarse.b) * ROCK_BARNACLE;
rockColour = mix(rockColour, BARNACLE_COLOUR, barnacles);

// Wet rock is dark at the waterline; well under water it is not seen as wet, only through the water
float wetness = smoothstep(0.30, 0.02, heightAboveSea) * (0.4 + 0.6 * smoothstep(-0.9, -0.2, heightAboveSea));
rockColour = mix(rockColour, rockColour * WET_ROCK, wetness);

// The water's own tint below that, in full for rock
diffuseColor.rgb = seaTint(rockColour, rockPoint, 1.0);
netOfLight = netOfLightUnderSea(rockPoint, clamp(rockNormal.y, 0.0, 1.0));
shadowFilledIn = shadowFilledUnderSea(rockPoint);
