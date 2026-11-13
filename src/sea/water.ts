import {
  Frustum,
  Matrix4,
  Mesh,
  PlaneGeometry,
  type Group,
  type PerspectiveCamera,
  type Scene,
  type ShaderMaterial,
} from 'three';
import type { IslandShape } from '../world/island-shape';
import type { Point } from '../world/landmarks';
import { createLagoonShoreBand } from './lagoon-shore-band';
import { seaConfig } from './sea-config';
import { waterConfig } from './water-config';
import type { WaterSheet } from './water-materials';
import { createWaveMesh } from './wave-mesh';

export interface WaterDependencies {
  scene: Scene;
  camera: PerspectiveCamera;
  island: IslandShape;
  /** The middle of the sandbank in the lagoon, which the lagoon shore band also goes round. */
  sandbank: Point;
  /** Makes the material of each sheet of water; each is made once, as the sheet is built. */
  createMaterial: (sheet: WaterSheet) => ShaderMaterial;
}

export interface WaterFrame {
  /** Where the player is: the far sea follows. */
  player: Point;
  /** The wind's strength, 0 to 1. */
  wind: number;
  isCameraUnderWater: boolean;
}

export interface Water {
  farSea: Mesh;
  /** Every sector of the wave mesh. */
  waveMesh: Group;
  waveMaterial: ShaderMaterial;
  bandPieces: Mesh[];
  /** The sizes of the wave mesh and the lagoon shore band, for the debug panel. */
  waveMeshDescription: string;
  bandDescription: string;
  /** Whether the lagoon shore band is shown, as of the last update (the water's shader asks). */
  readonly isBandShown: boolean;
  update(frame: WaterFrame): void;
}

/**
 * One big flat sheet out to the horizon. The shader cuts a ring-shaped hole in it where the wave
 * mesh is, so the same sheet is also the calm water of the lagoon.
 */
function createFarSea(createMaterial: WaterDependencies['createMaterial']): Mesh {
  const size = waterConfig.farSeaSize;
  const farSea = new Mesh(
    new PlaneGeometry(size, size, 1, 1).rotateX(-Math.PI / 2),
    createMaterial('far sea'),
  );
  // It is always in view.
  farSea.frustumCulled = false;
  // With the wave mesh: before the lagoon shore band, the bubbles and the spray.
  farSea.renderOrder = 5;
  return farSea;
}

/**
 * The surface of the sea: the far sea, the wave mesh round the atoll and the band along the
 * lagoon's shore. Each frame the far sea follows the player, and only the pieces of the others
 * that are in view are drawn, each wave-mesh sector at the level of detail its distance suits.
 */
export function createWater(dependencies: WaterDependencies): Water {
  const { scene, camera, island, sandbank, createMaterial } = dependencies;
  const farSea = createFarSea(createMaterial);
  scene.add(farSea);
  const waveMesh = createWaveMesh({ scene, island, createMaterial });
  const band = createLagoonShoreBand({ scene, island, sandbank, createMaterial });
  const view = new Frustum();
  const viewProjection = new Matrix4();
  let isBandShown = false;

  return {
    farSea,
    waveMesh: waveMesh.group,
    waveMaterial: waveMesh.material,
    bandPieces: band.pieces,
    waveMeshDescription: waveMesh.description,
    bandDescription: band.description,

    get isBandShown() {
      return isBandShown;
    },

    update({ player, wind, isCameraUnderWater }) {
      farSea.position.set(player.x, seaConfig.level, player.z);
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      view.setFromProjectionMatrix(viewProjection);
      waveMesh.showSectorsInView(view, camera.position);

      // The band only in a high wind, and not while the eye is under water.
      isBandShown = wind > waterConfig.lagoonShoreBand.shownAboveWind && !isCameraUnderWater;
      if (isBandShown) band.showPiecesInView(view, camera.position);
      else band.hide();
    },
  };
}
