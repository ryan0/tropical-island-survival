import type { RockSurface } from '../rocks/rocks-config';

// Sizes are metres; a model is about a metre across at size 1. Colours are red, green, blue
// from 0 to 1, as they are before the water dims them.

/**
 * In the order they are made and built, which the reef's one stream of random numbers depends
 * on. The two small kinds are the simple shapes of knob and lobed coral, for the many small
 * ones that carpet the heads and the slopes.
 */
export const CORAL_KINDS = [
  'head',
  'rubble',
  'brain',
  'bush',
  'stag',
  'table',
  'knob',
  'smallKnob',
  'smallBrain',
  'clam',
] as const;

export type CoralKind = (typeof CORAL_KINDS)[number];

type Rgb = readonly [number, number, number];

export interface CoralKindConfig {
  /** How many different models there are of it; each one placed is one of them at random. */
  shapes: number;
  /** The heads and their rubble are rock, drawn with the rocks' material; the rest are coral. */
  isRock: boolean;
  /** How tall one of size 1 stands. */
  tall: number;
  /** Each one is tinted with one of these, at random. */
  tints: readonly Rgb[];
  /** It is drawn with a simpler model from this distance on, if at all. */
  simplerBeyond?: number;
}

export const reefConfig = {
  kinds: {
    /** A coral head: a platform of old reef rock, steep-sided and nearly flat on top. */
    head: {
      shapes: 3,
      isRock: true,
      tall: 1,
      tints: [
        [0.8, 0.73, 0.62],
        [0.76, 0.71, 0.62],
        [0.84, 0.75, 0.65],
      ],
    },
    /** Lumps of broken reef rock round the foot of a head. */
    rubble: {
      shapes: 3,
      isRock: true,
      tall: 0.4,
      tints: [
        [0.62, 0.58, 0.5],
        [0.74, 0.7, 0.62],
        [0.56, 0.54, 0.5],
        [0.72, 0.62, 0.6],
      ],
    },
    /** Lobed coral (Porites): a mound of smooth rounded lobes. */
    brain: {
      shapes: 3,
      isRock: false,
      tall: 0.4,
      tints: [
        [0.8, 0.72, 0.56],
        [0.7, 0.7, 0.82],
        [0.78, 0.72, 0.58],
        [0.82, 0.74, 0.6],
        [0.76, 0.68, 0.66],
      ],
      simplerBeyond: 15,
    },
    /** Bushy coral (Acropora): a dome of many short fine branches, paler at the tips. */
    bush: {
      shapes: 3,
      isRock: false,
      tall: 0.5,
      tints: [
        [0.94, 0.82, 0.72],
        [0.84, 0.78, 0.9],
        [0.96, 0.86, 0.7],
        [0.92, 0.76, 0.78],
        [0.92, 0.84, 0.72],
      ],
      simplerBeyond: 10,
    },
    /** Staghorn coral: a thicket of forking branches, pale at the tips. */
    stag: {
      shapes: 2,
      isRock: false,
      tall: 0.85,
      tints: [
        [0.84, 0.74, 0.56],
        [0.7, 0.7, 0.86],
        [0.86, 0.72, 0.72],
      ],
    },
    /** Table coral: a wide thin plate on a short stalk; the second model has a smaller plate above. */
    table: {
      shapes: 2,
      isRock: false,
      tall: 0.6,
      tints: [
        [0.8, 0.7, 0.54],
        [0.74, 0.68, 0.76],
        [0.84, 0.76, 0.6],
      ],
    },
    /** Cauliflower coral: a tight bunch of knobs. */
    knob: {
      shapes: 2,
      isRock: false,
      tall: 0.45,
      tints: [
        [0.86, 0.72, 0.56],
        [0.88, 0.68, 0.72],
        [0.78, 0.72, 0.6],
      ],
      simplerBeyond: 11,
    },
    smallKnob: {
      shapes: 2,
      isRock: false,
      tall: 0.45,
      tints: [
        [0.86, 0.72, 0.56],
        [0.88, 0.68, 0.72],
        [0.78, 0.72, 0.6],
      ],
    },
    smallBrain: {
      shapes: 2,
      isRock: false,
      tall: 0.4,
      tints: [
        [0.8, 0.72, 0.56],
        [0.7, 0.7, 0.82],
        [0.78, 0.72, 0.58],
        [0.76, 0.68, 0.66],
      ],
    },
    /** Giant clam: two fat ribbed shells a little open, the fleshy lips between them vivid. */
    clam: { shapes: 3, isRock: false, tall: 0.4, tints: [[0.92, 0.9, 0.86]] },
  } satisfies Record<CoralKind, CoralKindConfig>,

  /** The colour of the lips of each of the clam's models. */
  clamLips: [
    [0.15, 0.45, 1.3],
    [0.2, 1.0, 0.75],
    [0.75, 0.3, 1.2],
  ],
  /** The surface of the heads' rock. */
  rockSurface: {
    scale: 0.3,
    crack: 0.7,
    pit: 1.0,
    bump: 1.1,
    bleach: 0,
    barnacle: 0.35,
  } satisfies RockSurface,

  /** Nothing may stand nearer the surface than this height; what would is made smaller. */
  highestTop: -0.12,
  /** A coral made smaller than this to fit under the surface is left out. */
  smallestSize: 0.2,
  /** Coral heads are not drawn beyond the first distance, nor anything else beyond the second. */
  headsShownWithin: 140,
  coralsShownWithin: 65,

  /** The map of how high the heads stand, for the water: dots a side, and the metres it covers about home. */
  mapSize: 256,
  mapSpan: 300,

  /** The fish of a head are drawn only when the head is within this distance of the camera. */
  fishShownWithin: 70,
} as const;
