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
// the lip's top to the crest, and down the wave's back. So the lip has two sides and a
// thickness.
//
// Distances are in front heights: the front stands 1 high at its crest when it has stood up.
// x is ahead of the crest, the way the wave travels; y is up from the trough ahead of it.
//
// One rule shapes the lip: it is water that leaves the crest at the wave's speed and falls
// freely. The water that left first has gone furthest and fallen furthest, which makes the lip's
// top a parabola, and its tip has dropped LIP_DROPS of the front's height when it lands (so the
// fall takes as long as timing.glsl's lipFallSeconds).
//
// The picture holds two fronts side by side in its four numbers: a wave that is not hollow (red,
// green) and one that is as hollow as they come (blue, alpha). The mesh's shader mixes the two.

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

// Before it stands up, the wave is the swell's own peaked crest: so high, and so long ahead and behind.
const SWELL_CREST = { height: 0.54, ahead: 1.9, behind: 2.2 };
// The path starts this far ahead of the face's foot and ends this far down the back, both a
// little under the sea's surface, so that the mesh's edges lie hidden in the sea.
const RUN_IN = 0.7;
const UNDER_THE_SEA = 0.07;
// The foot of the face is this far ahead of the crest, and further for a hollow wave.
const FOOT_AHEAD = { plain: 0.62, hollow: 0.95 };
// How far ahead the lip's tip has gone when it lands, for a plain wave and a hollow one.
const LIP_THROWN = { plain: 0.5, hollow: 0.95 };
// The lip is this thick where it leaves the crest and at its tip.
const LIP_THICKNESS = { atCrest: 0.2, atTip: 0.09 };
// The wave's back reaches this far behind the crest.
const BACK_LENGTH = 2.4;
// Once the lip has landed the front sinks to white water: so high, with its foot so far ahead.
const WHITE_WATER = { height: 0.55, footAhead: 0.9 };

function between(from: Point, to: Point, share: number): Point {
  return [mix(from[0], to[0], share), mix(from[1], to[1], share)];
}

