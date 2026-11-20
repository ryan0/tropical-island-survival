import { within, type Random, type Range } from '../../core/random';
import { PLAIN_LOOK, type Blade, type Look, type Rgb } from './litter-raster';
import { litterTileConfig } from './litter-tile-config';

/** One thing lying in the litter: one blade or a few, all coloured alike. */
export interface LitterPiece {
  /** Its place in the heap: low lies under the others and only in a deep mat, high on top and alone. */
  key: number;
  blades: Blade[];
  look: Look;
}

/** Where a thing lies in the picture, in dots, and which way its length points. */
export interface Placement {
  x: number;
  y: number;
  angle: number;
}

const {
  size,
  span,
  colours,
  contactShadow,
  leaflets,
  ribs,
  broadLeaves,
  huskFlakes,
  twigs,
  stalks,
  bits,
} = litterTileConfig;
const DOTS_PER_METRE = size / span;

export function dots(random: Random, metres: Range): number {
  return within(random, metres) * DOTS_PER_METRE;
}

function either(random: Random): number {
  return random() < 0.5 ? -1 : 1;
}

/** A colour between two of a palette's, a little lighter or darker than either. */
export function pickColour(random: Random, palette: readonly Rgb[], shade = 1): Rgb {
  const one = palette[Math.floor(random() * palette.length)];
  const other = palette[Math.floor(random() * palette.length)];
  const share = random();
  const lightness = shade * (1 + colours.lightnessSpread * (2 * random() - 1));
  return [
    (one[0] + (other[0] - one[0]) * share) * lightness,
    (one[1] + (other[1] - one[1]) * share) * lightness,
    (one[2] + (other[2] - one[2]) * share) * lightness,
  ];
}

type Width = (s: number) => number;

/**
 * A blade `length` dots long from the placement along its angle, `samples` stretches, its middle
 * bowed `bend` of its length to one side, as wide to each side as `left(s)` and `right(s)` say
 * for s from 0 to 1 along it.
 */
function layBlade(
  place: Placement,
  samples: number,
  length: number,
  bend: number,
  left: Width,
  right: Width,
): Blade {
  const cos = Math.cos(place.angle);
  const sin = Math.sin(place.angle);
  const blade: Blade = { xs: [], ys: [], left: [], right: [] };
  for (let i = 0; i <= samples; i++) {
    const s = i / samples;
    const along = s * length;
    const aside = bend * length * 4 * s * (1 - s);
    blade.xs.push(place.x + along * cos - aside * sin);
    blade.ys.push(place.y + along * sin + aside * cos);
    blade.left.push(left(s));
    blade.right.push(right(s));
  }
  return blade;
}

/** A blade of even width through points given in the placement's own frame. */
function layLine(
  place: Placement,
  points: readonly (readonly [number, number])[],
  halfWidth: number,
): Blade {
  const cos = Math.cos(place.angle);
  const sin = Math.sin(place.angle);
  return {
    xs: points.map(([u, v]) => place.x + u * cos - v * sin),
    ys: points.map(([u, v]) => place.y + u * sin + v * cos),
    left: points.map(() => halfWidth),
    right: points.map(() => halfWidth),
  };
}

export interface LeafletLook {
  colour: Rgb;
  key: number;
  length: number;
  width: number;
}

/**
 * A dead coconut leaflet: a long narrow blade folded along its midrib, so that one half faces the
 * sky more than the other; fine veins run its length. Often torn short; some twist, where the
 * halves change sides; some split towards the tip into strands.
 */
