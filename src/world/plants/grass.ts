import {
  Color,
  Euler,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type IUniform,
  type MeshLambertMaterial,
} from 'three';
import type { Random } from '../../core/random';
import type { InstanceCells } from '../instance-cells';
import type { GroundHeight, Landmarks, Point } from '../landmarks';
import { grassConfig, TUFT_KINDS, type TuftKind } from './grass-config';
import { drawDuneGrass, drawSeaGrass, drawSeedHeadGrass, drawTurf } from './grass-pictures';
import { drawAmount, FULL_TURN, placeSeaGrass, placeTufts, type Tuft } from './grass-placement';
import { createCrossedCards, createSwayingMaterial } from './grass-shapes';

// Grass: short turf, taller grass with seed heads and dune grass on land, and beds of sea grass
// in the lagoon. Every tuft is a few crossed cards bearing a picture of its kind, bent by the
// wind. All of it takes its numbers from one stream, in this order: the pictures of the three
// kinds on land, where their tufts go, how each tuft is turned and sized, and then the same
// again for the sea grass.

export interface GrassDependencies {
  /** The grass's own stream of random numbers. */
  random: Random;
  groundHeight: GroundHeight;
  landmarks: Landmarks;
  /** The middle of the sandbank in the lagoon, which has grass of its own. */
  sandbank: Point;
  /** Whether a point is inside a rock or within `margin` of one: no grass grows there. */
  isInRock: (x: number, z: number, margin: number) => boolean;
  /** The uniforms every shader shares; the grass reads uTime and uWind when it is first drawn. */
  uniforms: Record<string, IUniform>;
  instanceCells: InstanceCells;
}

interface Look {
  shape: BufferGeometry;
  material: MeshLambertMaterial;
}

/** For leaf-light.ts, which needs a different name for each material. */
const MATERIAL_NAMES: Record<TuftKind, string> = {
  turf: 'turf',
  seedHeads: 'seed-head grass',
  dune: 'dune grass',
};

/** A tuft standing at x, y, z, turned about the upright and scaled. */
function tuftMatrix(x: number, y: number, z: number, turn: number, scale: Vector3): Matrix4 {
  const turned = new Quaternion().setFromEuler(new Euler(0, turn, 0));
  return new Matrix4().compose(new Vector3(x, y, z), turned, scale);
}

function addTufts(dependencies: GrassDependencies, look: Look, tufts: readonly Tuft[]): void {
  if (tufts.length === 0) return;
  const { random, isInRock, instanceCells } = dependencies;
  const { heightShare, sunk, colourScale, clearOfRocks, reach, shownWithin } = grassConfig.tufts;
  const mesh = new InstancedMesh(look.shape, look.material, tufts.length);
  tufts.forEach((tuft, index) => {
    const { x, z, size, colour } = tuft;
    const turn = random() * FULL_TURN;
    const height = size * drawAmount(random, heightShare);
    // None inside a rock: one there keeps its place, shrunk to nothing.
    const scale = isInRock(x, z, clearOfRocks)
      ? new Vector3(0, 0, 0)
      : new Vector3(size, height, size);
    mesh.setMatrixAt(index, tuftMatrix(x, tuft.ground - sunk, z, turn, scale));
    const [red, green, blue] = colour;
    mesh.setColorAt(
      index,
      new Color(red * colourScale[0], green * colourScale[1], blue * colourScale[2]),
    );
  });
  mesh.receiveShadow = true;
  instanceCells.split(mesh, { reach, shownWithin });
}

function addSeaGrass(dependencies: GrassDependencies): void {
  const { random, uniforms, instanceCells } = dependencies;
  const config = grassConfig.seaGrass;
  const { colour, dimming } = config;
  const picture = drawSeaGrass(random);
  const spots = placeSeaGrass(dependencies);
  const mesh = new InstancedMesh(
    createCrossedCards(config.cards),
    createSwayingMaterial(picture, config.sway, 'sea grass', uniforms),
    Math.max(1, spots.length),
  );
  spots.forEach((spot, index) => {
    const turn = random() * FULL_TURN;
    const size = drawAmount(random, config.size);
    const width = size * config.widthShare;
    const scale = new Vector3(width, size * drawAmount(random, config.heightShare), width);
    mesh.setMatrixAt(index, tuftMatrix(spot.x, spot.floor - config.sunk, spot.z, turn, scale));
    const depth = -spot.floor;
    const shade = (i: 0 | 1 | 2) =>
      (colour.least[i] + random() * colour.spread[i]) * Math.exp(-depth * dimming[i]);
    mesh.setColorAt(index, new Color(shade(0), shade(1), shade(2)));
  });
  mesh.count = spots.length;
  instanceCells.split(mesh, { reach: config.reach, shownWithin: config.shownWithin });
}

export function createGrass(dependencies: GrassDependencies): void {
  const { random, uniforms } = dependencies;
  const pictures: Record<TuftKind, HTMLCanvasElement> = {
    turf: drawTurf(random),
    seedHeads: drawSeedHeadGrass(random),
    dune: drawDuneGrass(random),
  };
  const lookOf = (kind: TuftKind): Look => ({
    shape: createCrossedCards(grassConfig[kind].cards),
    material: createSwayingMaterial(
      pictures[kind],
      grassConfig[kind].sway,
      MATERIAL_NAMES[kind],
      uniforms,
    ),
  });
  const looks: Record<TuftKind, Look> = {
    turf: lookOf('turf'),
    seedHeads: lookOf('seedHeads'),
    dune: lookOf('dune'),
  };

  const tufts = placeTufts(dependencies);
  for (const kind of TUFT_KINDS) addTufts(dependencies, looks[kind], tufts[kind]);
  addSeaGrass(dependencies);
}
