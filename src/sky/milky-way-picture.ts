import { ClampToEdgeWrapping, DataTexture, LinearFilter, RGBAFormat, RepeatWrapping } from 'three';
import { mix, smoothstep } from '../core/maths';
import type { Random } from '../core/random';
import { createLumps } from './lumps';
import { skyConfig } from './sky-config';

// The Milky Way as a picture made once at start-up, which the dome reads at night (sky.frag.glsl)
// in place of working out a band of noise for every dot of sky. It is laid out in the galaxy's own
// frame (sky-turn.ts): across, the galactic longitude, from half a turn west of the centre round
// to half a turn east, wrapping; up, the sine of the galactic latitude, to `reaches` each side.
// In it, the glow, from nothing to 1 at its brightest. It has no mipmaps, so that it may be read
// inside the dome's branch for the night.
//
// It shows the real one as the eye sees it on a dark night: a broad soft band, far brighter and
// wider towards the galaxy's centre in Sagittarius, split there and along Aquila by the Great
// Rift, the star clouds as knots, the Coalsack beside the Southern Cross, and on the far side, in
// Auriga and Monoceros, almost nothing.

const config = skyConfig.milkyWay;
const RADIANS_IN_A_DEGREE = Math.PI / 180;

/** A row of a table along the band: a galactic longitude (degrees), and three values there. */
type TableRow = readonly [number, number, number, number];
type Values = readonly [number, number, number];

/**
 * Along the band, eastward round the sky from the centre (galactic longitude, degrees): how bright
 * it is (1 the brightest), how far to each side of its middle it has dimmed to a third (degrees),
 * and how far north of the galaxy's plane its middle runs (degrees).
 */
const ALONG_THE_BAND: readonly TableRow[] = [
  [0, 1, 10, -2], // Sagittarius, over the galaxy's centre
  [12, 0.85, 6, -1.5],
  [27, 0.8, 5, -1.5], // Scutum
  [45, 0.5, 5, -0.5], // Aquila
  [65, 0.42, 5, 0],
  [80, 0.55, 6, 1], // Cygnus
  [100, 0.32, 6, 1],
  [125, 0.26, 5, 0], // Cassiopeia
  [150, 0.18, 5, 0], // Perseus
  [180, 0.1, 5, 0], // Auriga: the far side
  [210, 0.1, 5, -1], // Monoceros
  [240, 0.18, 5, -1], // Puppis
  [265, 0.3, 5, -1], // Vela
  [287, 0.5, 4.5, -1], // Carina
  [305, 0.45, 4, -0.5], // the Southern Cross
  [330, 0.6, 5, -1], // Norma
  [348, 0.75, 6, -1], // Scorpius
  [360, 1, 10, -2],
];

/**
 * The Great Rift: a dark lane a little north of the middle, from Ophiuchus along Aquila to Cygnus,
 * that splits the band in two. Along it (galactic longitude, degrees, from west of the centre):
 * its strength, how far north of the plane it runs (degrees), and its half-width (degrees).
 */
const GREAT_RIFT: readonly TableRow[] = [
  [-4, 0, 2, 3],
  [8, 0.8, 2.5, 3.5],
  [25, 0.85, 3, 2.5],
  [50, 0.85, 2, 2.5],
  [75, 0.7, 0.5, 2.5],
  [90, 0, 1, 2],
];

/** The bulge, the glow of the galaxy's middle: how bright, how wide along and across (degrees), how far north. */
const BULGE = { brightness: 0.8, along: 15, across: 11, middle: -3 };

/** A patch: its middle (galactic longitude and latitude, degrees), its radius (degrees), its strength. */
type Patch = readonly [longitude: number, latitude: number, radius: number, strength: number];

