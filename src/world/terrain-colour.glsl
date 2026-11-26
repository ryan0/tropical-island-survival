// The colour of the ground: dry and wet sand, the stones, litter and low plants that lie on it inland, footpaths,
// rock, the reef flat, what the water over it does to its colour, and the net of light that ripples throw on the
// sea floor.
//
// terrain.ts puts this block, in braces, inside three.js's Lambert fragment shader just after <color_fragment>. It
// replaces diffuseColor.rgb outright, so three.js's lighting and shadows still apply to it; and it sets netOfLight
// and shadowFilledIn, which say what the water does to the sun's light (shaders/sunlight-under-water.ts).
// Needs from three.js: diffuseColor, and the ground's grit picture: the material's map, vUv, and texelColor (the map
//   already read at vUv). Only the map's green is grit: its red and blue are the slopes of the sea floor's sand
//   ripples (ground-grit.ts).
// Needs from terrain-declarations.glsl: the uniforms and the varying vGroundPosition; groundNoise, groundFbm and
//   randomsOf; coverOf, litAgainstSun and dimples; and from the chunks it includes: footpathDistance (footpaths.glsl);
//   openSea and the reef's zones (island-shape/shore.glsl); lagHi, lagEx, lagExposure, lagWave, lagFoam and LW_T
//   (lagwave.glsl); the net of light's readings and lightOfNet (light-net.glsl). The shore's shape, the
//   reef's cover, the turf's broad patterns, what stands over the ground and what lies on it, it reads from
//   pictures (uShoreRound, uReefCover, uTurfPatterns, uTreeCover, uGravelTile, uLitterTile, uLowPlantsTile).
// Needs the defines TERRAIN_HOME and REEF_MAP_SPAN (the middle, and the side, of the square round home that the
//   reef's map covers), CLOUD_SHADE_SPAN_M, CAUSTICS_BRIGHTEST (caustics-texture.ts), and for each ground tile
//   its span in metres and the share of it its things cover (GRAVEL_TILE_SPAN, GRAVEL_FULL_COVER and so on),
//   the gravel's average colour (GRAVEL_AVERAGE_COLOUR), and the sea bed picture's span and the averages of
//   its four channels (SEA_BED_SPAN, SEA_BED_AVERAGES), written by terrain.ts.

// ---- Numbers to retune ----
// (heights are metres above still sea level, depths metres of water, distances metres from the camera)

// Beyond this depth the sea floor is plain sand: it is only ever seen dimly, through the water or when diving.
const float PLAIN_FLOOR_DEPTH = 8.6;
const vec3 PLAIN_FLOOR_SAND = vec3(0.77, 0.72, 0.61);

// Each close-up detail fades with distance; beyond where it has faded to nothing it is not worked out at all.
const float DIMPLES_WITHIN = 120.0;
const float WIND_RIPPLES_WITHIN = 90.0;
const float SHELLS_WITHIN = 45.0;

// The highest a lagoon wave can run up the sand, as a height.
const float LAGOON_RUN_UP = 0.42;
// The band of heights that the water's edge wets: from this far under the still sea (and as much lower again as
// the lagoon's waves stand high) to this far above it. Below it nothing that the wet sand, the swash's lines and
// the lagoon's film and foam add is anything but exactly nothing, and above it likewise: change these only with
// the numbers in "Wet sand towards the water", which they bound.
const float WETTED_FROM = -0.4;
const float WETTED_TO = 1.0;
// Loose dry sand, with its dimples and wind ripples, lies no higher than this.
const float LOOSE_SAND_TO = 2.1;

// The share of the light left where the clouds let no sunlight through.
const float CLOUD_SHADOW_LIGHT = 0.45;

// How much of the net of light that ripples throw on the sea floor (light-net.glsl) there is out on the ocean's
// reef, against the middle of the lagoon.
const float NET_ON_OUTER_REEF = 0.45;
// How far a shadow on ground as bright as white is filled in by the light the ground round it throws back (sand
// is about 0.85 as bright, and turf 0.4).
const float GROUND_FILLS_SHADOWS = 0.5;

// The colours of the ground.
// (The sand is kept well under 1: in full sun the lighting multiplies it by about 1.3, and sand that clips to pure
// white shows no relief.)
const vec3 WARM_SAND = vec3(0.722, 0.715, 0.703);
const vec3 GREY_SAND = vec3(0.706, 0.71, 0.712);
// Inland the sand is a shade greyer than the beach's, for the dust of old leaves (the sand's colour is multiplied
// by this); and in deep shade, where what falls rots where it lies, it and the litter are darker and browner.
const vec3 GROVE_SAND = vec3(0.85, 0.845, 0.83);
const vec3 DEEP_SHADE_STAIN = vec3(0.80, 0.76, 0.70);
// Soil. Where litter has lain and rotted longest the sand has turned to a dark crumb of humus (measured on the
// humus-stained sand at Fakarava: a fifth to two fifths as light as the clean sand beside it, and nearly grey).
// It gathers by how much of a crown is overhead, how deep the shade is and how lush the ground (the three shares),
// and comes in between two values of their sum with the land's patchiness, so that it lies in patches a few
// steps across and most of the islet has none.
const vec3 SOIL = vec3(0.27, 0.24, 0.20);
// (a stone that lies in it is stained by it: its colour is multiplied by this)
const vec3 STONE_IN_SOIL = vec3(0.72, 0.69, 0.64);
const vec3 SOIL_GATHERS = vec3(0.3, 0.4, 0.3);
const vec2 SOIL_BETWEEN = vec2(0.45, 0.8);
// Litter that has lain in the open bleaches to straw and silver (its colour is multiplied by this).
const vec3 BLEACHED_LITTER = vec3(1.14, 1.16, 1.18);
// A path is sand trodden smooth and clean, paler than the grove's: the grove's sand is multiplied by this on it.
// (As gravel like the ground round it, a path could not be told from a bank of gravel.)
const vec3 PATH_SAND = vec3(1.1, 1.095, 1.08);
// The pictures' own colours are multiplied by these, to bring each to what the photographs measure with the game's
// light on it (docs/LOOK.md, "Colour, measured"): the gravel a grey with next to no colour in it (the sun's
// light warms it), the litter a greyer straw.
const vec3 GRAVEL_TINT = vec3(0.84, 0.845, 0.855);
// (A stone lying by itself on sand is bleached nearly as pale as the sand: it is a bank of them that is grey.
// As dark as the bank's, a scatter of stones on white sand was a leopard's coat.)
const vec3 LONE_STONE_TINT = vec3(1.04, 1.035, 1.03);
const vec3 LITTER_TINT = vec3(0.99, 0.975, 0.94);
const vec3 ROCK_GREY = vec3(0.46, 0.44, 0.39);
// What covers the reef's hard floor, along the ramp its picture is painted in (sea-bed/sea-bed-picture.ts): thick turf
// algae; what lives on it, between two colours from place to place; old rock under a thin fuzz; the pink crust of
// coralline algae; and what is clean and pale, a fresh bite or a dead white piece.
const vec3 THICK_TURF = vec3(0.24, 0.19, 0.115);
const vec3 BROWN_CORAL = vec3(0.41, 0.30, 0.17);
const vec3 OLIVE_CORAL = vec3(0.27, 0.27, 0.15);
const vec3 OLD_REEF_ROCK = vec3(0.49, 0.435, 0.36);
const vec3 PINK_CRUST = vec3(0.71, 0.54, 0.555);
const vec3 CLEAN_AND_PALE = vec3(0.76, 0.73, 0.68);
// The old reef round a coral head begins where the water is this deep, and is all there by the second depth (m).
const vec2 OLD_REEF_BELOW = vec2(0.45, 1.3);

// What lies on the ground (ground-tiles.ts), each as an amount from 0, none, to 1, as thick as its picture was
// painted. The pictures' single things show within the first distance and have blurred to an average by the second.
const vec2 THINGS_SHOW_WITHIN = vec2(9.0, 30.0);
// The land's cover comes in between these heights of the plants' wandering edge (metres above the sea).
const vec2 INLAND_BETWEEN = vec2(1.74, 1.84);
// Stones: a scatter inland; in a bank of gravel; in the band of rubble at the back of the beach. And on a path.
const vec3 STONES = vec3(0.34, 0.97, 0.9);
const float STONES_ON_PATH = 0.22;
// A bank of gravel comes in between these values of the land's broad pattern (-1 to 1): the higher, the less of
// the islet is gravel and the more of it sand.
const vec2 GRAVEL_BANKS = vec2(0.15, 0.6);
// In a whole bed of gravel a stone's rank stands for its height: how strongly that is shaded against the sun.
const float BED_RELIEF = 0.7;
// Litter: along the back of the beach; everywhere inland; more under a crown.
const vec3 LITTER = vec3(0.1, 0.28, 0.72);
// (and more of it where it has made soil)
const float LITTER_ON_SOIL = 0.2;
// The wrack the sea leaves along the tide line: how thickly, at most; and how much darker than the trees' litter
// (its colour is multiplied by this).
const float WRACK = 0.42;
const vec3 WRACK_DARKER = vec3(0.62, 0.58, 0.54);
// Low plants inland: on middling ground; more where it is lush; more at a shrub's foot.
const vec3 LOW_PLANTS = vec3(-0.05, 1.1, 0.5);
// How high stones and litter stand off the ground, in centimetres, for the shadows they throw; and the lowest
// sun those are worked out for (the upward part of the unit vector towards it): lower, they would be endless.
const float STONES_STAND = 2.5;
const float LITTER_STANDS = 1.2;
const float LOWEST_SUN_FOR_SHADOWS = 0.3;

