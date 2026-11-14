import { FULL_TURN, mix, type Rgb } from '../../core/maths';
import type { Random } from '../../core/random';
import {
  layerEdgeWander,
  soilPatches,
  turfColours,
  turfDryness,
  turfLushness,
} from '../ground-patterns';
import type { GroundHeight, Landmarks, Point } from '../landmarks';
import type { IsInRock } from '../rocks/rocks';
import { grassConfig, type RandomAmount, type TuftKind } from './grass-config';

// Where the grass grows. On land it is scattered over the whole ring, thickest round home, and
// grows where the ground shows turf, in the ground's own colours: mostly short turf with the odd
// tall clump, grass with seed heads among it, and dune grass on the sand below. Sea grass grows
// in beds on the lagoon floor.
// Everything takes its numbers from the grass's one stream in a fixed order, so changing what one
// tuft draws, or whether it draws at all, moves every tuft after it.

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
  isInRock: IsInRock;
}

interface TuftPlacer {
  random: Random;
  groundHeight: GroundHeight;
  landmarks: Landmarks;
  tufts: Record<TuftKind, Tuft[]>;
}

const { turf, seedHeads, dune, land } = grassConfig;

export function drawAmount(random: Random, { least, spread }: RandomAmount): number {
  return least + random() * spread;
}

/**
 * The colour of the ground's turf at a point, and how lush it is there, from 0 to 1: its colours
 * mixed as terrain-colour.glsl mixes them.
 */
function turfAt(x: number, z: number): { lushness: number; colour: Rgb } {
  const lushness = turfLushness(x, z);
  const dryness = turfDryness(x, z);
  const driedOut = dryness * dryness * 0.7;
  const { thin, lush, dry } = turfColours;
  const channel = (i: 0 | 1 | 2) => mix(mix(thin[i], lush[i], lushness), dry[i], driedOut);
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
  const soil = soilPatches(x, z);
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
  const edge = ground + layerEdgeWander(x, z);
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