export function createLeaflet(
  random: Random,
  place: Placement,
  { colour, key, length, width }: LeafletLook,
): LitterPiece {
  const twistAt = random() < leaflets.shareTwisted ? within(random, [0.25, 0.75]) : 2;
  const end = random() < leaflets.shareBroken ? within(random, [0.55, 0.92]) : 1;
  const halfWidth = width / 2;
  const profile: Width = (s) => {
    const along = s * end;
    const base = 0.3 + 0.7 * Math.min(1, along / 0.07) ** 0.5;
    const tip = along < 0.65 ? 1 : ((1 - along) / 0.35) ** 0.7 + 0.12;
    const fromTwist = Math.abs(along - twistAt * end) / 0.06;
    const pinched = fromTwist < 1 ? 0.3 + 0.7 * fromTwist * fromTwist : 1;
    return halfWidth * base * tip * pinched;
  };
  const drawnLength = length * end;
  const bend = leaflets.bend * (2 * random() - 1);
  const blades = [layBlade(place, 14, drawnLength, bend, profile, profile)];

  if (random() < leaflets.shareSplit) {
    // The torn-off part of a split leaflet lies beside it as a strand or two.
    const splitAt = within(random, [0.3, 0.6]);
    const strands = 1 + Math.floor(random() * 2);
    for (let strand = 0; strand < strands; strand++) {
      const offAngle = place.angle + either(random) * within(random, [0.03, 0.1]);
      const startAlong = drawnLength * splitAt;
      const startAside =
        bend * drawnLength * 4 * splitAt * (1 - splitAt) + either(random) * halfWidth * 0.6;
      const start = {
        x: place.x + startAlong * Math.cos(place.angle) - startAside * Math.sin(place.angle),
        y: place.y + startAlong * Math.sin(place.angle) + startAside * Math.cos(place.angle),
        angle: offAngle,
      };
      // No thinner than a dot or so, or it would show only as a faint line.
      const strandWidth: Width = (s) => Math.max(0.7, halfWidth * 0.35 * (1 - 0.6 * s));
      blades.push(
        layBlade(
          start,
          8,
          drawnLength * (1 - splitAt) * within(random, [0.7, 1.1]),
          bend,
          strandWidth,
          strandWidth,
        ),
      );
    }
  }

  const patchFrom = random() * 0.7;
  return {
    key,
    blades,
    look: {
      ...PLAIN_LOOK,
      colour,
      shadowReach: contactShadow.reachOfLeaflets,
      fold: leaflets.fold,
      litSide: either(random),
      twistAt,
      midribWidth: 0.55,
      midribShade: 1.12,
      streaks: 6,
      streakRun: drawnLength,
      streakStrength: 0.14,
      patchFrom,
      patchTo: patchFrom + within(random, [0.1, 0.3]),
      patchShade: random() < 0.5 ? 0.86 : 1.08,
      grain: 0.06,
    },
  };
}

export function leafletLength(random: Random): number {
  return dots(random, leaflets.length);
}

export function leafletWidth(random: Random): number {
  const [narrowest, widest] = leaflets.width;
  return (narrowest + (widest - narrowest) * random() ** 2) * DOTS_PER_METRE;
}

/** The bare midrib of a leaflet whose blade has rotted away: a long thin wiry line, gently bowed. */
export function createRib(random: Random, place: Placement, key: number): LitterPiece {
  const length = dots(random, ribs.length);
  const halfWidth = Math.max(0.7, dots(random, ribs.thickness) / 2);
  const taper: Width = (s) => Math.max(0.6, halfWidth * (1 - 0.4 * s));
  return {
    key,
    blades: [layBlade(place, 6, length, 0.05 * (2 * random() - 1), taper, taper)],
    look: {
      ...PLAIN_LOOK,
      colour: pickColour(random, colours.rib),
      shadowReach: contactShadow.reachOfTwigs,
      centreBand: 0.5,
      centreShade: 1.06,
      grain: 0.06,
    },
  };
}

/**
 * A dry leaf of a beach tree, with a short stalk, a midrib and veins. Its outline runs from a
 * wedge or a rounded base to a pointed or a rounded tip, a little ragged; many are curled, so that
 * a rolled margin shows the paler underside, and some are broken off short.
 */
