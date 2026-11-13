import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  ShaderMaterial,
  type IUniform,
  type Scene,
} from 'three';
import type { GroundHeight, Point } from '../landmarks';
import { campConfig } from './camp-config';
import fragmentShader from './flame.frag.glsl';
import vertexShader from './flame.vert.glsl';

export interface FireDependencies {
  scene: Scene;
  /** The uniforms every shader shares; the flame's shader uses them directly. */
  uniforms: Record<string, IUniform>;
  groundHeight: GroundHeight;
  /** Where the fire is. */
  place: Point;
  /**
   * Whether the camp is there. Without it the flame, the embers and the light are hidden and the
   * logs are left out.
   */
  hasCamp: boolean;
}

export interface Fire {
  /**
   * Flickers the flame and its light, which is brighter at night, and lifts the embers.
   * `daylight` is 0 at night and 1 in full day.
   */
  update(time: number, daylight: number): void;
}

const config = campConfig.fire;

/** Three sheets crossed upright, each drawn with the flame's shader. */
function addFlameSheets(flame: Group, uniforms: Record<string, IUniform>): void {
  const material = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    vertexShader,
    fragmentShader,
  });
  const sheet = new PlaneGeometry(1.15, 1.7);
  sheet.translate(0, 0.85, 0);
  for (let i = 0; i < 3; i++) {
    const mesh = new Mesh(sheet, material);
    mesh.rotation.y = (i * Math.PI) / 3;
    flame.add(mesh);
  }
}

/** The campfire: flame, glowing coals, embers and its flickering light. */
export function createFire(dependencies: FireDependencies): Fire {
  const { scene, uniforms, groundHeight, place, hasCamp } = dependencies;
  const ground = groundHeight(place.x, place.z);

  const flame = new Group();
  flame.position.set(place.x, ground + 0.06, place.z);
  scene.add(flame);
  addFlameSheets(flame, uniforms);

  const coals = new Mesh(
    new CircleGeometry(0.36, 14),
    new MeshBasicMaterial({ color: config.coalColour, fog: false }),
  );
  coals.rotation.x = -Math.PI / 2;
  coals.position.set(place.x, ground + 0.09, place.z);
  scene.add(coals);

  const emberPositions = new Float32Array(config.embers * 3);
  const emberShape = new BufferGeometry();
  const emberPositionAttribute = new BufferAttribute(emberPositions, 3);
  emberShape.setAttribute('position', emberPositionAttribute);
  const embers = new Points(
    emberShape,
    new PointsMaterial({
      color: config.emberColour,
      size: 0.055,
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: AdditiveBlending,
    }),
  );
  // Its bounds would be worked out once, and never follow the embers as they rise.
  embers.frustumCulled = false;
  scene.add(embers);

  const light = new PointLight(config.lightColour, 0, config.lightReach, 2);
  light.position.set(place.x, ground + 1.1, place.z);
  scene.add(light);

  const logShape = new CylinderGeometry(0.09, 0.09, 1.1, 5);
  const logMaterial = new MeshLambertMaterial({ color: config.logColour });
  for (let i = 0; i < config.logs; i++) {
    const log = new Mesh(logShape, logMaterial);
    log.position.set(place.x, ground + 0.12, place.z);
    log.rotation.set(Math.PI / 2, 0, i * 0.8);
    if (hasCamp) scene.add(log);
  }

  if (!hasCamp) {
    // As build 78 has it: no camp, no fire, but its disc of glowing coals stays.
    flame.visible = false;
    embers.visible = false;
    light.visible = false;
  }

  return {
    update(time, daylight) {
      if (!hasCamp) return;
      const flicker = 0.85 + 0.15 * Math.sin(time * 13) + 0.1 * Math.sin(time * 7.3);
      light.intensity =
        (config.brightnessByDay + config.brightnessAddedAtNight * (1 - daylight)) * flicker;
      flame.scale.set(flicker, 0.8 + 0.4 * flicker, flicker);
      flame.rotation.y = time * 0.35;

      for (let i = 0; i < config.embers; i++) {
        // Its share of the climb: at 1 it starts again from the coals.
        const risen = (time * 0.42 + i * 0.137) % 1;
        const spread = 0.1 + risen * 0.5;
        emberPositions[i * 3] = place.x + Math.sin(i * 12.9 + time * 1.3) * spread;
        emberPositions[i * 3 + 1] = ground + 0.3 + risen * 3.0;
        emberPositions[i * 3 + 2] = place.z + Math.cos(i * 7.7 + time * 1.1) * spread;
      }
      emberPositionAttribute.needsUpdate = true;
    },
  };
}
