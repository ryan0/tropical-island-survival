import { clamp, FULL_TURN, mix, type Rgb } from '../../core/maths';
import { within, type Random, type Range } from '../../core/random';
import {
  createBladeOutlines,
  leafColour,
  leafOf,
  type Blade,
  type BladeOutlines,
  type Leaf,
} from './low-plants-leaves';
import { lowPlantsTileConfig } from './low-plants-tile-config';

/** A stem lying on the ground: a line through `points` (x, y, x, y, ...), in dots. */
export interface Stem {
  points: number[];
  width: number;
  colour: Rgb;
}

/** One plant: what shows or hides together as the threshold on its rank moves. */
export interface Plant {
  /** How far it reaches, which sets its rank: runners highest, infill lowest. */
  reach: number;
  stems: Stem[];
  leaves: Leaf[];
}

const {
  size: SIZE,
  span,
  rankBands,
  morningGlory,
  creeper,
  seedlings,
  leaves,
  colours,
  infill,
} = lowPlantsTileConfig;
const DOTS_PER_METRE = SIZE / span;
// A stem is walked in steps of this many metres: its gentle bends need no finer.
const STEP = 0.05;
// Stalks and the creeper's stems are thinner than this in life; drawn thinner, a dot holds only
// part of one, and its rank fades with it.
const THINNEST_STEM = 1.2;
// How finely the tile is divided to judge where it is still bare.
const CROWDING_CELLS = 64;
// How far a blade turns from its stalk, either way, in radians.
const BLADE_TURN = 0.35;
// A creeper's leaflets: three spread this far from the stem's heading, or a pair this far.
const LEAFLETS_IN_THREES = [-1.2, 0, 1.2];
const LEAFLETS_IN_PAIRS = [-1.4, 1.4];

type Point = readonly [x: number, y: number];

/** How much leaf lies about each part of the tile, so that the infill can seek out bare sand. */
interface Crowding {
  add(leaves: readonly Leaf[]): void;
  /** The leaf about a point, over some 14 cm around it. */
  near(x: number, y: number): number;
}

/** What every part of the growing needs. */
interface Grower {
  random: Random;
  crowding: Crowding;
  outlines: BladeOutlines;
}

function createCrowding(): Crowding {
  const leafInCell = new Float32Array(CROWDING_CELLS * CROWDING_CELLS);
  const cellSize = SIZE / CROWDING_CELLS;
  const cellOf = (x: number, y: number): number => {
    const column = Math.floor(x / cellSize) & (CROWDING_CELLS - 1);
    const row = Math.floor(y / cellSize) & (CROWDING_CELLS - 1);
    return row * CROWDING_CELLS + column;
  };
  return {
    add(leavesAdded) {
      for (const { x, y, angle, length, leftWidth, rightWidth } of leavesAdded) {
        const middleX = x + (Math.cos(angle) * length) / 2;
        const middleY = y + (Math.sin(angle) * length) / 2;
        leafInCell[cellOf(middleX, middleY)] += length * (leftWidth + rightWidth);
      }
    },
    near(x, y) {
      let leaf = 0;
      for (let down = -1; down <= 1; down++) {
        for (let across = -1; across <= 1; across++) {
          leaf += leafInCell[cellOf(x + across * cellSize, y + down * cellSize)];
        }
      }
      return leaf;
    },
  };
}

/** The barest of a few places tried at random: the infill fills gaps without lying on a grid. */
function barePlace({ random, crowding }: Grower): Point {
  let best: Point = [0, 0];
  let leastLeaf = Infinity;
  for (let attempt = 0; attempt < infill.placesTried; attempt++) {
    const place: Point = [random() * SIZE, random() * SIZE];
    const leaf = crowding.near(place[0], place[1]);
    if (leaf < leastLeaf) {
      best = place;
      leastLeaf = leaf;
    }
  }
  return best;
}

/** Of a few headings tried, the one towards the barest ground a little way off. */
function bareHeading({ random, crowding }: Grower, [x, y]: Point): number {
  const ahead = infill.lookAhead * DOTS_PER_METRE;
  let best = 0;
  let leastLeaf = Infinity;
  for (let attempt = 0; attempt < infill.headingsTried; attempt++) {
    const heading = random() * FULL_TURN;
    const leaf = crowding.near(x + Math.cos(heading) * ahead, y + Math.sin(heading) * ahead);
    if (leaf < leastLeaf) {
      best = heading;
      leastLeaf = leaf;
    }
  }
  return best;
}

