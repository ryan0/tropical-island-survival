import {
  Color,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshDepthMaterial,
  MeshLambertMaterial,
  Quaternion,
  RGBADepthPacking,
  Vector3,
  type BufferGeometry,
  type CanvasTexture,
  type IUniform,
} from 'three';
import type { Random } from '../../core/random';
import type { InstanceCells } from '../instance-cells';
import type { GroundHeight, Landmarks, Point } from '../landmarks';
import { lightLeavesFromBothSides } from './leaf-light';
import { paintBarkPicture, paintFrondPicture } from './palm-pictures';
import { createFrondShape, createTrunkShape } from './palm-shapes';
import {
  palmsConfig,
  TRUNK_KINDS,
  type KindChance,
  type Spread,
  type TrunkConfig,
  type TrunkKind,
} from './palms-config';

// Coconut palms: four shapes of trunk (ordinary, tall and slender, leaning out over the beach,
// young and short), each palm with its own size and lean, and a crown of feathery fronds that
// sway in the wind. Everything takes its numbers from the palms' one stream in a fixed order -
// the pictures, where the palms stand, then each palm and its fronds - so changing what one of
// them draws moves everything after it.

export interface PalmsDependencies {
  /** The palms' own stream of random numbers. */
  random: Random;
  groundHeight: GroundHeight;
  landmarks: Landmarks;
  /** The middle of the sandbank in the lagoon, where three palms stand. */
  sandbank: Point;
  /** Whether a point is inside a rock or within `margin` of one. */
  isInRock: (x: number, z: number, margin: number) => boolean;
  /** The uniforms every shader shares; the fronds read uTime and uWind when they are first drawn. */
  uniforms: Record<string, IUniform>;
  instanceCells: InstanceCells;
  /** The most anisotropic filtering the graphics card offers. */
  maxAnisotropy: number;
}

export interface Palms {
  /** The picture of one frond, also used for fronds lying on the ground. */
  frondPicture: CanvasTexture;
}

interface PalmSpot {
  x: number;
  z: number;
  /** The height of the ground there. */
  ground: number;
}

/** One palm, placed: what its fronds need to know of it. */
interface Palm {
  kind: TrunkKind;
  trunk: TrunkConfig;
  /** Where it stands, how it is turned and how big it is. */
  matrix: Matrix4;
  size: number;
  /** Where its fronds spring from. */
  crown: Vector3;
  crownSize: number;
  hasDeadFronds: boolean;
}

interface Trunk {
  shape: BufferGeometry;
  simplerShape: BufferGeometry;
  /** Where each palm of this kind stands, how it is turned and how big it is. */
  palms: Matrix4[];
}

// Rounded, not 2π: where every palm and frond turns depends on the exact number.
const FULL_TURN = 6.283;

// They sway as they did in the usual breeze (0.66 × 1.5 is about 1), and not at all in a calm.
const FROND_SWAY = [
  '#include <begin_vertex>',
  '#ifdef USE_INSTANCING',
  ' transformed.y+=sin(uTime*1.6+instanceMatrix[3].x*1.3+instanceMatrix[3].z+position.x*.9)*.03*position.x*uWind*1.5;',
  ' transformed.z+=sin(uTime*1.1+instanceMatrix[3].x)*.017*position.x*uWind*1.5;',
  '#endif',
].join('\n');

function spread(random: Random, { from, range }: Spread): number {
  return from + random() * range;
}

function chooseKind(chance: number, kinds: readonly KindChance[]): TrunkKind {
  const choice = kinds.find(({ below }) => chance < below);
  if (choice === undefined) throw new Error('the kinds of palm do not cover every chance');
  return choice.kind;
}

