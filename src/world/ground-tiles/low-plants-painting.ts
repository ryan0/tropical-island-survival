import type { Stem } from './low-plants-growth';
import { OUTLINE_STEPS, type Leaf } from './low-plants-leaves';
import { lowPlantsTileConfig } from './low-plants-tile-config';

// The plants are painted dot by dot into an array rather than on a canvas: a canvas keeps colour
// multiplied by alpha, which loses it where alpha (the rank) is low, and drawing thousands of
// leaves on one and reading it back took twice the time allowed.

const { size: SIZE, shading } = lowPlantsTileConfig;
const WRAP = SIZE - 1;
// A midrib is this many dots either side of the middle of a leaf, and runs between these steps
// of its outline.
const MIDRIB_REACH = 0.8;
const MIDRIB_FROM = 0.03 * OUTLINE_STEPS;
const MIDRIB_TO = 0.9 * OUTLINE_STEPS;
// Leaves shorter than this many dots show no midrib.
const SHORTEST_WITH_MIDRIB = 12;
// Leaves shorter than this many dots leave a narrower rim, in step with their size.
const SHORTEST_WITH_FULL_RIM = 18;

/**
 * What the painting holds for each dot, side by side so that painting a dot touches one place
 * in memory: its red, green and blue, each multiplied by how much of the dot is covered; how
 * much is covered, 0 to 1; and the rank of the plant that shows there, blended with what lies
 * under it at an edge.
 */
export const RED = 0;
export const GREEN = 1;
export const BLUE = 2;
export const COVERED = 3;
export const RANK = 4;
export const VALUES_A_DOT = 5;

/** The tile as it is painted, plant over plant. All of it wraps at the edges. */
export interface Painting {
  dots: Float32Array;
  /** For each step of a leaf's outline, what turns a distance across into a distance to the edge. */
  slopeFactors: Float32Array;
}

export function createPainting(): Painting {
  return {
    dots: new Float32Array(SIZE * SIZE * VALUES_A_DOT),
    slopeFactors: new Float32Array(OUTLINE_STEPS + 1),
  };
}

/**
 * Lays a colour over `share` of a dot. The dot keeps the higher of its rank and the new one,
 * so that a stem of a higher plant under a leaf of a lower one still shows whole.
 */
function paintDot(
  dots: Float32Array,
  at: number,
  share: number,
  red: number,
  green: number,
  blue: number,
  rank: number,
): void {
  dots[at + RED] += (red - dots[at + RED]) * share;
  dots[at + GREEN] += (green - dots[at + GREEN]) * share;
  dots[at + BLUE] += (blue - dots[at + BLUE]) * share;
  dots[at + COVERED] += (1 - dots[at + COVERED]) * share;
  const blendedRank = dots[at + RANK] + (rank - dots[at + RANK]) * share;
  if (blendedRank > dots[at + RANK]) dots[at + RANK] = blendedRank;
}

/**
 * A stem, a little lighter along its middle since it is round. Stems are all painted before any
 * leaf, since every leaf stands above the ground on its stalk; and so they cast no rim, which
 * would fall only on other stems.
 */
export function paintStem({ dots }: Painting, stem: Stem, rank: number): void {
  const { points } = stem;
  const [red, green, blue] = stem.colour;
  const halfWidth = stem.width / 2;
  const reach = halfWidth + 0.5;
  const reachSquared = reach * reach;
  for (let at = 0; at + 3 < points.length; at += 2) {
    const startX = points[at];
    const startY = points[at + 1];
    const alongX = points[at + 2] - startX;
    const alongY = points[at + 3] - startY;
    const lengthSquared = alongX * alongX + alongY * alongY || 1;
    const top = Math.floor(Math.min(startY, startY + alongY) - reach);
    const bottom = Math.ceil(Math.max(startY, startY + alongY) + reach);
    const leftmost = Math.min(startX, startX + alongX) - reach;
    const rightmost = Math.max(startX, startX + alongX) + reach;
    // Each row crosses the strip within `reach` of the stem's line over this much of x.
    const isLevel = Math.abs(alongY) < 1e-3;
    const stripHalfWidth = isLevel
      ? Infinity
      : (reach * Math.sqrt(lengthSquared)) / Math.abs(alongY);
    for (let y = top; y <= bottom; y++) {
      const fromStartY = y + 0.5 - startY;
      const lineX = isLevel ? startX : startX + (fromStartY * alongX) / alongY;
      const left = Math.floor(Math.max(leftmost, lineX - stripHalfWidth));
      const right = Math.ceil(Math.min(rightmost, lineX + stripHalfWidth));
      const row = (y & WRAP) * SIZE;
      for (let x = left; x <= right; x++) {
        const fromStartX = x + 0.5 - startX;
        let along = (fromStartX * alongX + fromStartY * alongY) / lengthSquared;
        along = along < 0 ? 0 : along > 1 ? 1 : along;
        const acrossX = fromStartX - along * alongX;
        const acrossY = fromStartY - along * alongY;
        const acrossSquared = acrossX * acrossX + acrossY * acrossY;
        if (acrossSquared >= reachSquared) continue;

        const across = Math.sqrt(acrossSquared);
        const share = Math.min(1, reach - across);
        const middle = across / halfWidth;
        const tone = middle < 1 ? 1.12 - 0.3 * middle * middle : 0.82;
        const dot = (row + (x & WRAP)) * VALUES_A_DOT;
        paintDot(dots, dot, share, red * tone, green * tone, blue * tone, rank);
      }
    }
  }
}