/** A rank within a band, the longer plants higher in it. */
function reachIn(random: Random, [low, high]: Range, lengthShare: number): number {
  return low + (high - low) * (0.75 * lengthShare + 0.25 * random());
}

function addLeaf(grower: Grower, plant: Plant, blade: Blade): void {
  plant.leaves.push(leafOf(grower.random, grower.outlines, blade));
}

function morningGloryLeaf(
  grower: Grower,
  plant: Plant,
  [x, y]: Point,
  heading: number,
  side: number,
  growth: number,
  plantLightness: number,
): void {
  const { random } = grower;
  const stalkAngle = heading + side * within(random, morningGlory.stalkAngle);
  const stalk = within(random, morningGlory.stalkLength) * growth;
  const base: Point = [
    x + Math.cos(stalkAngle) * stalk * DOTS_PER_METRE,
    y + Math.sin(stalkAngle) * stalk * DOTS_PER_METRE,
  ];
  const colour = leafColour(random, colours.leaf, plantLightness);
  if (stalk >= leaves.shortestStalkSeen) {
    plant.stems.push({
      points: [x, y, base[0], base[1]],
      width: THINNEST_STEM,
      colour: [
        mix(colour[0], colours.paleStem[0], 0.4),
        mix(colour[1], colours.paleStem[1], 0.4),
        mix(colour[2], colours.paleStem[2], 0.4),
      ],
    });
  }
  addLeaf(grower, plant, {
    at: base,
    angle: stalkAngle + (random() * 2 - 1) * BLADE_TURN,
    length:
      within(random, morningGlory.leafLength) *
      growth *
      within(random, leaves.foreshortening) *
      DOTS_PER_METRE,
    width: within(random, morningGlory.leafWidth) * within(random, morningGlory.foldedWidth),
    kind: 'morningGlory',
    colour,
    notchDepth: within(random, morningGlory.notchDepth),
  });
}

interface Runner {
  /** Where it starts, in dots. */
  from: Point;
  heading: number;
  length: number;
  /**
   * A long runner is old: woody brown, bare of leaves in stretches, its leaves in clusters. A
   * short shoot is young: green, every node in leaf.
   */
  isLong: boolean;
  branchesLeft: number;
}

function runnerStemColour(random: Random, isLong: boolean): Rgb {
  const paleness = random();
  const woody: Rgb = [
    mix(colours.stem[0], colours.paleStem[0], paleness),
    mix(colours.stem[1], colours.paleStem[1], paleness),
    mix(colours.stem[2], colours.paleStem[2], paleness),
  ];
  if (isLong) return woody;
  const green = colours.youngStemGreen;
  return [
    mix(woody[0], colours.leaf[0], green),
    mix(woody[1], colours.leaf[1], green),
    mix(woody[2], colours.leaf[2], green),
  ];
}

/** A runner of beach morning glory, walked from its start, leaves alternating along it. */
function growRunner(grower: Grower, plant: Plant, runner: Runner, plantLightness: number): void {
  const { random } = grower;
  let [x, y] = runner.from;
  let heading = runner.heading;
  let turning = 0;
  let untilNode = within(random, morningGlory.nodeSpacing) * random();
  let side = random() < 0.5 ? 1 : -1;
  const bareStretchPhase = random() * FULL_TURN;
  const bareStretchLength = within(random, morningGlory.bareStretchLength);
  const tipLength = Math.min(morningGlory.tipLength, runner.length / 2);
  const clusterChance = runner.isLong
    ? morningGlory.clusterChance
    : morningGlory.shootClusterChance;
  const points = [x, y];
  plant.stems.push({
    points,
    width: Math.max(THINNEST_STEM, within(random, morningGlory.stemWidth) * DOTS_PER_METRE),
    colour: runnerStemColour(random, runner.isLong),
  });

  for (let travelled = 0; travelled < runner.length; travelled += STEP) {
    turning = turning * 0.85 + (random() - 0.5) * morningGlory.bend;
    heading += turning * STEP;
    x += Math.cos(heading) * STEP * DOTS_PER_METRE;
    y += Math.sin(heading) * STEP * DOTS_PER_METRE;
    points.push(x, y);
    untilNode -= STEP;
    while (untilNode <= 0) {
      const lengthLeft = runner.length - travelled;
      const towardsTip = clamp(lengthLeft / tipLength, 0, 1);
      untilNode += within(random, morningGlory.nodeSpacing) * (0.3 + 0.7 * towardsTip);
      side = random() < 0.85 ? -side : side;
      const bareness = runner.isLong
        ? morningGlory.bareNodeChance *
          (1 + Math.sin((travelled / bareStretchLength) * FULL_TURN + bareStretchPhase))
        : 0;
      if (random() >= bareness) {
        const growth = 0.5 + 0.5 * towardsTip;
        morningGloryLeaf(grower, plant, [x, y], heading, side, growth, plantLightness);
        // A short leafy shoot from the leaf's axil: the leaves gather in clusters along a runner.
        if (random() < clusterChance * towardsTip) {
          const extraLeaves = Math.round(within(random, morningGlory.leavesInCluster));
          for (let leaf = 0; leaf < extraLeaves; leaf++) {
            const clusterSide = random() < 0.5 ? 1 : -1;
            const clusterGrowth = growth * within(random, morningGlory.clusterLeafSize);
            morningGloryLeaf(
              grower,
              plant,
              [x, y],
              heading,
              clusterSide,
              clusterGrowth,
              plantLightness,
            );
          }
        }
      }
      if (runner.branchesLeft > 0 && lengthLeft > 0.2 && random() < morningGlory.branchChance) {
        runner.branchesLeft--;
        const branch: Runner = {
          from: [x, y],
          heading: heading - side * within(random, morningGlory.branchAngle),
          length: lengthLeft * within(random, morningGlory.branchLength),
          isLong: runner.isLong,
          branchesLeft: 0,
        };
        growRunner(grower, plant, branch, plantLightness);
      }
    }
  }
}

