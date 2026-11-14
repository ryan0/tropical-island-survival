// The cloud field: how much cloud there is at any point of the air (see clouds.ts). Distances in km.
// cloud-field.ts is the program's copy of these sums: change both together.
//
// Needs the defines
//   EARTH_CURVE                 1/(2R) for the small earth the clouds sit on
//   SUNSET_LANE, SUNRISE_LANE   the bearings (x, z) along which cloud is kept thin
// Gives the includer CLOUD_BASE, weatherAt and cloudAt.

// The shape noise: a cube of noise that fills space, stored as slices (see readShapeNoise).
uniform sampler2D uShapeNoise;
// The weather map: red where cumulus grow, green where towers grow, blue how tall they grow, alpha the cirrus.
uniform sampler2D uWeatherMap;
// x, y: where the island is on the weather map (the whole field drifts with the wind). w: a different grain for
// each sky picture (cloud-bake only).
uniform vec4 uFieldPlace;
// The boil. x, y: how far the shapes have slid against the weather map; z: how far they have risen (not used:
// see cloudAt); w: how far the fine lumps have risen.
uniform vec4 uBoil;
// How cloudy it is: 0 clear .. 1 the full field.
uniform float uCloudCover;

// The clouds' flat bases.
const float CLOUD_BASE = 0.8;
// The weather map covers this many km a side, then repeats.
const float WEATHER_MAP_SPAN = 64.0;
// The shape noise repeats every this many km across; a km upward counts as SHAPE_STRETCH of one.
const float SHAPE_REPEAT = 6.0;
const float SHAPE_STRETCH = 0.7;
// The fine lumps that nibble a cloud's edges are this many times smaller than its shapes.
const float LUMPS_FINER = 2.1;
// How sharply a cloud's edge goes from clear air to full cloud.
const float EDGE_SHARPNESS = 2.5;

// How the shape noise is stored: 64 slices laid out 8 x 8 in one picture, each 66 dots square with its border
// copied from the far side.
const float NOISE_SIZE = 64.0;
const float NOISE_SLICES_ACROSS = 8.0;
const float NOISE_TILE = 66.0;
const float NOISE_PICTURE_WIDTH = 528.0;

// Where a point of a slice lies in the noise picture.
vec2 inNoisePicture(float slice, vec2 inSlice) {
  vec2 tile = vec2(mod(slice, NOISE_SLICES_ACROSS), floor(slice / NOISE_SLICES_ACROSS));
  return (tile * NOISE_TILE + inSlice) / NOISE_PICTURE_WIDTH;
}

// The noise that fills space, repeating every 1 each way: x and y lie within a slice, z runs through the slices.
vec4 readShapeNoise(vec3 p) {
  p = fract(p);
  float depth = p.z * NOISE_SIZE;
  float slice = floor(depth);
  float nextSlice = mod(slice + 1.0, NOISE_SIZE);
  // (one dot in, past the border)
  vec2 inSlice = 1.0 + p.xy * NOISE_SIZE;
  vec4 inThisSlice = texture2D(uShapeNoise, inNoisePicture(slice, inSlice));
  vec4 inNextSlice = texture2D(uShapeNoise, inNoisePicture(nextSlice, inSlice));
  return mix(inThisSlice, inNextSlice, depth - slice);
}

// 1 where the spot (x, z) lies along the lane, 0 well to one side of it.
float closenessToLane(vec2 xz, float far, vec2 lane) {
  return smoothstep(0.90, 0.975, dot(xz, lane) / max(far, 0.001));
}