/** The star clouds and the brightest clusters and nebulae, as knots of extra glow. */
const STAR_CLOUDS: readonly Patch[] = [
  [2.5, -4.5, 3.5, 0.45], // the great Sagittarius star cloud
  [12, -1, 1.2, 0.35], // the small Sagittarius star cloud
  [6, -1.3, 0.8, 0.3], // the Lagoon Nebula
  [355.9, -4.5, 0.8, 0.35], // the cluster by Scorpius' sting
  [27.5, -2.5, 3, 0.5], // the Scutum star cloud
  [75, 1, 5, 0.3], // the Cygnus star cloud
  [78, 2, 2, 0.2],
  [287.5, -0.8, 3, 0.35], // Carina
  [313, -1, 4, 0.2], // Centaurus
  [329, -2.5, 3, 0.35], // the Norma star cloud
  [134.6, -3.7, 0.8, 0.25], // the double cluster in Perseus
];

/** The dark clouds of dust that hide the stars behind them, as patches of shadow. */
const DARK_CLOUDS: readonly Patch[] = [
  [301, -1, 3.2, 0.85], // the Coalsack
  [86, 0.5, 3, 0.55], // the northern Coalsack, in Cygnus
  [0.5, 4.5, 1.5, 0.7], // the Pipe's stem, in Ophiuchus
  [357, 7, 2, 0.6], // the Pipe's bowl
  [356, 10.5, 2, 0.5],
  [353, 16.5, 3, 0.5], // round rho Ophiuchi
  [4, 2.5, 2.5, 0.45], // lanes across the bulge
  [8, 2, 2, 0.45],
  [356, 2, 1.5, 0.4],
  [295, -1, 1.5, 0.4],
  [320, 1.5, 2, 0.4],
];

/** What changes only along the band: a column of the picture. */
interface Along {
  longitude: number;
  cos: number;
  sin: number;
  /** The band's brightness, half-width and middle (ALONG_THE_BAND). */
  band: Values;
  /** The Great Rift's strength, middle and half-width. */
  rift: Values;
  /** The bulge's glow along the band. */
  bulge: number;
}

/** What changes only across the band: a row of the picture. */
interface Across {
  latitude: number;
  sin: number;
  cos: number;
  /** The bulge's glow across the band. */
  bulge: number;
  /** 1 inside the picture, fading to nothing at its edges. */
  withinPicture: number;
}

type Lumps = ReturnType<typeof createLumps>;

/** A table's three values at a longitude, blended smoothly between its rows; `outside` beyond its ends. */
function lookUp(table: readonly TableRow[], longitude: number, outside: Values): Values {
  for (let i = 0; i + 1 < table.length; i++) {
    const from = table[i];
    const to = table[i + 1];
    if (longitude >= from[0] && longitude < to[0]) {
      const share = smoothstep(from[0], to[0], longitude);
      return [mix(from[1], to[1], share), mix(from[2], to[2], share), mix(from[3], to[3], share)];
    }
  }
  return outside;
}

