import { InstancedMesh, type IUniform, type MeshLambertMaterial } from 'three';
import type { Random } from '../../core/random';
import type { InstanceCells } from '../instance-cells';
import type { IslandShape } from '../island-shape';
import type { Landmarks } from '../landmarks';
import { createRockMaterial } from './rock-material';
import { placeRocks, type RockPlacement } from './rock-placement';
import { createRockShape } from './rock-shapes';
import { rocksConfig, type RockKind, type RockSurface } from './rocks-config';

// Rocks, of five kinds, each in two or three different shapes. They are placed in groups, the
// way rock lies on a shore - a few big ones, smaller ones round them, cobbles spilling out -
// and not at random: boulder and crag groups on the waterline, ledges along it, karst behind
// the beach, lone crags out on the reef flat.

export interface RocksDependencies {
  /** The rocks' own stream. */
  random: Random;
  island: IslandShape;
  landmarks: Landmarks;
  /** Whether the camp is there: its fire has a ring of stones. */
  hasCamp: boolean;
  /** The uniforms every shader shares. */
  uniforms: Record<string, IUniform>;
  instanceCells: InstanceCells;
}

export interface Rocks {
  /** Whether a point is inside a rock bigger than a cobble, or within `margin` of one: plants keep out. */
  isInRock(x: number, z: number, margin: number): boolean;
  /** Rocks standing in the surf, which throw spray and gather foam. */
  inSurf: RockPlacement['inSurf'];
  /** The rocks' material with another surface: the coral heads' rock is drawn with it. */
  createMaterial(surface: RockSurface): MeshLambertMaterial;
}

// How far a rock can reach from its own middle, at most.
const REACH = 4;
const CELL_SIZE = 64;

export function createRocks(dependencies: RocksDependencies): Rocks {
  const { random, island, landmarks, hasCamp, uniforms, instanceCells } = dependencies;
  const { kinds } = rocksConfig;
  const materials: Record<RockKind, MeshLambertMaterial> = {
    boulder: createRockMaterial(kinds.boulder.surface, uniforms),
    crag: createRockMaterial(kinds.crag.surface, uniforms),
    slab: createRockMaterial(kinds.slab.surface, uniforms),
    karst: createRockMaterial(kinds.karst.surface, uniforms),
    cobble: createRockMaterial(kinds.cobble.surface, uniforms),
  };
  const placement = placeRocks({ random, island, landmarks, hasCamp });

  for (const { kind, seed, rocks } of placement.shapes) {
    const { detail, detailFromAfar } = kinds[kind];
    const mesh = new InstancedMesh(
      createRockShape(kind, seed, detail),
      materials[kind],
      rocks.length,
    );
    rocks.forEach((rock, index) => {
      mesh.setMatrixAt(index, rock.matrix);
      mesh.setColorAt(index, rock.colour);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    instanceCells.split(mesh, {
      reach: REACH,
      shownWithin: kind === 'cobble' ? rocksConfig.cobblesShownWithin : 0,
      simpler:
        detailFromAfar === 0
          ? null
          : {
              shape: createRockShape(kind, seed, detailFromAfar),
              beyond: rocksConfig.simplerBeyond,
              cellSize: CELL_SIZE,
            },
    });
  }

  return {
    inSurf: placement.inSurf,

    isInRock(x, z, margin) {
      for (const spot of placement.spots) {
        if (Math.hypot(x - spot.x, z - spot.z) < spot.radius + margin) return true;
      }
      return false;
    },

    createMaterial(surface) {
      return createRockMaterial(surface, uniforms);
    },
  };
}
