import {
  BufferGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Sphere,
  Vector3,
  type Material,
  type Scene,
} from 'three';

// three.js draws an instanced mesh in full, on screen or not, in the picture and again in the
// shadow pass. So a finished, static instanced mesh (plants, rocks) is regrouped into one mesh
// for each square of the map, and those are added to the scene instead:
//   - a square out of view, or outside the shadow box round the player, is skipped;
//   - each square sits at its own middle, so three.js can draw the near ones first and skip
//     the pixels hidden behind them;
//   - small things that cannot be made out from far away need not be drawn there at all;
//   - a square far enough off can be drawn with a simpler shape: fewer, larger leaves are
//     the same plant to the eye at that range.

export interface SimplerShape {
  shape: BufferGeometry;
  /** The simpler shape is drawn from this distance on. */
  beyond: number;
  /** The side of a square. Smaller squares mean only what is really close gets the full shape. */
  cellSize?: number;
}

/** What a square's things are: the debug panel can leave a whole kind out, to read what it costs. */
export type InstanceKind = 'plants' | 'rocks' | 'coral';

export interface SplitOptions {
  kind: InstanceKind;
  /** How far one instance can reach from its own origin. */
  reach: number;
  /** A square further than this from the camera is not drawn; 0 or nothing for no limit. */
  shownWithin?: number;
  simpler?: SimplerShape | null;
}

export interface InstanceCells {
  /** Adds the mesh's instances to the scene, square by square. Returns the meshes it made. */
  split(mesh: InstancedMesh, options: SplitOptions): InstancedMesh[];
  /** Picks the full shape, the simpler shape or nothing for every square, by its distance. */
  update(cameraPosition: Vector3): void;
  /** A debug switch: draws a whole kind of thing, or leaves it out of the picture and the shadows. */
  show(kind: InstanceKind, isShown: boolean): void;
  isShown(kind: InstanceKind): boolean;
}

interface Cell {
  full: InstancedMesh;
  simpler: InstancedMesh | null;
  middle: Vector3;
  radius: number;
  simplerBeyond: number;
  shownWithin: number;
}

const USUAL_CELL_SIZE = 64;
// A layer the camera does not draw: a kind that is left out is put on it. (Not `visible`, which says
// which of a square's two shapes is drawn.)
const NOT_DRAWN_LAYER = 31;
const NUMBERS_IN_A_MATRIX = 16;
// Where in an instance's matrix its position is.
const X = 12;
const Y = 13;
const Z = 14;