/** Galactic longitude in degrees brought into -180 up to 180. */
function wrapLongitude(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

/** How much of a patch covers a place: a bell, 1 at its middle, a third at its radius. */
function inPatch(patch: Patch, longitude: number, latitude: number, cosLatitude: number): number {
  const [middleLongitude, middleLatitude, radius] = patch;
  const across = (latitude - middleLatitude) / radius;
  // (most patches are far from most places)
  if (Math.abs(across) > 3) return 0;
  const along = (wrapLongitude(longitude - middleLongitude) * cosLatitude) / radius;
  return Math.exp(-along * along - across * across);
}

function alongAt(column: number, width: number): Along {
  const longitude = ((column + 0.5) / width - 0.5) * 360;
  const alongBulge = longitude / BULGE.along;
  return {
    longitude,
    cos: Math.cos(longitude * RADIANS_IN_A_DEGREE),
    sin: Math.sin(longitude * RADIANS_IN_A_DEGREE),
    band: lookUp(ALONG_THE_BAND, (longitude + 360) % 360, [1, 10, -2]),
    rift: lookUp(GREAT_RIFT, longitude, [0, 0, 1]),
    bulge: BULGE.brightness * Math.exp(-alongBulge * alongBulge),
  };
}

function acrossAt(row: number, height: number): Across {
  const sin = ((row + 0.5) / height - 0.5) * 2 * Math.sin(config.reaches);
  const latitudeRadians = Math.asin(sin);
  const latitude = latitudeRadians / RADIANS_IN_A_DEGREE;
  const acrossBulge = (latitude - BULGE.middle) / (BULGE.across * config.widened);
  return {
    latitude,
    sin,
    cos: Math.cos(latitudeRadians),
    bulge: Math.exp(-acrossBulge * acrossBulge),
    // (the outermost rows are nothing, so that reading beyond them finds nothing)
    withinPicture: smoothstep(config.reaches, config.reaches * 0.85, Math.abs(latitudeRadians)),
  };
}

/** The glow at a dot of the picture. */
function glowAt(along: Along, across: Across, lumps: Lumps): number {
  const { longitude } = along;
  const { latitude } = across;
  const [bandBrightness, halfWidth, middle] = along.band;
  const fromMiddle = (latitude - middle) / (halfWidth * config.widened);
  let glow = bandBrightness * Math.exp(-fromMiddle * fromMiddle) + along.bulge * across.bulge;
  for (const cloud of STAR_CLOUDS) {
    glow += cloud[3] * inPatch(cloud, longitude, latitude, across.cos);
  }

  // Knots: lumps at three sizes (about 5, 2.5 and 1.2 degrees) mottle the glow. Gaps: lumps drawn
  // out along the band, as the dust lies, darken it where they stand highest.
  const x = across.cos * along.cos;
  const y = across.cos * along.sin;
  const z = across.sin;
  const mottle =
    0.5 * lumps(x * 12, y * 12, z * 16) +
    0.3 * lumps(x * 24 + 50, y * 24, z * 32) +
    0.2 * lumps(x * 48, y * 48 + 50, z * 64);
  glow *= 1 - config.mottling + 2 * config.mottling * mottle;
  const gapLumps =
    0.6 * lumps(x * 8 + 100, y * 8, z * 20 + 100) + 0.4 * lumps(x * 17, y * 17 + 100, z * 40);
  glow *= 1 - config.gaps * smoothstep(0.52, 0.75, gapLumps);

  const [riftStrength, riftMiddle, riftHalfWidth] = along.rift;
  const fromRift = (latitude - riftMiddle) / riftHalfWidth;
  glow *= 1 - riftStrength * Math.exp(-fromRift * fromRift);
  for (const cloud of DARK_CLOUDS) {
    glow *= 1 - cloud[3] * inPatch(cloud, longitude, latitude, across.cos);
  }
  return glow * across.withinPicture;
}

export function createMilkyWayPicture(random: Random): DataTexture {
  const [width, height] = config.pictureSize;
  const lumps = createLumps(random);
  const columns = Array.from({ length: width }, (_, column) => alongAt(column, width));
  const glows = new Float32Array(width * height);
  for (let row = 0; row < height; row++) {
    const across = acrossAt(row, height);
    for (let column = 0; column < width; column++) {
      glows[row * width + column] = glowAt(columns[column], across, lumps);
    }
  }

  const brightest = glows.reduce((most, glow) => Math.max(most, glow), 0);
  const dots = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    // (eased, as the eye takes a glow: the fainter parts are still made out)
    const value = Math.round(255 * Math.pow(glows[i] / brightest, config.easing));
    dots[i * 4] = value;
    dots[i * 4 + 1] = value;
    dots[i * 4 + 2] = value;
    dots[i * 4 + 3] = 255;
  }
  const picture = new DataTexture(dots, width, height, RGBAFormat);
  picture.wrapS = RepeatWrapping;
  picture.wrapT = ClampToEdgeWrapping;
  picture.minFilter = picture.magFilter = LinearFilter;
  picture.needsUpdate = true;
  return picture;
}