/** The long runners, which reach furthest and rank highest. Returns their stems, for shoots to branch from. */
function growRunners(grower: Grower, plants: Plant[]): Stem[] {
  const { random } = grower;
  const [shortest, longest] = morningGlory.runnerLength;
  const runnerStems: Stem[] = [];
  for (let k = 0; k < morningGlory.runners; k++) {
    const length = within(random, morningGlory.runnerLength);
    const plant: Plant = {
      reach: reachIn(random, rankBands.runners, (length - shortest) / (longest - shortest)),
      stems: [],
      leaves: [],
    };
    const runner: Runner = {
      from: [random() * SIZE, random() * SIZE],
      heading: random() * FULL_TURN,
      length,
      isLong: true,
      branchesLeft: 3,
    };
    growRunner(grower, plant, runner, within(random, colours.plantLightness));
    grower.crowding.add(plant.leaves);
    runnerStems.push(plant.stems[0]);
    plants.push(plant);
  }
  return runnerStems;
}

/**
 * Short shoots off the long runners, ranked next below them: as the threshold falls, the green
 * thickens along the runners first, in clumps, before it fills the sand between.
 */
function growSideShoots(grower: Grower, plants: Plant[], runnerStems: readonly Stem[]): void {
  const { random } = grower;
  const [shortest, longest] = morningGlory.shootLength;
  for (let k = 0; k < morningGlory.sideShoots; k++) {
    const length = within(random, morningGlory.shootLength);
    const { points } = runnerStems[Math.floor(random() * runnerStems.length)];
    const at = 2 * Math.floor(random() * (points.length / 2 - 1));
    const runnerHeading = Math.atan2(points[at + 3] - points[at + 1], points[at + 2] - points[at]);
    const plant: Plant = {
      reach: reachIn(random, rankBands.sideShoots, (length - shortest) / (longest - shortest)),
      stems: [],
      leaves: [],
    };
    const side = random() < 0.5 ? -1 : 1;
    const shoot: Runner = {
      from: [points[at], points[at + 1]],
      heading: runnerHeading + side * within(random, morningGlory.sideShootAngle),
      length,
      isLong: false,
      branchesLeft: 1,
    };
    growRunner(grower, plant, shoot, within(random, colours.plantLightness));
    grower.crowding.add(plant.leaves);
    plants.push(plant);
  }
}

/** Short shoots where the sand is still barest, ranked lowest: what closes up the densest mat. */
function growGapShoots(grower: Grower, plants: Plant[]): void {
  const { random } = grower;
  const [shortest, longest] = morningGlory.shootLength;
  for (let k = 0; k < morningGlory.gapShoots; k++) {
    const length = within(random, morningGlory.shootLength);
    const from = barePlace(grower);
    const plant: Plant = {
      reach: reachIn(random, rankBands.gapShoots, (length - shortest) / (longest - shortest)),
      stems: [],
      leaves: [],
    };
    const shoot: Runner = {
      from,
      heading: bareHeading(grower, from),
      length,
      isLong: false,
      branchesLeft: 1,
    };
    growRunner(grower, plant, shoot, within(random, colours.plantLightness));
    grower.crowding.add(plant.leaves);
    plants.push(plant);
  }
}

