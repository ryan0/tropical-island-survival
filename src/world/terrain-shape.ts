import { BufferAttribute, BufferGeometry } from 'three';
import type { GroundHeight } from './landmarks';
import { worldConfig } from './world-config';

// The ground's shape: a grid of squares over the island and its reef, each corner at the height
// the island's shape gives it. Where the shape bends more sharply than a square can follow (the
// walls of the reef's grooves, the edges of its notches and of the pass) a square is cut into
// four. Nearly half of the grid is the flat sea floor beyond the reef: those squares are left
// out and the whole floor is drawn as one big rectangle instead, which saves about 60,000
// triangles every frame.

const config = worldConfig.terrain;
const cornersAcross = config.squares + 1;
const squareSide = config.size / config.squares;
// The corners of the small squares lie on a grid twice as fine: places on it are counted in
// half squares.
const halfCornersAcross = 2 * config.squares + 1;

/** How far across the ground a count of half squares lies, from its middle. */
function metresAt(halfSquares: number): number {
  return -config.size / 2 + (halfSquares * squareSide) / 2;
}

/**
 * How sharply the ground bends at each corner of the grid: how far the corner stands above or
 * below the middle of its two neighbours, along the grid and across its diagonals.
 */
function bendAtCorners(heights: Float32Array): Float32Array {
  const last = cornersAcross - 1;
  const heightAt = (row: number, column: number) =>
    heights[Math.min(last, Math.max(0, row)) * cornersAcross + Math.min(last, Math.max(0, column))];
  const bends = new Float32Array(heights.length);
  for (let row = 0; row < cornersAcross; row++) {
    for (let column = 0; column < cornersAcross; column++) {
      const twice = 2 * heightAt(row, column);
      bends[row * cornersAcross + column] = Math.max(
        Math.abs(heightAt(row, column - 1) + heightAt(row, column + 1) - twice),
        Math.abs(heightAt(row - 1, column) + heightAt(row + 1, column) - twice),
        Math.abs(heightAt(row - 1, column - 1) + heightAt(row + 1, column + 1) - twice) / 2,
        Math.abs(heightAt(row - 1, column + 1) + heightAt(row + 1, column - 1) - twice) / 2,
      );
    }
  }
  return bends;
}

