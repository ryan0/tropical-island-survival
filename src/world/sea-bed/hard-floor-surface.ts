import { FULL_TURN, smoothstep } from '../../core/maths';
import { within, type Random } from '../../core/random';
import {
  blurred,
  DOTS,
  DOTS_PER_METRE,
  dotsWithin,
  forDotsNear,
  MASK,
  octaveField,
  paintAlongLine,
  placeNear,
  randomPlace,
  roomForLines,
  SIZE,
  wanderingLine,
  type Place,
} from './floor-painting';
import type { Head, HardFloorRelief } from './hard-floor-relief';
import { seaBedConfig } from './sea-bed-config';

const { shade: shadeConfig, cover: coverConfig } = seaBedConfig;

export interface HardFloorSurface {
  /** Red: light and dark of the fine detail, about 0.5. */
  shade: Float32Array;
  /** Green: the place on the shader's ramp of what covers the rock. */
  cover: Float32Array;
}

/** How far each dot stands above the average of the floor round it, in metres: below it, less than 0. */
function standing(height: Float32Array, reachMetres: number): Float32Array {
  const round = blurred(height, Math.round(reachMetres * DOTS_PER_METRE));
  return round.map((average, dot) => height[dot] - average);
}

/** A place near the top of a head: within this share of its radius from its middle. */
function nearTheTop(random: Random, head: Head, share: number): Place {
  return placeNear(random, head, share * head.radius);
}

/**
 * For every dot, how far inside a lone ellipse or capsule it is, in dots (negative outside):
 * a capsule `length` long and `width` wide, lying at `angle`.
 */
function insideCapsule(
  dx: number,
  dy: number,
  length: number,
  width: number,
  cosine: number,
  sine: number,
): number {
  const along = dx * cosine + dy * sine;
  const across = dy * cosine - dx * sine;
  const halfSpine = Math.max(0, (length - width) / 2);
  const off = Math.max(0, Math.abs(along) - halfSpine);
  return width / 2 - Math.sqrt(off * off + across * across);
}

/** The broad shape of the floor and its fine relief, and the turf's patches, which several layers follow. */
interface Lie {
  /** Metres above the floor within a hand's width, so below 0 in a gutter. */
  standingInGutters: Float32Array;
  /** Metres above the floor within a few centimetres: a knob's top above 0, the crease round it below. */
  fineRelief: Float32Array;
  /** The patchwork of turf and rock, about -1 (thick turf) to 1 (old rock). */
  patches: Float32Array;
  /** The turf's mottle of a few centimetres, about -1 to 1. */
  mottle: Float32Array;
}

/** Turf and old rock in a patchwork, the turf thickest down the sides of the gutters. */
function paintPatchwork({ patches, standingInGutters }: Lie): Float32Array {
  const { patchwork, gutterTurfPerMetre } = coverConfig;
  const [thickTurf, plainRock] = patchwork.range;
  return patches.map((value, dot) => {
    const place = thickTurf + (plainRock - thickTurf) * smoothstep(-1.1, 1.1, value);
    const gutter = Math.max(0, -standingInGutters[dot]);
    return Math.max(thickTurf, place - gutterTurfPerMetre * gutter);
  });
}

/**
 * Crust of coralline alga: sheets along the tops of the knobs, on the old-rock side of the
 * patchwork, broken by the fine relief and by turf into pieces and flecks, with old rock round
 * them and a pale growing edge on part of their edges. Inside, mottled from old rock to pink.
 */
function paintCrusts(lie: Lie, surface: HardFloorSurface): void {
  const { level, edge, standingWeight, fineReliefWeight, turfWeight, place, rockBelow, rockPlace } =
    coverConfig.crust;
  const { standingInGutters, fineRelief, patches, mottle } = lie;
  const { cover, shade } = surface;
  const [oldRock, pink] = place;
  for (let dot = 0; dot < DOTS; dot++) {
    const crustiness =
      patches[dot] +
      standingWeight * standingInGutters[dot] +
      fineReliefWeight * fineRelief[dot] +
      turfWeight * mottle[dot];
    if (crustiness < level - rockBelow) continue;

    const aroundCrust = smoothstep(level - rockBelow, level, crustiness);
    const underlying = cover[dot] + (rockPlace - cover[dot]) * aroundCrust;
    const crust = smoothstep(level, level + edge, crustiness);
    const crustPlace =
      oldRock + (pink - oldRock) * smoothstep(-0.8, 0.6, mottle[dot] + patches[dot] - 1);
    cover[dot] = underlying + (crustPlace - underlying) * crust;
    const growingEdge = crust * (1 - crust) * 4;
    shade[dot] += coverConfig.crust.paleEdgeLift * growingEdge * smoothstep(0.2, 0.7, mottle[dot]);
  }
}

