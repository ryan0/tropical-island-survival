import type { WebGLRenderer } from 'three';
import type { SeaFloorPictures } from '../sea/sea-floor-pictures';
import type { Water } from '../sea/water';
import type { Player } from '../player/player';
import type { BuildInfo } from '../ui/build-label';
import type { DebugSwitch } from '../ui/debug-panel';
import type { AutomaticQuality } from './automatic-quality';
import type { FrameMeter } from './frame-meter';
import type { SharedUniforms } from './shared-uniforms';
import type { TestHooks } from './test-hooks';

/** The graphics card's own name for itself, where the browser will say. */
function graphicsCardName(context: WebGLRenderingContext | WebGL2RenderingContext): string {
  try {
    const extension = context.getExtension('WEBGL_debug_renderer_info');
    if (extension === null) return 'n/a';
    return String(context.getParameter(extension.UNMASKED_RENDERER_WEBGL));
  } catch {
    return 'n/a';
  }
}

function fragmentPrecisionBits(context: WebGLRenderingContext | WebGL2RenderingContext): string {
  try {
    const format = context.getShaderPrecisionFormat(context.FRAGMENT_SHADER, context.HIGH_FLOAT);
    return format === null ? 'none' : String(format.precision);
  } catch {
    return 'n/a';
  }
}

/**
 * The lines at the top of the debug panel: which build this is and what it is running on.
 * They helped find a bug that showed only on one phone (docs/DEVICE_NOTES.md).
 */
export function describeBuild(
  renderer: WebGLRenderer,
  build: BuildInfo,
  water: Water,
  quality: AutomaticQuality,
  seaFloor: SeaFloorPictures,
): string[] {
  const context = renderer.getContext();
  const webGl = renderer.capabilities.isWebGL2 ? '2' : '1';
  return [
    `build v${build.version} · ${build.commit} · WebGL${webGl} · frag highp bits ${fragmentPrecisionBits(context)} · three precision ${renderer.capabilities.precision}`,
    `GPU: ${graphicsCardName(context)}`,
    `water: ${water.waveMeshDescription} · quality stage ${quality.stage} · pixel ratio ${renderer.getPixelRatio()}`,
    `sea floor pictures: ${seaFloor.size} dots across, made in ${seaFloor.madeInMilliseconds.toFixed(0)} ms`,
  ];
}

/**
 * How fast the page is running and how much it is drawing, for the phone to report. A phone draws
 * no faster than its screen refreshes, so at full speed the frame rate says nothing of what is
 * to spare: the program's own time for a frame does.
 */
export function describeSpeed(renderer: WebGLRenderer, frames: FrameMeter): string {
  const { calls, triangles } = renderer.info.render;
  return [
    `${frames.framesPerSecond.toFixed(0)} frames a second`,
    `slowest ${frames.slowestFrameMilliseconds.toFixed(0)} ms`,
    `program ${frames.programMilliseconds.toFixed(1)} ms a frame`,
    `${calls} draws`,
    `${Math.round(triangles / 1000)} thousand triangles`,
  ].join(' · ');
}

/** Where the eye is, to say where something was seen. */
export function describeEye(eye: { x: number; y: number; z: number }): string {
  return `eye at x ${eye.x.toFixed(0)}, z ${eye.z.toFixed(0)} · ${eye.y.toFixed(1)} m above the sea`;
}

export function debugSwitches(
  water: Water,
  uniforms: SharedUniforms,
  testHooks: TestHooks,
  player: Pick<Player, 'setFlying'>,
): DebugSwitch[] {
  const waterDebug = (mode: number) => (on: boolean) => {
    uniforms.uDebugMode.value = on ? mode : 0;
  };
  return [
    { label: 'fly', set: player.setFlying },
    {
      label: 'wireframe',
      set(on) {
        water.waveMaterial.wireframe = on;
      },
    },
    {
      label: 'hide wave mesh',
      set(on) {
        water.waveMesh.visible = !on;
      },
    },
    {
      label: 'hide far sea',
      set(on) {
        water.farSea.visible = !on;
      },
    },
    { label: 'freeze waves', set: testHooks.stopClock },
    { label: 'waves off', set: waterDebug(1) },
    { label: 'no falling lip', set: waterDebug(2) },
    { label: 'plain water colour', set: waterDebug(3) },
    { label: 'sea floor pictures', set: waterDebug(4) },
    // For finding where a slow frame goes: read the frame rate with it on.
    { label: 'coarse wave mesh', set: water.drawWaveMeshCoarsely },
  ];
}
