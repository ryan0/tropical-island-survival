import { FULL_TURN, smoothstep } from '../../core/maths';
import { within, type Random } from '../../core/random';
import {
  addOctaves,
  DOTS,
  DOTS_PER_METRE,
  dotsWithin,
  forDotsNear,
  mostlySmall,
  octaveField,
  paintAlongLine,
  placeNear,
  randomPlace,
  roomForLines,
  type Place,
} from './floor-painting';
import { seaBedConfig } from './sea-bed-config';

const config = seaBedConfig.sand;

/**
 * A mound's height at a share of its radius from the middle: a cone with a rounded top and a skirt
 * that eases into the level sand. `fresh` 1 is a sharp new cone; 0 an old one slumped to a dome.
 */
function moundProfile(share: number, fresh: number): number {
  const cone = 1 - share;
  const roundedTop = share < 0.2 ? 0.9 - (share * share) / 0.4 : cone;
  const dome = smoothstep(1, 0, share);
  return roundedTop + (dome - roundedTop) * (0.75 - 0.5 * fresh);
}

/** Mounds of sand thrown up by burrowing shrimps and worms, most with a funnel pit near by. */
function raiseMoundsAndPits(random: Random, sand: Float32Array): void {
  const { mounds, pits } = config;
  const raggedness = octaveField(random, {
    broadest: 0.1,
    finest: 0.04,
    amplitude: 1,
    falloff: 0.5,
  });
  for (let i = 0; i < mounds.count; i++) {
    const middle = randomPlace(random);
    const radius = mostlySmall(random, mounds.radius, mounds.smallBias) * DOTS_PER_METRE;
    const isFresh = random() < mounds.freshShare;
    const fresh = isFresh ? 1 : 0.4 * random();
    const height = within(random, isFresh ? mounds.freshHeight : mounds.oldHeight);
    const ragged = mounds.ragged * (1 - 0.5 * fresh);
    const ventRadius = mounds.ventRadius * DOTS_PER_METRE * within(random, [0.7, 1.3]);
    forDotsNear(middle, radius * (1 + ragged), (dot, dx, dy) => {
      const distance = Math.sqrt(dx * dx + dy * dy);
      const share = distance / (radius * (1 + ragged * raggedness[dot]));
      if (share >= 1) return;

      sand[dot] += height * moundProfile(share, fresh);
      if (isFresh && distance < ventRadius) {
        sand[dot] -= mounds.ventDepth * (1 - (distance * distance) / (ventRadius * ventRadius));
      }
    });

    if (random() > pits.shareOfMounds) continue;

    const pitRadius = dotsWithin(random, pits.radius);
    const depth = within(random, pits.depth);
    const away = radius + dotsWithin(random, pits.distance) * 0.6;
    forDotsNear(placeNear(random, middle, away), pitRadius, (dot, dx, dy) => {
      const share = Math.sqrt(dx * dx + dy * dy) / pitRadius;
      if (share >= 1) return;

      // A funnel: steepest at its middle, easing out to the level sand at its rim.
      sand[dot] -= depth * (1 - share) ** 2 * (1 + share);
    });
  }
}

/**
 * The line a creature ploughed: straight stretches, each bending a little, with sudden turns
 * between them and now and then a loop. As places `step` dots apart.
 */
function trailLine(random: Random, lengthDots: number, step: number): Place[] {
  const { stretch, bend, turn, loopChance, loopRadius } = config.trails;
  let { x, y } = randomPlace(random);
  let heading = random() * FULL_TURN;
  const places: Place[] = [{ x, y }];
  const go = (distance: number, turning: number): void => {
    const steps = Math.max(1, Math.round(distance / step));
    for (let i = 0; i < steps; i++) {
      heading += turning / steps;
      x += step * Math.cos(heading);
      y += step * Math.sin(heading);
      places.push({ x, y });
    }
  };
  for (let travelled = 0; travelled < lengthDots;) {
    const stretchDots = dotsWithin(random, stretch);
    go(stretchDots, bend * (2 * random() - 1));
    travelled += stretchDots;
    const side = random() < 0.5 ? -1 : 1;
    if (random() < loopChance) {
      const loopDots = FULL_TURN * dotsWithin(random, loopRadius);
      go(loopDots, side * FULL_TURN * within(random, [0.9, 1.2]));
      travelled += loopDots;
    } else {
      go(dotsWithin(random, [0.01, 0.03]), side * within(random, turn));
    }
  }
  return places;
}

