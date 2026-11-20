import { BufferAttribute, BufferGeometry, Points, ShaderMaterial, type Scene } from 'three';
import type { SharedUniforms } from '../core/shared-uniforms';
import { FULL_TURN } from '../core/maths';
import { glslFloat, glslVec2, glslVec3 } from '../shaders/defines';
import { seaConfig } from './sea-config';
import fragmentShader from './under-water-specks.frag.glsl';
import vertexShader from './under-water-specks.vert.glsl';

// Fine pale specks hanging in the water round the camera while it is under: marine snow. They
// belong to the water, not to the camera: each has a home in a box that repeats through the water,
// and the shader moves it and draws it in the copy of the box round the camera.

export interface UnderWaterSpecksDependencies {
  scene: Scene;
  /** The uniforms every shader shares: the specks read uTime, uCameraPosition, uDaylight and uNight. */
  uniforms: SharedUniforms;
}

export interface UnderWaterSpecksFrame {
  isCameraUnder: boolean;
  /** The height of the water's surface over the camera. */
  surfaceHeight: number;
  /** Pixels a metre spans at a metre away. */
  focalLength: number;
}

export interface UnderWaterSpecks {
  update(frame: UnderWaterSpecksFrame): void;
}

const config = seaConfig.specks;

// The golden ratio generalised to three dimensions (the root of x^4 = x + 1), and the golden ratio
// itself: stepping by their powers spreads the specks evenly through the box, with no clumps and
// no rows, and their seeds evenly from 0 to 1.
const GOLDEN_RATIO_IN_3D = 1.2207440846057596;
const GOLDEN_RATIO = 1.618033988749895;

function fractionalPart(value: number): number {
  return value - Math.floor(value);
}

/** The specks' homes in the box, and the seed each draws its own traits from. */
function speckField(): BufferGeometry {
  const { across, deep } = config.box;
  const homes = new Float32Array(config.count * 3);
  const seeds = new Float32Array(config.count);
  for (let i = 0; i < config.count; i++) {
    homes[i * 3] = fractionalPart(0.5 + i / GOLDEN_RATIO_IN_3D) * across;
    homes[i * 3 + 1] = fractionalPart(0.5 + i / GOLDEN_RATIO_IN_3D ** 2) * deep;
    homes[i * 3 + 2] = fractionalPart(0.5 + i / GOLDEN_RATIO_IN_3D ** 3) * across;
    seeds[i] = fractionalPart(0.5 + i / GOLDEN_RATIO);
  }
  const field = new BufferGeometry();
  field.setAttribute('position', new BufferAttribute(homes, 3));
  field.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  return field;
}

function speckDefines(): Record<string, string> {
  const [shortestSway, longestSway] = config.wanderSeconds;
  return {
    SPECK_BOX: glslVec3(config.box.across, config.box.deep, config.box.across),
    EDGE_FADE: glslFloat(config.edgeFade),
    DRIFT: glslVec3(...config.drift),
    WANDER: glslFloat(config.wander),
    WANDER_PACE: glslVec2(FULL_TURN / longestSway, FULL_TURN / shortestSway),
    SINKING: glslFloat(config.sinking),
    SIZE: glslVec2(...config.size),
    SIZED_NO_NEARER_THAN: glslFloat(config.sizedNoNearerThan),
    FADES_NEAR: glslVec2(...config.fadesNear),
    FADES_FAR: glslVec2(...config.fadesFar),
    CLEAR_OF_SURFACE: glslFloat(config.clearOfSurface),
    FADES_UNDER_SURFACE: glslFloat(config.fadesUnderSurface),
    MOST_OPACITY: glslFloat(config.opacity),
    SPECK_COLOUR: glslVec3(...config.colour),
    LIGHT_AT_SUNSET: glslFloat(config.lightAtSunset),
    LIGHT_AT_NIGHT: glslFloat(config.lightAtNight),
  };
}

export function createUnderWaterSpecks({
  scene,
  uniforms,
}: UnderWaterSpecksDependencies): UnderWaterSpecks {
  const surfaceHeight = { value: 0 };
  const pixelsPerMetre = { value: 0 };
  const specks = new Points(
    speckField(),
    new ShaderMaterial({
      uniforms: {
        uTime: uniforms.uTime,
        uCameraPosition: uniforms.uCameraPosition,
        uDaylight: uniforms.uDaylight,
        uNight: uniforms.uNight,
        uSurfaceHeight: surfaceHeight,
        uPixelsPerMetre: pixelsPerMetre,
      },
      defines: speckDefines(),
      transparent: true,
      depthWrite: false,
      fog: false,
      vertexShader,
      fragmentShader,
    }),
  );
  // The shader draws them round the camera, wherever the shape's bounds say they are.
  specks.frustumCulled = false;
  specks.visible = false;
  // After the water.
  specks.renderOrder = 6;
  scene.add(specks);

  return {
    update(frame) {
      specks.visible = frame.isCameraUnder;
      surfaceHeight.value = frame.surfaceHeight;
      pixelsPerMetre.value = frame.focalLength;
    },
  };
}
