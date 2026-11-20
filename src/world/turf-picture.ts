import {
  ClampToEdgeWrapping,
  LinearFilter,
  RGBAFormat,
  UnsignedByteType,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { glslFloat } from '../shaders/defines';
import { drawPictureOnce } from '../shaders/picture-drawn-once';
import bakeShader from './turf-picture.frag.glsl';
import { worldConfig } from './world-config';

// The turf's broad patterns as a picture, for the ground's colouring: how lush it is, how dried
// out, where bare soil breaks through, how the layers' edges wander. They are a dozen sines, which
// the colouring worked out for every dot of land; on Ryan's phone such arithmetic is dear and a
// texture reading costs next to nothing. The graphics card draws the picture once, at start-up,
// from ground-patterns/turf.glsl itself, which the grass goes by too: so the picture, the grass and the formulas
// cannot drift apart.

const config = worldConfig.turfPicture;

/** What the ground's shader needs to read the picture: the same numbers it was drawn with. */
export const turfPictureDefines = {
  TURF_PICTURE_SPAN: glslFloat(config.span),
  TURF_WANDER_KEPT: glslFloat(config.wanderKept),
};

/**
 * Draws the picture (turf-picture.frag.glsl says what is in it): smoothly filtered and without
 * mipmaps, so that it may be read inside a branch (docs/DEVICE_NOTES.md).
 */
export function createTurfPicture(renderer: WebGLRenderer): Texture {
  const picture = new WebGLRenderTarget(config.size, config.size, {
    format: RGBAFormat,
    type: UnsignedByteType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    generateMipmaps: false,
    depthBuffer: false,
    stencilBuffer: false,
  });
  return drawPictureOnce(renderer, picture, bakeShader, {
    ...turfPictureDefines,
    TURF_PICTURE_SIZE: glslFloat(config.size),
  });
}