/** The swell's own crest: a hump, `partWay` from its foot ahead (0) through its top (0.5) to its back (1). */
function swellCrest(partWay: number): Point {
  const x =
    partWay < 0.5
      ? mix(SWELL_CREST.ahead + RUN_IN, 0, partWay * 2)
      : mix(0, -SWELL_CREST.behind, partWay * 2 - 1);
  const reach = x > 0 ? SWELL_CREST.ahead : SWELL_CREST.behind;
  const hump = Math.pow(0.5 + 0.5 * Math.cos(Math.PI * clamp(x / reach, -1, 1)), 1.5);
  return [x, -UNDER_THE_SEA + (SWELL_CREST.height + UNDER_THE_SEA) * hump];
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

/** The front once it has stood up, `partWay` along its path, its lip fallen `lipFall` of its fall. */
function standingFront(partWay: number, lipFall: number, hollowness: number): Point {
  const footAhead = mix(FOOT_AHEAD.plain, FOOT_AHEAD.hollow, hollowness);
  if (partWay < FACE_ENDS) {
    // The face: a run in from the trough to its foot, then a quarter of an oval up to the lip's underside.
    const alongFace = partWay / FACE_ENDS;
    const foot: Point = [footAhead, 0];
    if (alongFace < 0.2) {
      return between([footAhead + RUN_IN, -UNDER_THE_SEA], foot, alongFace / 0.2);
    }
    const [topX, topY] = lipUnderside(0, lipFall, hollowness);
    const turned = ((alongFace - 0.2) / 0.8) * (Math.PI / 2);
    return [footAhead - (footAhead - topX) * Math.sin(turned), topY * (1 - Math.cos(turned))];
  }
  if (partWay < UNDERSIDE_ENDS) {
    const outAlong = (partWay - FACE_ENDS) / (UNDERSIDE_ENDS - FACE_ENDS);
    return lipUnderside(outAlong, lipFall, hollowness);
  }
  if (partWay < TIP_ENDS) {
    // Round the tip, from the underside to the top: half a circle as thick as the lip is there.
    const round = ((partWay - UNDERSIDE_ENDS) / (TIP_ENDS - UNDERSIDE_ENDS)) * Math.PI;
    const top = lipTop(1, lipFall, hollowness);
    const underside = lipUnderside(1, lipFall, hollowness);
    const radius = (top[1] - underside[1]) / 2;
    const [middleX, middleY] = between(top, underside, 0.5);
    return [middleX + radius * Math.sin(round), middleY - radius * Math.cos(round)];
  }
  if (partWay < TOP_ENDS) {
    const outAlong = 1 - (partWay - TIP_ENDS) / (TOP_ENDS - TIP_ENDS);
    return lipTop(outAlong, lipFall, hollowness);
  }
  // The back: down from the crest, steeply at first, and under the sea at its end.
  const downBack = (partWay - TOP_ENDS) / (1 - TOP_ENDS);
  return [-BACK_LENGTH * downBack, Math.pow(1 - downBack, 1.6) - UNDER_THE_SEA * downBack];
}

/**
 * White water: a steep low front that bulges ahead, and a long back. What was the face lies flat in
 * the trough ahead of it, and what was the lip is its front, so that a lip that has landed sinks
 * into the mound it throws up.
 */
function whiteWater(partWay: number): Point {
  const crest: Point = [0.15, WHITE_WATER.height];
  const foot: Point = [WHITE_WATER.footAhead, 0];
  if (partWay < FACE_ENDS) {
    const start: Point = [WHITE_WATER.footAhead + RUN_IN, -UNDER_THE_SEA];
    return between(start, foot, partWay / FACE_ENDS);
  }
  if (partWay < TOP_ENDS) {
    const turned = ((partWay - FACE_ENDS) / (TOP_ENDS - FACE_ENDS)) * (Math.PI / 2);
    return [crest[0] + (foot[0] - crest[0]) * Math.cos(turned), crest[1] * Math.sin(turned)];
  }
  const downBack = (partWay - TOP_ENDS) / (1 - TOP_ENDS);
  return [
    crest[0] - BACK_LENGTH * downBack,
    crest[1] * Math.exp(-2.2 * downBack) - UNDER_THE_SEA * downBack,
  ];
}

/** The swell's crest with the path's parts laid along it as the standing front's are: the lip's all at its top. */
function swellCrestAlongPath(partWay: number): Point {
  if (partWay < FACE_ENDS) return swellCrest((0.5 * partWay) / FACE_ENDS);
  if (partWay < TOP_ENDS) return swellCrest(0.5);
  return swellCrest(0.5 + (0.5 * (partWay - TOP_ENDS)) / (1 - TOP_ENDS));
}

/**
 * Where a place on the front lies: `partWay` along the path from the trough ahead (0) to the end of
 * the back (1), at a stage of the wave's breaking, for a wave so hollow (0 to 1).
 */
export function frontPoint(partWay: number, crestStage: number, hollowness: number): Point {
  // It stands up over its last two seconds, as timing.glsl's standingUpAt has it.
  const stoodUp = smoothstep(-1.3, -0.1, crestStage);
  const lipFall = clamp(crestStage, 0, 1);
  const sunk = smoothstep(1.0, 1.8, crestStage);
  const standing = between(
    swellCrestAlongPath(partWay),
    standingFront(partWay, lipFall, hollowness),
    stoodUp,
  );
  return between(standing, whiteWater(partWay), sunk);
}

/** The stage a row of the picture is for. */
function stageOfRow(row: number): number {
  return firstStage + ((row + 0.5) / stages) * (lastStage - firstStage);
}

export function createBreakerShapes(): BreakerShapes {
  const halves = new Uint16Array(places * stages * 4);
  for (let row = 0; row < stages; row++) {
    for (let column = 0; column < places; column++) {
      const partWay = column / (places - 1);
      const plain = frontPoint(partWay, stageOfRow(row), 0);
      const hollow = frontPoint(partWay, stageOfRow(row), 1);
      [...plain, ...hollow].forEach((value, channel) => {
        halves[(row * places + column) * 4 + channel] = DataUtils.toHalfFloat(value);
      });
    }
  }
  const texture = new DataTexture(halves, places, stages, RGBAFormat, HalfFloatType);
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return { texture };
}