/** Clusters of a parrotfish's bites: small pale scars, each with a rim of bare rock. */
function paintBites(random: Random, heads: readonly Head[], surface: HardFloorSurface): void {
  const { clusters, bitesEach, spread, length, place } = coverConfig.bites;
  const { cover, shade } = surface;
  for (let i = 0; i < clusters; i++) {
    const head = heads[Math.floor(random() * heads.length)];
    const middle = nearTheTop(random, head, 0.6);
    const reach = dotsWithin(random, spread);
    const bites = Math.round(within(random, bitesEach));
    for (let j = 0; j < bites; j++) {
      const biteLength = dotsWithin(random, length);
      const width = biteLength * within(random, [0.45, 0.75]);
      const angle = random() * FULL_TURN;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const bitePlace = within(random, place);
      forDotsNear(placeNear(random, middle, reach), biteLength / 2 + 2, (dot, dx, dy) => {
        const depth = insideCapsule(dx, dy, biteLength, width, cosine, sine);
        if (depth < -1.5) return;

        const scar = Math.max(0, Math.min(1, depth + 0.5));
        const rim = Math.max(0, Math.min(1, depth + 1.5));
        const bare = cover[dot] + (0.5 - cover[dot]) * rim;
        cover[dot] = Math.max(bare + (bitePlace - bare) * scar, cover[dot] * (1 - rim) + 0.5 * rim);
        shade[dot] += 0.06 * scar;
      });
    }
  }
}

/**
 * Small low coral colonies on the heads, each a cluster of rounded lumps, raised, stippled with
 * polyps and pale at the rim.
 */
function paintColonies(random: Random, relief: HardFloorRelief, surface: HardFloorSurface): void {
  const { count, radius, height: rise, place, lumps, rim, rimLift } = coverConfig.colonies;
  const { heads, height, raggedAcross, raggedDown } = relief;
  const { cover, shade } = surface;
  const colonies = Math.round(within(random, count));
  for (let i = 0; i < colonies; i++) {
    const head = heads[Math.floor(random() * heads.length)];
    const colonyRadius = Math.min(0.8 * head.radius, dotsWithin(random, radius));
    const colonyHeight = within(random, rise);
    const colonyPlace = within(random, place);
    const middle = nearTheTop(random, head, 0.35);
    const lumpCount = Math.round(within(random, lumps));
    for (let j = 0; j < lumpCount; j++) {
      const lumpRadius = colonyRadius * within(random, [0.4, 0.65]);
      const perRadius = 1 / lumpRadius;
      const lumpHeight = colonyHeight * within(random, [0.6, 1]);
      const lumpMiddle = placeNear(random, middle, colonyRadius - lumpRadius);
      forDotsNear(lumpMiddle, lumpRadius + 3, (dot, dx, dy) => {
        const across = dx + 0.15 * raggedAcross[dot];
        const down = dy + 0.15 * raggedDown[dot];
        const share = Math.sqrt(across * across + down * down) * perRadius;
        if (share >= 1) return;

        const coverage = Math.min(1, (1 - share) * lumpRadius + 0.5);
        const raised = lumpHeight * Math.sqrt(1 - share * share);
        const below = height[dot];
        height[dot] = Math.max(below, below * (1 - coverage) + (below + raised) * coverage);
        cover[dot] += (colonyPlace - cover[dot]) * coverage;
        const polyps = 0.14 * (random() - 0.5);
        const paleRim = rimLift * smoothstep(1 - rim, 1 - 0.3 * rim, share);
        shade[dot] += (polyps + paleRim) * coverage;
      });
    }
  }
}

/** Pieces of dead white coral, sticks and lumps, lodged where the floor is lower than round it. */
function paintDeadCoral(
  random: Random,
  height: Float32Array,
  standingInGutters: Float32Array,
  surface: HardFloorSurface,
): void {
  const { count, length, widthShare, height: rise, place, tries } = coverConfig.deadCoral;
  const { cover, shade } = surface;
  for (let i = 0; i < count; i++) {
    let best = randomPlace(random);
    let lowest = Infinity;
    for (let attempt = 0; attempt < tries; attempt++) {
      const candidate = randomPlace(random);
      const row = (Math.floor(candidate.y) & MASK) * SIZE;
      const standingHere = standingInGutters[row + (Math.floor(candidate.x) & MASK)];
      if (standingHere < lowest) {
        best = candidate;
        lowest = standingHere;
      }
    }
    const pieceLength = dotsWithin(random, length);
    const width = pieceLength * within(random, widthShare);
    const pieceHeight = within(random, rise);
    const angle = random() * FULL_TURN;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const piecePlace = within(random, place);
    forDotsNear(best, pieceLength / 2 + 3, (dot, dx, dy) => {
      const depth = insideCapsule(dx, dy, pieceLength, width, cosine, sine);
      if (depth < -2.5) return;

      if (depth < 0) {
        shade[dot] -= 0.1 * (1 + depth / 2.5);
        return;
      }
      const coverage = Math.min(1, depth + 0.5);
      const rounded = Math.min(1, depth / (width / 2));
      height[dot] += pieceHeight * Math.sqrt(rounded);
      cover[dot] += (piecePlace - cover[dot]) * coverage;
      shade[dot] += 0.1 * coverage * rounded;
    });
  }
}