export function createBroadLeaf(random: Random, place: Placement, key: number): LitterPiece {
  const length = dots(random, broadLeaves.length);
  const halfWidth = (length * within(random, broadLeaves.breadth)) / 2;
  const baseRoundness = within(random, [0.45, 1]);
  const tipRoundness = within(random, [0.35, 0.9]);
  const widest = baseRoundness / (baseRoundness + tipRoundness);
  const peak = widest ** baseRoundness * (1 - widest) ** tipRoundness;
  const samples = 10;
  const ragged = Array.from(
    { length: 2 * samples + 2 },
    () => 1 + broadLeaves.ragged * (2 * random() - 1),
  );
  const end = random() < broadLeaves.shareBroken ? within(random, [0.5, 0.85]) : 1;
  const shape = (s: number, side: number) => {
    const along = s * end;
    const smooth = (along ** baseRoundness * (1 - along) ** tipRoundness) / peak;
    return halfWidth * smooth * ragged[Math.round(s * samples) + side * (samples + 1)] + 0.4;
  };
  const curled = random() < broadLeaves.shareCurled;
  const leftRoll = curled ? within(random, [0.15, 0.5]) : 0;
  const rightRoll = curled && random() < 0.5 ? within(random, [0.1, 0.4]) : 0;
  const lopsided = within(random, [0.85, 1.1]);
  const blade = layBlade(
    place,
    samples,
    length * end,
    0.06 * (2 * random() - 1),
    (s) => shape(s, 0) * (1 - leftRoll * 0.5),
    (s) => shape(s, 1) * lopsided * (1 - rightRoll * 0.5),
  );
  const stalkLength = length * within(random, [0.04, 0.1]);
  const stalk = layLine(
    { ...place, angle: place.angle + Math.PI },
    [
      [0, 0],
      [stalkLength, 0],
    ],
    0.6,
  );
  const veinPairs = 4 + Math.floor(random() * 4);
  const patchFrom = random() * 0.6;

  return {
    key,
    blades: [blade, stalk],
    look: {
      ...PLAIN_LOOK,
      colour: pickColour(random, colours.broadLeaf),
      midribWidth: 0.6,
      midribShade: random() < 0.6 ? 1.15 : 0.82,
      veinSpacing: 1 / (veinPairs + 1.2),
      veinSlant: 0.16,
      veinShade: random() < 0.6 ? 1.07 : 0.92,
      centreBand: 0.5,
      centreShade: random() < 0.5 ? 0.92 : 1.06,
      rolled: leftRoll * 1.1,
      rolledShade: 1.14,
      patchFrom,
      patchTo: patchFrom + within(random, [0.15, 0.4]),
      patchShade: random() < 0.6 ? 0.88 : 1.08,
      grain: 0.07,
    },
  };
}

/** A flake of coconut husk: tan fibres streaked along its length, ragged at the sides, some with skin. */
export function createHuskFlake(random: Random, place: Placement, key: number): LitterPiece {
  const length = dots(random, huskFlakes.length);
  const halfWidth = (length * within(random, huskFlakes.breadth)) / 2;
  const samples = 8;
  const bumps = Array.from({ length: samples + 1 }, () => within(random, [0.7, 1.15]));
  const width: Width = (s) =>
    halfWidth * (0.45 + 0.55 * Math.sin(Math.PI * s)) * bumps[Math.round(s * samples)];
  return {
    key,
    blades: [layBlade(place, samples, length, 0.08 * (2 * random() - 1), width, width)],
    look: {
      ...PLAIN_LOOK,
      colour: pickColour(random, [colours.huskFibre]),
      streaks: 18,
      streakRun: 4,
      streakStrength: 0.3,
      skinFrom: random() < huskFlakes.shareWithSkin ? within(random, [-0.3, 0.5]) : 2,
      skin: pickColour(random, [colours.huskSkin]),
      grain: 0.1,
    },
  };
}