/** The ground as a shape: its corners (`position`), where each lies on the grit picture (`uv`), and its triangles. */
export function createTerrainShape(groundHeight: GroundHeight): BufferGeometry {
  // x, y, z of every corner: the grid's own first, in rows, then the small squares' as they are made.
  const corners: number[] = [];
  const heights = new Float32Array(cornersAcross * cornersAcross);
  for (let row = 0; row < cornersAcross; row++) {
    for (let column = 0; column < cornersAcross; column++) {
      const x = metresAt(2 * column);
      const z = metresAt(2 * row);
      const height = groundHeight(x, z);
      heights[row * cornersAcross + column] = height;
      corners.push(x, height, z);
    }
  }

  const bends = bendAtCorners(heights);
  const ofCorners = (values: Float32Array, row: number, column: number) => {
    const first = row * cornersAcross + column;
    return Math.max(
      values[first],
      values[first + 1],
      values[first + cornersAcross],
      values[first + cornersAcross + 1],
    );
  };
  const isOnGrid = (row: number, column: number) =>
    row >= 0 && row < config.squares && column >= 0 && column < config.squares;
  /** A square is drawn if any of it stands above the sea floor. */
  const isDrawn = (row: number, column: number) =>
    isOnGrid(row, column) && ofCorners(heights, row, column) > config.seaFloor;
  const isCutInFour = (row: number, column: number) =>
    isDrawn(row, column) && ofCorners(bends, row, column) > config.cutInFourWhereBendsOver;

  const madeCorners = new Map<number, number>();
  /** The corner at a place counted in half squares, made when it is first asked for. */
  function cornerAt(halfColumn: number, halfRow: number): number {
    if (halfColumn % 2 === 0 && halfRow % 2 === 0) {
      return (halfRow / 2) * cornersAcross + halfColumn / 2;
    }
    const place = halfRow * halfCornersAcross + halfColumn;
    const made = madeCorners.get(place);
    if (made !== undefined) return made;

    const x = metresAt(halfColumn);
    const z = metresAt(halfRow);
    const corner = corners.length / 3;
    corners.push(x, groundHeight(x, z), z);
    madeCorners.set(place, corner);
    return corner;
  }

  const cornerOrder: number[] = [];
  /** A triangle that faces up, whichever way round its corners are given. */
  function addTriangle(a: number, b: number, c: number): void {
    const alongX = corners[b * 3] - corners[a * 3];
    const alongZ = corners[b * 3 + 2] - corners[a * 3 + 2];
    const acrossX = corners[c * 3] - corners[a * 3];
    const acrossZ = corners[c * 3 + 2] - corners[a * 3 + 2];
    if (alongZ * acrossX - alongX * acrossZ > 0) cornerOrder.push(a, b, c);
    else cornerOrder.push(a, c, b);
  }

  /** A square as two triangles, its sides `halves` half squares long. */
  function addSquare(halfColumn: number, halfRow: number, halves: number): void {
    const nearLeft = cornerAt(halfColumn, halfRow);
    const nearRight = cornerAt(halfColumn + halves, halfRow);
    const farLeft = cornerAt(halfColumn, halfRow + halves);
    const farRight = cornerAt(halfColumn + halves, halfRow + halves);
    addTriangle(nearLeft, farLeft, nearRight);
    addTriangle(farLeft, farRight, nearRight);
  }

  /**
   * A whole square beside a cut one: a fan of triangles round its middle, which takes in the
   * cut neighbour's corner halfway along the side they share, so that no gap can open there.
   */
  function addSquareBesideCutOnes(row: number, column: number): void {
    const left = 2 * column;
    const near = 2 * row;
    const rim = [cornerAt(left, near)];
    if (isCutInFour(row - 1, column)) rim.push(cornerAt(left + 1, near));
    rim.push(cornerAt(left + 2, near));
    if (isCutInFour(row, column + 1)) rim.push(cornerAt(left + 2, near + 1));
    rim.push(cornerAt(left + 2, near + 2));
    if (isCutInFour(row + 1, column)) rim.push(cornerAt(left + 1, near + 2));
    rim.push(cornerAt(left, near + 2));
    if (isCutInFour(row, column - 1)) rim.push(cornerAt(left, near + 1));
    const middle = cornerAt(left + 1, near + 1);
    rim.forEach((corner, i) => {
      addTriangle(middle, corner, rim[(i + 1) % rim.length]);
    });
  }

  for (let row = 0; row < config.squares; row++) {
    for (let column = 0; column < config.squares; column++) {
      if (!isDrawn(row, column)) continue;

      if (isCutInFour(row, column)) {
        for (const [right, far] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ]) {
          addSquare(2 * column + right, 2 * row + far, 1);
        }
      } else if (
        isCutInFour(row - 1, column) ||
        isCutInFour(row, column + 1) ||
        isCutInFour(row + 1, column) ||
        isCutInFour(row, column - 1)
      ) {
        addSquareBesideCutOnes(row, column);
      } else {
        addSquare(2 * column, 2 * row, 2);
      }
    }
  }
  // The sea floor: one rectangle from the grid's four outermost corners.
  const lastRow = cornersAcross * (cornersAcross - 1);
  addTriangle(0, lastRow, cornersAcross - 1);
  addTriangle(lastRow, lastRow + cornersAcross - 1, cornersAcross - 1);

  // The grit picture lies across the whole square of ground, as it would across a flat sheet.
  const onGritPicture = new Float32Array((corners.length / 3) * 2);
  for (let corner = 0; corner < corners.length / 3; corner++) {
    onGritPicture[corner * 2] = corners[corner * 3] / config.size + 0.5;
    onGritPicture[corner * 2 + 1] = 0.5 - corners[corner * 3 + 2] / config.size;
  }

  const shape = new BufferGeometry();
  shape.setAttribute('position', new BufferAttribute(new Float32Array(corners), 3));
  shape.setAttribute('uv', new BufferAttribute(onGritPicture, 2));
  shape.setIndex(cornerOrder);
  return shape;
}
