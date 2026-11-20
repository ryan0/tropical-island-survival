import { FULL_TURN } from '../../core/maths';
import { within, type Random, type Range } from '../../core/random';
import {
  DOTS,
  DOTS_PER_METRE,
  dotsWithin,
  forDotsNear,
  MASK,
  mostlySmall,
  octaveField,
  paintAlongLine,
  placeNear,
  randomPlace,
  roomForLines,
  shifted,
  SIZE,
  wanderingLine,
  type Place,
} from './floor-painting';
import { seaBedConfig } from './sea-bed-config';

const config = seaBedConfig.relief;

/** An old coral head in the pavement: where it is, its radius in dots and its height in metres. */
export interface Head extends Place {
  radius: number;
  height: number;
}

export interface HardFloorRelief {
  /** Metres, not yet ranked. */
  height: Float32Array;
  heads: Head[];
  /**
   * How far each dot's outline is pushed about, in dots, each way, and the most it is pushed, so
   * that what is painted later can keep to the same ragged edges.
   */
  raggedAcross: Float32Array;
  raggedDown: Float32Array;
  raggedReach: number;
}

/** Heads one to a square of a grid, each anywhere in its square, some squares left empty. */
function layHeads(random: Random): Head[] {
  const { spacing, emptyShare, radius, smallBias, heightPerRadius } = config.heads;
  const squares = Math.round(seaBedConfig.span / spacing);
  const square = SIZE / squares;
  const heads: Head[] = [];
  for (let row = 0; row < squares; row++) {
    for (let column = 0; column < squares; column++) {
      if (random() < emptyShare) continue;

      const headRadius = mostlySmall(random, radius, smallBias);
      heads.push({
        x: (column + random()) * square,
        y: (row + random()) * square,
        radius: headRadius * DOTS_PER_METRE,
        height: headRadius * within(random, heightPerRadius),
      });
    }
  }
  return heads;
}

/**
 * Raises each head as a cluster of domes, flat-topped or round, over what is there (the higher of
 * the two, so that where domes meet a saddle is left between them). A dome is found at the dot's
 * ragged place, not its own, so that its outline is ragged.
 */
function raiseHeads(random: Random, relief: HardFloorRelief): void {
  const { height, heads, raggedAcross, raggedDown, raggedReach } = relief;
  const { lobes, lobeRadius, lobeHeight, lobeReach, flatness } = config.heads;
  const domes = new Float32Array(DOTS);
  // Written out rather than through forDotsNear: the heads are most of the painting's time.
  const raiseDome = ({ x, y }: Place, radius: number, domeHeight: number): void => {
    const domeFlatness = within(random, flatness);
    const perRadiusSquared = 1 / (radius * radius);
    const reach = radius + raggedReach;
    const right = Math.ceil(x + reach);
    const bottom = Math.ceil(y + reach);
    for (let row = Math.floor(y - reach); row <= bottom; row++) {
      const rowStart = (row & MASK) * SIZE;
      const dy = row + 0.5 - y;
      for (let column = Math.floor(x - reach); column <= right; column++) {
        const dot = rowStart + (column & MASK);
        if (domes[dot] >= domeHeight) continue;

        const across = column + 0.5 - x + raggedAcross[dot];
        const down = dy + raggedDown[dot];
        const shareSquared = (across * across + down * down) * perRadiusSquared;
        if (shareSquared >= 1) continue;

        const dome = domeHeight * (1 - shareSquared) ** domeFlatness;
        if (dome > domes[dot]) domes[dot] = dome;
      }
    }
  };
  for (const head of heads) {
    raiseDome(head, head.radius * within(random, lobeRadius), head.height);
    const count = Math.round(within(random, lobes));
    for (let i = 0; i < count; i++) {
      raiseDome(
        placeNear(random, head, lobeReach * head.radius),
        head.radius * within(random, lobeRadius),
        head.height * within(random, lobeHeight),
      );
    }
  }
  for (let dot = 0; dot < DOTS; dot++) height[dot] += domes[dot];
}

