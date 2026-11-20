import { within, type Random, type Range } from '../../core/random';

/** The shape of one piece of gravel seen from above, measured in dots from its middle. */
export interface Outline {
  /** How far a point lies outside the outline (below 0: inside), at least roughly, in dots. */
  distanceAt: (x: number, y: number) => number;
  /**
   * Writes into `span` the stretch of the row at `y` that comes within `margin` of the outline,
   * or a little more: the dots outside it need not be looked at. A row that misses the outline
   * gets a stretch whose right end lies before its left.
   */
  rowSpan: (y: number, margin: number, span: Float64Array) => void;
  /** Writes into `into` the distances at `count` points one dot apart along the row at `y`, from `firstX`. */
  distancesAlongRow: (y: number, firstX: number, count: number, into: Float64Array) => void;
  /** No part of the piece lies further than this from its middle. */
  reach: number;
  /** How far in from its edge its top begins: the width of the rounding of its sides. */
  thickness: number;
  /** In square dots. */
  area: number;
}

const FULL_TURN = 2 * Math.PI;
// How far each side of a polygon may turn from its even place round the piece, as a share of
// the turn between two sides: less than a half keeps every polygon closed.
const SIDE_WANDER = 0.35;
const NEARLY_NOTHING = 1e-9;

/**
 * A broken piece: the space inside a few lines laid at random round an oval of the given
 * half-length and half-width, so that no two come out alike and none comes out round. Its
 * corners are worn round over `roundness` of its half-width.
 */
export function createPolygon(
  random: Random,
  halfLength: number,
  halfWidth: number,
  sides: number,
  roundness: number,
): Outline {
  const turn = random() * FULL_TURN;
  const turnCos = Math.cos(turn);
  const turnSin = Math.sin(turn);
  const wear = Math.max(NEARLY_NOTHING, roundness * halfWidth);
  const normalX: number[] = [];
  const normalY: number[] = [];
  const offset: number[] = [];
  for (let side = 0; side < sides; side++) {
    const facing = (FULL_TURN * (side + SIDE_WANDER * (2 * random() - 1))) / sides;
    const facingCos = Math.cos(facing);
    const facingSin = Math.sin(facing);
    // How far the oval reaches in that direction, give or take.
    const alongReach = halfLength * facingCos;
    const acrossReach = halfWidth * facingSin;
    const ovalReach = Math.sqrt(alongReach * alongReach + acrossReach * acrossReach);
    offset.push(ovalReach * within(random, [0.82, 1.08]));
    normalX.push(facingCos * turnCos - facingSin * turnSin);
    normalY.push(facingSin * turnCos + facingCos * turnSin);
  }

  let reach = 0;
  let doubleArea = 0;
  let previousX = 0;
  let previousY = 0;
  for (let side = 0; side <= sides; side++) {
    const one = side % sides;
    const next = (side + 1) % sides;
    const determinant = normalX[one] * normalY[next] - normalY[one] * normalX[next];
    const cornerX = (offset[one] * normalY[next] - offset[next] * normalY[one]) / determinant;
    const cornerY = (normalX[one] * offset[next] - normalX[next] * offset[one]) / determinant;
    reach = Math.max(reach, Math.sqrt(cornerX * cornerX + cornerY * cornerY));
    if (side > 0) doubleArea += previousX * cornerY - cornerX * previousY;
    previousX = cornerX;
    previousY = cornerY;
  }

  const perNormalX = normalX.map((x) => 1 / x);
  // How far beyond each side the start of a row lies.
  const beyondAtRowStart = offset.slice();
  const beyond = (side: number, x: number, y: number): number =>
    normalX[side] * x + normalY[side] * y - offset[side];
  // A point lies beyond the polygon as far as it lies beyond its furthest side; near a corner
  // two sides are nearly level, and a smooth maximum of the two wears the corner round.
  const wornDistance = (furthest: number, next: number): number => {
    const level = Math.max(0, wear - (furthest - next));
    return furthest + (level * level) / (4 * wear);
  };

  return {
    distanceAt(x, y) {
      let furthest = -Infinity;
      let next = -Infinity;
      for (let side = 0; side < sides; side++) {
        const beyondSide = beyond(side, x, y);
        next = Math.max(next, Math.min(furthest, beyondSide));
        furthest = Math.max(furthest, beyondSide);
      }
      return wornDistance(furthest, next);
    },
    distancesAlongRow(y, firstX, count, into) {
      for (let side = 0; side < sides; side++) beyondAtRowStart[side] = beyond(side, firstX, y);
      for (let step = 0; step < count; step++) {
        let furthest = -Infinity;
        let next = -Infinity;
        for (let side = 0; side < sides; side++) {
          const beyondSide = beyondAtRowStart[side] + normalX[side] * step;
          next = Math.max(next, Math.min(furthest, beyondSide));
          furthest = Math.max(furthest, beyondSide);
        }
        into[step] = wornDistance(furthest, next);
      }
    },
    rowSpan(y, margin, span) {
      let left = -Infinity;
      let right = Infinity;
      for (let side = 0; side < sides; side++) {
        // Along the row, this side's distance is normalX * x plus what the row leaves.
        const room = margin + offset[side] - normalY[side] * y;
        if (normalX[side] > NEARLY_NOTHING) right = Math.min(right, room * perNormalX[side]);
        else if (normalX[side] < -NEARLY_NOTHING) left = Math.max(left, room * perNormalX[side]);
        else if (room <= 0) right = left - 1;
      }
      span[0] = left;
      span[1] = right;
    },
    reach,
    thickness: Math.min(...offset),
    area: Math.abs(doubleArea) / 2,
  };
}

