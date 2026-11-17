import { Color, Vector3, type IUniform, type Texture } from 'three';
import type { CloudUniforms } from '../sky/clouds';
import type { SkyLightUniforms } from '../sky/sky-light';

/**
 * The value of `uDebugMode` that drains the sea: no water is drawn, nothing under it is tinted by
 * it, and the ground shows lines of equal depth. The shaders write it as 4.5 and above.
 */
export const SEA_DRAINED = 5;

/**
 * The one set of uniforms that every hand-written shader shares. The sky's light and the
 * clouds own theirs; the rest are these.
 */
export type SharedUniforms = Record<string, IUniform> &
  SkyLightUniforms &
  CloudUniforms & {
    /** Seconds on the clock the waves run by. */
    uTime: { value: number };
    /** Height of the still sea surface. */
    uSeaLevel: { value: number };
    /** 1 when the camera is under water, and the water's own colour there. */
    uUnderWater: { value: number };
    uUnderWaterColour: { value: Color };
    /** 1 while the lagoon's shore-wave band is shown. */
    uShoreBandShown: { value: number };
    /**
     * A debug switch: 0 normal, 1 waves off, 2 no falling lip, 3 plain water colour, 4 the sea
     * floor's pictures drawn on the water, 5 the sea drained (SEA_DRAINED), to see its floor.
     */
    uDebugMode: { value: number };
    /** The detail texture. */
    uDetail: { value: Texture };
    /** The map of how high the coral heads stand, once the reef is built. */
    uReefMap: { value: Texture | null };
    /** The sea floor as the waves know it, once it is made (sea/sea-floor-pictures.ts). */
    uSeaFloor: { value: Texture | null };
    uBreakTimes: { value: Texture | null };
    /** Where the main swell's crest lies, once it is made (sea/crest-picture.ts). */
    uCrests: { value: Texture | null };
    /** The camera's position, for materials three.js does not give it to. */
    uCameraPosition: { value: Vector3 };
    /** The 16 biggest things standing in the surf: x, z, radius. The water draws foam round them. */
    uSurfObstacles: { value: Vector3[] };
  };

const OBSTACLES_SENT_TO_THE_WATER = 16;

export function createSharedUniforms(
  detailTexture: Texture,
  skyLight: SkyLightUniforms,
  clouds: CloudUniforms,
): SharedUniforms {
  const noObstacles = Array.from(
    { length: OBSTACLES_SENT_TO_THE_WATER },
    () => new Vector3(0, 0, -1),
  );
  return {
    uTime: { value: 0 },
    uSeaLevel: { value: 0 },
    uUnderWater: { value: 0 },
    uShoreBandShown: { value: 0 },
    uDebugMode: { value: 0 },
    uUnderWaterColour: { value: new Color() },
    uDetail: { value: detailTexture },
    uReefMap: { value: null },
    uSeaFloor: { value: null },
    uBreakTimes: { value: null },
    uCrests: { value: null },
    uCameraPosition: { value: new Vector3() },
    uSurfObstacles: { value: noObstacles },
    ...skyLight,
    ...clouds,
  };
}