// The sea floor.
// A reef's edge, in the lagoon's broad pattern: rock comes in between these two values of it; and its skirt, where
// rubble lies and nothing burrows, reaches this much of the pattern further out.
const vec2 REEF_EDGE = vec2(0.5, 0.66);
const float REEFS_SKIRT = 0.16;
// Even solid reef keeps sand in its deepest holes: the most of a floor that is rock. And the most that is rock
// where the pavement shows through the sand of the ocean reef's shallows.
const float MOST_OF_A_REEF_IS_ROCK = 0.94;
const float PAVEMENT_SHOWS = 0.42;
// Sand lies on ground more nearly level than the second number, and none on ground less level than the first (the
// upward part of the ground's normal, from the reef's cover picture: 0.87 is a slope of 30 degrees, 0.71 of
// 45): anywhere, and on the ocean reef's seaward slope, which is reef rock unless it is a terrace.
const vec2 SAND_LIES_ON_SLOPES = vec2(0.74, 0.9);
const vec2 SAND_LIES_ON_FORE_REEF = vec2(0.93, 0.985);
// A patch reef in the lagoon begins between these depths (m) off the beach of an islet that stands on it.
const vec2 CLEAR_OF_ISLETS_BEACH = vec2(0.9, 2.2);
// (and how far that wanders, in metres of depth, from one stretch of the islet's shore to the next)
const float ISLETS_REEF_WANDERS = 3.6;
// The rock: its picture's light and dark is multiplied in as the first plus the second times it; how strongly its
// slopes are lit and shaded against the sun; how far along the ramp of its cover the crest's rock is moved (it is
// paler and pinker), and how far one stretch of reef differs from the next; and how dark the sand lies at its foot.
// (SAND_SHADED_AT_ROCK is below the three KIND numbers.)
const vec2 ROCK_SHADE = vec2(0.45, 1.1);
// Its grain close to: the same picture read this many times finer, and how strongly that shows.
const float GRAIN_FINER = 5.3;
const float ROCK_GRAIN = 0.9;
const float ROCK_RELIEF = 2.2;
const float KIND_ON_CREST = 0.2;
const float KIND_VARIES = 0.3;
// (and how far back along it the lagoon's rock is moved: in still water little of the pink crust grows, and the
// rock lies under turf and silt)
const float KIND_IN_LAGOON = 0.12;
// (and how far it wanders along the ramp over a few metres)
const float KIND_WANDERS = 0.7;
const float SAND_SHADED_AT_ROCK = 0.22;
// (From far off a reef is this much rock and the rest the sand in its holes and gutters, which the eye no longer
// picks out: it lightens the whole.)
const float ROCK_FROM_AFAR = 0.8;
// (and its edge from afar is cut between these two values of the share of rock, with the noise added)
const vec2 REEFS_EDGE_FROM_AFAR = vec2(0.36, 0.6);
// How far the level the sand lies at in the rock wanders over a few metres, as a share of the floor.
const float LEVEL_WANDERS = 1.1;
// The sea bed's picture is read again this far towards the sun (m), for its slopes; and its own marks show
// within the first distance of the eye and have faded to its averages by the second (m).
const float SLOPE_READ_OVER = 0.03;
const vec2 SEA_BED_SHOWS_WITHIN = vec2(14.0, 46.0);
// Rubble: the stones' picture is laid at this scale below this depth (m). How thickly it lies in a bank behind
// the crest. And what colour it is multiplied by where it lies thick: it is grey-brown there under a fuzz of
// algae, where a lone piece is bleached.
const float RUBBLE_SCALE = 0.7;
const float RUBBLE_BELOW = 0.12;
const float RUBBLE_BANKS = 1.0;
// (the apron of rubble at a rock's foot: this share of the floor at most, next under the level the sand lies at)
const float RUBBLE_APRON = 0.14;
// (and how strongly the rock's grain marks each piece)
const float RUBBLE_GRAIN = 0.8;
// (a piece throws less of a shadow under water, where the light comes from all round: this much of the land's)
const float RUBBLE_SHADOWS = 0.8;
const vec3 OVERGROWN_RUBBLE = vec3(1.06, 1.03, 0.95);
// Lived-in sand: its humps and pits come in between these depths (m); how strongly their slopes are lit and
// shaded; and how far the sand's lightness wanders from stretch to stretch.
const vec2 LIVED_IN_BELOW = vec2(1.1, 2.4);
const float SAND_RELIEF = 3.0;
const float SAND_VARIES = 0.1;
// The film of algae on sand that is left alone: it comes in between these values of its broad pattern, and the
// sand's colour is multiplied by this under it.
const vec2 FILM_BETWEEN = vec2(0.46, 0.64);
const vec3 FILM_ON_SAND = vec3(0.86, 0.83, 0.74);
// (even where it grows thickest it is blotches with clean sand between: the most of the sand it covers)
const float MOST_FILM = 0.62;
// (Its blotches: the sea bed's painted patchwork shows as film where it is under the first number plus the
// second times how much film grows, and their edges are as soft as the third. Even at its most it is dark
// blotches on pale sand: with the sand left only as holes in it, it was a soldier's camouflage.)
const vec3 FILM_BLOTCHES = vec3(0.06, 0.22, 0.14);

// The ripples in the sand of a shallow floor: they come in between the first two depths and are gone between
// the last two (metres of water); and how strongly a ripple is shaded by its slope towards the sun.
const vec4 RIPPLES_BETWEEN = vec4(0.25, 0.7, 2.5, 4.5);
// Their picture is laid round the atoll this many times: on the ocean's reef, in the lagoon, and round the islet
// in the lagoon's middle, which is whatever lies within this many metres of the centre (whole numbers, so that
// the picture meets itself: each makes a repeat about as long along the shore as it is across).
const vec3 RIPPLES_GO_ROUND = vec3(600.0, 200.0, 64.0);
const float RIPPLES_ROUND_ISLET_WITHIN = 45.0;
const float RIPPLE_SHADE = 0.45;
// What a lone piece of dead coral's colour is multiplied by on the sea floor.
const vec3 DEAD_CORAL_TINT = vec3(1.16, 1.15, 1.11);

// ---- Where this point is ----

// The point of the ground that this dot shows. On the screen it is the one drawn here. In the picture of what is
// under the sea the ground's corners are drawn raised to where they seem to be, and each dot between them works
// out for itself which point the law of refraction shows along the eye's line through it
// (shaders/shared/seen-through-surface.glsl; intoSeaPicture and vRaisedBy are sea/water-as-fog.ts's). The
// ground's height there is taken to be its height here: the sea floor is gentle where it is seen clearly.
vec3 groundPoint = vGroundPosition;
if (intoSeaPicture.y > 0.5) {
  float raisingLevel = uCameraPosition.y - intoSeaPicture.w;
  float under = raisingLevel - vGroundPosition.y;
  // (by as much of the raising as the corners were given: none out of the sea, less and less in the deep)
  float raised = intoSeaPicture.z * step(0.0, under)
    * (1.0 - smoothstep(NOT_RAISED_BELOW.x, NOT_RAISED_BELOW.y, under));
  vec2 seenAt = seenThroughSurface(uCameraPosition, vGroundPosition + vec3(0.0, vRaisedBy, 0.0), raisingLevel,
    vGroundPosition.y);
  groundPoint.xz = mix(vGroundPosition.xz, seenAt, raised);
  // (and the sun's shadow is looked up at that point, not at the triangle's)
  #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  groundShadowShift = directionalShadowMatrix[ 0 ] * vec4(groundPoint - vGroundPosition, 0.0);
  #endif
}
float height = groundPoint.y;
vec2 xz = groundPoint.xz;
float waterDepth = max(uSeaLevel - height, 0.0);
// (how much the depth changes across a pixel, for the lines of equal depth: worked out here, before any branch)
#ifdef CAN_MEASURE_ACROSS_A_PIXEL
float depthAcrossPixel = max(fwidth(waterDepth), 1e-5);
#endif

// (uCameraPosition, not three.js's cameraPosition: three.js does not fill that in for this kind of material, and for a long time
// every close-up detail below was faded out as if the camera stood in the middle of the lagoon)
vec3 toCamera = uCameraPosition - groundPoint;
float cameraDistance = length(toCamera);
float nearness = exp(-cameraDistance * 0.05);   // how much close-up detail shows: 1 at the camera, gone by 90 m
// (and for the pictures of what lies on the ground: 0 where their single things show, 1 where they have blurred)
float farOff = smoothstep(THINGS_SHOW_WITHIN.x, THINGS_SHOW_WITHIN.y, cameraDistance);

// Which side of the land this is: lagoonSide is 1 on the lagoon's side (still water, no surf), 0 on the ocean's.
// (The shore's shape in this direction is read from its picture, which the water's shader reads too: the ocean
// shoreline's distance from the centre, the reef's share of its full width, the land's width.)
float directionFromCentre = atan(xz.y, xz.x);
vec4 shoreRound = texture2D(uShoreRound, vec2(directionFromCentre / FULL_TURN + 0.5, 0.5));
float shoreRadius = shoreRound.r + SHORE_ROUND_FROM;
float landWidth = shoreRound.b;
float metresOffshore = length(xz) - shoreRadius;   // outside the ocean beach line (negative inland)
float lagoonSide = 1.0 - smoothstep(-0.7, -0.4, metresOffshore / landWidth);

