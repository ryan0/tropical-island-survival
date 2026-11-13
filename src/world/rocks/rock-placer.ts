import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { smoothstep } from '../../core/maths';
import type { Random } from '../../core/random';
import type { IslandShape } from '../island-shape';
import type { Landmarks } from '../landmarks';
import { rocksConfig, type RockKind, type RockKindConfig, type RockTint } from './rocks-config';

// What the steps of rock-placement.ts lay the rocks with: one rock, a group of them, and the
// directions and shores to put them on. It gathers up everything put down.

export interface PlacedRock {
  matrix: Matrix4;
  colour: Color;
}

/** Every rock of one shape of one kind: they are drawn together. */
export interface RocksOfOneShape {
  kind: RockKind;
  seed: number;
  rocks: PlacedRock[];
}

export interface RockSpot {
  x: number;
  z: number;
  radius: number;
}

export interface RockInSurf {
  x: number;
  z: number;
  radius: number;
  /** The height of the ground it stands on. */
  groundHeight: number;
}

export interface RockPlacement {
  /** In the order each shape was first used. */
  shapes: RocksOfOneShape[];
  /** Every rock bigger than a cobble, so that plants can be kept out of them. */
  spots: RockSpot[];
  /** Rocks standing in the surf, which throw spray and gather foam. */
  inSurf: RockInSurf[];
}

export type Rgb = readonly [number, number, number];
/** The least, and how much more may be added to it at random. */
type Spread = readonly [least: number, more: number];
export type Shore = 'ocean' | 'lagoon';

export interface Rock {
  kind: RockKind;
  x: number;
  z: number;
  /** About how far it reaches from its middle; each rock is stretched a little differently. */
  size: number;
  /** Which way it faces, give or take a little. Any way if not given. */
  heading?: number;
  /** Its colour, made a little lighter or darker. Its kind's own if not given. */
  colour?: Rgb;
}

/**
 * A group: `big` large rocks close together, `middling` smaller ones round them, cobbles
 * spilling out furthest.
 */
export interface RockGroup {
  kind: RockKind;
  /** It lies round where the beach of this shore, in this direction, is `height` above the sea. */
  shore: Shore;
  direction: number;
  height: number;
  big: number;
  middling: number;
  cobbles: number;
  /** The size of its large rocks, and so how far it spreads. */
  size: number;
}

export interface BearingChoice {
  count: number;
  /** How far apart they are, at least, from each other and from the directions avoided. */
  apart: number;
  avoiding: readonly number[];
}

export interface RockPlacer {
  random: Random;
  island: IslandShape;
  /** Puts a rock down wherever it is asked to. */
  place(rock: Rock): void;
  /** Puts a rock down unless it would be in the way; then it draws no random numbers either. */
  placeIfClear(rock: Rock): void;
  /** Lays a group, if the beach it lies on is found. */
  layGroup(group: RockGroup): void;
  /** Up to `count` directions round the atoll that miss the pass, most on rocky stretches. */
  bearings(choice: BearingChoice): number[];
  /** How rocky the island is in a direction: 0 is clean beach. */
  rockiness(direction: number): number;
  /** How far from the middle the ocean beach is `height` above the sea, coming in from the sea. */
  oceanBeachDistance(direction: number, height: number): number | null;
  /** Everything put down so far. */
  placement(): RockPlacement;
}

// Rounded, not 2π: where every rock falls depends on the exact number.
const FULL_TURN = 6.283;

/**
 * How far a rock leans about each level axis, from one side to the other: slabs and karst lie
 * nearly level.
 */
const LEAN = { level: 0.1, tipped: 0.5 };
/** How far a rock given a heading may turn from it, from one side to the other. */
const HEADING_SPREAD = 0.5;
/** A rock given its colour is made this much lighter or darker. */
const GIVEN_COLOUR_BRIGHTNESS: Spread = [0.85, 0.3];

