import {
  Box3,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  RGBAFormat,
  Vector2,
  WebGLRenderTarget,
  type Material,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import type { SharedUniforms } from '../core/shared-uniforms';
import { seaConfig } from './sea-config';
import type { IntoSeaPicture } from './water-as-fog';
import type { WaterMaterials } from './water-materials';

// What is under the sea, as a picture drawn before each frame, for the sea's surface to read.
//
// Drawn straight onto the screen, a thing under water is where it would be with no water there,
// as sharp as in air, and the surface can only tint it: it reads as paint on a sheet. Water bends
// the eye's line at every ripple, so what is under it shimmers and its edges break up, and that
// is most of what makes it look like water. For the surface to bend what is behind it, what is
// behind it must be a picture it can read a little to one side: so everything that the water
// can lie over (everything that takes the scene's fog, but what stands still and clear of the
// sea) is drawn first into this one, a share of the screen's size, each thing as the light that
// reaches it leaves it, with its depth under the sea beside its colour, and raised to where it
// seems to be through a flat surface (water-as-fog.ts, raised-through-surface.glsl). The surface
// then draws all that the water does to the look of each thing, by the thing's own depth, and
// adds its ripples' bending (water.frag.glsl, shaders/shared/water-veil.glsl): nothing under the
// sea draws any of that on itself, and the surface need not guess at what lies behind it.
//
// It costs the scene's triangles under and near the sea drawn twice. No depth texture is read
// (docs/DEVICE_NOTES.md): the depth is a number each thing writes beside its colour. While the
// eye is under the water the picture is not drawn, and the water between the eye and a thing is
// the fog's (through-water.glsl).

const config = seaConfig.underWaterPicture;
// Things on this layer are not drawn into the picture: the sea's surfaces, the sky and all else
// that takes no fog, and whatever stands still and wholly above the sea. The eye sees this layer
// and the first.
const NOT_IN_PICTURE = 1;
// Where in an instance's matrix its height is.
const HEIGHT_IN_MATRIX = 13;
const NUMBERS_IN_A_MATRIX = 16;

export interface UnderWaterPictureDependencies {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  uniforms: SharedUniforms;
  intoSeaPicture: IntoSeaPicture;
  waterMaterials: Pick<WaterMaterials, 'show'>;
}

export interface UnderWaterPictureFrame {
  isCameraUnderWater: boolean;
  isSeaDrained: boolean;
  /**
   * How far the waves an eye afloat rides have lifted it, in metres: nought for an eye that
   * stands or flies.
   */
  eyeLiftedByWaves: number;
}

export interface UnderWaterPicture {
  /**
   * Sorts the scene into what the picture holds and what it does not. Call once everything is
   * in the scene: a thing added later is drawn into the picture whatever it is.
   */
  sortScene(): void;
  /** Draws the picture for the frame about to be drawn, while the eye is above a sea that is there. */
  update(frame: UnderWaterPictureFrame): void;
}

function takesNoFog(material: Material | Material[]): boolean {
  return Array.isArray(material) ? material.every((each) => !each.fog) : !material.fog;
}

const bounds = new Box3();

/**
 * The lowest a thing reaches, if it is one that stands still: a mesh that is never moved, or a
 * square of instances (by where each stands: none here hangs below its own foot). Of anything
 * that moves, nothing can be said once and for all.
 */
function lowestPointOf(thing: Object3D): number | null {
  if (thing instanceof InstancedMesh) {
    const places = thing.instanceMatrix.array;
    let lowest = Infinity;
    for (let i = 0; i < thing.count; i++) {
      lowest = Math.min(lowest, places[i * NUMBERS_IN_A_MATRIX + HEIGHT_IN_MATRIX]);
    }
    return thing.position.y + lowest;
  }
  if (thing instanceof Mesh && !thing.matrixAutoUpdate) {
    return bounds.setFromObject(thing).min.y;
  }
  return null;
}

/**
 * Whether the picture can keep smaller, softer copies of itself (mipmaps): the water's shaders
 * are compiled to read them or not by this (water-materials.ts).
 */
export function canPictureBeSoftened(renderer: WebGLRenderer): boolean {
  return renderer.capabilities.isWebGL2;
}

export function createUnderWaterPicture(
  dependencies: UnderWaterPictureDependencies,
): UnderWaterPicture {
  const { renderer, scene, camera, uniforms, intoSeaPicture, waterMaterials } = dependencies;
  // Where the graphics card can make them for a picture of any size (WebGL 2), the picture keeps
  // smaller copies of itself, each half the last: the surface reads a small one where the fine
  // ripples would smear what is under them (water.frag.glsl, SMEARED_BY_FINE_RIPPLES).
  const hasSofterCopies = canPictureBeSoftened(renderer);
  const picture = new WebGLRenderTarget(1, 1, {
    format: RGBAFormat,
    minFilter: hasSofterCopies ? LinearMipmapLinearFilter : LinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: hasSofterCopies,
    depthBuffer: true,
    stencilBuffer: false,
  });
  // (Drawn as the screen is, so that every material is compiled once for both.)
  picture.texture.encoding = renderer.outputEncoding;
  uniforms.uUnderWaterPicture.value = picture.texture;
  camera.layers.enable(NOT_IN_PICTURE);

  const screen = new Vector2();

  return {
    sortScene() {
      const clearOfTheSea = uniforms.uSeaLevel.value + config.clearOfTheSea;
      scene.updateMatrixWorld();
      scene.traverse((thing: Object3D & { material?: Material | Material[] }) => {
        if (thing.material === undefined) return;

        const lowest = lowestPointOf(thing);
        if (takesNoFog(thing.material) || (lowest !== null && lowest > clearOfTheSea)) {
          thing.layers.set(NOT_IN_PICTURE);
        }
      });
    },

    update({ isCameraUnderWater, isSeaDrained, eyeLiftedByWaves }) {
      const eyeOverSea = camera.position.y - uniforms.uSeaLevel.value;
      // The raising is worked out for a flat sea. A swimmer whom a wave lifts is lifted with the
      // water round him, so for him that sea lies as far under his eye as before, and the floor
      // further under it. (Worked out for the still sea's level, as if the sea had stayed down
      // and the eye alone gone up, a wave a hand's breadth high heaved the floor three metres
      // off by five degrees, where water lifted with the eye moves it two: measured, it was half
      // of all that moved under a swimmer on the reef flat, and it turned Ryan's stomach.)
      const eyeOverRaisingLevel = eyeOverSea - eyeLiftedByWaves;
      uniforms.uEyeOverRaisingLevel.value = eyeOverRaisingLevel;

      const isDrawn = !isCameraUnderWater && !isSeaDrained;
      uniforms.uPictureDrawn.value = isDrawn ? 1 : 0;
      if (!isDrawn) return;

      renderer.getDrawingBufferSize(screen);
      const width = Math.max(1, Math.round(screen.x * config.shareOfScreen));
      const height = Math.max(1, Math.round(screen.y * config.shareOfScreen));
      if (picture.width !== width || picture.height !== height) picture.setSize(width, height);
      uniforms.uDotOfPicture.value.set(1 / screen.x, 1 / screen.y);
      // (A metre across, a metre from the eye, as a share of the picture: half of what the
      // camera's projection makes of it, since the picture runs from 0 to 1 and not -1 to 1.)
      const projection = camera.projectionMatrix.elements;
      uniforms.uPictureScale.value.set(projection[0] / 2, projection[5] / 2);

      // The shadows are drawn by whichever drawing comes first in a frame, from what its camera
      // sees: that must be the frame's own, with the palms in it, not this one's.
      const shadowsAreDue = renderer.shadowMap.needsUpdate;
      renderer.shadowMap.needsUpdate = false;
      // (Nothing there is as good as the deepest water: the surface hides it.)
      const clearAlpha = renderer.getClearAlpha();
      renderer.setClearAlpha(1);
      waterMaterials.show(false);
      intoSeaPicture.begin(eyeOverSea, eyeOverRaisingLevel, uniforms.uRaisingShare.value);
      // (no copies are made while nothing reads them: with the smear's slider at nought)
      picture.texture.generateMipmaps = hasSofterCopies && uniforms.uSmearingShare.value > 0;
      camera.layers.disable(NOT_IN_PICTURE);
      renderer.setRenderTarget(picture);

      renderer.render(scene, camera);

      renderer.setRenderTarget(null);
      camera.layers.enable(NOT_IN_PICTURE);
      intoSeaPicture.end();
      waterMaterials.show(true);
      renderer.setClearAlpha(clearAlpha);
      renderer.shadowMap.needsUpdate = shadowsAreDue;
    },
  };
}
