import type { Random } from '../../core/random';
import { createPlantShape, type PlantModel } from './plant-shape';
import type { Triple } from './plant-triangles';

// The plants made of masses of leaves over dark cores, on stems. Each is one mesh: its leaves,
// dark cores and stems all take their pictures from the leaf atlas.

/**
 * Beach shrub (naupaka): rounded mounds of glossy paddle-leaved scrub. A low spreading mound, one
 * big mass of sprigs and two on its shoulders, over a dark heart.
 */
export function beachShrub(random: Random): PlantModel {
  const shrub = createPlantShape(random, { inLeafAtlas: true });
  shrub.addDarkCore({ centre: [0, 0.5, 0], radius: 0.72, halfHeight: 0.5, segments: 6, rings: 3 });
  shrub.addDarkCore({
    centre: [0.6, 0.36, 0.3],
    radius: 0.42,
    halfHeight: 0.3,
    segments: 5,
    rings: 3,
  });
  shrub.addDarkCore({
    centre: [-0.5, 0.34, -0.45],
    radius: 0.44,
    halfHeight: 0.3,
    segments: 5,
    rings: 3,
  });
  shrub.addLeafMass({
    centre: [0, 0.55, 0],
    radii: [1.0, 0.72, 1.0],
    sprigs: 66,
    sprigSize: 0.19,
    reachBelowMiddle: 0.35,
  });
  shrub.addLeafMass({
    centre: [0, 0.5, 0],
    radii: [0.78, 0.56, 0.78],
    sprigs: 20,
    sprigSize: 0.17,
    reachBelowMiddle: 0.4,
  });
  shrub.addLeafMass({
    centre: [0.66, 0.38, 0.32],
    radii: [0.62, 0.46, 0.62],
    sprigs: 30,
    sprigSize: 0.165,
    reachBelowMiddle: 0.3,
  });
  shrub.addLeafMass({
    centre: [-0.56, 0.36, -0.5],
    radii: [0.64, 0.45, 0.64],
    sprigs: 30,
    sprigSize: 0.165,
    reachBelowMiddle: 0.3,
  });
  shrub.addLeafMass({
    centre: [0.1, 0.3, 0.75],
    radii: [0.5, 0.36, 0.5],
    sprigs: 18,
    sprigSize: 0.16,
    reachBelowMiddle: 0.3,
  });
  return shrub.model();
}

/** Where a limb ends, and the size of the mass of leaves it carries. */
type Limb = readonly [x: number, y: number, z: number, size: number];

const BROADLEAF_LIMBS: readonly Limb[] = [
  [1.9, 3.3, 0.6, 1.25],
  [-1.7, 3.5, -0.8, 1.3],
  [0.3, 3.4, -1.9, 1.2],
  [0.1, 4.5, 0.2, 1.6],
  [-0.6, 3.2, 1.7, 1.2],
  [1.3, 4.0, -1.0, 1.1],
  [-1.2, 4.2, 0.9, 1.1],
];

/**
 * Broadleaf tree: a small spreading tree, its trunk forking into limbs that bend out and then up,
 * each into its own mass of leaves.
 */
export function broadleafTree(random: Random): PlantModel {
  const tree = createPlantShape(random, { inLeafAtlas: true });
  tree.addStem({
    from: [0, -0.3, 0],
    to: [0.15, 1.5, 0.1],
    fromRadius: 0.3,
    toRadius: 0.2,
    barkStart: 0,
  });
  tree.addStem({
    from: [0.15, 1.4, 0.1],
    to: [0.25, 2.4, 0.1],
    fromRadius: 0.2,
    toRadius: 0.15,
    barkStart: 0.2,
  });
  for (const [i, [x, y, z, size]] of BROADLEAF_LIMBS.entries()) {
    const elbow: Triple = [x * 0.55, 2.3 + (y - 2.3) * 0.35, z * 0.55];
    // The first three fork from low on the trunk, the rest from its top.
    const fork: Triple = [0.25, i < 3 ? 1.5 : 2.3, 0.1];
    tree.addStem({ from: fork, to: elbow, fromRadius: 0.11, toRadius: 0.07, barkStart: 0.3 });
    tree.addStem({
      from: elbow,
      to: [x * 0.9, y - 0.3, z * 0.9],
      fromRadius: 0.07,
      toRadius: 0.03,
      barkStart: 0.5,
    });
    tree.addDarkCore({
      centre: [x, y, z],
      radius: size * 0.5,
      halfHeight: size * 0.34,
      segments: 5,
      rings: 3,
    });
    tree.addLeafMass({
      centre: [x, y, z],
      radii: [size, size * 0.62, size],
      sprigs: Math.round(46 * size),
      sprigSize: 0.24,
      reachBelowMiddle: 0.6,
    });
    tree.addLeafMass({
      centre: [x, y - 0.1, z],
      radii: [size * 0.65, size * 0.4, size * 0.65],
      sprigs: Math.round(14 * size),
      sprigSize: 0.22,
      reachBelowMiddle: 0.9,
    });
  }
  return tree.model();
}

const SCRUB_STEMS: readonly Limb[] = [
  [0.0, 1.25, 0.0, 0.85],
  [0.75, 0.85, 0.35, 0.62],
  [-0.7, 0.95, -0.3, 0.66],
  [0.15, 0.7, -0.8, 0.55],
  [-0.25, 0.6, 0.8, 0.55],
];

/**
 * Scrub bush: taller and looser than the beach shrub, a few leaning stems each carrying a mass of
 * smaller leaves, with twigs showing between them.
 */
export function scrubBush(random: Random): PlantModel {
  const scrub = createPlantShape(random, { inLeafAtlas: true });
  for (const [x, y, z, size] of SCRUB_STEMS) {
    scrub.addStem({
      from: [x * 0.15, -0.15, z * 0.15],
      to: [x * 0.8, y - 0.25, z * 0.8],
      fromRadius: 0.045,
      toRadius: 0.02,
      barkStart: 0.2,
    });
    scrub.addDarkCore({
      centre: [x, y, z],
      radius: size * 0.36,
      halfHeight: size * 0.27,
      segments: 5,
      rings: 3,
    });
    scrub.addLeafMass({
      centre: [x, y, z],
      radii: [size, size * 0.74, size],
      sprigs: Math.round((46 * size) / 0.85),
      sprigSize: 0.2,
      reachBelowMiddle: 0.65,
    });
    scrub.addLeafMass({
      centre: [x, y, z],
      radii: [size * 0.6, size * 0.45, size * 0.6],
      sprigs: Math.round((12 * size) / 0.85),
      sprigSize: 0.18,
      reachBelowMiddle: 0.8,
    });
  }
  return scrub.model();
}
