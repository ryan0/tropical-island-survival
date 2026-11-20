import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import wholePictureShader from '../sky/whole-picture.vert.glsl';

/**
 * Has the graphics card fill `picture` once, every dot of it worked out by `fragmentShader`, and
 * returns it as a texture: for a picture made at start-up from a formula, which a shader then
 * reads in place of working the formula out for every dot it colours. (On Ryan's phone such
 * arithmetic is dear, and a texture reading costs next to nothing.)
 */
export function drawPictureOnce(
  renderer: WebGLRenderer,
  picture: WebGLRenderTarget,
  fragmentShader: string,
  defines: Record<string, string>,
): Texture {
  const material = new ShaderMaterial({
    defines,
    depthTest: false,
    depthWrite: false,
    vertexShader: wholePictureShader,
    fragmentShader,
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
