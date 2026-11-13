// What a page holding the scene must offer for the tests to drive it. The names are build 78's,
// so the same tests can drive the legacy page and the new build; they stay until legacy/ is gone.

interface SceneDebugHooks {
  /** Ends the opening fly-in. */
  skip(): void;
  /** Stops the wave clock at `waveTime` seconds; weather, wind and clouds then hold still too. */
  freeze(waveTime: number): void;
  /** Time of day: 0 midnight, 0.5 noon. */
  phase(dayPhase: number): void;
  /** A sun height in radians that overrides the time of day. */
  sun(elevation: number): void;
  /** Puts the player somewhere, facing a direction. */
  set(x: number, z: number, yaw: number, pitch: number): void;
  /** Ground height at a point. */
  hgt(x: number, z: number): number;
  /** Water height at a point and wave time, as the program computes it. */
  waveH(x: number, z: number, waveTime: number, withoutBreakingLip: boolean): number;
  /** Distance from the atoll's centre to the outer shoreline, in a direction. */
  islandR(th: number): number;
  /** The wave model as the shader has it, ready to compile on its own. */
  glslWaves(): string;
  cam: { fov: number; updateProjectionMatrix(): void };
  scene: object;
  renderer: {
    compile(scene: object, camera: object): void;
    info: { programs: object[] | null };
  };
}

interface Window {
  __lag: SceneDebugHooks;
  /** Camera placed by the tests: x, y, z, yaw, pitch. */
  __fly?: [number, number, number, number, number];
  /** Set by `freeze`; cleared to let the wave clock and the weather run again. */
  __freeze?: boolean;
  /** Wind strength and cloud cover while the clock is frozen. */
  __wind?: number;
  __weather?: number;
  /** Read once as the page loads: no automatic quality steps; the width of the cloud pictures. */
  __noq?: number;
  __cloudW?: number;
  /** Added by the tests (scene-page.ts): the only thing that makes time pass in the page. */
  __runFrames(count: number, millisecondsEach: number): void;
}
