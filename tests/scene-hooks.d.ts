// What a page holding the scene must offer for the tests to drive it (src/core/test-hooks.ts).
// The tests drive the reference build through them as well as the working files, so a hook
// renamed here leaves one review without pictures from before, until the change is merged.

/** As much of a three.js object as the tests read (scene-state.spec.ts). */
interface SceneObject {
  type: string;
  visible: boolean;
  matrixWorld: { elements: number[] };
  /** Many copies of one shape: how many are drawn, where each is and its colour. */
  count?: number;
  instanceMatrix?: { array: Float32Array };
  instanceColor?: { array: Float32Array } | null;
  geometry?: { attributes: { position?: { array?: Iterable<number> } } };
  material?: {
    type?: string;
    opacity?: number;
    color?: { getHex(): number };
    /** A material with a shader of its own. */
    fragmentShader?: string;
  };
}

interface SceneDebugHooks {
  /** Ends the opening fly-in. */
  endIntro(): void;
  /** Stops the wave clock at `waveTime` seconds; weather, wind and clouds then hold still too. */
  stopClockAt(waveTime: number): void;
  /** Time of day: 0 midnight, 0.5 noon. */
  jumpToTimeOfDay(dayPhase: number): void;
  /** A sun height in radians that overrides the time of day. */
  fixSunHeight(elevation: number): void;
  /** Puts the player somewhere, facing a direction. */
  placePlayer(x: number, z: number, yaw: number, pitch: number): void;
  groundHeight(x: number, z: number): number;
  /** Water height at a point and wave time, as the program computes it. */
  waveHeight(x: number, z: number, waveTime: number, withoutBreakingLip: boolean): number;
  /** Distance from the atoll's centre to the outer shoreline, in a direction. */
  islandRadius(th: number): number;
  /** The wave model as the shader has it, ready to compile on its own. */
  waveShaderSource(): string;
  /** The sea floor's pictures, which the wave model reads: each `size` dots square, four half floats a dot. */
  seaFloor: {
    size: number;
    floor: { image: { data: Uint16Array } };
    breaks: { image: { data: Uint16Array } };
  };
  /** The directions the breaker's own mesh covers, which the wave model reads too (radians). */
  breakerArc: { middle: number; halfWidth: number };
  camera: {
    fov: number;
    updateProjectionMatrix(): void;
    position: { x: number; y: number; z: number };
    /** Its pitch is its turn about x, its yaw about y. */
    rotation: { x: number; y: number };
    /** Where it is and how it is turned, as three.js keeps it: sixteen numbers, column by column. */
    matrixWorld: { elements: ArrayLike<number> };
    aspect: number;
  };
  scene: { traverse(visit: (object: SceneObject) => void): void };
  renderer: {
    compile(scene: object, camera: object): void;
    info: {
      programs: object[] | null;
      /** Whether the counts begin again at each drawing: three.js's own way. */
      autoReset: boolean;
      reset(): void;
      /** What has been drawn since the counts last began. */
      render: { triangles: number; calls: number };
    };
  };
}

interface Window {
  __scene: SceneDebugHooks;
  /** Camera placed by the tests: x, y, z, yaw, pitch. */
  __cameraPose?: [number, number, number, number, number];
  /** Set by `stopClockAt`; cleared to let the wave clock and the weather run again. */
  __isClockStopped?: boolean;
  /** Wind strength and cloud cover while the clock is stopped. */
  __wind?: number;
  __cloudCover?: number;
  /** Read once as the page loads: no automatic quality steps; the width of the cloud pictures. */
  __isAutomaticQualityOff?: boolean;
  __cloudPictureWidth?: number;
  /** Added by the tests (scene-page.ts): the only thing that makes time pass in the page. */
  __runFrames(count: number, millisecondsEach: number): void;
  /** Added by the tests (sound.spec.ts): the page's sound, to be rendered and not played. */
  __sound?: OfflineAudioContext;
}
