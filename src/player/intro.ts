import { PerspectiveCamera, Quaternion, Vector3, type Camera } from 'three';
import type { Point } from '../world/landmarks';
import { playerConfig } from './player-config';

export interface Intro {
  readonly isRunning: boolean;
  /** Any press hurries it on. */
  hurry(): void;
  /** For tests: the next update ends it. */
  end(): void;
  /** Carries the camera from high over the sea towards where the player's eye has put it. */
  update(dt: number): void;
}

const config = playerConfig.intro;

/** 0 to 1, starting and ending at rest with no jolt. */
function eased(share: number): number {
  return share * share * share * (share * (share * 6 - 15) + 10);
}

function facingFrom(position: Vector3): Quaternion {
  // A camera, because only a camera's lookAt turns it the way a camera looks (along -z).
  const looking = new PerspectiveCamera();
  looking.position.copy(position);
  const [x, y, z] = config.lookingAt;
  looking.lookAt(x, y, z);
  return looking.quaternion.clone();
}

/**
 * The opening fly-in, from high over the sea down to the player's eye. The page hides its
 * controls while the body has the class 'intro'.
 */
export function createIntro(camera: Camera, player: Point, title: HTMLElement): Intro {
  const from = new Vector3(
    player.x - config.fromWest,
    config.fromHeight,
    player.z + config.fromSouth,
  );
  const fromFacing = facingFrom(from);
  const eye = new Vector3();
  const eyeFacing = new Quaternion();
  let secondsGone = 0;
  let pace = 1;
  let isRunning = true;
  document.body.classList.add('intro');

  return {
    get isRunning() {
      return isRunning;
    },

    hurry() {
      if (isRunning) pace = config.hurriedPace;
    },

    end() {
      secondsGone = config.seconds;
    },

    update(dt) {
      if (!isRunning) return;

      secondsGone += dt * pace;
      const share = eased(Math.min(1, secondsGone / config.seconds));
      eyeFacing.copy(camera.quaternion);
      eye.copy(camera.position);
      camera.position.lerpVectors(from, eye, share);
      camera.position.y += Math.sin(share * Math.PI) * config.lift;
      camera.quaternion.copy(fromFacing).slerp(eyeFacing, share);
      if (share > config.titleFadesAt) title.style.opacity = '0';
      if (share >= 1) {
        isRunning = false;
        document.body.classList.remove('intro');
      }
    },
  };
}
