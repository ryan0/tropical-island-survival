import { FULL_TURN, mix, type Rgb } from '../../core/maths';
import { within, type Random, type Range } from '../../core/random';
import { lowPlantsTileConfig } from './low-plants-tile-config';

/** Steps along a leaf's outline from its stalk to its tip. */
export const OUTLINE_STEPS = 16;

/** A leaf blade seen from above, in dots: its base at (x, y), its tip along `angle`. */
export interface Leaf {
  x: number;
  y: number;
  angle: number;
  length: number;
  /** How far the blade reaches either side of its midrib: to the left, and to the right. */
  leftWidth: number;
  rightWidth: number;
  /** How far from the midrib the edge lies at each of OUTLINE_STEPS + 1 steps, as a share of the width. */
  outline: Float32Array;
  /** A notch cut back into the tip (beach morning glory's), how deep and how wide either side; 0 for none. */
  notchDepth: number;
  notchWidth: number;
  colour: Rgb;
  /** One half of a folded leaf catches more light than the other: + the right, - the left. */
  lighterHalf: number;
}

const { morningGlory, leaves, colours, shading } = lowPlantsTileConfig;

interface BladeShape {
  /** Where along the blade it is widest, as a share of its length. */
  widest: Range;
  /** How full the outline is towards the stalk and towards the tip: 1 pointed, 2 an oval, 3 squarer. */
  baseFullness: Range;
  tipFullness: Range;
}

const BLADE_SHAPES = {
  morningGlory: { widest: [0.42, 0.62], baseFullness: [1.8, 2.6], tipFullness: [1.8, 2.5] },
  creeper: { widest: [0.35, 0.5], baseFullness: [1.6, 2.2], tipFullness: [1.2, 2.0] },
  seedling: { widest: [0.25, 0.4], baseFullness: [1.5, 2.0], tipFullness: [1.0, 1.4] },
} satisfies Record<string, BladeShape>;
export type BladeKind = keyof typeof BLADE_SHAPES;
// Outlines made for each kind of blade, to share among its leaves; each leaf has its own
// length, widths either side and notch besides, so that no two are alike.
const OUTLINES_OF_A_KIND = 48;

export type BladeOutlines = Record<BladeKind, readonly Float32Array[]>;

function bladeOutline(random: Random, shape: BladeShape): Float32Array {
  const widest = within(random, shape.widest);
  const baseFullness = within(random, shape.baseFullness);
  const tipFullness = within(random, shape.tipFullness);
  const wobble = within(random, leaves.wobble);
  const wobbleWaves = within(random, leaves.wobbleWaves);
  const wobblePhase = random() * FULL_TURN;
  // One step more than the outline has, so that the last step can be read with its successor.
  const outline = new Float32Array(OUTLINE_STEPS + 2);
  for (let step = 0; step <= OUTLINE_STEPS; step++) {
    const along = step / OUTLINE_STEPS;
    const fromWidest = along < widest ? (widest - along) / widest : (along - widest) / (1 - widest);
    const fullness = along < widest ? baseFullness : tipFullness;
    const wave = 1 + wobble * Math.sin(along * wobbleWaves * Math.PI + wobblePhase);
    outline[step] = Math.pow(1 - Math.pow(fromWidest, fullness), 1 / fullness) * wave;
  }
  return outline;
}

/** A few dozen outlines for each kind of blade, for its leaves to share. */
export function createBladeOutlines(random: Random): BladeOutlines {
  const outlinesOf = (shape: BladeShape): Float32Array[] =>
    Array.from({ length: OUTLINES_OF_A_KIND }, () => bladeOutline(random, shape));
  return {
    morningGlory: outlinesOf(BLADE_SHAPES.morningGlory),
    creeper: outlinesOf(BLADE_SHAPES.creeper),
    seedling: outlinesOf(BLADE_SHAPES.seedling),
  };
}

/** A leaf's colour: its plant's, a little lighter or darker, yellower or greyer; now and then old and yellow-brown. */
export function leafColour(random: Random, base: Rgb, plantLightness: number): Rgb {
  const yellowing = random() ** 2 * colours.mostYellowing;
  let red = mix(base[0], colours.yellowerLeaf[0], yellowing);
  let green = mix(base[1], colours.yellowerLeaf[1], yellowing);
  let blue = mix(base[2], colours.yellowerLeaf[2], yellowing);
  if (random() < colours.oldLeafChance) {
    const age = within(random, colours.oldLeafAge);
    red = mix(red, colours.oldLeaf[0], age);
    green = mix(green, colours.oldLeaf[1], age);
    blue = mix(blue, colours.oldLeaf[2], age);
  }
  const greying = random() ** 2 * colours.mostGreying;
  const grey = 0.3 * red + 0.59 * green + 0.11 * blue;
  const lightness = within(random, colours.leafLightness) * plantLightness;
  return [
    mix(red, grey, greying) * lightness,
    mix(green, grey, greying) * lightness,
    mix(blue, grey, greying) * lightness,
  ];
}

export interface Blade {
  /** Where its base is, in dots. */
  at: readonly [x: number, y: number];
  angle: number;
  /** In dots. */
  length: number;
  /** Width across, as a share of the length. */
  width: number;
  kind: BladeKind;
  colour: Rgb;
  /** As a share of the length; none if left out. */
  notchDepth?: number;
}

export function leafOf(
  random: Random,
  outlines: BladeOutlines,
  { at, angle, length, width, kind, colour, notchDepth = 0 }: Blade,
): Leaf {
  const halfWidth = (length * width) / 2;
  const leftWidth = halfWidth * within(random, leaves.halfWidth);
  return {
    x: at[0],
    y: at[1],
    angle,
    length,
    leftWidth,
    rightWidth: halfWidth * within(random, leaves.halfWidth),
    outline: outlines[kind][Math.floor(random() * OUTLINES_OF_A_KIND)],
    notchDepth: notchDepth * length,
    notchWidth: halfWidth * within(random, morningGlory.notchWidth),
    colour,
    lighterHalf: (random() * 2 - 1) * shading.foldHalves,
  };
}
