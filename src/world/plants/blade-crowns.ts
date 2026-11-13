import type { Random } from '../../core/random';
import {
  addLeafStrip,
  type BothLevels,
  type LeafRow,
  type Triangles,
  type Triple,
} from './plant-triangles';

/**
 * A crown of sword-shaped leaves, each one a real strip of surface: it springs from the middle,
 * arches out and droops at its point, tapered to that point and a little folded along its length.
 * Young leaves in the middle stand up, the outer ones lie over.
 */
export interface BladeCrown {
  centre: Triple;
  blades: number;
  length: number;
  width: number;
  /** How upright the middle is: 1 is a fountain, 0.4 a low star. */
  uprightness: number;
  /** How many brown leaves hang underneath. */
  deadBlades: number;
}

/** One leaf of a crown, before it is cut into triangles. */
interface Blade {
  isDead: boolean;
  /** Which way it grows from the middle, across the ground. */
  outX: number;
  outZ: number;
  /** The cosine and sine of the angle it springs up at. */
  cosRise: number;
  sinRise: number;
  length: number;
  droop: number;
  baseColour: Triple;
  tipColour: Triple;
}

const BLADE_SEGMENTS = 4;
const DEAD_BASE_COLOUR: Triple = [0.22, 0.15, 0.08];
const DEAD_TIP_COLOUR: Triple = [0.36, 0.27, 0.15];

/** The `i`th leaf of a crown: the living ones from the middle outwards, then the dead. */
function growBlade(random: Random, crown: BladeCrown, i: number): Blade {
  const { centre, blades, length, uprightness: up } = crown;
  const isDead = i >= blades;
  const f = isDead ? 1 : (i + 0.5) / blades;
  const az = i * 2.39996 + centre[0] * 5 + centre[2] * 3;
  const el = isDead
    ? -0.75 - 0.4 * random()
    : 1.35 * up * (1 - f) + -0.15 * f + (random() - 0.5) * 0.3;
  const bladeLength =
    length *
    (isDead ? 0.8 : 0.62 + 0.38 * Math.sin(Math.PI * (0.25 + 0.6 * f))) *
    (0.85 + 0.3 * random());
  const droop = (isDead ? 0.2 : 0.65 + 0.75 * f) * (0.8 + 0.4 * random());
  // Colour runs from dark at the base to lighter at the tip.
  const g = isDead ? 0 : 0.85 + 0.3 * random();
  return {
    isDead,
    outX: Math.cos(az),
    outZ: Math.sin(az),
    cosRise: Math.cos(el),
    sinRise: Math.sin(el),
    length: bladeLength,
    droop,
    baseColour: isDead ? DEAD_BASE_COLOUR : [0.09 * g, 0.22 * g, 0.07 * g],
    tipColour: isDead ? DEAD_TIP_COLOUR : [(0.22 + 0.1 * f) * g, 0.42 * g, 0.13 * g],
  };
}

/** `step` is how many of the blade's segments make one, `widening` how much wider it is drawn. */
function addBlade(
  triangles: Triangles,
  crown: BladeCrown,
  blade: Blade,
  step: number,
  widening: number,
): void {
  const [cx, cy, cz] = crown.centre;
  const { isDead, outX: dx, outZ: dz, cosRise: ce, sinRise: se, length: len, droop } = blade;
  const { baseColour: base, tipColour: tip } = blade;
  const sx = -dz;
  const sz = dx;
  let previous: LeafRow | null = null;
  for (let k = 0; k <= BLADE_SEGMENTS; k += step) {
    const t = k / BLADE_SEGMENTS;
    const r = len * ce * t;
    const y = len * (se * t - droop * t * t * 0.55);
    const taper =
      k === BLADE_SEGMENTS ? 0 : Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + 0.84 * t)), 0.7);
    const w = widening * crown.width * taper * (isDead ? 0.7 : 1);
    const px = cx + dx * r;
    const py = cy + y;
    const pz = cz + dz * r;
    const fold = w * 0.35;
    // Every leaf is lit as a point on one ball round the crown's middle, tipped up, so that the
    // whole tuft shades smoothly.
    const nx = dx * ce * t * 0.9;
    const ny = 0.75 + 0.3 * se;
    const nz = dz * ce * t * 0.9;
    const nl = Math.hypot(nx, ny, nz);
    const normalX = nx / nl;
    const normalY = ny / nl;
    const normalZ = nz / nl;
    const colour: Triple = [
      base[0] + (tip[0] - base[0]) * t,
      base[1] + (tip[1] - base[1]) * t,
      base[2] + (tip[2] - base[2]) * t,
    ];
    const midribColour: Triple = [colour[0] * 0.8, colour[1] * 0.8, colour[2] * 0.8];
    const row: LeafRow = [
      [px - sx * w, py + fold, pz - sz * w, 0, t, normalX, normalY, normalZ, colour],
      [px, py, pz, 0.5, t, normalX, normalY, normalZ, midribColour],
      [px + sx * w, py + fold, pz + sz * w, 1, t, normalX, normalY, normalZ, colour],
    ];
    if (previous !== null) addLeafStrip(triangles, previous, row);
    previous = row;
  }
}

/** Further away, every second blade is drawn, wider and with fewer bends. */
export function addBladeCrown(
  { full, simpler }: BothLevels,
  random: Random,
  crown: BladeCrown,
): void {
  for (let i = 0; i < crown.blades + crown.deadBlades; i++) {
    const blade = growBlade(random, crown, i);
    addBlade(full, crown, blade, 1, 1);
    if (i % 2 === 0) addBlade(simpler, crown, blade, 2, 1.5);
  }
}
