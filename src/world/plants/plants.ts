import {
  CanvasTexture,
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
  type Material,
  type Texture,
} from 'three';
import type { Random } from '../../core/random';
import type { InstanceCells } from '../instance-cells';
import type { GroundHeight, Landmarks } from '../landmarks';
import { lightLeavesFromBothSides } from './leaf-light';
import { createPlantModels, type PlantModel } from './plant-models';
import { plantsConfig, type PlantKindConfig } from './plants-config';

export interface PlantsDependencies {
  /** The stream that places the plants. (Their shapes come from a stream of their own.) */
  random: Random;
  groundHeight: GroundHeight;
  landmarks: Landmarks;
  /** Whether a point is inside a rock or within `margin` of one. */
  isInRock: (x: number, z: number, margin: number) => boolean;
  /** The picture of one palm frond, for the fronds lying on the ground. */
  palmFrondPicture: Texture;
  instanceCells: InstanceCells;
  /** The most anisotropic filtering the graphics card offers. */
  maxAnisotropy: number;
}

/** One mesh of a kind of plant; a kind of several parts has them standing in the same places. */
interface PlantPart {
  model: PlantModel;
  material: Material;
  /** For a part cut out of a picture: its shadow must be cut out the same. */
  shadowMaterial?: Material;
}

interface PlantKind {
  config: PlantKindConfig;
  parts: PlantPart[];
  /** The size of one planted here, or 0 for none. It may draw random numbers, but only once the ground is the right height. */
  sizeAt: (x: number, z: number, height: number) => number;
  chooseColour: (colour: Color) => void;
}

const CELL_SIZE = 32;