/**
 * A leaf blade: lighter along its midrib, darker towards its edge, one half of its fold a
 * little lighter than the other; and a dark rim just outside its edge, over whatever plant lies
 * under it (never over bare dots: a shadow on the sand is three.js's to draw). The dots are
 * walked over the blade's own rectangle, row by row.
 */
export function paintLeaf({ dots, slopeFactors }: Painting, leaf: Leaf, rank: number): void {
  const {
    x: stalkX,
    y: stalkY,
    length,
    leftWidth,
    rightWidth,
    outline,
    notchDepth,
    notchWidth,
  } = leaf;
  const [red, green, blue] = leaf.colour;
  const lighterLeft = 1 - leaf.lighterHalf;
  const lighterRight = 1 + leaf.lighterHalf;
  const edgeDarkening = 1 - shading.leafEdge;
  const midribLift = length > SHORTEST_WITH_MIDRIB ? shading.midrib - 1 : 0;

  const stepLength = length / OUTLINE_STEPS;
  const averageWidth = (leftWidth + rightWidth) / 2;
  for (let step = 0; step <= OUTLINE_STEPS; step++) {
    const rise = ((outline[step + 1] - outline[step]) * averageWidth) / stepLength;
    slopeFactors[step] = 1 / Math.sqrt(1 + rise * rise);
  }

  const cos = Math.cos(leaf.angle);
  const sin = Math.sin(leaf.angle);
  const rimWidth = shading.rimWidth * Math.min(1, length / SHORTEST_WITH_FULL_RIM);
  const stepsPerDot = OUTLINE_STEPS / length;
  const positionStep = cos * stepsPerDot;
  const margin = rimWidth + 0.5;
  const alongLow = -margin;
  const alongHigh = length + margin;
  const acrossLow = -leftWidth - margin;
  const acrossHigh = rightWidth + margin;
  const reachDown =
    Math.max(alongLow * sin, alongHigh * sin) + Math.max(acrossLow * cos, acrossHigh * cos);
  const reachUp =
    Math.min(alongLow * sin, alongHigh * sin) + Math.min(acrossLow * cos, acrossHigh * cos);
  const top = Math.floor(stalkY + reachUp);
  const bottom = Math.ceil(stalkY + reachDown);

  for (let y = top; y <= bottom; y++) {
    const fromStalkY = y + 0.5 - stalkY;
    // Where along this row the dots fall inside the blade's rectangle.
    let fromStalkXLow = -Infinity;
    let fromStalkXHigh = Infinity;
    if (Math.abs(cos) > 1e-6) {
      const one = (alongLow - fromStalkY * sin) / cos;
      const other = (alongHigh - fromStalkY * sin) / cos;
      fromStalkXLow = Math.max(fromStalkXLow, Math.min(one, other));
      fromStalkXHigh = Math.min(fromStalkXHigh, Math.max(one, other));
    }
    if (Math.abs(sin) > 1e-6) {
      const one = (fromStalkY * cos - acrossLow) / sin;
      const other = (fromStalkY * cos - acrossHigh) / sin;
      fromStalkXLow = Math.max(fromStalkXLow, Math.min(one, other));
      fromStalkXHigh = Math.min(fromStalkXHigh, Math.max(one, other));
    }
    const left = Math.ceil(stalkX + fromStalkXLow - 0.5);
    const right = Math.floor(stalkX + fromStalkXHigh - 0.5);
    const row = (y & WRAP) * SIZE;
    const fromStalkX = left + 0.5 - stalkX;
    let along = fromStalkX * cos + fromStalkY * sin;
    let across = -fromStalkX * sin + fromStalkY * cos;
    // How far along the outline, in its steps; stepped across the row rather than divided out at each dot.
    let position = along * stepsPerDot;
    for (let x = left; x <= right; x++, along += cos, across -= sin, position += positionStep) {
      const isLeft = across < 0;
      const offMidrib = isLeft ? -across : across;
      const onOutline = position < 0 ? 0 : position > OUTLINE_STEPS ? OUTLINE_STEPS : position;
      const step = onOutline | 0;
      const before = outline[step];
      const edge =
        (before + (outline[step + 1] - before) * (onOutline - step)) *
        (isLeft ? leftWidth : rightWidth);
      let inside = (edge - offMidrib) * slopeFactors[step];
      if (along < 0) inside += along;
      else if (along > length) inside -= along - length;
      if (notchDepth > 0) {
        const notchReach = 1 - offMidrib / notchWidth;
        const fromNotch = length - (notchReach > 0 ? notchDepth * notchReach : 0) - along;
        if (fromNotch < inside) inside = fromNotch;
      }
      const cover = inside + 0.5;
      const dot = (row + (x & WRAP)) * VALUES_A_DOT;
      if (cover <= 0) {
        if (cover > -rimWidth && dots[dot + COVERED] > 0) {
          const kept = 1 - shading.rimDarkness * (1 + cover / rimWidth);
          dots[dot + RED] *= kept;
          dots[dot + GREEN] *= kept;
          dots[dot + BLUE] *= kept;
        }
        continue;
      }

      const towardsEdge = offMidrib < edge ? offMidrib / edge : 1;
      let tone =
        (isLeft ? lighterLeft : lighterRight) * (1 - edgeDarkening * towardsEdge * towardsEdge);
      if (offMidrib < MIDRIB_REACH && position > MIDRIB_FROM && position < MIDRIB_TO) {
        tone *= 1 + midribLift * (1 - offMidrib / MIDRIB_REACH);
      }
      paintDot(dots, dot, cover > 1 ? 1 : cover, red * tone, green * tone, blue * tone, rank);
    }
  }
}
