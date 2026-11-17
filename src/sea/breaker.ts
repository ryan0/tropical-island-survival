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
// those out of view are not drawn; for now each is at one level of detail, and a switch in the
// debug panel draws the mesh in place of the sea's own lip.

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
  /** Its size, for the debug panel. */
  readonly description: string;
}

const config = seaConfig.breaker;

/**
 * The ribbon: each corner holds the unit vector out from the atoll's centre (x, z) and how far
 * along the front's cross-section its row lies (y, from 0 to 1).
 */
function ribbon(directions: readonly number[]): BufferGeometry {
  const { rows } = config;
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

export function createBreaker(dependencies: BreakerDependencies): Breaker {
  const { scene, createMaterial, arc, breakLineFromCentre } = dependencies;
  // The columns are `columnsApart` metres apart along the line the waves break on.
  const directions: number[] = [];
  let direction = arc.middle - arc.halfWidth;
  while (direction < arc.middle + arc.halfWidth) {
    directions.push(direction);
    direction += config.columnsApart / breakLineFromCentre(direction);
  }

  const material = createMaterial('breaker');
  const pieces = new Group();
  pieces.visible = false;
  scene.add(pieces);
  for (let first = 0; first < directions.length - 1; first += config.columnsInAPiece) {
    // (a piece shares its last column with the next piece's first)
    const ofPiece = directions.slice(first, first + config.columnsInAPiece + 1);
    const shape = ribbon(ofPiece);
    // The shader moves the piece's corners to the crest, which is never far from the line the
    // waves break on: the piece is in view if a ball round its stretch of that line is.
    const onLine = (towards: number) =>
      new Vector3(Math.cos(towards), 0, Math.sin(towards)).multiplyScalar(
        breakLineFromCentre(towards),
      );
    const middle = onLine(ofPiece[Math.floor(ofPiece.length / 2)]);
    shape.boundingSphere = new Sphere(
      middle,
      middle.distanceTo(onLine(ofPiece[0])) + config.reachFromLine,
    );
    const piece = new Mesh(shape, material);
    // With the rest of the water.
    piece.renderOrder = 5;
    pieces.add(piece);
  }

  return {
    description: `${directions.length * config.rows} vertices in ${pieces.children.length} pieces`,
    get isShown() {
      return pieces.visible;
    },
    show(isShown) {
      pieces.visible = isShown;
    },
  };
}
