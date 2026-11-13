import type { BufferGeometry } from 'three';
import type { Random } from '../../core/random';
import type { PlantModel } from './plant-shape';
import {
  addBallTriangles,
  addLeafStrip,
  createTriangles,
  type Corner,
  type LeafRow,
  type Triangles,
  type Triple,
} from './plant-triangles';

// Things lying on the ground under the trees, and things washed up on the beach.

/**
 * A fallen palm frond, dried out: the same feather picture as the fronds on the trees, lying on
 * the ground with its midrib arched a little and its leaflets drooping to the soil either side.
 */
export function fallenFrond(): BufferGeometry {
  const SEGMENTS = 6;
  const frond = createTriangles();
  let previous: LeafRow | null = null;
  for (let j = 0; j <= SEGMENTS; j++) {
    const t = j / SEGMENTS;
    const x = 3.6 * t;
    const midribZ = 0.5 * t * t;
    const midribY = 0.06 + 0.16 * Math.sin(Math.PI * t);
    const w = 0.75 * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, 0.15 + 0.8 * t)));
    const row: LeafRow = [
      [x, 0.03, midribZ - w, t, 0, 0, 1, 0.2],
      [x, midribY, midribZ, t, 0.5, 0, 1, 0],
      [x, 0.03, midribZ + w, t, 1, 0, 1, -0.2],
    ];
    if (previous !== null) addLeafStrip(frond, previous, row);
    previous = row;
  }
  return frond.geometry();
}

interface VineLeaf {
  at: Triple;
  radius: number;
  turn: number;
  /** How far it leans along x and along z. */
  tiltX: number;
  tiltZ: number;
  colour: Triple;
}

const RUNNER_COLOUR: Triple = [0.2, 0.16, 0.08];
const FLOWER_COLOUR: Triple = [0.78, 0.36, 0.74];

/**
 * A mat of creeping beach vine: runners spreading over the ground from a middle, round notched
 * leaves standing off them on short stalks at all angles, and a few purple trumpet flowers.
 */
export function vineMat(random: Random): PlantModel {
  const full = createTriangles();
  const simpler = createTriangles();
  let leavesSoFar = 0;

  // A leaf (or a flower) is round with a notch at the tip: a fan of four triangles.
  function addLeaf({ at: [x, y, z], radius, turn, tiltX, tiltZ, colour }: VineLeaf): void {
    const rim: Triple[] = [];
    for (let q = 0; q <= 4; q++) {
      const a = turn + (q / 4 - 0.5) * 5.3;
      const r = radius * (q === 0 || q === 4 ? 0.85 : 1);
      rim.push([
        x + Math.cos(a) * r,
        y + Math.cos(a) * r * tiltX + Math.sin(a) * r * tiltZ,
        z + Math.sin(a) * r,
      ]);
    }
    const nx = -tiltX;
    const ny = 1;
    const nz = -tiltZ;
    const dark: Triple = [colour[0] * 0.7, colour[1] * 0.7, colour[2] * 0.7];
    // Further away: every second leaf, half as big again.
    const isInSimpler = leavesSoFar++ % 2 === 0;
    for (let q = 0; q < 4; q++) {
      const [x0, y0, z0] = rim[q];
      const [x1, y1, z1] = rim[q + 1];
      full.add(
        [x, y + 0.01, z, 0, 0, nx, ny, nz, dark],
        [x1, y1, z1, 0, 0, nx, ny, nz, colour],
        [x0, y0, z0, 0, 0, nx, ny, nz, colour],
      );
      if (isInSimpler) {
        simpler.add(
          [x, y + 0.01, z, 0, 0, nx, ny, nz, dark],
          [x + (x1 - x) * 1.5, y1, z + (z1 - z) * 1.5, 0, 0, nx, ny, nz, colour],
          [x + (x0 - x) * 1.5, y0, z + (z0 - z) * 1.5, 0, 0, nx, ny, nz, colour],
        );
      }
    }
  }

  for (let runner = 0; runner < 9; runner++) {
    addRunner(full, random, runner, addLeaf);
  }
  for (let flower = 0; flower < 3; flower++) {
    const angle = random() * 6.283;
    const distance = 0.4 + random() * 1.2;
    const turn = random() * 6.283;
    addLeaf({
      at: [Math.cos(angle) * distance, 0.13, Math.sin(angle) * distance],
      radius: 0.06,
      turn,
      tiltX: 0,
      tiltZ: 0,
      colour: FLOWER_COLOUR,
    });
  }
  return { full: full.geometry(), simpler: simpler.geometry() };
}

