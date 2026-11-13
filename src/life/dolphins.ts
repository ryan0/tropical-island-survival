import {
  ConeGeometry,
  DoubleSide,
  Mesh,
  MeshLambertMaterial,
  type BufferGeometry,
  type Scene,
} from 'three';
import { lifeConfig } from './life-config';
import { merged, placed, spindle, triangle } from './shapes';

export interface DolphinsDependencies {
  scene: Scene;
  /** Distance from the atoll's centre to the outer shoreline, in a direction. */
  islandRadius: (direction: number) => number;
}

export interface Dolphins {
  update(time: number, waterLevel: number): void;
}

interface Dolphin {
  mesh: Mesh;
  secondsBetweenLeaps: number;
  secondsLater: number;
}

const config = lifeConfig.dolphins;

// The nose points along +x.
function dolphinShape(): BufferGeometry {
  const body = spindle(2.2, 0.2, 0.25, 10, 8);
  const beak = placed(new ConeGeometry(0.05, 0.25, 6), [1.2, -0.03, 0], undefined, [
    0,
    0,
    -Math.PI / 2,
  ]);
  const backFin = placed(triangle([0.25, 0, 0], [-0.2, 0, 0], [-0.25, 0.4, 0]), [0, 0.22, 0]);
  const tail = placed(triangle([0, 0, 0], [-0.3, 0, 0.35], [-0.3, 0, -0.35]), [-1.15, 0, 0]);
  return merged([body, beak, backFin, tail]);
}

export function createDolphins({ scene, islandRadius }: DolphinsDependencies): Dolphins {
  const shape = dolphinShape();
  const material = new MeshLambertMaterial({ color: config.colour, side: DoubleSide });
  const dolphins: Dolphin[] = [];
  for (let i = 0; i < config.count; i++) {
    const mesh = new Mesh(shape, material);
    mesh.rotation.order = 'YZX';
    mesh.visible = false;
    // The one shape is drawn far from where it was made, so three.js would judge it out of view.
    mesh.frustumCulled = false;
    scene.add(mesh);
    dolphins.push({
      mesh,
      secondsBetweenLeaps: config.secondsBetweenLeaps + i * config.secondsMoreForEach,
      secondsLater: i * config.secondsLaterForEach,
    });
  }

  return {
    update(time, waterLevel) {
      for (let i = 0; i < dolphins.length; i++) {
        const { mesh, secondsBetweenLeaps, secondsLater } = dolphins[i];
        const itsTime = time + secondsLater;
        const leap = Math.floor(itsTime / secondsBetweenLeaps);
        const secondsIntoLeap = itsTime - leap * secondsBetweenLeaps;
        mesh.visible = secondsIntoLeap <= config.leapSeconds;
        if (!mesh.visible) continue;

        // Each leap is somewhere new in the deep water outside the reef, along the reef.
        const through = secondsIntoLeap / config.leapSeconds;
        const direction =
          config.direction +
          i * config.directionApart +
          config.directionSpread * Math.sin(leap * 2.3 + i);
        const distance =
          islandRadius(direction) +
          config.beyondTheShore +
          config.beyondTheShoreSpread * Math.cos(leap * 1.3 + i);
        const yaw = -direction - 1.5708 + 0.5 * Math.sin(leap * 1.7 + i * 2);
        const middleX = Math.cos(direction) * distance;
        const middleZ = Math.sin(direction) * distance;
        const along = (through - 0.5) * config.leapLength;

        // An arc: up from under the surface, over, and back in, nose following the curve.
        mesh.position.set(
          middleX + Math.cos(yaw) * along,
          waterLevel - config.startsBelowSurface + config.leapHeight * 4 * through * (1 - through),
          middleZ + -Math.sin(yaw) * along,
        );
        const slope = Math.atan2(4 * config.leapHeight * (1 - 2 * through), config.leapLength);
        mesh.rotation.set(0, yaw, slope);
      }
    },
  };
}
