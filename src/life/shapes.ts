import { BufferGeometry, Euler, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three';

// The animals are put together from a few simple shapes, each moved into place and then joined
// into one model.

export type Triple = readonly [number, number, number];

const UNMOVED: Triple = [0, 0, 0];
const FULL_SIZE: Triple = [1, 1, 1];

/** Moves the shape, after scaling and turning it (radians about x, y, z). Returns the same shape. */
export function placed(
  shape: BufferGeometry,
  position: Triple,
  scale: Triple = FULL_SIZE,
  turn: Triple = UNMOVED,
): BufferGeometry {
  const matrix = new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromEuler(new Euler(...turn)),
    new Vector3(...scale),
  );
  return shape.applyMatrix4(matrix);
}

/** One model of the shapes' corners and facings; whatever else the shapes carry is left behind. */
export function merged(shapes: BufferGeometry[]): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const cornerOrder: number[] = [];
  let cornersSoFar = 0;

  for (const shape of shapes) {
    if (!shape.hasAttribute('normal')) shape.computeVertexNormals();
    const position = shape.getAttribute('position').array;
    const normal = shape.getAttribute('normal').array;
    for (let i = 0; i < position.length; i++) {
      positions.push(position[i]);
      normals.push(normal[i]);
    }

    const corners = position.length / 3;
    if (shape.index === null) {
      for (let i = 0; i < corners; i++) cornerOrder.push(cornersSoFar + i);
    } else {
      for (const corner of Array.from(shape.index.array)) {
        cornerOrder.push(corner + cornersSoFar);
      }
    }
    cornersSoFar += corners;
  }

  const model = new BufferGeometry();
  model.setAttribute('position', new Float32BufferAttribute(positions, 3));
  model.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  model.setIndex(cornerOrder);
  return model;
}

/** `positions` is x, y, z for each corner; `cornerOrder` takes them three at a time as triangles. */
export function shapeFrom(positions: number[], cornerOrder: number[]): BufferGeometry {
  const shape = new BufferGeometry();
  shape.setAttribute('position', new Float32BufferAttribute(positions, 3));
  shape.setIndex(cornerOrder);
  shape.computeVertexNormals();
  return shape;
}

/** A body that tapers to a point at each end, lying along x and fullest ahead of its middle. */
export function spindle(
  length: number,
  halfWidth: number,
  halfHeight: number,
  segments: number,
  cornersPerRing: number,
): BufferGeometry {
  const positions: number[] = [];
  const cornerOrder: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const along = i / segments;
    const fullness = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(along, 0.75))), 0.7);
    for (let j = 0; j < cornersPerRing; j++) {
      const angle = (j / cornersPerRing) * 2 * Math.PI;
      positions.push(
        (along - 0.5) * length,
        Math.cos(angle) * halfHeight * fullness,
        Math.sin(angle) * halfWidth * fullness,
      );
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < cornersPerRing; j++) {
      const next = (j + 1) % cornersPerRing;
      const a = i * cornersPerRing + j;
      const b = i * cornersPerRing + next;
      const c = (i + 1) * cornersPerRing + j;
      const d = (i + 1) * cornersPerRing + next;
      cornerOrder.push(a, c, b, b, c, d);
    }
  }
  return shapeFrom(positions, cornerOrder);
}

export function triangle(a: Triple, b: Triple, c: Triple): BufferGeometry {
  return shapeFrom([...a, ...b, ...c], [0, 1, 2]);
}

/** A five-pointed star lying flat, raised to `height` at its middle. */
export function star(outerRadius: number, innerRadius: number, height: number): BufferGeometry {
  const POINTS_AND_NOTCHES = 10;
  const positions = [0, height, 0];
  const cornerOrder: number[] = [];

  for (let k = 0; k < POINTS_AND_NOTCHES; k++) {
    const radius = k % 2 === 0 ? outerRadius : innerRadius;
    const angle = (k / POINTS_AND_NOTCHES) * 2 * Math.PI;
    positions.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }
  for (let k = 0; k < POINTS_AND_NOTCHES; k++) {
    cornerOrder.push(0, 1 + ((k + 1) % POINTS_AND_NOTCHES), 1 + k);
  }
  return shapeFrom(positions, cornerOrder);
}
