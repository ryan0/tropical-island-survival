// The functions the build makes from src/sea/wave-timing/*.glsl (tools/glsl-for-program-plugin.ts), under the
// names they have in the shaders, where each is described.
declare module 'virtual:wave-timing' {
  export function swellSpeed(depth: number): number;
  export function setShare(wavesGoneBy: number, variety: number): number;
  export function sizeAlongCrest(waveSize: number, alongShore: number, variety: number): number;
  export function sizeOfWave(fullSize: number, th: number, turns: number, variety: number): number;
  export function usualSizeOfWave(fullSize: number, turns: number, variety: number): number;
  export function alongShoreSwing(th: number, t: number, variety: number): number;
  export function offshoreHeightOf(waveSize: number): number;
  export function breakingDepthOf(offshoreHeight: number): number;
  export function breakDepth0(): number;
  export function breakDepth1(): number;
  export function breakDepth2(): number;
  export function breakDepth3(): number;
  export function sinceCrossing(
    since0: number,
    since1: number,
    since2: number,
    since3: number,
    breakingDepth: number,
  ): number;
  export function shoalingSeconds(
    since0: number,
    since1: number,
    since2: number,
    since3: number,
    breakingDepth: number,
  ): number;
  export function lipFallSeconds(breakerHeight: number): number;
  export function secondsAStageAfter(): number;
  export function stageOf(sinceBreaking: number, lipFall: number): number;
  export function steepeningAt(stage: number): number;
  export function narrowingAt(stage: number): number;
  export function standingUpAt(crestStage: number): number;
  export function plungingFor(shoaling: number): number;
  export function frontWaveNumber(): number;
  export function frontFromCrest(phaseFromCrest: number, waveNumber: number): number;
  export function leanOf(waveNumber: number): number;
  export function secondsFromCrest(fromCrest: number, slowness: number): number;
  export function runsAhead(): number;
  export function runUpOf(
    fullSize: number,
    th: number,
    turnsAtWaterline: number,
    period: number,
    variety: number,
  ): number;
}
