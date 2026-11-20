import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  type Scene,
} from 'three';
import { smoothstep } from '../core/maths';
import type { SharedUniforms } from '../core/shared-uniforms';
import { glslFloat, glslVec2, glslVec3 } from '../shaders/defines';
import fragmentShader from './light-shafts.frag.glsl';
import vertexShader from './light-shafts.vert.glsl';
import { seaConfig } from './sea-config';

// Shafts of sunlight hanging in the water, seen from under it: ripples on the surface gather the
// sun's light into them. They belong to the world, not to the screen: each hangs from its own spot
// on the surface and slants the way the light travels in the water. There are two kinds, as the
// photographs have them: broad soft shafts, which from the side are slanting bands of light; and
// fine rays close round the line from the eye to the sun, which looking up are the burst of
// streaks about the sun. Where each stands, how it slants, faces the eye and brightens as the
// ripples pass over it is the vertex shader's work; a frame sets a few uniforms.

export interface LightShaftsDependencies {
  scene: Scene;
  /** Four of the uniforms every shader shares (core/shared-uniforms.ts). */
  uniforms: Pick<SharedUniforms, 'uTime' | 'uCameraPosition' | 'uSunDirection' | 'uSunColour'>;
}

export interface LightShaftsFrame {
  isCameraUnder: boolean;
  /** The height of the water's surface over the camera. */
  surfaceHeight: number;
  /** 0 at night to 1 in full day. */
  daylight: number;
  /** How much of the sun gets through the clouds to the camera, 0 to 1. */
  sunThrough: number;
}

export interface LightShafts {
  update(frame: LightShaftsFrame): void;
}

const config = seaConfig.lightShafts;

type Pair = readonly [number, number];

/** One kind of shaft: sea-config.ts says what each number is. */
interface ShaftKind {
  squareSize: number;
  squaresAcross: number;
  width: Pair;
  length: Pair;
  showsFrom: Pair;
  fadesAMetre: number;
  near: Pair;
  far: Pair;
  brightest: number;
  acrossTheLight: number;
  mostThrough: number;
}

/**
 * A ribbon for each shaft. Its corners carry position and nothing else: the side of the ribbon
 * (-1 or 1), how far along it they are (0 at the surface, 1 at its foot) and which shaft it is.
 */
function ribbons(count: number): BufferGeometry {
  const corners = new Float32Array(count * 4 * 3);
  const cornerOrder: number[] = [];
  for (let shaft = 0; shaft < count; shaft++) {
    corners.set([-1, 0, shaft, 1, 0, shaft, -1, 1, shaft, 1, 1, shaft], shaft * 4 * 3);
    const first = shaft * 4;
    cornerOrder.push(first, first + 1, first + 2, first + 1, first + 3, first + 2);
  }
  const shape = new BufferGeometry();
  shape.setAttribute('position', new BufferAttribute(corners, 3));
  shape.setIndex(cornerOrder);
  return shape;
}

export function createLightShafts({ scene, uniforms }: LightShaftsDependencies): LightShafts {
  const { uTime, uCameraPosition, uSunDirection, uSunColour } = uniforms;
  const surfaceHeight = { value: 0 };

  /** One kind's shafts, and how bright they are now (0 to 1, before the kind's own brightness). */
  function createKind(kind: ShaftKind): { shafts: Mesh; brightness: { value: number } } {
    const brightness = { value: 0 };
    const material = new ShaderMaterial({
      uniforms: {
        ...{ uTime, uCameraPosition, uSunDirection, uSunColour },
        uSurfaceHeight: surfaceHeight,
        uShaftBrightness: brightness,
      },
      defines: {
        SQUARE_SIZE: glslFloat(kind.squareSize),
        SQUARES_ACROSS: glslFloat(kind.squaresAcross),
        WIDTHS: glslVec2(...kind.width),
        LENGTHS: glslVec2(...kind.length),
        SHOWING: glslVec2(...kind.showsFrom),
        OWN_SHARE: glslFloat(config.ownShare),
        SWAY: glslFloat(config.sway),
        COMES_IN_OVER: glslFloat(config.comesInOver),
        FADES_A_METRE: glslFloat(kind.fadesAMetre),
        NEAR: glslVec2(...kind.near),
        FAR: glslVec2(...kind.far),
        TINT: glslVec3(...config.tint),
        ACROSS_THE_LIGHT: glslFloat(kind.acrossTheLight),
        MOST_THROUGH: glslFloat(kind.mostThrough),
      },
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      fog: false,
      vertexShader,
      fragmentShader,
    });
    const shafts = new Mesh(ribbons(kind.squaresAcross * kind.squaresAcross), material);
    // The shader puts every ribbon where it is: where the shape says they are means nothing.
    shafts.frustumCulled = false;
    // With the specks, after the water.
    shafts.renderOrder = 6;
    shafts.visible = false;
    scene.add(shafts);
    return { shafts, brightness };
  }

  const broad = createKind(config.kinds.broad);
  const fine = createKind(config.kinds.fine);

  return {
    update({ isCameraUnder, surfaceHeight: height, daylight, sunThrough }) {
      const sunHigh = smoothstep(0, config.fullWithSunAbove, uSunDirection.value.y);
      const light = daylight * sunThrough * sunHigh;
      surfaceHeight.value = height;
      broad.brightness.value = config.kinds.broad.brightest * light;
      fine.brightness.value = config.kinds.fine.brightest * light;
      broad.shafts.visible = fine.shafts.visible = isCameraUnder && light > 0;
    },
  };
}