/** A small-leaved creeper: thin wiry stems, leaflets in threes or pairs at each node. */
function growCreepers(grower: Grower, plants: Plant[]): void {
  const { random } = grower;
  for (let k = 0; k < creeper.plants; k++) {
    const plant: Plant = { reach: within(random, rankBands.creepers), stems: [], leaves: [] };
    const plantLightness = within(random, colours.plantLightness);
    const from = barePlace(grower);
    const starts: { from: Point; heading: number; length: number }[] = [
      { from, heading: bareHeading(grower, from), length: within(random, creeper.stemLength) },
    ];
    for (let start = starts.pop(); start !== undefined; start = starts.pop()) {
      let [x, y] = start.from;
      let heading = start.heading;
      let untilNode = within(random, creeper.nodeSpacing);
      const points = [x, y];
      for (let travelled = 0; travelled < start.length; travelled += STEP) {
        heading += (random() - 0.5) * creeper.bend * STEP;
        x += Math.cos(heading) * STEP * DOTS_PER_METRE;
        y += Math.sin(heading) * STEP * DOTS_PER_METRE;
        points.push(x, y);
        untilNode -= STEP;
        while (untilNode <= 0) {
          untilNode += within(random, creeper.nodeSpacing);
          const leafletAngles = random() < creeper.threes ? LEAFLETS_IN_THREES : LEAFLETS_IN_PAIRS;
          const turn = (random() * 2 - 1) * BLADE_TURN;
          for (const leafletAngle of leafletAngles) {
            const length =
              within(random, creeper.leafletLength) *
              within(random, leaves.foreshortening) *
              DOTS_PER_METRE;
            const angle = heading + leafletAngle + turn + (random() - 0.5) * BLADE_TURN;
            const stalk = length * 0.25;
            addLeaf(grower, plant, {
              at: [x + Math.cos(angle) * stalk, y + Math.sin(angle) * stalk],
              angle,
              length,
              width: within(random, creeper.leafletWidth),
              kind: 'creeper',
              colour: leafColour(random, colours.creeperLeaf, plantLightness),
            });
          }
          if (random() < creeper.branchChance) {
            starts.push({
              from: [x, y],
              heading: heading + (random() < 0.5 ? -1 : 1) * within(random, creeper.branchAngle),
              length: (start.length - travelled) * within(random, creeper.branchLength),
            });
          }
        }
      }
      plant.stems.push({
        points,
        width: Math.max(THINNEST_STEM, creeper.stemWidth * DOTS_PER_METRE),
        colour: colours.creeperStem,
      });
    }
    grower.crowding.add(plant.leaves);
    plants.push(plant);
  }
}

/** Seedlings and small herbs: rosettes of narrow leaves from one middle. */
function growSeedlings(grower: Grower, plants: Plant[]): void {
  const { random } = grower;
  for (let k = 0; k < seedlings.plants; k++) {
    const plant: Plant = { reach: within(random, rankBands.seedlings), stems: [], leaves: [] };
    const [x, y] = barePlace(grower);
    const count = Math.round(within(random, seedlings.leaves));
    const firstAngle = random() * FULL_TURN;
    const plantLightness = within(random, colours.plantLightness);
    const longest = within(random, seedlings.leafLength) * DOTS_PER_METRE;
    for (let leaf = 0; leaf < count; leaf++) {
      const angle = firstAngle + ((leaf + (random() - 0.5) * 0.5) / count) * FULL_TURN;
      addLeaf(grower, plant, {
        at: [x + Math.cos(angle) * 2, y + Math.sin(angle) * 2],
        angle,
        length: longest * within(random, seedlings.leafLengthShare),
        width: within(random, seedlings.leafWidth),
        kind: 'seedling',
        colour: leafColour(random, colours.seedlingLeaf, plantLightness),
      });
    }
    grower.crowding.add(plant.leaves);
    plants.push(plant);
  }
}

/**
 * Every plant on the tile, from the one that reaches least to the one that reaches furthest.
 * The long runners go down first and their side shoots, then seedlings, creepers and short
 * shoots where it is barest.
 */
export function growLowPlants(random: Random): Plant[] {
  const grower: Grower = {
    random,
    crowding: createCrowding(),
    outlines: createBladeOutlines(random),
  };
  const plants: Plant[] = [];
  const runnerStems = growRunners(grower, plants);
  growSideShoots(grower, plants, runnerStems);
  growSeedlings(grower, plants);
  growCreepers(grower, plants);
  growGapShoots(grower, plants);
  return plants.sort((one, other) => one.reach - other.reach);
}