/** Gutters that wander between the heads and sometimes fork, each a rounded trough with ragged sides. */
function cutGutters(random: Random, relief: HardFloorRelief): void {
  const { count, width, length, depth, turning, forkChance } = config.gutters;
  const { height, raggedAcross, raggedDown, raggedReach } = relief;
  const room = roomForLines();
  for (let i = 0; i < count; i++) {
    const halfWidth = dotsWithin(random, width) / 2;
    const gutterDepth = within(random, depth);
    const heading = random() * FULL_TURN;
    const step = 0.7 * halfWidth;
    const line = wanderingLine(
      random,
      randomPlace(random),
      heading,
      dotsWithin(random, length),
      step,
      turning,
    );
    if (random() < forkChance) {
      const forkAt = line[Math.floor(line.length * within(random, [0.3, 0.7]))];
      const forkHeading = heading + (random() < 0.5 ? -1 : 1) * within(random, [0.5, 1.1]);
      const forkLength = dotsWithin(random, length) * 0.6;
      line.push(...wanderingLine(random, forkAt, forkHeading, forkLength, step, turning));
    }
    paintAlongLine(room, line, halfWidth + raggedReach, (dot, distance) => {
      // The ragged push read once more, so that a gutter's side is as ragged as a head's.
      const share = (distance + raggedAcross[dot] - raggedDown[dot]) / halfWidth;
      if (share >= 1) return;

      height[dot] -= gutterDepth * (1 - share * share);
    });
  }
}

/** Small bumps (lumps) or hollows (holes), each a ragged dome of its own, added to what is there. */
function scatterBumps(
  random: Random,
  relief: HardFloorRelief,
  perSquareMetre: number,
  radius: Range,
  rise: Range,
  sign: number,
): void {
  const { height, raggedAcross, raggedDown } = relief;
  const { bumpRaggedness } = config;
  const count = Math.round(perSquareMetre * seaBedConfig.span ** 2);
  for (let i = 0; i < count; i++) {
    const bumpRadius = mostlySmall(random, radius, 1.5) * DOTS_PER_METRE;
    const bumpHeight = sign * within(random, rise);
    // The finer the bump, the less it is pushed, so that it stays one bump and does not scatter.
    const push = bumpRaggedness * Math.min(1, bumpRadius / (relief.raggedReach + 1));
    const perRadiusSquared = 1 / (bumpRadius * bumpRadius);
    forDotsNear(randomPlace(random), bumpRadius + push * relief.raggedReach, (dot, dx, dy) => {
      const across = dx + push * raggedAcross[dot];
      const down = dy + push * raggedDown[dot];
      const shareSquared = (across * across + down * down) * perRadiusSquared;
      if (shareSquared >= 1) return;

      height[dot] += bumpHeight * Math.sqrt(1 - shareSquared);
    });
  }
}

/**
 * The relief of reef pavement: old coral heads, cemented together, with gutters and pools between,
 * on a floor that swells and sinks over metres; small lumps and holes over all of it, and knobs
 * of a few centimetres. Heights in metres.
 */
export function paintHardFloorRelief(random: Random): HardFloorRelief {
  const raggedAcross = octaveField(random, config.ragged);
  let squares = 0;
  for (let dot = 0; dot < DOTS; dot++) {
    raggedAcross[dot] *= DOTS_PER_METRE;
    squares += raggedAcross[dot] * raggedAcross[dot];
  }
  // Three times the typical push: a dot pushed further than that is rare enough to be left out,
  // and looking that far, not as far as the farthest push, saves much of the time.
  const raggedReach = 3 * Math.sqrt(squares / DOTS);
  const relief: HardFloorRelief = {
    height: octaveField(random, config.broadSwell),
    heads: layHeads(random),
    raggedAcross,
    // The same noise from a far part of the picture: it does not follow the other way's.
    raggedDown: shifted(raggedAcross, SIZE / 2 + 37, SIZE / 3),
    raggedReach: Math.ceil(raggedReach),
  };
  raiseHeads(random, relief);
  cutGutters(random, relief);
  const { lumps, holes } = config;
  scatterBumps(random, relief, lumps.perSquareMetre, lumps.radius, lumps.height, 1);
  scatterBumps(random, relief, holes.perSquareMetre, holes.radius, holes.depth, -1);
  const knobs = octaveField(random, config.knobs);
  for (let dot = 0; dot < DOTS; dot++) relief.height[dot] += Math.abs(knobs[dot]);
  return relief;
}