/** Grooves an urchin has worn, and thin cracks: dark lines on the rock. */
function paintGroovesAndCracks(
  random: Random,
  heads: readonly Head[],
  height: Float32Array,
  shade: Float32Array,
): void {
  const room = roomForLines();
  const grooves = shadeConfig.urchinGrooves;
  for (let i = 0; i < grooves.count; i++) {
    const head = heads[Math.floor(random() * heads.length)];
    const halfWidth = dotsWithin(random, grooves.width) / 2;
    const line = wanderingLine(
      random,
      nearTheTop(random, head, 0.6),
      random() * FULL_TURN,
      dotsWithin(random, grooves.length),
      1.5,
      6,
    );
    paintAlongLine(room, line, halfWidth + 1, (dot, distance) => {
      const inGroove = smoothstep(halfWidth + 1, halfWidth - 1.5, distance);
      shade[dot] += (grooves.shade - shade[dot]) * inGroove * 0.8;
      height[dot] -= 0.012 * inGroove;
    });
  }

  const cracks = shadeConfig.cracks;
  const crackWidth = cracks.width * DOTS_PER_METRE;
  for (let i = 0; i < cracks.count; i++) {
    const line = wanderingLine(
      random,
      randomPlace(random),
      random() * FULL_TURN,
      dotsWithin(random, cracks.length),
      1,
      14,
    );
    paintAlongLine(room, line, crackWidth + 1, (dot, distance) => {
      shade[dot] -= cracks.darken * smoothstep(crackWidth + 1, crackWidth * 0.3, distance);
    });
  }
}

/** Clusters of small round bore holes, dark. */
function paintBoreHoles(random: Random, shade: Float32Array): void {
  const { clusters, holesEach, spread, radius, shade: holeShade } = shadeConfig.boreHoles;
  for (let i = 0; i < clusters; i++) {
    const middle = randomPlace(random);
    const reach = dotsWithin(random, spread);
    const holes = Math.round(within(random, holesEach));
    for (let j = 0; j < holes; j++) {
      const holeRadius = dotsWithin(random, radius);
      const dark = within(random, holeShade);
      forDotsNear(placeNear(random, middle, reach), holeRadius + 1, (dot, dx, dy) => {
        const inside = Math.max(0, Math.min(1, holeRadius - Math.sqrt(dx * dx + dy * dy) + 0.5));
        shade[dot] += (dark - shade[dot]) * inside;
      });
    }
  }
}

/**
 * The rock's light and dark, full strength down to a dot: the grain of every dot, pores nearly
 * black and pale flecks, the turf's mottle, and the fine relief, a knob's top lighter and the
 * crease round it dark.
 */
function paintShade(random: Random, lie: Lie): Float32Array {
  const { speckle, mottleShade, poreLevel, poreDark, fleckLevel, fleckLight, fineRelief } =
    shadeConfig;
  const pores = octaveField(random, shadeConfig.pores);
  // A million numbers, one for each dot, by a quick shift-and-mix generator seeded from the stream,
  // since the stream's own would take several times as long at start-up.
  let state = Math.floor(random() * 0xffffffff) | 1;
  const shade = new Float32Array(DOTS);
  for (let dot = 0; dot < DOTS; dot++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const grain = speckle * ((state >>> 0) / 0x80000000 - 1);
    const pore = poreDark * smoothstep(poreLevel[0], poreLevel[1], pores[dot]);
    const fleck = fleckLight * smoothstep(fleckLevel[0], fleckLevel[1], pores[dot]);
    const relief = lie.fineRelief[dot];
    const lit = relief > 0 ? fineRelief.lightPerMetre * relief : fineRelief.darkPerMetre * relief;
    shade[dot] = 0.5 + grain - pore + fleck + mottleShade * lie.mottle[dot] + lit;
  }
  return shade;
}

/**
 * What lies on the reef's hard floor and its fine light and dark. Colonies and pieces of dead coral
 * raise the relief where they lie, so they are painted before it is ranked.
 */
export function paintHardFloorSurface(random: Random, relief: HardFloorRelief): HardFloorSurface {
  const { height, heads } = relief;
  const lie: Lie = {
    standingInGutters: standing(height, coverConfig.gutterReach),
    fineRelief: standing(height, shadeConfig.fineRelief.reach),
    patches: octaveField(random, coverConfig.patchwork.octaves),
    mottle: octaveField(random, shadeConfig.mottle),
  };
  const surface = { shade: paintShade(random, lie), cover: paintPatchwork(lie) };
  paintCrusts(lie, surface);
  paintBites(random, heads, surface);
  paintColonies(random, relief, surface);
  paintDeadCoral(random, height, lie.standingInGutters, surface);
  paintGroovesAndCracks(random, heads, height, surface.shade);
  paintBoreHoles(random, surface.shade);
  return surface;
}
