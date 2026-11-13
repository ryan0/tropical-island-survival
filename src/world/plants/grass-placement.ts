import type { Random } from '../../core/random';
import type { GroundHeight, Landmarks, Point } from '../landmarks';
import { grassConfig, type RandomAmount, type TuftKind } from './grass-config';

// Where the grass grows. On land it is scattered over the whole ring, thickest round home, and
// grows where the ground shows turf, in the ground's own colours: mostly short turf with the odd
// tall clump, grass with seed heads among it, and dune grass on the sand below. Sea grass grows
// in beds on the lagoon floor.
// Everything takes its numbers from the grass's one stream in a fixed order, so changing what one
// tuft draws, or whether it draws at all, moves every tuft after it.

type Rgb = readonly [number, number, number];

interface GroundSpot {
  x: number;
  z: number;
  /** The height of the ground there. */
  ground: number;
}

export interface Tuft extends GroundSpot {
  size: number;
  colour: Rgb;
}

export interface SeaGrassSpot {
  x: number;
  z: number;
  /** The height of the lagoon floor there. */
  floor: number;
}

export interface GrassPlacementDependencies {
  random: Random;
  groundHeight: GroundHeight;
  landmarks: Landmarks;
  sandbank: Point;
  isInRock: (x: number, z: number, margin: number) => boolean;
}

interface TuftPlacer {
  random: Random;
  groundHeight: GroundHeight;
  landmarks: Landmarks;
  tufts: Record<TuftKind, Tuft[]>;
}

// Rounded, not 2π: where every tuft falls depends on the exact number.
export const FULL_TURN = 6.283;

const { turf, seedHeads, dune, land } = grassConfig;

export function drawAmount(random: Random, { least, spread }: RandomAmount): number {
  return least + random() * spread;
}

// The ground's own patterns, as terrain-colour.glsl draws them: the grass follows them.

/** Added to the ground's height where the turf begins, so that its edge wanders. */
function turfEdgeWobble(x: number, z: number): number {
  return 0.45 * Math.sin(x * 0.31 + z * 0.17) + 0.3 * Math.sin(z * 0.43 - x * 0.23 + 1);
}

/** High where the ground's sandy soil shows through the turf. */
function bareSoil(x: number, z: number): number {
  return (
    Math.sin(x * 0.23 + 1.1 * Math.sin(z * 0.17)) *
    Math.sin(z * 0.21 + 1.4 * Math.sin(x * 0.19) + 2)
  );
}

// Thin turf is yellow-green, lush turf greener, and dried-out turf straw.
const THIN_TURF: Rgb = [0.56, 0.62, 0.26];
const LUSH_TURF: Rgb = [0.36, 0.52, 0.19];
const DRIED_TURF: Rgb = [0.72, 0.66, 0.4];

function mix(from: number, to: number, share: number): number {
  return from + (to - from) * share;
}

/** The colour of the ground's turf at a point, and how lush it is there, from 0 to 1. */
function turfAt(x: number, z: number): { lushness: number; colour: Rgb } {
  const lushness =
    0.5 +
    0.5 *
      Math.sin(x * 0.07 + 1.9 * Math.sin(z * 0.05 + 0.4)) *
      Math.sin(z * 0.09 + 1.3 * Math.sin(x * 0.06));
  const dryness = 0.5 + 0.5 * Math.sin(x * 0.13 + 2.1) * Math.sin(z * 0.11 + 0.7);
  const driedOut = dryness * dryness * 0.7;
  const channel = (i: 0 | 1 | 2) =>
    mix(mix(THIN_TURF[i], LUSH_TURF[i], lushness), DRIED_TURF[i], driedOut);
  return { lushness, colour: [channel(0), channel(1), channel(2)] };
}

function hasRoom(tufts: TuftPlacer['tufts'], kind: TuftKind): boolean {
  return tufts[kind].length < grassConfig[kind].most;
}

function offerDuneGrass(placer: TuftPlacer, spot: GroundSpot, edge: number): void {
  const { random, tufts } = placer;
  const isOnDune = spot.ground > dune.lowestGround && edge > dune.lowestEdge;
  if (!isOnDune || random() >= dune.share || !hasRoom(tufts, 'dune')) return;

  const shade = drawAmount(random, dune.shade);
  const size = drawAmount(random, dune.size);
  const [red, green, blue] = dune.colour;
  tufts.dune.push({ ...spot, size, colour: [red * shade, green * shade, blue * shade] });
}

function addTuft(
  placer: TuftPlacer,
  kind: TuftKind,
  spot: GroundSpot,
  size: number,
  [red, green, blue]: Rgb,
): void {
  const { random, tufts } = placer;
  if (!hasRoom(tufts, kind)) return;

  const colour: Rgb = [
    red * drawAmount(random, land.tint),
    green,
    blue * drawAmount(random, land.tint),
  ];
  tufts[kind].push({ ...spot, size, colour });
}

