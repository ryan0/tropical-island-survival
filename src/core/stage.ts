import { Fog, PCFShadowMap, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { seaConfig } from '../sea/sea-config';
import { useWaterAsFog } from '../sea/water-as-fog';
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

// Which kinds of WebGL the browser will give. (three.js uses WebGL 2 and makes do with WebGL 1.)
function contextsOffered(): string {
  const offers = (kind: string) =>
    document.createElement('canvas').getContext(kind) === null ? 'no' : 'yes';
  return `WebGL 2: ${offers('webgl2')} · WebGL 1: ${offers('webgl')}`;
}

/**
 * What everything else is built on: the renderer, the scene and the camera.
 * `errorMessage` is shown, and nothing more is done, if the browser gives no WebGL: it says why,
 * as far as three.js and the browser will tell. `hint` afterwards reports any error the page
 * throws, and the loss of the graphics context. A phone has no console to look in.
 */
export function createStage(errorMessage: HTMLElement, hint: HTMLElement): Stage {
  // The canvas is made here, not by three.js, so that the browser's own reason for refusing can
  // be heard: it is given to the canvas, as an event, at the moment the context is asked for.
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  let browsersReason = '';
  canvas.addEventListener('webglcontextcreationerror', (event) => {
    browsersReason = (event as WebGLContextEvent).statusMessage;
  });

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true });
  } catch (error) {
    errorMessage.style.display = 'flex';
    errorMessage.style.whiteSpace = 'pre-line';
    errorMessage.textContent = [
      'WebGL is not available in this browser.',
      error instanceof Error ? error.message : String(error),
      browsersReason,
      contextsOffered(),
    ].join('\n');
    throw error;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SHARPEST));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  useSmootherShadowEdges();
  useWaterAsFog();

  // A context the browser takes away (a driver fault, too little memory) stops the picture with no
  // error thrown. The page says so, and how far it had got.
  canvas.addEventListener('webglcontextlost', () => {
    hint.style.opacity = '1';
    hint.textContent = `the graphics context was lost after ${renderer.info.render.frame} frames`;
  });
  window.addEventListener('error', (event) => {
    hint.style.opacity = '1';
    hint.textContent = `error: ${event.message || ''} @${event.lineno || ''}`;
  });
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