/** How each kind is stretched across, up and along, as shares of its size. */
interface Proportions {
  width: Spread;
  height: Spread;
  depth: Spread;
}
const ROUNDED: Proportions = { width: [0.9, 0.45], height: [0.75, 0.4], depth: [0.85, 0.4] };
const PROPORTIONS: Record<RockKind, Proportions> = {
  boulder: ROUNDED,
  crag: ROUNDED,
  cobble: ROUNDED,
  slab: { width: [0.9, 0.45], height: [0.9, 0.5], depth: [0.85, 0.4] },
  karst: { width: [1.2, 0.6], height: [0.6, 0.45], depth: [1.1, 0.6] },
};

/** How much of a rock's size plants keep clear of, and how much the surf breaks round. */
const SPOT_RADIUS = { level: 1, tipped: 0.8 };
const SURF_RADIUS = { level: 0.8, tipped: 1 };
/**
 * A rock stands in the surf if it is big enough and on the ocean side, on ground from shallow
 * water to just up the beach.
 */
const SURF = {
  smallestSize: 0.45,
  deepestGround: -2.2,
  highestGround: 0.4,
  furthestInsideShore: 9,
};

/** How far rocks keep from what people use, besides their own size. */
const CLEARANCE = { pier: 3, hut: 8, path: 1.6, fire: 3.5 };
/**
 * The beach in front of home is left bare: from west to east of home, and from inland to
 * seaward of its shoreline.
 */
const HOME_BEACH = { west: 10, east: 17, inland: 10, seaward: 9 };

/** A beach is looked for in steps this long, coming in from the sea or up out of the lagoon. */
const BEACH_SEARCH_STEP = 0.2;
const OCEAN_SEARCH = { outsideShoreline: 10, insideShoreline: 18 };
const LAGOON_SEARCH = { inLagoon: 14, onLand: 16 };

/** Directions with more of the pass than this are left bare. */
const MOST_PASS_GAP = 0.02;
/** A clean stretch takes about one in twenty-five of the directions offered to it. */
const CLEAN_STRETCH_TAKES = 0.04;
const TRIES_PER_BEARING = 7;
/** A reach is fully rocky within this share of its half-width, fading to clean beach by this. */
const REACH_FULL_WITHIN = 0.6;
const REACH_FADES_BY = 1.3;

function spread(random: Random, [least, more]: Spread): number {
  return least + random() * more;
}

