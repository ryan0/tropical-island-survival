import { BackSide, Mesh, ShaderMaterial, SphereGeometry, type Scene, type Vector3 } from 'three';
import type { RandomStreams } from '../core/random';
import type { SharedUniforms } from '../core/shared-uniforms';
import { glslFloat, glslVec2, glslVec3 } from '../shaders/defines';
import { cloudsConfig } from './clouds-config';
import { createMilkyWayPicture } from './milky-way-picture';
import { createMoonFacePicture } from './moon-face-picture';
import { skyConfig } from './sky-config';
import { createSkyTurn } from './sky-turn';
import { createStars } from './stars';
import fragmentShader from './sky.frag.glsl';
import vertexShader from './sky.vert.glsl';

export interface SkyDomeDependencies {
  scene: Scene;
  /** The uniforms every shader shares: the dome reads the light, the clock and the cloud pictures. */
  uniforms: SharedUniforms;
  /** The stars and the Milky Way each scatter theirs from a stream of their own. */
  randomStream: RandomStreams;
  /** The size of a cloud picture, in dots. */
  cloudPictureWidth: number;
  cloudPictureHeight: number;
}

export interface SkyDome {
  /**
   * Its material. With the define SKY_BARE (a debug switch) the dome is one flat colour and
   * nothing of the sky is worked out, to read what the sky costs.
   */
  material: ShaderMaterial;
  /**
   * Keeps the dome round the camera and turns the stars to the time of day (0 midnight, 0.5
   * noon); `pixelRatio` is the renderer's, dots to a CSS pixel.
   */
  update(cameraPosition: Vector3, dayPhase: number, pixelRatio: number): void;
}

const RADIUS = 3000;

/**
 * The sky: gradient, sun, moon, Milky Way and clouds, drawn on the inside of a great ball, and
 * the stars over it.
 */
export function createSkyDome(dependencies: SkyDomeDependencies): SkyDome {
  const { scene, uniforms, randomStream, cloudPictureWidth, cloudPictureHeight } = dependencies;
  const latitude = skyConfig.starrySky.latitude;
  const skyDefines = {
    EARTH_CURVE: glslFloat(cloudsConfig.earthCurve),
    SLIDE_HEIGHT: glslFloat(cloudsConfig.slideHeight),
    HALF_A_DOT: glslVec2(0.5 / cloudPictureWidth, 0.5 / cloudPictureHeight),
    MOON_RADIUS: glslFloat(skyConfig.moon.radius),
    MOON_UP: glslVec2(...skyConfig.moon.paleningTheSky),
  };
  const skyTurn = createSkyTurn();
  const material = new ShaderMaterial({
    uniforms: {
      ...uniforms,
      uSkyTurn: skyTurn.uniform,
      uMilkyWay: { value: createMilkyWayPicture(randomStream('milky way')) },
      uMoonFace: { value: createMoonFacePicture(randomStream("the moon's face")) },
    },
    defines: {
      ...skyDefines,
      SKY_POLE: glslVec3(0, Math.sin(latitude), -Math.cos(latitude)),
      MILKY_WAY_REACHES: glslFloat(Math.sin(skyConfig.milkyWay.reaches)),
      MILKY_WAY_COLOUR: glslVec3(...skyConfig.milkyWay.colour),
      MILKY_WAY_LOST_TO_MOONLIGHT: glslFloat(skyConfig.milkyWay.lostToMoonlight),
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
  const stars = createStars({
    scene,
    uniforms,
    skyTurn: skyTurn.uniform,
    random: randomStream('stars'),
    skyDefines,
  });

  return {
    material,
    update(cameraPosition, dayPhase, pixelRatio) {
      dome.position.copy(cameraPosition);
      skyTurn.update(dayPhase);
      stars.update(pixelRatio);
    },
  };
}
