import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  Sphere,
  Vector3,
  type Frustum,
  type Scene,
  type ShaderMaterial,
} from 'three';
import { smoothstep } from '../core/maths';
import type { IslandShape } from '../world/island-shape';
import { waterConfig } from './water-config';
import type { WaterSheet } from './water-materials';

// The wave mesh: a ring of water hugging the atoll, from 9 m up the ocean beach to 95 m offshore.
// Rows are lines of equal distance from the shore; columns fan out round the atoll. Its vertex
// shader is the most expensive thing in the scene, so the ring is cut into sectors: a sector out
// of view is not drawn at all, and each exists at three levels of detail, chosen by its distance
// from the camera.

export interface WaveMeshDependencies {
  scene: Scene;
  island: IslandShape;
  createMaterial: (sheet: WaterSheet) => ShaderMaterial;
}

export interface WaveMesh {
  /** Every sector at every level of detail. */
  group: Group;
  material: ShaderMaterial;
  /** Its size, for the debug panel. */
  description: string;
  /** Shows each sector in view at the level of detail its distance calls for; hides the rest. */
  showSectorsInView(view: Frustum, eye: Vector3): void;
}

interface Piece {
  mesh: Mesh;
  middle: Vector3;
}

interface Sector {
  /** The finest level of detail first. */
  levels: readonly Mesh[];
  /** The middle of the finest level, at sea level: the sector's distance is measured from it. */
  middle: Vector3;
  probes: readonly Vector3[];
}

const config = waterConfig.waveMesh;
// A full turn to eight figures; Math.PI * 2 would move vertices by a rounding step.
const FULL_TURN = 6.2831853;
// The weight that spaces the columns is summed in this many steps round the ring.
const WEIGHT_STEPS = 4000;
// The bounds leave room for the waves to move the mesh.
const ROOM_FOR_WAVES = 10;
const NOT_SHOWN = -1;

/** The distance off the beach of each row, from the open sea inwards. */
function rowDistances(): number[] {
  const { rows } = config;
  const { openSea } = rows;
  const distances: number[] = [];
  let distance: number = rows.outerEdge;
  let spacing: number = openSea.firstSpacing;
  while (distance > rows.stretchesFrom) {
    distances.push(distance);
    spacing = Math.max(openSea.leastSpacing, spacing / openSea.shrinkFactor);
    distance -= spacing;
  }
  distance = rows.stretchesFrom;
  for (const stretch of rows.stretches) {
    for (; distance > stretch.to; distance -= stretch.spacing) distances.push(distance);
  }
  distances.push(rows.innerEdge);
  return distances;
}

/**
 * The direction of each column round the ring, the last a full turn from the first. The columns
 * are evenly spaced in the sum of a weight that is larger to the south, so they are closer there.
 */
function columnDirections(): Float32Array {
  const { columns, southernColumns } = config;
  // The weight summed from direction 0 to the end of each step.
  const totals = [0];
  for (let i = 0; i < WEIGHT_STEPS; i++) {
    const direction = ((i + 0.5) / WEIGHT_STEPS) * FULL_TURN;
    const southward = smoothstep(southernColumns.from, southernColumns.to, Math.sin(direction));
    totals.push(totals[i] + 1 + southernColumns.extra * southward);
  }
  const directions = new Float32Array(columns + 1);
  for (let column = 0, step = 0; column <= columns; column++) {
    const target = (totals[WEIGHT_STEPS] * column) / columns;
    while (step < WEIGHT_STEPS - 1 && totals[step + 1] < target) step++;
    const withinStep = (target - totals[step]) / (totals[step + 1] - totals[step]);
    directions[column] = ((step + withinStep) / WEIGHT_STEPS) * FULL_TURN;
  }
  directions[0] = 0;
  directions[columns] = FULL_TURN;
  return directions;
}

/** Every `stride`-th item, and always the last, so that neighbouring pieces still meet. */
function everyNth(items: readonly number[], stride: number): number[] {
  return items.filter((_, i) => i % stride === 0 || i === items.length - 1);
}

function detailLevel(distance: number): number {
  if (distance < config.finestDetailWithin) return 0;
  return distance < config.middleDetailWithin ? 1 : 2;
}