vec2 towardsSun = normalize(uSunDirection.xz + 1e-4);

// ---- The net of light, and the grit ----

// The net of light that ripples throw on the sea floor (light-net.glsl, which the rocks and the coral share). The
// same readings give the lace of the foam on the lagoon's sand. (Read here, before any branch:
// docs/DEVICE_NOTES.md.)
vec2 lightNetUv = lightNetUvAt(xz, uTime);
vec4 smallWaves = texture2D(uDetail, smallWavesUvAt(lightNetUv, uTime));
vec2 lightNetWobble = netWobbleOf(smallWaves);
// Grit: the ground's speckle picture (the material's own map, which three.js has already read into texelColor).
// Everything below replaces the colour outright, so the speckle is put back at the end; it fades out with distance.
// It is read twice: grain close up (a dot is 1.4 cm), and the same picture four times larger for mottling further
// off.
float fineGrit = (texelColor.g - uGritAverage) * exp(-cameraDistance * 0.02);
float coarseGrit = (texture2D(map, vUv * 0.23 + 0.37).g - uGritAverage) * 0.10 * exp(-cameraDistance * 0.006);
float grit = (fineGrit + coarseGrit) * (1.0 - 0.75 * smoothstep(0.0, 0.5, waterDepth));

// What lies on the ground, from its pictures (ground-tiles.ts). They have mipmaps, so they are read here, before
// any branch. Each is laid at an angle of its own, so that the three never repeat together.
vec2 onGround = xz;
// (Under the sea the picture of stones is the reef's rubble, laid finer: broken coral is small lumps and sticks,
// packed close, where a storm beach has cobbles. The two scales meet a little under the waterline, where
// neither shows.)
float asRubble = mix(1.0, RUBBLE_SCALE, step(RUBBLE_BELOW, waterDepth));
vec4 gravelTile = texture2D(uGravelTile, onGround / (GRAVEL_TILE_SPAN * asRubble));
vec4 litterTile = texture2D(uLitterTile,
  vec2(onGround.x * 0.8 - onGround.y * 0.6, onGround.x * 0.6 + onGround.y * 0.8) / LITTER_TILE_SPAN);
vec4 lowPlantsTile = texture2D(uLowPlantsTile,
  vec2(onGround.x * 0.6 + onGround.y * 0.8, onGround.y * 0.6 - onGround.x * 0.8) / LOW_PLANTS_TILE_SPAN + 0.37);
// (The stones and the litter are read once more, a shadow's length towards the sun: a thing that stands a
// finger's breadth off the ground throws a shadow behind it and catches the light on its sunward edge, and
// without that a painted stone is a stain. The shadow is longer the lower the sun.)
vec2 shadowOfACentimetre = 0.01 * uSunDirection.xz / max(uSunDirection.y, LOWEST_SUN_FOR_SHADOWS);
vec2 stonesSunward = onGround + shadowOfACentimetre * STONES_STAND * asRubble;
vec4 gravelTileSunward = texture2D(uGravelTile, stonesSunward / (GRAVEL_TILE_SPAN * asRubble));
// The sea bed's own picture (sea-bed/sea-bed-picture.ts): the reef's hard floor, as its light and dark, what covers
// it and how high it stands, and the humps and pits of sand that is lived in. It is read once more a little
// towards the sun, for the slope of each: what faces the sun is lit and what faces away is shaded.
vec2 onSeaBed = laidTurned(onGround) / SEA_BED_SPAN;
vec4 seaBed = texture2D(uSeaBed, onSeaBed);
vec4 seaBedSunward = texture2D(uSeaBed, onSeaBed + laidTurned(towardsSun) * (SLOPE_READ_OVER / SEA_BED_SPAN));
// (And once much finer, for the rock's grain close to: a dot of the picture is a finger's breadth, and a swimmer's
// hand is nearer the floor than that can bear.)
float rockGrain = texture2D(uSeaBed, onSeaBed * GRAIN_FINER + 0.31).r - SEA_BED_AVERAGES.r;
// (From far off or high above, a picture's own marks show its repeat as a lattice over the whole reef: there
// it fades to its averages, and the floor's broad patterns alone are left.)
float floorBlurs = smoothstep(SEA_BED_SHOWS_WITHIN.x, SEA_BED_SHOWS_WITHIN.y, cameraDistance);
seaBed = mix(seaBed, SEA_BED_AVERAGES, floorBlurs);
seaBedSunward = mix(seaBedSunward, SEA_BED_AVERAGES, floorBlurs);
// (The ripples that small waves leave in the sand of a shallow floor are a picture too, of their slopes: the red
// and the blue of the grit's own picture, read at a scale of their own (sand-ripples.ts). Their ridges lie along
// the shore, since waves turn to run in on it wherever they come from: so the picture is laid round the atoll's
// centre, its ridges circles about it, which every shore here follows nearly enough (the ocean's, the lagoon's,
// and the islet's in the lagoon's middle). It goes a whole number of times round, to meet itself, and at each
// of three distances its own number of times, so that it is little stretched along its ridges; the three change
// over where the lagoon is too deep for ripples, and on land.
// (By the distance from the centre, which is exact. Laid by the distance from the shore, read from the shore's
// picture, ridges a hand's breadth apart took that picture's steps: it holds the shore to a few centimetres, a
// forearm at a time, and the ridges kinked at every step.)
// (The direction from the centre jumps a whole turn along the line due west of it, where the graphics card,
// which blurs a picture by how fast its coordinates change from dot to dot, would blur the ripples to nothing
// along a hairline. So the picture is read a second time by a direction that jumps due east instead, which
// finds the same dots of it, and each reading is used away from its own jump.)
float fromCentre = length(xz);
float roundTheIslet = lagoonSide * (1.0 - step(RIPPLES_ROUND_ISLET_WITHIN, fromCentre));
float ripplesGoRound = mix(mix(RIPPLES_GO_ROUND.x, RIPPLES_GO_ROUND.y, lagoonSide), RIPPLES_GO_ROUND.z, roundTheIslet);
float ripplesOut = fromCentre / SAND_RIPPLES_SPAN;
vec2 ripplesReadWest = texture2D(map,
  vec2((atan(-xz.y, -xz.x) / FULL_TURN + 0.5) * ripplesGoRound, ripplesOut)).rb;
vec2 sandRipples = mix(
  texture2D(map, vec2(directionFromCentre / FULL_TURN * ripplesGoRound, ripplesOut)).rb,
  ripplesReadWest,
  smoothstep(0.7, 0.9, abs(directionFromCentre) / HALF_TURN)) - 0.5;
vec2 litterSunward = onGround + shadowOfACentimetre * LITTER_STANDS;
vec4 litterTileSunward = texture2D(uLitterTile,
  vec2(litterSunward.x * 0.8 - litterSunward.y * 0.6, litterSunward.x * 0.6 + litterSunward.y * 0.8) / LITTER_TILE_SPAN);

// the net itself, read twice - the second time turned and finer - so that no repeat shows
vec4 lightNetRead = texture2D(uCaustics, lightNetUv + lightNetWobble);
vec4 turnedLightNetRead = texture2D(uCaustics, turnedNetUvAt(lightNetUv, lightNetWobble));
float lightNet = lightNetRead.a;
float turnedLightNet = turnedLightNetRead.a;

