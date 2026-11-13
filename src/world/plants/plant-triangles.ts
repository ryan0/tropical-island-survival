import { BufferGeometry, Float32BufferAttribute } from 'three';
import { ATLAS_REGIONS, type AtlasRegion } from './leaf-atlas';

// The plants are made of loose triangles, every corner with its own texture coordinates, normal
// and colour.

export type Triple = readonly [number, number, number];
/** How bright a corner is: one number for red, green and blue alike, or a colour. */
export type Shade = number | Triple;

/**
 * A corner of a triangle: where it is, where it reads its picture, which way it faces, and how
 * bright it is (1 if left out).
 */
export type Corner = readonly [
  x: number,
  y: number,
  z: number,
  u: number,
  v: number,
  normalX: number,
  normalY: number,
  normalZ: number,
  shade?: Shade,
];

/** A row across a leaf: one edge, the midrib, the other edge. */
export type LeafRow = readonly [Corner, Corner, Corner];

export interface Triangles {
  /** Without a region, the corners' texture coordinates are kept as they are. */
  add(a: Corner, b: Corner, c: Corner, region?: AtlasRegion): void;
  geometry(): BufferGeometry;
}

/** A plant's triangles in full, and for its simpler shape. */
export interface BothLevels {
  full: Triangles;
  simpler: Triangles;
}

export function createTriangles(): Triangles {
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const colours: number[] = [];

  function addCorner(corner: Corner, region: AtlasRegion | undefined): void {
    const [x, y, z, u, v, normalX, normalY, normalZ, shade = 1] = corner;
    const colour: Triple = typeof shade === 'number' ? [shade, shade, shade] : shade;
    const uv = region === undefined ? [u, v] : ATLAS_REGIONS[region](u, v);
    positions.push(x, y, z);
    uvs.push(uv[0], uv[1]);
    normals.push(normalX, normalY, normalZ);
    colours.push(colour[0], colour[1], colour[2]);
  }

  return {
    add(a, b, c, region) {
      addCorner(a, region);
      addCorner(b, region);
      addCorner(c, region);
    },
    geometry() {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
      geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
      return geometry;
    },
  };
}

/** The strip of a leaf between two rows across it, as four triangles. */
export function addLeafStrip(triangles: Triangles, previous: LeafRow, row: LeafRow): void {
  triangles.add(previous[0], previous[1], row[1]);
  triangles.add(previous[0], row[1], row[0]);
  triangles.add(previous[1], previous[2], row[2]);
  triangles.add(previous[1], row[2], row[1]);
}

/**
 * The triangles of a ball whose corners are listed ring by ring from the top, `segments + 1` to a
 * ring (the last of each in the same place as the first).
 */
export function addBallTriangles(
  corners: readonly Corner[],
  segments: number,
  rings: number,
  add: (a: Corner, b: Corner, c: Corner) => void,
): void {
  for (let ring = 0; ring < rings; ring++) {
    for (let segment = 0; segment < segments; segment++) {
      const o = ring * (segments + 1) + segment;
      add(corners[o], corners[o + 1], corners[o + segments + 1]);
      add(corners[o + 1], corners[o + segments + 2], corners[o + segments + 1]);
    }
  }
}
