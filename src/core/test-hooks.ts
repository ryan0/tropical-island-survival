import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { SeaFloorPictures } from '../sea/sea-floor-pictures';
import type { BreakerArc } from '../sea/wave-model';
import type { GroundHeight, IslandRadius } from '../world/landmarks';

// The tests drive the page through a few names on `window`; tests/scene-hooks.d.ts says what
// each is for. The same tests drive the last merged build, to compare the two, so a name changed
// here leaves one comparison without pictures from before. This is the only file that reads or
// writes them.

type CameraPose = readonly [x: number, y: number, z: number, yaw: number, pitch: number];

/** What the tests call on the page. */
interface SceneHooks {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  endIntro(): void;
  stopClockAt(waveTime: number): void;
  jumpToTimeOfDay(dayPhase: number): void;
  fixSunHeight(elevation: number): void;
  placePlayer(x: number, z: number, yaw: number, pitch: number): void;
  groundHeight(x: number, z: number): number;
  waveHeight(x: number, z: number, waveTime: number, withoutBreaking: boolean): number;
  islandRadius(direction: number): number;
  waveShaderSource(): string;
  seaFloor: SeaFloorPictures;
  breakerArc: BreakerArc;
  breakerFrontPoint(
    partWay: number,
    crestStage: number,
    hollowness: number,
  ): readonly [number, number];
}

declare global {
  interface Window {
    __scene?: SceneHooks;
    __isClockStopped?: boolean;
    __cameraPose?: CameraPose;
    __wind?: number;
    __cloudCover?: number;
    __isAutomaticQualityOff?: boolean;
    __cloudPictureWidth?: number;
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
  seaFloor: SeaFloorPictures;
  breakerArc: BreakerArc;
  /** The breaking front's cross-section (sea/breaker-shapes.ts), to draw beside footage. */
  breakerFrontPoint: (
    partWay: number,
    crestStage: number,
    hollowness: number,
  ) => readonly [number, number];
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
    isAutomaticQualityOff: window.__isAutomaticQualityOff === true,
    cloudPictureWidth: window.__cloudPictureWidth,

    isClockStopped: () => window.__isClockStopped === true,
    stopClock(isStopped) {
      window.__isClockStopped = isStopped;
    },
    cloudCover: () => window.__cloudCover,
    wind: () => window.__wind,
    cameraPose: () => window.__cameraPose,

    install(systems) {
      window.__scene = {
        scene: systems.scene,
        camera: systems.camera,
        renderer: systems.renderer,
        endIntro: systems.endIntro,
        stopClockAt(waveTime) {
          window.__isClockStopped = true;
          systems.setWaveTime(waveTime);
        },
        jumpToTimeOfDay(dayPhase) {
          systems.fixSunHeight(null);
          systems.jumpToTimeOfDay(dayPhase);
        },
        fixSunHeight: systems.fixSunHeight,
        placePlayer: systems.placePlayer,
        groundHeight: systems.groundHeight,
        waveHeight: systems.waveHeight,
        islandRadius: systems.islandRadius,
        waveShaderSource: systems.waveShaderSource,
        seaFloor: systems.seaFloor,
        breakerArc: systems.breakerArc,
        breakerFrontPoint: systems.breakerFrontPoint,
      };
    },
  };
}