/** How deep a trail is along its length, 0 to 1: it fades in and out, smoothly, at random. */
function trailFading(random: Random, places: number, step: number): Float32Array {
  const placesPerFade = Math.max(2, Math.round((config.trails.fadeLength * DOTS_PER_METRE) / step));
  const knots = Math.ceil(places / placesPerFade) + 2;
  const depths = Float32Array.from({ length: knots }, () => smoothstep(0.15, 0.75, random()));
  return Float32Array.from({ length: places }, (_, place) => {
    const along = place / placesPerFade;
    const knot = Math.floor(along);
    const share = smoothstep(0, 1, along - knot);
    return depths[knot] + (depths[knot + 1] - depths[knot]) * share;
  });
}

/** Long trails a creature left as it ploughed along: a furrow with low raised sides. */
function ploughTrails(random: Random, sand: Float32Array): void {
  const { count, length, width, depth, sides } = config.trails;
  const room = roomForLines();
  const step = 1.5;
  for (let i = 0; i < count; i++) {
    const halfWidth = dotsWithin(random, width) / 2;
    const line = trailLine(random, dotsWithin(random, length), step);
    const fading = trailFading(random, line.length, step);
    paintAlongLine(room, line, 3 * halfWidth, (dot, distance, place) => {
      const share = distance / halfWidth;
      const furrow = Math.exp(-2 * share * share);
      const side = Math.exp(-4 * (share - 1.4) * (share - 1.4));
      sand[dot] += fading[place] * (sides * side - depth * furrow);
    });
  }
}

/** Coiled heaps of a worm's casts: a low heap with a thick thread wound over it. */
function heapCasts(random: Random, sand: Float32Array): void {
  const { count, radius, height, thread } = config.casts;
  const room = roomForLines();
  const threadDots = thread * DOTS_PER_METRE;
  for (let i = 0; i < count; i++) {
    const middle = randomPlace(random);
    const heapRadius = dotsWithin(random, radius);
    forDotsNear(middle, heapRadius, (dot, dx, dy) => {
      const share = Math.sqrt(dx * dx + dy * dy) / heapRadius;
      if (share < 1) sand[dot] += 0.4 * height * (1 - share * share);
    });
    const coil: Place[] = [];
    const turns = within(random, [1.5, 3]);
    const start = random() * FULL_TURN;
    for (let along = 0; along <= 1; along += 0.5 / (turns * heapRadius)) {
      const angle = start + along * turns * FULL_TURN;
      const reach = heapRadius * (1 - 0.8 * along);
      coil.push({ x: middle.x + reach * Math.cos(angle), y: middle.y + reach * Math.sin(angle) });
    }
    paintAlongLine(room, coil, threadDots + 1, (dot, distance) => {
      const share = distance / (threadDots + 1);
      sand[dot] += 0.6 * height * Math.sqrt(1 - share * share);
    });
  }
}

/** Shallow dishes where a ray fed, with a low rim of the sand it blew out. */
function scoopRayDishes(random: Random, sand: Float32Array): void {
  const { count, radius, depth, rim } = config.rayDishes;
  for (let i = 0; i < count; i++) {
    const dishRadius = dotsWithin(random, radius);
    forDotsNear(randomPlace(random), dishRadius * 1.4, (dot, dx, dy) => {
      const share = Math.sqrt(dx * dx + dy * dy) / dishRadius;
      const bowl = share < 1 ? depth * (1 - share * share) ** 2 : 0;
      const raised = rim * Math.exp(-((share - 1.05) ** 2) / 0.02);
      sand[dot] += raised - bowl;
    });
  }
}

/**
 * The relief of a lagoon's sand floor that burrowers have worked over, level sand at `level`:
 * mounds and funnel pits, trails, worm casts and the dishes rays leave.
 */
export function paintLivedInSand(random: Random): Float32Array {
  const sand = new Float32Array(DOTS).fill(config.level);
  addOctaves(random, sand, config.unevenness);
  raiseMoundsAndPits(random, sand);
  ploughTrails(random, sand);
  heapCasts(random, sand);
  scoopRayDishes(random, sand);
  return sand;
}