/** How far apart two directions are, the short way round. */
function angleBetween(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function isNearAny(direction: number, others: readonly number[], within: number): boolean {
  return others.some((other) => angleBetween(direction, other) < within);
}

/** How rocky the island is in a direction: 0 is clean beach. */
function rockiness(direction: number): number {
  let rockiest = 0;
  for (const [middle, halfWidth, howRocky] of rocksConfig.reaches) {
    const fade = smoothstep(
      halfWidth * REACH_FULL_WITHIN,
      halfWidth * REACH_FADES_BY,
      angleBetween(direction, middle),
    );
    rockiest = Math.max(rockiest, howRocky * (1 - fade));
  }
  return rockiest;
}

/**
 * Up to `count` directions round the atoll that miss the pass, most of them on rocky stretches.
 */
function bearings(random: Random, island: IslandShape, choice: BearingChoice): number[] {
  const { count, apart, avoiding } = choice;
  const found: number[] = [];
  for (let tries = 0; found.length < count && tries < count * TRIES_PER_BEARING; tries++) {
    const direction = random() * FULL_TURN;
    if (island.passGap(direction) >= MOST_PASS_GAP) continue;
    const chance = CLEAN_STRETCH_TAKES + (1 - CLEAN_STRETCH_TAKES) * rockiness(direction);
    if (random() >= chance) continue;
    if (isNearAny(direction, avoiding, apart) || isNearAny(direction, found, apart)) continue;
    found.push(direction);
  }
  return found;
}

/**
 * How far from the atoll's middle the ocean beach is `height` above the sea, coming in from the
 * sea.
 */
function oceanBeachDistance(island: IslandShape, direction: number, height: number): number | null {
  const cos = Math.cos(direction);
  const sin = Math.sin(direction);
  const shoreline = island.radius(direction);
  const start = shoreline + OCEAN_SEARCH.outsideShoreline;
  const end = shoreline - OCEAN_SEARCH.insideShoreline;
  for (let r = start; r > end; r -= BEACH_SEARCH_STEP) {
    if (island.groundHeight(cos * r, sin * r) >= height) return r;
  }
  return null;
}

/**
 * How far from the atoll's middle the lagoon beach is `height` above the sea, coming up out of
 * the lagoon.
 */
function lagoonBeachDistance(
  island: IslandShape,
  direction: number,
  height: number,
): number | null {
  const cos = Math.cos(direction);
  const sin = Math.sin(direction);
  const shoreline = island.radius(direction) - island.landWidth(direction);
  const start = shoreline - LAGOON_SEARCH.inLagoon;
  const end = shoreline + LAGOON_SEARCH.onLand;
  for (let r = start; r < end; r += BEACH_SEARCH_STEP) {
    if (island.groundHeight(cos * r, sin * r) >= height) return r;
  }
  return null;
}

function beachDistance(
  island: IslandShape,
  shore: Shore,
  direction: number,
  height: number,
): number | null {
  return shore === 'ocean'
    ? oceanBeachDistance(island, direction, height)
    : lagoonBeachDistance(island, direction, height);
}

/**
 * Rocks are kept out of the way of what people use: the pier, the hut, the paths, the fire and
 * the beach in front of home.
 */
function isOutOfTheWay(landmarks: Landmarks, x: number, z: number, size: number): boolean {
  const { pier, hut, fire, home, homeShoreZ } = landmarks;
  if (
    Math.abs(x - pier.x) < CLEARANCE.pier + size &&
    z > pier.z0 - CLEARANCE.pier - size &&
    z < pier.z0 + pier.length + CLEARANCE.pier + size
  ) {
    return false;
  }
  if (Math.hypot(x - hut.x, z - hut.z) < CLEARANCE.hut + size) return false;
  if (landmarks.pathDistance(x, z) < CLEARANCE.path + size) return false;
  if (Math.hypot(x - fire.x, z - fire.z) < CLEARANCE.fire + size) return false;
  return !(
    x > home.x - HOME_BEACH.west - size &&
    x < home.x + HOME_BEACH.east + size &&
    z > homeShoreZ - HOME_BEACH.inland &&
    z < homeShoreZ + HOME_BEACH.seaward
  );
}

function tinted(random: Random, tint: RockTint): Color {
  const brightness = tint.darkest + random() * tint.range;
  if ('fixed' in tint) {
    const [red, green, blue] = tint.fixed;
    return new Color().setRGB(brightness * red, brightness * green, brightness * blue);
  }
  const warmth = random();
  const [red, green, blue] = tint.warmth;
  return new Color().setRGB(
    brightness * (1 + red * warmth),
    brightness * (1 + green * warmth),
    brightness * (1 + blue * warmth),
  );
}

function rockColour(random: Random, rock: Rock, tint: RockTint | null): Color {
  // Drawn for a rock of its kind's own colour too, which does not use it.
  const brightness = spread(random, GIVEN_COLOUR_BRIGHTNESS);
  const given = rock.colour;
  if (given !== undefined) {
    return new Color().setRGB(given[0] * brightness, given[1] * brightness, given[2] * brightness);
  }
  if (tint === null) {
    throw new Error(`a ${rock.kind} has no colour of its own and must be given one`);
  }
  return tinted(random, tint);
}

export function createRockPlacer(
  random: Random,
  island: IslandShape,
  landmarks: Landmarks,
): RockPlacer {
  const shapes = new Map<string, RocksOfOneShape>();
  const spots: RockSpot[] = [];
  const inSurf: RockInSurf[] = [];

  function rocksOfShape(kind: RockKind, shape: number): RocksOfOneShape {
    const key = `${kind} ${shape}`;
    const existing = shapes.get(key);
    if (existing) return existing;
    const created: RocksOfOneShape = {
      kind,
      seed: rocksConfig.kinds[kind].seeds[shape],
      rocks: [],
    };
    shapes.set(key, created);
    return created;
  }

  function standsInSurf(x: number, z: number, size: number, ground: number): boolean {
    return (
      size > SURF.smallestSize &&
      ground > SURF.deepestGround &&
      ground < SURF.highestGround &&
      Math.hypot(x, z) > island.radius(Math.atan2(z, x)) - SURF.furthestInsideShore
    );
  }

  function place(rock: Rock): void {
    const { kind, x, z, size } = rock;
    const kindConfig: RockKindConfig = rocksConfig.kinds[kind];
    const shape = Math.floor(random() * kindConfig.seeds.length);
    const ground = island.groundHeight(x, z);

    const lean = kindConfig.liesLevel ? LEAN.level : LEAN.tipped;
    const leanX = (random() - 0.5) * lean;
    const heading =
      rock.heading === undefined
        ? random() * FULL_TURN
        : rock.heading + (random() - 0.5) * HEADING_SPREAD;
    const leanZ = (random() - 0.5) * lean;
    const proportions = PROPORTIONS[kind];
    const width = size * spread(random, proportions.width);
    const height = size * spread(random, proportions.height);
    const depth = size * spread(random, proportions.depth);
    const matrix = new Matrix4().compose(
      new Vector3(x, ground + size * kindConfig.sitsAbove, z),
      new Quaternion().setFromEuler(new Euler(leanX, heading, leanZ)),
      new Vector3(width, height, depth),
    );
    const colour = rockColour(random, rock, kindConfig.tint);
    rocksOfShape(kind, shape).rocks.push({ matrix, colour });

    const lying = kindConfig.liesLevel ? 'level' : 'tipped';
    if (kind !== 'cobble') spots.push({ x, z, radius: size * SPOT_RADIUS[lying] });
    if (standsInSurf(x, z, size, ground)) {
      inSurf.push({ x, z, radius: size * SURF_RADIUS[lying], groundHeight: ground });
    }
  }

  function placeIfClear(rock: Rock): void {
    if (isOutOfTheWay(landmarks, rock.x, rock.z, rock.size)) place(rock);
  }

  function layGroup(group: RockGroup): void {
    const { kind, direction, size } = group;
    const distance = beachDistance(island, group.shore, direction, group.height);
    if (distance === null) return;
    const middleX = Math.cos(direction) * distance;
    const middleZ = Math.sin(direction) * distance;

    function placeOut(rockKind: RockKind, towards: number, away: number, rockSize: number): void {
      const x = middleX + Math.cos(towards) * away;
      const z = middleZ + Math.sin(towards) * away;
      placeIfClear({ kind: rockKind, x, z, size: rockSize });
    }

    for (let i = 0; i < group.big; i++) {
      const towards = random() * FULL_TURN;
      const away = i === 0 ? 0 : size * (0.9 + random() * 0.9);
      placeOut(kind, towards, away, size * (0.75 + random() * 0.55));
    }
    for (let i = 0; i < group.middling; i++) {
      const towards = random() * FULL_TURN;
      const away = size * (1.0 + random() * 2.4);
      placeOut(kind, towards, away, size * (0.22 + random() * 0.32));
    }
    // Most cobbles lie close in, and most are small; a few spill far out, or are bigger.
    for (let i = 0; i < group.cobbles; i++) {
      const towards = random() * FULL_TURN;
      const away = size * (0.8 + random() * random() * 5);
      placeOut('cobble', towards, away, 0.07 + random() * random() * 0.22);
    }
  }

  return {
    random,
    island,
    place,
    placeIfClear,
    layGroup,
    bearings: (choice) => bearings(random, island, choice),
    rockiness,
    oceanBeachDistance: (direction, height) => oceanBeachDistance(island, direction, height),
    placement: () => ({ shapes: [...shapes.values()], spots, inSurf }),
  };
}
