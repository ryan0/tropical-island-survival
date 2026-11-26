import { Color, Vector2, Vector3, type IUniform, type Texture } from 'three';
import { waterConfig } from '../sea/water-config';
import type { CloudUniforms } from '../sky/clouds';
import type { SkyLightUniforms } from '../sky/sky-light';

/**
 * The value of `uDebugMode` that drains the sea: no water is drawn, nothing under it is tinted by
 * it, and the ground shows lines of equal depth. The shaders write it as 4.5 and above.
 */
export const SEA_DRAINED = 5;

/**
 * The share of the fine ripples' slope that bends what is under the water (`uFineRipplesBend`).
 * None, since 26 November 2026: Ryan found the water "a bit busy for eyes", and the fine ripples'
 * bending was the shiver in it. They smear what is under them instead (water.frag.glsl).
 */
const FINE_RIPPLES_BEND = 0;

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
    /** The caustics texture: the net of light on whatever lies under the water. */
    uCaustics: { value: Texture };
    /** The map of how high the coral heads stand, once the reef is built. */
    uReefMap: { value: Texture | null };
    /** The map of what stands over the ground, once the palms and plants are put (world/tree-cover-map.ts). */
    uTreeCover: { value: Texture | null };
    /** The sea floor as the waves know it, once it is made (sea/sea-floor-pictures.ts). */
    uSeaFloor: { value: Texture | null };
    uBreakTimes: { value: Texture | null };
    /** The ground's height as a picture, where the graphics card can draw one (sea/floor-height-picture.ts). */
    uFloorHeight: { value: Texture | null };
    /** The shore in each direction from the centre, once it is made (sea/shore-round-picture.ts). */
    uShoreRound: { value: Texture | null };
    /** Where the main swell's crest lies, once it is made (sea/crest-picture.ts). */
    uCrests: { value: Texture | null };
    /** The breaking front's cross-sections, once they are made (sea/breaker-shapes.ts). */
    uBreakerShapes: { value: Texture | null };
    /** The directions that mesh can follow a crest in: the middle of their arc, and half its width. */
    uBreakerArc: { value: Vector2 };
    /** The camera's position, for materials three.js does not give it to. */
    uCameraPosition: { value: Vector3 };
    /**
     * The scene under the sea as a picture, for the sea's surface to read bent
     * (sea/under-water-picture.ts): the picture; 1 while it is drawn; one dot of the screen as a
     * share of it, across and down; and how many shares of it a metre a metre from the eye spans.
     */
    uUnderWaterPicture: { value: Texture | null };
    uPictureDrawn: { value: number };
    uDotOfPicture: { value: Vector2 };
    uPictureScale: { value: Vector2 };
    /**
     * Levels the debug panel's sliders set, for what only an eye can find the right amount of
     * (core/debug-tools.ts). How much of the raising of what is under the sea to where it seems
     * to be is drawn, 1 as designed. How much the ripples bend it, 1 as designed. The share of the
     * fine ripples' slope that bends what is
     * under them, as the broad ripples' whole slope does: at 1 everything under shallow water
     * shivers, at nought it only sways. How much the fine ripples smear it, 1 as designed. And how
     * much of the net of light there is on it, 1 as designed.
     */
    uRaisingShare: { value: number };
    uBendingShare: { value: number };
    uFineRipplesBend: { value: number };
    uSmearingShare: { value: number };
    uLightNetShare: { value: number };
    /**
     * 1 while each dot of the ground works out for itself, in the picture of what is under the
     * sea, which point of the ground it shows (world/terrain-colour.glsl); 0 with the cost switch
     * `ground by its corners` on, to read on the phone what that costs.
     */
    uGroundSeenDotByDot: { value: number };
    /**
     * How high the eye is above the level the raising takes the sea to lie at, in metres: the
     * still sea's, lifted with a swimmer whom a wave lifts (sea/under-water-picture.ts sets it).
     */
    uEyeOverRaisingLevel: { value: number };
    /** The biggest things standing in the surf: x, z, radius. The water draws foam round them. */
    uSurfObstacles: { value: Vector3[] };
    /** A circle round each group of them that holds all its foam: x, z, radius (sea/surf-obstacles.ts). */
    uSurfObstacleGroups: { value: Vector3[] };
  };

export function createSharedUniforms(
  detailTexture: Texture,
  causticsTexture: Texture,
  skyLight: SkyLightUniforms,
  clouds: CloudUniforms,
): SharedUniforms {
  const { sentToWater, groups } = waterConfig.surfObstacles;
  const noObstacles = Array.from({ length: sentToWater }, () => new Vector3(0, 0, -1));
  const noGroups = Array.from({ length: groups }, () => new Vector3(0, 0, 0));
  return {
    uTime: { value: 0 },
    uSeaLevel: { value: 0 },
    uUnderWater: { value: 0 },
    uShoreBandShown: { value: 0 },
    uDebugMode: { value: 0 },
    uUnderWaterColour: { value: new Color() },
    uDetail: { value: detailTexture },
    uCaustics: { value: causticsTexture },
    uReefMap: { value: null },
    uTreeCover: { value: null },
    uSeaFloor: { value: null },
    uBreakTimes: { value: null },
    uFloorHeight: { value: null },
    uShoreRound: { value: null },
    uCrests: { value: null },
    uBreakerShapes: { value: null },
    uBreakerArc: { value: new Vector2() },
    uCameraPosition: { value: new Vector3() },
    uUnderWaterPicture: { value: null },
    uPictureDrawn: { value: 0 },
    uDotOfPicture: { value: new Vector2(1, 1) },
    uPictureScale: { value: new Vector2(1, 1) },
    uRaisingShare: { value: 1 },
    uBendingShare: { value: 1 },
    uFineRipplesBend: { value: FINE_RIPPLES_BEND },
    uSmearingShare: { value: 1 },
    uLightNetShare: { value: 1 },
    uGroundSeenDotByDot: { value: 1 },
    uEyeOverRaisingLevel: { value: 1 },
    uSurfObstacles: { value: noObstacles },
    uSurfObstacleGroups: { value: noGroups },
    ...skyLight,
    ...clouds,
  };
}
