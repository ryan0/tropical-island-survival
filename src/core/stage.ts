import { Fog, PCFShadowMap, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { seaConfig } from '../sea/sea-config';
import { useSmootherShadowEdges } from './soft-shadows';

export interface Stage {
  renderer: WebGLRenderer;
  /** The picture itself, first thing in the page. */
  canvas: HTMLCanvasElement;
  scene: Scene;
  camera: PerspectiveCamera;
  fog: Fog;
}

// The page is drawn at the screen's own sharpness up to this many dots to a CSS pixel.
const SHARPEST = 1.5;
const FOG_COLOUR_BEFORE_THE_FIRST_FRAME = 0xa8e0f7;

/**
 * What everything else is built on: the renderer, the scene and the camera.
 * `errorMessage` is shown, and nothing more is done, if the browser has no WebGL.
 * `hint` afterwards reports any error the page throws, since a phone has no console to look in.
 */
export function createStage(errorMessage: HTMLElement, hint: HTMLElement): Stage {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true });
  } catch (error) {
    errorMessage.style.display = 'flex';
    errorMessage.textContent = 'WebGL is not available in this browser.';
    throw error;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SHARPEST));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  useSmootherShadowEdges();

  window.addEventListener('error', (event) => {
    hint.style.opacity = '1';
    hint.textContent = `error: ${event.message || ''} @${event.lineno || ''}`;
  });
  const canvas = renderer.domElement;
  document.body.insertBefore(canvas, document.body.firstChild);

  const scene = new Scene();
  const camera = new PerspectiveCamera(68, 1, 0.2, 7000);
  // Turn first, then tilt: a head on a neck.
  camera.rotation.order = 'YXZ';
  const [fogNear, fogFar] = seaConfig.fogInAir;
  const fog = new Fog(FOG_COLOUR_BEFORE_THE_FIRST_FRAME, fogNear, fogFar);
  scene.fog = fog;
  return { renderer, canvas, scene, camera, fog };
}
