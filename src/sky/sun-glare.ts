import { Vector3, type Camera } from 'three';
import { skyConfig } from './sky-config';

export interface SunGlareFrame {
  /** The unit vector towards the sun. */
  sunDirection: Vector3;
  sunElevation: number;
  /** 0 by day to 1 at night. */
  night: number;
  /** How much of the sun gets through the clouds to the camera, 0 to 1. */
  sunThrough: number;
  isUnderWater: boolean;
  /** The size of the view in CSS pixels. */
  viewWidth: number;
  viewHeight: number;
}

export interface SunGlare {
  update(frame: SunGlareFrame): void;
}

const config = skyConfig.glare;
// The sun may be this far outside the view (the view's edge is 1) and still throw glare into it.
const REACH_PAST_THE_EDGE = 1.4;

/** A soft glow laid over the picture where the sun is: `element` is moved onto it each frame. */
export function createSunGlare(element: HTMLElement, camera: Camera): SunGlare {
  const sunOnScreen = new Vector3();
  const facing = new Vector3();

  return {
    update(frame) {
      const { sunDirection, sunElevation } = frame;
      const sunShows = (1 - frame.night) * (config.leftByCloud + 0.85 * frame.sunThrough);
      sunOnScreen.copy(sunDirection).multiplyScalar(1000).add(camera.position).project(camera);
      camera.getWorldDirection(facing);
      const towardsSun = facing.dot(sunDirection);

      let strength = 0;
      const isInReach =
        Math.abs(sunOnScreen.x) < REACH_PAST_THE_EDGE &&
        Math.abs(sunOnScreen.y) < REACH_PAST_THE_EDGE;
      if (towardsSun > 0 && isInReach) {
        // It fades out as the sun goes down behind the horizon.
        const aboveHorizon = Math.max(0, Math.min(1, sunElevation * 8 + 0.6));
        strength =
          Math.pow(towardsSun, config.tightness) * sunShows * aboveHorizon * config.strongest;
        const x = ((sunOnScreen.x * 0.5 + 0.5) * frame.viewWidth).toFixed(1);
        const y = ((-sunOnScreen.y * 0.5 + 0.5) * frame.viewHeight).toFixed(1);
        element.style.transform = `translate3d(${x}px,${y}px,0)`;
      }
      if (frame.isUnderWater) strength = 0;
      element.style.opacity = strength.toFixed(3);
    },
  };
}
