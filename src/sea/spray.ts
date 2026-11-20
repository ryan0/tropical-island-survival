import { Vector3, type PerspectiveCamera, type Scene } from 'three';
import { pixelsPerMetreAtAMetre } from '../core/maths';
import type { Random } from '../core/random';
import {
  createBubblePlumes,
  type BreakingWaterBursts,
  type BubblePlumeUniforms,
} from './bubble-plumes';
import { seaConfig } from './sea-config';
import { createSprayBursts, type BreakingSpot } from './spray-bursts';
import { sprayConfig } from './spray-config';
import { createSprayDroplets } from './spray-droplets';
import type { WaveModel } from './wave-model';

// Spray thrown up where waves break on the reef and where water hits rocks and posts standing in
// the surf. Each frame the wave model is sampled over the reef near the camera, and along the main
// swell's crest there, and spray is thrown where a lip lands, where a lip is falling and from
// bores; then every droplet in the air moves on.

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
  /** A stream of its own for the spray along the crest, so that it moves none of the rest. */
  randomOnCrest: Random;
  /** A stream of its own for the bubbles breaking water drives under, seen from under water. */
  randomUnderWater: Random;
  /** Two of the uniforms every shader shares, for the bubbles. */
  uniforms: BubblePlumeUniforms;
  waves: WaveModel;
  /**
   * How far outside the line its waves break on the main swell's crest lies in a direction, at a
   * time on the waves' clock; undefined where there is none to find (crest-picture.ts).
   */
  crestOutsideLine: (direction: number, time: number) => number | undefined;
  /** The distance from the atoll's centre to the outer shoreline, in a direction. */
  islandRadius: (direction: number) => number;
  /** How far off the beach, in a direction, a distance along the reef lies. */
  offshoreOfReef: (along: number, direction: number) => number;
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
  /** A debug switch: with the sea drained nothing is thrown. */
  isSeaDrained: boolean;
  pixelRatio: number;
  /** The view's height in CSS pixels. */
  viewHeight: number;
}

export interface Spray {
  update(frame: SprayFrame): void;
  /** A debug switch: whether spray is thrown along the crest too, to see what it costs. */
  throwFromCrest: (isThrown: boolean) => void;
  readonly isThrownFromCrest: boolean;
}

const config = sprayConfig;
// A frame of no time would have the water rising infinitely fast.
const SHORTEST_FRAME = 0.008;

