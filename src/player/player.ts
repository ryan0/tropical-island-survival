import type { PerspectiveCamera } from 'three';
import type { WaveModel } from '../sea/wave-model';
import { createCaptions } from '../ui/captions';
import { createJoystick } from '../ui/joystick';
import type { IslandShape } from '../world/island-shape';
import type { Landmarks, Point } from '../world/landmarks';
import { createIntro } from './intro';
import { createLookAndKeys } from './look-and-keys';
import { createPlaceNames } from './place-names';
import { playerConfig } from './player-config';

export interface PlayerDependencies {
  /** The scene's camera, turned in the order yaw, pitch, roll ('YXZ'). */
  camera: PerspectiveCamera;
  /** The picture, which is dragged to look round. */
  canvas: HTMLCanvasElement;
  elements: {
    title: HTMLElement;
    /** Says how to walk and look, until the stick is first used. */
    hint: HTMLElement;
    joystickPad: HTMLElement;
    joystickKnob: HTMLElement;
    caption: HTMLElement;
  };
  island: IslandShape;
  /** The sandbank in the lagoon. */
  sandbank: Point;
  landmarks: Landmarks;
  /** Whether the camp is there: its fire and shelter are named places. */
  hasCamp: boolean;
  waves: WaveModel;
}

export interface PlayerFrame {
  /** Seconds since the scene started, and the frame's step. */
  time: number;
  dt: number;
  /** For tests: a pose the camera takes whatever the player does: x, y, z, yaw, pitch. */
  cameraOverride: readonly [number, number, number, number, number] | undefined;
}

export interface Player {
  /** Where the eye is. The same object throughout: others keep hold of it. */
  readonly position: { x: number; y: number; z: number };
  /** The height of the ground under the player, as of the last update. */
  readonly groundHeight: number;
  readonly isIntroRunning: boolean;
  /**
   * Flying: the stick moves the eye the way it looks, over land and sea alike, and nothing holds
   * it to the ground. For looking at the scene from anywhere; the debug panel switches it. When
   * it is switched off the player comes down where the eye was.
   */
  readonly isFlying: boolean;
  setFlying(isFlying: boolean): void;
  /** Walking, swimming and diving, or flying; the opening fly-in; and the camera. */
  update(frame: PlayerFrame): void;
  /** Shows a place's name as the player comes into it. Called later in the frame than `update`. */
  updatePlaceNames(dt: number): void;
  /** For tests: puts the player somewhere, facing a direction. */
  place(x: number, z: number, yaw: number, pitch: number): void;
  /** For tests: ends the fly-in at once. */
  endIntro(): void;
}

const { start, walking, wading, swimming, flying } = playerConfig;

function speedOver(ground: number): number {
  if (ground < swimming.below) return swimming.speed;
  if (ground < wading.below) return wading.speed;
  return walking.speed;
}