if (waterDepth > PLAIN_FLOOR_DEPTH) {
  diffuseColor.rgb = PLAIN_FLOOR_SAND;
} else {
  // ---- Dry sand ----

  float broadPatches = groundFbm(xz * 0.11);
  vec2 sunAlongGround = towardsSun * (1.0 - 0.45 * uSunDirection.y);
  // What the water's edge does to the sand - wet sand, the swash's lines, the lagoon's film and foam - reaches
  // from WETTED_FROM (lower where the lagoon's waves are up) to WETTED_TO and no further: outside that band every
  // part of it comes to exactly nothing, and none of it is worked out. (Most of the ground is outside it: the sea
  // floor and the land.)
  bool isByWatersEdge = height > WETTED_FROM - lagHi() && height < WETTED_TO;
  // The beach is in zones by height above the sea, each boundary wandering so that none is a contour line.
  // (The zones lie between the wetted band's foot and the top of the loose sand: nowhere else is the wander used.)
  float zoneWander = height > WETTED_FROM - lagHi() && height < LOOSE_SAND_TO ? groundNoise(xz * 0.23 + 7.0) - 0.5 : 0.0;
  float looseSand = smoothstep(0.30, 0.62, height + zoneWander * 0.2) * (1.0 - smoothstep(1.75, LOOSE_SAND_TO, height));
  // coral sand: near white, a touch warm; paler and greyer in broad patches. Most of the beach is clean.
  float broadShade = 0.94 + 0.12 * broadPatches;
  float fineShade = 0.97 + 0.06 * groundFbm(xz * 1.9);
  vec3 sand = mix(WARM_SAND, GREY_SAND, smoothstep(0.35, 0.7, broadPatches)) * broadShade * fineShade;

  // Loose dry sand is never flat. Close up it is dimpled - footprints and hollows, in two overlapping layers (a
  // third, of small ones, and half as much shading again made the beach look pocked: taken out 19 November 2026);
  // further off it rolls in low hummocks (the detail texture's small-wave field read large). Both are shaded against
  // the sun: lit on one side, darker and a little bluer on the other. Some stretches are trodden, some nearly smooth.
  vec2 hummockSlope = texture2D(uDetail, xz * 0.06).rg;
  float relief = 0.0;
  if (looseSand > 0.001) {   // (the dry beach only: skipped for the sea floor and the land)
    float trodden = 0.35 + 0.65 * smoothstep(0.3, 0.6, groundNoise(xz * 0.09 + 50.0));
    float dimpled = 0.0;
    float windRipples = 0.0;
    if (cameraDistance < DIMPLES_WITHIN) {
      vec2 turnedOnce = vec2(xz.x * 0.6 - xz.y * 0.8, xz.x * 0.8 + xz.y * 0.6);
      float largeDimples = dimples(xz * 1.5, sunAlongGround);
      float middleDimples = dimples(turnedOnce * 2.3 + 5.0, sunAlongGround);
      dimpled = (largeDimples + middleDimples) * trodden * exp(-cameraDistance * 0.03);
    }
    // where nobody has walked, the wind leaves fine ripples across the sand
    if (cameraDistance < WIND_RIPPLES_WITHIN) {
      float crests = cos(dot(xz, vec2(0.8, 0.6)) * 13.0 + 4.0 * groundNoise(xz * 0.5));
      windRipples = crests * dot(sunAlongGround, vec2(0.8, 0.6)) * 0.07 * (1.0 - trodden) * nearness;
    }
    float hummocks = dot(hummockSlope - 0.5, sunAlongGround) * 0.10 * exp(-cameraDistance * 0.010);
    relief = (dimpled + windRipples + hummocks) * looseSand;
  }
  sand *= 1.0 + relief;
  // (the shaded side of a hollow is a touch cooler, and no more: clean sand in photographs is all of one colour,
  // and with a blue shade ours was blotched)
  sand = mix(sand, sand * vec3(0.95, 0.975, 1.01), clamp(-relief * 4.0, 0.0, 1.0));

  // ---- Wet sand towards the water ----

  if (isByWatersEdge) {
    // soaked: where the swash runs, the sand is dark, tan and packed flat. damp: above it a band that is still drying,
    // in patches. Both fade out just below the waterline (under water, the sea's own colour takes over).
    // (Wet sand is dark in the air; seen through water the same sand is bright again. Only the strip the small waves
    // actually reach, up to about 45 cm above the sea, is wet, and only a shade darker.)
    float aboveWaterline = smoothstep(-0.3, 0.0, height);
    float dampPatches = groundNoise(xz * 1.3) - 0.5;
    float soaked = (1.0 - smoothstep(0.03, 0.30, height + zoneWander * 0.14)) * aboveWaterline;
    float damp = (1.0 - smoothstep(0.22, 0.60, height + zoneWander * 0.28 + dampPatches * 0.16)) * aboveWaterline;

    // The lagoon's edge has no swash: only a film of water that laps a hand's breadth up the sand and slides back.
    // So there the wet sand is a narrow strip (and paler), and lapHeight is how high the film reaches at this moment.
    float slowLap = 0.028 * sin(uTime * 1.25 + 6.0 * groundNoise(xz * 0.13));
    float quickLap = 0.012 * sin(uTime * 2.7 + xz.x * 0.9 + xz.y * 0.7);
    float lapUnevenness = 0.02 * (groundNoise(xz * 0.9) - 0.5);
    float lapHeight = 0.035 + slowLap + quickLap + lapUnevenness;

    // From a medium wind up, small waves break on the lagoon's beaches (lagwave.glsl; water.frag.glsl draws them on
    // the water) - in a high wind bigger ones. Each runs up the sand as a sheet with a foaming edge, a hand or two
    // high, and slides back before the next: then lapHeight is that sheet's edge, and the sand is wet as high as the
    // biggest of them reach.
    float shoreWaves = lagoonSide > 0.01 ? lagExposure(xz) : 0.0;
    float sheetRunningUp = 0.0;   // the sheet is still running up (its edge foams)
    float waveFoam = 0.0;   // how much foam the wave that last came in has left
    float waveLight = 0.0;   // the light the waves throw on the sand under them
    if (shoreWaves > 0.003 && height > WETTED_FROM - lagHi() && height < 0.5) {
      vec3 wave = lagWave(xz, -height, uTime);
      float sinceCrest = wave.x;
      float waveSize = wave.y;
      float nextWaveSize = wave.z;
      float wavePhase = sinceCrest / LW_T;   // 0 as a crest comes in, 1 as the next one does
      float crestJustIn = waveSize * (1.0 - smoothstep(0.0, 0.12, wavePhase));

      // (in a high wind the waves stand up, and the sun through them falls on the sand as moving bands: bright under
      // a crest, where the water gathers the light like a lens, dim under its face)
      float nextCrest = smoothstep(0.93, 1.0, wavePhase) * 0.9;
      float nextFace = smoothstep(0.72, 0.9, wavePhase) * (1.0 - smoothstep(0.9, 0.95, wavePhase)) * 0.55;
      float bands = crestJustIn * 0.9 + nextWaveSize * (nextCrest - nextFace);
      float shallowEnough = 1.0 - smoothstep(0.5, 1.4, -height);
      float deepEnough = smoothstep(0.03, 0.2, -height);
      waveLight = lagHi() * lagEx(xz) * shallowEnough * deepEnough * bands;

      // (how far a wave runs up differs along the beach - higher here, lower a few steps on - and its edge is never
      // straight; in a high wind the big ones reach a foot up: a step and a half of sand)
      float strength = min(shoreWaves, 1.0);
      float alongBeach = 0.55 + 0.9 * groundNoise(xz * 0.7 + 3.0);
      float runUp = LAGOON_RUN_UP * (1.0 - exp(-0.2 * waveSize * alongBeach * shoreWaves / LAGOON_RUN_UP));
      float sheetTop = runUp * smoothstep(0.0, 0.3, wavePhase);   // as far as the sheet has got
      float sheetEdge = sheetTop * (1.0 - smoothstep(0.3, 0.95, wavePhase));
      float edgeWobble = 0.02 * (groundNoise(xz * 3.1) - 0.5);
      float edgeDrop = 0.03 * (nextWaveSize * smoothstep(0.7, 1.0, wavePhase) + crestJustIn);
      lapHeight = lapHeight * (1.0 - 0.6 * strength) + sheetEdge + strength * (edgeWobble - edgeDrop);

      // (the foam comes up the sand with the sheet's edge: none above where that has got to)
      float reach = 1.0 - smoothstep(-0.004, 0.006, height - 0.01 - sheetTop);
      float breakerSize = waveSize * shoreWaves;
      float bigEnough = smoothstep(0.06, 0.28, breakerSize);
      sheetRunningUp = bigEnough * smoothstep(0.0, 0.08, wavePhase) * (1.0 - smoothstep(0.25, 0.6, wavePhase));
      waveFoam = lagFoam(sinceCrest, breakerSize) * reach;
    }
    float lagoonSoakedHeight = height + zoneWander * 0.03;
    float lagoonSoaked = 1.0 - smoothstep(0.07 + 0.10 * shoreWaves, 0.14 + 0.13 * shoreWaves, lagoonSoakedHeight);
    soaked = mix(soaked, lagoonSoaked * aboveWaterline, lagoonSide);
    float lagoonDampHeight = height + zoneWander * 0.10 + dampPatches * 0.08;
    float lagoonDamp = 1.0 - smoothstep(0.10 + 0.12 * shoreWaves, 0.28 + 0.14 * shoreWaves, lagoonDampHeight);
    damp = mix(damp, lagoonDamp * aboveWaterline, lagoonSide);

    float dampShows = damp * (0.6 + 0.4 * smoothstep(0.3, 0.7, groundNoise(xz * 0.4 + 21.0)));
    vec3 dampTint = mix(vec3(1.0), vec3(0.955, 0.94, 0.91), dampShows);
    vec3 soakedColour = mix(vec3(0.92, 0.895, 0.85), vec3(0.945, 0.925, 0.89), lagoonSide);
    vec3 soakedTint = mix(vec3(1.0), soakedColour, soaked);
    sand *= dampTint * soakedTint;

    // The lines each retreating wave leaves behind: thin scalloped arcs, a darker wet edge with a paler rim of dried
    // foam and fine shell above it, closer together and fainter up the beach.
    // (faint, unevenly spaced, and each one peters out along the beach: they must not read as contour lines)
    float swashHeight = height + 0.16 * groundNoise(xz * 0.33 + 3.0) + 0.03 * groundNoise(xz * 1.7);
    float betweenLines = fract(swashHeight * 5.0 + 0.35 * sin(swashHeight * 17.0));
    float lineShows = smoothstep(0.35, 0.65, groundNoise(vec2(xz.x * 0.5 + floor(swashHeight * 5.0) * 7.3, xz.y * 0.5)));
    float paleRim = smoothstep(0.0, 0.12, betweenLines) * (1.0 - smoothstep(0.12, 0.35, betweenLines)) * 0.035;
    float wetEdge = (1.0 - smoothstep(0.0, 0.06, betweenLines)) * 0.045;
    float swashLines = (paleRim - wetEdge) * lineShows * damp * (1.0 - 0.6 * soaked) * aboveWaterline
      * (1.0 - lagoonSide);
    sand *= 1.0 + swashLines;

    // soaked sand is glossy: at a low angle it mirrors the sky a little
    float grazing = 1.0 - clamp(normalize(toCamera).y, 0.0, 1.0);
    sand = mix(sand, uSkyHorizon * 0.80, soaked * smoothstep(-0.02, 0.06, height) * grazing * grazing * grazing * 0.38);

    if (lagoonSide > 0.01) {
      // Under the film the sand shows clear but a touch cooler, and glassier; at the film's leading edge a thin broken
      // thread of white (broken along the shore and in time, so that it never reads as a drawn line).
      // (the film is painted from the lapping edge down to where the water proper starts to show, 20-30 cm under the
      // still level: without that the first metre of water looks like dry sand)
      float belowLap = 1.0 - smoothstep(lapHeight - 0.004, lapHeight + 0.004, height);
      float film = belowLap * smoothstep(-0.32, -0.2, height) * lagoonSide;
      sand = mix(sand, sand * vec3(0.90, 0.94, 0.95), film * 0.8);
      sand = mix(sand, uSkyHorizon * 0.85, film * grazing * grazing * 0.36);
      float lace = max(lightNet, turnedLightNet);
      float rimWidth = mix(0.009, 0.02, sheetRunningUp);
      float onRim = exp(-pow((height - lapHeight) / rimWidth, 2.0));
      float brokenThread = smoothstep(0.42, 0.66, groundNoise(vec2(xz.x + xz.y, xz.x - xz.y) * 1.7 + uTime * 0.15));
      float foamingEdge = 0.45 + 0.55 * smoothstep(0.2, 0.6, lace);
      float rim = onRim * mix(brokenThread, foamingEdge, sheetRunningUp) * lagoonSide;
      sand = mix(sand, vec3(0.96, 0.97, 0.97), rim * mix(0.26, 0.9, sheetRunningUp) * (0.35 + 0.65 * uDaylight));
      // (the foam of a broken wave: on the sheet running up the sand, and in the last hand's depth of water, which is
      // drawn here and not by water.frag.glsl: only this shader knows just where the ground meets the water. White
      // where fresh, then lace.)
      if (waveFoam > 0.01) {
        float lacePattern = lace * 0.7 + 0.3 * groundNoise(xz * 2.3 + uTime * 0.2);
        float foamDepth = 1.0 - smoothstep(0.10, 0.2, -height);
        float foam = smoothstep(0.9 - waveFoam, 1.1 - waveFoam, lacePattern) * film * foamDepth;
        sand = mix(sand, vec3(0.90, 0.95, 0.95), film * waveFoam * 0.3);   // (the sheet itself is milky with bubbles)
        sand = mix(sand, vec3(0.97, 0.98, 0.98), foam * 0.9 * (0.35 + 0.65 * uDaylight));
      }
    }
    sand *= 1.0 + 0.3 * waveLight * uDaylight;   // (the light the lagoon's shore waves throw on the sand under them)
  }

  // ---- Shells, coral chips and pebbles ----

  // One may sit in each 30 cm square, and nearly all squares are empty - except along the line where the last high
  // tide left its drift. Each is a small round chip, pale, pink, tan or grey, with a sliver of shadow on the side
  // away from the sun.
  if (height > 0.2 && height < 2.2 && cameraDistance < SHELLS_WITHIN) {
    vec2 grid = xz * 3.3;
    vec2 square = floor(grid);
    // (its middle, across and down; whether there is one; its kind; then how oval, and two for its colour)
    vec4 placed = randomsOf(square, 8.0);
    vec4 shaped = randomsOf(square, 9.0);
    vec2 middle = placed.xy * 0.7 + 0.15;
    // (the lagoon's tide line is low and thin)
    float driftLine = mix(0.85, 0.34, lagoonSide);
    float driftWander = 0.25 * groundNoise(xz * 0.21) * (1.0 - 0.6 * lagoonSide);
    float driftWidth = mix(0.13, 0.07, lagoonSide);
    float onDrift = exp(-pow((height - driftLine - driftWander) / driftWidth, 2.0));
    float shareWithChips = 0.02 + mix(0.42, 0.16, lagoonSide) * onDrift;
    float hasChip = step(1.0 - shareWithChips, placed.z);
    float kind = placed.w;
    float radius = 0.05 + 0.10 * kind * kind;
    vec2 fromMiddle = fract(grid) - middle;
    fromMiddle.x *= 1.0 + 0.6 * shaped.x;
    float chip = smoothstep(radius, radius * 0.55, length(fromMiddle)) * hasChip;
    vec2 fromShadow = fromMiddle + sunAlongGround * radius * 0.8;
    float chipShadow = smoothstep(radius * 1.5, radius * 0.6, length(fromShadow)) * hasChip;
    vec3 paleOrPink = mix(vec3(0.96, 0.94, 0.90), vec3(0.86, 0.62, 0.52), step(0.62, kind));
    vec3 greyOrTan = mix(vec3(0.62, 0.60, 0.58), vec3(0.74, 0.60, 0.42), step(0.5, shaped.y));
    vec3 chipColour = mix(paleOrPink, greyOrTan, step(0.8, shaped.z));
    vec3 shadowed = sand * (1.0 - 0.45 * chipShadow * (1.0 - chip) * nearness);
    vec3 litChip = chipColour * (0.85 + 0.3 * dot(fromMiddle, sunAlongGround) / radius);
    sand = mix(shadowed, litChip, chip * nearness);
    // And along the same line the sea leaves its wrack: bits of weed, twig and husk, dark from the water, thinly
    // and in stretches, never a drawn line. (It is the litter's picture, darkened: ground-tiles.ts.)
    float wrackStretches = smoothstep(0.4, 0.62, groundNoise(xz * 0.17 + 31.0));
    float wrack = WRACK * onDrift * wrackStretches * (1.0 - smoothstep(0.6 * SHELLS_WITHIN, SHELLS_WITHIN, cameraDistance));
    float wrackCover = coverOf(litterTile, wrack, LITTER_FULL_COVER, farOff);
    float wrackTowardsSun = coverOf(litterTileSunward, wrack, LITTER_FULL_COVER, farOff);
    sand = mix(sand, litterTile.rgb * WRACK_DARKER, wrackCover)
      * litAgainstSun(wrackCover - wrackTowardsSun, (1.0 - farOff) * uDaylight);
  }
  diffuseColor.rgb = sand;

  if (height > -0.1) {
    // ---- Dry land, and the beach above the waterline ----

    // The ground of an atoll's islet is coral sand and gravel from shore to shore: there is no lawn, and of soil
    // only patches where the trees' litter has rotted longest. What changes, going in from the beach, is what
    // lies on it: stones thrown up by storms, the litter of the trees, and the low plants that creep over it. Each is a picture of the real thing (ground-tiles.ts),
    // laid as thickly as this spot calls for: by how far inland it is, by the turf's broad patterns (read from
    // their picture: where it is lush, where dried out, the edges' wander), and by what stands over it (the map
    // of the trees: litter under a crown, creepers at a shrub's foot).
    vec4 turfPatterns = texture2D(uTurfPatterns, xz / TURF_PICTURE_SPAN + 0.5);
    float edgeWander = (turfPatterns.a * 2.0 - 1.0) * TURF_WANDER_KEPT;
    float layerHeight = height + edgeWander + (groundFbm(xz * 1.7) - 0.5) * 0.5;
    float plantsEdge = layerHeight + (groundFbm(xz * 0.9 + 3.0) - 0.5) * 1.3 + (groundNoise(xz * 3.3) - 0.5) * 0.30;
    // (0 on the open beach, 1 inland: it comes in over a broad, ragged band, in islands and tongues)
    float inland = smoothstep(INLAND_BETWEEN.x, INLAND_BETWEEN.y, plantsEdge);
    float backOfBeach = smoothstep(1.15, 1.65, layerHeight);

    if (backOfBeach > 0.0) {
      float lushness = turfPatterns.r;
      float dryness = turfPatterns.g;
      float broadWaves = turfPatterns.b * 2.0 - 1.0;
      vec4 treeCover = texture2D(uTreeCover, xz / TREE_COVER_SPAN + 0.5);
      float underCrown = treeCover.r;
      float atShrubsFoot = treeCover.g;
      float deepShade = treeCover.b;
      float patchy = groundFbm(xz * 0.33 + 40.0) - 0.5;

      float fromPath = footpathDistance(xz) + (groundNoise(xz * 0.9) - 0.5) * 0.7 + (groundNoise(xz * 4.0) - 0.5) * 0.25;
      float onPath = smoothstep(1.05, 0.72, fromPath) * inland;
      float offPath = 1.0 - smoothstep(1.9, 0.9, fromPath) * inland;

      // The sand itself, inland: a shade greyer for the dust of old leaves, and darker where the shade is deep
      // and what falls rots where it lies.
      vec3 ground = sand * mix(vec3(1.0), GROVE_SAND, max(inland, 0.6 * backOfBeach));
      ground *= mix(vec3(1.0), DEEP_SHADE_STAIN, deepShade * inland);

      // Soil, in small patches where the litter has rotted longest. Its edge is a crumb's: dark over pale in
      // specks and tongues, by the ground's fine noise, never a line.
      float soilGathers = dot(SOIL_GATHERS, vec3(underCrown, deepShade, lushness))
        + 2.0 * (groundFbm(xz * 0.23 + 57.0) - 0.5) + 0.5 * patchy;
      float soil = smoothstep(SOIL_BETWEEN.x, SOIL_BETWEEN.y, soilGathers) * inland * offPath;
      float crumb = 0.5 * groundNoise(xz * 1.9 + 21.0) + 0.32 * groundNoise(xz * 7.3 + 3.0)
        + 0.18 * groundNoise(xz * 23.0);
      float soilCover = smoothstep(1.0 - soil, 1.12 - soil, crumb) * step(0.004, soil);
      ground = mix(ground, SOIL * (0.82 + 0.36 * groundNoise(xz * 5.1 + 8.0)), soilCover);

      // 1. Stones. A band of rubble at the back of the beach, where storms leave it; inland, banks of gravel
      // with sand between, and a scatter of stones everywhere. A path is trodden sand, with few.
      float rubbleBand = smoothstep(0.95, 1.3, layerHeight) * smoothstep(0.42, 0.6, groundFbm(xz * 0.5 + 13.0))
        * (1.0 - inland);
      float gravelBanks = smoothstep(GRAVEL_BANKS.x, GRAVEL_BANKS.y, broadWaves + patchy * 1.2);
      float stones = max(rubbleBand * STONES.z, inland * mix(STONES.x, STONES.y, gravelBanks));
      stones = mix(stones, STONES_ON_PATH, onPath);
      float stoneCover = coverOf(gravelTile, stones, GRAVEL_FULL_COVER, farOff);
      float stonesTowardsSun = coverOf(gravelTileSunward, stones, GRAVEL_FULL_COVER, farOff);
      // (thickest, it is the whole bed as painted, grit and all; and there a stone's rank stands for its height)
      float wholeBed = smoothstep(0.82, 0.98, stones);
      float stoneRelief = mix(stoneCover - stonesTowardsSun, BED_RELIEF * (gravelTile.a - gravelTileSunward.a),
        wholeBed);
      stoneCover = max(stoneCover, wholeBed);
      vec3 stoneTint = mix(LONE_STONE_TINT, GRAVEL_TINT, smoothstep(0.45, 0.9, stones))
        * mix(vec3(1.0), STONE_IN_SOIL, soilCover);
      ground *= mix(vec3(1.0), PATH_SAND, onPath);
      ground = mix(ground, gravelTile.rgb * stoneTint, stoneCover);
      float sunOnThings = (1.0 - farOff) * uDaylight;
      ground *= litAgainstSun(stoneRelief, sunOnThings);

      // 2. Litter. A thin drift along the back of the beach; inland a little everywhere, and thick under the
      // crowns it falls from. None on a path: feet clear it.
      float litter = backOfBeach * LITTER.x + inland * LITTER.y + underCrown * LITTER.z + patchy * 0.5
        + LITTER_ON_SOIL * soilCover;
      litter = clamp(litter, 0.0, 1.0) * offPath * backOfBeach;
      float litterCover = coverOf(litterTile, litter, LITTER_FULL_COVER, farOff);
      float litterTowardsSun = coverOf(litterTileSunward, litter, LITTER_FULL_COVER, farOff);
      // (it bleaches to straw and grey where the ground is dried out, and is darker in deep shade)
      vec3 litterColour = litterTile.rgb * LITTER_TINT * mix(vec3(1.0), BLEACHED_LITTER, dryness * dryness)
        * mix(vec3(1.0), DEEP_SHADE_STAIN, deepShade);
      ground = mix(ground, litterColour, litterCover) * litAgainstSun(litterCover - litterTowardsSun, sunOnThings);

      // 3. Low plants. Runners reach out over the sand from where the plants begin; inland they make mats where
      // the ground is lush and round the feet of shrubs, and leave the dry stretches and the deep shade bare.
      float runnersOut = smoothstep(1.25, 1.75, plantsEdge) * (1.0 - inland) * (0.25 + 0.5 * lushness);
      float mats = LOW_PLANTS.x + LOW_PLANTS.y * lushness + LOW_PLANTS.z * atShrubsFoot - 0.35 * dryness
        - 0.4 * deepShade + patchy * 0.9;
      float lowPlants = clamp(max(runnersOut, inland * mats), 0.0, 1.0) * offPath;
      float plantCover = coverOf(lowPlantsTile, lowPlants, LOW_PLANTS_FULL_COVER, farOff);
      ground = mix(ground, lowPlantsTile.rgb, plantCover);

      // (bare rock on the highest ground, of which the atoll has little)
      if (height > 9.5) {
        float rock = smoothstep(10.6, 12.6, height + (groundNoise(xz * 0.5) - 0.5) * 2.0);
        ground = mix(ground, ROCK_GREY * (0.7 + 0.6 * groundFbm(xz * 1.5)), rock);
      }
      diffuseColor.rgb = ground;
    }
  }
}

