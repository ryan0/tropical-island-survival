// The program's copy of the cloud field that cloud-field.glsl defines, without the fine lumps that
// nibble the clouds' edges. It is needed for one number a frame: how much sunlight reaches the
// camera, which dims the sun's lamp and its glare. The two must change together.
// Distances are kilometres.

import { smoothstep } from '../core/maths';
import { cloudsConfig } from './clouds-config';

/** Where the cloud field has got to at one moment. */
export interface CloudMoment {
  /** How cloudy it is: 0 is a clear sky, 1 the full field of cumulus and towers. */
  cloudCover: number;
  /**
   * The field's two clocks, in seconds at the usual breeze: how far it has drifted with the wind,
   * and how far its clouds have boiled (changed shape).
   */
  drift: number;
  boil: number;
}

export interface CloudField {
  /**
   * How much of the sun's light reaches the ground at (x, z): 1 in clear air, 0 behind a thick
   * cloud. `sun` is the unit vector towards the sun.
   */
  sunThrough(
    x: number,
    z: number,
    sun: { x: number; y: number; z: number },
    moment: CloudMoment,
  ): number;
}

interface Lane {
  x: number;
  z: number;
}

const { startsAt, earthCurve, noiseSize, noiseSlicesAcross, weatherMapSize, weatherMapSpan } =
  cloudsConfig;
const tradeWind = cloudsConfig.drift;

// cloud-field.glsl has the same numbers.
/** The clouds' flat bases, km up (the shader's HB). */
const CLOUD_BASE = 0.8;
/** The shape noise repeats every this many km across; a km upward counts as this much of one. */
const SHAPE_REPEAT = 6;
const SHAPE_STRETCH = 0.7;
/** How sharply a cloud's edge goes from clear air to full cloud. */
const EDGE_SHARPNESS = 2.5;

// The shapes slide a little against the weather map and rise slowly, so that the clouds boil: for
// each second of the boil clock. The shaders are given the same (uEvo).
const SHAPE_SLIDE_X = 0.0018;
const SHAPE_SLIDE_Z = -0.0011;
const SHAPE_RISE = 0.0012;

/** How much a km of cloud dims the light, as in cloud-shade.frag.glsl. */
const SHADOW_DENSITY = 2.6;
/** The walk towards the sun climbs to this height or gives up this far out, in this many steps. */
const WALK_TOP = 5;
const WALK_LONGEST = 70;
const WALK_STEPS = 24;

function laneAlong(bearing: number): Lane {
  return { x: Math.sin(bearing), z: Math.cos(bearing) };
}
const SUNSET_LANE = laneAlong(cloudsConfig.sunsetBearing);
const SUNRISE_LANE = laneAlong(cloudsConfig.sunriseBearing);

// Each slice of the noise cube is a tile with a one-dot border copied from its far side, so that
// reading across a slice's edge is seamless. The tiles lie side by side in one square picture.
const NOISE_TILE = noiseSize + 2;
const NOISE_PICTURE_WIDTH = NOISE_TILE * noiseSlicesAcross;

const WEATHER_CHANNEL = { cumulus: 0, towers: 1, height: 2 } as const;

function mustBeSquarePicture(pixels: Uint8Array, side: number, name: string): void {
  if (pixels.length !== side * side * 4) {
    throw new Error(`the ${name} is not the ${side} dots square that the cloud field reads`);
  }
}

function wrap(i: number, n: number): number {
  return ((i % n) + n) % n;
}

/** Four neighbouring dots blended: `fx` of the way along each row, `fy` from row to row. */
function blend(
  first0: number,
  first1: number,
  second0: number,
  second1: number,
  fx: number,
  fy: number,
): number {
  return (first0 * (1 - fx) + first1 * fx) * (1 - fy) + (second0 * (1 - fx) + second1 * fx) * fy;
}

/** Where (x, z) lies in the cloud field, which drifts with the wind. */
function fieldX(x: number, moment: CloudMoment): number {
  return x - startsAt[0] - tradeWind[0] * moment.drift;
}
function fieldZ(z: number, moment: CloudMoment): number {
  return z - startsAt[1] - tradeWind[1] * moment.drift;
}