export function createInstanceCells(scene: Scene): InstanceCells {
  // Only the squares that change with distance; the rest are left to three.js.
  const cells: Cell[] = [];
  const meshesOfKind: Record<InstanceKind, InstancedMesh[]> = { plants: [], rocks: [], coral: [] };
  const kindsLeftOut = new Set<InstanceKind>();
  const layersWhenShown = new Map<InstancedMesh, number>();

  /** One mesh of a square. It shares the vertex buffers of `shape` and, for the simpler level, the instance buffers of `full`. */
  function addCellMesh(
    whole: InstancedMesh,
    shape: BufferGeometry,
    count: number,
    middle: Vector3,
    radius: number,
    full: InstancedMesh | null,
  ): InstancedMesh {
    const cellShape = new BufferGeometry();
    cellShape.attributes = shape.attributes;
    cellShape.index = shape.index;
    cellShape.groups = shape.groups;
    cellShape.boundingSphere = new Sphere(new Vector3(), radius);
    const mesh = new InstancedMesh(cellShape, whole.material, count);
    if (full !== null) {
      mesh.instanceMatrix = full.instanceMatrix;
      mesh.instanceColor = full.instanceColor;
    } else if (whole.instanceColor !== null) {
      mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(count * 3), 3);
    }
    mesh.position.copy(middle);
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    // three.js switches culling off for instanced meshes; a square has known bounds.
    mesh.frustumCulled = true;
    mesh.castShadow = whole.castShadow;
    mesh.receiveShadow = whole.receiveShadow;
    mesh.renderOrder = whole.renderOrder;
    // (three.js's types say every mesh has one; most have none)
    const { customDepthMaterial } = whole as { customDepthMaterial?: Material };
    if (customDepthMaterial !== undefined) mesh.customDepthMaterial = customDepthMaterial;
    scene.add(mesh);
    return mesh;
  }

  return {
    split(whole, { kind, reach, shownWithin = 0, simpler = null }) {
      const cellSize = simpler?.cellSize ?? USUAL_CELL_SIZE;
      const matrices = whole.instanceMatrix.array as Float32Array;
      const colours =
        whole.instanceColor === null ? null : (whole.instanceColor.array as Float32Array);

      const instancesByCell = new Map<string, number[]>();
      for (let i = 0; i < whole.count; i++) {
        const at = i * NUMBERS_IN_A_MATRIX;
        const key = `${Math.floor(matrices[at + X] / cellSize)},${Math.floor(matrices[at + Z] / cellSize)}`;
        const instances = instancesByCell.get(key);
        if (instances === undefined) instancesByCell.set(key, [i]);
        else instances.push(i);
      }

      const made: InstancedMesh[] = [];
      for (const instances of instancesByCell.values()) {
        const middle = new Vector3();
        for (const instance of instances) {
          const at = instance * NUMBERS_IN_A_MATRIX;
          middle.x += matrices[at + X];
          middle.y += matrices[at + Y];
          middle.z += matrices[at + Z];
        }
        middle.multiplyScalar(1 / instances.length);
        let radius = 0;
        for (const instance of instances) {
          const at = instance * NUMBERS_IN_A_MATRIX;
          radius = Math.max(
            radius,
            Math.hypot(
              matrices[at + X] - middle.x,
              matrices[at + Y] - middle.y,
              matrices[at + Z] - middle.z,
            ),
          );
        }

        const count = instances.length;
        const full = addCellMesh(whole, whole.geometry, count, middle, radius + reach, null);
        const cellMatrices = full.instanceMatrix.array as Float32Array;
        instances.forEach((instance, index) => {
          const from = instance * NUMBERS_IN_A_MATRIX;
          const to = index * NUMBERS_IN_A_MATRIX;
          cellMatrices.set(matrices.subarray(from, from + NUMBERS_IN_A_MATRIX), to);
          // Instances are placed relative to the square's middle.
          cellMatrices[to + X] -= middle.x;
          cellMatrices[to + Y] -= middle.y;
          cellMatrices[to + Z] -= middle.z;
          if (colours !== null && full.instanceColor !== null) {
            const cellColours = full.instanceColor.array as Float32Array;
            cellColours.set(colours.subarray(instance * 3, instance * 3 + 3), index * 3);
          }
        });
        made.push(full);

        let simplerMesh: InstancedMesh | null = null;
        if (simpler !== null) {
          simplerMesh = addCellMesh(whole, simpler.shape, count, middle, radius + reach, full);
          simplerMesh.visible = false;
          made.push(simplerMesh);
        }
        if (simplerMesh !== null || shownWithin !== 0) {
          cells.push({
            full,
            simpler: simplerMesh,
            middle,
            radius,
            simplerBeyond: simpler?.beyond ?? 0,
            shownWithin,
          });
        }
      }
      meshesOfKind[kind].push(...made);
      return made;
    },

    update(cameraPosition) {
      for (const cell of cells) {
        const distance =
          Math.hypot(
            cameraPosition.x - cell.middle.x,
            cameraPosition.y - cell.middle.y,
            cameraPosition.z - cell.middle.z,
          ) - cell.radius;
        const isShown = cell.shownWithin === 0 || distance < cell.shownWithin;
        const isNear = cell.simpler === null || distance < cell.simplerBeyond;
        cell.full.visible = isShown && isNear;
        if (cell.simpler !== null) cell.simpler.visible = isShown && !isNear;
      }
    },

    show(kind, isShown) {
      if (isShown === !kindsLeftOut.has(kind)) return;

      if (isShown) kindsLeftOut.delete(kind);
      else kindsLeftOut.add(kind);
      for (const mesh of meshesOfKind[kind]) {
        // (brought back onto the layers it was on: the sea's picture has sorted some onto its own)
        if (isShown) mesh.layers.mask = layersWhenShown.get(mesh) ?? mesh.layers.mask;
        else {
          layersWhenShown.set(mesh, mesh.layers.mask);
          mesh.layers.set(NOT_DRAWN_LAYER);
        }
      }
    },
    isShown: (kind) => !kindsLeftOut.has(kind),
  };
}
