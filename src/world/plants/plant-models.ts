import type { BufferGeometry } from 'three';
import type { Random } from '../../core/random';
import { drawLeafPictures } from './leaf-atlas';
import { beachShrub, broadleafTree, scrubBush } from './leafy-plants';
import type { PlantModel } from './plant-shape';
import { rosette, screwPineLeaves, screwPineStems } from './strap-leaved-plants';
import { coconut, coralLump, fallenFrond, stump, vineMat } from './things-on-the-ground';

export type { PlantModel } from './plant-shape';

// The island's plants other than the palms and the grass, and what lies on the ground under them.

export interface PlantModels {
  /** The picture the leafy plants share: four sprigs of leaves, the dark inside of a bush, a strip of bark. */
  leafAtlas: HTMLCanvasElement;
  /** Bark on its own, for stems that are not part of a leafy plant. */
  bark: HTMLCanvasElement;
  beachShrub: PlantModel;
  broadleafTree: PlantModel;
  scrubBush: PlantModel;
  rosette: PlantModel;
  screwPineLeaves: PlantModel;
  /** Drawn with the bark on its own. */
  screwPineStems: PlantModel;
  fallenFrond: PlantModel;
  vineMat: PlantModel;
  stump: PlantModel;
  coralLump: PlantModel;
  coconut: PlantModel;
}

const SHAPE_SEED = 987654321;

/**
 * The random numbers the plants' shapes and pictures are made with. Not the island's layout: the
 * same plants are built whatever the layout seed.
 */
function createShapeRandom(): Random {
  let state = SHAPE_SEED;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function onlyShape(full: BufferGeometry): PlantModel {
  return { full, simpler: null };
}

/** Every picture and model, made in the order that their one stream of random numbers expects. */
export function createPlantModels(): PlantModels {
  const random = createShapeRandom();
  const { leafAtlas, bark } = drawLeafPictures(random);
  return {
    leafAtlas,
    bark,
    beachShrub: beachShrub(random),
    broadleafTree: broadleafTree(random),
    scrubBush: scrubBush(random),
    rosette: rosette(random),
    screwPineLeaves: screwPineLeaves(random),
    screwPineStems: screwPineStems(random),
    fallenFrond: onlyShape(fallenFrond()),
    vineMat: vineMat(random),
    stump: onlyShape(stump()),
    coralLump: onlyShape(coralLump()),
    coconut: onlyShape(coconut()),
  };
}
