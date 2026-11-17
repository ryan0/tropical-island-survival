import {
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RGBAFormat,
} from 'three';
import { lipDrops } from 'virtual:wave-timing';
import { clamp, mix, smoothstep } from '../core/maths';
import { seaConfig } from './sea-config';

// The breaking wave's front in cross-section, made ahead of time for the breaker's own mesh to
// read: where each place along the front lies at each stage of the wave's breaking.
//
// A cross-section is a path. It starts in the trough ahead of the wave, runs up the hollow face
// to where the lip leaves it, out along the lip's underside to its tip, round the tip, back along
// the lip's top to the crest, and some way down the wave's back. So the lip has two sides and a
// thickness.
//
// Distances are in front heights: the front stands 1 high at its crest when it has stood up.
// x is ahead of the crest, the way the wave travels; y is up from the foot of the face.
//
// The back is the exception: there y is how far the path lies over the sea's own surface, as that
// would be if it did not sink out of the mesh's way (waves.glsl). The mesh asks the wave model
// for that surface, so its back is the sea's back at every moment of the wave's standing up and
// collapse, a little over it, and its last part dives under the sea where the sea shows again.
//
// One rule shapes the lip: it is water that leaves the crest at the wave's speed and falls
// freely. The water that left first has gone furthest and fallen furthest, which makes the lip's
// top a parabola, and its tip has dropped LIP_DROPS of the front's height when it lands (so the
// fall takes as long as timing.glsl's lipFallSeconds).
//
// Once the lip has landed it throws up a white mass, higher than the wave, which rolls on ahead of
// the crest and settles into the white water (`burst`). No rule gives that its shape: it is drawn
// by eye from the footage.
//
// The picture holds, for each place and stage, the front of a wave that has stood up and throws
// a full lip. A wave that has not stood up, or throws no lip, has no front to draw: there the
// mesh lies just under the sea's own surface, which its shader asks the wave model for, and it
// mixes the two by how far the wave has stood up. So the front grows out of the swell's own shape
// and goes back into it. The picture's left half is for a wave that is not hollow, its right half
// for one as hollow as they come; the shader mixes those too.

export interface BreakerShapes {
  readonly texture: DataTexture;
}

const { places, stages, firstStage, lastStage } = seaConfig.breakerShapes;
type Point = readonly [x: number, y: number];

// How the path's length is shared out among its parts: each ends at this share of the way along.
const FACE_ENDS = 0.34;
const UNDERSIDE_ENDS = 0.56;
const TIP_ENDS = 0.62;
const TOP_ENDS = 0.84;

/** What the mesh's shader needs to know of the path and its timing (water-materials.ts). */
export const breakerPath = {
  /** The lip lies between these shares of the way along: the shader whitens it. */
  faceEnds: FACE_ENDS,
  topEnds: TOP_ENDS,
  /** Where the white mass a landed lip throws up is highest: the middle of the lip's tip. */
  peakAt: (UNDERSIDE_ENDS + TIP_ENDS) / 2,
  /**
   * The landed lip has become the white mass by this stage: quickly, for on the way the path
   * folds through itself.
   */
  burstFormedBy: 1.12,
  /**
   * At the last the mass breaks up into tufts and is gone, between these stages, and only then
   * sinks back under the sea. (Sinking while it still showed, it crossed the sea's surface at so
   * shallow an angle that the two showed through each other in stripes.)
   */
  burstBreaksUp: [2.3, 2.75] as const,
  /**
   * The back's dots hold another kind of number than the rest (see above), so a place is never
   * read from between the two kinds: these are the last dot before the back and the first of
   * it, as shares of the way along.
   */
  lastPlaceOffBack: Math.floor(TOP_ENDS * (places - 1) - 1e-6) / (places - 1),
  firstPlaceOnBack: Math.ceil(TOP_ENDS * (places - 1)) / (places - 1),
};

