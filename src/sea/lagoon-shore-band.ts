import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  Sphere,
  Vector3,
  type Frustum,
  type Scene,
  type ShaderMaterial,
} from 'three';
import type { IslandShape } from '../world/island-shape';
import type { Point } from '../world/landmarks';
import { seaConfig } from './sea-config';
import { waterConfig } from './water-config';
import type { WaterSheet } from './water-materials';

// The lagoon's shore-wave band. In a high wind the small waves that come ashore on the lagoon's
// beaches have real height: lagwave.glsl says where and when, lagoon-shore-band.vert.glsl lifts
// the band, and water.frag.glsl colours it like any water and cuts the matching gap out of the
// flat far sea. It is a strip of mesh along the lagoon's own shore and another round the
// sandbank, cut into pieces: a piece is drawn only in a high wind, in view and within reach of
// the eye (further off, the far sea draws that water flat again).
// Position is the only attribute (docs/DEVICE_NOTES.md).

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

interface Piece {
  mesh: Mesh;
  bounds: Sphere;
  triangles: number;
}

/**
 * The point of column `column` of a strip that lies `landward` metres on the land side of the
 * water's edge. The columns run from 0 to the strip's count, and the last is the first again.
 */
type ShorePoint = (column: number, landward: number) => Point;

const config = waterConfig.lagoonShoreBand;
// A full turn to eight figures; Math.PI * 2 would move vertices by a rounding step.
const FULL_TURN = 6.2831853;
// The lagoon's shore is measured in this many steps round the atoll.
const SHORE_LENGTH_STEPS = 720;
// The sandbank is a round island this big (island.glsl).
const SANDBANK_RADIUS = 20;
// The bounds leave room for the waves to lift the band.
const ROOM_FOR_WAVES = 1.5;

function rowDistances(): number[] {
  const { rows } = config;
  const distances: number[] = [];
  let distance: number = rows.first;
  for (const stretch of rows.stretches) {
    for (; distance > stretch.to; distance -= stretch.spacing) distances.push(distance);
  }
  distances.push(rows.last);
  return distances;
}

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
): Piece {
  const across = last - first + 1;
  const down = rows.length;
  const positions = new Float32Array(across * down * 3);
  let middleX = 0;
  let middleZ = 0;
  for (let row = 0; row < down; row++) {
    for (let column = 0; column < across; column++) {
      const point = pointAt(first + column, rows[row]);
      const at = (row * across + column) * 3;
      positions[at] = point.x;
      positions[at + 2] = point.z;
      middleX += point.x;
      middleZ += point.z;
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
      triangleCorners.push(a, a + 1, b + 1, a, b + 1, b);
    }
  }

  const shape = new BufferGeometry();
  shape.setAttribute('position', new BufferAttribute(positions, 3));
  shape.setIndex(triangleCorners);
  const bounds = new Sphere(
    new Vector3(middleX, seaConfig.level, middleZ),
    radius + ROOM_FOR_WAVES,
  );
  shape.boundingSphere = bounds;
  const mesh = new Mesh(shape, material);
  // The frame step decides.
  mesh.frustumCulled = false;
  // After the far sea, which does not write depth.
  mesh.renderOrder = 6;
  mesh.position.y = seaConfig.level;
  mesh.visible = false;
  return { mesh, bounds, triangles: triangleCorners.length / 3 };
}

export function createLagoonShoreBand(dependencies: LagoonShoreBandDependencies): LagoonShoreBand {
  const { scene, island, sandbank, createMaterial } = dependencies;
  const material = createMaterial('lagoon shore band');
  const rows = rowDistances();
  const pieces: Piece[] = [];
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
