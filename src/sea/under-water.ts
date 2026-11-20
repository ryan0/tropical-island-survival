import type { Fog, PerspectiveCamera, Scene } from 'three';
import { mix, pixelsPerMetreAtAMetre, smoothstep } from '../core/maths';
import type { SharedUniforms } from '../core/shared-uniforms';
import { createLightShafts, type LightShaftsFrame } from './light-shafts';
import { seaConfig } from './sea-config';
import { createUnderWaterSpecks, type UnderWaterSpecksFrame } from './under-water-specks';
import { FOG_BEGINS_UNDER_WATER } from './water-as-fog';
import type { WaveModel } from './wave-model';

export interface UnderWaterDependencies {
  scene: Scene;
  camera: PerspectiveCamera;
  waves: WaveModel;
  /**
   * The scene's fog. Under water it stands for the water between the eye and what it looks at
   * (water-as-fog.ts), in the water's own colour.
   */
  fog: Fog;
  /**
   * The uniforms every shader shares. Two are set here: uUnderWater, 1 while the camera is under
   * water, and uUnderWaterColour, the water's own colour there.
   */
  uniforms: SharedUniforms;
}

export interface UnderWaterFrame {
  time: number;
  /** 0 at night to 1 in full day, and the other way about. */
  daylight: number;
  night: number;
  /** How much of the sun gets through the clouds to the camera, 0 to 1. */
  sunThrough: number;
  /** A debug switch: with the sea drained the camera is never under water. */
  isSeaDrained: boolean;
  /** The renderer's pixel ratio, and the height of the view in CSS pixels. */
  pixelRatio: number;
  viewHeight: number;
}

export interface UnderWater {
  /** The height of the water's surface at the camera, as of the last update. */
  readonly surfaceHeight: number;
  readonly isCameraUnder: boolean;
  update(frame: UnderWaterFrame): void;
}

// The camera counts as under water from this far below the surface, where the water is at least so deep.
const JUST_UNDER = 0.02;
const SHALLOWEST = 0.12;

const config = seaConfig.underWater;
const [fogBeginsInAir, fogEndsInAir] = seaConfig.fogInAir;

/**
 * Being under water: the fog becomes the water, in the colour the water has where the eye is;
 * shafts of sunlight hang in it, and fine specks that show its depth as the eye moves.
 */
export function createUnderWater(dependencies: UnderWaterDependencies): UnderWater {
  const { scene, camera, waves, fog, uniforms } = dependencies;
  const lightShafts = createLightShafts({ scene, uniforms });
  const lightShaftsFrame: LightShaftsFrame = {
    isCameraUnder: false,
    surfaceHeight: 0,
    daylight: 1,
    sunThrough: 1,
  };
  const specks = createUnderWaterSpecks({ scene, uniforms });
  const specksFrame: UnderWaterSpecksFrame = {
    isCameraUnder: false,
    surfaceHeight: 0,
    focalLength: 0,
  };
  let surfaceHeight = 0;
  let isCameraUnder = false;

  /** The water's colour looking level: brighter over pale sand than over the deep, and by the light there is. */
  function colourTheWater(floorDepth: number, frame: UnderWaterFrame): void {
    const deep = smoothstep(config.sandLightsItTo, config.deepFrom, floorDepth);
    const light =
      mix(config.lightAtSunset, 1, frame.daylight) *
      (1 - config.nightDimming * frame.night) *
      mix(config.lightUnderCloud, 1, frame.sunThrough);
    const [sandRed, sandGreen, sandBlue] = config.colourOverSand;
    const [deepRed, deepGreen, deepBlue] = config.colourOverDeep;
    uniforms.uUnderWaterColour.value.setRGB(
      mix(sandRed, deepRed, deep) * light,
      mix(sandGreen, deepGreen, deep) * light,
      mix(sandBlue, deepBlue, deep) * light,
    );
  }

  return {
    get surfaceHeight() {
      return surfaceHeight;
    },
    get isCameraUnder() {
      return isCameraUnder;
    },

    update(frame) {
      surfaceHeight = waves.heightAt(camera.position.x, camera.position.z, frame.time);
      const floorDepth = surfaceHeight - waves.spot.groundHeight;
      // Below the surface, and there is actually water here.
      isCameraUnder =
        !frame.isSeaDrained &&
        camera.position.y < surfaceHeight - JUST_UNDER &&
        floorDepth > SHALLOWEST;

      uniforms.uUnderWater.value = isCameraUnder ? 1 : 0;
      fog.near = isCameraUnder ? FOG_BEGINS_UNDER_WATER : fogBeginsInAir;
      fog.far = fogEndsInAir;

      lightShaftsFrame.isCameraUnder = isCameraUnder;
      lightShaftsFrame.surfaceHeight = surfaceHeight;
      lightShaftsFrame.daylight = frame.daylight;
      lightShaftsFrame.sunThrough = frame.sunThrough;
      lightShafts.update(lightShaftsFrame);
      specksFrame.isCameraUnder = isCameraUnder;
      specksFrame.surfaceHeight = surfaceHeight;
      specksFrame.focalLength = pixelsPerMetreAtAMetre(
        camera.fov,
        frame.pixelRatio * frame.viewHeight,
      );
      specks.update(specksFrame);
      if (!isCameraUnder) return;

      colourTheWater(floorDepth, frame);
      fog.color.copy(uniforms.uUnderWaterColour.value);
    },
  };
}
