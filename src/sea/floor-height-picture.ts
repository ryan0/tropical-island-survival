import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RedFormat,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { glslFloat } from '../shaders/defines';
import wholePictureShader from '../sky/whole-picture.vert.glsl';
import bakeShader from './floor-height-picture.frag.glsl';
import { seaConfig } from './sea-config';

// The ground's height as a picture, for the water's shader, which needs the depth of the water at
// every dot it colours. Working the island's formula out for each of those dots is the dearest
// arithmetic in the water's colouring on Ryan's phone, which finds a texture reading cheap. So the
// graphics card works the formula out once for every dot of this picture, and the water reads the
// picture (water.frag.glsl, WATER_FLOOR_FROM_PICTURE). It is made from the formula itself, so
// whatever the island's shape becomes, the picture follows. (An experiment for now: a debug switch
// has it drawn and turns the reading on.)

const config = seaConfig.floorHeightPicture;

/**
 * Draws the picture: metres above still sea level in its one channel, as half floats, smoothly
 * filtered and without mipmaps (so that it may be read inside a branch: docs/DEVICE_NOTES.md).
 * Null where the graphics card cannot draw into a half-float picture.
 */
export function createFloorHeightPicture(renderer: WebGLRenderer): Texture | null {
  const { capabilities, extensions } = renderer;
  const canDrawHalfFloats = capabilities.isWebGL2
    ? extensions.has('EXT_color_buffer_float') || extensions.has('EXT_color_buffer_half_float')
    : false;
  if (!canDrawHalfFloats) return null;

  const picture = new WebGLRenderTarget(config.size, config.size, {
    format: RedFormat,
    type: HalfFloatType,
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
      FLOOR_HEIGHT_SPAN: glslFloat(config.span),
      FLOOR_HEIGHT_SIZE: glslFloat(config.size),
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
