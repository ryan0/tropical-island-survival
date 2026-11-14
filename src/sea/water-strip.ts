import { BufferAttribute, BufferGeometry, Mesh, Sphere, Vector3, type ShaderMaterial } from 'three';
import type { Point } from '../world/landmarks';
import type { RowStretch } from './water-config';

// A strip of water mesh: a grid of points on the still sea, joined into triangles. The wave mesh
// and the lagoon shore band are made of these. Position is the only attribute
// (docs/DEVICE_NOTES.md).

export interface WaterStripLayout {
  /** Points in each row. */
  across: number;
  /** Rows. */
  down: number;
  /** Where the point in `column` of `row` lies; rows are filled in one after another. */
  pointAt: (column: number, row: number) => Point;
  /** The height of the middle of the strip's bounds. */
  height: number;
  /** Room left in the bounds for the waves to move the strip. */
  roomForWaves: number;
}

export interface WaterStrip {
  mesh: Mesh;
  /** A ball round the strip's points, with room for its waves. */
  bounds: Sphere;
  triangles: number;
}

/** Rows from `first`, each stretch's `spacing` apart until it reaches its `to`, and then `last`. */
export function rowsThroughStretches(
  first: number,
  stretches: readonly RowStretch[],
  last: number,
): number[] {
  const distances: number[] = [];
  let distance = first;
  for (const stretch of stretches) {
    for (; distance > stretch.to; distance -= stretch.spacing) distances.push(distance);
  }
  distances.push(last);
  return distances;
}

export function createWaterStrip(layout: WaterStripLayout, material: ShaderMaterial): WaterStrip {
  const { across, down, pointAt } = layout;
  const positions = new Float32Array(across * down * 3);
  let middleX = 0;
  let middleZ = 0;
  for (let row = 0; row < down; row++) {
    for (let column = 0; column < across; column++) {
      const point = pointAt(column, row);
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
      // Each square is split along the diagonal that runs the way the big swell's crests cross
      // the wave mesh, so that a crest is drawn as a clean ridge and not as a row of teeth.
      triangleCorners.push(a, a + 1, b + 1, a, b + 1, b);
    }
  }

  const shape = new BufferGeometry();
  shape.setAttribute('position', new BufferAttribute(positions, 3));
  shape.setIndex(triangleCorners);
  const bounds = new Sphere(
    new Vector3(middleX, layout.height, middleZ),
    radius + layout.roomForWaves,
  );
  shape.boundingSphere = bounds;
  const mesh = new Mesh(shape, material);
  // The frame step decides which strips are drawn.
  mesh.frustumCulled = false;
  return { mesh, bounds, triangles: triangleCorners.length / 3 };
}