/** 1 where (x, z) lies along the lane, 0 well to one side of it. */
function closenessToLane(x: number, z: number, far: number, lane: Lane): number {
  return smoothstep(0.9, 0.975, (x * lane.x + z * lane.z) / Math.max(far, 0.001));
}

// How far a line rising at `rise` (the sine of its elevation) goes to reach `height` above the
// sea, which curves away below it: the root of s * rise + s * s * curve = height, in the form
// that still holds when `curve` is 0 (the line straight up).
function distanceUpTo(height: number, rise: number, curve: number): number {
  return (2 * height) / (rise + Math.sqrt(rise * rise + 4 * curve * height));
}

export function createCloudField(noisePixels: Uint8Array, weatherPixels: Uint8Array): CloudField {
  mustBeSquarePicture(noisePixels, NOISE_PICTURE_WIDTH, 'cloud noise');
  mustBeSquarePicture(weatherPixels, weatherMapSize, 'weather map');

  // What findWeather found: how much cloud grows over the spot (0..1), and how high its tops reach.
  const weatherHere = { cloud: 0, tops: 0 };

  // The weather map read between its dots as the graphics card reads it, repeating. 0..1.
  function readWeatherMap(u: number, v: number, channel: number): number {
    const x = u * weatherMapSize - 0.5;
    const y = v * weatherMapSize - 0.5;
    const left = Math.floor(x);
    const top = Math.floor(y);
    const x0 = wrap(left, weatherMapSize);
    const x1 = wrap(left + 1, weatherMapSize);
    const row0 = wrap(top, weatherMapSize) * weatherMapSize;
    const row1 = wrap(top + 1, weatherMapSize) * weatherMapSize;
    const dots = blend(
      weatherPixels[(row0 + x0) * 4 + channel],
      weatherPixels[(row0 + x1) * 4 + channel],
      weatherPixels[(row1 + x0) * 4 + channel],
      weatherPixels[(row1 + x1) * 4 + channel],
      x - left,
      y - top,
    );
    return dots / 255;
  }

  // Dots x0 and x0 + 1 of rows y0 and y0 + 1 of one slice, blended. The tile starts one dot in,
  // so its border holds x0 = -1 and x0 + 1 = noiseSize.
  function readSlice(slice: number, x0: number, y0: number, fx: number, fy: number): number {
    const tileRow = Math.floor(slice / noiseSlicesAcross);
    const tileColumn = slice % noiseSlicesAcross;
    const dot =
      (tileRow * NOISE_TILE + y0 + 1) * NOISE_PICTURE_WIDTH + tileColumn * NOISE_TILE + x0 + 1;
    const thisRow = dot * 4;
    const nextRow = (dot + NOISE_PICTURE_WIDTH) * 4;
    return blend(
      noisePixels[thisRow],
      noisePixels[thisRow + 4],
      noisePixels[nextRow],
      noisePixels[nextRow + 4],
      fx,
      fy,
    );
  }

  // The shape noise at a point of its cube, which repeats every 1 each way: x and y lie within a
  // slice, z runs through the slices. 0..1.
  function readShapeNoise(x: number, y: number, z: number): number {
    const u = (x - Math.floor(x)) * noiseSize - 0.5;
    const v = (y - Math.floor(y)) * noiseSize - 0.5;
    const depth = (z - Math.floor(z)) * noiseSize;
    const z0 = Math.floor(depth) % noiseSize;
    const z1 = (z0 + 1) % noiseSize;
    const fz = depth - Math.floor(depth);
    const x0 = Math.floor(u);
    const y0 = Math.floor(v);
    const fx = u - x0;
    const fy = v - y0;
    return (readSlice(z0, x0, y0, fx, fy) * (1 - fz) + readSlice(z1, x0, y0, fx, fy) * fz) / 255;
  }

  function findWeather(x: number, z: number, moment: CloudMoment): void {
    const u = fieldX(x, moment) / weatherMapSpan;
    const v = fieldZ(z, moment) / weatherMapSpan;
    const cumulusMap = readWeatherMap(u, v, WEATHER_CHANNEL.cumulus);
    const towerMap = readWeatherMap(u, v, WEATHER_CHANNEL.towers);
    const heightMap = readWeatherMap(u, v, WEATHER_CHANNEL.height);
    const far = Math.hypot(x, z);
    const cover = moment.cloudCover;

    // Cloud that drifts into the lane the sun sets down, or the one it rises up, thins away, so
    // that the sunset and the sunrise are never walled off.
    const lane =
      Math.max(closenessToLane(x, z, far, SUNSET_LANE), closenessToLane(x, z, far, SUNRISE_LANE)) *
      smoothstep(4, 9, far);
    // As it clears, only the strongest parts of the map still grow cloud, then none.
    const tower = smoothstep(0.95 - 0.35 * cover, 1.06 - 0.32 * cover, towerMap) * (1 - lane);
    // Fair-weather cumulus thin out with distance, or the horizon would be one bank of cloud;
    // the towers do not.
    const cumulus =
      smoothstep(0.78 - 0.42 * cover, 1 - 0.18 * cover, cumulusMap) *
      smoothstep(0, 0.12, cover) *
      0.52 *
      (1 - 0.8 * smoothstep(20, 50, far)) *
      (1 - 0.75 * lane);
    // A tower's sides rise steeply: a column, not a tent.
    const towerShare = smoothstep(0, 0.3, tower);

    weatherHere.cloud = Math.max(cumulus, tower * 0.95);
    weatherHere.tops =
      CLOUD_BASE + (0.6 + 1.5 * heightMap) * (1 - towerShare) + (3.4 + 3 * heightMap) * towerShare;
  }

  // How much cloud there is at (x, y, z), 0..1.
  function cloudAt(x: number, y: number, z: number, moment: CloudMoment): number {
    const heightAboveSea = y + (x * x + z * z) * earthCurve;
    findWeather(x, z, moment);
    const { cloud, tops } = weatherHere;
    const up = (heightAboveSea - CLOUD_BASE) / (tops - CLOUD_BASE);
    if (up <= 0 || up >= 1 || cloud < 0.01) return 0;

    // A flat base, fullest a fifth of the way up, thinning to the top so that only the strongest
    // lumps reach it. Towers stay full further up.
    const thinningFrom = 0.2 + 0.3 * smoothstep(2.5, 4, tops);
    const fullness = cloud * smoothstep(0, 0.07, up) * (1 - 0.9 * smoothstep(thinningFrom, 1, up));
    // The shapes are stretched upward: columns that the flat base cuts across.
    const shape = readShapeNoise(
      (fieldX(x, moment) + SHAPE_SLIDE_X * moment.boil) / SHAPE_REPEAT,
      (fieldZ(z, moment) + SHAPE_SLIDE_Z * moment.boil) / SHAPE_REPEAT,
      (heightAboveSea * SHAPE_STRETCH) / SHAPE_REPEAT - ((moment.boil * SHAPE_RISE) % 1),
    );
    const aboveThreshold = (shape - (1 - fullness)) / Math.max(fullness, 0.05);
    return Math.max(0, Math.min(1, aboveThreshold * EDGE_SHARPNESS));
  }

  return {
    // Walks from the spot towards the sun through the heights where cloud can be, as the sky's
    // own walk does, each step a fixed share longer than the last.
    sunThrough(x, z, sun, moment) {
      if (sun.y < -0.05) return 1;
      const curve = (1 - sun.y * sun.y) * earthCurve;
      const start = distanceUpTo(CLOUD_BASE, sun.y, curve);
      const end = Math.min(distanceUpTo(WALK_TOP, sun.y, curve), WALK_LONGEST);
      const stepGrowth = Math.pow(end / start, 1 / WALK_STEPS);
      let distance = start;
      let cloudPassed = 0;
      for (let i = 0; i < WALK_STEPS; i++) {
        const step = distance * (stepGrowth - 1);
        const middle = distance + 0.5 * step;
        cloudPassed +=
          cloudAt(x + sun.x * middle, sun.y * middle, z + sun.z * middle, moment) * step;
        distance *= stepGrowth;
      }
      return Math.exp(-cloudPassed * SHADOW_DENSITY);
    },
  };
}
