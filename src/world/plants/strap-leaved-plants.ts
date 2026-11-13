import type { Random } from '../../core/random';
import { createPlantShape, type PlantModel } from './plant-shape';
import type { Triple } from './plant-triangles';

// The plants whose leaves are long blades, drawn in their colours alone.

/** Ground rosette: a knee-high star of broad strap leaves. */
export function rosette(random: Random): PlantModel {
  const star = createPlantShape(random, { inLeafAtlas: false });
  star.addBladeCrown({
    centre: [0, 0.05, 0],
    blades: 18,
    length: 1.35,
    width: 0.065,
    uprightness: 0.95,
    deadBlades: 1,
  });
  return star.model();
}

// Screw pine (pandanus): a stem propped on stilt roots, forking into a few branches, each ending
// in a crown of leaves with some dead ones hanging under it.

const SCREW_PINE_BRANCH_ENDS: readonly Triple[] = [
  [1.0, 2.7, 0.2],
  [-0.8, 3.0, 0.5],
  [0.1, 3.5, -0.9],
  [-0.3, 2.3, -0.5],
  [0.5, 3.1, 0.9],
];

export function screwPineStems(random: Random): PlantModel {
  const stems = createPlantShape(random, { inLeafAtlas: false });
  stems.addStem({
    from: [0, 0.55, 0],
    to: [0.08, 1.7, 0],
    fromRadius: 0.15,
    toRadius: 0.12,
    barkStart: 0,
  });
  for (let k = 0; k < 7; k++) {
    const spread = 0.5 + 0.15 * (k % 2);
    stems.addStem({
      from: [Math.cos(k * 0.9) * spread, -0.25, Math.sin(k * 0.9) * spread],
      to: [Math.cos(k * 0.9) * 0.05, 0.75 + 0.1 * (k % 3), Math.sin(k * 0.9) * 0.05],
      fromRadius: 0.03,
      toRadius: 0.05,
      barkStart: 0,
    });
  }
  for (const [x, y, z] of SCREW_PINE_BRANCH_ENDS) {
    const elbow: Triple = [0.08 + (x - 0.08) * 0.5, 1.6 + (y - 1.6) * 0.35, z * 0.5];
    stems.addStem({
      from: [0.08, 1.6, 0],
      to: elbow,
      fromRadius: 0.11,
      toRadius: 0.09,
      barkStart: 0.2,
    });
    stems.addStem({ from: elbow, to: [x, y, z], fromRadius: 0.09, toRadius: 0.07, barkStart: 0.4 });
  }
  return stems.model();
}

export function screwPineLeaves(random: Random): PlantModel {
  const leaves = createPlantShape(random, { inLeafAtlas: false });
  for (const branchEnd of SCREW_PINE_BRANCH_ENDS) {
    leaves.addBladeCrown({
      centre: branchEnd,
      blades: 22,
      length: 1.5,
      width: 0.05,
      uprightness: 1.05,
      deadBlades: 4,
    });
  }
  return leaves.model();
}
