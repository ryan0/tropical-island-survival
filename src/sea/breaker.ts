import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  Sphere,
  Vector3,
  type Scene,
  type ShaderMaterial,
} from 'three';
import { seaConfig } from './sea-config';
import type { WaterSheet } from './water-materials';

// The breaker's own mesh: a ribbon round the reef that keeps to the crest of the main swell's
// breaking wave and draws its front, with a lip that has two sides (breaker.vert.glsl). It lies
// only round the arc in which the crest picture can find a crest. It is cut into pieces, so that
// those out of view are not drawn, and each piece exists at three levels of detail, chosen by how
// near it is to the eye.
//
// Each piece is drawn twice. The sea and this mesh are both see-through, and where one lay over
// the other the water was drawn twice and came out twice as deep in colour. So the mesh is drawn
// first into the depth picture alone, which keeps the sea from being drawn where the mesh will
// hide it; then the sea; then the mesh in colour, which the sea hides wherever it lies over it.

export interface BreakerDependencies {
  scene: Scene;
  createMaterial: (sheet: WaterSheet) => ShaderMaterial;
  /** The directions it can follow a crest in (crest-picture.ts). */
  arc: { readonly middle: number; readonly halfWidth: number };
  /** How far from the atoll's centre the line its waves break on lies, in a direction. */
  breakLineFromCentre: (direction: number) => number;
}

export interface Breaker {
  readonly isShown: boolean;
  show: (isShown: boolean) => void;
  /** Shows each piece at the level of detail its distance from the eye calls for. */
  chooseDetail(eye: Vector3): void;
  /** Its size, for the debug panel. */
  readonly description: string;
}

interface Piece {
  /** Its two drawings: into the depth picture before the sea, and in colour after it. */
  depthOnly: Mesh;
  mesh: Mesh;
  /** Its shape at each level of detail, the finest first. */
  shapes: readonly BufferGeometry[];
  /** Points along its stretch of the line the waves break on: it is as near as the nearest. */
  probes: readonly Vector3[];
}

const config = seaConfig.breaker;

/**
 * A ribbon of `rows` rows: each corner holds the unit vector out from the atoll's centre (x, z)
 * and how far along the front's cross-section its row lies (y, from 0 to 1).
 */
function ribbon(directions: readonly number[], rows: number): BufferGeometry {
  const corners = new Float32Array(directions.length * rows * 3);
  const cornerOrder: number[] = [];
  directions.forEach((direction, column) => {
    for (let row = 0; row < rows; row++) {
      const corner = column * rows + row;
      corners.set([Math.cos(direction), row / (rows - 1), Math.sin(direction)], corner * 3);
      if (column === directions.length - 1 || row === rows - 1) continue;
      cornerOrder.push(
        corner,
        corner + rows,
        corner + 1,
        corner + rows,
        corner + rows + 1,
        corner + 1,
      );
    }
  });
  const shape = new BufferGeometry();
  shape.setAttribute('position', new BufferAttribute(corners, 3));
  shape.setIndex(cornerOrder);
  return shape;
}

/** Every `stride`-th item, and always the last, so that neighbouring pieces still meet. */
function everyNth(items: readonly number[], stride: number): number[] {
  return items.filter((_, i) => i % stride === 0 || i === items.length - 1);
}

function detailLevel(distance: number): number {
  if (distance < config.finestWithin) return 0;
  return distance < config.middleWithin ? 1 : 2;
}

export function createBreaker(dependencies: BreakerDependencies): Breaker {
  const { scene, createMaterial, arc, breakLineFromCentre } = dependencies;
  // The columns are `columnsApart` metres apart along the line the waves break on.
  const directions: number[] = [];
  let direction = arc.middle - arc.halfWidth;
  while (direction < arc.middle + arc.halfWidth) {
    directions.push(direction);
    direction += config.columnsApart / breakLineFromCentre(direction);
  }

  const onLine = (towards: number) =>
    new Vector3(Math.cos(towards), 0, Math.sin(towards)).multiplyScalar(
      breakLineFromCentre(towards),
    );
  const material = createMaterial('breaker');
  const depthMaterial = createMaterial('breaker depth');
  const group = new Group();
  scene.add(group);
  const pieces: Piece[] = [];
  for (let first = 0; first < directions.length - 1; first += config.columnsInAPiece) {
    // (a piece shares its last column with the next piece's first)
    const ofPiece = directions.slice(first, first + config.columnsInAPiece + 1);
    const ends = [ofPiece[0], ofPiece[ofPiece.length - 1]].map(onLine);
    const middle = onLine(ofPiece[Math.floor(ofPiece.length / 2)]);
    // The shader moves the piece's corners to the crest, which is never far from the line the
    // waves break on: the piece is in view if a ball round its stretch of that line is.
    const bounds = new Sphere(middle, middle.distanceTo(ends[0]) + config.reachFromLine);
    const shapes = config.levels.map(({ rows, everyColumn }) => {
      const shape = ribbon(everyNth(ofPiece, everyColumn), rows);
      shape.boundingSphere = bounds;
      return shape;
    });
    // (the sea's own meshes are drawn at 5)
    const depthOnly = new Mesh(shapes[0], depthMaterial);
    depthOnly.renderOrder = 4.5;
    const mesh = new Mesh(shapes[0], material);
    mesh.renderOrder = 5.5;
    group.add(depthOnly, mesh);
    pieces.push({ depthOnly, mesh, shapes, probes: [ends[0], middle, ends[1]] });
  }

  return {
    description: `${directions.length * config.levels[0].rows} vertices in ${pieces.length} pieces`,
    get isShown() {
      return group.visible;
    },
    show(isShown) {
      group.visible = isShown;
    },

    chooseDetail(eye) {
      for (const { depthOnly, mesh, shapes, probes } of pieces) {
        let nearest = Infinity;
        for (const probe of probes) nearest = Math.min(nearest, eye.distanceTo(probe));
        mesh.geometry = depthOnly.geometry = shapes[detailLevel(nearest)];
      }
    },
  };
}
