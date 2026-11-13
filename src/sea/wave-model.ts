// The program's copy of the wave model in waves.glsl, for everything that must know where the
// water is and is not a shader: swimming, spray, footprints washed away, the boat. The two must
// change together: a test draws the shader's wave heights and compares them with these.
//
// Each wave shoals by Green's law (its height grows as the depth to the power -1/4) and starts to
// break where it is 0.78 of the depth high. Its breaking stage then runs from 0 to 1 while the
// crest throws a lip that falls ahead of it, from 1 to 1.6 while that collapses, and afterwards
// the wave runs in as a bore about 0.55 of the depth high. This copy leaves out the hollow face
// and the falling lip of a breaking wave: it only lifts the crest.
//
// The sums are the shader's, in its names, so that the two can be read side by side. Keep their
// order and grouping as well: floating point is not associative, and all that follows the water
// must move exactly as it did in build 78.
//
// Distances are metres, times seconds, angles radians.

import { smoothstep } from '../core/maths';
import type { IslandShape } from '../world/island-shape';
import { seaConfig, type WaveTrain } from './sea-config';

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
  heightAt(x: number, z: number, time: number, withoutBreaking?: boolean): number;
  /** Renewed by every call of heightAt. */
  readonly spot: WaveSpot;
}

const { waveTrains, reefBreak, level } = seaConfig;

// The wave mesh starts this far up the ocean beach. Inside it lie the land and the lagoon, whose
// water is still: the far sea draws it.
const WAVE_MESH_STARTS_UP_THE_BEACH = 9;

// shore.glsl's beach: s metres off it the sea is 5((1 + s / 55)² - 1) deep. The model reads the
// curve backwards, from the depth to how far off the beach the swell feels itself, and lays it at
// the reef break for the depth the swell feels on its way in.
const BEACH_CURVE_LENGTH = 55;

// One wave's size along its crest: big peaks, small shoulders. psi is where along the shore, c
// the train's variety. (The shader guards the pow for the phone; a guard here would change the
// numbers.)
function sizeAlongCrest(As: number, psi: number, c: number): number {
  const P = Math.pow(0.5 + 0.5 * Math.sin(psi * 18 + 2.5 * Math.sin(psi * 6 + c) + c), 2.2);
  return As * (0.62 + 0.55 * P + 0.25 * (0.5 + 0.5 * Math.sin(psi * 9 + c * 5)));
}

// Every wave has its own size. Half way between two crests the sizes meet, so that the surface
// has no step there. `turns` counts the train's crests gone by, whole and part.
function sizeOfWave(train: WaveTrain, As: number, th: number, turns: number): number {
  const n = Math.floor(turns);
  const own = sizeAlongCrest(As, th - (6.2832 * n) / train.crests, train.variety);
  return own + (0.95 * As - own) * smoothstep(0.75, 1, Math.abs(turns - n - 0.5) * 2);
}

// The train's size here and now: it swells and fades in sets, and varies along the shore.
function trainSize(train: WaveTrain, env: number, th: number, t: number): number {
  return (
    train.amplitude *
    env *
    (0.7 + 0.3 * Math.sin(t * train.setPace + th * 2 + train.variety)) *
    (0.88 + 0.12 * Math.sin(th * 13 + train.variety * 1.7 + t * 0.05))
  );
}

// How high the train's swash runs up the beach: one pulse for each wave, timed to its arrival.
function runUpOf(train: WaveTrain, As: number, th: number, t: number): number {
  const turns = (train.frequency * (t + 3.184) + train.crests * th + train.phase - 1.5708) / 6.2832;
  const Aw = sizeOfWave(train, As, th, turns);
  const q = (turns - Math.floor(turns)) * 6.2832 + 1.6 * (Aw - As);
  return (
    train.runUp *
    Math.min(1.9 * Aw * (1 + 1.8 * Aw), 1.0) *
    smoothstep(0, 1.0, q) *
    (1 - smoothstep(1.2, 3.8, q))
  );
}

