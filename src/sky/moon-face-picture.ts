import { ClampToEdgeWrapping, DataTexture, LinearFilter, RGBAFormat } from 'three';
import { smoothstep } from '../core/maths';
import type { Random } from '../core/random';
import { createLumps } from './lumps';
import { skyConfig } from './sky-config';

// The full moon's face as a picture made once at start-up, which the dome reads inside the moon's
// disc (sky.frag.glsl), its north towards the sky's pole. Across it, the disc from the limb on the
// left to the limb by Mare Crisium on the right, as the eye sees it with north up; up it, south to
// north. In it, how bright the face is, 1 at its brightest. No mipmaps: it is read inside the
// moon's branch.
//
// The seas are laid out as the real ones, from their places on the moon (latitude north and
// longitude east, degrees: the east limb is Crisium's) and their sizes, seen square on; with them
// the bright young craters, and Tycho's rays across the southern highlands. Approximate, after the
// usual maps.

const config = skyConfig.moon;
const RADIANS_IN_A_DEGREE = Math.PI / 180;
// How far the seas' soft edges reach to each side, and how far their outlines wander (degrees on the moon).
const SEA_EDGE = 3.5;
const SEA_OUTLINE_WANDERS = 7;
// The seas are not all of one grey inside: their darkness varies by this share.
const SEAS_MOTTLED = 0.3;
// The highlands' own light varies this much from place to place, broadly and in a fine grain of
// small craters, and the southern highlands, the brightest ground, are this much brighter towards
// the south.
const HIGHLANDS_MOTTLED = 0.05;
const GRAINED = 0.04;
const SOUTHERN_HIGHLANDS_BRIGHTER = 0.04;

/** A round patch on the moon: latitude and longitude of its middle, its radius (degrees), and its strength. */
type Patch = readonly [latitude: number, longitude: number, radius: number, strength: number];

/** The seas (strength: how dark, 1 a usual sea). Those of irregular outline are several patches each. */
const SEAS: readonly Patch[] = [
  [33, -16, 18, 0.9], // Mare Imbrium
  [44, -31, 5, 0.8], // Sinus Iridum, its bay
  [40, -50, 11, 0.85], // Oceanus Procellarum, down the western side
  [28, -57, 14, 0.85],
  [14, -61, 14, 0.85],
  [0, -57, 12, 0.85],
  [-10, -49, 9, 0.8],
  [6, -43, 10, 0.8],
  [21, -43, 10, 0.8],
  [33, -40, 8, 0.85],
  [7.5, -31, 9, 0.7], // Mare Insularum
  [-10, -23, 7, 0.65], // Mare Cognitum
  [11, -9, 4.5, 0.7], // Sinus Aestuum
  [-21, -17, 12, 0.7], // Mare Nubium
  [-24, -39, 7, 0.85], // Mare Humorum
  [58, -38, 5, 0.6], // Mare Frigoris, along the north
  [57, -22, 5, 0.6],
  [56, -6, 5, 0.6],
  [56, 10, 5, 0.6],
  [57, 25, 5, 0.55],
  [58, 38, 4, 0.5],
  [28, 17.5, 11, 0.85], // Mare Serenitatis
  [13, 4, 5, 0.8], // Mare Vaporum
  [2, 1, 4, 0.6], // Sinus Medii
  [8.5, 31, 12, 1], // Mare Tranquillitatis
  [14, 25, 7, 0.95],
  [3, 38, 8, 0.95],
  [11, 43, 4, 0.9], // Sinus Concordiae
  [-5, 27, 4, 0.85], // Sinus Asperitatis, down to Nectaris
  [1, 46, 5, 0.85], // where Tranquillitatis meets Fecunditatis
  [38, 29, 5, 0.6], // Lacus Somniorum
  [45, 27, 3, 0.6], // Lacus Mortis
  [17, 59, 9, 1], // Mare Crisium
  [-8, 51, 11, 0.8], // Mare Fecunditatis
  [-3, 56, 7, 0.8],
  [-15, 35, 6, 0.8], // Mare Nectaris
  [13, 86, 5, 0.6], // Mare Marginis, at the limb
  [-2, 86, 5, 0.6], // Mare Smythii
  [-46, 88, 8, 0.6], // Mare Australe
  [-5, -68.5, 3, 1.2], // Grimaldi, the darkest spot
  [51.6, -9.4, 1.6, 1.1], // Plato
];

