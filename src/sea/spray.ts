import { Vector3, type PerspectiveCamera, type Scene } from 'three';
import type { Random } from '../core/random';
import { seaConfig } from './sea-config';
import { createSprayBursts, type BreakingSpot } from './spray-bursts';
import { sprayConfig } from './spray-config';
import { createSprayDroplets } from './spray-droplets';
import type { WaveModel } from './wave-model';

// Spray thrown up where waves break on the reef and where water hits rocks and posts standing in
// the surf. Each frame the wave model is sampled along the reef near the camera, and spray is
// thrown where a lip lands, where a lip is falling and from bores; then every droplet in the air
// moves on.

/** A rock or post standing in the surf. */
export interface SurfObstacle {
  x: number;
  z: number;
  radius: number;
  /** The ground's height at its foot. */
  groundHeight: number;
}

export interface SprayDependencies {
  scene: Scene;
  camera: PerspectiveCamera;
  /** The stream the spray draws from as it runs. */
  random: Random;
  waves: WaveModel;
  /** The distance from the atoll's centre to the outer shoreline, in a direction. */
  islandRadius: (direction: number) => number;
  /** Biggest first. Each draws from `random` in turn, so their order decides where spray flies. */
  obstacles: readonly SurfObstacle[];
  /** Told how much surf is breaking near the camera, 0 to 1, each frame it is near the shore. */
  hearSurf: (breaking: number) => void;
}

export interface SprayFrame {
  /** The clock the waves run by: stopped when a test stops the waves, so spray follows them. */
  time: number;
  dt: number;
  /** 0 at night to 1 in full day. */
  daylight: number;
  /** 0 by day to 1 at night. */
  night: number;
  isCameraUnderWater: boolean;
  pixelRatio: number;
  /** The view's height in CSS pixels. */
  viewHeight: number;
}

export interface Spray {
  update(frame: SprayFrame): void;
}

const config = sprayConfig;
// A frame of no time would have the water rising infinitely fast.
const SHORTEST_FRAME = 0.008;

export function createSpray(dependencies: SprayDependencies): Spray {
  const { scene, camera, random, waves, islandRadius, obstacles, hearSurf } = dependencies;
  const facing = new Vector3();
  const droplets = createSprayDroplets(scene);
  const bursts = createSprayBursts(random, droplets);
  const spot: BreakingSpot = { x: 0, z: 0, surface: 0, inwardX: 0, inwardZ: 0, breakerHeight: 0 };
  const surfaceBefore = obstacles.map(() => 0);
  let surfBreaking = 0;

  /** Throws spray where waves break on the reef near the camera; returns how much is breaking. */
  function throwFromTheReef(
    time: number,
    dt: number,
    cameraDirection: number,
    lookDirection: number,
  ): number {
    const { landingLip, fallingLip, bore } = config;
    const frameShare = Math.min(1, dt * config.chanceFrameRate);
    let breaking = 0;
    for (let i = 0; i < config.spotsSampled; i++) {
      const isBesideCamera = i % 2 === 1;
      const direction =
        (isBesideCamera ? cameraDirection : lookDirection) +
        (random() - 0.5) * (isBesideCamera ? config.spreadBeside : config.spreadAhead);
      const outsideShore =
        seaConfig.reefBreak - config.insideBreakLine + random() * config.breakingWidth;
      const radius = islandRadius(direction) + outsideShore;
      spot.x = Math.cos(direction) * radius;
      spot.z = Math.sin(direction) * radius;
      spot.surface = waves.heightAt(spot.x, spot.z, time);
      spot.inwardX = -Math.cos(direction);
      spot.inwardZ = -Math.sin(direction);
      const wave = waves.spot;
      spot.breakerHeight = wave.breakerHeight;
      breaking += wave.landingLip * config.surfSound.landingLipWeight + wave.bore;

      if (
        wave.landingLip > landingLip.throwsAbove &&
        random() < wave.landingLip * landingLip.chance * frameShare
      ) {
        bursts.fromLandingLip(spot);
      } else if (
        wave.fallingLip > fallingLip.throwsAbove &&
        random() < wave.fallingLip * fallingLip.chance * frameShare
      ) {
        bursts.fromFallingLip(spot);
      } else if (wave.bore > bore.throwsAbove && random() < wave.bore * bore.chance * frameShare) {
        bursts.fromBore(spot);
      }
    }
    return breaking;
  }

  // Water hits a rock or post hard as it rises fast round it, as a bore runs into it, and as a
  // lip lands on it.
  function throwFromObstacles(time: number, dt: number): void {
    const hitting = config.obstacles;
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      const surface = waves.heightAt(obstacle.x, obstacle.z, time);
      const rising = (surface - surfaceBefore[i]) / Math.max(dt, SHORTEST_FRAME);
      surfaceBefore[i] = surface;
      if (surface > obstacle.groundHeight + hitting.wetAbove) {
        const wave = waves.spot;
        const force =
          Math.max(0, rising - hitting.risingFasterThan) * hitting.fromRising +
          wave.bore * hitting.fromBore +
          wave.landingLip;
        if (force > hitting.throwsAbove && random() < force * dt * hitting.chancePerSecond) {
          bursts.fromObstacle(obstacle, surface, force);
        }
      }
    }
  }

  return {
    update(frame) {
      const { time, dt } = frame;
      const cameraX = camera.position.x;
      const cameraZ = camera.position.z;
      const cameraDistance = Math.hypot(cameraX, cameraZ);
      const cameraDirection = Math.atan2(cameraZ, cameraX);
      // Breaking water is looked for round the stretch of reef the camera faces, not only
      // beside it.
      camera.getWorldDirection(facing);
      const lookDirection = Math.atan2(
        cameraZ + facing.z * config.lookAhead,
        cameraX + facing.x * config.lookAhead,
      );
      const fromShore = Math.abs(cameraDistance - islandRadius(cameraDirection));

      if (fromShore < config.nearShoreline && !frame.isCameraUnderWater) {
        const breaking = throwFromTheReef(time, dt, cameraDirection, lookDirection);
        surfBreaking +=
          (Math.min(1, breaking / config.surfSound.loudestAt) - surfBreaking) *
          Math.min(1, dt * config.surfSound.easing);
        hearSurf(surfBreaking);
        throwFromObstacles(time, dt);
      }

      droplets.move(dt);
      const focalLength =
        (frame.pixelRatio * frame.viewHeight * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
      droplets.show(focalLength, frame.daylight, frame.night);
    },
  };
}