export function createWaveModel(island: IslandShape): WaveModel {
  const spot: WaveSpot = {
    groundHeight: 0,
    runUp: 0,
    fallingLip: 0,
    landingLip: 0,
    bore: 0,
    breakerHeight: 0,
  };

  // What the swell meets at the spot, the same for every train. It is kept here, as are the
  // crest heights, so that the many calls a frame allocate nothing.
  const site = {
    th: 0,
    /** Metres outside the line where the swell breaks on the reef; negative on the reef flat. */
    offReefBreak: 0,
    /** The swell slows as the water shallows: it travels at cs / 1.3 metres a second. */
    cs: 0,
    /** 1 in the water, fading to 0 up the beach. */
    gate: 0,
    /** The depth the swell feels on its way in. */
    feltDepth: 0,
    /** How much the swell has grown by shoaling. */
    shoaling: 0,
    /** The shore break: 0 out on the flat, 1 in the last metre or two of water. */
    shoreBreak: 0,
    /** The highest wave the water at the beach can carry. */
    heightLimit: 0,
  };
  // Each train's crest height here: where crests cross, they stand up higher.
  const crestHeights = [0, 0, 0];

  // Adds one train's wave (w0 its phase here, As its size here) to the surface height `eta` and
  // returns the sum; what it finds of breaking goes into `spot`.
  function addTrain(
    eta: number,
    train: WaveTrain,
    i: number,
    w0: number,
    As: number,
    withoutBreaking: boolean,
  ): number {
    const {
      th,
      offReefBreak: sr,
      cs,
      gate,
      feltDepth: dd,
      shoaling: sh,
      shoreBreak: sho,
      heightLimit: lim,
    } = site;
    const Aw = sizeOfWave(train, As, th, (w0 + 1.5708) / 6.2832);
    const w = w0 + 1.6 * (Aw - As) * (1 - smoothstep(0, 45, sr));

    // H0, Hb, sb...: this wave. HS0, HbS, sbS...: the train's usual wave, which sets how far the
    // water draws down between crests. 2.0064 is 6^(1/4) / 0.78: db is the depth where a wave
    // grown by Green's law reaches 0.78 of it, and sb is how far outside the reef break that is.
    const H0 = Math.min(1.65 * Aw, 1);
    const HS0 = Math.min(1.65 * As, 1);
    const db = Math.pow(Math.max(H0, 1e-4) * 2.0064, 0.8);
    const dbS = Math.pow(Math.max(HS0, 1e-4) * 2.0064, 0.8);
    const Hb = 0.78 * db;
    const HbS = 0.78 * dbS;
    const sb = BEACH_CURVE_LENGTH * (Math.sqrt(1 + db / 5) - 1);
    const sbS = BEACH_CURVE_LENGTH * (Math.sqrt(1 + dbS / 5) - 1);
    // Big waves are hollow and take longer over breaking.
    const ho = smoothstep(0.55, 1.05, Hb);
    const wd = Math.max(Math.min((1.3 + 2.6 * Hb) * (1 + 0.45 * ho), 0.85 * sb), 0.3);
    const wdS = Math.max(Math.min(1.3 + 2.6 * HbS, 0.85 * sbS), 0.3);
    const q = (sb - sr) / wd;
    const qS = (sbS - sr) / wdS;
    const sig = smoothstep(-1.8, 0, q);
    // The phase ahead of the crest (negative) or behind it, from -π to π.
    const xi = ((((w - 1.5708 + 0.45 * sig + 3.1416) % 6.2832) + 6.2832) % 6.2832) - 3.1416;
    const k = (train.frequency * 1.3) / cs;
    // The breaking stage measured at this wave's crest, so that the whole wave agrees on it.
    const qc =
      q + (Math.max(-1.6, Math.min(1.4, xi)) * (1 - smoothstep(2.2, 3, Math.abs(xi)))) / (k * wd);
    const post = smoothstep(0.95, 1.6, qc);
    const postS = smoothstep(0.95, 1.6, qS);

    // After breaking: white water that loses height as it crosses the flat, and stands up again
    // in the shore break until the water is too shallow to carry it.
    const Hp = Math.min(
      Hb,
      (0.05 + 0.12 * Hb + 0.55 * (dd - 0.12) + 0.66 * Hb * (1 - smoothstep(1.5, 6, qc))) *
        (1 + 2.2 * sho),
      lim,
    );
    const HpS = Math.min(
      HbS,
      (0.05 + 0.12 * HbS + 0.55 * (dd - 0.12) + 0.5 * HbS * (1 - smoothstep(1.5, 6, qS))) *
        (1 + 0.8 * sho),
      lim,
    );
    const H = (Math.min(H0 * sh, Hb * 1.05) * (1 - post) + Hp * post) * gate;
    const HS = (Math.min(HS0 * sh, HbS * 1.05) * (1 - postS) + HpS * postS) * gate;

    // In shallow water a swell stops being a sine: the crest narrows and peaks, the trough goes
    // long and flat. After breaking it is white water: a steep front, a back that falls away over
    // a few metres, lumpy along the front.
    const kc = 1 + (Math.max(0.55 / k, 1) - 1) * smoothstep(-5, -1.2, q);
    const wc = Math.max(-3.1416, Math.min(3.1416, xi * kc)) + 1.5708 - 0.45 * sig;
    const Cpk = Math.pow(
      Math.max(0.5 + 0.5 * Math.sin(wc + 0.45 * sig * Math.sin(wc)), 1e-4),
      2.4 + 3.6 * sig,
    );
    const fw = Math.min(0.75, 1.4 * k) * (1 - 0.6 * sho);
    const Cb =
      smoothstep(-0.2 - fw, -0.2, xi) *
      Math.exp(-Math.max(xi, 0) * Math.max(0.6, 0.4 / k) * (1 + 0.9 * sho)) *
      (1 - smoothstep(1.2, 2.2, xi)) *
      (1 + 0.3 * Math.sin(th * 190 + xi * 3 + train.variety) * Math.sin(th * 67 - w0 * 0.5));
    const C = Cpk * (1 - post) + Cb * post;

    // Steep waves plunge, the rest spill. M: the wave stands up a little before its lip starts to
    // fall (be); cr: the lip lands and throws up a mound.
    const xib = (0.18 * (6.2832 / train.frequency) * 1.25) / Math.sqrt(Math.max(Hb, 0.02));
    const plg = (1 - smoothstep(1.9, 3.2, xib)) * train.canPlunge;
    const M = withoutBreaking
      ? 0
      : smoothstep(-0.6, -0.1, qc) * (1 - smoothstep(1.0, 1.8, qc)) * plg;
    const be = Math.max(0, Math.min(1, qc));
    const cr = smoothstep(0.9, 1.15, qc) * (1 - smoothstep(1.5, 2.4, qc)) * plg;
    const xc = xi + 0.4;
    const xs = xi + 1.4;
    const size = smoothstep(0.03, 0.1, Aw);
    const near = smoothstep(-1.05, -0.5, xi) * (1 - smoothstep(0.2, 0.55, xi));

    const crest = 0.62 * H * C;
    crestHeights[i] = crest;
    const y0 = crest - 0.22 * HS;
    const suck = 0.1 * H * M * Math.exp((-xs * xs) / 0.35);
    const mound = 0.45 * Hb * cr * Math.exp((-xc * xc) / 0.16);
    // Standing up, its crest and its back (about 3.6 m long) are lifted.
    const standUp =
      (-0.22 * HS - 0.1 * H + 1.15 * H - y0) *
      M *
      (xi >= 0.1
        ? 1 - smoothstep(0, 1, (xi - 0.1) / Math.min(1.1, 3.6 * k))
        : smoothstep(-0.5, -0.1, xi));

    const fadeOverFlat = Math.exp(-Math.max(q - 1.6, 0) * 0.5);
    spot.fallingLip = Math.max(spot.fallingLip, M * near * smoothstep(0.25, 0.9, be) * size);
    spot.landingLip = Math.max(spot.landingLip, cr * Math.exp((-xc * xc) / 0.3) * size);
    spot.bore = Math.max(
      spot.bore,
      post *
        smoothstep(-0.2 - 1.25 * fw, -0.2 - 0.4 * fw, xi) *
        (1 - smoothstep(-0.3, 0.6, xi)) *
        size *
        fadeOverFlat,
    );
    spot.breakerHeight = Math.max(
      spot.breakerHeight,
      Hb * Math.max(near * M, cr, Cb * post * fadeOverFlat),
    );

    return eta + (y0 - suck + mound) + standUp;
  }

  return {
    spot,

    heightAt(x, z, time, withoutBreaking = false) {
      const th = Math.atan2(z, x);
      if (Math.hypot(x, z) < island.radius(th) - WAVE_MESH_STARTS_UP_THE_BEACH) {
        spot.fallingLip = 0;
        spot.landingLip = 0;
        spot.bore = 0;
        spot.breakerHeight = 0;
        spot.runUp = 0;
        spot.groundHeight = island.groundHeight(x, z);
        return level;
      }

      const ground = island.shoreHeight(x, z);
      const offBeach = BEACH_CURVE_LENGTH * (Math.sqrt(Math.max(1 - ground / 5, 0.04)) - 1);
      const offReefBreak = offBeach - reefBreak;
      const ur = 1 + offReefBreak / BEACH_CURVE_LENGTH;
      const cs = Math.sqrt(Math.max(0, Math.min(40, offBeach)) + 1.5);
      const tau = 2.6 * cs + Math.max(offBeach - 40, 0) / 4.95 + Math.min(offBeach, 0) * 1.06;
      const env =
        (1 - smoothstep(62, 95, offBeach)) *
        (0.68 + 0.32 * smoothstep(-0.4, 0.8, Math.sin(th))) *
        island.openSea(th);
      const depthAtBeach = Math.max(0.12, Math.min(6, -ground));
      site.th = th;
      site.offReefBreak = offReefBreak;
      site.cs = cs;
      site.gate = smoothstep(-1.5, 0.3, offBeach);
      site.feltDepth = Math.max(0.12, Math.min(6, 5 * (ur * ur - 1)));
      site.shoaling = Math.pow(6 / site.feltDepth, 0.25);
      site.shoreBreak = 1 - smoothstep(0.35, 1.3, depthAtBeach);
      site.heightLimit = 0.66 * depthAtBeach + 0.04;

      spot.fallingLip = 0;
      spot.landingLip = 0;
      spot.bore = 0;
      spot.breakerHeight = 0;
      let eta = 0;
      let runUp = 0;
      for (let i = 0; i < waveTrains.length; i++) {
        const train = waveTrains[i];
        const As = trainSize(train, env, th, time);
        const w0 = train.frequency * (time + tau) + train.crests * th + train.phase;
        eta = addTrain(eta, train, i, w0, As, withoutBreaking);
        runUp += runUpOf(train, As, th, time);
      }
      const c = crestHeights;
      eta += 0.9 * (c[0] * c[1] + c[0] * c[2] + c[1] * c[2]);
      runUp *= 0.8;
      eta += 0.2 * runUp * (1 - smoothstep(0, 7, offBeach));

      // A sheet of water lies on the sand where the swash has run up.
      const film = Math.max(-0.2, Math.min(0.1, (runUp - ground) * 0.3));
      if (ground > -0.5 && ground + film > eta) eta = ground + film;
      spot.runUp = runUp;
      spot.groundHeight = ground;
      return eta;
    },
  };
}
