import { BufferGeometry, Float32BufferAttribute, SphereGeometry } from 'three';
import { smoothstep } from '../../core/maths';
import { joined, painted, shapedAndPainted, type Paint } from './painted-shapes';

type FishPaint = (x: number, y: number, part: number) => Paint;

const BODY = 0;
const TAIL = 1;
const FIN = 2;

/** A flat piece in the fish's middle plane: triangles of corners given as [x, y]. */
function flatPiece(
  corners: readonly (readonly [number, number])[],
  paint: FishPaint,
  part: number,
): BufferGeometry {
  const positions = corners.flatMap(([x, y]) => [x, y, 0]);
  const shape = new BufferGeometry();
  shape.setAttribute('position', new Float32BufferAttribute(positions, 3));
  shape.setAttribute('uv', new Float32BufferAttribute(new Float32Array(corners.length * 2), 2));
  return painted(shape, (x, y) => paint(x, y, part));
}

/**
 * A fish, nose towards +x, one unit long: a body deep in the middle and thin side to side, tapering
 * to the tail; a forked tail, a fin along the back and one under the belly. `bodyDepth` is how tall
 * the body is for its length; `paint` gives the brightness or the colour of each point of it, and
 * is told whether the point is on the body (0), the tail (1) or a fin (2).
 */
export function createFishModel(bodyDepth: number, paint: FishPaint): BufferGeometry {
  const h = 0.5 * bodyDepth;
  const body = shapedAndPainted(
    new SphereGeometry(0.5, 10, 6),
    (x, y, z) => {
      // x runs from -0.5 at the tail to 0.5 at the nose: fullest a little ahead of the middle, a
      // blunt head, a narrow tail stalk.
      const fullness =
        Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x - 0.08) / 0.6, 2.2)), 0.55) *
        (x < 0 ? 1 - 0.55 * smoothstep(-0.1, -0.5, x) : 1);
      return [x * 0.9 + 0.05, y * 2 * h * fullness, z * 0.26 * fullness * (0.6 + 0.4 * bodyDepth)];
    },
    (x, y) => paint(x, y, BODY),
  );
  const tail = flatPiece(
    [
      [-0.38, 0],
      [-0.62, 0.9 * h],
      [-0.5, 0],
      [-0.38, 0],
      [-0.5, 0],
      [-0.62, -0.9 * h],
    ],
    paint,
    TAIL,
  );
  const backFin = flatPiece(
    [
      [0.2, 0.9 * h],
      [-0.25, 0.55 * h],
      [-0.12, 1.35 * h],
      [0.2, 0.9 * h],
      [-0.12, 1.35 * h],
      [0.1, 1.2 * h],
    ],
    paint,
    FIN,
  );
  const bellyFin = flatPiece(
    [
      [0.0, -0.85 * h],
      [-0.28, -0.5 * h],
      [-0.18, -1.25 * h],
    ],
    paint,
    FIN,
  );
  return joined([body, tail, backFin, bellyFin]);
}
