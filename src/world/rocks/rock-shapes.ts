import { BufferAttribute, IcosahedronGeometry, type BufferGeometry } from 'three';
import { clamp, smoothstep } from '../../core/maths';
import {
  latticeRandom,
  layeredNoise,
  randomDirection,
  ridgeNoise,
  valueNoise,
  type Vector,
} from './rock-noise';
import type { RockKind } from './rocks-config';

/** A point of a rock's shape, and the rock's tone there. */
interface ShapePoint {
  x: number;
  y: number;
  z: number;
  /** Below 1 in hollows and cracks, above 1 on edges and ridges. */
  tone: number;
  /** Sand blown into a pit (only karst has them). */
  isSandPocket: boolean;
}

/** Fills in the point of the rock's shape that lies in `direction` (of length 1) from its middle. */
type Shape = (direction: Readonly<Vector>, seed: number, point: ShapePoint) => void;

const UP: Readonly<Vector> = { x: 0, y: 1, z: 0 };
const EAST: Readonly<Vector> = { x: 1, y: 0, z: 0 };
/** How far round the ball the two neighbouring points lie that a vertex's normal is measured from. */
const NORMAL_STEP = 0.012;
const DARKEST_TONE = 0.4;
const LIGHTEST_TONE = 1.25;
// Sand lying in a hollow: pale and warm whatever the rock's own colour.
const SAND_COLOUR = [1.9, 1.8, 1.6] as const;
const BED_THICKNESS = 0.055;

function dot(a: Readonly<Vector>, b: Readonly<Vector>): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function setCross(a: Readonly<Vector>, b: Readonly<Vector>, result: Vector): void {
  result.x = a.y * b.z - a.z * b.y;
  result.y = a.z * b.x - a.x * b.z;
  result.z = a.x * b.y - a.y * b.x;
}

// Not Vector3's normalize, which multiplies by the inverse length: its numbers differ slightly
// from build 78's, and the rocks must come out exactly the same.
function setUnit(x: number, y: number, z: number, result: Vector): void {
  const length = Math.hypot(x, y, z);
  result.x = x / length;
  result.y = y / length;
  result.z = z / length;
}

/** Big rounded-angular blocks with flat fracture faces and a few cracks. */
function boulder(d: Readonly<Vector>, seed: number, point: ShapePoint): void {
  const radius = 0.78 + 0.5 * layeredNoise(d.x * 1.3 + seed, d.y * 1.3, d.z * 1.3, seed, 3);
  let x = d.x * radius;
  let y = d.y * radius;
  let z = d.z * radius;
  let tone = 1;
  // Flat fracture faces: whatever sticks out past each of a few random planes is cut back to it.
  for (let i = 0; i < 11; i++) {
    const face = randomDirection(seed, i);
    const faceDistance = 0.5 + 0.34 * latticeRandom(i, 5, 6, seed);
    const beyond = x * face.x + y * face.y + z * face.z - faceDistance;
    if (beyond > 0) {
      x -= face.x * beyond * 0.92;
      y -= face.y * beyond * 0.92;
      z -= face.z * beyond * 0.92;
      tone += 0.04;
    }
  }
  // Cracks: narrow grooves that run right round the rock.
  for (let i = 0; i < 3; i++) {
    const crack = randomDirection(seed + 50, i);
    const wobble = 0.1 * (valueNoise(d.x * 3, d.y * 3, d.z * 3, seed + i) - 0.5);
    const fromCrack = dot(d, crack) + wobble;
    const groove = Math.exp((-fromCrack * fromCrack) / 0.0012);
    x *= 1 - 0.07 * groove;
    y *= 1 - 0.07 * groove;
    z *= 1 - 0.07 * groove;
    tone -= 0.5 * groove;
  }
  const grain = layeredNoise(d.x * 6, d.y * 6, d.z * 6, seed + 9, 2) - 0.5;
  point.x = x * (1 + 0.07 * grain);
  point.y = Math.max(y * (1 + 0.07 * grain) * 0.85, -0.38);
  point.z = z * (1 + 0.07 * grain);
  point.tone = tone + 0.7 * grain;
  point.isSandPocket = false;
}

/** Dark, jagged rock with sharp ridges, standing in or at the water. */
function crag(d: Readonly<Vector>, seed: number, point: ShapePoint): void {
  // Broad blunt ridges with smaller sharp ones on them, and facets cut across the whole like a
  // boulder's.
  const broadRidges = ridgeNoise(d.x * 1.7 + seed, d.y * 1.7, d.z * 1.7, seed);
  const sharpRidges = ridgeNoise(d.x * 4.1, d.y * 4.1 + seed, d.z * 4.1, seed + 3);
  const grain = layeredNoise(d.x * 8, d.y * 8, d.z * 8, seed + 5, 2) - 0.5;
  const radius = 0.66 + 0.42 * broadRidges + 0.16 * sharpRidges * sharpRidges + 0.1 * grain;
  let x = d.x * radius;
  let y = d.y * radius;
  let z = d.z * radius;
  for (let i = 0; i < 6; i++) {
    const facet = randomDirection(seed + 20, i);
    const facetDistance = 0.6 + 0.3 * latticeRandom(i, 5, 6, seed);
    const beyond = x * facet.x + y * facet.y + z * facet.z - facetDistance;
    if (beyond > 0) {
      x -= facet.x * beyond * 0.85;
      y -= facet.y * beyond * 0.85;
      z -= facet.z * beyond * 0.85;
    }
  }
  point.x = x;
  point.y = Math.max(y * 1.05, -0.4);
  point.z = z;
  point.tone = 0.55 + 0.5 * broadRidges + 0.25 * sharpRidges + 0.5 * grain;
  point.isSandPocket = false;
}

