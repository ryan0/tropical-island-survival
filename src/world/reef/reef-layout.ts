import { within, type Random, type Range } from '../../core/random';
import type { GroundHeight, Landmarks, Point } from '../landmarks';
import { reefConfig, type CoralKind } from './reef-config';

// Where the reef's corals go. Coral heads - mounds of old reef rock, "bommies" - stand in patches
// on the sandy floor 1.3-7 m down, each packed with corals, with rubble round its foot and smaller
// corals on the sand about it. On the reef slopes, deeper down, corals grow straight on the floor.
// Everything takes its numbers from the reef's one stream in a fixed order, so changing what one
// coral draws, or whether it draws at all, moves every coral after it.

/** A coral head. */
export interface CoralHead {
  x: number;
  z: number;
  /** The height of the sea floor under it. */
  floor: number;
  radius: number;
  /** How high it stands above the floor. */
  height: number;
}

/** Where one coral, head or lump of rubble goes. */
export interface PlacedCoral {
  x: number;
  y: number;
  z: number;
  size: number;
  /** How far it leans outward with the slope of the head it grows on. */
  tilt: number;
  /** The direction it leans in; a head is turned to it. */
  bearing: number;
  /** How much lower than its width it is. */
  squash: number;
}

export interface ReefLayout {
  heads: CoralHead[];
  /** For each kind, the corals of each of its models: `corals[kind][model]`. */
  corals: Record<CoralKind, PlacedCoral[][]>;
}

/** Whether a point is inside a rock or within `margin` of one. */
export type IsInRock = (x: number, z: number, margin: number) => boolean;

export interface ReefLayoutDependencies {
  /** The reef's stream of random numbers. */
  random: Random;
  groundHeight: GroundHeight;
  isInRock: IsInRock;
  landmarks: Landmarks;
}

/** Places corals, keeping only those that fit under the surface and clear of the rocks. */
interface CoralPlacer {
  random: Random;
  groundHeight: GroundHeight;
  isInRock: IsInRock;
  /** One that would reach too near the surface is made smaller, and left out if then too small. */
  put(kind: CoralKind, coral: PlacedCoral): void;
  corals: ReefLayout['corals'];
}

type TopCoralKind = 'bush' | 'table' | 'brain' | 'knob' | 'stag';

// Rounded, not 2π: where every coral falls depends on the exact number.
const FULL_TURN = 6.283;

/** A head's rock is sunk this share of its height into the floor, so that it grows out of it. */
const SUNK_SHARE = 0.12;
/** The rock stands this many times the head's height above its sunken foot: the part sunk, too. */
export const HEAD_ROCK_HEIGHT = 1.12;

const HEAD_SEARCH = { tries: 60000, most: 70, reachFromHome: 150 };
const HEAD_FLOOR = { shallowest: -1.3, deepest: -7 };
/** Heads keep this far clear of rocks, and of the water along the pier. */
const HEAD_CLEAR_OF_ROCKS = 1.5;
const PIER_CLEARANCE = { toEachSide: 8, alongBeyondLength: 10 };
/** A head lower than this is not made. */
const LOWEST_HEAD = 0.4;
/** Neighbouring heads may crowd each other, but no closer than this share of their radii. */
const CROWDING = 0.9;

/** How far out from a head's middle, in radii, its flat top gives way to its sides. */
const SIDES_FROM = 0.8;
const TOP_CORAL_SIZES: Record<TopCoralKind, Range> = {
  table: [0.7, 1.7],
  stag: [0.6, 1.1],
  brain: [0.6, 1.9],
  bush: [0.6, 1.3],
  knob: [0.6, 1.2],
};
/** Corals grow on the sand about a head only where it is at least this deep. */
const SAND_CORALS_SHALLOWEST = -1;

const SLOPES = { tries: 60000, corals: 900, reachFromHome: 160, shallowest: -2.5, deepest: -8 };

/** Every coral kept is this far clear of the rocks. */
const CORAL_CLEAR_OF_ROCKS = 0.2;