function findSpots(dependencies: PalmsDependencies): PalmSpot[] {
  const { random, groundHeight, landmarks, sandbank, isInRock } = dependencies;
  const { count, tries, ground, apart, clearOfHut, clearOfPaths } = palmsConfig;
  const { hut } = landmarks;
  const spots: PalmSpot[] = [];
  for (let attempt = 0; spots.length < count && attempt < tries; attempt++) {
    const { x, z } = landmarks.ringPoint(random);
    const chance =
      palmsConfig.plantedAnywhere + palmsConfig.plantedNearHome * landmarks.nearHome(x, z);
    if (random() > chance) continue;
    const height = groundHeight(x, z);
    if (height < ground[0] || height > ground[1]) continue;
    if (Math.hypot(x - hut.x, z - hut.z) < clearOfHut) continue;
    if (landmarks.pathDistance(x, z) < clearOfPaths) continue;
    if (spots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < apart)) continue;

    spots.push({ x, z, ground: height });
  }
  for (const [fromMiddleX, fromMiddleZ] of palmsConfig.onTheSandbank) {
    const x = sandbank.x + fromMiddleX;
    const z = sandbank.z + fromMiddleZ;
    spots.push({ x, z, ground: groundHeight(x, z) });
  }
  // No palm grows through a rock. They are dropped only now, so that the rest stand where they
  // would without the rocks.
  return spots.filter((spot) => !isInRock(spot.x, spot.z, palmsConfig.clearOfRocks));
}

function createFrondMaterial(
  picture: CanvasTexture,
  uniforms: Record<string, IUniform>,
): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ map: picture, alphaTest: 0.4, side: DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWind = uniforms.uWind;
    shader.vertexShader =
      'uniform float uTime,uWind;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', FROND_SWAY);
  };
  // A frond is thin: sunlight on its upper side glows through, yellow-green, when you look up at it from below.
  return lightLeavesFromBothSides(material, 'palm fronds', [0.5, 0.62, 0.16]);
}

/** A palm on its spot: its kind, size and lean. `index` is its place among all the palms. */
function placePalm(random: Random, spot: PalmSpot, index: number): Palm {
  const { fronds } = palmsConfig;
  const isOnBeach = spot.ground < palmsConfig.beachBelow;
  const kind = chooseKind(
    random(),
    isOnBeach ? palmsConfig.kindsOnTheBeach : palmsConfig.kindsInland,
  );
  const trunk: TrunkConfig = palmsConfig.trunks[kind];
  let yaw = random() * FULL_TURN;
  const size = spread(random, trunk.size);
  if (kind === 'leaning' && isOnBeach) {
    // It leans towards the sea: outwards from the island's middle.
    yaw = -Math.atan2(spot.z, spot.x) + (random() - 0.5) * palmsConfig.seawardSpread;
  }
  const leanX = (random() - 0.5) * trunk.lean;
  const leanZ = (random() - 0.5) * trunk.lean;
  // The first palm is turned in Euler order XYZ and every later one in YZX, the fronds' order.
  // Kept on purpose: every palm's lean depends on it.
  const turn = new Quaternion().setFromEuler(
    new Euler(leanX, yaw, leanZ, index === 0 ? 'XYZ' : 'YZX'),
  );
  const foot = new Vector3(spot.x, spot.ground, spot.z);
  const matrix = new Matrix4().compose(foot, turn, new Vector3(size, size, size));
  const crown = new Vector3(trunk.top[0] * size, (trunk.top[1] - fronds.belowTop) * size, 0)
    .applyQuaternion(turn)
    .add(foot);
  const crownSize = 'always' in trunk.crown ? trunk.crown.always : spread(random, trunk.crown);
  const hasDeadFronds = random() < fronds.shareOfPalmsWithDeadFronds;
  return { kind, trunk, matrix, size, crown, crownSize, hasDeadFronds };
}