/** Low ledges of beachrock: flat-topped, stepped at the edges, half buried along the waterline. */
function slab(d: Readonly<Vector>, seed: number, point: ShapePoint): void {
  let reach = 0.7 + 0.6 * layeredNoise(d.x * 1.4 + seed, 0.5, d.z * 1.4, seed, 3);
  let y = d.y * 0.22;
  // Straight broken edges: the outline is cut back to a few random lines.
  for (let i = 0; i < 6; i++) {
    const edgeAngle = latticeRandom(i, 9, 1, seed) * 6.283;
    const edgeDistance = 0.55 + 0.35 * latticeRandom(i, 9, 2, seed);
    const beyond = (d.x * Math.cos(edgeAngle) + d.z * Math.sin(edgeAngle)) * reach - edgeDistance;
    if (beyond > 0) reach -= beyond * 0.9;
  }
  const top = 0.1 + 0.03 * (valueNoise(d.x * reach * 3, seed, d.z * reach * 3, seed + 2) - 0.5);
  if (y > top) y = top + (y - top) * 0.12;
  // Beds: the edge is stepped, each bed a little further in or out than the next.
  const bedsUp = y / BED_THICKNESS + 40;
  const bed = Math.floor(bedsUp);
  const withinBed = bedsUp - bed;
  y = BED_THICKNESS * (bed - 40 + smoothstep(0.55, 1, withinBed));
  const bedStepsOut = 0.1 * (latticeRandom(bed, 7, 8, seed) - 0.5);
  reach *= 1 + bedStepsOut * (1 - smoothstep(0.8, 1, Math.abs(d.y)));
  const grain = layeredNoise(d.x * 5, d.y * 5, d.z * 5, seed + 4, 2) - 0.5;
  point.x = d.x * reach;
  point.y = Math.max(y, -0.1);
  point.z = d.z * reach;
  point.tone = 0.72 + 0.33 * withinBed + 0.4 * grain;
  point.isSandPocket = false;
}

/**
 * Old reef limestone, eaten by rain and spray into a low ragged mass: a lobed outline, a low dome,
 * and on it pinnacles that all point up (rain cuts downwards) between deep pits, some of them
 * holding blown sand. Below its widest line the rock goes straight down into the ground, so
 * nothing shows of an underside.
 */
function karst(d: Readonly<Vector>, seed: number, point: ShapePoint): void {
  const across = Math.hypot(d.x, d.z) || 1e-6;
  const headingX = d.x / across;
  const headingZ = d.z / across;
  const shareOfOutline = d.y > 0 ? across : 1;
  const lobes = layeredNoise(headingX * 1.1 + seed, 0.3, headingZ * 1.1, seed, 3);
  const ragged = valueNoise(headingX * 4, seed, headingZ * 4, seed + 1) - 0.5;
  const outline = (0.62 + 0.75 * lobes) * (1 + 0.12 * ragged);
  const x = headingX * outline * shareOfOutline;
  const z = headingZ * outline * shareOfOutline;
  const awayFromEdge = 1 - Math.pow(shareOfOutline, 5);

  const pinnacles = ridgeNoise(x * 2.3 + seed, 0.7, z * 2.3, seed + 2);
  const spikes = ridgeNoise(x * 6.1, seed * 0.37, z * 6.1, seed + 3);
  const fineSpikes = ridgeNoise(x * 11, 1.3, z * 11 + seed, seed + 5);
  const pit = Math.max(
    smoothstep(0.52, 0.74, valueNoise(x * 3.7 + 9, seed, z * 3.7, seed + 4)),
    0.8 * smoothstep(0.62, 0.8, valueNoise(x * 8.3, seed + 0.5, z * 8.3 + 4, seed + 6)),
  );
  // The mass slopes away under the sand before its outline, so its edge at ground level is
  // ragged: only the pinnacles of its fringe stand out of the beach.
  const dome = 0.36 * (1 - shareOfOutline * shareOfOutline) - 0.22 * Math.pow(shareOfOutline, 6);
  const raised =
    (0.34 * pinnacles * pinnacles + 0.3 * spikes * spikes + 0.1 * fineSpikes * fineSpikes) *
    (0.35 + 0.65 * awayFromEdge);
  const sunk = 0.34 * pit * (0.3 + 0.7 * awayFromEdge);
  let y = dome + raised - sunk;
  if (d.y <= 0) y = Math.min(y, -0.1) + d.y * 0.5;

  point.x = x;
  point.y = y;
  point.z = z;
  point.tone = 0.42 + 0.3 * pinnacles + 0.5 * spikes * spikes + 0.22 * fineSpikes - 0.7 * pit;
  point.isSandPocket = pit > 0.85 && y < 0.26 && d.y > 0;
}