// ---- Cloud shadows and grit ----

// The sun lamp is already dimmed by however much cloud stands between the sun and the camera (lights.ts); this adds
// the difference between here and there, so that a shadow's edge can be seen crossing the ground.
float sunThroughCloudHere = texture2D(uCloudShadeMap, xz / CLOUD_SHADE_SPAN_M + 0.5).r;
float lightHere = mix(CLOUD_SHADOW_LIGHT, 1.0, sunThroughCloudHere);
float lightAtCamera = mix(CLOUD_SHADOW_LIGHT, 1.0, texture2D(uCloudShadeMap, uCameraPosition.xz / CLOUD_SHADE_SPAN_M + 0.5).r);
diffuseColor.rgb *= lightHere / lightAtCamera;
diffuseColor.rgb *= 1.0 + grit * 0.55;

if (waterDepth > 0.0) {
  // ---- The sea floor ----

  // A reef's floor is sand, rubble and rock, and which lies where is what makes a lagoon look like one from above:
  // pale sand, dark patches of reef. In the lagoon the rock stands in patches; on the ocean's reef it covers the
  // high ground - the gardens' mounds, the crest, the fore reef's spurs - and sand lies in the pools, the grooves
  // and the channel. Each is worked out here as an amount (how hard the floor is, how near to reef, how thickly
  // rubble lies, how lived in the sand is), from the floor's shape, the reef's pictures and the ground's broad
  // patterns; then pictures of the real things are laid by those amounts, as they are on land.
  float onTheReef = step(0.0, metresOffshore);
  float coralPattern = groundFbm(xz * 0.17 + 31.0) + 0.30 * (groundFbm(xz * 0.95 + 7.0) - 0.5);
  // (One stretch of floor differs from the next, over tens of metres. This and the other broad patterns below
  // are single readings of the noise: the pictures laid by them bring ragged edges of their own.)
  float stretch = groundNoise(xz * 0.047 + 91.0);

  // (The reef's cover here, from its picture: how much is high ground, how much bare pavement, how much of a
  // ridge the crest is; and how nearly level the ground is, by the island's own formula.)
  vec4 reefCover = texture2D(uReefCover, xz / REEF_COVER_SPAN + 0.5);
  float hard = 0.0;         // 0 where the floor is sand, to 1 where it is all rock
  float nearReef = 0.0;     // 0 far from rock, to 1 at its edge and on it: rubble gathers there, and nothing burrows
  float crusted = 0.0;      // how much of the rock is the pounded crest's: paler, and pink with crust
  float rubbleBanks = 0.0;  // the banks of rubble that storms leave behind the crest
  float onForeReef = 0.0;   // 0 inside the ocean reef's crest, to 1 on its seaward slope
  if (waterDepth > 0.3) {
    float inLagoonDepths = smoothstep(0.6, 1.7, waterDepth) * (1.0 - smoothstep(5.5, 7.9, waterDepth));
    float lagoonReef = smoothstep(REEF_EDGE.x, REEF_EDGE.y, coralPattern) * inLagoonDepths;
    float nearLagoonReef = smoothstep(REEF_EDGE.x - REEFS_SKIRT, REEF_EDGE.x + 0.04, coralPattern) * inLagoonDepths;
    // (and rock covers the tops of the lagoon's patch reefs, which stand up out of its basin: shallow ground well
    // out from the shore, its edge broken up by the pattern)
    float outInLagoon = -(metresOffshore + landWidth);
    float patchReefDepth = waterDepth + 1.2 * (coralPattern - 0.5);
    float farOut = smoothstep(26.0, 40.0, outInLagoon);
    // (Not in the shallows of the islet that stands there: its beach runs down into sand, and the reef begins
    // further out, sooner here and later there and in stretches not at all, so that it is no dark ring round
    // the islet at one depth.)
    float beginsDeeper = min(ISLETS_REEF_WANDERS * (groundNoise(xz * 0.13 + 71.0) - 0.5), 0.3);
    float clearOfBeach = smoothstep(CLEAR_OF_ISLETS_BEACH.x, CLEAR_OF_ISLETS_BEACH.y, waterDepth + beginsDeeper)
      * farOut;
    lagoonReef = max(lagoonReef, (1.0 - smoothstep(1.5, 2.9, patchReefDepth)) * clearOfBeach);
    nearLagoonReef = max(nearLagoonReef, (1.0 - smoothstep(2.4, 4.2, patchReefDepth)) * clearOfBeach);
    // (What follows down to the crest's rock is the ocean reef's alone: in the lagoon it all comes to nothing, and
    // is not worked out.)
    float oceanReef = 0.0;
    float nearOceanReef = 0.0;
    if (onTheReef > 0.5) {
      float beyondBeachShallows = max(metresOffshore - REEF_BEGINS, 0.0);
      float alongTheReef = clamp(metresOffshore, 0.0, REEF_BEGINS) + beyondBeachShallows / shoreRound.g;
      // (the pattern breaks up the edges of the high ground, so that no patch has the outline of its mound)
      float ragged = 0.55 * (coralPattern - 0.5) + 0.3 * (groundNoise(xz * 1.3 + 4.0) - 0.5);
      float highGround = reefCover.r + ragged;
      float onHighGround = smoothstep(0.34, 0.66, highGround);
      float scatteredHeads = 0.7 * smoothstep(0.66, 0.78, coralPattern) * smoothstep(REEF_BEGINS, GARDENS_BEGIN, alongTheReef);
      // (none in the last of the shallows, where the swash runs, and it thins out down the drop-off)
      float inReefDepths = smoothstep(0.3, 0.9, waterDepth) * (1.0 - smoothstep(14.0, 22.0, waterDepth));
      oceanReef = max(onHighGround, scatteredHeads) * inReefDepths;
      nearOceanReef = smoothstep(0.34 - REEFS_SKIRT, 0.4, highGround) * inReefDepths;
      // The crest is pounded by the white water: less grows there than pale rock, crusted pink in places. Where
      // it is a ridge, the pink alga that built it covers most of it; and the flat behind a high ridge is the
      // same rock, bare. (Both show however shallow they lie, where coral would not.)
      float onCrest = smoothstep(CREST_BEGINS - 8.0, CREST_BEGINS + 4.0, alongTheReef)
        * (1.0 - smoothstep(FORE_REEF_BEGINS - 2.0, FORE_REEF_BEGINS + 14.0, alongTheReef));
      float ridgeHere = reefCover.b;
      float bareFlat = reefCover.g * smoothstep(-0.3, 0.05, ragged);
      oceanReef = max(oceanReef, max(onCrest * ridgeHere * onHighGround, bareFlat));
      crusted = max((0.65 + 0.3 * ridgeHere) * onCrest, 0.85 * bareFlat);
      // (The shallows inside the gardens are pavement under a veneer of sand, and in stretches the veneer is
      // worn through: knobs of rock stand out of the sand there, with rubble round them.)
      float wornThrough = groundNoise(xz * 0.071 + 53.0) + 0.5 * (coralPattern - 0.5);
      float inTheShallows = smoothstep(REEF_BEGINS, REEF_BEGINS + 14.0, alongTheReef)
        * (1.0 - smoothstep(GARDENS_BEGIN - 6.0, GARDENS_BEGIN + 10.0, alongTheReef)) * inReefDepths;
      oceanReef = max(oceanReef, PAVEMENT_SHOWS * inTheShallows * smoothstep(0.52, 0.74, wornThrough));
      nearOceanReef = max(nearOceanReef, inTheShallows * smoothstep(0.46, 0.58, wornThrough));
      onForeReef = smoothstep(FORE_REEF_BEGINS - 6.0, FORE_REEF_BEGINS + 14.0, alongTheReef);
      // (and behind the crest storms leave banks of what they break off it)
      rubbleBanks = smoothstep(GARDENS_BEGIN, CREST_BEGINS - 6.0, alongTheReef) * (1.0 - onCrest)
        * smoothstep(0.5, 0.68, groundNoise(xz * 0.11 + 23.0));
    }
    hard = mix(lagoonReef, oceanReef, onTheReef);
    nearReef = mix(nearLagoonReef, nearOceanReef, onTheReef);
  }

  // Round the coral heads (reef-map.ts: its map's green channel) the floor is not sand but old reef, solid at a
  // head's foot and breaking up into the sand further out. (none beyond the edge of the map)
  vec2 reefUv = (xz - TERRAIN_HOME) / REEF_MAP_SPAN + 0.5;
  float apron = texture2D(uReefMap, reefUv).g * step(abs(reefUv.x - 0.5), 0.49) * step(abs(reefUv.y - 0.5), 0.49);
  if (apron > 0.01) {
    float apronEdge = apron + (groundFbm(xz * 0.9 + 5.0) - 0.5) * 0.8;
    // (None in the shallows by a beach, where the swash keeps the sand moving: a head that stands near the shore
    // had its old reef drawn right up to the waterline, where it stopped in a straight line. It comes in with the
    // depth, sooner here and later there, so that its edge is no line of equal depth either.)
    float deepEnough = smoothstep(OLD_REEF_BELOW.x, OLD_REEF_BELOW.y, waterDepth + (apronEdge - 0.5) * 0.6);
    hard = max(hard, smoothstep(0.30, 0.66, apronEdge) * deepEnough);
    nearReef = max(nearReef, smoothstep(0.30 - REEFS_SKIRT, 0.36, apronEdge) * deepEnough);
  }
  // Sand does not lie on a steep slope: the walls of the reef's grooves and pools, the flanks of a patch reef and
  // the face of the drop-off are bare reef, at any depth, with the sand on the ledges and at the foot. Loose sand
  // rests at some 30 degrees; and the fore reef's long slope is reef rock wherever it is not nearly level, as a
  // real one is, with sand only on its terraces and in its grooves. (The pattern moves the limit a little, so
  // that it is no contour of the slope.)
  vec2 sandLiesTo = mix(SAND_LIES_ON_SLOPES, SAND_LIES_ON_FORE_REEF, onForeReef);
  float tooSteepForSand = 1.0 - smoothstep(sandLiesTo.x, sandLiesTo.y, reefCover.a + 0.08 * (coralPattern - 0.5));
  hard = max(hard, tooSteepForSand * smoothstep(0.3, 0.9, waterDepth));
  // (even solid reef keeps sand in its deepest holes)
  hard *= MOST_OF_A_REEF_IS_ROCK;

  // The sand. Close to a shore it is clean and the small waves comb it into ripples, lit on the side towards the
  // sun. Deeper it is lived in: shrimps and worms heap it into humps beside the pits they dig (the sea bed's
  // picture: its blue), more in one stretch and fewer in the next, and the sand they leave alone takes a
  // gold-brown film of algae that their fresh heaps stand out of pale. None of that by a reef, where fish keep
  // a halo of sand bare.
  vec3 sand = diffuseColor.rgb * (1.0 + SAND_VARIES * (groundNoise(xz * 0.21 + 17.0) - 0.5));
  float livedIn = smoothstep(LIVED_IN_BELOW.x, LIVED_IN_BELOW.y, waterDepth)
    * mix(0.3, 1.0, smoothstep(0.3, 0.62, groundNoise(xz * 0.083 + 44.0))) * (1.0 - 0.85 * nearReef);
  // (where less lives, only the tallest humps stand, and no pits)
  float humpsFrom = mix(0.9, 0.0, livedIn);
  float humps = max(seaBed.b, humpsFrom);
  float humpsSunward = max(seaBedSunward.b, humpsFrom);
  sand *= clamp(1.0 + SAND_RELIEF * (humps - humpsSunward) * uDaylight, 0.6, 1.3);
  float freshHeap = smoothstep(0.42, 0.75, humps);

  float filmGrows = smoothstep(FILM_BETWEEN.x, FILM_BETWEEN.y, groundNoise(xz * 0.13 + 63.0) + 0.3 * (stretch - 0.5))
    * smoothstep(0.9, 2.0, waterDepth) * (1.0 - smoothstep(9.0, 14.0, waterDepth)) * (1.0 - nearReef) * MOST_FILM;
  // (it lies in blotches a hand to an arm across, as the tufts and stains on Raiatea's lagoon sand do)
  // (Its blotches are the painted patchwork of the sea bed's picture, which on rock is turf: as noise cut at a
  // level they were an airbrushed stain with a speckle, and where they stopped the ripples a stencil's edge.
  // Far off, where the picture has faded, there is only how much of it there is.)
  float filmsBlotches = 1.0 - smoothstep(FILM_BLOTCHES.x + FILM_BLOTCHES.y * filmGrows,
    FILM_BLOTCHES.x + FILM_BLOTCHES.y * filmGrows + FILM_BLOTCHES.z, seaBed.g);
  float film = mix(filmsBlotches, filmGrows, floorBlurs) * step(0.004, filmGrows) * (1.0 - freshHeap);
  sand *= mix(vec3(1.0), FILM_ON_SAND, film);

  float ripplesHere = smoothstep(RIPPLES_BETWEEN.x, RIPPLES_BETWEEN.y, waterDepth)
    * (1.0 - smoothstep(RIPPLES_BETWEEN.z, RIPPLES_BETWEEN.w, waterDepth)) * (1.0 - 0.4 * film)
    * (1.0 - 0.8 * livedIn);
  // (the picture's slopes are along the shore and out from it: turned here to the world's east and south)
  vec2 outFromCentre = xz / max(fromCentre, 1.0);
  vec2 rippleSlope = sandRipples.x * vec2(-outFromCentre.y, outFromCentre.x) + sandRipples.y * outFromCentre;
  sand *= 1.0 + dot(rippleSlope, -towardsSun) * RIPPLE_SHADE * ripplesHere;

  // Rubble: broken coral, the stones' picture laid finer. Whole banks behind the crest; and at the foot of every
  // rock an apron of it (below, with the rock). None is scattered over open sand: thinned out, the picture shows
  // its largest pieces alone, and a few grey slabs on clean rippled sand is not what the photographs show.
  float rubble = RUBBLE_BANKS * rubbleBanks * smoothstep(0.3, 0.9, waterDepth);
  float rubbleCover = coverOf(gravelTile, rubble, GRAVEL_FULL_COVER, farOff);
  float rubbleTowardsSun = coverOf(gravelTileSunward, rubble, GRAVEL_FULL_COVER, farOff);
  // (thickest, it is the whole bed as painted; and there a piece's rank stands for its height)
  float wholeBed = smoothstep(0.82, 0.98, rubble);
  float rubbleRelief = mix(rubbleCover - rubbleTowardsSun, BED_RELIEF * (gravelTile.a - gravelTileSunward.a), wholeBed);
  rubbleCover = max(rubbleCover, wholeBed);
  // (each piece pitted and stained in its own way: the rock's grain)
  vec3 rubblePieces = mix(gravelTile.rgb, GRAVEL_AVERAGE_COLOUR, floorBlurs) * (1.0 + RUBBLE_GRAIN * rockGrain);
  float sunOnRubble = RUBBLE_SHADOWS * (1.0 - farOff) * uDaylight;
  sand = mix(sand, rubblePieces * mix(DEAD_CORAL_TINT, OVERGROWN_RUBBLE, smoothstep(0.25, 0.8, rubble)), rubbleCover)
    * litAgainstSun(rubbleRelief, sunOnRubble);

  // Rock: the reef's hard floor (the sea bed's picture). The sand floods it to a level: the more of the floor
  // is rock, the lower the sand lies in it, so that the edge of a reef is knobs of rock standing out of sand and
  // then gutters of sand running into rock, as the real edge is, and never a line.
  if (hard > 0.004) {
    // (the ground's noise at a few metres, which further down moves the level the sand lies at)
    float levelWanders = 0.5 * (groundNoise(xz * 0.6 + 9.0) - 0.5) + 0.25 * (groundNoise(xz * 2.1 + 2.0) - 0.5);
    // (and here moves the cover along its ramp, so that one repeat of the picture is darker with turf and the
    // next paler with crust: solid reef seen from above was a lattice of the picture's own dark patches)
    float kind = seaBed.g + KIND_ON_CREST * crusted + KIND_VARIES * (stretch - 0.5) - KIND_IN_LAGOON * lagoonSide
      + KIND_WANDERS * levelWanders;
    vec3 living = mix(BROWN_CORAL, OLIVE_CORAL, groundNoise(xz * 0.45 + 3.0));
    // (its cover's colour, along the ramp the picture is painted in: turf, what lives, old rock, crust, pale)
    float along = clamp(kind, 0.0, 1.0) * 4.0;
    vec3 rock = mix(THICK_TURF, living, min(along, 1.0));
    rock = mix(rock, OLD_REEF_ROCK, clamp(along - 1.0, 0.0, 1.0));
    rock = mix(rock, PINK_CRUST, clamp(along - 2.0, 0.0, 1.0));
    rock = mix(rock, CLEAN_AND_PALE, clamp(along - 3.0, 0.0, 1.0));
    rock *= ROCK_SHADE.x + ROCK_SHADE.y * seaBed.r + ROCK_GRAIN * rockGrain;
    rock *= clamp(1.0 + ROCK_RELIEF * (seaBed.a - seaBedSunward.a) * uDaylight, 0.55, 1.35);
    // (From far off the picture's knobs and gutters are too small to see, and the reef's edge would be the soft
    // outline of its broad pattern: a blot. A real reef's edge seen from the air is lace, with islands of rock
    // off it and bays of sand in it, so there the edge is cut by the ground's noise at a few metres.)
    float rockFromAfar = ROCK_FROM_AFAR
      * smoothstep(REEFS_EDGE_FROM_AFAR.x, REEFS_EDGE_FROM_AFAR.y, hard + levelWanders);
    // (Near to, the same noise moves the level the sand lies at, most where the floor is half rock: so that each
    // repeat of the picture bares different knobs of it. With one level over a stretch of reef, the same knobs
    // stood out of the sand every 4 m, and from a few metres up the reef flat was a lattice of them.)
    float levelHere = clamp(hard + LEVEL_WANDERS * levelWanders * 4.0 * hard * (1.0 - hard), 0.0, 1.0);
    float rockCover = mix(coverOf(seaBed, levelHere, 1.0, 0.0), rockFromAfar, farOff);
    float sandLevel = 1.0 - levelHere;
    // At the rock's foot lies an apron of rubble: the floor a little under the sand's level, by the picture's own
    // heights, so that the apron has the rock's painted outline and ends as crisply. (As an amount that fell away
    // over some metres from a reef it was a grey halo with a soft edge, sprayed on.) In solid reef that is every
    // hole, and rubble fills them. Far off there is only how much of it there is.
    // (The more rock, the wider its apron: round a lone knob in open sand there is next to none. At one width
    // everywhere, a knob the size of a fist lay in a grey slab of rubble a stride across.)
    float apronWide = RUBBLE_APRON * smoothstep(0.0, 0.35, hard);
    float apron = mix(smoothstep(sandLevel - apronWide - 0.015, sandLevel - apronWide, seaBed.a), apronWide, farOff)
      * smoothstep(0.3, 0.9, waterDepth);
    sand = mix(sand, rubblePieces * OVERGROWN_RUBBLE, apron)
      * litAgainstSun(apron * BED_RELIEF * (gravelTile.a - gravelTileSunward.a), sunOnRubble);
    // (the apron lies in shade against the rock)
    sand *= 1.0 - SAND_SHADED_AT_ROCK * smoothstep(sandLevel - 0.05, sandLevel, seaBed.a) * (1.0 - farOff);
    sand = mix(sand, rock, rockCover);
  }
  diffuseColor.rgb = sand;

  // ---- Under water ----

  // The strip the waves run up and drain off (down to 20 cm below the still sea) is bare sand half the time, so the
  // underwater look starts below it: standingDepth is the depth of the water that is always there.
  // (with the sea drained, uDebugMode 5, the ground is drawn as if no water stood over it)
  float standingDepth = max(waterDepth - SEA_TINT_STARTS, 0.0) * step(uDebugMode, 4.5);
  // The light that reaches the floor is dimmer, and has lost its red with depth (light-under-sea.glsl). That is
  // all of the water that the floor draws on itself: what the water between it and an eye does to the look of it
  // is the sea's surface's to draw, for an eye above (water-veil.glsl), and the fog's, for an eye under water.
  diffuseColor.rgb *= lightLeftUnderSea(standingDepth, 1.0, uUnderWater);

  // The net of light that ripples throw on the sea floor (light-net.glsl). Ankle-deep water is too thin to bend the
  // light into a net, so it fades in between 10 and 80 cm; and where the swell breaks, the surface is too broken and
  // foamy to focus anything (the water shader also clouds the floor under foam).
  float fadeIn = smoothstep(0.1, mix(0.8, 0.45, lagoonSide), standingDepth);
  float lagoonShallows = 1.0 + 0.35 * lagoonSide * (1.0 - smoothstep(0.5, 2.5, standingDepth));
  float fadeWithDepth = exp(-waterDepth * 0.28);
  float surfBand = smoothstep(33.0, 40.0, metresOffshore) * (1.0 - smoothstep(50.0, 58.0, metresOffshore));
  float surfZone = surfBand * openSea(directionFromCentre);
  float notInSurf = 1.0 - 0.7 * surfZone;
  // strongest in the middle of the lagoon, gentler towards the outer reef
  float nearCentre = mix(NET_ON_OUTER_REEF, 1.0, exp(-length(groundPoint) * 0.012));
  float netLight = lightOfNet(smallWaves, lightNetRead, turnedLightNetRead, standingDepth,
    exp(-cameraDistance * 0.03))
    * fadeIn * lagoonShallows * netInWind(uWind) * fadeWithDepth * notInSurf * uDaylight * nearCentre;
  // (It is the sun's light: the sun alone is brightened by it, so that it is gone in a shadow, and under a cloud;
  // and a shadow under water is filled in a little: sunlight-under-water.ts.)
  netOfLight = netLight * sunThroughCloudHere;
  shadowFilledIn = shadowFilledAt(standingDepth);
}