/** A palm's crown of fronds, set into the fronds' mesh from instance `first` on. */
function growFronds(random: Random, palm: Palm, frondMesh: InstancedMesh, first: number): void {
  const config = palmsConfig.fronds;
  const { perPalm, tiers } = config;
  const rotation = new Euler();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const matrix = new Matrix4();
  const colour = new Color();
  for (let f = 0; f < perPalm; f++) {
    const tierIndex = f % tiers.length;
    const tier = tiers[tierIndex];
    const pitch = tier.pitch + (random() - 0.5) * config.pitchSpread;
    const roll = (random() - 0.5) * config.rollSpread;
    const turn = ((f * FULL_TURN) / perPalm) * config.turnsRound + random() * config.turnSpread;
    quaternion.setFromEuler(rotation.set(roll, turn, pitch, 'YZX'));
    const size =
      palm.size * palm.crownSize * tier.size * spread(random, config.size) * palm.trunk.frondSize;
    scale.set(size, size * spread(random, config.arch), size);
    matrix.compose(palm.crown, quaternion, scale);
    frondMesh.setMatrixAt(first + f, matrix);

    const brightness = spread(random, config.brightness);
    const isOld = tierIndex === tiers.length - 1;
    const isDead = palm.hasDeadFronds && isOld && Math.floor(f / tiers.length) % 2 === 0;
    const tint = isDead ? config.deadTint : tier.tint;
    colour.setRGB(brightness * tint[0], brightness * tint[1], brightness * tint[2]);
    frondMesh.setColorAt(first + f, colour);
  }
}

function createTrunk(trunk: TrunkConfig): Trunk {
  const { full, simpler } = palmsConfig.trunkDetail;
  return {
    shape: createTrunkShape(trunk, full),
    simplerShape: createTrunkShape(trunk, simpler),
    palms: [],
  };
}

export function createPalms(dependencies: PalmsDependencies): Palms {
  const { random, uniforms, instanceCells } = dependencies;
  const { fronds, trunks, reach, simplerBeyond, cellSize } = palmsConfig;

  const frondPicture = paintFrondPicture(random, dependencies.maxAnisotropy);
  const frondShape = createFrondShape(fronds.pieces);
  const simplerFrondShape = createFrondShape(fronds.piecesFromAfar);
  const frondMaterial = createFrondMaterial(frondPicture, uniforms);
  // A frond's shadow is cut out of its picture as the frond is.
  const frondShadowMaterial = new MeshDepthMaterial({
    depthPacking: RGBADepthPacking,
    map: frondPicture,
    alphaTest: 0.4,
  });
  const barkMaterial = new MeshLambertMaterial({
    map: paintBarkPicture(random),
    vertexColors: true,
  });
  const trunksByKind: Record<TrunkKind, Trunk> = {
    ordinary: createTrunk(trunks.ordinary),
    tall: createTrunk(trunks.tall),
    leaning: createTrunk(trunks.leaning),
    young: createTrunk(trunks.young),
  };

  const spots = findSpots(dependencies);
  const frondMesh = new InstancedMesh(frondShape, frondMaterial, spots.length * fronds.perPalm);
  spots.forEach((spot, index) => {
    const palm = placePalm(random, spot, index);
    trunksByKind[palm.kind].palms.push(palm.matrix);
    growFronds(random, palm, frondMesh, index * fronds.perPalm);
  });

  for (const kind of TRUNK_KINDS) {
    const { shape, simplerShape, palms } = trunksByKind[kind];
    if (palms.length === 0) continue;

    const mesh = new InstancedMesh(shape, barkMaterial, palms.length);
    palms.forEach((palm, i) => {
      mesh.setMatrixAt(i, palm);
    });
    mesh.castShadow = true;
    instanceCells.split(mesh, {
      reach,
      simpler: { shape: simplerShape, beyond: simplerBeyond, cellSize },
    });
  }
  frondMesh.castShadow = true;
  frondMesh.customDepthMaterial = frondShadowMaterial;
  instanceCells.split(frondMesh, {
    reach,
    simpler: { shape: simplerFrondShape, beyond: simplerBeyond, cellSize },
  });

  return { frondPicture };
}