export function createWaveMesh({ scene, island, createMaterial }: WaveMeshDependencies): WaveMesh {
  const group = new Group();
  const material = createMaterial('wave mesh');
  const probeBall = new Sphere(new Vector3(), config.probeRadius);
  scene.add(group);

  /**
   * One piece of the ring: the given columns by the given rows.
   * Position is the only attribute (docs/DEVICE_NOTES.md).
   */
  function addPiece(directions: readonly number[], distances: readonly number[]): Piece {
    const across = directions.length;
    const down = distances.length;
    const positions = new Float32Array(across * down * 3);
    let middleX = 0;
    let middleZ = 0;
    for (let row = 0; row < down; row++) {
      for (let column = 0; column < across; column++) {
        const direction = directions[column];
        const r = island.radius(direction) + distances[row];
        const at = (row * across + column) * 3;
        positions[at] = Math.cos(direction) * r;
        positions[at + 2] = Math.sin(direction) * r;
        middleX += positions[at];
        middleZ += positions[at + 2];
      }
    }
    middleX /= across * down;
    middleZ /= across * down;
    let radius = 0;
    for (let at = 0; at < positions.length; at += 3) {
      radius = Math.max(radius, Math.hypot(positions[at] - middleX, positions[at + 2] - middleZ));
    }

    const triangleCorners: number[] = [];
    for (let row = 0; row < down - 1; row++) {
      for (let column = 0; column < across - 1; column++) {
        const a = row * across + column;
        const b = a + across;
        // Each square is split along the diagonal that runs the way the big swell's crests cross
        // the mesh, so that a crest is drawn as a clean ridge and not as a row of teeth.
        triangleCorners.push(a, a + 1, b + 1, a, b + 1, b);
      }
    }

    const shape = new BufferGeometry();
    shape.setAttribute('position', new BufferAttribute(positions, 3));
    shape.setIndex(triangleCorners);
    const bounds = new Sphere(new Vector3(middleX, 0, middleZ), radius + ROOM_FOR_WAVES);
    shape.boundingSphere = bounds;
    const mesh = new Mesh(shape, material);
    // The frame step decides, with a tighter test than one big sphere.
    mesh.frustumCulled = false;
    // With the far sea: before the lagoon shore band, the bubbles and the spray.
    mesh.renderOrder = 5;
    group.add(mesh);
    return { mesh, middle: bounds.center };
  }

  /**
   * A sector is a long curved strip, so a sphere round it would be in view far more often than
   * the sector itself. Instead it is drawn only if a ball round one of twenty points spread over
   * it is in view: on its two edges and the three quarter lines between, at four distances off the
   * beach. Sectors on the north side are up to 180 m long, so fewer points would leave gaps and the
   * sea would vanish there.
   */
  function probePoints(directions: readonly number[]): Vector3[] {
    const probes: Vector3[] = [];
    const lastColumn = directions.length - 1;
    for (let quarter = 0; quarter <= 4; quarter++) {
      const direction = directions[(quarter * lastColumn) / 4];
      for (const offBeach of config.probesOffBeach) {
        const r = island.radius(direction) + offBeach;
        probes.push(new Vector3(Math.cos(direction) * r, 0, Math.sin(direction) * r));
      }
    }
    return probes;
  }

  function isInView(sector: Sector, view: Frustum): boolean {
    for (const probe of sector.probes) {
      probeBall.center.copy(probe);
      if (view.intersectsSphere(probeBall)) return true;
    }
    return false;
  }

  const distances = rowDistances();
  const directions = columnDirections();
  const rowsAtLevel = config.detailStrides.map((stride) => everyNth(distances, stride));
  const columnsPerSector = config.columns / config.sectors;
  const sectors: Sector[] = [];
  for (let sector = 0; sector < config.sectors; sector++) {
    const first = sector * columnsPerSector;
    const sectorDirections = Array.from(directions.subarray(first, first + columnsPerSector + 1));
    const pieces = config.detailStrides.map((stride, level) =>
      addPiece(everyNth(sectorDirections, stride), rowsAtLevel[level]),
    );
    sectors.push({
      levels: pieces.map((piece) => piece.mesh),
      middle: pieces[0].middle,
      probes: probePoints(sectorDirections),
    });
  }

  return {
    group,
    material,
    description: `${(config.columns + 1) * distances.length} vertices in ${config.sectors} sectors`,

    showSectorsInView(view, eye) {
      for (const sector of sectors) {
        const { middle, levels } = sector;
        // (the middle is at sea level, so the eye's height is its height above it)
        const distance = Math.hypot(eye.x - middle.x, eye.y, eye.z - middle.z);
        const shownLevel = isInView(sector, view) ? detailLevel(distance) : NOT_SHOWN;
        for (let level = 0; level < levels.length; level++) {
          levels[level].visible = level === shownLevel;
        }
      }
    },
  };
}
