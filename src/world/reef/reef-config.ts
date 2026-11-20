import type { Rgb } from '../../core/maths';
import type { RockSurface } from '../rocks/rocks-config';

// Sizes are metres; a model is about a metre across at size 1. Colours are red, green, blue
// from 0 to 1, as they are before the water dims them. The corals' tints are what photographs
// taken in daylight under water measure (reference-photos/coral): tan, mustard, olive and
// brown, half as light as sand. As pale pastels the corals were "lumps in pastel".

/**
 * Every kind, in the order its meshes are made. The two small kinds are the simple shapes of knob
 * and lobed coral, for the many small ones that carpet the heads and the slopes.
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
  /**
   * Which roll of the dice lays the reef out. Another number is another reef of the same kind,
   * with its heads and patches elsewhere. This one puts several pale heads off the home beach.
   */
  layoutRoll: 1,

  kinds: {
    /** A coral head: a platform of old reef rock, steep-sided and nearly flat on top. */
    head: {
      shapes: 3,
      isRock: true,
      tall: 1,
      tints: [
        [0.54, 0.5, 0.41],
        [0.46, 0.45, 0.37],
        [0.59, 0.53, 0.43],
      ],
    },
    /** Lumps of broken reef rock round the foot of a head. */
    rubble: {
      shapes: 3,
      isRock: true,
      tall: 0.4,
      tints: [
        [0.49, 0.45, 0.38],
        [0.58, 0.55, 0.47],
        [0.42, 0.41, 0.35],
        [0.58, 0.48, 0.44],
      ],
    },
    /** Lobed coral (Porites): a mound of smooth rounded lobes. */
    brain: {
      shapes: 3,
      isRock: false,
      tall: 0.4,
      tints: [
        [0.58, 0.49, 0.29],
        [0.4, 0.43, 0.27],
        [0.62, 0.54, 0.38],
        [0.6, 0.52, 0.28],
        [0.4, 0.47, 0.38],
      ],
      simplerBeyond: 15,
    },
    /** Bushy coral (Acropora): a dome of many short fine branches, paler at the tips. */
    bush: {
      shapes: 3,
      isRock: false,
      tall: 0.5,
      tints: [
        [0.59, 0.48, 0.39],
        [0.49, 0.39, 0.29],
        [0.62, 0.57, 0.45],
        [0.53, 0.41, 0.39],
        [0.54, 0.47, 0.35],
      ],
      simplerBeyond: 10,
    },
    /** Staghorn coral: a thicket of forking branches, pale at the tips. */
    stag: {
      shapes: 2,
      isRock: false,
      tall: 0.85,
      tints: [
        [0.5, 0.39, 0.28],
        [0.46, 0.54, 0.59],
        [0.64, 0.59, 0.47],
      ],
    },
    /** Table coral: a wide thin plate on a short stalk; the second model has a smaller plate above. */
    table: {
      shapes: 2,
      isRock: false,
      tall: 0.6,
      tints: [
        [0.54, 0.47, 0.35],
        [0.6, 0.58, 0.44],
        [0.5, 0.4, 0.3],
      ],
    },
    /** Cauliflower coral: a tight bunch of knobs. */
    knob: {
      shapes: 2,
      isRock: false,
      tall: 0.45,
      tints: [
        [0.6, 0.55, 0.3],
        [0.56, 0.43, 0.47],
        [0.38, 0.44, 0.28],
      ],
      simplerBeyond: 11,
    },
    smallKnob: {
      shapes: 2,
      isRock: false,
      tall: 0.45,
      tints: [
        [0.6, 0.55, 0.3],
        [0.56, 0.43, 0.47],
        [0.38, 0.44, 0.28],
      ],
    },
    smallBrain: {
      shapes: 2,
      isRock: false,
      tall: 0.4,
      tints: [
        [0.58, 0.49, 0.29],
        [0.4, 0.43, 0.27],
        [0.62, 0.54, 0.38],
        [0.4, 0.47, 0.38],
      ],
    },
    /** Giant clam: two fat ribbed shells a little open, the fleshy lips between them vivid. */
    clam: { shapes: 3, isRock: false, tall: 0.4, tints: [[0.74, 0.7, 0.62]] },
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

  /** Coral heads are looked for within this distance of home, to east and west and to north and south. */
  headsWithin: 150,
  /**
   * The map of how high the heads stand, for the water and the ground: dots a side, and the metres
   * it covers about home. It reaches 26 m past the furthest head, which is as far as the rock
   * painted round the widest head does: a map that stopped short cut that rock off in a straight
   * line.
   */
  mapSize: 256,
  mapSpan: 352,
} as const;