// Where the mesh crosses the sea's own surface it crosses at a clear angle: two surfaces that
// meet at a shallow one meet in a ragged line. So the white mass's front starts this far under
// the sea.
const FOOT_UNDER = { depth: 0.16 };
// The foot of the face is this far ahead of the crest, and further for a hollow wave.
const FOOT_AHEAD = { plain: 0.62, hollow: 0.95 };
// A wave's face has no edge at its foot: the trough ahead curves up into it. So the path runs in
// along the trough from `runIn` ahead of the foot, lying on the sea's own surface (the mesh's
// shader lays its low rows on that, as it does the back), and curves up from there, the flatter at
// first the greater `flatness`. It starts with a short lead-in from under the sea, steep enough
// to cross the surface cleanly: `leadIn.share` of the face's rows.
const RUN_IN = { runIn: 1.0, flatness: 1.5, leadIn: { length: 0.16, depth: 0.1, share: 0.1 } };
// How far ahead the lip's tip has gone when it lands, for a plain wave and a hollow one.
const LIP_THROWN = { plain: 0.5, hollow: 0.95 };
// The lip is this thick where it leaves the crest and at its tip.
const LIP_THICKNESS = { atCrest: 0.2, atTip: 0.09 };
// The path runs `length` down the wave's back, `over` the sea's own surface. The sea itself shows
// from `seaShowsFrom` on (waves.glsl's BACK_UNDER_MESH), and soon after that the path dives under
// it, to end `dips` below.
const DOWN_THE_BACK = { length: 1.4, seaShowsFrom: 0.8, over: 0.03, dips: 0.3 };
// The white mass a landed lip throws up. It is thrown up: it rises fast at first and slows to its
// highest (in front heights, for a plain wave and a hollow one), which it reaches at the stage
// `highestAt`. It has settled by `settledBy`, breaks up (`breakerPath.burstBreaksUp`), and has
// sunk back under the sea by `goneBy`. Its
// front runs on ahead of where the lip landed, from `frontAhead[0]` to `frontAhead[1]`. Behind it
// the wave's crest settles to `backSettlesTo` of its height.
const BURST = {
  startsAs: 0.6,
  highest: { plain: 1.05, hollow: 1.3 },
  highestAt: 1.6,
  settlesTo: 0.35,
  settledBy: 2.6,
  goneBy: 3.1,
  frontAhead: [0.4, 1.0],
  backSettlesTo: 0.6,
} as const;

function between(from: Point, to: Point, share: number): Point {
  return [mix(from[0], to[0], share), mix(from[1], to[1], share)];
}

/** The lip's top, `outAlong` it from the crest (0) to the tip (1), when it has fallen `lipFall` of its fall. */
function lipTop(outAlong: number, lipFall: number, hollowness: number): Point {
  const thrown = mix(LIP_THROWN.plain, LIP_THROWN.hollow, hollowness) * lipFall;
  // (it bulges forward a little before it falls)
  const tipAhead = 0.08 * smoothstep(0, 0.2, lipFall) + thrown;
  return [tipAhead * outAlong, 1 - lipDrops() * lipFall * lipFall * outAlong * outAlong];
}

function lipThickness(outAlong: number, lipFall: number): number {
  // (the lip starts as nothing and thickens as it is thrown)
  const grown = 0.2 + 0.8 * smoothstep(0, 0.25, lipFall);
  return grown * mix(LIP_THICKNESS.atCrest, LIP_THICKNESS.atTip, outAlong);
}

function lipUnderside(outAlong: number, lipFall: number, hollowness: number): Point {
  const [x, y] = lipTop(outAlong, lipFall, hollowness);
  return [x - 0.03 * (1 - outAlong), y - lipThickness(outAlong, lipFall)];
}

/** How far out along the lip a place on it lies, from the crest (0) to the tip (1); 0 off the lip. */
function outAlongLip(partWay: number): number {
  if (partWay < FACE_ENDS || partWay >= TOP_ENDS) return 0;
  if (partWay < UNDERSIDE_ENDS) return (partWay - FACE_ENDS) / (UNDERSIDE_ENDS - FACE_ENDS);
  if (partWay < TIP_ENDS) return 1;
  return 1 - (partWay - TIP_ENDS) / (TOP_ENDS - TIP_ENDS);
}

/** The front of a wave that has stood up, `partWay` along its path, its lip fallen `lipFall` of its fall. */
function standingFront(partWay: number, lipFall: number, hollowness: number): Point {
  if (partWay < FACE_ENDS) {
    // The face: a lead-in from under the sea, the run-in along the trough, and a curve up from
    // that to the lip's underside (a quarter of an oval, flattened at its foot).
    const { runIn, flatness, leadIn } = RUN_IN;
    const startsAhead = mix(FOOT_AHEAD.plain, FOOT_AHEAD.hollow, hollowness) + runIn;
    const [topX, topY] = lipUnderside(0, lipFall, hollowness);
    const alongFace = partWay / FACE_ENDS;
    if (alongFace < leadIn.share) {
      const stillToCome = 1 - alongFace / leadIn.share;
      return [startsAhead + leadIn.length * stillToCome, -leadIn.depth * stillToCome];
    }
    const turned = ((alongFace - leadIn.share) / (1 - leadIn.share)) * (Math.PI / 2);
    return [
      startsAhead - (startsAhead - topX) * Math.sin(turned),
      topY * Math.pow(1 - Math.cos(turned), flatness),
    ];
  }
  if (partWay < UNDERSIDE_ENDS) return lipUnderside(outAlongLip(partWay), lipFall, hollowness);
  if (partWay < TIP_ENDS) {
    // Round the tip, from the underside to the top: half a circle as thick as the lip is there.
    const round = ((partWay - UNDERSIDE_ENDS) / (TIP_ENDS - UNDERSIDE_ENDS)) * Math.PI;
    const top = lipTop(1, lipFall, hollowness);
    const underside = lipUnderside(1, lipFall, hollowness);
    const radius = (top[1] - underside[1]) / 2;
    const [middleX, middleY] = between(top, underside, 0.5);
    return [middleX + radius * Math.sin(round), middleY - radius * Math.cos(round)];
  }
  if (partWay < TOP_ENDS) return lipTop(outAlongLip(partWay), lipFall, hollowness);
  return downTheBack(partWay);
}

