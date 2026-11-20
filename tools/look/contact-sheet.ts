// Lays pictures out on one sheet, each under a grid of ten columns (A to J) and ten rows (0 to
// 9), so that a part of one can be named for measuring (picture-parts.ts): 'C3:E4'.
//
//   node tools/look/contact-sheet.ts <sheet.png> <picture>... [--across 3] [--cell 620]
//
// --across is how many pictures go in a row, --cell how wide each is drawn, in dots.

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { drawPageToPicture } from './page-picture.ts';

const COLUMNS = 'ABCDEFGHIJ';
const GAP = 6;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    across: { type: 'string', default: '3' },
    cell: { type: 'string', default: '620' },
  },
});
if (positionals.length < 2) {
  throw new Error('name the sheet to write, then the pictures to put on it');
}
const [sheet, ...pictures] = positionals;
const across = Number(values.across);
const cell = Number(values.cell);

/** The grid's lines and letters, laid over a picture by shares of its size. */
function grid(): string {
  const parts: string[] = [];
  for (let k = 1; k < COLUMNS.length; k++) {
    parts.push(`<i style="left:${k * 10}%;top:0;bottom:0;width:1px"></i>`);
    parts.push(`<i style="top:${k * 10}%;left:0;right:0;height:1px"></i>`);
  }
  for (let k = 0; k < COLUMNS.length; k++) {
    parts.push(`<b style="left:${k * 10 + 4}%;top:0">${COLUMNS[k]}</b>`);
    parts.push(`<b style="top:${k * 10 + 3}%;left:1px">${k}</b>`);
  }
  return parts.join('');
}

const figures = pictures.map((picture, index) => {
  const source = pathToFileURL(path.resolve(picture)).href;
  const caption = `${index + 1}. ${path.basename(picture)}`;
  return `<figure><div><img src="${source}">${grid()}</div><figcaption>${caption}</figcaption></figure>`;
});

const style = `
  body { margin: 0; padding: ${GAP}px; background: #222; color: #eee; font: 11px sans-serif;
    display: grid; grid-template-columns: repeat(${across}, ${cell}px); gap: ${GAP}px; }
  figure { margin: 0; }
  figure div { position: relative; line-height: 0; }
  img { width: ${cell}px; display: block; }
  i { position: absolute; background: rgba(255, 255, 255, 0.45); mix-blend-mode: difference; }
  b { position: absolute; font: bold 10px sans-serif; color: #fff; line-height: 1;
    text-shadow: 0 0 2px #000, 0 0 2px #000; }
  figcaption { padding: 2px 0 4px; }`;

await drawPageToPicture(
  `<style>${style}</style>${figures.join('')}`,
  sheet,
  across * (cell + GAP) + GAP,
);
