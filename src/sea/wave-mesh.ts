import {
  Group,
  Sphere,
  Vector3,
  type Frustum,
  type Mesh,
  type Scene,
  type ShaderMaterial,
} from 'three';
import { FULL_TURN, smoothstep } from '../core/maths';
import type { IslandShape } from '../world/island-shape';
import { waterConfig } from './water-config';
import type { WaterSheet } from './water-materials';
import { createWaterStrip, rowsThroughStretches, type WaterStrip } from './water-strip';

// The wave mesh: a ring of water hugging the atoll, from 9 m up the ocean beach out past the reef's
// drop-off. Rows are lines of equal distance along the reef; columns fan out round the atoll. Its
// vertex shader is the most expensive thing in the scene, so the ring is cut into tiles: round the
// atoll into sectors, and each sector across, where the reef's zones meet. A tile out of view is
// not drawn at all, and each exists at three levels of detail, chosen by how near it is to the
// camera.

export interface WaveMeshDependencies {
  scene: Scene;
  island: IslandShape;
  createMaterial: (sheet: WaterSheet) => ShaderMaterial;
}

export interface WaveMesh {
  /** Every tile at every level of detail. */
  group: Group;
  material: ShaderMaterial;
  /** Its size, for the debug panel. */
  description: string;
  /** Shows each tile in view at the level of detail its distance calls for; hides the rest. */
  showTilesInView(view: Frustum, eye: Vector3): void;
  /** A debug switch: while it is on no tile is drawn at its finest, to see what the finest costs. */
  drawCoarsely: (isCoarse: boolean) => void;
}

interface Tile {
  /** The finest level of detail first. */
  levels: readonly Mesh[];
  /** Points spread over it at sea level: it is in view, and as near, as they are. */
  probes: readonly Vector3[];
}

const config = waterConfig.waveMesh;
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
  return distances.concat(rowsThroughStretches(rows.stretchesFrom, rows.stretches, rows.innerEdge));
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

  /** One piece of the ring: the given columns by the given rows. */
  function addPiece(directions: readonly number[], distances: readonly number[]): WaterStrip {
    const piece = createWaterStrip(
      {
        across: directions.length,
        down: distances.length,
        pointAt(column, row) {
          const direction = directions[column];
          const r = island.radius(direction) + island.offshoreOfReef(distances[row], direction);
          return { x: Math.cos(direction) * r, z: Math.sin(direction) * r };
        },
        height: 0,
        roomForWaves: ROOM_FOR_WAVES,
      },
      material,
    );
    // With the far sea: before the lagoon shore band, the bubbles and the spray.
    piece.mesh.renderOrder = 5;
    group.add(piece.mesh);
    return piece;
  }

  /**
   * A tile is a curved strip, so a sphere round it would be in view far more often than the tile
   * itself, and its middle can be far from the eye while its end is underfoot. Instead a spread of
   * points stands for it: on its two edges and the three quarter lines between, at distances along
   * the reef no further apart than the balls round them reach. Tiles on the north side are up to
   * 180 m long, so fewer points would leave gaps and the sea would vanish there.
   */
  function probePoints(
    directions: readonly number[],
    outerEdge: number,
    innerEdge: number,
  ): Vector3[] {
    const probes: Vector3[] = [];
    const lastColumn = directions.length - 1;
    const steps = Math.ceil((outerEdge - innerEdge) / config.probesAtMostApart);
    for (let quarter = 0; quarter <= 4; quarter++) {
      const direction = directions[(quarter * lastColumn) / 4];
      for (let step = 0; step <= steps; step++) {
        const along = innerEdge + ((outerEdge - innerEdge) * step) / steps;
        const r = island.radius(direction) + island.offshoreOfReef(along, direction);
        probes.push(new Vector3(Math.cos(direction) * r, 0, Math.sin(direction) * r));
      }
    }
    return probes;
  }

  function isInView(tile: Tile, view: Frustum): boolean {
    for (const probe of tile.probes) {
      probeBall.center.copy(probe);
      if (view.intersectsSphere(probeBall)) return true;
    }
    return false;
  }

  function distanceFromNearestProbe(tile: Tile, eye: Vector3): number {
    let nearest = Infinity;
    for (const probe of tile.probes) {
      nearest = Math.min(nearest, Math.hypot(eye.x - probe.x, eye.z - probe.z));
    }
    // (the probes are at sea level, so the eye's height is its height above them)
    return Math.hypot(nearest, eye.y);
  }

  const distances = rowDistances();
  const directions = columnDirections();
  // The rows the tiles of a sector end at, from the open sea inwards. Neighbours share a row.
  const firstRowWithin = (along: number) => distances.findIndex((distance) => distance <= along);
  const cuts = [0, ...config.cutAcrossAt.map(firstRowWithin), distances.length - 1];
  const columnsPerSector = config.columns / config.sectors;
  const tiles: Tile[] = [];
  let isDrawnCoarsely = false;
  for (let sector = 0; sector < config.sectors; sector++) {
    const first = sector * columnsPerSector;
    const sectorDirections = Array.from(directions.subarray(first, first + columnsPerSector + 1));
    for (let cut = 0; cut < cuts.length - 1; cut++) {
      const tileDistances = distances.slice(cuts[cut], cuts[cut + 1] + 1);
      const pieces = config.detailStrides.map((stride) =>
        addPiece(everyNth(sectorDirections, stride), everyNth(tileDistances, stride)),
      );
      tiles.push({
        levels: pieces.map((piece) => piece.mesh),
        probes: probePoints(sectorDirections, tileDistances[0], tileDistances.at(-1) ?? 0),
      });
    }
  }

  return {
    group,
    material,
    description: `${(config.columns + 1) * distances.length} vertices in ${tiles.length} tiles`,

    showTilesInView(view, eye) {
      for (const tile of tiles) {
        const { levels } = tile;
        let shownLevel = NOT_SHOWN;
        if (isInView(tile, view)) {
          const level = detailLevel(distanceFromNearestProbe(tile, eye));
          shownLevel = isDrawnCoarsely ? Math.max(level, 1) : level;
        }
        for (let level = 0; level < levels.length; level++) {
          levels[level].visible = level === shownLevel;
        }
      }
    },

    drawCoarsely(isCoarse) {
      isDrawnCoarsely = isCoarse;
    },
  };
}