/** A lump of massive coral or reef rock: a broken piece with one or two smaller ones grown onto it. */
export function createLump(random: Random, size: number, roundness: number): Outline {
  const half = size / 2;
  const sides = 5 + Math.floor(random() * 3);
  const body = createPolygon(random, half, half * within(random, [0.5, 0.85]), sides, roundness);
  const parts = [body];
  const partSpan = new Float64Array(2);
  let partRow = new Float64Array(0);
  const shiftX = [0];
  const shiftY = [0];
  let reach = body.reach;
  let area = body.area;
  const lobes = 1 + Math.floor(random() * 2);
  for (let lobe = 0; lobe < lobes; lobe++) {
    const lobeHalf = half * within(random, [0.4, 0.65]);
    const lobeSides = 4 + Math.floor(random() * 2);
    const part = createPolygon(
      random,
      lobeHalf,
      lobeHalf * within(random, [0.6, 1]),
      lobeSides,
      roundness,
    );
    const direction = random() * FULL_TURN;
    const shift = half * within(random, [0.3, 0.55]);
    parts.push(part);
    shiftX.push(shift * Math.cos(direction));
    shiftY.push(shift * Math.sin(direction));
    reach = Math.max(reach, shift + part.reach);
    area += part.area * 0.5;
  }

  return {
    distanceAt(x, y) {
      let distance = Infinity;
      for (let part = 0; part < parts.length; part++) {
        distance = Math.min(distance, parts[part].distanceAt(x - shiftX[part], y - shiftY[part]));
      }
      return distance;
    },
    distancesAlongRow(y, firstX, count, into) {
      if (partRow.length < count) partRow = new Float64Array(count);
      into.fill(Infinity, 0, count);
      for (let part = 0; part < parts.length; part++) {
        parts[part].distancesAlongRow(y - shiftY[part], firstX - shiftX[part], count, partRow);
        for (let step = 0; step < count; step++) into[step] = Math.min(into[step], partRow[step]);
      }
    },
    rowSpan(y, margin, span) {
      let left = Infinity;
      let right = -Infinity;
      for (let part = 0; part < parts.length; part++) {
        parts[part].rowSpan(y - shiftY[part], margin, partSpan);
        if (partSpan[1] < partSpan[0]) continue;

        left = Math.min(left, partSpan[0] + shiftX[part]);
        right = Math.max(right, partSpan[1] + shiftX[part]);
      }
      span[0] = left;
      span[1] = right;
    },
    reach,
    thickness: body.thickness,
    area,
  };
}

