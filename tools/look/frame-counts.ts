// Counts what a whole frame draws, in some views: its triangles and its draws, with the picture
// of what is under the sea, the shadows and the screen taken together.
//
//   node tools/look/frame-counts.ts '<views>' [--page <index.html>] [--switches "the deep drawn twice"]
//
// <views> is JSON: [{ "name": "wading in the lagoon", "pose": [0, 0.9, 101, 0, -0.3] }, ...],
// each pose x, y, z, yaw, pitch as the reference views give theirs, with "aboveGround": true where
// its y is a height above the ground. --switches turns on switches of the debug panel by their
// labels: run once with a cost switch and once without, to count what the switch saves.
//
// (The debug panel's own count is of the frame's last drawing alone, as three.js keeps it. And a
// count is not a frame rate: it says how much is handed to the graphics card, which the phone
// must still be asked the cost of. docs/DEVICE_NOTES.md.)

import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, type Page } from '@playwright/test';
import playwrightConfig from '../../playwright.config.ts';
import type { ReferenceView } from '../../tests/reference-views.ts';
import { openScenePage, showMoment } from '../../tests/scene-page.ts';

const repository = path.resolve(import.meta.dirname, '../..');
// The corner button opens the debug panel when held for 1.3 s, on the browser's own clock.
const LONG_PRESS_MILLISECONDS = 1600;
const FIELD_OF_VIEW = 60;

interface CountedView {
  name: string;
  pose: ReferenceView['pose'];
  aboveGround?: boolean;
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    page: { type: 'string', default: path.join(repository, 'dist', 'index.html') },
    switches: { type: 'string' },
  },
});
if (positionals.length !== 1) throw new Error('say which views to count, as JSON');
const views = JSON.parse(positionals[0]) as CountedView[];

async function holdTheCornerButton(page: Page): Promise<void> {
  await page.locator('#tod').dispatchEvent('pointerdown');
  await page.waitForTimeout(LONG_PRESS_MILLISECONDS);
  await page.locator('#tod').dispatchEvent('pointerup');
}

const browser = await chromium.launch(playwrightConfig.use?.launchOptions);
const context = await browser.newContext({ viewport: { width: 800, height: 450 } });
const { page } = await openScenePage(context, path.resolve(values.page));
const switches = values.switches?.split(',').map((each) => each.trim()) ?? [];
if (switches.length > 0) {
  await holdTheCornerButton(page);
  for (const label of switches)
    await page.getByRole('button', { name: label, exact: true }).click();
  // (closed again, as it is when the game is played)
  await holdTheCornerButton(page);
}

for (const { name, pose, aboveGround } of views) {
  const view: ReferenceView = {
    name,
    shows: 'a view whose frame is counted',
    pose,
    heightIsAboveGround: aboveGround ?? false,
    fieldOfView: FIELD_OF_VIEW,
    moments: [{ waveTime: 20, wind: 0.66, cloudCover: 0.2, sun: { dayPhase: 0.5 } }],
  };
  await showMoment(page, view, view.moments[0]);
  const drawn = await page.evaluate(() => {
    const { info } = window.__scene.renderer;
    info.autoReset = false;
    info.reset();
    window.__runFrames(1, 33);
    const counted = { triangles: info.render.triangles, draws: info.render.calls };
    info.autoReset = true;
    return counted;
  });
  const thousands = String(Math.round(drawn.triangles / 1000)).padStart(5);
  console.log(`${name.padEnd(32)}${thousands} thousand triangles in ${drawn.draws} draws`);
}
await browser.close();
