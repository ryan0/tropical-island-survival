import {
  Box3,
  InstancedMesh,
  LinearFilter,
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
import type { SeaSeenFromAbove } from './water-as-fog';
import type { WaterMaterials } from './water-materials';

// What is under the sea, as a picture drawn before each frame, for the sea's surface to read.
//
// Drawn straight onto the screen, a thing under water is where it would be with no water there,
// as sharp as in air, and the surface can only tint it: it reads as paint on a sheet. Water bends
// the eye's line at every ripple, so what is under it shimmers and its edges break up, and that
// is most of what makes it look like water. For the surface to bend what is behind it, what is
// behind it must be a picture it can read a little to one side: so everything that the water
// veils (everything that takes the scene's fog) is drawn first into this one, half the screen's
// size, each thing as it is and with its depth under the sea beside its colour
// (water-as-fog.ts). The surface then draws the water over each thing by the thing's own depth
// (water.frag.glsl), which also ends its guessing at what lies behind it.
//
// It is a trial (20 November 2026, docs/ROADMAP.md): the scene's triangles are drawn twice, and
// only the phone can say what that costs. Off, nothing here is drawn and the surface is as before.

// Things on this layer are not drawn into the picture: the sea's surfaces, the sky and all else
// that takes no fog, and whatever stands still and wholly above the sea. The eye sees this layer
// and the first.
const NOT_IN_PICTURE = 1;
// The sea is never behind a thing whose lowest point is this far above the still sea (m): no wave
// stands so high where anything stands.
const CLEAR_OF_THE_SEA = 1.5;
// Where in an instance's matrix its height is.
const HEIGHT_IN_MATRIX = 13;
const NUMBERS_IN_A_MATRIX = 16;
// The picture's size as a share of the screen's, each way.
const SHARE_OF_SCREEN = 0.5;

export interface UnderWaterPictureDependencies {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  uniforms: SharedUniforms;
  seaSeenFromAbove: SeaSeenFromAbove;
  waterMaterials: Pick<WaterMaterials, 'show'>;
}

export interface UnderWaterPicture {
  /** Whether the picture is drawn each frame and the sea's surface reads it. */
  readonly isDrawn: boolean;
  draw(on: boolean): void;
  /**
   * Sorts the scene into what the picture holds and what it does not. Call once everything is
   * in the scene: a thing added later is drawn into the picture whatever it is.
   */
  sortScene(): void;
  /** Draws the picture for the frame about to be drawn, if it is wanted and the eye is above the sea. */
  update(isCameraUnderWater: boolean, isSeaDrained: boolean): void;
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

export function createUnderWaterPicture(
  dependencies: UnderWaterPictureDependencies,
): UnderWaterPicture {
  const { renderer, scene, camera, uniforms, seaSeenFromAbove, waterMaterials } = dependencies;
  const picture = new WebGLRenderTarget(1, 1, {
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: false,
    depthBuffer: true,
    stencilBuffer: false,
  });
  // (Drawn as the screen is, so that every material is compiled once for both.)
  picture.texture.encoding = renderer.outputEncoding;
  uniforms.uUnderWaterPicture.value = picture.texture;
  camera.layers.enable(NOT_IN_PICTURE);

  const screen = new Vector2();
  let isWanted = false;

  return {
    get isDrawn() {
      return isWanted;
    },

    draw(on) {
      isWanted = on;
    },

    sortScene() {
      const clearOfTheSea = uniforms.uSeaLevel.value + CLEAR_OF_THE_SEA;
      scene.updateMatrixWorld();
      scene.traverse((thing: Object3D & { material?: Material | Material[] }) => {
        if (thing.material === undefined) return;

        const lowest = lowestPointOf(thing);
        if (takesNoFog(thing.material) || (lowest !== null && lowest > clearOfTheSea)) {
          thing.layers.set(NOT_IN_PICTURE);
        }
      });
    },

    update(isCameraUnderWater, isSeaDrained) {
      const isDrawnNow = isWanted && !isCameraUnderWater && !isSeaDrained;
      uniforms.uPictureDrawn.value = isDrawnNow ? 1 : 0;
      if (!isDrawnNow) return;

      renderer.getDrawingBufferSize(screen);
      const width = Math.max(1, Math.round(screen.x * SHARE_OF_SCREEN));
      const height = Math.max(1, Math.round(screen.y * SHARE_OF_SCREEN));
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
      seaSeenFromAbove.drawIntoPicture(true);
      camera.layers.disable(NOT_IN_PICTURE);
      renderer.setRenderTarget(picture);

      renderer.render(scene, camera);

      renderer.setRenderTarget(null);
      camera.layers.enable(NOT_IN_PICTURE);
      seaSeenFromAbove.drawIntoPicture(false);
      waterMaterials.show(true);
      renderer.setClearAlpha(clearAlpha);
      renderer.shadowMap.needsUpdate = shadowsAreDue;
    },
  };
}
