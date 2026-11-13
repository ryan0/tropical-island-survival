import type { Random } from '../../core/random';
import type { IslandShape } from '../island-shape';
import type { Landmarks, Point } from '../landmarks';
import {
  createRockPlacer,
  type Rgb,
  type RockGroup,
  type RockPlacement,
  type RockPlacer,
} from './rock-placer';

export type {
  PlacedRock,
  RockInSurf,
  RockPlacement,
  RockSpot,
  RocksOfOneShape,
} from './rock-placer';

// Where the rocks lie. Rock lies on a shore in groups - a few big ones, smaller ones round them,
// cobbles spilling out - and not at random: boulder and crag groups on the waterline, ledges
// along it, karst behind the beach, lone crags out on the reef flat.
// Every rock takes its numbers from the stream in a fixed order, so changing what one rock draws,
// or whether it draws at all, moves every rock after it.

export interface RockPlacementDependencies {
  /** The rocks' own stream of random numbers. */
  random: Random;
  island: IslandShape;
  landmarks: Landmarks;
  /** Whether the camp is there: its fire has a ring of stones. */
  hasCamp: boolean;
}

// Rounded, not π/2: where every rock falls depends on the exact number.
const QUARTER_TURN = 1.5708;
/** Home is due south. */
const HOME_BEARING = QUARTER_TURN;
/** Rows along the shore are spaced in metres; this many of them make a radian there. */
const METRES_PER_RADIAN = 160;

// Two either side of home.
const BESIDE_HOME: readonly RockGroup[] = [
  {
    kind: 'boulder',
    shore: 'ocean',
    direction: 1.39,
    height: 0.15,
    big: 2,
    middling: 4,
    cobbles: 9,
    size: 1.25,
  },
  {
    kind: 'crag',
    shore: 'ocean',
    direction: 1.77,
    height: -0.15,
    big: 1,
    middling: 2,
    cobbles: 5,
    size: 1.15,
  },
];

/**
 * Boulder and crag groups on the ocean waterline: two either side of home, the rest spread round
 * the island.
 */
function layWaterlineGroups(placer: RockPlacer): void {
  const { random } = placer;
  for (const group of BESIDE_HOME) placer.layGroup(group);

  const besideHome = BESIDE_HOME.map((group) => group.direction);
  const directions = placer.bearings({
    count: 14,
    apart: 0.26,
    avoiding: [...besideHome, HOME_BEARING],
  });
  directions.forEach((direction, n) => {
    // Every third group is of crags, which stand in the water.
    const isCrag = n % 3 === 1;
    // Bigger, fuller groups where the shore is rocky.
    const fullness = 0.4 + placer.rockiness(direction);
    const height = isCrag ? -0.2 : 0.1 + random() * 0.3;
    const big = 1 + Math.floor(random() * 2.4 * fullness);
    const middling = Math.round((2 + random() * 4) * fullness);
    const cobbles = Math.round((5 + random() * 10) * fullness);
    const size = 0.8 + random() * 0.6 + 0.4 * placer.rockiness(direction);
    const kind = isCrag ? 'crag' : 'boulder';
    placer.layGroup({ kind, shore: 'ocean', direction, height, big, middling, cobbles, size });
  });
}

/** Smaller groups of rounded boulders on the lagoon beach. */
function layLagoonGroups(placer: RockPlacer): void {
  const { random } = placer;
  for (const direction of placer.bearings({ count: 8, apart: 0.4, avoiding: [] })) {
    const height = random() * 0.3;
    const middling = 1 + Math.floor(random() * 3);
    const cobbles = 3 + Math.floor(random() * 6);
    const size = 0.6 + random() * 0.5;
    placer.layGroup({
      kind: 'boulder',
      shore: 'lagoon',
      direction,
      height,
      big: 1,
      middling,
      cobbles,
      size,
    });
  }
}

/** One ledge always lies a little way east of home. */
const FIRST_LEDGE = 1.25;
const SANDY_GREY_BEACHROCK: Rgb = [0.44, 0.42, 0.37];
const DARK_BEACHROCK: Rgb = [0.27, 0.27, 0.27];

/** One slab of a ledge, lying along the shore, often with a broken-off piece just seaward of it. */
function laySlab(
  placer: RockPlacer,
  direction: number,
  distance: number,
  size: number,
  colour: Rgb,
): void {
  const { random } = placer;
  const heading = -direction + QUARTER_TURN;
  const x = Math.cos(direction) * distance;
  const z = Math.sin(direction) * distance;
  placer.placeIfClear({ kind: 'slab', x, z, size, heading, colour });

  if (random() >= 0.6) return;
  const pieceX = Math.cos(direction) * (distance + size * 0.9 + random());
  const pieceZ = Math.sin(direction) * (distance + size * 0.9 + random());
  const pieceSize = size * (0.3 + random() * 0.3);
  placer.placeIfClear({ kind: 'slab', x: pieceX, z: pieceZ, size: pieceSize, heading, colour });
}