export function createSpray(dependencies: SprayDependencies): Spray {
  const { scene, camera, random, waves, islandRadius, offshoreOfReef, obstacles, hearSurf } =
    dependencies;
  const { randomOnCrest, crestOutsideLine, randomUnderWater, uniforms } = dependencies;
  const facing = new Vector3();
  const droplets = createSprayDroplets(scene);
  const bursts = createSprayBursts(random, droplets);
  const burstsOnCrest = createSprayBursts(randomOnCrest, droplets);
  const plumes = createBubblePlumes({ scene, uniforms, random: randomUnderWater, waves });
  const spot: BreakingSpot = { x: 0, z: 0, surface: 0, inwardX: 0, inwardZ: 0, breakerHeight: 0 };
  const surfaceBefore = obstacles.map(() => 0);
  let surfBreaking = 0;
  let isThrownFromCrest = true;

  /**
   * Asks the wave model about the spot so far from the atoll's centre in a direction: what it
   * finds goes into `spot` and `waves.spot`.
   */
  function lookAtSpot(direction: number, fromCentre: number, time: number): void {
    spot.x = Math.cos(direction) * fromCentre;
    spot.z = Math.sin(direction) * fromCentre;
    spot.surface = waves.heightAt(spot.x, spot.z, time);
    spot.inwardX = -Math.cos(direction);
    spot.inwardZ = -Math.sin(direction);
    spot.breakerHeight = waves.spot.breakerHeight;
  }

  /**
   * Throws spray along the main swell's crest near the camera, where its lip is falling and
   * where it has landed.
   */
  function throwFromTheCrest(
    time: number,
    dt: number,
    cameraDirection: number,
    lookDirection: number,
    into: BreakingWaterBursts,
  ): void {
    const { onCrest, landingLip, fallingLip } = config;
    const [behind, ahead] = onCrest.aheadOfCrest;
    const frameShare = Math.min(1, dt * config.chanceFrameRate);
    for (let i = 0; i < onCrest.spotsSampled; i++) {
      const isBesideCamera = i % 2 === 1;
      const direction =
        (isBesideCamera ? cameraDirection : lookDirection) +
        (randomOnCrest() - 0.5) * (isBesideCamera ? config.spreadBeside : config.spreadAhead);
      const aheadOfCrest = behind + randomOnCrest() * (ahead - behind);
      const outsideLine = crestOutsideLine(direction, time);
      if (outsideLine === undefined) continue;
      const breakLine = islandRadius(direction) + offshoreOfReef(seaConfig.reefBreak, direction);
      lookAtSpot(direction, breakLine + outsideLine - aheadOfCrest, time);
      const wave = waves.spot;
      if (
        wave.landingLip > landingLip.throwsAbove &&
        randomOnCrest() < wave.landingLip * onCrest.landingChance * frameShare
      ) {
        into.fromBurstingCrest(spot);
      } else if (
        wave.fallingLip > fallingLip.throwsAbove &&
        randomOnCrest() < wave.fallingLip * onCrest.fallingChance * frameShare
      ) {
        into.fromFallingLip(spot);
      }
    }
  }

  /** Throws spray where waves break on the reef near the camera; returns how much is breaking. */
  function throwFromTheReef(
    time: number,
    dt: number,
    cameraDirection: number,
    lookDirection: number,
    into: BreakingWaterBursts,
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
      lookAtSpot(
        direction,
        islandRadius(direction) + offshoreOfReef(outsideShore, direction),
        time,
      );
      const wave = waves.spot;
      breaking += wave.landingLip * config.surfSound.landingLipWeight + wave.bore;

      if (
        wave.landingLip > landingLip.throwsAbove &&
        random() < wave.landingLip * landingLip.chance * frameShare
      ) {
        into.fromLandingLip(spot);
      } else if (
        wave.fallingLip > fallingLip.throwsAbove &&
        random() < wave.fallingLip * fallingLip.chance * frameShare
      ) {
        into.fromFallingLip(spot);
      } else if (wave.bore > bore.throwsAbove && random() < wave.bore * bore.chance * frameShare) {
        into.fromBore(spot);
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

      const isSeaThere = !frame.isCameraUnderWater && !frame.isSeaDrained;
      if (fromShore < config.nearShoreline && isSeaThere) {
        const breaking = throwFromTheReef(time, dt, cameraDirection, lookDirection, bursts);
        if (isThrownFromCrest) {
          throwFromTheCrest(time, dt, cameraDirection, lookDirection, burstsOnCrest);
        }
        surfBreaking +=
          (Math.min(1, breaking / config.surfSound.loudestAt) - surfBreaking) *
          Math.min(1, dt * config.surfSound.easing);
        hearSurf(surfBreaking);
        throwFromObstacles(time, dt);
      }
      // Under the water, breaking water drives bubbles down where above it it would throw spray.
      const isUnderTheSea = frame.isCameraUnderWater && !frame.isSeaDrained;
      if (fromShore < config.nearShoreline && isUnderTheSea) {
        throwFromTheReef(time, dt, cameraDirection, lookDirection, plumes);
        if (isThrownFromCrest) throwFromTheCrest(time, dt, cameraDirection, lookDirection, plumes);
      }

      droplets.move(dt);
      plumes.move(dt, time);
      const focalLength = pixelsPerMetreAtAMetre(camera.fov, frame.pixelRatio * frame.viewHeight);
      droplets.show(focalLength, frame.daylight, frame.night);
      plumes.show(focalLength, frame.daylight, frame.night);
    },

    throwFromCrest(isThrown) {
      isThrownFromCrest = isThrown;
    },
    get isThrownFromCrest() {
      return isThrownFromCrest;
    },
  };
}