/** A twig: a few straight runs with a kink between, sometimes a side shoot. */
export function createTwig(random: Random, place: Placement, key: number): LitterPiece {
  const length = dots(random, twigs.length);
  const halfWidth = Math.max(0.6, dots(random, twigs.thickness) / 2);
  const runs = 2 + Math.floor(random() * 3);
  const points: [number, number][] = [[0, 0]];
  let heading = 0;
  for (let i = 0; i < runs; i++) {
    const [x, y] = points[i];
    points.push([x + (Math.cos(heading) * length) / runs, y + (Math.sin(heading) * length) / runs]);
    heading += (random() - 0.5) * 0.7;
  }
  const blades = [layLine(place, points, halfWidth)];
  if (random() < 0.35) {
    const [x, y] = points[1 + Math.floor(random() * (runs - 1))];
    const shoot = either(random) * within(random, [0.5, 1]);
    const shootLength = length * within(random, [0.1, 0.3]);
    blades.push(
      layLine(
        place,
        [
          [x, y],
          [x + Math.cos(shoot) * shootLength, y + Math.sin(shoot) * shootLength],
        ],
        halfWidth * 0.7,
      ),
    );
  }
  return {
    key,
    blades,
    look: {
      ...PLAIN_LOOK,
      colour: pickColour(random, colours.twig),
      shadowReach: contactShadow.reachOfTwigs,
      centreBand: 0.35,
      centreShade: 1.08,
      streaks: 3,
      streakRun: 6,
      streakStrength: 0.12,
      grain: 0.18,
    },
  };
}

/** A piece of leaf stalk or frond midrib: a flat strip, streaked along its length, cut off square. */
export function createStalk(random: Random, place: Placement, key: number): LitterPiece {
  const length = dots(random, stalks.length);
  const halfWidth = dots(random, stalks.width) / 2;
  const taper = within(random, [0.6, 1]);
  const width: Width = (s) => halfWidth * (1 - (1 - taper) * s);
  return {
    key,
    blades: [layBlade(place, 6, length, 0.03 * (2 * random() - 1), width, width)],
    look: {
      ...PLAIN_LOOK,
      colour: pickColour(random, colours.stalk),
      fold: 0.06,
      litSide: either(random),
      streaks: 5,
      streakRun: length,
      streakStrength: 0.16,
      grain: 0.05,
    },
  };
}

/** A small broken bit of the mat: a scrap of leaf, a piece of leaflet, a splinter or a wisp of fibre. */
export function createBit(random: Random, place: Placement, key: number): LitterPiece {
  const across = dots(random, bits.size);
  const shade = within(random, colours.bitShade);
  const shadowReach = contactShadow.reachOfBits;
  const kind = random();
  if (kind < 0.45) {
    const widths = Array.from({ length: 4 }, () => across * within(random, [0.15, 0.5]));
    const width: Width = (s) => widths[Math.round(s * 3)];
    const otherWidth: Width = (s) => widths[3 - Math.round(s * 3)];
    return {
      key,
      blades: [layBlade(place, 3, across, 0.1 * (2 * random() - 1), width, otherWidth)],
      look: {
        ...PLAIN_LOOK,
        colour: pickColour(random, colours.broadLeaf, shade),
        shadowReach,
        grain: 0.08,
      },
    };
  }
  if (kind < 0.8) {
    const halfWidth = Math.max(0.8, across * within(random, [0.1, 0.2]));
    const long = across * within(random, [1, 2]);
    return {
      key,
      blades: [
        layLine(
          place,
          [
            [0, 0],
            [long, 0],
          ],
          halfWidth,
        ),
      ],
      look: {
        ...PLAIN_LOOK,
        colour: pickColour(random, colours.leaflet, shade),
        shadowReach,
        fold: leaflets.fold,
        litSide: either(random),
        streaks: 4,
        streakRun: long,
        streakStrength: 0.12,
      },
    };
  }
  const palette = random() < 0.5 ? colours.twig : [colours.huskFibre];
  return {
    key,
    blades: [
      layLine(
        place,
        [
          [0, 0],
          [across * within(random, [0.8, 1.6]), 0],
        ],
        within(random, [0.45, 0.8]),
      ),
    ],
    look: { ...PLAIN_LOOK, colour: pickColour(random, palette, shade), shadowReach, grain: 0.12 },
  };
}
