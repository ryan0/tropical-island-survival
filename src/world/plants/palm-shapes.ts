import {
  BufferGeometry,
  Float32BufferAttribute,
  QuadraticBezierCurve3,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { palmsConfig, type TrunkConfig, type TrunkDetail } from './palms-config';

type Rgb = readonly [number, number, number];

export interface ColouredShape {
  shape: BufferGeometry;
  /** The colour its picture is multiplied by. */
  colour: Rgb;
}

const TRUNK_RADIUS = 0.2;
/** The bark is drawn as its picture is. */
const WOOD: Rgb = [1, 1, 1];

/**
 * The strip a frond's picture is on, in `pieces` along its length. It arches up from the crown
 * and droops at the tip, its two halves hanging down from the midrib.
 */
export function createFrondShape(pieces: number): BufferGeometry {
  const { length, halfWidth } = palmsConfig.fronds;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= pieces; j++) {
    const u = j / pieces;
    const x = length * (u - 0.1 * u * u * u);
    const y = length * (0.46 * u - 0.64 * u * u);
    const width = halfWidth * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, 0.15 + 0.8 * u)));
    // The two halves hang a little from the midrib, more towards the tip.
    const hang = 0.26 + 0.4 * u;
    positions.push(x, y - hang * width, -width, x, y, 0, x, y - hang * width, width);
    uvs.push(u, 0, u, 0.5, u, 1);
  }
  // Each piece is four triangles between two rows of three corners: edge, midrib, edge.
  for (let j = 0; j < pieces; j++) {
    const a = j * 3;
    indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
  }
  const shape = new BufferGeometry();
  shape.setAttribute('position', new Float32BufferAttribute(positions, 3));
  shape.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  return shape;
}

/** One of the coconuts under the crown, the `n`th round the trunk from its top. */
function createCoconut(top: TrunkConfig['top'], n: number, detail: TrunkDetail): BufferGeometry {
  const { radius, tallness, apart, out, belowTop } = palmsConfig.coconuts;
  const coconut = new SphereGeometry(
    radius,
    detail.coconutSegmentsRound,
    detail.coconutSegmentsDown,
  );
  coconut.scale(1, tallness, 1);
  coconut.translate(
    top[0] + Math.cos(n * apart) * out,
    top[1] - belowTop,
    Math.sin(n * apart) * out,
  );
  // It takes one colour, from the middle of the bark picture.
  const uv = coconut.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, 0.5);
  return coconut;
}

/** A trunk, standing on its foot at the origin, with its coconuts as part of the same shape. */
export function createTrunkShape(trunk: TrunkConfig, detail: TrunkDetail): BufferGeometry {
  const { foot, bend, top, girth } = trunk;
  const { segmentsAlong, segmentsRound } = detail;
  const line = new QuadraticBezierCurve3(
    new Vector3(foot[0], foot[1], 0),
    new Vector3(bend[0], bend[1], 0),
    new Vector3(top[0], top[1], 0),
  );
  const tube = new TubeGeometry(line, segmentsAlong, TRUNK_RADIUS, segmentsRound, false);
  const position = tube.attributes.position;
  const middle = new Vector3();
  for (let i = 0; i < position.count; i++) {
    const u = Math.min(1, Math.floor(i / (segmentsRound + 1)) / segmentsAlong);
    line.getPointAt(u, middle);
    // A swollen foot, and a boss of fibre and old leaf bases under the crown.
    const thickness = girth * (1.25 - 0.62 * u + Math.exp(-u * 16) + 0.75 * Math.exp(-(1 - u) * 9));
    position.setXYZ(
      i,
      middle.x + (position.getX(i) - middle.x) * thickness,
      middle.y + (position.getY(i) - middle.y) * thickness,
      middle.z + (position.getZ(i) - middle.z) * thickness,
    );
  }
  // (The tube's own normals are kept: recomputed, they leave a hard light and dark seam down one side.)

  const parts: ColouredShape[] = [{ shape: tube, colour: WOOD }];
  for (let n = 0; n < palmsConfig.coconuts.count; n++) {
    parts.push({ shape: createCoconut(top, n, detail), colour: palmsConfig.coconuts.colour });
  }
  return joinShapes(parts);
}

/** One shape of loose triangles made of several, each part with its colour on its corners. */
export function joinShapes(parts: readonly ColouredShape[]): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colours: number[] = [];
  for (const { shape, colour } of parts) {
    const triangles = shape.index === null ? shape : shape.toNonIndexed();
    const corners = triangles.attributes.position.array;
    positions.push(...Array.from(corners));
    normals.push(...Array.from(triangles.attributes.normal.array));
    uvs.push(...Array.from(triangles.attributes.uv.array));
    for (let i = 0; i < corners.length; i += 3) colours.push(colour[0], colour[1], colour[2]);
  }
  const joined = new BufferGeometry();
  joined.setAttribute('position', new Float32BufferAttribute(positions, 3));
  joined.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  joined.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  joined.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return joined;
}