function noCorals(): ReefLayout['corals'] {
  const models = (kind: CoralKind): PlacedCoral[][] =>
    Array.from({ length: reefConfig.kinds[kind].shapes }, () => []);
  return {
    head: models('head'),
    rubble: models('rubble'),
    brain: models('brain'),
    bush: models('bush'),
    stag: models('stag'),
    table: models('table'),
    knob: models('knob'),
    smallKnob: models('smallKnob'),
    smallBrain: models('smallBrain'),
    clam: models('clam'),
  };
}

function createCoralPlacer(dependencies: ReefLayoutDependencies): CoralPlacer {
  const { random, groundHeight, isInRock } = dependencies;
  const { highestTop, smallestSize } = reefConfig;
  const corals = noCorals();

  function put(kind: CoralKind, coral: PlacedCoral): void {
    const { shapes, tall } = reefConfig.kinds[kind];
    const { x, y, z, squash } = coral;
    let size = coral.size;
    if (y + tall * size * squash > highestTop) size = (highestTop - y) / (tall * squash);
    if (size < smallestSize || isInRock(x, z, CORAL_CLEAR_OF_ROCKS)) return;
    corals[kind][Math.floor(random() * shapes)].push({ ...coral, size });
  }

  return { random, groundHeight, isInRock, put, corals };
}

/** The height of a head's foot, sunk a little into the sea floor. */
export function bottomOfHead(head: CoralHead): number {
  return head.floor - SUNK_SHARE * head.height;
}

/** The height of a head's top `radiiOut` radii from its middle: nearly flat, falling at the rim. */
function topOfHead(head: CoralHead, radiiOut: number): number {
  const profile = Math.pow(Math.max(0, 1 - Math.pow(radiiOut, 3.5)), 0.5);
  return bottomOfHead(head) + 1.03 * head.height * profile;
}

/** A point `radiiOut` radii from a head's middle, towards `towards`. */
function aroundHead(head: CoralHead, towards: number, radiiOut: number): Point {
  return {
    x: head.x + Math.cos(towards) * radiiOut * head.radius,
    z: head.z + Math.sin(towards) * radiiOut * head.radius,
  };
}

/** Corals on a head's sides lean outward with its slope. */
function leanAt(radiiOut: number): number {
  return radiiOut > SIDES_FROM ? (radiiOut - SIDES_FROM) * 4 : 0;
}

function headPatches(x: number, z: number): number {
  return (
    Math.sin(x * 0.11 + 1.7 * Math.sin(z * 0.07)) *
    Math.sin(z * 0.13 + 1.2 * Math.sin(x * 0.09) + 1)
  );
}

function slopePatches(x: number, z: number): number {
  return (
    Math.sin(x * 0.045 + 1.3 * Math.sin(z * 0.05)) *
    Math.sin(z * 0.04 + 1.6 * Math.sin(x * 0.035) + 2)
  );
}

function isAlongThePier(pier: Landmarks['pier'], x: number, z: number): boolean {
  return (
    Math.abs(x - pier.x) < PIER_CLEARANCE.toEachSide &&
    Math.abs(z - pier.z0) < pier.length + PIER_CLEARANCE.alongBeyondLength
  );
}

/**
 * The coral heads: in patches, clear of the pier. Where the water is shallow enough they grow up
 * to just under the surface, as wide flat platforms; in deeper water they are lower mounds.
 * Each head's rock is placed as it is found, so its numbers are drawn before the next head's.
 */
