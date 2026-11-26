import {
  CircleGeometry,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MultiplyBlending,
  Quaternion,
  Vector3,
  type Scene,
} from 'three';
import type { WaveModel } from '../sea/wave-model';
import type { GroundHeight } from '../world/landmarks';
import type { Player } from './player';
import { playerConfig } from './player-config';

export interface FootprintsDependencies {
  scene: Scene;
  groundHeight: GroundHeight;
  waves: WaveModel;
  player: Pick<Player, 'position' | 'groundHeight' | 'isIntroRunning' | 'isFlying'>;
}

export interface Footprints {
  update(time: number): void;
}

const config = playerConfig.footprints;
const [lowestDryGround, highestDryGround] = config.dryGround;
// The height kept for a place with no print in it: above dry sand, where no swash reaches.
const NO_PRINT = 99;

function footprintShape(): CircleGeometry {
  const shape = new CircleGeometry(config.halfWidth, 10);
  shape.rotateX(-Math.PI / 2);
  shape.scale(1, 1, config.lengthToWidth);
  return shape;
}

/** Prints in dry sand, a stride apart, left and right; the swash washes them away. */
export function createFootprints(dependencies: FootprintsDependencies): Footprints {
  const { scene, groundHeight, waves, player } = dependencies;
  const { position } = player;
  // The newest print takes the place of the oldest.
  const placesXZ = new Float32Array(config.count * 2);
  const heights = new Float32Array(config.count);
  let newest = 0;
  const lastStride = { x: position.x, z: position.z };
  let side = 1;

  const matrix = new Matrix4();
  const facing = new Quaternion();
  const heading = new Euler();
  const unscaled = new Vector3(1, 1, 1);
  const printAt = new Vector3();
  const hidden = new Matrix4().makeScale(0, 0, 0);
  const shape = footprintShape();
  // A print is a hollow in the sand: it darkens what is drawn under it, in whatever light that
  // lies in. (Painted over the sand in a colour of its own, it was a pale disc by night.)
  const material = new MeshBasicMaterial({
    color: config.shade,
    blending: MultiplyBlending,
    transparent: true,
    depthWrite: false,
    // The sand under it has taken the air's haze already; and a print is no part of the picture
    // of what is under the sea (under-water-picture.ts).
    fog: false,
    // Drawn on the sand they lie in, never behind it.
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new InstancedMesh(shape, material, config.count);
  for (let i = 0; i < config.count; i++) {
    mesh.setMatrixAt(i, hidden);
    heights[i] = NO_PRINT;
  }
  // They lie wherever the player has walked, not where the one shape's bounds say.
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  scene.add(mesh);

  function leavePrint(stepX: number, stepZ: number, stepLength: number): void {
    side = -side;
    const alongX = stepX / stepLength;
    const alongZ = stepZ / stepLength;
    printAt.set(
      position.x + alongZ * config.footFromMiddle * side,
      0,
      position.z - alongX * config.footFromMiddle * side,
    );
    printAt.y = groundHeight(printAt.x, printAt.z) + config.aboveGround;
    heading.set(0, Math.atan2(alongX, alongZ), 0);
    facing.setFromEuler(heading);
    matrix.compose(printAt, facing, unscaled);
    mesh.setMatrixAt(newest, matrix);
    heights[newest] = printAt.y;
    placesXZ[newest * 2] = printAt.x;
    placesXZ[newest * 2 + 1] = printAt.z;
    newest = (newest + 1) % config.count;
    mesh.instanceMatrix.needsUpdate = true;
  }

  function isSwashOver(x: number, z: number, time: number): boolean {
    waves.heightAt(x, z, time);
    return waves.spot.runUp > waves.spot.groundHeight + config.washedAwayBy;
  }

  function isWashedAway(i: number, time: number): boolean {
    return heights[i] < highestDryGround && isSwashOver(placesXZ[i * 2], placesXZ[i * 2 + 1], time);
  }

  return {
    update(time) {
      const stepX = position.x - lastStride.x;
      const stepZ = position.z - lastStride.z;
      const stepLength = Math.hypot(stepX, stepZ);
      if (stepLength > config.stride) {
        lastStride.x = position.x;
        lastStride.z = position.z;
        const ground = groundHeight(position.x, position.z);
        const isDrySand = ground > lowestDryGround && ground < highestDryGround;
        // Not where the player stands on something built over the ground.
        const isStandingOnIt = player.groundHeight === ground;
        if (!player.isIntroRunning && !player.isFlying && isDrySand && isStandingOnIt) {
          leavePrint(stepX, stepZ, stepLength);
        }
      }

      for (let i = 0; i < config.count; i++) {
        if (!isWashedAway(i, time)) continue;

        heights[i] = NO_PRINT;
        mesh.setMatrixAt(i, hidden);
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
