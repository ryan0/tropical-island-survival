import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Points,
  PointsMaterial,
  type Camera,
  type Color,
  type Fog,
  type Scene,
} from 'three';
import { seaConfig } from './sea-config';
import type { WaveModel } from './wave-model';

export interface UnderWaterDependencies {
  scene: Scene;
  camera: Camera;
  waves: WaveModel;
  /** The scene's fog: under water the eye sees a few tens of metres, and what it sees is blue. */
  fog: Fog;
  /** The blue overlay with its rays of light, laid over the picture while the camera is under. */
  overlay: HTMLElement;
  /** Two of the uniforms every shader shares: 1 when the camera is under water, and the water's own colour. */
  uniforms: { uUnder: { value: number }; uFogC: { value: Color } };
}

export interface UnderWater {
  /** The height of the water's surface at the camera, as of the last update. */
  readonly surfaceHeight: number;
  readonly isCameraUnder: boolean;
  /** `daylight` is 0 at night to 1 in full day; `night` the other way about. */
  update(time: number, daylight: number, night: number): void;
}

// The camera counts as under water from this far below the surface, where the water is at least so deep.
const JUST_UNDER = 0.02;
const SHALLOWEST = 0.12;

/** A bubble: a faint disc with a bright rim. */
function bubblePicture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('the browser gave no canvas to draw the bubbles on');

  context.beginPath();
  context.arc(16, 16, 11, 0, 6.283);
  context.fillStyle = 'rgba(255,255,255,.22)';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,.95)';
  context.lineWidth = 3;
  context.stroke();
  return canvas;
}

/** Being under water: the fog closes in, a blue overlay with rays of light comes up, bubbles rise. */
export function createUnderWater(dependencies: UnderWaterDependencies): UnderWater {
  const { scene, camera, waves, fog, overlay, uniforms } = dependencies;
  const positions = new Float32Array(seaConfig.bubbles * 3);
  const shape = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions, 3);
  shape.setAttribute('position', positionAttribute);
  const bubbles = new Points(
    shape,
    new PointsMaterial({
      map: new CanvasTexture(bubblePicture()),
      size: 0.09,
      transparent: true,
      depthWrite: false,
      opacity: 0.8,
    }),
  );
  // They are wherever the camera is, not where the shape's bounds say.
  bubbles.frustumCulled = false;
  bubbles.visible = false;
  bubbles.renderOrder = 6;
  scene.add(bubbles);

  let surfaceHeight = 0;
  let isCameraUnder = false;

  function riseRoundTheCamera(time: number): void {
    const { x, y, z } = camera.position;
    for (let i = 0; i < seaConfig.bubbles; i++) {
      const risen = (time * 0.22 + i * 0.173) % 1;
      const bearing = i * 2.4;
      const distance = 0.7 + (i % 7) * 0.55;
      positions[i * 3] = x + Math.cos(bearing) * distance + Math.sin(time * 1.3 + i) * 0.07;
      positions[i * 3 + 1] = Math.min(surfaceHeight - 0.08, y - 2.2 + risen * 4.2);
      positions[i * 3 + 2] = z + Math.sin(bearing) * distance + Math.cos(time * 1.1 + i) * 0.07;
    }
    positionAttribute.needsUpdate = true;
  }

  return {
    get surfaceHeight() {
      return surfaceHeight;
    },
    get isCameraUnder() {
      return isCameraUnder;
    },

    update(time, daylight, night) {
      surfaceHeight = waves.heightAt(camera.position.x, camera.position.z, time);
      // Below the surface, and there is actually water here.
      isCameraUnder =
        camera.position.y < surfaceHeight - JUST_UNDER &&
        surfaceHeight - waves.spot.groundHeight > SHALLOWEST;
      const light = (1 - 0.8 * night) * (0.55 + 0.45 * daylight);

      uniforms.uUnder.value = isCameraUnder ? 1 : 0;
      uniforms.uFogC.value.setRGB(0.04 * light, 0.38 * light, 0.5 * light);
      const [near, far] = isCameraUnder ? seaConfig.fogUnderWater : seaConfig.fogInAir;
      if (isCameraUnder) fog.color.copy(uniforms.uFogC.value);
      fog.near = near;
      fog.far = far;
      overlay.style.opacity = isCameraUnder ? '1' : '0';
      bubbles.visible = isCameraUnder;
      if (!isCameraUnder) return;

      overlay.style.setProperty('--ray', light.toFixed(2));
      riseRoundTheCamera(time);
    },
  };
}