export interface FingerShape {
  length: number;
  thickness: number;
  bend: number;
  forked: boolean;
}

/**
 * A broken finger of branching coral, in dots: a bent spine of two lengths, thick as the
 * finger and swelling or narrowing a little along it, sometimes with a stub of a branch.
 */
export function createFinger(random: Random, shape: FingerShape): Outline {
  const { length, thickness, bend, forked } = shape;
  const turn = random() * FULL_TURN;
  const alongX = Math.cos(turn);
  const alongY = Math.sin(turn);
  // The spine: from one end, through a middle pushed sideways, to the other; then the branch.
  const spineX = [-0.5 * length, 0.1 * length * (2 * random() - 1), 0.5 * length];
  const spineY = [0, bend * length * (2 * random() - 1), 0];
  const radii = Array.from({ length: 3 }, () => (thickness / 2) * within(random, [0.8, 1.15]));
  const segmentFrom = [0, 1];
  const segmentTo = [1, 2];
  if (forked) {
    const branchTurn = (random() < 0.5 ? -1 : 1) * within(random, [0.5, 0.95]);
    const branchLength = length * within(random, [0.25, 0.4]);
    spineX.push(spineX[1] + branchLength * Math.cos(branchTurn));
    spineY.push(spineY[1] + branchLength * Math.sin(branchTurn));
    radii.push(radii[1] * 0.85);
    segmentFrom.push(1);
    segmentTo.push(3);
  }
  for (let point = 0; point < spineX.length; point++) {
    const x = spineX[point];
    spineX[point] = x * alongX - spineY[point] * alongY;
    spineY[point] = x * alongY + spineY[point] * alongX;
  }
  const stretchX = segmentFrom.map((from, segment) => spineX[segmentTo[segment]] - spineX[from]);
  const stretchY = segmentFrom.map((from, segment) => spineY[segmentTo[segment]] - spineY[from]);
  const perSquaredLength = stretchX.map(
    (x, segment) => 1 / (x * x + stretchY[segment] * stretchY[segment]),
  );

  let reach = 0;
  const widest = Math.max(...radii);
  for (let point = 0; point < spineX.length; point++) {
    reach = Math.max(reach, Math.hypot(spineX[point], spineY[point]) + radii[point]);
  }
  const leftmost = Math.min(...spineX) - widest;
  const rightmost = Math.max(...spineX) + widest;
  const topmost = Math.min(...spineY) - widest;
  const bottommost = Math.max(...spineY) + widest;

  const distanceAt = (x: number, y: number): number => {
    let distance = Infinity;
    for (let segment = 0; segment < segmentFrom.length; segment++) {
      const from = segmentFrom[segment];
      const towardsX = x - spineX[from];
      const towardsY = y - spineY[from];
      const along =
        (towardsX * stretchX[segment] + towardsY * stretchY[segment]) * perSquaredLength[segment];
      const share = Math.min(1, Math.max(0, along));
      const awayX = towardsX - stretchX[segment] * share;
      const awayY = towardsY - stretchY[segment] * share;
      const radius = radii[from] + (radii[segmentTo[segment]] - radii[from]) * share;
      distance = Math.min(distance, Math.sqrt(awayX * awayX + awayY * awayY) - radius);
    }
    return distance;
  };

  return {
    distanceAt,
    distancesAlongRow(y, firstX, count, into) {
      for (let step = 0; step < count; step++) into[step] = distanceAt(firstX + step, y);
    },
    rowSpan(y, margin, span) {
      const missed = y < topmost - margin || y > bottommost + margin;
      span[0] = leftmost - margin;
      span[1] = missed ? span[0] - 1 : rightmost + margin;
    },
    reach,
    thickness: thickness / 2,
    area: (length + (forked ? 0.33 * length : 0)) * thickness,
  };
}

/** A size between the two ends of a range, small ones the more common, as among broken stones. */
export function sizeWithin(random: Random, [smallest, largest]: Range): number {
  return smallest * (largest / smallest) ** random();
}