// The weather over the spot under p: x = how much cloud grows there (0..1), y = how high its tops reach.
vec2 weatherAt(vec3 p) {
  // (the whole field drifts with the wind)
  vec4 weatherMap = texture2D(uWeatherMap, (p.xz - uFieldPlace.xy) / WEATHER_MAP_SPAN);
  float far = length(p.xz);

  // The lane the sun sets down: cloud that drifts into it thins away, so the sunset is never walled off.
  // (Two lanes: the one it sets down, and the one it rises up.)
  float nearLane = max(closenessToLane(p.xz, far, SUNSET_LANE), closenessToLane(p.xz, far, SUNRISE_LANE));
  float lane = nearLane * smoothstep(4.0, 9.0, far);

  // As it clears, only the strongest parts of the map still grow cloud, then none.
  float towersFrom = mix(0.95, 0.60, uCloudCover);
  float towersFull = mix(1.06, 0.74, uCloudCover);
  float towers = smoothstep(towersFrom, towersFull, weatherMap.g) * (1.0 - lane);

  // Fair-weather cumulus thin out with distance (or the horizon would be one bank of cloud); the towers do not.
  float cumulusFrom = mix(0.78, 0.36, uCloudCover);
  float cumulusFull = mix(1.0, 0.82, uCloudCover);
  float cumulusOnMap = smoothstep(cumulusFrom, cumulusFull, weatherMap.r);
  float cumulusAtAll = smoothstep(0.0, 0.12, uCloudCover);
  float thinnedWithDistance = 1.0 - 0.8 * smoothstep(20.0, 50.0, far);
  float thinnedInLane = 1.0 - 0.75 * lane;
  float cumulus = cumulusOnMap * cumulusAtAll * 0.52 * thinnedWithDistance * thinnedInLane;

  // (A tower's sides rise steeply: a column, not a tent.)
  float towerShare = smoothstep(0.0, 0.3, towers);
  float cumulusTops = 0.6 + 1.5 * weatherMap.b;
  float towerTops = 3.4 + 3.0 * weatherMap.b;
  float tops = CLOUD_BASE + mix(cumulusTops, towerTops, towerShare);

  return vec2(max(cumulus, towers * 0.95), tops);
}

// How much cloud there is at p (x: 0..1) and how far up its cloud that is (y: 0 at the base, 1 at the top),
// given the weather there. Without the fine lumps that nibble its edges it is enough for working out shadows
// (cloud-field.ts has the same for the program).
vec2 cloudAt(vec3 p, vec2 weather, bool withFineLumps) {
  float cloudiness = weather.x;
  float tops = weather.y;
  // (above the curved sea: the ground curves away as for a small earth, so far clouds sink)
  float heightAboveSea = p.y + dot(p.xz, p.xz) * EARTH_CURVE;
  float upTheCloud = (heightAboveSea - CLOUD_BASE) / (tops - CLOUD_BASE);
  if (upTheCloud <= 0.0 || upTheCloud >= 1.0) return vec2(0.0);

  // A flat base, fullest a fifth of the way up, thinning to the top: only the strongest lumps reach it.
  float flatBase = smoothstep(0.0, 0.07, upTheCloud);
  // (towers stay full further up)
  float thinningFrom = mix(0.2, 0.5, smoothstep(2.5, 4.0, tops));
  float thinnedToTop = 1.0 - 0.9 * smoothstep(thinningFrom, 1.0, upTheCloud);
  float fullness = cloudiness * flatBase * thinnedToTop;

  // The shapes are stretched upward: columns that the flat base cuts across.
  vec2 inField = p.xz - uFieldPlace.xy;
  vec3 shapePoint = vec3(inField + uBoil.xy, heightAboveSea * SHAPE_STRETCH) / SHAPE_REPEAT;
  // Build 78 has `sp.z-=uBoil.z;` here, to make the shapes rise as they boil, but it sits inside the comment at
  // the end of the line before it and so never runs (cloud-field.ts does make them rise). It is left out so that
  // the picture stays build 78's; docs/REFACTOR_PLAN.md lists it to be corrected.
  float shape = readShapeNoise(shapePoint).r;
  float aboveThreshold = (shape - (1.0 - fullness)) / max(fullness, 0.05);
  if (aboveThreshold <= 0.0) return vec2(0.0);

  if (withFineLumps) {
    // Nibble the edges: round lumps left standing higher up (cauliflower), wisps left low down.
    vec3 lumpPoint = vec3(shapePoint.xy, heightAboveSea / SHAPE_REPEAT) * LUMPS_FINER;
    lumpPoint.z -= uBoil.w;
    float bigLumps = readShapeNoise(lumpPoint).g;
    float smallLumps = readShapeNoise(lumpPoint * 3.7).g;
    float lumps = bigLumps * 0.72 + smallLumps * 0.28;
    float wispsToLumps = clamp(upTheCloud * 5.0, 0.0, 1.0);
    float nibble = mix(lumps, 1.0 - lumps, wispsToLumps) * 0.62;
    aboveThreshold = (aboveThreshold - nibble) / (1.0 - nibble);
  }

  return vec2(clamp(aboveThreshold * EDGE_SHARPNESS, 0.0, 1.0), upTheCloud);
}
