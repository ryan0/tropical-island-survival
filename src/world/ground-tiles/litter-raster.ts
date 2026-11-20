import { litterTileConfig } from './litter-tile-config';

export type Rgb = readonly [red: number, green: number, blue: number];

const { size: SIZE, contactShadow, edgeShade } = litterTileConfig;
const WRAP = SIZE - 1;
// Grain and streaks read a table of random numbers this many a side, rather than work one out for every dot.
const NOISE_SIZE = 256;
const NOISE_WRAP = NOISE_SIZE - 1;

/** The litter as it is painted: each dot's colour, and the order of the thing that lies on top there. */
export interface LitterPicture {
  /** Red, green and blue of each dot, 0 to 1. */
  colour: Float32Array;
  /** The order of the topmost thing (1 for the first laid down), blended over a soft edge; 0 is bare. */
  order: Float32Array;
  /** Random numbers from -0.5 to 0.5, the same each time. */
  noise: Float32Array;
}

function hash(a: number, b: number): number {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b + 0x3c6ef372, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

export function createLitterPicture([red, green, blue]: Rgb): LitterPicture {
  const colour = new Float32Array(SIZE * SIZE * 3);
  for (let i = 0; i < colour.length; i += 3) {
    colour[i] = red;
    colour[i + 1] = green;
    colour[i + 2] = blue;
  }
  const noise = new Float32Array(NOISE_SIZE * NOISE_SIZE);
  for (let i = 0; i < noise.length; i++) noise[i] = hash(i & NOISE_WRAP, i >> 8) - 0.5;
  return { colour, order: new Float32Array(SIZE * SIZE), noise };
}

/**
 * A long thing lying flat: a line of points through its middle, in the picture's dots, and how
 * far it reaches to each side of each point. Its ends are cut straight across.
 */
export interface Blade {
  xs: number[];
  ys: number[];
  left: number[];
  right: number[];
}

/**
 * How a thing is coloured, worked out for each dot from where the dot lies along it (0 to 1) and
 * across it (-1 its left edge, 0 its middle, 1 its right edge). A shade of 1 changes nothing.
 */
export interface Look {
  colour: Rgb;
  /** How far beyond its edge it darkens what lies under it, in dots: a thin thing casts a thin contact shadow. */
  shadowReach: number;
  /** A folded blade: the half facing the sky this much lighter, the other this much darker. */
  fold: number;
  /** Which half faces the sky (1 the right, -1 the left) up to the twist, where they change sides. */
  litSide: number;
  twistAt: number;
  /** A midrib, this many dots to each side of the middle. */
  midribWidth: number;
  midribShade: number;
  /** Streaks along the thing: how many across its whole width, how many dots each runs unbroken, how strong. */
  streaks: number;
  streakRun: number;
  streakStrength: number;
  /** Veins leaving the midrib towards the tip: how far apart along, how far they slant along per width. */
  veinSpacing: number;
  veinSlant: number;
  veinShade: number;
  /** A shade strongest down the middle, fading out by this share of the width. */
  centreBand: number;
  centreShade: number;
  /** A rolled left margin, as a share of the width, showing the paler underside. */
  rolled: number;
  rolledShade: number;
  /** A second colour from this far across to the right edge, such as a husk's skin; above 1 for none. */
  skinFrom: number;
  skin: Rgb;
  /** A soft weathered blotch, strongest at its middle, over this stretch along the thing. */
  patchFrom: number;
  patchTo: number;
  patchShade: number;
  /** How much each dot strays at random, as sand-blasted, mouldy stuff does. */
  grain: number;
}

export const PLAIN_LOOK: Look = {
  colour: [0.5, 0.5, 0.5],
  shadowReach: contactShadow.reach,
  fold: 0,
  litSide: 1,
  twistAt: 2,
  midribWidth: 0,
  midribShade: 1,
  streaks: 0,
  streakRun: 1,
  streakStrength: 0,
  veinSpacing: 0,
  veinSlant: 0,
  veinShade: 1,
  centreBand: 0,
  centreShade: 1,
  rolled: 0,
  rolledShade: 1,
  skinFrom: 2,
  skin: [0.5, 0.5, 0.5],
  patchFrom: 2,
  patchTo: 2,
  patchShade: 1,
  grain: 0,
};

/** How far a blade turns where one stretch meets the next, in radians. */
function turnAt(blade: Blade, point: number): number {
  const { xs, ys } = blade;
  if (point <= 0 || point >= xs.length - 1) return 0;
  const inX = xs[point] - xs[point - 1];
  const inY = ys[point] - ys[point - 1];
  const outX = xs[point + 1] - xs[point];
  const outY = ys[point + 1] - ys[point];
  return Math.abs(Math.atan2(inX * outY - inY * outX, inX * outX + inY * outY));
}

/**
 * Paints a blade into the picture as the thing of the given order, one stretch between two of its
 * points at a time, over just the dots each stretch covers. A dot takes the thing's colour and
 * order as far as the thing covers it (a soft edge about a dot wide), darker near the edge; a dot
 * just outside, where something earlier lies, is darkened by the contact shadow. Every dot wraps
 * round the picture's edges.
 */
export function paintBlade(picture: LitterPicture, blade: Blade, look: Look, order: number): void {
  const { colour, order: orders, noise } = picture;
  const { xs, ys, left, right } = blade;
  const [red, green, blue] = look.colour;
  const [skinRed, skinGreen, skinBlue] = look.skin;
  const { fold, litSide, twistAt, midribWidth, midribShade, streaks, streakRun, streakStrength } =
    look;
  const { veinSpacing, veinSlant, veinShade, centreBand, centreShade, rolled, rolledShade } = look;
  const { skinFrom, patchFrom, patchTo, patchShade, grain } = look;
  const patchMiddle = (patchFrom + patchTo) / 2;
  const perPatchHalf = 2 / Math.max(1e-6, patchTo - patchFrom);
  const rim = look.shadowReach;
  const last = xs.length - 1;
  let length = 0;
  for (let i = 0; i < last; i++) length += Math.hypot(xs[i + 1] - xs[i], ys[i + 1] - ys[i]);
  if (length === 0) return;
  const perLength = 1 / length;
  const runsPerShare = length / streakRun;
  const veinsPerShare = 1 / Math.max(1e-6, veinSpacing);
  const streakSeed = order * 13;

  let alongBefore = 0;
  for (let i = 0; i < last; i++) {
    const x0 = xs[i];
    const y0 = ys[i];
    const stretch = Math.hypot(xs[i + 1] - x0, ys[i + 1] - y0);
    if (stretch === 0) continue;
    const perStretch = 1 / stretch;
    const alongX = (xs[i + 1] - x0) * perStretch;
    const alongY = (ys[i + 1] - y0) * perStretch;
    const left0 = left[i];
    const leftChange = left[i + 1] - left0;
    const right0 = right[i];
    const rightChange = right[i + 1] - right0;
    const reach = Math.max(left0, left[i + 1], right0, right[i + 1]) + rim;
    const isFirst = i === 0;
    const isLast = i === last - 1;
    // Where a blade bends, two stretches leave a wedge between them on the outside of the bend, so
    // each reaches into its neighbour by as much; the ends get a soft edge of their own.
    const before = isFirst ? 1 : reach * Math.min(1, turnAt(blade, i)) + 0.3;
    const after = isLast ? 1 : reach * Math.min(1, turnAt(blade, i + 1)) + 0.3;

    const startY = -alongY * before;
    const endY = alongY * (stretch + after);
    const top = y0 + Math.min(startY, endY) - Math.abs(alongX) * reach;
    const bottom = y0 + Math.max(startY, endY) + Math.abs(alongX) * reach;
    for (let row = Math.floor(top); row <= Math.ceil(bottom); row++) {
      const y = row + 0.5 - y0;
      // The dots of this row inside the stretch's box: from its start to its end, and within its reach to each side.
      const fromStart = alongY * y + before;
      const toEnd = stretch + after - alongY * y;
      const toLeft = alongX * y + reach;
      const toRight = reach - alongX * y;
      let from = -Infinity;
      let to = Infinity;
      if (alongX > 1e-9) {
        from = -fromStart / alongX;
        to = toEnd / alongX;
      } else if (alongX < -1e-9) {
        from = toEnd / alongX;
        to = -fromStart / alongX;
      } else if (fromStart < 0 || toEnd < 0) continue;
      if (alongY > 1e-9) {
        from = Math.max(from, -toRight / alongY);
        to = Math.min(to, toLeft / alongY);
      } else if (alongY < -1e-9) {
        from = Math.max(from, toLeft / alongY);
        to = Math.min(to, -toRight / alongY);
      } else if (toLeft < 0 || toRight < 0) continue;
      const rowOfDots = (row & WRAP) * SIZE;
      const rowOfNoise = (row & NOISE_WRAP) * NOISE_SIZE;

      const firstColumn = Math.ceil(from + x0 - 0.5);
      const lastColumn = Math.floor(to + x0 - 0.5);
      const x = firstColumn + 0.5 - x0;
      let alongDots = x * alongX + y * alongY;
      let across = y * alongX - x * alongY;
      for (
        let column = firstColumn;
        column <= lastColumn;
        column++, alongDots += alongX, across -= alongY
      ) {
        const along = alongDots * perStretch;
        const share = along < 0 ? 0 : along > 1 ? 1 : along;
        const leftWidth = left0 + leftChange * share;
        const rightWidth = right0 + rightChange * share;
        let outside = across < 0 ? -across - leftWidth : across - rightWidth;
        if (isFirst && along < 0) outside = Math.max(outside, -alongDots);
        if (isLast && along > 1) outside = Math.max(outside, alongDots - stretch);
        const dot = rowOfDots + (column & WRAP);

        if (outside >= 0.5) {
          // The overlap with a neighbouring stretch casts no second shadow.
          const inOverlap = (along < 0 && !isFirst) || (along > 1 && !isLast);
          const under = orders[dot];
          if (outside < rim && under > 0 && under < order - 0.5 && !inOverlap) {
            const darkening = 1 - contactShadow.darkness * (1 - outside / rim);
            colour[dot * 3] *= darkening;
            colour[dot * 3 + 1] *= darkening;
            colour[dot * 3 + 2] *= darkening;
          }
          continue;
        }

        const coverage = outside < -0.5 ? 1 : 0.5 - outside;
        const width = across < 0 ? leftWidth : rightWidth;
        const acrossShare = width > 0.01 ? across / width : 0;
        const outward = acrossShare < 0 ? -acrossShare : acrossShare;
        const alongShare = (alongBefore + share * stretch) * perLength;

        let shade = 1 + grain * noise[rowOfNoise + (column & NOISE_WRAP)];
        if (outside > -edgeShade.width) {
          shade *= 1 - edgeShade.darkness * Math.min(1, 1 + outside / edgeShade.width);
        }
        if (fold !== 0) {
          const side = alongShare < twistAt ? litSide : -litSide;
          shade *= acrossShare * side > 0 ? 1 + fold : 1 - fold;
        }
        if (outward < centreBand) shade *= 1 + (centreShade - 1) * (1 - outward / centreBand);
        if (acrossShare < rolled - 1) shade *= rolledShade;
        const fromPatch = (alongShare - patchMiddle) * perPatchHalf;
        if (fromPatch > -1 && fromPatch < 1 && outward < 1) {
          shade *= 1 + (patchShade - 1) * (1 - fromPatch * fromPatch) * (1 - outward * outward);
        }
        if (streaks > 0) {
          const streak = Math.floor((acrossShare + 1) * streaks * 0.5) + streakSeed;
          const run = Math.floor(alongShare * runsPerShare);
          shade *= 1 + streakStrength * noise[((run & NOISE_WRAP) << 8) + (streak & NOISE_WRAP)];
        }
        if (veinSpacing > 0 && outward < 0.85) {
          const slanted = (alongShare - veinSlant * outward) * veinsPerShare;
          const offVein = Math.abs(slanted - Math.round(slanted)) * veinSpacing * length;
          if (offVein < 0.5 && slanted > 0.5) shade *= veinShade;
        }
        if ((across < 0 ? -across : across) < midribWidth) shade *= midribShade;

        const onSkin = acrossShare > skinFrom;
        const at = dot * 3;
        colour[at] += ((onSkin ? skinRed : red) * shade - colour[at]) * coverage;
        colour[at + 1] += ((onSkin ? skinGreen : green) * shade - colour[at + 1]) * coverage;
        colour[at + 2] += ((onSkin ? skinBlue : blue) * shade - colour[at + 2]) * coverage;
        orders[dot] += (order - orders[dot]) * coverage;
      }
    }
    alongBefore += stretch;
  }
}