function findHeads(placer: CoralPlacer, landmarks: Landmarks): CoralHead[] {
  const { random, groundHeight, isInRock } = placer;
  const { home, pier } = landmarks;
  const heads: CoralHead[] = [];
  for (let tries = 0; tries < HEAD_SEARCH.tries && heads.length < HEAD_SEARCH.most; tries++) {
    const x = home.x + (random() * 2 - 1) * HEAD_SEARCH.reachFromHome;
    const z = home.z + (random() * 2 - 1) * HEAD_SEARCH.reachFromHome;
    const floor = groundHeight(x, z);
    if (floor > HEAD_FLOOR.shallowest || floor < HEAD_FLOOR.deepest) continue;
    // A random threshold, so that the patches have ragged edges.
    if (headPatches(x, z) < 0.1 + random() * 0.3) continue;
    if (isInRock(x, z, HEAD_CLEAR_OF_ROCKS) || isAlongThePier(pier, x, z)) continue;

    // Most are small, a few wide; each reaches to about 0.7-1 m under the surface, unless that
    // would make it too tall for its width.
    const radius = 1.4 + random() * random() * 5.5;
    const height = Math.min(-floor - 0.72 - 0.3 * random(), 1.2 + radius * 0.6);
    if (height <= LOWEST_HEAD) continue;
    const crowds = (other: CoralHead) =>
      Math.hypot(x - other.x, z - other.z) < (radius + other.radius) * CROWDING;
    if (heads.some(crowds)) continue;

    const head: CoralHead = { x, z, floor, radius, height };
    heads.push(head);
    const bearing = random() * FULL_TURN;
    const squash = (height * HEAD_ROCK_HEIGHT) / radius;
    placer.put('head', { x, y: bottomOfHead(head), z, size: radius, tilt: 0, bearing, squash });
  }
  return heads;
}

/** Bushes, tables and lobed mounds on top; mounds and knobs down the sides. */
function pickCoralOnTop(random: Random, radiiOut: number): TopCoralKind {
  const pick = random();
  if (radiiOut < SIDES_FROM) {
    if (pick < 0.36) return 'bush';
    if (pick < 0.56) return 'table';
    if (pick < 0.8) return 'brain';
    return pick < 0.93 ? 'knob' : 'stag';
  }
  if (pick < 0.5) return 'brain';
  return pick < 0.75 ? 'bush' : 'knob';
}

function layCoralsOnTop(placer: CoralPlacer, head: CoralHead, count: number): void {
  const { random } = placer;
  // Small heads carry smaller corals.
  const scale = Math.min(1, 0.5 + head.radius * 0.2);
  for (let i = 0; i < count; i++) {
    const towards = random() * FULL_TURN;
    const radiiOut = Math.sqrt(random()) * 1.04;
    const kind = pickCoralOnTop(random, radiiOut);
    const size = within(random, TOP_CORAL_SIZES[kind]) * scale;
    const { x, z } = aroundHead(head, towards, radiiOut);
    const y = topOfHead(head, radiiOut) - 0.06;
    placer.put(kind, { x, y, z, size, tilt: leanAt(radiiOut), bearing: towards, squash: 1 });
  }
}

/** Between the corals on a head, a carpet of small ones, so that little bare rock shows. */
function layCarpet(placer: CoralPlacer, head: CoralHead): void {
  const { random } = placer;
  const count = head.radius * head.radius * 2.6;
  for (let i = 0; i < count; i++) {
    const towards = random() * FULL_TURN;
    const radiiOut = Math.sqrt(random());
    const kind = random() < 0.5 ? 'smallKnob' : random() < 0.7 ? 'smallBrain' : 'bush';
    const size = 0.3 + random() * 0.35;
    const { x, z } = aroundHead(head, towards, radiiOut);
    const y = topOfHead(head, radiiOut) - 0.05;
    placer.put(kind, { x, y, z, size, tilt: leanAt(radiiOut), bearing: towards, squash: 1 });
  }
}

/** Broken rock round the foot of a head, half sunk in the sand; most of it close in. */
function layRubble(placer: CoralPlacer, head: CoralHead): void {
  const { random, groundHeight } = placer;
  const count = 5 + head.radius * 5;
  for (let i = 0; i < count; i++) {
    const towards = random() * FULL_TURN;
    const radiiOut = 0.95 + random() * random();
    const { x, z } = aroundHead(head, towards, radiiOut);
    const size = 0.3 + random() * random() * 0.9;
    const bearing = random() * FULL_TURN;
    const squash = 0.6 + random() * 0.4;
    placer.put('rubble', { x, y: groundHeight(x, z) - 0.08, z, size, tilt: 0, bearing, squash });
  }
}