export function createPlayer(dependencies: PlayerDependencies): Player {
  const { camera, canvas, elements, island, sandbank, landmarks, hasCamp, waves } = dependencies;
  const position: Player['position'] = {
    x: start.x,
    y: start.eyeHeight,
    z: landmarks.shoreZ(start.x, start.beachHeight) - start.inlandOfBeach,
  };
  const captions = createCaptions(elements.caption);
  const intro = createIntro(camera, position, elements.title);
  const hurryIntro = () => {
    intro.hurry();
  };

  let isHintShown = true;
  const stick = createJoystick(elements.joystickPad, elements.joystickKnob, () => {
    hurryIntro();
    if (!isHintShown) return;

    isHintShown = false;
    elements.hint.style.opacity = '0';
  });
  const controls = createLookAndKeys(canvas, hurryIntro);
  const placeNames = createPlaceNames({ captions, island, sandbank, landmarks, hasCamp, intro });

  let groundHeight = 0;
  let isFlying = false;
  let stepPhase = 0;
  let swimmingEyeHeight: number = swimming.surfaceEyeHeight;
  let isSwimmingHintShown = false;

  function move(
    forward: number,
    sideways: number,
    speed: number,
    dt: number,
    farthest: number,
  ): void {
    const { yaw } = controls;
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    position.x += (forwardX * forward + rightX * sideways) * speed * dt;
    position.z += (forwardZ * forward + rightZ * sideways) * speed * dt;

    const fromCentre = Math.hypot(position.x, position.z);
    if (fromCentre > farthest) {
      position.x *= farthest / fromCentre;
      position.z *= farthest / fromCentre;
    }
  }

  /** The stick moves the eye the way it looks, faster the higher it is. */
  function fly(forward: number, sideways: number, dt: number): void {
    const aboveSurface = Math.max(0, position.y - Math.max(groundHeight, 0));
    const speed = flying.speed + flying.speedPerMetreOfHeight * aboveSurface;
    move(forward * Math.cos(controls.pitch), sideways, speed, dt, flying.farthestFromCentre);
    groundHeight = island.groundHeight(position.x, position.z);
    const climbed = position.y + Math.sin(controls.pitch) * forward * speed * dt;
    position.y = Math.max(
      groundHeight + flying.lowestAboveGround,
      Math.min(flying.highest, climbed),
    );
  }

  /** Pushing forward while looking down dives; looking up comes back up. */
  function swimmingEye(time: number, dt: number, forward: number, speed: number): number {
    const dived = swimmingEyeHeight + Math.sin(controls.pitch) * forward * speed * dt;
    swimmingEyeHeight = Math.max(
      groundHeight + swimming.aboveSeaFloor,
      Math.min(swimming.surfaceEyeHeight, dived),
    );
    const surface =
      swimmingEyeHeight > swimming.ridesWavesAbove
        ? waves.heightAt(position.x, position.z, time)
        : 0;
    const float = swimmingEyeHeight > swimming.floatsAbove ? swimming.float : swimming.floatDived;
    return swimmingEyeHeight + surface + Math.sin(time * swimming.floatRate) * float;
  }

  function walkOrSwim(time: number, dt: number, forward: number, sideways: number): void {
    const groundBefore = island.groundHeight(position.x, position.z);
    const isSwimming = groundBefore < swimming.below;
    const speed = speedOver(groundBefore);
    move(forward, sideways, speed, dt, playerConfig.farthestFromCentre);
    const effort = Math.min(1, Math.hypot(forward, sideways));
    stepPhase += dt * effort * (isSwimming ? swimming.strokeRate : walking.stepRate);

    groundHeight = island.groundHeight(position.x, position.z);
    let eyeHeight: number;
    if (groundHeight > swimming.below) {
      // The next swim starts at the surface.
      swimmingEyeHeight = swimming.surfaceEyeHeight;
      eyeHeight = groundHeight + walking.eyeHeight + Math.sin(stepPhase) * walking.bob * effort;
    } else {
      eyeHeight = swimmingEye(time, dt, forward, speed);
      showSwimmingHintOnce();
    }
    position.y += (eyeHeight - position.y) * Math.min(1, dt * playerConfig.eyeFollowRate);
  }

  function showSwimmingHintOnce(): void {
    if (isSwimmingHintShown || intro.isRunning) return;

    isSwimmingHintShown = true;
    captions.show(swimming.hint.title, swimming.hint.subtitle, swimming.hint.seconds);
  }

  return {
    position,
    get groundHeight() {
      return groundHeight;
    },
    get isIntroRunning() {
      return intro.isRunning;
    },
    get isFlying() {
      return isFlying;
    },

    setFlying(shouldFly) {
      isFlying = shouldFly;
      if (shouldFly) intro.end();
    },

    update({ time, dt, cameraOverride }) {
      let forward = controls.forward(-stick.y);
      let sideways = controls.sideways(stick.x);
      controls.turn(dt);
      if (intro.isRunning) {
        forward = 0;
        sideways = 0;
      }

      if (isFlying) fly(forward, sideways, dt);
      else walkOrSwim(time, dt, forward, sideways);

      camera.position.set(position.x, position.y, position.z);
      camera.rotation.set(controls.pitch, controls.yaw, 0);
      intro.update(dt);
      if (cameraOverride !== undefined) {
        camera.position.set(cameraOverride[0], cameraOverride[1], cameraOverride[2]);
        camera.rotation.set(cameraOverride[4], cameraOverride[3], 0);
      }
    },

    updatePlaceNames(dt) {
      if (!isFlying) placeNames.update(position.x, position.z, groundHeight);
      captions.update(dt);
    },

    place(x, z, yaw, pitch) {
      position.x = x;
      position.z = z;
      controls.face(yaw, pitch);
    },

    endIntro() {
      intro.end();
    },
  };
}
