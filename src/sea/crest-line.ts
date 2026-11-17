import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  type IUniform,
  type Scene,
} from 'three';
import { FULL_TURN } from '../core/maths';
import { glslFloat, glslVec2 } from '../shaders/defines';
import fragmentShader from './crest-line.frag.glsl';
import vertexShader from './crest-line.vert.glsl';
import { seaConfig } from './sea-config';

// A debug line along the crest of the main swell's wave nearest the line its waves break on, all
// round the atoll: it shows that the crest picture finds the crest, and that the phone can read
// the picture where the breaker's own mesh will. A switch in the debug panel shows it.

export interface CrestLineDependencies {
  scene: Scene;
  /** The uniforms every shader shares. */
  uniforms: Record<string, IUniform>;
  /** The wave model's defines, as the water's shaders have them (water-materials.ts). */
  waveDefines: Readonly<Record<string, string>>;
}

export interface CrestLine {
  readonly isShown: boolean;
  show: (isShown: boolean) => void;
}

// Steps round the atoll: about one every metre and a half on the reef's edge.
const STEPS_ROUND = 1400;

/** A strip round the atoll: each corner holds the unit vector out from the centre, and which of its two edges it is on. */
function strip(): BufferGeometry {
  const corners = new Float32Array((STEPS_ROUND + 1) * 2 * 3);
  const cornerOrder: number[] = [];
  for (let step = 0; step <= STEPS_ROUND; step++) {
    const direction = (step / STEPS_ROUND) * FULL_TURN;
    for (const [edge, side] of [-1, 1].entries()) {
      corners.set([Math.cos(direction), side, Math.sin(direction)], (step * 2 + edge) * 3);
    }
    if (step === STEPS_ROUND) continue;
    const near = step * 2;
    cornerOrder.push(near, near + 1, near + 2, near + 1, near + 3, near + 2);
  }
  const shape = new BufferGeometry();
  shape.setAttribute('position', new BufferAttribute(corners, 3));
  shape.setIndex(cornerOrder);
  return shape;
}

export function createCrestLine({
  scene,
  uniforms,
  waveDefines,
}: CrestLineDependencies): CrestLine {
  const [mainSwell] = seaConfig.swells;
  const material = new ShaderMaterial({
    uniforms: { ...uniforms },
    defines: {
      ...waveDefines,
      MAIN_SWELL_TOWARDS: glslVec2(...mainSwell.towards),
      MAIN_SWELL_PERIOD: glslFloat(mainSwell.period),
      BREAK_LINE_ALONG: glslFloat(seaConfig.reefBreak),
      CREST_SECONDS_BEFORE: glslFloat(seaConfig.crestPicture.secondsBefore),
      CREST_SECONDS_AFTER: glslFloat(seaConfig.crestPicture.secondsAfter),
    },
    transparent: true,
    depthWrite: false,
    fog: false,
    side: DoubleSide,
    vertexShader,
    fragmentShader,
  });
  const line = new Mesh(strip(), material);
  // Its corners are moved to the crest by the shader: where the shape says they are means nothing.
  line.frustumCulled = false;
  // After the water.
  line.renderOrder = 6;
  line.visible = false;
  scene.add(line);

  return {
    get isShown() {
      return line.visible;
    },
    show(isShown) {
      line.visible = isShown;
    },
  };
}
