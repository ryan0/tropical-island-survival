import {
  DirectionalLight,
  HemisphereLight,
  Vector3,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { smoothstep } from '../core/maths';
import { lightsConfig } from './lights-config';

export interface LightsDependencies {
  scene: Scene;
  renderer: WebGLRenderer;
  /** The player's camera. */
  camera: Camera;
}

export interface LightsFrame {
  /** The unit vector towards the sun. */
  sunDirection: Vector3;
  /** 0 at night to 1 in full day. */
  daylight: number;
  /** 0 by day to 1 at night. */
  night: number;
  /** The sun's height above the horizon, in radians. */
  sunElevation: number;
  /** Red, green, blue. */
  sunColour: readonly [number, number, number];
  /** How much of the sun gets through the clouds to the camera, 0 to 1. */
  sunThrough: number;
}

export interface Lights {
  /** The automatic quality steps turn its shadows off on a slow phone. */
  sunLight: DirectionalLight;
  update(frame: LightsFrame): void;
}

const { shadows, hemisphere, sun, moon: moonConfig } = lightsConfig;

// Shadows are drawn into a picture (the shadow map) of a square box of the world. On foot the box is 96 m across
// and sits ahead of the camera, where you are looking, so a dot of the map is under 5 cm and palm fronds throw
// sharp dappled shade. The higher the camera, the bigger the box, up to the whole island seen from the air.
// Nothing that casts a shadow moves, so the picture is only redrawn when it has to be: when the box must move
// (in steps of whole dots, so shadows never shimmer) or change size, or when the sun has moved.
export function createLights({ scene, renderer, camera }: LightsDependencies): Lights {
  // (Colours and strengths are set afresh every frame.)
  const hemisphereLight = new HemisphereLight(0xffffff, 0x9a8a66, 0.8);
  scene.add(hemisphereLight);
  const sunLight = new DirectionalLight(0xffffff, 1);
  scene.add(sunLight);
  scene.add(sunLight.target);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(shadows.mapSize, shadows.mapSize);
  sunLight.shadow.bias = shadows.bias;
  renderer.shadowMap.autoUpdate = false;
  const moon = new DirectionalLight(moonConfig.colour, 0);
  moon.position.set(...moonConfig.position);
  scene.add(moon);

  // What the shadow map was last drawn for.
  let drawnHalfWidth = 0;
  let drawnWasLive = false;
  const drawnBoxMiddle = new Vector3();
  const drawnSunDirection = new Vector3();

  const cameraLook = new Vector3();
  const boxMiddle = new Vector3();
  const boxRight = new Vector3();
  const boxUp = new Vector3();

  function updateSunLight(frame: LightsFrame): void {
    const { daylight, night, sunElevation, sunThrough } = frame;
    const sunShows = 1 - night;
    const boost =
      1 +
      sun.lowSunBoost *
        (1 - smoothstep(sun.boostFullElevation, sun.boostGoneElevation, sunElevation));
    const fadeIn = Math.max(0, Math.min(1, sunElevation * sun.fadeInSlope + sun.fadeInOffset));
    sunLight.color.setRGB(frame.sunColour[0], frame.sunColour[1], frame.sunColour[2]);
    // The sun is warm and strong and the sky fills the shade with blue, so shade is clearly cooler than sunlit
    // ground.
    sunLight.intensity =
      sunShows *
      (sun.base + sun.dayRange * daylight) *
      boost *
      fadeIn *
      (sun.cloudFloor + sun.cloudRange * sunThrough);
    sunLight.visible = sunLight.intensity > sun.visibleAbove;
  }

  function halfWidthWanted(): number {
    return shadows.halfWidthAtGround + camera.position.y * shadows.halfWidthPerMetreOfHeight;
  }

  function boxHalfWidth(): number {
    const wanted = halfWidthWanted();
    const sizes = shadows.boxHalfWidths;
    let size = 0;
    while (size < sizes.length - 1 && sizes[size] < wanted) size++;
    const half = sizes[size];
    if (drawnHalfWidth === 0 || half === drawnHalfWidth) return half;
    const sizeDrawn = (sizes as readonly number[]).indexOf(drawnHalfWidth);
    const nearer = sizes[Math.min(size, sizeDrawn)];
    return Math.abs(wanted - nearer) < shadows.sizeSlack ? drawnHalfWidth : half;
  }

  // On the ground ahead of the camera: where the view meets the ground, but no further than a share of the
  // half-width.
  function placeBoxAhead(half: number): void {
    const position = camera.position;
    camera.getWorldDirection(cameraLook);
    const alongGround = Math.hypot(cameraLook.x, cameraLook.z);
    const ahead = Math.min(
      half * shadows.furthestAheadShare,
      cameraLook.y < shadows.lookDownLimit
        ? (position.y * alongGround) / -cameraLook.y
        : shadows.skyReach,
    );
    const hasDirection = alongGround > shadows.flatLookLimit;
    boxMiddle.set(
      position.x + (hasDirection ? (cameraLook.x / alongGround) * ahead : 0),
      0,
      position.z + (hasDirection ? (cameraLook.z / alongGround) * ahead : 0),
    );
  }

  // Rounded to a step of whole dots along the shadow map's own axes.
  function snapBoxToDots(half: number, sunDirection: Vector3): void {
    const step = (shadows.stepInDots * 2 * half) / shadows.mapSize;
    boxRight.set(sunDirection.z, 0, -sunDirection.x);
    if (boxRight.lengthSq() < shadows.overheadLimit) boxRight.set(...shadows.overheadRight);
    boxRight.normalize();
    boxUp.crossVectors(sunDirection, boxRight);
    const right = Math.round(boxMiddle.dot(boxRight) / step) * step;
    const up = Math.round(boxMiddle.dot(boxUp) / step) * step;
    const towardsSun = Math.round(boxMiddle.dot(sunDirection) / step) * step;
    boxMiddle
      .set(0, 0, 0)
      .addScaledVector(boxRight, right)
      .addScaledVector(boxUp, up)
      .addScaledVector(sunDirection, towardsSun);
  }

  function resizeShadowCamera(half: number): void {
    const shadowCamera = sunLight.shadow.camera;
    const reach = half * shadows.reachPerHalfWidth + shadows.reachExtra;
    shadowCamera.left = shadowCamera.bottom = -half;
    shadowCamera.right = shadowCamera.top = half;
    shadowCamera.near = 1;
    shadowCamera.far = reach * 2;
    shadowCamera.updateProjectionMatrix();
    sunLight.shadow.normalBias = (shadows.normalBiasInDots * 2 * half) / shadows.mapSize;
    drawnHalfWidth = half;
  }

  function mustRedrawShadows(live: boolean, half: number, sunDirection: Vector3): boolean {
    return (
      !live ||
      !drawnWasLive ||
      half !== drawnHalfWidth ||
      boxMiddle.distanceToSquared(drawnBoxMiddle) > shadows.moveThresholdSquared ||
      sunDirection.dot(drawnSunDirection) < shadows.sunTurnCosine
    );
  }

  function updateShadows(sunDirection: Vector3): void {
    const live = sunLight.visible && sunLight.castShadow;
    const half = boxHalfWidth();
    placeBoxAhead(half);
    snapBoxToDots(half, sunDirection);
    if (mustRedrawShadows(live, half, sunDirection)) {
      if (half !== drawnHalfWidth) resizeShadowCamera(half);
      drawnBoxMiddle.copy(boxMiddle);
      drawnSunDirection.copy(sunDirection);
      sunLight.target.position.copy(boxMiddle);
      sunLight.position
        .copy(sunDirection)
        .multiplyScalar(drawnHalfWidth * shadows.reachPerHalfWidth + shadows.reachExtra)
        .add(boxMiddle);
      renderer.shadowMap.needsUpdate = true;
    }
    drawnWasLive = live;
  }

  function updateAmbientLight(frame: LightsFrame): void {
    const { daylight: d, night, sunThrough } = frame;
    const sunShows = 1 - night;
    const sky = hemisphere.skyInLowSun;
    const skyDay = hemisphere.skyByDay;
    const ground = hemisphere.groundInLowSun;
    const groundDay = hemisphere.groundByDay;
    hemisphereLight.color.setRGB(
      sky[0] + (skyDay[0] - sky[0]) * d,
      sky[1] + (skyDay[1] - sky[1]) * d,
      sky[2] + (skyDay[2] - sky[2]) * d,
    );
    hemisphereLight.groundColor.setRGB(
      ground[0] + (groundDay[0] - ground[0]) * d,
      ground[1] + (groundDay[1] - ground[1]) * d,
      ground[2] + (groundDay[2] - ground[2]) * d,
    );
    hemisphereLight.intensity =
      (hemisphere.base +
        hemisphere.dayShare *
          (1 - hemisphere.nightDimming * night) *
          (hemisphere.dayFloor + hemisphere.dayRange * d) +
        hemisphere.eveningGlow * (1 - d) * sunShows) *
      (hemisphere.cloudFloor + hemisphere.cloudRange * sunThrough);
  }

  return {
    sunLight,
    update(frame) {
      moon.intensity = frame.night * moonConfig.strengthAtNight;
      updateSunLight(frame);
      updateShadows(frame.sunDirection);
      updateAmbientLight(frame);
    },
  };
}