/** The path's last part, down the wave's back: how far behind the crest, and how far over the sea. */
function downTheBack(partWay: number): Point {
  const { seaShowsFrom, length, over, dips } = DOWN_THE_BACK;
  const behind = (length * (partWay - TOP_ENDS)) / (1 - TOP_ENDS);
  const dives = smoothstep(seaShowsFrom + 0.1, length, behind);
  return [-behind, over - (over + dips) * dives];
}

/** How far the mass has risen towards its highest, 0 to 1: fast at first, as a thing thrown is. */
function thrownUp(crestStage: number): number {
  const sinceLanding = clamp((crestStage - 1) / (BURST.highestAt - 1), 0, 1);
  return 1 - (1 - sinceLanding) * (1 - sinceLanding);
}

/**
 * The white mass thrown up where the lip landed, at a stage after the landing. The path goes up
 * its front from under the sea ahead of it, over its highest point, down its rear to the crest
 * and on down the wave's back.
 */
function burst(partWay: number, crestStage: number, hollowness: number): Point {
  const landedAhead = 0.08 + mix(LIP_THROWN.plain, LIP_THROWN.hollow, hollowness);
  const highest = mix(BURST.highest.plain, BURST.highest.hollow, hollowness);
  const height =
    mix(BURST.startsAs, highest, thrownUp(crestStage)) *
    mix(1, BURST.settlesTo, smoothstep(BURST.highestAt + 0.1, BURST.settledBy, crestStage));
  const peakAhead = 0.7 * landedAhead + 0.2 * smoothstep(1, 2.6, crestStage);
  const frontAhead =
    landedAhead + mix(BURST.frontAhead[0], BURST.frontAhead[1], smoothstep(1, 2.4, crestStage));
  const crestStands = mix(1, BURST.backSettlesTo, smoothstep(1, 2.2, crestStage));
  // At the last it all goes down into the white water.
  const sinks = smoothstep(breakerPath.burstBreaksUp[1], BURST.goneBy, crestStage);

  if (partWay >= TOP_ENDS) {
    const [x, overTheSea] = downTheBack(partWay);
    return [x, mix(overTheSea, -DOWN_THE_BACK.dips, sinks)];
  }
  let point: Point;
  if (partWay < breakerPath.peakAt) {
    // (its front rises steeply out of the sea and rounds over)
    const up = (partWay / breakerPath.peakAt) * (Math.PI / 2);
    point = [
      peakAhead + (frontAhead - peakAhead) * Math.cos(up),
      (height + FOOT_UNDER.depth) * Math.sin(up) - FOOT_UNDER.depth,
    ];
  } else {
    const down = (partWay - breakerPath.peakAt) / (TOP_ENDS - breakerPath.peakAt);
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * down);
    point = [peakAhead * (1 - down), mix(height, crestStands, eased)];
  }
  return [point[0], mix(point[1], -FOOT_UNDER.depth - 0.1, sinks)];
}

/**
 * Where a place on the front lies: `partWay` along the path from the trough ahead (0) to its end
 * on the back (1), at a stage of the wave's breaking, for a wave so hollow (0 to 1) that throws a
 * full lip.
 */
export function frontPoint(partWay: number, crestStage: number, hollowness: number): Point {
  if (crestStage <= 1) return standingFront(partWay, clamp(crestStage, 0, 1), hollowness);
  // The landed lip bursts into the white mass.
  return between(
    standingFront(partWay, 1, hollowness),
    burst(partWay, crestStage, hollowness),
    smoothstep(1, breakerPath.burstFormedBy, crestStage),
  );
}

/** The stage a row of the picture is for. */
function stageOfRow(row: number): number {
  return firstStage + ((row + 0.5) / stages) * (lastStage - firstStage);
}

export function createBreakerShapes(): BreakerShapes {
  // The picture is two wide: a wave that is not hollow on the left, a hollow one on the right.
  const halves = new Uint16Array(2 * places * stages * 4);
  for (let row = 0; row < stages; row++) {
    const crestStage = stageOfRow(row);
    for (let column = 0; column < 2 * places; column++) {
      const hollowness = column < places ? 0 : 1;
      const partWay = (column % places) / (places - 1);
      frontPoint(partWay, crestStage, hollowness).forEach((value, channel) => {
        halves[(row * 2 * places + column) * 4 + channel] = DataUtils.toHalfFloat(value);
      });
    }
  }
  const texture = new DataTexture(halves, 2 * places, stages, RGBAFormat, HalfFloatType);
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return { texture };
}
