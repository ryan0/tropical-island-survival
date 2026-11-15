import type { Frustum, Mesh, Scene, ShaderMaterial, Vector3 } from 'three';
import { FULL_TURN } from '../core/maths';
import type { IslandShape } from '../world/island-shape';
import type { Point } from '../world/landmarks';
import { seaConfig } from './sea-config';
import { waterConfig } from './water-config';
import type { WaterSheet } from './water-materials';
import { createWaterStrip, rowsThroughStretches, type WaterStrip } from './water-strip';

// The lagoon's shore-wave band. In a high wind the small waves that come ashore on the lagoon's
// beaches have real height: lagwave.glsl says where and when, lagoon-shore-band.vert.glsl lifts
// the band, and water.frag.glsl colours it like any water and cuts the matching gap out of the
// flat far sea. It is a strip of mesh along the lagoon's own shore and another round the
// sandbank, cut into pieces: a piece is drawn only in a high wind, in view and within reach of
// the eye (further off, the far sea draws that water flat again).

export interface LagoonShoreBandDependencies {
  scene: Scene;
  island: IslandShape;
  /** The middle of the sandbank in the lagoon. */
  sandbank: Point;
  createMaterial: (sheet: WaterSheet) => ShaderMaterial;
}

export interface LagoonShoreBand {
  pieces: Mesh[];
  /** Its size, for the debug panel. */
  description: string;
  /** Shows the pieces in view and within reach of the eye, and hides the rest. */
  showPiecesInView(view: Frustum, eye: Vector3): void;
  hide(): void;
}

/**
 * The point of column `column` of a strip that lies `landward` metres on the land side of the
 * water's edge. The columns run from 0 to the strip's count, and the last is the first again.
 */
type ShorePoint = (column: number, landward: number) => Point;

const config = waterConfig.lagoonShoreBand;
// The lagoon's shore is measured in this many steps round the atoll.
const SHORE_LENGTH_STEPS = 720;
// The sandbank is a round island this big (island.glsl).
const SANDBANK_RADIUS = 20;
// The bounds leave room for the waves to lift the band.
const ROOM_FOR_WAVES = 1.5;

/** The lagoon's own shore: its edge lies landWidth inside the ocean shoreline (island.glsl). */
function lagoonShoreLength(island: IslandShape): number {
  let length = 0;
  let previous: Point | null = null;
  for (let i = 0; i <= SHORE_LENGTH_STEPS; i++) {
    const direction = (i / SHORE_LENGTH_STEPS) * FULL_TURN;
    const r = island.radius(direction) - island.landWidth(direction);
    const point = { x: Math.cos(direction) * r, z: Math.sin(direction) * r };
    if (previous !== null) length += Math.hypot(point.x - previous.x, point.z - previous.z);
    previous = point;
  }
  return length;
}

/** The piece of a strip from column `first` to column `last`. */
function createPiece(
  pointAt: ShorePoint,
  first: number,
  last: number,
  rows: readonly number[],
  material: ShaderMaterial,
): WaterStrip {
  const piece = createWaterStrip(
    {
      across: last - first + 1,
      down: rows.length,
      pointAt: (column, row) => pointAt(first + column, rows[row]),
      height: seaConfig.level,
      roomForWaves: ROOM_FOR_WAVES,
    },
    material,
  );
  // After the far sea, which does not write depth.
  piece.mesh.renderOrder = 6;
  piece.mesh.position.y = seaConfig.level;
  piece.mesh.visible = false;
  return piece;
}

export function createLagoonShoreBand(dependencies: LagoonShoreBandDependencies): LagoonShoreBand {
  const { scene, island, sandbank, createMaterial } = dependencies;
  const material = createMaterial('lagoon shore band');
  const rows = rowsThroughStretches(config.rows.first, config.rows.stretches, config.rows.last);
  const pieces: WaterStrip[] = [];
  let triangles = 0;

  function addStrip(columns: number, pointAt: ShorePoint): void {
    for (let first = 0; first < columns; first += config.columnsPerPiece) {
      const last = Math.min(first + config.columnsPerPiece, columns);
      const piece = createPiece(pointAt, first, last, rows, material);
      scene.add(piece.mesh);
      pieces.push(piece);
      triangles += piece.triangles;
    }
  }

  const shoreLength = lagoonShoreLength(island);
  const shoreColumns = Math.ceil(shoreLength / config.columnSpacing);
  addStrip(shoreColumns, (column, landward) => {
    const direction = ((column % shoreColumns) / shoreColumns) * FULL_TURN;
    const r = island.radius(direction) - island.landWidth(direction) + landward;
    return { x: Math.cos(direction) * r, z: Math.sin(direction) * r };
  });

  const sandbankColumns = Math.ceil((FULL_TURN * config.sandbankColumnsAt) / config.columnSpacing);
  addStrip(sandbankColumns, (column, landward) => {
    const direction = ((column % sandbankColumns) / sandbankColumns) * FULL_TURN;
    const r = SANDBANK_RADIUS - landward;
    return { x: sandbank.x + Math.cos(direction) * r, z: sandbank.z + Math.sin(direction) * r };
  });

  const shoreMetres = Math.round(shoreLength);
  return {
    pieces: pieces.map((piece) => piece.mesh),
    description: `${pieces.length} pieces, ${triangles} triangles, lagoon shore ${shoreMetres} m`,

    showPiecesInView(view, eye) {
      for (const { mesh, bounds } of pieces) {
        const { center } = bounds;
        const distance = Math.hypot(eye.x - center.x, eye.y - center.y, eye.z - center.z);
        mesh.visible =
          distance < config.shownWithin + bounds.radius && view.intersectsSphere(bounds);
      }
    },

    hide() {
      for (const { mesh } of pieces) mesh.visible = false;
    },
  };
}
