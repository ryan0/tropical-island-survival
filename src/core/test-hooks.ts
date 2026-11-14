import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { GroundHeight, IslandRadius } from '../world/landmarks';

// The tests drive the page through a few names on `window`. They are build 78's names, so
// that the same tests can drive build 78 and this build alike; tests/scene-hooks.d.ts says what
// each is for. This is the only file that reads or writes them.

type CameraPose = readonly [x: number, y: number, z: number, yaw: number, pitch: number];

/** What the tests call on the page. */
interface SceneHooks {
  scene: Scene;
  cam: PerspectiveCamera;
  renderer: WebGLRenderer;
  skip(): void;
  freeze(waveTime: number): void;
  phase(dayPhase: number): void;
  sun(elevation: number): void;
  set(x: number, z: number, yaw: number, pitch: number): void;
  hgt(x: number, z: number): number;
  waveH(x: number, z: number, waveTime: number, withoutBreaking: boolean): number;
  islandR(direction: number): number;
  glslWaves(): string;
}

declare global {
  interface Window {
    __lag?: SceneHooks;
    __freeze?: boolean;
    __fly?: CameraPose;
    __wind?: number;
    __weather?: number;
    __noq?: number;
    __cloudW?: number;
  }
}

/** The parts of the scene the tests reach into. */
export interface HookedSystems {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  groundHeight: GroundHeight;
  islandRadius: IslandRadius;
  waveHeight: (x: number, z: number, time: number, withoutBreaking: boolean) => number;
  waveShaderSource: () => string;
  /** Sets the clock the waves run by. */
  setWaveTime: (time: number) => void;
  jumpToTimeOfDay: (phase: number) => void;
  fixSunHeight: (height: number | null) => void;
  placePlayer: (x: number, z: number, yaw: number, pitch: number) => void;
  endIntro: () => void;
}

export interface TestHooks {
  /** Asked for before the page was loaded: no automatic quality steps, and smaller cloud pictures. */
  readonly isAutomaticQualityOff: boolean;
  readonly cloudPictureWidth: number | undefined;
  /** While it is, the waves, the weather and the day stand still. */
  isClockStopped(): boolean;
  stopClock: (isStopped: boolean) => void;
  /** The weather a test has asked for while the clock is stopped, if it has. */
  cloudCover(): number | undefined;
  wind(): number | undefined;
  /** A pose a test has put the camera in, whatever the player does. */
  cameraPose(): CameraPose | undefined;
  install(systems: HookedSystems): void;
}

export function createTestHooks(): TestHooks {
  return {
    isAutomaticQualityOff: Boolean(window.__noq),
    cloudPictureWidth: window.__cloudW,

    isClockStopped: () => window.__freeze === true,
    stopClock(isStopped) {
      window.__freeze = isStopped;
    },
    cloudCover: () => window.__weather,
    wind: () => window.__wind,
    cameraPose: () => window.__fly,

    install(systems) {
      window.__lag = {
        scene: systems.scene,
        cam: systems.camera,
        renderer: systems.renderer,
        skip: systems.endIntro,
        freeze(waveTime) {
          window.__freeze = true;
          systems.setWaveTime(waveTime);
        },
        phase(dayPhase) {
          systems.fixSunHeight(null);
          systems.jumpToTimeOfDay(dayPhase);
        },
        sun: systems.fixSunHeight,
        set: systems.placePlayer,
        hgt: systems.groundHeight,
        waveH: systems.waveHeight,
        islandR: systems.islandRadius,
        glslWaves: systems.waveShaderSource,
      };
    },
  };
}
