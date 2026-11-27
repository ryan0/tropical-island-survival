import {
  Box3,
  InstancedMesh,
  type BufferAttribute,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  PlaneGeometry,
  RGBAFormat,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Material,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import type { SharedUniforms } from '../core/shared-uniforms';
import type { Terrain } from '../world/terrain';
import { seaConfig } from './sea-config';
import type { SeaReach } from './sea-reach';
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
// It costs the scene's triangles near the sea's surface drawn twice. What lies so deep that the
// surface always covers it is drawn into the picture alone, while there is a picture: the ground
// by leaving out the triangles of each tile that lie so deep (world/terrain.ts), and coral and
// the like by a layer of their own. No depth texture is read (docs/DEVICE_NOTES.md): the depth
// is a number each thing writes beside its colour. While the eye is under the water the picture
// is not drawn, and the water between the eye and a thing is the fog's (through-water.glsl).

const config = seaConfig.underWaterPicture;
// Things on this layer are not drawn into the picture: the sea's surfaces, the sky and all else
// that takes no fog, and whatever stands still and wholly above the sea. The eye sees this layer
// and the first.
const NOT_IN_PICTURE = 1;
// Things on this layer are drawn into the picture alone, while one is drawn: what stands still
// and wholly under the lowest the sea's surface goes (and casts no shadow: three.js draws the
// shadows by what the frame's own drawing sees).
const ONLY_IN_PICTURE = 2;
// The ground is drawn second of all that is solid (world/terrain.ts), and the sea's backing after it.
const BACKING_DRAWN_AFTER_GROUND = 2;
// Where in an instance's matrix its place is.
const X_IN_MATRIX = 12;
const HEIGHT_IN_MATRIX = 13;
const Z_IN_MATRIX = 14;
const NUMBERS_IN_A_MATRIX = 16;

type InstancesInASquare = Pick<InstancedMesh, 'geometry' | 'instanceMatrix' | 'count' | 'position'>;

export interface UnderWaterPictureDependencies {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  uniforms: SharedUniforms;
  intoSeaPicture: IntoSeaPicture;
  waterMaterials: Pick<WaterMaterials, 'show'>;
  /** How far the sea's surface ever goes from its still level, at a place. */
  seaReach: SeaReach;
  /** The ground, which leaves out of a drawing what the sea always covers. */
  ground: Pick<Terrain, 'drawWhatSeaCovers'>;
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
  /**
   * A cost switch: whether the picture's smaller, softer copies of itself are made each frame
   * (they are, wherever the graphics card can make them). Without them nothing is smeared by
   * the ripples.
   */
  readonly hasSofterCopies: boolean;
  keepSofterCopies(areKept: boolean): void;
  /**
   * A cost switch: whether what the sea's surface always covers is drawn onto the screen as well
   * as into the picture, as everything under the sea once was.
   */
  readonly isCoveredDrawnTwice: boolean;
  drawCoveredTwice(isDrawnTwice: boolean): void;
}

function takesNoFog(material: Material | Material[]): boolean {
  return Array.isArray(material) ? material.every((each) => !each.fog) : !material.fog;
}

const bounds = new Box3();
const boundsOfShape = new WeakMap<object, Box3>();

/**
 * Whether every one of a square of instances lies wholly under the lowest the sea's surface
 * goes where it stands. (By the box round its shape, turned and sized as the instance is.)
 */
function areAllAlwaysUnderSea(
  thing: InstancesInASquare,
  seaLevel: number,
  { alwaysUnder }: SeaReach,
): boolean {
  const corners = thing.geometry.getAttribute('position') as BufferAttribute;
  let box = boundsOfShape.get(corners);
  if (box === undefined) {
    box = new Box3().setFromBufferAttribute(corners);
    boundsOfShape.set(corners, box);
  }
  const places = thing.instanceMatrix.array;
  for (let i = 0; i < thing.count; i++) {
    const at = i * NUMBERS_IN_A_MATRIX;
    // (the highest corner of the box: each of its three sides adds what it can)
    const top =
      thing.position.y +
      places[at + HEIGHT_IN_MATRIX] +
      Math.max(places[at + 1] * box.min.x, places[at + 1] * box.max.x) +
      Math.max(places[at + 5] * box.min.y, places[at + 5] * box.max.y) +
      Math.max(places[at + 9] * box.min.z, places[at + 9] * box.max.z);
    const x = thing.position.x + places[at + X_IN_MATRIX];
    const z = thing.position.z + places[at + Z_IN_MATRIX];
    if (top > seaLevel - alwaysUnder(x, z)) return false;
  }
  return thing.count > 0;
}

/**
 * Whether every one of a square of instances stands where the sea never reaches. (By where each
 * stands: none here hangs below its own foot.)
 */
function areAllClearOfSea(
  thing: InstancesInASquare,
  seaLevel: number,
  { clearAbove }: SeaReach,
): boolean {
  const places = thing.instanceMatrix.array;
  for (let i = 0; i < thing.count; i++) {
    const at = i * NUMBERS_IN_A_MATRIX;
    const foot = thing.position.y + places[at + HEIGHT_IN_MATRIX];
    const x = thing.position.x + places[at + X_IN_MATRIX];
    const z = thing.position.z + places[at + Z_IN_MATRIX];
    if (foot <= seaLevel + clearAbove(x, z)) return false;
  }
  return true;
}

/**
 * Whether a thing that is no square of instances stands clear of the sea: one that stands still
 * (a mesh that is never moved), wholly above the highest the sea stands anywhere. Of anything
 * that moves, nothing can be said once and for all.
 */
function isClearOfSea(thing: Object3D, seaLevel: number): boolean {
  return (
    thing instanceof Mesh &&
    !thing.matrixAutoUpdate &&
    bounds.setFromObject(thing).min.y > seaLevel + config.clearOfTheSea.offshore
  );
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
  const { seaReach, ground } = dependencies;
  // Where the graphics card can make them for a picture of any size (WebGL 2), the picture keeps
  // smaller copies of itself, each half the last: the surface reads a small one where the fine
  // ripples would smear what is under them (water.frag.glsl, SMEARED_BY_FINE_RIPPLES). They are
  // made every frame, whether or not any is read: a picture that is to have copies and has none
  // reads as nothing at all, and the sea lost its floor.
  const hasSofterCopies = canPictureBeSoftened(renderer);
  const picture = new WebGLRenderTarget(1, 1, {
    format: RGBAFormat,
    minFilter: hasSofterCopies ? LinearMipmapLinearFilter : LinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: hasSofterCopies,
    depthBuffer: true,
    // (Asked for only for what comes with it: a depth of 24 bits. A picture with no stencil gets
    // a depth of 16, which from 40 m up cannot tell a coral head's top from the floor a metre
    // under it: from the air the heads were drawn in stripes of themselves and the floor.)
    stencilBuffer: true,
  });
  // (Drawn as the screen is, so that every material is compiled once for both.)
  picture.texture.encoding = renderer.outputEncoding;
  uniforms.uUnderWaterPicture.value = picture.texture;
  camera.layers.enable(NOT_IN_PICTURE);

  const screen = new Vector2();
  let areSofterCopiesKept = hasSofterCopies;
  let smearingWithCopies = uniforms.uSmearingShare.value;
  let isCoveredDrawnTwice = false;
  const usuallyDrawsFrom = camera.near;

  // What shows through a crack between two of the sea's sheets, while the floor under them is
  // left out of the screen's drawing: the picture, straight behind the crack. Drawn after the
  // ground and before the sea, wherever nothing nearer has been drawn. (It takes no fog, and so
  // is itself sorted out of the picture. And it writes its depth as any solid thing does: the
  // sky is drawn last, wherever nothing has.)
  const backing = new Mesh(
    new PlaneGeometry(2 * config.backing.reach, 2 * config.backing.reach).rotateX(-Math.PI / 2),
    new ShaderMaterial({
      uniforms: {
        uUnderWaterPicture: uniforms.uUnderWaterPicture,
        uDotOfPicture: uniforms.uDotOfPicture,
      },
      vertexShader:
        'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      // (Where the picture holds nothing, past the last of the ground, this draws nothing either:
      // the sky is behind such a crack, as it was.)
      fragmentShader: [
        'uniform sampler2D uUnderWaterPicture;',
        'uniform vec2 uDotOfPicture;',
        'void main() {',
        '  vec4 held = texture2D(uUnderWaterPicture, gl_FragCoord.xy * uDotOfPicture);',
        '  if (held.a > 0.995) discard;',
        '  gl_FragColor = vec4(held.rgb, 1.0);',
        '}',
      ].join('\n'),
      fog: false,
    }),
  );
  backing.frustumCulled = false;
  backing.renderOrder = BACKING_DRAWN_AFTER_GROUND;
  backing.visible = false;
  scene.add(backing);

  /** What the sea always covers is drawn onto the screen by the drawing that follows, or left out of it. */
  function drawWhatSeaCovers(isDrawn: boolean): void {
    if (isDrawn) camera.layers.enable(ONLY_IN_PICTURE);
    else camera.layers.disable(ONLY_IN_PICTURE);
    ground.drawWhatSeaCovers(isDrawn);
    backing.visible = !isDrawn;
  }

  /** The nearest the camera draws at: nearer than usual for an eye low over the sea. */
  function drawFrom(distance: number): void {
    if (camera.near === distance) return;

    camera.near = distance;
    camera.updateProjectionMatrix();
  }

  return {
    get hasSofterCopies() {
      return areSofterCopiesKept;
    },
    keepSofterCopies(areKept) {
      if (!hasSofterCopies || areKept === areSofterCopiesKept) return;

      areSofterCopiesKept = areKept;
      // (A picture that is to have copies and has none reads as nothing: so it is told that it
      // has none, and made afresh, and the surface asks for nothing softer than its own dots.)
      picture.texture.generateMipmaps = areKept;
      picture.texture.minFilter = areKept ? LinearMipmapLinearFilter : LinearFilter;
      picture.dispose();
      if (areKept) uniforms.uSmearingShare.value = smearingWithCopies;
      else {
        smearingWithCopies = uniforms.uSmearingShare.value;
        uniforms.uSmearingShare.value = 0;
      }
    },

    get isCoveredDrawnTwice() {
      return isCoveredDrawnTwice;
    },
    drawCoveredTwice(isDrawnTwice) {
      isCoveredDrawnTwice = isDrawnTwice;
    },

    sortScene() {
      const seaLevel = uniforms.uSeaLevel.value;
      scene.updateMatrixWorld();
      scene.traverse((thing: Object3D & { material?: Material | Material[] }) => {
        if (thing.material === undefined) return;

        const isSquareOfInstances = thing instanceof InstancedMesh && !thing.matrixAutoUpdate;
        const isClear = isSquareOfInstances
          ? areAllClearOfSea(thing, seaLevel, seaReach)
          : isClearOfSea(thing, seaLevel);
        if (takesNoFog(thing.material) || isClear) {
          thing.layers.set(NOT_IN_PICTURE);
        } else if (
          isSquareOfInstances &&
          !thing.castShadow &&
          areAllAlwaysUnderSea(thing, seaLevel, seaReach)
        ) {
          thing.layers.set(ONLY_IN_PICTURE);
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
      const { within, drawsFrom } = config.eyeLowOverSea;
      drawFrom(isDrawn && eyeOverSea < within ? drawsFrom : usuallyDrawsFrom);
      // (With no picture, the screen is all there is to draw what is under the sea.)
      drawWhatSeaCovers(true);
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
      camera.layers.disable(NOT_IN_PICTURE);
      renderer.setRenderTarget(picture);

      renderer.render(scene, camera);

      renderer.setRenderTarget(null);
      camera.layers.enable(NOT_IN_PICTURE);
      drawWhatSeaCovers(isCoveredDrawnTwice);
      backing.position.set(
        camera.position.x,
        uniforms.uSeaLevel.value - config.backing.under,
        camera.position.z,
      );
      intoSeaPicture.end();
      waterMaterials.show(true);
      renderer.setClearAlpha(clearAlpha);
      renderer.shadowMap.needsUpdate = shadowsAreDue;
    },
  };
}
