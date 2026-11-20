// A colour of ours in OKLCH and back, for moving it towards what the photographs measure:
//
//   node tools/look/colour.ts show 0.07 0.36 0.84         red green blue, as the code writes them
//   node tools/look/colour.ts make 0.66 0.107 250         lightness chroma hue
//   node tools/look/colour.ts move 0.07 0.36 0.84 0.05 0.7 -10
//
// `move` adds to the lightness, multiplies the chroma and turns the hue by degrees: the example
// is the same blue a little lighter, at seven tenths of its saturation, ten degrees towards
// green. The answer is clipped to what a picture can hold.

import { describe, oklchOf, rgbOf, writeRgb, type Oklch } from './oklch.ts';

const [action, ...words] = process.argv.slice(2);
const numbers = words.map(Number);
if (numbers.some(Number.isNaN)) throw new Error('every argument after the first is a number');

function show(colour: Oklch): void {
  const rgb = rgbOf(colour);
  console.log(`${writeRgb(rgb)}   (${describe(oklchOf(rgb))})`);
}

if (action === 'show' && numbers.length === 3) {
  console.log(describe(oklchOf([numbers[0], numbers[1], numbers[2]])));
} else if (action === 'make' && numbers.length === 3) {
  show({ lightness: numbers[0], chroma: numbers[1], hue: numbers[2] });
} else if (action === 'move' && numbers.length === 6) {
  const [red, green, blue, lightnessAdded, chromaTimes, hueTurned] = numbers;
  const from = oklchOf([red, green, blue]);
  show({
    lightness: Math.min(1, Math.max(0, from.lightness + lightnessAdded)),
    chroma: from.chroma * chromaTimes,
    hue: from.hue + hueTurned,
  });
} else {
  throw new Error('show r g b, make lightness chroma hue, or move r g b +lightness xchroma +hue');
}
