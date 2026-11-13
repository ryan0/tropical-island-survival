import {
  Color,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  type DataTexture,
  type IUniform,
  type MeshLambertMaterial,
  type Scene,
} from 'three';
import type { Random } from '../../core/random';
import type { InstanceCells } from '../instance-cells';
import type { GroundHeight, Landmarks } from '../landmarks';
import type { RockSurface } from '../rocks/rocks-config';
import { createCoralShapes } from './coral-shapes';
import { CORAL_KINDS, reefConfig } from './reef-config';
import { createReefFish } from './reef-fish';
import { layOutReef } from './reef-layout';
import { createReefMap } from './reef-map';
import { createCoralMaterial } from './reef-material';

// The coral reef in the lagoon: coral heads (mounds of reef rock, "bommies") scattered over
// the sandy floor in 1.8 to 7 m of water, each packed with corals of five kinds, and smaller
// corals on the sand round them. Everything is built from simple shapes with colours painted
// on their corners; each kind is a few models, drawn many times with their own size, turn and
// tint. Colours are dimmed by depth as the water does it: red goes first.

export interface ReefDependencies {
  scene: Scene;
  /** The reef's own stream. */
  random: Random;
  groundHeight: GroundHeight;
  landmarks: Landmarks;
  /** Whether a point is inside a rock or within `margin` of one. */
  isInRock: (x: number, z: number, margin: number) => boolean;
  /** The rocks' material with another surface: the heads are rock. */
  createRockMaterial: (surface: RockSurface) => MeshLambertMaterial;
  /** The uniforms every shader shares. */
  uniforms: Record<string, IUniform>;
  instanceCells: InstanceCells;
}

export interface Reef {
  /** How high the coral heads stand, for the water's shader and the sand's. */
  map: DataTexture;
  /** Moves the reef's fish. `time` is the clock the waves run by. */
  update(time: number, cameraPosition: Vector3): void;
}

// How far a head, and anything else, can reach from its own middle.
const HEAD_REACH = 8;
const CORAL_REACH = 2.5;
const CELL_SIZE = 32;

export function createReef(dependencies: ReefDependencies): Reef {
  const { scene, random, groundHeight, landmarks, isInRock, uniforms, instanceCells } =
    dependencies;
  const coralMaterial = createCoralMaterial(uniforms);
  const rockMaterial = dependencies.createRockMaterial(reefConfig.rockSurface);

  // All of these draw from the one random stream, in this order: the models, where everything
  // goes, how each coral is turned and tinted, and last the fish.
  const shapes = createCoralShapes(random);
  const layout = layOutReef({ random, groundHeight, isInRock, landmarks });
  const map = createReefMap(layout.heads, landmarks.home);

  const up = new Vector3(0, 1, 0);
  const matrix = new Matrix4();
  const lean = new Quaternion();
  const turn = new Quaternion();
  const leanAxis = new Vector3();
  const scale = new Vector3();
  const position = new Vector3();
  const colour = new Color();
  for (const kind of CORAL_KINDS) {
    const config = reefConfig.kinds[kind];
    const isHead = kind === 'head';
    const { fromAfar } = shapes[kind];

    layout.corals[kind].forEach((corals, model) => {
      if (corals.length === 0) return;

      const mesh = new InstancedMesh(
        shapes[kind].shapes[model],
        config.isRock ? rockMaterial : coralMaterial,
        corals.length,
      );
      corals.forEach((coral, index) => {
        // It leans outward with the slope of the head it grows on, then turns about its own stem.
        leanAxis.set(Math.sin(coral.bearing), 0, -Math.cos(coral.bearing));
        lean.setFromAxisAngle(leanAxis, -coral.tilt);
        turn.setFromAxisAngle(up, isHead ? coral.bearing : random() * 6.283);
        lean.multiply(turn);
        const stretch = isHead ? 1 : 0.85 + random() * 0.3;
        scale.set(coral.size, coral.size * coral.squash * stretch, coral.size);
        matrix.compose(position.set(coral.x, coral.y, coral.z), lean, scale);
        mesh.setMatrixAt(index, matrix);

        // The sea's dimming with depth is done in the shader, as for the sand; here only a little warmth.
        const tint = config.tints[Math.floor(random() * config.tints.length)];
        const brightness = 0.85 + random() * 0.25;
        colour.setRGB(
          tint[0] * brightness * 1.12,
          tint[1] * brightness * 0.97,
          tint[2] * brightness * 0.92,
        );
        mesh.setColorAt(index, colour);
      });
      instanceCells.split(mesh, {
        reach: isHead ? HEAD_REACH : CORAL_REACH,
        shownWithin: isHead ? reefConfig.headsShownWithin : reefConfig.coralsShownWithin,
        simpler:
          fromAfar === undefined || !('simplerBeyond' in config)
            ? null
            : { shape: fromAfar, beyond: config.simplerBeyond, cellSize: CELL_SIZE },
      });
    });
  }

  const fish = createReefFish(scene, random, layout.heads);

  return {
    map,
    update(time, cameraPosition) {
      fish.update(time, cameraPosition);
    },
  };
}
