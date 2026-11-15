// The program's copy of the wave model in waves.glsl, for everything that must know where the
// water is and is not a shader: swimming, spray, footprints washed away, the boat.
//
// It reads the same two pictures of the sea floor as the shader (sea-floor-pictures.ts), and what
// the two must agree on about sizes and timing is written once, in wave-timing/timing.glsl, which
// both use. The shapes are written again here, name for name, so that the two can be read side by
// side; a test draws the shader's wave heights and compares them with these.
//
// This copy leaves out the hollow face and the falling lip of a breaking wave, which overhang: a
// spot has one height here, so it only lifts the crest. It also gathers what the spray needs to
// know of a breaking wave, which the shader has no use for.
//
// Distances are metres, times seconds, angles radians.

import {
  alongShoreSwing,
  breakingDepthOf,
  frontFromCrest,
  frontWaveNumber,
  leanOf,
  lipFallSeconds,
  narrowingAt,
  offshoreHeightOf,
  plungingFor,
  runsAhead,
  runUpOf,
  secondsAStageAfter,
  secondsFromCrest,
  shoalingSeconds,
  sinceCrossing,
  sizeOfWave,
  stageOf,
  standingUpAt,
  steepeningAt,
  swellSpeed,
  usualSizeOfWave,
} from 'virtual:wave-timing';
import { clamp, FULL_TURN, mix, smoothstep } from '../core/maths';
import type { IslandShape } from '../world/island-shape';
import { seaConfig, type Swell } from './sea-config';
import type { SeaFloorPictures } from './sea-floor-pictures';

/** What the wave model found at the spot it was last asked about. */
export interface WaveSpot {
  /**
   * The ground's height there: where the waves run, the beach as they feel it (shore.glsl);
   * further in, the real ground.
   */
  groundHeight: number;
  /** How high the swash is running up the beach. */
  runUp: number;
  /** 0 to 1: a lip is falling here. */
  fallingLip: number;
  /** 0 to 1: a lip is landing here. */
  landingLip: number;
  /** 0 to 1: a broken wave's front. */
  bore: number;
  /** Height of the breaking wave. */
  breakerHeight: number;
}

export interface WaveModel {
  /**
   * The height of the water's surface that the shader will draw at (x, z) at `time`; it renews
   * `spot` too. With `withoutBreaking` no wave stands up to plunge, as in the shader with its lip
   * switched off, which is how the tests compare the two.
   */
  heightAt: (x: number, z: number, time: number, withoutBreaking?: boolean) => number;
  /** Renewed by every call of heightAt. */
  readonly spot: WaveSpot;
}

const { swells, level } = seaConfig;
const HALF_TURN = FULL_TURN / 2;
const QUARTER_TURN = FULL_TURN / 4;
const FRONT_WAVE_NUMBER = frontWaveNumber();
const CHANNELS = 4;

// The wave mesh starts this far up the ocean beach. Inside it lie the land and the lagoon, whose
// water is still: the far sea draws it.
const WAVE_MESH_STARTS_UP_THE_BEACH = 9;

// shore.glsl's beach: s metres off it the sea is 5((1 + s / 55)² - 1) deep. The model reads the
// curve backwards, from the depth to how far off the beach a point is.
const BEACH_CURVE_LENGTH = 55;
const BEACH_CURVE_DEPTH = 5;

/** GLSL's mod: the remainder that takes the sign of `y`. */
function mod(x: number, y: number): number {
  return x - y * Math.floor(x / y);
}

