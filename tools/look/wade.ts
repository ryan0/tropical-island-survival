// Draws what the player sees while moving through the water, frame by frame, and joins the frames
// into a clip that plays at full speed:
//
//   node tools/look/wade.ts <folder> [--page <index.html>] [--walk lagoon-wade] [--seconds 3] [--rate 30]
//     [--size 1280x720] [--switches "no bending,steady eye"] [--no-clip]
//
// The software renderer takes a second over a frame, so it cannot show motion as it runs. But the
// page's clock is stepped by the tools, so a walk can be drawn one frame at a time, each a
// thirtieth of a second on from the last, with the player walking as the keys make it walk; and
// ffmpeg joins the pictures into <folder>/<walk>.mp4. That is the only way anything here shows
// what moves as the eye moves: a still, and two stills a moment apart from one spot, cannot
// (README.md, "What moves as the eye moves").
//
// --walk is one of the walks below. --switches turns on switches of the debug panel by their
// labels, as "what makes wading queasy" has them. Each frame's place goes into <folder>/walk.json:
// where the eye was, which way it looked and how deep the floor lay under it.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, type Page } from '@playwright/test';
import playwrightConfig from '../../playwright.config.ts';
import type { ReferenceView } from '../../tests/reference-views.ts';
import { openScenePage, showMoment, takePicture } from '../../tests/scene-page.ts';

const repository = path.resolve(import.meta.dirname, '../..');

interface Walk {
  /** Where it starts: x, z. */
  from: [number, number];
  /** The player looks along (-sin yaw, -cos yaw), and walks that way. */
  yaw: number;
  /** A wader looks ahead and a little down. */
  pitch: number;
}

// The player wades where the water is 0.2 to 1.2 m deep, and swims where it is deeper: most of
// the shallows are swum, with the eye half a metre over the water. (A swimmer looks level: one
// who pushes forward looking down dives.)
const WALKS: Record<string, Walk> = {
  // along the lagoon's south shore, knee to waist deep
  'lagoon-wade': { from: [2, 100], yaw: -1.03, pitch: -0.25 },
  // along the lagoon's shelf off that shore, 1.6 m deep
  'lagoon-swim': { from: [-28, 96], yaw: -Math.PI / 2, pitch: 0 },
  // along the ocean beach off home, in the swash
  'reef-wade': { from: [-25, 172], yaw: -Math.PI / 2, pitch: -0.25 },
  // along the reef flat, 1.3 to 1.5 m deep, riding what the swell sends over it
  'reef-swim': { from: [-28, 200], yaw: -Math.PI / 2, pitch: 0 },
};

// Frames run before the first is kept: the eye settles to its height and the walk to its pace.
const FRAMES_TO_SETTLE = 20;
// The corner button opens the debug panel when held for 1.3 s, on the browser's own clock.
const LONG_PRESS_MILLISECONDS = 1600;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    page: { type: 'string', default: path.join(repository, 'dist', 'index.html') },
    walk: { type: 'string', default: 'lagoon-wade' },
    seconds: { type: 'string', default: '3' },
    rate: { type: 'string', default: '30' },
    size: { type: 'string', default: '1280x720' },
    switches: { type: 'string' },
    'no-clip': { type: 'boolean', default: false },
  },
});
if (positionals.length !== 1) throw new Error('say where the frames are to go');
const [folder] = positionals;
if (!(values.walk in WALKS)) {
  throw new Error(`there is no walk called '${values.walk}': ${Object.keys(WALKS).join(', ')}`);
}
const walk = WALKS[values.walk];
const [width, height] = values.size.split('x').map(Number);
const framesASecond = Number(values.rate);
const frameCount = Math.round(Number(values.seconds) * framesASecond);
if (!(width > 0 && height > 0 && frameCount > 0))
  throw new Error('a size, a rate or a time is not a number');

async function holdTheCornerButton(page: Page): Promise<void> {
  await page.locator('#tod').dispatchEvent('pointerdown');
  await page.waitForTimeout(LONG_PRESS_MILLISECONDS);
  await page.locator('#tod').dispatchEvent('pointerup');
}

async function switchOn(page: Page, labels: string[]): Promise<void> {
  if (labels.length === 0) return;

  await holdTheCornerButton(page);
  for (const label of labels) await page.getByRole('button', { name: label, exact: true }).click();
  // (closed again: the panel would be in every frame)
  await holdTheCornerButton(page);
}

mkdirSync(folder, { recursive: true });
const browser = await chromium.launch(playwrightConfig.use?.launchOptions);
const context = await browser.newContext({ viewport: { width, height } });
const { page, problems } = await openScenePage(context, path.resolve(values.page));
// (the page's own field of view for a window of this shape, which showMoment would otherwise set)
const fieldOfView = await page.evaluate(() => window.__scene.camera.fov);
const view: ReferenceView = {
  name: values.walk,
  shows: 'the player moving through the water',
  pose: [walk.from[0], 2, walk.from[1], walk.yaw, walk.pitch],
  fieldOfView,
  moments: [{ waveTime: 20, wind: 0.66, cloudCover: 0.2, sun: { dayPhase: 0.5 } }],
};
await showMoment(page, view, view.moments[0]);
await switchOn(page, values.switches?.split(',').map((label) => label.trim()) ?? []);

// The eye is the player's own from here on, and the waves run with the page's clock.
await page.evaluate(
  ([x, z, yaw, pitch]) => {
    window.__cameraPose = undefined;
    window.__isClockStopped = false;
    window.__scene.placePlayer(x, z, yaw, pitch);
  },
  [...walk.from, walk.yaw, walk.pitch] as const,
);
await page.keyboard.down('w');

const frameMilliseconds = 1000 / framesASecond;
const runAFrame = (milliseconds: number) =>
  page.evaluate((each) => {
    window.__runFrames(1, each);
    const hooks = window.__scene;
    const { camera } = hooks;
    const { x, y, z } = camera.position;
    return {
      x,
      y,
      z,
      yaw: camera.rotation.y,
      pitch: camera.rotation.x,
      ground: hooks.groundHeight(x, z),
    };
  }, milliseconds);

for (let frame = 0; frame < FRAMES_TO_SETTLE; frame++) await runAFrame(frameMilliseconds);
const places = [];
for (let frame = 0; frame < frameCount; frame++) {
  places.push(await runAFrame(frameMilliseconds));
  const name = `frame-${String(frame).padStart(4, '0')}.png`;
  writeFileSync(path.join(folder, name), await takePicture(page, view));
}
await browser.close();

writeFileSync(
  path.join(folder, 'walk.json'),
  JSON.stringify({ walk: values.walk, framesASecond, width, height, fieldOfView, places }),
);
const depths = places.map((place) => -place.ground);
const eyes = places.map((place) => place.y);
console.log(
  `${values.walk}: ${frameCount} frames; the floor ${Math.min(...depths).toFixed(2)} to ` +
    `${Math.max(...depths).toFixed(2)} m down; the eye ${Math.min(...eyes).toFixed(2)} to ` +
    `${Math.max(...eyes).toFixed(2)} m over the still sea`,
);

if (!values['no-clip']) {
  const clip = path.join(folder, `${values.walk}.mp4`);
  try {
    execFileSync(
      'ffmpeg',
      ['-loglevel', 'error', '-y', '-framerate', String(framesASecond)].concat(
        ['-i', path.join(folder, 'frame-%04d.png')],
        // (a picture format every player and phone can show)
        ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', clip],
      ),
    );
    console.log(clip);
  } catch {
    console.warn('The frames are drawn, but ffmpeg could not join them into a clip.');
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
}
