import { Color, Vector3, type IUniform, type Texture } from 'three';
import type { CloudUniforms } from '../sky/clouds';
import type { SkyLightUniforms } from '../sky/sky-light';

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
    uLevel: { value: number };
    /** 1 when the camera is under water, and the water's own colour there. */
    uUnder: { value: number };
    uFogC: { value: Color };
    /** 1 while the lagoon's shore-wave band is shown. */
    uBandOn: { value: number };
    /** A debug switch: 0 normal, 1 waves off, 2 no falling lip, 3 plain water colour. */
    uDbg: { value: number };
    /** The detail texture. */
    uDet: { value: Texture };
    /** The map of how high the coral heads stand, once the reef is built. */
    uReef: { value: Texture | null };
    /** The camera's position, for materials three.js does not give it to. */
    uCam: { value: Vector3 };
    /** The 16 biggest things standing in the surf: x, z, radius. The water draws foam round them. */
    uObs: { value: Vector3[] };
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
    uLevel: { value: 0 },
    uUnder: { value: 0 },
    uBandOn: { value: 0 },
    uDbg: { value: 0 },
    uFogC: { value: new Color() },
    uDet: { value: detailTexture },
    uReef: { value: null },
    uCam: { value: new Vector3() },
    uObs: { value: noObstacles },
    ...skyLight,
    ...clouds,
  };
}