/** A runner wanders out from the middle, three leaves at each step; only its leaves show from afar. */
function addRunner(
  full: Triangles,
  random: Random,
  runner: number,
  addLeaf: (leaf: VineLeaf) => void,
): void {
  const STEPS = 8;
  const WIDTH = 0.012;
  let px = 0;
  let pz = 0;
  let direction = runner * 0.7 + random() * 0.5;
  const length = 1.2 + random() * 1.3;
  for (let step = 0; step < STEPS; step++) {
    const nextX = px + (Math.cos(direction) * length) / STEPS;
    const nextZ = pz + (Math.sin(direction) * length) / STEPS;
    const sx = -Math.sin(direction) * WIDTH;
    const sz = Math.cos(direction) * WIDTH;
    full.add(
      [px - sx, 0.03, pz - sz, 0, 0, 0, 1, 0, RUNNER_COLOUR],
      [px + sx, 0.03, pz + sz, 0, 0, 0, 1, 0, RUNNER_COLOUR],
      [nextX + sx, 0.03, nextZ + sz, 0, 0, 0, 1, 0, RUNNER_COLOUR],
    );
    px = nextX;
    pz = nextZ;
    direction += (random() - 0.5) * 0.7;
    for (let leaf = 0; leaf < 3; leaf++) {
      const g = 0.95 + 0.5 * random();
      const side = (random() - 0.5) * 0.42;
      const y = 0.05 + 0.07 * random();
      const radius = 0.085 + 0.04 * random();
      const turn = random() * 6.283;
      const tiltX = (random() - 0.5) * 0.7;
      const tiltZ = (random() - 0.5) * 0.7;
      addLeaf({
        at: [px - Math.sin(direction) * side, y, pz + Math.cos(direction) * side],
        radius,
        turn,
        tiltX,
        tiltZ,
        colour: [0.15 * g, 0.36 * g, 0.1 * g],
      });
    }
  }
}

/** From the foot up. The lowest two spread into roots, lobed five times round. */
const STUMP_RINGS = [
  { height: -0.3, radius: 0.74, roots: 0.25 },
  { height: 0.07, radius: 0.46, roots: 0.1 },
  { height: 0.2, radius: 0.35, roots: 0 },
  { height: 0.4, radius: 0.3, roots: 0 },
  { height: 0.6, radius: 0.28, roots: 0 },
] as const;
const PALE_WOOD: Triple = [1.5, 1.7, 1.85];

/**
 * A palm stump: the swollen foot of a trunk, roots spreading into the ground, snapped off
 * unevenly at knee height, pale wood showing in the break.
 */
export function stump(): BufferGeometry {
  const SIDES = 10;
  const TOP = STUMP_RINGS.length - 1;
  const triangles = createTriangles();
  const rings = STUMP_RINGS.map(({ height, radius, roots }, j) => {
    const ring: Corner[] = [];
    for (let a = 0; a <= SIDES; a++) {
      const th = (a / SIDES) * 6.283;
      const lump = 1 + 0.1 * Math.sin(th * 3 + j) + roots * Math.sin(th * 5);
      const jagged = j === TOP ? 0.1 * Math.sin(th * 2 + 1) + 0.07 * Math.sin(th * 5) : 0;
      // Dark at the foot, streaked above.
      const shade = j < 2 ? 0.62 : 0.8 + 0.25 * Math.sin(th * 7 + j * 2);
      ring.push([
        Math.cos(th) * radius * lump,
        height + jagged,
        Math.sin(th) * radius * lump,
        (a / SIDES) * 2,
        height,
        Math.cos(th),
        0.25,
        Math.sin(th),
        shade,
      ]);
    }
    return ring;
  });

  for (let j = 0; j < TOP; j++) {
    for (let a = 0; a < SIDES; a++) {
      triangles.add(rings[j][a], rings[j + 1][a + 1], rings[j][a + 1]);
      triangles.add(rings[j][a], rings[j + 1][a], rings[j + 1][a + 1]);
    }
  }
  const top = rings[TOP];
  for (let a = 0; a < SIDES; a++) {
    const [x0, y0, z0] = top[a];
    const [x1, y1, z1] = top[a + 1];
    triangles.add(
      [0, 0.5, 0, 0.5, 0.5, 0, 1, 0, [0.8, 0.85, 0.9]],
      [x1, y1, z1, 0.6, 0.5, 0, 1, 0, PALE_WOOD],
      [x0, y0, z0, 0.4, 0.5, 0, 1, 0, PALE_WOOD],
    );
  }
  return triangles.geometry();
}

/** A ball made knobbly and squashed, its foot sunk a little into the sand. */
function washedUpLump(knobs: number, squash: number): BufferGeometry {
  const SEGMENTS = 7;
  const RINGS = 5;
  const triangles = createTriangles();
  const corners: Corner[] = [];
  for (let ring = 0; ring <= RINGS; ring++) {
    for (let segment = 0; segment <= SEGMENTS; segment++) {
      const th = (segment / SEGMENTS) * 6.283;
      const ph = (ring / RINGS) * Math.PI;
      const nx = Math.sin(ph) * Math.cos(th);
      const ny = Math.cos(ph);
      const nz = Math.sin(ph) * Math.sin(th);
      const r = 1 + knobs * (Math.sin(th * 3 + ph * 4) * 0.5 + Math.sin(th * 5 - ph * 3 + 1) * 0.3);
      const shade = 0.72 + 0.28 * (ny * 0.5 + 0.5) + knobs * 0.4 * Math.sin(th * 7 + ph * 9);
      corners.push([
        nx * r,
        ny * r * squash + squash * 0.55,
        nz * r,
        0,
        0,
        nx,
        ny * 0.8 + 0.2,
        nz,
        shade,
      ]);
    }
  }
  addBallTriangles(corners, SEGMENTS, RINGS, (a, b, c) => {
    triangles.add(a, b, c);
  });
  return triangles.geometry();
}

/** A lump of coral rock washed up on the beach: pale and knobbly. */
export function coralLump(): BufferGeometry {
  return washedUpLump(0.22, 0.6);
}

/** A coconut washed up on the beach: smooth and brown. */
export function coconut(): BufferGeometry {
  return washedUpLump(0.03, 0.8);
}
