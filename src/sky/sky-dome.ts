import {
  BackSide,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  type IUniform,
  type Scene,
  type Vector3,
} from 'three';
import { glslFloat, glslVec2 } from '../shaders/defines';
import { cloudsConfig } from './clouds-config';
import fragmentShader from './sky.frag.glsl';
import vertexShader from './sky.vert.glsl';

export interface SkyDomeDependencies {
  scene: Scene;
  /** The uniforms every shader shares: the dome reads the light, the clock and the cloud pictures. */
  uniforms: Record<string, IUniform>;
  /** The size of a cloud picture, in dots. */
  cloudPictureWidth: number;
  cloudPictureHeight: number;
}

export interface SkyDome {
  update(cameraPosition: Vector3): void;
}

const RADIUS = 3000;

/** The sky: gradient, sun, moon, stars and the clouds, drawn on the inside of a great ball. */
export function createSkyDome(dependencies: SkyDomeDependencies): SkyDome {
  const { scene, uniforms, cloudPictureWidth, cloudPictureHeight } = dependencies;
  const material = new ShaderMaterial({
    uniforms,
    defines: {
      EARTH_CURVE: glslFloat(cloudsConfig.earthCurve),
      SLIDE_HEIGHT: glslFloat(cloudsConfig.slideHeight),
      HALF_A_DOT: glslVec2(0.5 / cloudPictureWidth, 0.5 / cloudPictureHeight),
    },
    side: BackSide,
    depthWrite: false,
    fog: false,
    vertexShader,
    fragmentShader,
  });
  const dome = new Mesh(new SphereGeometry(RADIUS, 32, 20), material);
  // It is always in view: the camera is inside it.
  dome.frustumCulled = false;
  // After the other solid things: sky hidden behind land is then rejected by the depth test
  // before its shader runs.
  dome.renderOrder = 10;
  scene.add(dome);

  return {
    update(cameraPosition) {
      dome.position.copy(cameraPosition);
    },
  };
}
