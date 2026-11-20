// Says how busy each of a board's materials is in the reference photographs and in ours: how far
// the dots of a part stray from the part's own average, in lightness and in colour
// (picture-parts.ts has what is measured).
//
//   node tools/look/busyness.ts <board.json> --now <folder>
//
// For this the parts of a board must each hold one material at about the same size in the world,
// photograph and ours: a blade of grass across a patch of sand is a great deal of spread.

import { parseArgs } from 'node:util';
import { ourParts, photoParts, readBoard } from './board.ts';
import { spreadOf, type Part, type Spread } from './picture-parts.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { now: { type: 'string' } },
});
if (positionals.length !== 1 || values.now === undefined) {
  throw new Error('name the board, and --now a folder of our views');
}
const [boardFile] = positionals;

function averageSpread(parts: readonly Part[]): Spread {
  const spreads = parts.map(spreadOf);
  return {
    lightness: spreads.reduce((sum, spread) => sum + spread.lightness, 0) / spreads.length,
    colour: spreads.reduce((sum, spread) => sum + spread.colour, 0) / spreads.length,
  };
}

function compared(photos: number, ours: number): string {
  const times = (ours / Math.max(photos, 1e-4)).toFixed(1);
  return `photos ${photos.toFixed(3)}, ours ${ours.toFixed(3)} (x${times})`;
}

for (const material of readBoard(boardFile)) {
  const photos = averageSpread(photoParts(material));
  const ours = averageSpread(ourParts(material, values.now));
  console.log(
    `${material.name.padEnd(32)} lightness: ${compared(photos.lightness, ours.lightness)}` +
      `   colour: ${compared(photos.colour, ours.colour)}`,
  );
}