function offerTurf(placer: TuftPlacer, spot: GroundSpot): void {
  const { random, landmarks } = placer;
  const { x, z } = spot;
  if (landmarks.pathDistance(x, z) < land.clearOfPaths) return;
  const soil = bareSoil(x, z);
  if (soil > land.bareSoil) return;
  if (soil > land.soilEdge && random() < land.leftOutAtSoilEdge) return;

  const { lushness, colour } = turfAt(x, z);
  const pick = random();
  const shade = drawAmount(random, turf.shade);
  // Drawn even for a tuft that turns out to be seed-head grass, which then takes a size of its own.
  const { least, withLushness, spread } = turf.size;
  const spreadSize = least + withLushness * lushness + random() * spread;
  const clumpScale = random() < turf.tallClumps ? turf.tallScale : turf.shortScale;
  const turfSize = spreadSize * clumpScale;
  const red = colour[0] * shade;
  const green = colour[1] * shade;
  const blue = colour[2] * shade;

  if (pick > seedHeads.pickedAbove && pick <= seedHeads.pickedUpTo) {
    const size = drawAmount(random, seedHeads.size);
    const { turfShare, paler } = seedHeads;
    const paleColour: Rgb = [
      red * turfShare + paler[0],
      green * turfShare + paler[1],
      blue * turfShare + paler[2],
    ];
    addTuft(placer, 'seedHeads', spot, size, paleColour);
    return;
  }
  addTuft(placer, 'turf', spot, turfSize, [red, green, blue]);
}

/** Grass grows at a point if the ground there suits one of the kinds and it is not full. */
function offer(placer: TuftPlacer, x: number, z: number): void {
  const ground = placer.groundHeight(x, z);
  if (ground < land.lowestGround || ground > land.highestGround) return;
  const { hut } = placer.landmarks;
  if (Math.hypot(x - hut.x, z - hut.z) < land.clearOfHut) return;

  const spot = { x, z, ground };
  const edge = ground + turfEdgeWobble(x, z);
  if (edge < land.turfEdge) offerDuneGrass(placer, spot, edge);
  else offerTurf(placer, spot);
}

/** The tufts of each kind on land: points on the whole ring, fewer far from home, then the sandbank. */
export function placeTufts(dependencies: GrassPlacementDependencies): Record<TuftKind, Tuft[]> {
  const { random, groundHeight, landmarks, sandbank } = dependencies;
  const placer: TuftPlacer = {
    random,
    groundHeight,
    landmarks,
    tufts: { turf: [], seedHeads: [], dune: [] },
  };
  for (let tries = 0; tries < land.pointsOnTheRing; tries++) {
    const { x, z } = landmarks.ringPoint(random);
    if (random() < landmarks.nearHome(x, z)) offer(placer, x, z);
  }
  for (let tries = 0; tries < land.pointsOnTheSandbank; tries++) {
    const direction = random() * FULL_TURN;
    // (the square root spreads them evenly over its area)
    const distance = Math.sqrt(random()) * land.sandbankReach;
    offer(
      placer,
      sandbank.x + Math.cos(direction) * distance,
      sandbank.z + Math.sin(direction) * distance,
    );
  }
  return placer.tufts;
}

/** High in the middle of a bed of sea grass, falling away towards its edges. */
function seaGrassBeds(x: number, z: number): number {
  return (
    Math.sin(x * 0.05 + 2 + 1.3 * Math.sin(z * 0.04)) *
    Math.sin(z * 0.06 + 1.1 * Math.sin(x * 0.07))
  );
}

/** Spots for sea grass on the lagoon floor round home, in beds that thin towards their edges. */
export function placeSeaGrass(dependencies: GrassPlacementDependencies): SeaGrassSpot[] {
  const { random, groundHeight, landmarks, isInRock } = dependencies;
  const { home } = landmarks;
  const config = grassConfig.seaGrass;
  const spots: SeaGrassSpot[] = [];
  for (let tries = 0; tries < config.tries && spots.length < config.most; tries++) {
    const x = home.x + (random() * 2 - 1) * config.reachFromHome;
    const z = home.z + (random() * 2 - 1) * config.reachFromHome;
    const floor = groundHeight(x, z);
    if (floor > config.shallowestFloor || floor < config.deepestFloor) continue;
    if (seaGrassBeds(x, z) < drawAmount(random, config.bedThreshold)) continue;
    if (isInRock(x, z, config.clearOfRocks)) continue;
    spots.push({ x, z, floor });
  }
  return spots;
}