/** The young craters, brighter than all round them (strength: how much, 1 the brightest). */
const BRIGHT_CRATERS: readonly Patch[] = [
  [-43.3, -11.2, 1.5, 1], // Tycho
  [9.6, -20.1, 1.6, 0.9], // Copernicus
  [8.1, -38, 1.1, 0.7], // Kepler
  [23.7, -47.4, 1, 1], // Aristarchus
  [16.1, 46.8, 1, 0.6], // Proclus
  [-8.9, 61, 1.4, 0.4], // Langrenus
  [9.6, -20.1, 7, 0.25], // the pale splash round Copernicus
  [8.1, -38, 5, 0.2], // and round Kepler
];
const TYCHO = BRIGHT_CRATERS[0];

/**
 * Tycho's rays: the bearing each leaves it on (degrees from north towards the east), and how far
 * it runs before it has faded to a third (degrees on the moon). Their half-width, and how faint
 * they are against the craters themselves.
 */
const TYCHO_RAYS: readonly (readonly [number, number])[] = [
  [12, 60],
  [35, 35],
  [70, 25],
  [110, 20],
  [150, 20],
  [190, 25],
  [225, 25],
  [255, 30],
  [295, 40],
  [330, 45],
];
const RAY_HALF_WIDTH = 1.4;
const RAYS_FAINTER = 0.3;

type Direction = readonly [number, number, number];

/** A place on the moon as a direction from its middle: x east, y north, z towards the earth. */
function directionOf(latitude: number, longitude: number): Direction {
  const up = latitude * RADIANS_IN_A_DEGREE;
  const across = longitude * RADIANS_IN_A_DEGREE;
  return [Math.cos(up) * Math.sin(across), Math.sin(up), Math.cos(up) * Math.cos(across)];
}

/** Near enough the angle between two directions, in degrees: the straight line between them. */
function degreesBetween(a: Direction, b: Direction): number {
  const cosine = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.sqrt(Math.max(0, 2 - 2 * cosine)) / RADIANS_IN_A_DEGREE;
}

const SEA_MIDDLES = SEAS.map(([latitude, longitude]) => directionOf(latitude, longitude));
// (a place further from a sea's middle than this, its cosine, is clear of it: most places are clear of most seas)
const SEA_REACHES = SEAS.map(([, , radius]) =>
  Math.cos((radius + SEA_EDGE + SEA_OUTLINE_WANDERS) * RADIANS_IN_A_DEGREE),
);
const CRATER_MIDDLES = BRIGHT_CRATERS.map(([latitude, longitude]) =>
  directionOf(latitude, longitude),
);
const TYCHO_MIDDLE = directionOf(TYCHO[0], TYCHO[1]);
const TYCHO_RAY_WAYS = TYCHO_RAYS.map(([bearing, reach]) => [
  Math.cos(bearing * RADIANS_IN_A_DEGREE),
  Math.sin(bearing * RADIANS_IN_A_DEGREE),
  reach,
]);

/** The light of Tycho's rays at a place: streaks leaving it on their bearings, fading as they run. */
function tychoRaysAt(place: Direction): number {
  const distance = degreesBetween(place, TYCHO_MIDDLE);
  if (distance < 1.5) return 0;
  // The way from Tycho to the place, along the moon's surface: north and east at Tycho (the two
  // have the same length, so that together they give the bearing).
  const [tx, ty, tz] = TYCHO_MIDDLE;
  const towardsX = place[0] - tx;
  const towardsY = place[1] - ty;
  const towardsZ = place[2] - tz;
  const north = -ty * tx * towardsX + (1 - ty * ty) * towardsY - ty * tz * towardsZ;
  const east = tz * towardsX - tx * towardsZ;
  const length = Math.hypot(north, east);

  let light = 0;
  for (const [rayNorth, rayEast, reach] of TYCHO_RAY_WAYS) {
    const along = (north * rayNorth + east * rayEast) / length;
    if (along <= 0) continue;
    const across = (((east * rayNorth - north * rayEast) / length) * distance) / RAY_HALF_WIDTH;
    light += Math.exp(-across * across - distance / reach);
  }
  // (the rays begin a little way out, past the dark ring round the crater)
  return RAYS_FAINTER * light * smoothstep(1.5, 4, distance);
}

