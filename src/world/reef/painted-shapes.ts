import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import type { Random } from '../../core/random';

// The reef's models are made of simple shapes, each corner moved and painted with a colour, then
// joined into one model.

export type Triple = readonly [number, number, number];
/** A brightness, the same in red, green and blue, or a colour. */
export type Paint = number | Triple;
/** Where a corner of a shape goes, given where it is. */
export type Move = (x: number, y: number, z: number) => Triple;
/** The paint of a corner, given where it ended up. */
export type Painter = (x: number, y: number, z: number) => Paint;
/** A smooth field over space, from -1 to 1. */
export type LumpyField = (x: number, y: number, z: number) => number;

/** One model of the shapes' triangles, each corner with its position, normal, colour and uv. */
export function joined(shapes: readonly BufferGeometry[]): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colours: number[] = [];
  const uvs: number[] = [];
  for (const shape of shapes) {
    const corners = shape.index === null ? shape : shape.toNonIndexed();
    appendAll(positions, corners.getAttribute('position').array);
    appendAll(normals, corners.getAttribute('normal').array);
    appendAll(colours, corners.getAttribute('color').array);
    appendAll(uvs, corners.getAttribute('uv').array);
  }

  const model = new BufferGeometry();
  model.setAttribute('position', new Float32BufferAttribute(positions, 3));
  model.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  model.setAttribute('color', new Float32BufferAttribute(colours, 3));
  model.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  return model;
}

function appendAll(target: number[], values: ArrayLike<number>): void {
  for (const value of Array.from(values)) target.push(value);
}

/** Moves every corner of the shape and paints it, and works out its normals again. Returns the same shape. */
export function shapedAndPainted(
  shape: BufferGeometry,
  move: Move,
  paint: Painter,
): BufferGeometry {
  const position = shape.getAttribute('position');
  const colours: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const [x, y, z] = move(position.getX(i), position.getY(i), position.getZ(i));
    position.setXYZ(i, x, y, z);
    const colour = paint(x, y, z);
    if (typeof colour === 'number') colours.push(colour, colour, colour);
    else colours.push(...colour);
  }
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  shape.computeVertexNormals();
  return shape;
}

const unmoved: Move = (x, y, z) => [x, y, z];

/** Paints every corner of the shape, and works out its normals again. Returns the same shape. */
export function painted(shape: BufferGeometry, paint: Painter): BufferGeometry {
  return shapedAndPainted(shape, unmoved, paint);
}

interface Sine {
  phase: number;
  frequency: number;
}

interface Wave {
  alongX: Sine;
  alongY: Sine;
  alongZ: Sine;
}

function randomSine(random: Random): Sine {
  const phase = random() * 6.283;
  const frequency = 2 + random() * 5;
  return { phase, frequency };
}

/** A few waves with random phases: cheap, smooth, and different for every model. */
export function lumpyField(random: Random, waveCount: number): LumpyField {
  const waves: Wave[] = [];
  for (let i = 0; i < waveCount; i++) {
    const alongX = randomSine(random);
    const alongY = randomSine(random);
    const alongZ = randomSine(random);
    // A fourth is drawn and not used: the reef's stream of random numbers must stay as build 78's.
    randomSine(random);
    waves.push({ alongX, alongY, alongZ });
  }

  return (x, y, z) => {
    let sum = 0;
    for (const { alongX, alongY, alongZ } of waves) {
      sum +=
        Math.sin(x * alongX.frequency + alongX.phase) *
        Math.sin(y * alongY.frequency + alongY.phase) *
        Math.sin(z * alongZ.frequency + alongZ.phase);
    }
    return sum / waveCount;
  };
}

export interface Stick {
  length: number;
  footRadius: number;
  tipRadius: number;
  sides: number;
  /** It is painted from this brightness at its foot to `tipBrightness` at its tip. */
  footBrightness: number;
  tipBrightness: number;
  /** Closed at both ends, or an open tube. */
  capped: boolean;
}

/**
 * Adds to `parts` a tapering stick that stands on `foot` and points along `direction` (of any
 * length). Returns where its tip is.
 */
export function addStick(
  parts: BufferGeometry[],
  foot: Triple,
  direction: Triple,
  stick: Stick,
): Triple {
  const { length, footRadius, tipRadius, sides, footBrightness, tipBrightness, capped } = stick;
  const [dx, dy, dz] = direction;
  // Divided, not Vector3's normalize, which multiplies by the inverse length: its numbers differ
  // slightly from build 78's, and the corals must come out exactly the same.
  const directionLength = Math.hypot(dx, dy, dz);
  const ux = dx / directionLength;
  const uy = dy / directionLength;
  const uz = dz / directionLength;

  const shape = new CylinderGeometry(tipRadius, footRadius, length, sides, 1, !capped);
  shape.translate(0, length / 2, 0);
  painted(shape, (x, y) => footBrightness + ((tipBrightness - footBrightness) * y) / length);
  const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(ux, uy, uz));
  shape.applyMatrix4(new Matrix4().compose(new Vector3(...foot), turn, new Vector3(1, 1, 1)));
  parts.push(shape);

  return [foot[0] + ux * length, foot[1] + uy * length, foot[2] + uz * length];
}