/** A few giant clams set into the top of a head. */
function layClams(placer: CoralPlacer, head: CoralHead): void {
  const { random } = placer;
  const count = 1 + head.radius * 0.5;
  for (let i = 0; i < count; i++) {
    const towards = random() * FULL_TURN;
    const radiiOut = Math.sqrt(random()) * 0.75;
    const { x, z } = aroundHead(head, towards, radiiOut);
    const y = topOfHead(head, radiiOut) - 0.12;
    const size = 0.3 + random() * 0.3;
    placer.put('clam', { x, y, z, size, tilt: 0, bearing: towards, squash: 1 });
  }
}

/** Smaller corals on the sand about a head, about a third as many as on its top. */
function layCoralsOnSand(placer: CoralPlacer, head: CoralHead, coralsOnTop: number): void {
  const { random, groundHeight } = placer;
  const count = coralsOnTop * 0.3;
  for (let i = 0; i < count; i++) {
    const towards = random() * FULL_TURN;
    const radiiOut = 1.1 + random() * 0.9;
    const { x, z } = aroundHead(head, towards, radiiOut);
    const floor = groundHeight(x, z);
    if (floor > SAND_CORALS_SHALLOWEST) continue;
    const kind = random() < 0.45 ? 'brain' : random() < 0.5 ? 'knob' : 'bush';
    const size = 0.4 + random() * 0.6;
    const bearing = random() * FULL_TURN;
    placer.put(kind, { x, y: floor - 0.03, z, size, tilt: 0, bearing, squash: 1 });
  }
}

/**
 * Each head is packed with coral: bushes, tables and lobed mounds on top, mounds and knobs down
 * its sides; then smaller corals on the sand about it.
 */
function coverHead(placer: CoralPlacer, head: CoralHead): void {
  const coralsOnTop = Math.round(6 + head.radius * head.radius * 4.4);
  layCoralsOnTop(placer, head, coralsOnTop);
  layCarpet(placer, head);
  layRubble(placer, head);
  layClams(placer, head);
  layCoralsOnSand(placer, head, coralsOnTop);
}

/** Mostly the simple small knobs and mounds. */
function pickSlopeCoral(random: Random): CoralKind {
  if (random() < 0.5) return 'smallKnob';
  if (random() < 0.6) return 'smallBrain';
  return random() < 0.5 ? 'knob' : 'bush';
}

/**
 * The reef slopes, 2.5-8 m down: knob and lobed corals growing thickly straight on the sea floor,
 * in broad patches. Those offered count towards the number wanted even if they are left out.
 */
function laySlopes(placer: CoralPlacer, home: Point): void {
  const { random, groundHeight } = placer;
  for (let tries = 0, offered = 0; tries < SLOPES.tries && offered < SLOPES.corals; tries++) {
    const x = home.x + (random() * 2 - 1) * SLOPES.reachFromHome;
    const z = home.z + (random() * 2 - 1) * SLOPES.reachFromHome;
    const floor = groundHeight(x, z);
    if (floor > SLOPES.shallowest || floor < SLOPES.deepest) continue;
    if (slopePatches(x, z) < 0.05 + random() * 0.3) continue;
    const kind = pickSlopeCoral(random);
    const size = 0.45 + random() * 0.9;
    const bearing = random() * FULL_TURN;
    placer.put(kind, { x, y: floor - 0.04, z, size, tilt: 0, bearing, squash: 1 });
    offered++;
  }
}

export function layOutReef(dependencies: ReefLayoutDependencies): ReefLayout {
  const placer = createCoralPlacer(dependencies);
  const heads = findHeads(placer, dependencies.landmarks);
  for (const head of heads) coverHead(placer, head);
  laySlopes(placer, dependencies.landmarks.home);
  return { heads, corals: placer.corals };
}