/** Small stones scattered round the others, and the ring round the campfire. */
function cobble(d: Readonly<Vector>, seed: number, point: ShapePoint): void {
  const radius = 0.8 + 0.4 * layeredNoise(d.x * 1.1 + seed, d.y * 1.1, d.z * 1.1, seed, 2);
  point.x = d.x * radius;
  point.y = Math.max(d.y * radius * 0.62, -0.3);
  point.z = d.z * radius * 0.85;
  point.tone = 0.9 + 0.3 * (valueNoise(d.x * 4, d.y * 4, d.z * 4, seed) - 0.5);
  point.isSandPocket = false;
}

const SHAPES: Record<RockKind, Shape> = { boulder, crag, slab, karst, cobble };

function newVector(): Vector {
  return { x: 0, y: 0, z: 0 };
}

function newShapePoint(): ShapePoint {
  return { x: 0, y: 0, z: 0, tone: 0, isSandPocket: false };
}

/**
 * The mesh of one rock shape: a ball of triangles pushed out to the shape. `detail` is how finely
 * the ball is divided (triangles = 20 x (detail + 1) squared). The normals are measured from the
 * shape itself, and the tone is kept as each vertex's colour.
 */
export function createRockShape(kind: RockKind, seed: number, detail: number): BufferGeometry {
  const ball = new IcosahedronGeometry(1, detail);
  const position = ball.getAttribute('position');
  const normals = new Float32Array(position.count * 3);
  const colours = new Float32Array(position.count * 3);
  const shape = SHAPES[kind];

  const outward = newVector();
  const sideways = newVector();
  const onwards = newVector();
  const toward = newVector();
  const here = newShapePoint();
  const besideSideways = newShapePoint();
  const besideOnwards = newShapePoint();
  const edgeSideways = newVector();
  const edgeOnwards = newVector();
  const normal = newVector();

  function pointToward(x: number, y: number, z: number, point: ShapePoint): void {
    setUnit(x, y, z, toward);
    shape(toward, seed, point);
  }

  /** The normal of the surface through the three points, facing outwards. */
  function setMeasuredNormal(): void {
    edgeSideways.x = besideSideways.x - here.x;
    edgeSideways.y = besideSideways.y - here.y;
    edgeSideways.z = besideSideways.z - here.z;
    edgeOnwards.x = besideOnwards.x - here.x;
    edgeOnwards.y = besideOnwards.y - here.y;
    edgeOnwards.z = besideOnwards.z - here.z;
    setCross(edgeSideways, edgeOnwards, normal);
    const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
    normal.x /= length;
    normal.y /= length;
    normal.z /= length;
    if (dot(normal, outward) < 0) {
      normal.x = -normal.x;
      normal.y = -normal.y;
      normal.z = -normal.z;
    }
  }

  for (let i = 0; i < position.count; i++) {
    setUnit(position.getX(i), position.getY(i), position.getZ(i), outward);
    // The normal is measured from two points a step away round the ball, at right angles. Near
    // the top and bottom, up is too close to outward to cross with.
    setCross(outward, Math.abs(outward.y) > 0.9 ? EAST : UP, sideways);
    setUnit(sideways.x, sideways.y, sideways.z, sideways);
    setCross(outward, sideways, onwards);

    pointToward(outward.x, outward.y, outward.z, here);
    pointToward(
      outward.x + NORMAL_STEP * sideways.x,
      outward.y + NORMAL_STEP * sideways.y,
      outward.z + NORMAL_STEP * sideways.z,
      besideSideways,
    );
    pointToward(
      outward.x + NORMAL_STEP * onwards.x,
      outward.y + NORMAL_STEP * onwards.y,
      outward.z + NORMAL_STEP * onwards.z,
      besideOnwards,
    );
    setMeasuredNormal();
    // A little of the plain outward direction is mixed in: where the shape has a sharp step the
    // measured normal is wild.
    setUnit(
      normal.x * 0.8 + outward.x * 0.2,
      normal.y * 0.8 + outward.y * 0.2,
      normal.z * 0.8 + outward.z * 0.2,
      normal,
    );

    position.setXYZ(i, here.x, here.y, here.z);
    normals[i * 3] = normal.x;
    normals[i * 3 + 1] = normal.y;
    normals[i * 3 + 2] = normal.z;
    if (here.isSandPocket) colours.set(SAND_COLOUR, i * 3);
    else colours.fill(clamp(here.tone, DARKEST_TONE, LIGHTEST_TONE), i * 3, i * 3 + 3);
  }

  ball.setAttribute('normal', new BufferAttribute(normals, 3));
  ball.setAttribute('color', new BufferAttribute(colours, 3));
  ball.computeBoundingSphere();
  return ball;
}
