// Draws the look's views (look-views.ts) from a build of the page, one picture each:
//
//   node tools/look/draw-views.ts <folder> [--page <index.html>] [--group colour] [--only a,b]
//
// <folder> is where the pictures go, each named for its view. --page is the built page to draw:
// the working files' (dist/index.html, after `npm run build`) unless another is named, such as a
// reference build kept by the checks (node_modules/.cache/reference-builds/<commit>.html), which
// is how "before" pictures are made. --group is colour (the default), evening, weather or all.
//
// The pictures are drawn by the software renderer, as the tests' are: colour and stills can be
// trusted, motion and frame rate cannot.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import playwrightConfig from '../../playwright.config.ts';
import { openScenePage, showMoment, takePicture } from '../../tests/scene-page.ts';
import { lookViews, type ViewGroup } from './look-views.ts';

const repository = path.resolve(import.meta.dirname, '../..');
// A phone held sideways is about this shape; the tests' own pictures are square.
const PICTURE = { width: 1000, height: 560 };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    page: { type: 'string', default: path.join(repository, 'dist', 'index.html') },
    group: { type: 'string', default: 'colour' },
    only: { type: 'string' },
  },
});
if (positionals.length !== 1) throw new Error('say where the pictures are to go');
const [folder] = positionals;

function viewsOf(group: string) {
  if (group === 'all') return Object.values(lookViews).flat();
  if (!(group in lookViews)) throw new Error(`there is no group of views called '${group}'`);
  return lookViews[group as ViewGroup];
}

const wanted = values.only?.split(',');
const views = viewsOf(values.group).filter((view) => wanted?.includes(view.name) ?? true);
if (views.length === 0) throw new Error('no view has any of those names');

mkdirSync(folder, { recursive: true });
const browser = await chromium.launch(playwrightConfig.use?.launchOptions);
const context = await browser.newContext({ viewport: PICTURE });
// One page draws every view: each view sets all that it depends on.
const { page, problems } = await openScenePage(context, path.resolve(values.page));
for (const view of views) {
  await showMoment(page, view, view.moments[0]);
  writeFileSync(path.join(folder, `${view.name}.png`), await takePicture(page, view));
  console.log(view.name);
}
await browser.close();

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
}
