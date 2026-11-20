import {
  ClampToEdgeWrapping,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { glslFloat } from '../shaders/defines';
import wholePictureShader from '../sky/whole-picture.vert.glsl';
import bakeShader from './reef-cover-picture.frag.glsl';
import { worldConfig } from './world-config';

// What covers the reef's floor, as a picture, for the ground's colouring: where coral and rock
// stand on high ground, where the pavement lies bare, how much of a ridge the crest is. The
// island's formulas for these run to dozens of sines, and the ground's colouring worked them out
// for every dot of the reef it drew, which is most of the screen for an eye on the ocean beach;
// on Ryan's phone such arithmetic is dear and a texture reading costs next to nothing. So the
// graphics card works them out once, at start-up, for every dot of this picture. It is made from
// the formulas themselves, so whatever the reef becomes, the picture follows.

const config = worldConfig.reefCoverPicture;

/**
 * Draws the picture (reef-cover-picture.frag.glsl says what is in it): smoothly filtered and
 * without mipmaps, so that it may be read inside a branch (docs/DEVICE_NOTES.md).
 */
export function createReefCoverPicture(renderer: WebGLRenderer): Texture {
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
  const material = new ShaderMaterial({
    defines: {
      REEF_COVER_SPAN: glslFloat(config.span),
      REEF_COVER_SIZE: glslFloat(config.size),
    },
    depthTest: false,
    depthWrite: false,
    vertexShader: wholePictureShader,
    fragmentShader: bakeShader,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new Scene();
  scene.add(quad);

  const drawnIntoBefore = renderer.getRenderTarget();
  renderer.setRenderTarget(picture);
  renderer.render(scene, new OrthographicCamera(-1, 1, 1, -1, 0, 1));
  renderer.setRenderTarget(drawnIntoBefore);
  quad.geometry.dispose();
  material.dispose();
  return picture.texture;
}