export function createPlants(dependencies: PlantsDependencies): void {
  const { random, groundHeight, landmarks, isInRock, instanceCells } = dependencies;
  const { kinds } = plantsConfig;
  const models = createPlantModels();
  const leafPicture = new CanvasTexture(models.leafAtlas);
  leafPicture.anisotropy = Math.min(4, dependencies.maxAnisotropy);
  const barkPicture = new CanvasTexture(models.bark);

  const bark = new MeshLambertMaterial({ map: barkPicture, vertexColors: true });
  const leaves = lightLeavesFromBothSides(
    new MeshLambertMaterial({
      map: leafPicture,
      alphaTest: 0.5,
      side: DoubleSide,
      vertexColors: true,
    }),
    'leaf atlas',
  );
  const leafShadows = new MeshDepthMaterial({
    depthPacking: RGBADepthPacking,
    map: leafPicture,
    alphaTest: 0.5,
  });
  const plainLeaves = lightLeavesFromBothSides(
    new MeshLambertMaterial({ side: DoubleSide, vertexColors: true }),
    'plain leaves',
  );
  const fallenFronds = lightLeavesFromBothSides(
    new MeshLambertMaterial({
      map: dependencies.palmFrondPicture,
      alphaTest: 0.4,
      side: DoubleSide,
    }),
    'fallen fronds',
  );

  /** Most kinds thin out away from home, to four tenths; a few thin to nothing much at all. */
  const fewerFarFromHome = (x: number, z: number) => 0.4 + 0.6 * landmarks.nearHome(x, z);
  const isOffGround = (height: number, [lowest, highest]: readonly [number, number]) =>
    height < lowest || height > highest;

  // The order is the order they are planted in, which the stream of random numbers depends on.
  const plantKinds: PlantKind[] = [
    {
      // The hedge: thick just behind the beach, thinning out inland.
      config: kinds.beachShrub,
      parts: [{ model: models.beachShrub, material: leaves, shadowMaterial: leafShadows }],
      sizeAt(x, z, height) {
        if (isOffGround(height, kinds.beachShrub.ground)) return 0;
        const isInTheHedge = height < 2.7;
        if (random() > (isInTheHedge ? 0.85 : 0.1) * fewerFarFromHome(x, z)) return 0;
        return isInTheHedge ? 1.0 + random() * 1.5 : 0.8 + random() * 1.0;
      },
      chooseColour(colour) {
        const brightness = 0.92 + random() * 0.3;
        colour.setRGB(
          brightness * (0.9 + random() * 0.16),
          brightness,
          brightness * (0.85 + random() * 0.2),
        );
      },
    },
    {
      config: kinds.broadleafTree,
      parts: [{ model: models.broadleafTree, material: leaves, shadowMaterial: leafShadows }],
      sizeAt(x, z, height) {
        if (isOffGround(height, kinds.broadleafTree.ground)) return 0;
        if (random() > 0.25 * fewerFarFromHome(x, z)) return 0;
        return 0.9 + random() * 0.8;
      },
      chooseColour(colour) {
        const brightness = 0.74 + random() * 0.22;
        colour.setRGB(brightness * 0.88, brightness, brightness * 0.84);
      },
    },
    {
      config: kinds.scrubBush,
      parts: [{ model: models.scrubBush, material: leaves, shadowMaterial: leafShadows }],
      sizeAt(x, z, height) {
        if (isOffGround(height, kinds.scrubBush.ground)) return 0;
        if (random() > 0.3 * fewerFarFromHome(x, z)) return 0;
        return 0.8 + random() * 1.0;
      },
      chooseColour(colour) {
        const brightness = 0.62 + random() * 0.22;
        colour.setRGB(brightness * 0.86, brightness, brightness * 0.82);
      },
    },
    {
      config: kinds.screwPine,
      parts: [
        { model: models.screwPineLeaves, material: plainLeaves },
        { model: models.screwPineStems, material: bark },
      ],
      sizeAt(x, z, height) {
        if (isOffGround(height, kinds.screwPine.ground)) return 0;
        if (random() > (height < 3 ? 0.5 : 0.15) * fewerFarFromHome(x, z)) return 0;
        return 0.7 + random() * 0.7;
      },
      chooseColour(colour) {
        const brightness = 0.9 + random() * 0.3;
        colour.setRGB(brightness, brightness, brightness);
      },
    },
    {
      config: kinds.rosette,
      parts: [{ model: models.rosette, material: plainLeaves }],
      sizeAt(x, z, height) {
        if (isOffGround(height, kinds.rosette.ground)) return 0;
        if (random() > 0.5 * landmarks.nearHome(x, z)) return 0;
        return 0.45 + random() * 0.6;
      },
      chooseColour(colour) {
        const brightness = 0.9 + random() * 0.3;
        const yellowing = random();
        colour.setRGB(
          brightness * (1 + 0.5 * yellowing * yellowing),
          brightness * (1 + 0.1 * yellowing),
          brightness * (1 - 0.2 * yellowing),
        );
      },
    },
    {
      config: kinds.fallenFrond,
      parts: [{ model: models.fallenFrond, material: fallenFronds }],
      sizeAt(x, z, height) {
        if (isOffGround(height, kinds.fallenFrond.ground)) return 0;
        if (random() > 0.4 * fewerFarFromHome(x, z)) return 0;
        return 0.7 + random() * 0.5;
      },
      // Straw to grey-brown: the picture is green, and this bleaches it.
      chooseColour(colour) {
        const brightness = 0.75 + random() * 0.5;
        const age = random();
        colour.setRGB(
          brightness * (1.5 - 0.35 * age),
          brightness * (0.95 - 0.2 * age),
          brightness * (0.9 + 0.5 * age),
        );
      },
    },
    {
      // Thickest creeping out onto the back of the beach.
      config: kinds.vineMat,
      parts: [{ model: models.vineMat, material: plainLeaves }],
      sizeAt(x, z, height) {
        if (isOffGround(height, kinds.vineMat.ground)) return 0;
        if (random() > (height < 2.4 ? 0.7 : 0.2) * fewerFarFromHome(x, z)) return 0;
        return 0.7 + random() * 0.8;
      },
      chooseColour(colour) {
        const brightness = 0.95 + random() * 0.3;
        colour.setRGB(brightness, brightness, brightness);
      },
    },
    {
      // Scattered over the beach, thickest along the drift line and at the back where storms throw it.
      config: kinds.coralLump,
      parts: [{ model: models.coralLump, material: plainLeaves }],
      sizeAt(x, z, height) {
        if (isOffGround(height, kinds.coralLump.ground)) return 0;
        const isWhereItGathers = height > 1.45 || (height > 0.75 && height < 0.95);
        if (random() > (isWhereItGathers ? 0.8 : 0.05) * landmarks.nearHome(x, z)) return 0;
        return 0.04 + random() * random() * 0.16;
      },
      chooseColour(colour) {
        const brightness = 0.62 + random() * 0.3;
        const warmth = random();
        colour.setRGB(
          brightness,
          brightness * (0.97 - 0.07 * warmth),
          brightness * (0.92 - 0.17 * warmth),
        );
      },
    },
    {
      config: kinds.coconut,
      parts: [{ model: models.coconut, material: plainLeaves }],
      sizeAt(x, z, height) {
        if (isOffGround(height, kinds.coconut.ground)) return 0;
        if (random() > 0.35 * landmarks.nearHome(x, z)) return 0;
        return 0.13 + random() * 0.04;
      },
      chooseColour(colour) {
        const brightness = 0.3 + random() * 0.2;
        const greenness = random();
        colour.setRGB(
          brightness * (1.2 + 0.3 * greenness),
          brightness * (0.95 + 0.3 * greenness),
          brightness * 0.55,
        );
      },
    },
    {
      config: kinds.stump,
      parts: [{ model: models.stump, material: bark }],
      sizeAt(x, z, height) {
        if (isOffGround(height, kinds.stump.ground)) return 0;
        if (random() > 0.1 * landmarks.nearHome(x, z)) return 0;
        return 0.8 + random() * 0.6;
      },
      chooseColour(colour) {
        const brightness = 0.6 + random() * 0.25;
        colour.setRGB(brightness, brightness * 0.92, brightness * 0.82);
      },
    },
  ];

  const matrix = new Matrix4();
  const turn = new Quaternion();
  const tilt = new Euler();
  const scale = new Vector3();
  const position = new Vector3();
  const colour = new Color();

  function plant({ config, parts, sizeAt, chooseColour }: PlantKind): void {
    const meshes = parts.map(
      (part) => new InstancedMesh(part.model.full, part.material, config.count),
    );
    let planted = 0;
    for (let attempt = 0; attempt < config.tries && planted < config.count; attempt++) {
      const { x, z } = landmarks.ringPoint(random);
      const height = groundHeight(x, z);
      const isNearHut =
        Math.hypot(x - landmarks.hut.x, z - landmarks.hut.z) < plantsConfig.clearOfHut;
      if (isNearHut || landmarks.pathDistance(x, z) < plantsConfig.clearOfPaths) continue;
      const size = sizeAt(x, z, height);
      if (size === 0) continue;

      tilt.set((random() - 0.5) * 0.12, random() * 6.283, (random() - 0.5) * 0.12);
      turn.setFromEuler(tilt);
      scale.set(
        size * (0.85 + random() * 0.3),
        size * (0.8 + random() * 0.35),
        size * (0.85 + random() * 0.3),
      );
      matrix.compose(position.set(x, height - 0.08 * size, z), turn, scale);
      chooseColour(colour);
      // Checked last, after every random draw, so that the other plants do not move.
      if (isInRock(x, z, 0.3 * size)) continue;

      for (const mesh of meshes) {
        mesh.setMatrixAt(planted, matrix);
        mesh.setColorAt(planted, colour);
      }
      planted++;
    }

    meshes.forEach((mesh, index) => {
      const { model, shadowMaterial } = parts[index];
      mesh.count = planted;
      mesh.castShadow = config.castsShadow;
      mesh.receiveShadow = true;
      if (shadowMaterial !== undefined) mesh.customDepthMaterial = shadowMaterial;
      instanceCells.split(mesh, {
        reach: config.reach,
        shownWithin: config.shownWithin,
        simpler:
          model.simpler === null || config.simplerBeyond === 0
            ? null
            : { shape: model.simpler, beyond: config.simplerBeyond, cellSize: CELL_SIZE },
      });
    });
  }

  for (const kind of plantKinds) plant(kind);
}
