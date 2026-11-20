// Lays each of our matched views beside the photograph it is matched to, as large as they come,
// one sheet a pair (boards/pairs.json):
//
//   node tools/look/pair-sheets.ts <pairs.json> <folder of our views> <folder for the sheets>
//
// The views are look-views.ts's group `pairs`, drawn large (draw-views.ts --group pairs --size
// 1600x900). A pair is for looking at, not measuring: what the photograph has that ours has not.

import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { drawPageToPicture } from './page-picture.ts';

interface Pair {
  /** The name of our view. */
  view: string;
  /** The photograph, from the folder of reference photographs. */
  photo: string;
  /** What the photograph shows that ours should. */
  shows: string;
}

const repository = path.resolve(import.meta.dirname, '../..');
const PHOTOS = path.join(repository, 'reference-photos');
// Each picture is fitted into a box of this size, whatever its shape.
const BOX = { width: 1500, height: 940 };
const GAP = 8;

const places = process.argv.slice(2);
if (places.length !== 3) {
  throw new Error('name the pairs, the folder of our views and a folder for the sheets');
}
const [pairsFile, viewsFolder, sheetsFolder] = places;
const { pairs } = JSON.parse(readFileSync(pairsFile, 'utf8')) as { pairs: Pair[] };
mkdirSync(sheetsFolder, { recursive: true });

const style = `
  body { margin: 0; padding: ${GAP}px; background: #181818; color: #ddd; font: 15px sans-serif; }
  div { display: grid; grid-template-columns: repeat(2, ${BOX.width}px); gap: ${GAP}px; }
  img { width: ${BOX.width}px; height: ${BOX.height}px; object-fit: contain; background: #000; }
  p { margin: 6px 0 0; }`;

for (const pair of pairs) {
  const photo = pathToFileURL(path.join(PHOTOS, pair.photo)).href;
  const ours = pathToFileURL(path.resolve(viewsFolder, `${pair.view}.png`)).href;
  await drawPageToPicture(
    `<style>${style}</style><div><img src="${photo}"><img src="${ours}"></div>` +
      `<p>${pair.photo} beside ${pair.view}. ${pair.shows}</p>`,
    path.join(sheetsFolder, `${pair.view}.png`),
    2 * BOX.width + 3 * GAP,
  );
  console.log(pair.view);
}
