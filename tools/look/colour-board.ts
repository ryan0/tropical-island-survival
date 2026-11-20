// Measures a board's materials in the reference photographs and in our own pictures, and lays
// the colours side by side (docs/LOOK.md, "Colour, measured"):
//
//   node tools/look/colour-board.ts <board.json> <board.png> --now <folder> [--before <folder>]
//
// --now is a folder of our views as draw-views.ts drew them; --before, another such folder from
// an earlier build, adds a column, so that a pass at the colours shows what it moved. The same
// figures are printed.
//
// The figures are to steer by, not to hit: a photograph's exposure and white balance are its
// own, and a part of ours is never quite the same thing as a part of theirs.

import { parseArgs } from 'node:util';
import { ourParts, photoParts, readBoard } from './board.ts';
import { hueTurn, oklabOfOklch, rgbOfOklab, type Oklch } from './oklch.ts';
import { drawPageToPicture } from './page-picture.ts';
import { colourOfAll } from './picture-parts.ts';

const BOARD_WIDTH = 1260;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { now: { type: 'string' }, before: { type: 'string' } },
});
if (positionals.length !== 2 || values.now === undefined) {
  throw new Error('name the board, the picture to write, and --now a folder of our views');
}
const [boardFile, picture] = positionals;
const { now, before } = values;

/** Ours against the photographs': "chroma x1.4, hue +8, lightness -0.05". */
function against(photos: Oklch, ours: Oklch): string {
  const chroma = (ours.chroma / Math.max(photos.chroma, 1e-4)).toFixed(1);
  const hue = hueTurn(photos.hue, ours.hue).toFixed(0);
  const lightness = (ours.lightness - photos.lightness).toFixed(2);
  return `chroma x${chroma}, hue ${signed(hue)}, lightness ${signed(lightness)}`;
}

function signed(number: string): string {
  return number.startsWith('-') ? number : `+${number}`;
}

function figures({ lightness, chroma, hue }: Oklch): string {
  return `lightness ${lightness.toFixed(2)} · chroma ${chroma.toFixed(3)} · hue ${hue.toFixed(0)}°`;
}

function swatch(colour: Oklch, photos?: Oklch): string {
  const [red, green, blue] = rgbOfOklab(oklabOfOklch(colour)).map((channel) => channel * 255);
  const note = photos === undefined ? '' : `<br><small>${against(photos, colour)}</small>`;
  return `<td><div style="background:rgb(${red.toFixed(0)},${green.toFixed(0)},${blue.toFixed(0)})"></div>${figures(colour)}${note}</td>`;
}

const rows: string[] = [];
for (const material of readBoard(boardFile)) {
  const photos = colourOfAll(photoParts(material));
  const oursNow = colourOfAll(ourParts(material, now));
  const oursBefore = before === undefined ? undefined : colourOfAll(ourParts(material, before));

  const cells = [swatch(photos)];
  if (oursBefore !== undefined) cells.push(swatch(oursBefore, photos));
  cells.push(swatch(oursNow, photos));
  const count = `<small>${material.photos.length} photos</small>`;
  rows.push(`<tr><th>${material.name}<br>${count}</th>${cells.join('')}</tr>`);

  const was = oursBefore === undefined ? '' : `  before: ${against(photos, oursBefore)};`;
  console.log(
    `${material.name.padEnd(36)} photos: ${figures(photos)};${was}  now: ${against(photos, oursNow)}`,
  );
}

const headings = [
  'What the photos measure',
  ...(before === undefined ? [] : ['Ours, before']),
  'Ours, now',
];
const style = `
  body { margin: 10px; background: #8a8a8a; color: #111; font: 13px sans-serif; }
  table { border-collapse: collapse; }
  tr { border-bottom: 1px solid #666; }
  th { width: 210px; padding: 8px; text-align: left; vertical-align: top; font-size: 15px; }
  td { width: 330px; padding: 6px 8px; vertical-align: top; font-size: 12px; }
  td div { height: 64px; margin-bottom: 3px; }
  small { font-size: 11px; font-weight: normal; }
  h3 { margin: 4px 0; }`;
const head = `<tr><th></th>${headings.map((heading) => `<td><h3>${heading}</h3></td>`).join('')}</tr>`;

await drawPageToPicture(
  `<style>${style}</style><table>${head}${rows.join('')}</table>`,
  picture,
  BOARD_WIDTH,
);
