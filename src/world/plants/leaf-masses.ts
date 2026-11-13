import type { Random } from '../../core/random';
import type { AtlasRegion } from './leaf-atlas';
import type { BothLevels, Corner, Triangles, Triple } from './plant-triangles';

/**
 * A mass of foliage: sprigs of leaves set all over a ball, each a small card turned outwards and
 * then knocked askew, so that the outline is made of leaves.
 */
export interface LeafMass {
  centre: Triple;
  radii: Triple;
  sprigs: number;
  sprigSize: number;
  /** How far below the middle of the ball the sprigs go, from 0 to 1. */
  reachBelowMiddle: number;
}

/** One sprig of a leaf mass, before it is drawn at its size. */
interface Sprig {
  centre: Triple;
  /** Half the card, across and along, at size 1. */
  across: Triple;
  along: Triple;
  size: number;
  /** The corner of the sprig's cell of the atlas. */
  cell: readonly [u: number, v: number];
  shade: number;
  /** The normal it is lit with: the ball's surface where it sits, tipped up. */
  litAs: Triple;
}

/** The sprig of a leaf mass that comes `i`th from the top. */
function placeSprig(random: Random, mass: LeafMass, i: number): Sprig {
  const { centre, radii, sprigs, sprigSize, reachBelowMiddle: low } = mass;
  const [cx, cy, cz] = centre;
  const [rx, ry, rz] = radii;
  // From the top of the ball down, round a spiral that turns by the golden angle at each sprig,
  // so that no two line up.
  const y = 1 - ((i + 0.5) / sprigs) * (1 + low);
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const ph = i * 2.39996 + cx * 3;
  const dx = r * Math.cos(ph);
  const dz = r * Math.sin(ph);
  const depth = 0.72 + 0.36 * random();

  let nx = dx + (random() - 0.5) * 0.9;
  let ny = y + (random() - 0.5) * 0.9 + 0.25;
  let nz = dz + (random() - 0.5) * 0.9;
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl;
  ny /= nl;
  nz /= nl;
  // Two directions in the card's plane. Any will do for a card that faces straight up.
  let tx = nz;
  const ty = 0;
  let tz = -nx;
  let tl = Math.hypot(tx, tz);
  if (tl < 0.05) {
    tx = 1;
    tz = 0;
    tl = 1;
  }
  tx /= tl;
  tz /= tl;
  const bx = ny * tz - nz * ty;
  const by = nz * tx - nx * tz;
  const bz = nx * ty - ny * tx;

  const turn = random() * 6.283;
  const cr = Math.cos(turn);
  const sr = Math.sin(turn);
  const size = sprigSize * (0.8 + 0.45 * random());
  const cell = Math.floor(random() * 4);
  // Sprigs low down and deep inside are darker.
  const shade =
    (0.5 + 0.5 * Math.min(1, Math.max(0, (y + low) / (1 + low) + 0.15))) *
    (0.62 + 0.5 * depth) *
    (0.85 + 0.3 * random());

  return {
    centre: [cx + dx * rx * depth, cy + y * ry * depth, cz + dz * rz * depth],
    across: [tx * cr + bx * sr, ty * cr + by * sr, tz * cr + bz * sr],
    along: [bx * cr - tx * sr, by * cr - ty * sr, bz * cr - tz * sr],
    size,
    cell: [(cell & 1) * 0.5, (cell >> 1) * 0.5],
    shade,
    // Every card is lit as if it were part of the ball's surface: that is what makes the mass
    // read as one rounded bush.
    litAs: [dx * 0.75, y * 0.6 + 0.5, dz * 0.75],
  };
}

function addSprigCard(
  triangles: Triangles,
  sprig: Sprig,
  size: number,
  region: AtlasRegion | undefined,
): void {
  const [px, py, pz] = sprig.centre;
  const [u0, v0] = sprig.cell;
  const [nx, ny, nz] = sprig.litAs;
  const { shade } = sprig;
  const ax = sprig.across[0] * size;
  const ay = sprig.across[1] * size;
  const az = sprig.across[2] * size;
  const ex = sprig.along[0] * size;
  const ey = sprig.along[1] * size;
  const ez = sprig.along[2] * size;
  const a: Corner = [px - ax - ex, py - ay - ey, pz - az - ez, u0, v0, nx, ny, nz, shade];
  const b: Corner = [px + ax - ex, py + ay - ey, pz + az - ez, u0 + 0.5, v0, nx, ny, nz, shade];
  const c: Corner = [
    px + ax + ex,
    py + ay + ey,
    pz + az + ez,
    u0 + 0.5,
    v0 + 0.5,
    nx,
    ny,
    nz,
    shade,
  ];
  const d: Corner = [px - ax + ex, py - ay + ey, pz - az + ez, u0, v0 + 0.5, nx, ny, nz, shade];
  triangles.add(a, b, c, region);
  triangles.add(a, c, d, region);
}

/** Further away, every third sprig is drawn, larger. */
export function addLeafMass(
  { full, simpler }: BothLevels,
  random: Random,
  mass: LeafMass,
  region: AtlasRegion | undefined,
): void {
  for (let i = 0; i < mass.sprigs; i++) {
    const sprig = placeSprig(random, mass, i);
    addSprigCard(full, sprig, sprig.size, region);
    if (i % 3 === 0) addSprigCard(simpler, sprig, sprig.size * 1.6, region);
  }
}