export function createWaveModel(island: IslandShape, seaFloor: SeaFloorPictures): WaveModel {
  const spot: WaveSpot = {
    groundHeight: 0,
    runUp: 0,
    fallingLip: 0,
    landingLip: 0,
    bore: 0,
    breakerHeight: 0,
  };

  // What every swell meets at the spot. It is kept here, as are the crest heights, so that the
  // many calls a frame allocate nothing.
  const site = {
    th: 0,
    /** The sea floor's depth. */
    depth: 0,
    /** Seconds a metre: how slowly the swell travels here. */
    slowness: 0,
    /** The depth on the beach, as the swash feels it. */
    depthAtBeach: 0,
    /** 1 in the water, fading to 0 up the beach. */
    gate: 0,
    /** The breaks picture here: seconds since the swell crossed each of its four depths. */
    since0: 0,
    since1: 0,
    since2: 0,
    since3: 0,
  };
  // Each swell's crest height here: where crests cross, they stand up higher.
  const crestHeights = [0, 0];

  // Reading a picture between its dots, as a texture is read: the four dots round the point,
  // each weighed by how near it is. `lookAt` finds them; `read` weighs one of the picture's numbers.
  const { size, span, floorValues, breakValues, openSeaSpeed } = seaFloor;
  const corners = [0, 0, 0, 0];
  const weights = [0, 0, 0, 0];
  function lookAt(x: number, z: number): void {
    const column = (x / span + 0.5) * size - 0.5;
    const row = (z / span + 0.5) * size - 0.5;
    const column0 = Math.floor(column);
    const row0 = Math.floor(row);
    const alongRow = column - column0;
    const alongColumn = row - row0;
    const left = clamp(column0, 0, size - 1);
    const right = clamp(column0 + 1, 0, size - 1);
    const near = clamp(row0, 0, size - 1) * size;
    const far = clamp(row0 + 1, 0, size - 1) * size;
    corners[0] = near + left;
    corners[1] = near + right;
    corners[2] = far + left;
    corners[3] = far + right;
    weights[0] = (1 - alongRow) * (1 - alongColumn);
    weights[1] = alongRow * (1 - alongColumn);
    weights[2] = (1 - alongRow) * alongColumn;
    weights[3] = alongRow * alongColumn;
  }
  function read(values: Float32Array, channel: number): number {
    return (
      values[corners[0] * CHANNELS + channel] * weights[0] +
      values[corners[1] * CHANNELS + channel] * weights[1] +
      values[corners[2] * CHANNELS + channel] * weights[2] +
      values[corners[3] * CHANNELS + channel] * weights[3]
    );
  }

  // Adds one swell's wave to the surface height `surface` and returns the sum; what it finds of
  // breaking goes into `spot`. `turns` is the swell's crests gone by here, `fullSize` its size
  // here before sets. (waves.glsl's waveOfTrain, without the push and the foam.)
  function addSwell(
    surface: number,
    swell: Swell,
    index: number,
    turns: number,
    fullSize: number,
    withoutBreaking: boolean,
  ): number {
    const { th, depth, slowness, depthAtBeach, gate, since0, since1, since2, since3 } = site;
    const { variety } = swell;
    const frequency = FULL_TURN / swell.period;
    const trainPhase = FULL_TURN * (turns - Math.floor(turns) - 0.25);

    const waveSize = sizeOfWave(fullSize, th, turns, variety);
    const usualSize = usualSizeOfWave(fullSize, turns, variety);
    const inShallows = 1 - smoothstep(3, 9, depth);
    const phase = trainPhase + runsAhead() * frequency * (waveSize - usualSize) * inShallows;

    const feltDepth = clamp(depth, 0.12, 6);
    const shoaling = Math.pow(6 / feltDepth, 0.25);
    const offshoreHeight = offshoreHeightOf(waveSize);
    const usualOffshoreHeight = offshoreHeightOf(usualSize);
    const breakingDepth = breakingDepthOf(offshoreHeight);
    const usualBreakingDepth = breakingDepthOf(usualOffshoreHeight);
    const breakerHeight = 0.78 * breakingDepth;
    const usualBreakerHeight = 0.78 * usualBreakingDepth;

    const lipFallTime = lipFallSeconds(breakerHeight);
    const sinceBroke = sinceCrossing(since0, since1, since2, since3, breakingDepth);
    const usualSinceBroke = sinceCrossing(since0, since1, since2, since3, usualBreakingDepth);
    const stage = stageOf(sinceBroke, lipFallTime);
    const usualStage = stageOf(usualSinceBroke, lipFallSeconds(usualBreakerHeight));
    const steepening = steepeningAt(stage);

    const waveNumber = frequency * slowness;
    const phaseFromCrest =
      mod(phase - QUARTER_TURN + leanOf(waveNumber) * steepening + HALF_TURN, FULL_TURN) -
      HALF_TURN;
    const fromCrest = frontFromCrest(phaseFromCrest, waveNumber);
    const crestStage = stageOf(sinceBroke + secondsFromCrest(fromCrest, slowness), lipFallTime);
    const broken = smoothstep(0.95, 1.6, crestStage);
    const usualBroken = smoothstep(0.95, 1.6, usualStage);
    const breakingSpan = secondsAStageAfter() / slowness;

    // After breaking: white water that loses height as it crosses the flat, and stands up again
    // in the shore break until the water is too shallow to carry it.
    const shoreBreak = 1 - smoothstep(0.35, 1.3, depthAtBeach);
    const heightLimit = 0.66 * depthAtBeach + 0.04;
    const deeperThanItBroke = Math.max(feltDepth - 0.6 * breakingDepth, 0);
    const boreOnFlat =
      0.05 +
      0.12 * breakerHeight +
      0.55 * deeperThanItBroke +
      0.66 * breakerHeight * (1 - smoothstep(1.5, 6, crestStage));
    const boreHeight = Math.min(breakerHeight, boreOnFlat * (1 + 2.2 * shoreBreak), heightLimit);
    const usualDeeperThanItBroke = Math.max(feltDepth - 0.6 * usualBreakingDepth, 0);
    const usualBoreOnFlat =
      0.05 +
      0.12 * usualBreakerHeight +
      0.55 * usualDeeperThanItBroke +
      0.5 * usualBreakerHeight * (1 - smoothstep(1.5, 6, usualStage));
    const usualBoreHeight = Math.min(
      usualBreakerHeight,
      usualBoreOnFlat * (1 + 0.8 * shoreBreak),
      heightLimit,
    );
    const shoaledHeight = Math.min(offshoreHeight * shoaling, breakerHeight * 1.05);
    const usualShoaledHeight = Math.min(usualOffshoreHeight * shoaling, usualBreakerHeight * 1.05);
    const height = mix(shoaledHeight, boreHeight, broken) * gate;
    const usualHeight = mix(usualShoaledHeight, usualBoreHeight, usualBroken) * gate;

    // A long round back out at sea; a narrow peak in the shallows; white water once it has broken.
    const crestNarrowing = 1 + (Math.max(0.55 / waveNumber, 1) - 1) * narrowingAt(stage);
    const shapePhase =
      clamp(phaseFromCrest * crestNarrowing, -HALF_TURN, HALF_TURN) +
      QUARTER_TURN -
      0.45 * steepening;
    const sine = 0.5 + 0.5 * Math.sin(shapePhase + 0.45 * steepening * Math.sin(shapePhase));
    const swellShape = Math.pow(Math.max(sine, 1e-4), 2.4 + 3.6 * steepening);
    const boreFront = Math.min(0.75, 1.4 * FRONT_WAVE_NUMBER) * (1 - 0.6 * shoreBreak);
    const steepFront = smoothstep(-0.2 - boreFront, -0.2, fromCrest);
    const fallingBack = Math.exp(
      -Math.max(fromCrest, 0) * Math.max(0.6, 0.4 / FRONT_WAVE_NUMBER) * (1 + 0.9 * shoreBreak),
    );
    const boreShape =
      steepFront *
      fallingBack *
      (1 - smoothstep(1.2, 2.2, fromCrest)) *
      (1 +
        0.3 * Math.sin(th * 190 + fromCrest * 3 + variety) * Math.sin(th * 67 - trainPhase * 0.5));
    const shape = mix(swellShape, boreShape, broken);
    const crestHeight = 0.62 * height * shape;
    crestHeights[index] = crestHeight;
    const profileHeight = crestHeight - 0.22 * usualHeight;

    // A wave that meets a sudden shallow throws a lip; one that shoals gently crumbles.
    const plunging =
      plungingFor(shoalingSeconds(since0, since1, since2, since3, breakingDepth)) * swell.canPlunge;
    const standingUp = withoutBreaking ? 0 : standingUpAt(crestStage) * plunging;
    const lipFall = clamp(crestStage, 0, 1);
    const aheadOfFace = fromCrest + 1.4;
    const suck = -0.1 * height * standingUp * Math.exp((-aheadOfFace * aheadOfFace) / 0.35);
    const lipLanding =
      smoothstep(0.9, 1.15, crestStage) * (1 - smoothstep(1.5, 2.4, crestStage)) * plunging;
    const fromLanding = fromCrest + 0.4;
    const mound = 0.45 * breakerHeight * lipLanding * Math.exp((-fromLanding * fromLanding) / 0.16);
    // Standing up, its crest and its back (about 3.6 m long) are lifted: the shader's front
    // without the face and the lip, which overhang.
    const frontLift =
      (-0.22 * usualHeight - 0.1 * height + 1.15 * height - profileHeight) *
      standingUp *
      (fromCrest >= 0.1
        ? 1 - smoothstep(0, 1, (fromCrest - 0.1) / Math.min(1.1, 3.6 * FRONT_WAVE_NUMBER))
        : smoothstep(-0.5, -0.1, fromCrest));

    // What the spray wants to know.
    const bigEnough = smoothstep(0.03, 0.1, waveSize);
    const nearTheLip = smoothstep(-1.05, -0.5, fromCrest) * (1 - smoothstep(0.2, 0.55, fromCrest));
    const fadingOverFlat = Math.exp(-Math.max(stage - 1.6, 0) * breakingSpan * 0.1);
    spot.fallingLip = Math.max(
      spot.fallingLip,
      standingUp * nearTheLip * smoothstep(0.25, 0.9, lipFall) * bigEnough,
    );
    spot.landingLip = Math.max(
      spot.landingLip,
      lipLanding * Math.exp((-fromLanding * fromLanding) / 0.3) * bigEnough,
    );
    spot.bore = Math.max(
      spot.bore,
      broken *
        smoothstep(-0.2 - 1.25 * boreFront, -0.2 - 0.4 * boreFront, fromCrest) *
        (1 - smoothstep(-0.3, 0.6, fromCrest)) *
        bigEnough *
        fadingOverFlat,
    );
    spot.breakerHeight = Math.max(
      spot.breakerHeight,
      breakerHeight *
        Math.max(nearTheLip * standingUp, lipLanding, boreShape * broken * fadingOverFlat),
    );

    return surface + profileHeight + suck + mound + frontLift;
  }

  return {
    spot,

    heightAt(x, z, time, withoutBreaking = false) {
      const th = Math.atan2(z, x);
      const shoreline = island.radius(th);
      spot.fallingLip = 0;
      spot.landingLip = 0;
      spot.bore = 0;
      spot.breakerHeight = 0;
      if (Math.hypot(x, z) < shoreline - WAVE_MESH_STARTS_UP_THE_BEACH) {
        spot.runUp = 0;
        spot.groundHeight = island.groundHeight(x, z);
        return level;
      }

      const ground = island.shoreHeight(x, z);
      const offBeach =
        BEACH_CURVE_LENGTH * (Math.sqrt(Math.max(1 - ground / BEACH_CURVE_DEPTH, 0.04)) - 1);

      // The sea floor at the waterline in this direction, which the swash goes by; then here.
      const waterlineX = Math.cos(th) * shoreline;
      const waterlineZ = Math.sin(th) * shoreline;
      lookAt(waterlineX, waterlineZ);
      const delayAtWaterline0 = read(floorValues, 0);
      const delayAtWaterline1 = read(floorValues, 1);
      lookAt(x, z);
      const delay0 = read(floorValues, 0);
      const delay1 = read(floorValues, 1);
      site.th = th;
      site.depth = read(floorValues, 2);
      site.slowness = 1 / swellSpeed(site.depth);
      site.depthAtBeach = clamp(-ground, 0.12, 6);
      site.gate = smoothstep(-1.5, 0.3, offBeach);
      site.since0 = read(breakValues, 0);
      site.since1 = read(breakValues, 1);
      site.since2 = read(breakValues, 2);
      site.since3 = read(breakValues, 3);

      const swellStrength =
        (1 - smoothstep(62, 95, offBeach)) *
        (0.68 + 0.32 * smoothstep(-0.4, 0.8, Math.sin(th))) *
        island.openSea(th);

      let surface = 0;
      let runUp = 0;
      for (let i = 0; i < swells.length; i++) {
        const swell = swells[i];
        const [towardsX, towardsZ] = swell.towards;
        const fullSize = swell.size * swellStrength * alongShoreSwing(th, time, swell.variety);
        const arrival = (x * towardsX + z * towardsZ) / openSeaSpeed + (i === 0 ? delay0 : delay1);
        const arrivalAtWaterline =
          (waterlineX * towardsX + waterlineZ * towardsZ) / openSeaSpeed +
          (i === 0 ? delayAtWaterline0 : delayAtWaterline1);
        const turns = (time - arrival) / swell.period + 0.5;
        surface = addSwell(surface, swell, i, turns, fullSize, withoutBreaking);
        runUp +=
          swell.runUp *
          runUpOf(
            fullSize,
            th,
            (time - arrivalAtWaterline) / swell.period,
            swell.period,
            swell.variety,
          );
      }
      surface += 0.9 * crestHeights[0] * crestHeights[1];
      runUp *= 0.8;
      surface += 0.2 * runUp * (1 - smoothstep(0, 7, offBeach));

      // A sheet of water lies on the sand where the swash has run up.
      const film = clamp((runUp - ground) * 0.3, -0.2, 0.1);
      if (ground > -0.5 && ground + film > surface) surface = ground + film;
      spot.runUp = runUp;
      spot.groundHeight = ground;
      return surface;
    },
  };
}
