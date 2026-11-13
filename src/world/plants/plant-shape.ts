import type { BufferGeometry } from 'three';
import type { Random } from '../../core/random';
import { addBladeCrown, type BladeCrown } from './blade-crowns';
import type { AtlasRegion } from './leaf-atlas';
import { addLeafMass, type LeafMass } from './leaf-masses';
import {
  addBallTriangles,
  createTriangles,
  type BothLevels,
  type Corner,
  type Triple,
} from './plant-triangles';

// A plant shape collects the triangles of one kind of plant, part by part (a dark core, a mass of
// leaves, a stem, a crown of blades), and writes each part twice: in full, and thinned out for
// the simpler shape drawn for plants further away. Building both at once from the same random
// numbers is what makes the two the same plant.

/** One kind of plant, in full and as it is drawn further away. */
export interface PlantModel {
  full: BufferGeometry;
  /** For plants further away; null for a kind that has only the one shape. */
  simpler: BufferGeometry | null;
}

/** The dark heart of a bush: a plain ball that stops you seeing through it. */
export interface DarkCore {
  centre: Triple;
  radius: number;
  halfHeight: number;
  segments: number;
  rings: number;
}

/** A five-sided stem from one point to another. */
export interface Stem {
  from: Triple;
  to: Triple;
  fromRadius: number;
  toRadius: number;
  /** Where along the bark picture it starts. */
  barkStart: number;
}

export interface PlantShape {
  addDarkCore(core: DarkCore): void;
  addLeafMass(mass: LeafMass): void;
  addStem(stem: Stem): void;
  addBladeCrown(crown: BladeCrown): void;
  model(): PlantModel;
}

export interface PlantShapeOptions {
  /** Drawn with the leaf atlas: each part's texture coordinates land in its region of it. */
  inLeafAtlas: boolean;
}

function addDarkCore(
  { full, simpler }: BothLevels,
  { centre: [cx, cy, cz], radius, halfHeight, segments, rings }: DarkCore,
  region: AtlasRegion | undefined,
): void {
  const corners: Corner[] = [];
  for (let ring = 0; ring <= rings; ring++) {
    for (let segment = 0; segment <= segments; segment++) {
      const th = (segment / segments) * 6.283;
      const ph = (ring / rings) * Math.PI;
      const nx = Math.sin(ph) * Math.cos(th);
      const ny = Math.cos(ph);
      const nz = Math.sin(ph) * Math.sin(th);
      corners.push([
        cx + nx * radius,
        cy + ny * halfHeight,
        cz + nz * radius,
        (segment / segments) * 2,
        (ring / rings) * 2,
        nx,
        ny * 0.6 + 0.4,
        nz,
      ]);
    }
  }
  addBallTriangles(corners, segments, rings, (a, b, c) => {
    full.add(a, b, c, region);
    simpler.add(a, b, c, region);
  });
}

function addStem(
  { full, simpler }: BothLevels,
  { from: [x0, y0, z0], to: [x1, y1, z1], fromRadius: r0, toRadius: r1, barkStart: v }: Stem,
  region: AtlasRegion | undefined,
): void {
  for (let side = 0; side < 5; side++) {
    const a0 = side * 1.2566;
    const a1 = a0 + 1.2566;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const foot0: Corner = [x0 + c0 * r0, y0, z0 + s0 * r0, 0.1, v, c0, 0.2, s0];
    const foot1: Corner = [x0 + c1 * r0, y0, z0 + s1 * r0, 0.2, v, c1, 0.2, s1];
    const top1: Corner = [x1 + c1 * r1, y1, z1 + s1 * r1, 0.2, v + 0.3, c1, 0.2, s1];
    const top0: Corner = [x1 + c0 * r1, y1, z1 + s0 * r1, 0.1, v + 0.3, c0, 0.2, s0];
    full.add(foot0, foot1, top1, region);
    simpler.add(foot0, foot1, top1, region);
    full.add(foot0, top1, top0, region);
    simpler.add(foot0, top1, top0, region);
  }
}

/** `random` places the sprigs and the blades. */
export function createPlantShape(random: Random, { inLeafAtlas }: PlantShapeOptions): PlantShape {
  const levels: BothLevels = { full: createTriangles(), simpler: createTriangles() };
  const inAtlas = (region: AtlasRegion) => (inLeafAtlas ? region : undefined);

  return {
    addDarkCore: (core) => {
      addDarkCore(levels, core, inAtlas('core'));
    },
    addLeafMass: (mass) => {
      addLeafMass(levels, random, mass, inAtlas('leaf'));
    },
    addStem: (stem) => {
      addStem(levels, stem, inAtlas('bark'));
    },
    addBladeCrown: (crown) => {
      addBladeCrown(levels, random, crown);
    },
    model: () => ({ full: levels.full.geometry(), simpler: levels.simpler.geometry() }),
  };
}
