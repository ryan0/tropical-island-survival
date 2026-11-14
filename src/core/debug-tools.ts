import type { WebGLRenderer } from 'three';
import type { Water } from '../sea/water';
import type { BuildInfo } from '../ui/build-label';
import type { DebugSwitch } from '../ui/debug-panel';
import type { AutomaticQuality } from './automatic-quality';
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
): string[] {
  const context = renderer.getContext();
  const webGl = renderer.capabilities.isWebGL2 ? '2' : '1';
  return [
    `build v${build.version} · ${build.commit} · WebGL${webGl} · frag highp bits ${fragmentPrecisionBits(context)} · three precision ${renderer.capabilities.precision}`,
    `GPU: ${graphicsCardName(context)}`,
    `water: ${water.waveMeshDescription} · quality stage ${quality.stage} · pixel ratio ${renderer.getPixelRatio()}`,
  ];
}

export function debugSwitches(
  water: Water,
  uniforms: SharedUniforms,
  testHooks: TestHooks,
): DebugSwitch[] {
  const waterDebug = (mode: number) => (on: boolean) => {
    uniforms.uDebugMode.value = on ? mode : 0;
  };
  return [
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
  ];
}