/** Ledges of beachrock along the waterline: each stretch a row of slabs, dark or sandy grey. */
function layBeachrockLedges(placer: RockPlacer): void {
  const { random } = placer;
  const starts = [
    FIRST_LEDGE,
    ...placer.bearings({ count: 7, apart: 0.4, avoiding: [FIRST_LEDGE, HOME_BEARING] }),
  ];
  starts.forEach((start, n) => {
    const colour = n % 2 === 0 ? SANDY_GREY_BEACHROCK : DARK_BEACHROCK;
    const count = Math.round((2 + random() * 5) * (0.5 + placer.rockiness(start)));
    let along = 0;
    for (let i = 0; i < count; i++) {
      const size = 0.8 + random() * 1.1;
      const height = 0.1 + random() * 0.35;
      const direction = start + along;
      const distance = placer.oceanBeachDistance(direction, height);
      if (distance !== null) laySlab(placer, direction, distance, size, colour);
      along += (size * 1.5 + random() * 1.5) / METRES_PER_RADIAN;
    }
  });
}

/**
 * Karst limestone at the back of the ocean beach: ragged ridges a few metres long, with broken
 * bits round them.
 */
function layKarst(placer: RockPlacer): void {
  const { random } = placer;
  for (const start of placer.bearings({ count: 12, apart: 0.28, avoiding: [HOME_BEARING] })) {
    const count = Math.round((2 + random() * 5) * (0.4 + placer.rockiness(start)));
    let along = 0;
    for (let i = 0; i < count; i++) {
      const size = 1.0 + random();
      const direction = start + along;
      const distance = placer.oceanBeachDistance(direction, 1.35 + random() * 0.5);
      if (distance !== null) {
        const x = Math.cos(direction) * distance;
        const z = Math.sin(direction) * distance;
        placer.placeIfClear({ kind: 'karst', x, z, size });
        if (random() < 0.7) {
          const bitX = x + (random() - 0.5) * 3;
          const bitZ = z + (random() - 0.5) * 3;
          const bitSize = size * (0.25 + random() * 0.3);
          placer.placeIfClear({ kind: 'karst', x: bitX, z: bitZ, size: bitSize });
        }
      }
      along += (size + random() * 0.6) / METRES_PER_RADIAN;
    }
  }
}

/** A crag on ground deeper than this would not stand clear of the water. */
const REEF_CRAG_DEEPEST_GROUND = -2.2;

/**
 * Lone crags out on the reef flat, tall enough to stand clear of the water, some with a smaller
 * one beside.
 */
function layReefCrags(placer: RockPlacer): void {
  const { random, island } = placer;
  for (const direction of placer.bearings({ count: 13, apart: 0.25, avoiding: [HOME_BEARING] })) {
    const outFromShore = 5 + random() * 26;
    const size = 1.5 + random() * 0.9;
    const distance = island.radius(direction) + outFromShore;
    const x = Math.cos(direction) * distance;
    const z = Math.sin(direction) * distance;
    if (island.groundHeight(x, z) > REEF_CRAG_DEEPEST_GROUND) {
      placer.placeIfClear({ kind: 'crag', x, z, size });
    }
    if (random() < 0.6) {
      const besideX = x + (random() - 0.5) * 4;
      const besideZ = z + (random() - 0.5) * 4;
      const besideSize = size * (0.4 + random() * 0.3);
      placer.placeIfClear({ kind: 'crag', x: besideX, z: besideZ, size: besideSize });
    }
  }
}

const HORNS = [
  { direction: 0.05, size: 2.6 },
  { direction: 2.75, size: 2.2 },
];

/**
 * A few landmarks: one great boulder with its litter on each horn of the island, and up to two
 * more along the shore.
 */
function layLandmarkBoulders(placer: RockPlacer): void {
  const { random } = placer;
  const horns = HORNS.map((horn) => horn.direction);
  const elsewhere = placer
    .bearings({ count: 2, apart: 0.6, avoiding: [HOME_BEARING, ...horns] })
    .map((direction) => ({ direction, size: 2.4 + random() * 0.9 }));
  for (const { direction, size } of [...HORNS, ...elsewhere]) {
    placer.layGroup({
      kind: 'boulder',
      shore: 'ocean',
      direction,
      height: 0.2,
      big: 1,
      middling: 6,
      cobbles: 18,
      size,
    });
  }
}

const CAMPFIRE_RING = { stones: 9, apart: 0.698, radius: 0.62, colour: [0.42, 0.4, 0.37] } as const;

/** The ring of stones round the campfire. */
function ringTheCampfire(placer: RockPlacer, fire: Point): void {
  const { random } = placer;
  const { stones, apart, radius, colour } = CAMPFIRE_RING;
  for (let i = 0; i < stones; i++) {
    const x = fire.x + Math.cos(i * apart) * radius;
    const z = fire.z + Math.sin(i * apart) * radius;
    placer.place({ kind: 'cobble', x, z, size: 0.13 + random() * 0.06, colour });
  }
}

export function placeRocks(dependencies: RockPlacementDependencies): RockPlacement {
  const { random, island, landmarks, hasCamp } = dependencies;
  const placer = createRockPlacer(random, island, landmarks);
  layWaterlineGroups(placer);
  layLagoonGroups(placer);
  layBeachrockLedges(placer);
  layKarst(placer);
  layReefCrags(placer);
  layLandmarkBoulders(placer);
  if (hasCamp) ringTheCampfire(placer, landmarks.fire);
  return placer.placement();
}