// A shadow on the ground is not as dark as the sun's absence alone would make it: the sunlit ground round it
// throws light back into it, pale sand most of all. (In photographs the shade of a palm on coral sand is two thirds
// as light as the sand beside it. With nothing thrown back ours was a third as light, and blue.)
float groundsBrightness = dot(diffuseColor.rgb, vec3(1.0 / 3.0));
shadowFilledIn = max(shadowFilledIn, GROUND_FILLS_SHADOWS * groundsBrightness);

// ---- The sea drained (uDebugMode 5) ----

// Lines of equal depth, a metre apart and every fifth bolder, to read the floor's shape by.
if (uDebugMode > 4.5 && waterDepth > 0.0) {
#ifdef CAN_MEASURE_ACROSS_A_PIXEL
  float pixelsFromLine = abs(fract(waterDepth + 0.5) - 0.5) / depthAcrossPixel;
  float pixelsFromBoldLine = abs(fract(waterDepth * 0.2 + 0.5) - 0.5) * 5.0 / depthAcrossPixel;
  float line = max(0.4 * (1.0 - smoothstep(0.5, 1.3, pixelsFromLine)),
    0.7 * (1.0 - smoothstep(1.0, 2.2, pixelsFromBoldLine)));
  diffuseColor.rgb *= 1.0 - line;
#endif
}