type Lumps = ReturnType<typeof createLumps>;

/**
 * How much of a sea a place is in: 0 none, 1 a usual sea. The seas' soft outlines wander, so that
 * none is a plain circle; where two overlap they are one sea; inside, their grey varies.
 */
function seaAt(place: Direction, lumps: Lumps): number {
  const [x, y, z] = place;
  const broadWander = lumps(x * 5, y * 5, z * 5);
  const fineWander = lumps(x * 13 + 40, y * 13, z * 13);
  const finestWander = lumps(x * 30, y * 30 + 40, z * 30);
  const wander =
    SEA_OUTLINE_WANDERS * (1.2 * broadWander + 0.55 * fineWander + 0.25 * finestWander - 1);
  let sea = 0;
  for (let i = 0; i < SEAS.length; i++) {
    const middle = SEA_MIDDLES[i];
    if (x * middle[0] + y * middle[1] + z * middle[2] < SEA_REACHES[i]) continue;
    const [, , radius, darkness] = SEAS[i];
    const fromSea = degreesBetween(place, middle) + wander;
    sea += darkness * smoothstep(radius + SEA_EDGE, radius - SEA_EDGE, fromSea);
  }
  const mottle =
    0.7 * lumps(x * 8 + 80, y * 8, z * 8 + 80) + 0.3 * lumps(x * 20, y * 20, z * 20 + 80);
  return Math.min(1.1, sea) * (1 - SEAS_MOTTLED * mottle);
}

/** How much the young craters and their rays brighten a place: 0 none, 1 in full. */
function craterLightAt(place: Direction): number {
  let light = tychoRaysAt(place);
  for (let i = 0; i < BRIGHT_CRATERS.length; i++) {
    const [, , radius, strength] = BRIGHT_CRATERS[i];
    const fromCrater = degreesBetween(place, CRATER_MIDDLES[i]) / radius;
    light += strength * Math.exp(-fromCrater * fromCrater);
  }
  return Math.min(1, light);
}

/** The highlands' own light at a place: about 1, the face at its brightest. */
function highlandsAt(place: Direction, lumps: Lumps): number {
  const [x, y, z] = place;
  const mottled = HIGHLANDS_MOTTLED * (2 * lumps(x * 9 + 20, y * 9, z * 9) - 1);
  const grain = GRAINED * (2 * lumps(x * 28 + 60, y * 28, z * 28) - 1);
  const southern = SOUTHERN_HIGHLANDS_BRIGHTER * smoothstep(-0.2, -0.85, y);
  return 1 - GRAINED + mottled + grain + southern;
}

/** The place on the moon a dot of the picture shows; beyond the limb, the limb (the disc's soft edge reads a little way out). */
function placeAt(column: number, row: number, size: number): Direction {
  const x = ((column + 0.5) / size) * 2 - 1;
  const y = ((row + 0.5) / size) * 2 - 1;
  const towardsLimb = Math.min(1, 0.999 / Math.hypot(x, y));
  const onDiscX = x * towardsLimb;
  const onDiscY = y * towardsLimb;
  return [onDiscX, onDiscY, Math.sqrt(Math.max(0, 1 - onDiscX * onDiscX - onDiscY * onDiscY))];
}

export function createMoonFacePicture(random: Random): DataTexture {
  const size = config.facePictureSize;
  const lumps = createLumps(random);
  const dots = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const place = placeAt(column, row, size);
      const sea = seaAt(place, lumps);
      const ground =
        highlandsAt(place, lumps) * (1 - config.seasDarker * sea) +
        config.raysBrighter * craterLightAt(place);
      const value = Math.round(255 * Math.min(1, ground));
      const dot = (row * size + column) * 4;
      dots[dot] = value;
      dots[dot + 1] = value;
      dots[dot + 2] = value;
      dots[dot + 3] = 255;
    }
  }
  const picture = new DataTexture(dots, size, size, RGBAFormat);
  picture.wrapS = picture.wrapT = ClampToEdgeWrapping;
  picture.minFilter = picture.magFilter = LinearFilter;
  picture.needsUpdate = true;
  return picture;
}
