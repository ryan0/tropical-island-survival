import {
  Color,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  type DataTexture,
  type IUniform,
} from 'three';
import { FULL_TURN } from '../../core/maths';
import type { RandomStreams } from '../../core/random';
import type { InstanceCells } from '../instance-cells';
import type { GroundHeight, Landmarks } from '../landmarks';
import type { IsInRock } from '../rocks/rocks';
import { createCoralShapes } from './coral-shapes';
import { CORAL_KINDS, reefConfig } from './reef-config';
import { layOutReef, type CoralHead, type ReefZones } from './reef-layout';
import { createReefMap } from './reef-map';
import { createCoralSurfacePicture } from './coral-surface-picture';
import { createCoralMaterial } from './reef-material';

// The coral reef: coral heads (great boulder corals, "bommies") scattered over the sandy floor
// in 1.3 to 7 m of water, each packed with corals of five kinds, and smaller corals on the sand
// round them; thickest off home, where it was first laid out, and thinner round the rest of the
// atoll, where each of the gardens' deep basins has a few heads and the reef's high ground a
// scatter of coral (reef-layout.ts). Everything is built from simple shapes with colours painted
// on their corners; each kind is a few models, drawn many times with their own size, turn and
// tint. Colours are dimmed by depth as the water does it: red goes first.

export interface ReefDependencies {
  /** The models, where everything goes, and how each coral is turned and tinted: a stream each. */
  randomStream: RandomStreams;
  /** What stands where on the reef, for the corals round the atoll. */
  island: ReefZones;
  groundHeight: GroundHeight;
  landmarks: Landmarks;
  /** Whether a point is inside a rock or within `margin` of one. */
  isInRock: IsInRock;
  /** The uniforms every shader shares. */
  uniforms: Record<string, IUniform>;
  instanceCells: InstanceCells;
}

export interface Reef {
  /** How high the coral heads stand, for the water's shader and the sand's. */
  map: DataTexture;
  /** The coral heads, which the reef fish school round. */
  heads: readonly CoralHead[];
}

// How far a head, and anything else, can reach from its own middle.
const HEAD_REACH = 8;
const CORAL_REACH = 2.5;
const CELL_SIZE = 32;

export function createReef(dependencies: ReefDependencies): Reef {
  const { randomStream, groundHeight, landmarks, isInRock, uniforms, instanceCells } = dependencies;
  const coralMaterial = createCoralMaterial(
    uniforms,
    createCoralSurfacePicture(randomStream('coral surface')),
  );

  const shapes = createCoralShapes(randomStream('coral shapes'));
  const layout = layOutReef({
    random: randomStream(`reef layout ${reefConfig.layoutRoll}`),
    randomRoundAtoll: randomStream('reef round the atoll'),
    groundHeight,
    isInRock,
    landmarks,
    zones: dependencies.island,
  });
  const map = createReefMap(layout.heads);
  const randomOffHome = randomStream('coral turns and tints');
  const randomRoundAtoll = randomStream('turns and tints round the atoll');

  const { outOfWater } = reefConfig;
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

      const mesh = new InstancedMesh(shapes[kind].shapes[model], coralMaterial, corals.length);
      corals.forEach((coral, index) => {
        // (The reef off home keeps the stream it always had, in the order it always had: the
        // corals round the rest of the atoll change no turn or tint of it.)
        const random = index < layout.offHome[kind][model] ? randomOffHome : randomRoundAtoll;
        // It leans outward with the slope of the head it grows on, then turns about its own stem.
        leanAxis.set(Math.sin(coral.bearing), 0, -Math.cos(coral.bearing));
        lean.setFromAxisAngle(leanAxis, -coral.tilt);
        turn.setFromAxisAngle(up, isHead ? coral.bearing : random() * FULL_TURN);
        lean.multiply(turn);
        const stretch = isHead ? 1 : 0.85 + random() * 0.3;
        scale.set(coral.size, coral.size * coral.squash * stretch, coral.size);
        matrix.compose(position.set(coral.x, coral.y, coral.z), lean, scale);
        mesh.setMatrixAt(index, matrix);

        // The sea's dimming with depth is done in the shader, as for the sand. The tints are what
        // photographs taken under water measure, and the water between a coral and the eye now
        // takes red of its own (through-water.glsl): `outOfWater` gives them back what a few
        // metres of water take, so that from a few metres they are the photographs' colours again.
        const tint = config.tints[Math.floor(random() * config.tints.length)];
        const brightness = 0.85 + random() * 0.25;
        colour.setRGB(
          tint[0] * brightness * outOfWater[0],
          tint[1] * brightness * outOfWater[1],
          tint[2] * brightness * outOfWater[2],
        );
        mesh.setColorAt(index, colour);
      });
      instanceCells.split(mesh, {
        kind: 'coral',
        reach: isHead ? HEAD_REACH : CORAL_REACH,
        shownWithin: isHead ? reefConfig.headsShownWithin : reefConfig.coralsShownWithin,
        simpler:
          fromAfar === undefined || !('simplerBeyond' in config)
            ? null
            : { shape: fromAfar, beyond: config.simplerBeyond, cellSize: CELL_SIZE },
      });
    });
  }

  return { map, heads: layout.heads };
}
