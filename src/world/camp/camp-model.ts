import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Random } from '../../core/random';
import type { GroundHeight } from '../landmarks';

// Everything in the camp is one model, made a triangle at a time with a colour painted on each
// corner.

export type Triple = readonly [number, number, number];
/** Red, green and blue, from 0 to 1. */
export type Rgb = readonly [number, number, number];

export interface Pole {
  startRadius: number;
  endRadius: number;
  colour: Rgb;
  /** How crooked it is, as a share of its length. */
  crook: number;
}

export interface CampModel {
  /** The camp's own stream of random numbers. */
  random: Random;
  /** The ground's height, or 0 where the island gives no finite height. */
  groundAt: GroundHeight;
  triangle(a: Triple, b: Triple, c: Triple, colour: Rgb): void;
  /** A five-sided pole from `start` to `end`, a little crooked. */
  pole(start: Triple, end: Triple, pole: Pole): void;
  /**
   * A palm frond lying from its base to its tip: a rib with a row of leaflets down each side,
   * sagging a little between its ends.
   */
  frond(base: Triple, tip: Triple, leafletReach: number, colour: Rgb): void;
  /** All that has been made, as one shape. */
  shape(): BufferGeometry;
}

const POLE_SIDES = 5;
const POLE_SEGMENTS = 4;
// A fifth of a turn, rounded as build 78 had it: every corner of every pole depends on it.
const FIFTH_OF_A_TURN = 1.2566;
const LEAFLETS_DOWN_EACH_SIDE = 11;
const BOTH_SIDES = [-1, 1] as const;

export function shade(colour: Rgb, brightness: number): Rgb {
  return [colour[0] * brightness, colour[1] * brightness, colour[2] * brightness];
}

function cross(a: Triple, b: Triple): Triple {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

// Divided, not multiplied by the inverse: the numbers must come out as build 78's.
function divided(vector: Triple, by: number): Triple {
  return [vector[0] / by, vector[1] / by, vector[2] / by];
}

export function createCampModel(random: Random, groundHeight: GroundHeight): CampModel {
  const positions: number[] = [];
  const colours: number[] = [];

  function triangle(a: Triple, b: Triple, c: Triple, colour: Rgb): void {
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < 3; i++) colours.push(colour[0], colour[1], colour[2]);
  }

  function pole(start: Triple, end: Triple, { startRadius, endRadius, colour, crook }: Pole): void {
    const along: Triple = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
    const length = Math.hypot(along[0], along[1], along[2]);
    // The rings' axes come from crossing the pole with y, or with x if it stands nearly upright,
    // where the cross with y would be all but nothing.
    const helper: Triple = Math.abs(along[1]) / length > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const square = cross(along, helper);
    const ringX = divided(square, Math.hypot(square[0], square[1], square[2]));
    const ringY = divided(cross(along, ringX), length);

    const rings: Triple[][] = [];
    for (let i = 0; i <= POLE_SEGMENTS; i++) {
      const share = i / POLE_SEGMENTS;
      const stray = Math.sin(share * Math.PI) * crook * length;
      const strayX = (random() - 0.5) * stray;
      const strayY = (random() - 0.5) * stray;
      const radius = startRadius + (endRadius - startRadius) * share;
      const ring: Triple[] = [];
      for (let k = 0; k < POLE_SIDES; k++) {
        const angle = k * FIFTH_OF_A_TURN + i * 0.5;
        const x = Math.cos(angle) * radius + strayX;
        const y = Math.sin(angle) * radius + strayY;
        ring.push([
          start[0] + along[0] * share + ringX[0] * x + ringY[0] * y,
          start[1] + along[1] * share + ringX[1] * x + ringY[1] * y,
          start[2] + along[2] * share + ringX[2] * x + ringY[2] * y,
        ]);
      }
      rings.push(ring);
    }

    for (let i = 0; i < POLE_SEGMENTS; i++) {
      for (let k = 0; k < POLE_SIDES; k++) {
        const sideColour = shade(colour, 0.85 + 0.3 * random());
        const next = (k + 1) % POLE_SIDES;
        triangle(rings[i][k], rings[i + 1][k], rings[i + 1][next], sideColour);
        triangle(rings[i][k], rings[i + 1][next], rings[i][next], sideColour);
      }
    }
    // The cut ends show paler wood.
    const endColour = shade(colour, 1.15);
    const startRing = rings[0];
    const endRing = rings[POLE_SEGMENTS];
    for (let k = 1; k < POLE_SIDES - 1; k++) {
      triangle(startRing[0], startRing[k + 1], startRing[k], endColour);
      triangle(endRing[0], endRing[k], endRing[k + 1], endColour);
    }
  }

  function frond(base: Triple, tip: Triple, leafletReach: number, colour: Rgb): void {
    const along: Triple = [tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]];
    const length = Math.hypot(along[0], along[1], along[2]);
    const sideways: Triple = [
      along[2] / Math.hypot(along[0], along[2]),
      0,
      -along[0] / Math.hypot(along[0], along[2]),
    ];

    /** A point `share` of the way to the tip: on the rib for `side` 0, a leaflet's end for ±1. */
    function pointOf(share: number, side: number, drop: number): Triple {
      // Leaflets are short at the base, longest past the middle, and shorter again at the tip.
      const out = leafletReach * Math.sin(Math.min(1, share * 1.15 + 0.12) * 2.7) * side;
      return [
        base[0] + along[0] * share + sideways[0] * out,
        base[1] + along[1] * share - Math.sin(share * 3.14) * 0.06 * length - drop,
        base[2] + along[2] * share + sideways[2] * out,
      ];
    }

    for (let i = 0; i < LEAFLETS_DOWN_EACH_SIDE; i++) {
      const from = i / LEAFLETS_DOWN_EACH_SIDE;
      // Broad leaflets that overlap the next: a roof, not a net.
      const to = (i + 1.25) / LEAFLETS_DOWN_EACH_SIDE;
      const pairColour = shade(colour, 0.7 + 0.5 * random());
      for (const side of BOTH_SIDES) {
        // Leaflets sweep back towards the tip and droop at their ends.
        const sweep = 0.1 + 0.08 * random();
        triangle(
          pointOf(from, 0, 0),
          pointOf(Math.min(1, to), 0, 0),
          pointOf(Math.min(1, to + sweep), side, leafletReach * 0.3),
          pairColour,
        );
      }
    }
  }

  return {
    random,
    groundAt(x, z) {
      const height = groundHeight(x, z);
      return Number.isFinite(height) ? height : 0;
    },
    triangle,
    pole,
    frond,
    shape() {
      const shape = new BufferGeometry();
      shape.setAttribute('position', new Float32BufferAttribute(positions, 3));
      shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
      shape.computeVertexNormals();
      return shape;
    },
  };
}
