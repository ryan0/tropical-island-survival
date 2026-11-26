// Draws what the player sees while moving through the water, frame by frame, and joins the frames
// into a clip that plays at full speed:
//
//   node tools/look/wade.ts <folder> [--page <index.html>] [--walk lagoon-wade] [--seconds 3] [--rate 30]
//     [--size 1280x720] [--switches "steady eye"] [--levels "ripples bend=0,light net=1.5"] [--no-clip]
//     [--truth]
//
// The software renderer takes a second over a frame, so it cannot show motion as it runs. But the
// page's clock is stepped by the tools, so a walk can be drawn one frame at a time, each a
// thirtieth of a second on from the last, with the player walking as the keys make it walk; and
// ffmpeg joins the pictures into <folder>/<walk>.mp4. That is the only way anything here shows
// what moves as the eye moves: a still, and two stills a moment apart from one spot, cannot
// (README.md, "What moves as the eye moves").
//
// --walk is one of the walks below. --switches turns on switches of the debug panel by their
// labels, and --levels sets its sliders by theirs. Each frame's place goes into <folder>/walk.json:
// where the eye was, which way it looked and how deep the floor lay under it. With --truth, every
// tenth frame also records what the law of refraction would show through a flat, still sea at
// spots over the screen: wade-flow.ts holds the picture against it.

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
  // out from the shallows off home over the rim of the basin there
  'basin-swim': { from: [-15, 206], yaw: Math.PI, pitch: 0 },
};

// Frames run before the first is kept: the eye settles to its height and the walk to its pace.
const FRAMES_TO_SETTLE = 20;
// The corner button opens the debug panel when held for 1.3 s, on the browser's own clock.
const LONG_PRESS_MILLISECONDS = 1600;
// With --truth: what refraction would show is worked out for spots this far apart, every so many
// frames.
const TRUTH_SPOTS_APART = 16;
const TRUTH_EVERY = 10;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    page: { type: 'string', default: path.join(repository, 'dist', 'index.html') },
    walk: { type: 'string', default: 'lagoon-wade' },
    seconds: { type: 'string', default: '3' },
    rate: { type: 'string', default: '30' },
    size: { type: 'string', default: '1280x720' },
    switches: { type: 'string' },
    levels: { type: 'string' },
    'no-clip': { type: 'boolean', default: false },
    truth: { type: 'boolean', default: false },
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

/** Turns on the debug panel's switches so labelled, and sets its sliders as `label=level`. */
async function setThePanel(page: Page, switches: string[], levels: string[]): Promise<void> {
  if (switches.length === 0 && levels.length === 0) return;

  await holdTheCornerButton(page);
  for (const label of switches)
    await page.getByRole('button', { name: label, exact: true }).click();
  for (const each of levels) {
    const [label, level] = each.split('=').map((part) => part.trim());
    const slider = page.locator('.debug-slider', { hasText: label }).locator('input');
    await slider.evaluate((input: HTMLInputElement, value) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }, level);
  }
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
const listed = (list: string | undefined) => list?.split(',').map((each) => each.trim()) ?? [];
await setThePanel(page, listed(values.switches), listed(values.levels));

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

/**
 * Runs in the page. For spots over the screen, the point of the sea floor that the law of
 * refraction shows there through a flat sea at the still level: the eye's line to the surface,
 * bent as it enters the water, followed down to the ground. Each spot is four numbers: across
 * and down the screen in dots, then the point's x and z.
 */
function whatRefractionShows([width, height, spotsApart]: readonly number[]): number[] {
  const INTO_WATER = 0.75;
  const STEP = 0.02;
  const FURTHEST = 14;
  const hooks = window.__scene;
  const { camera } = hooks;
  const turn = camera.matrixWorld.elements;
  const eye = camera.position;
  const halfHeight = Math.tan((camera.fov * Math.PI) / 360);
  const spots: number[] = [];
  for (let down = spotsApart / 2; down < height; down += spotsApart) {
    for (let across = spotsApart / 2; across < width; across += spotsApart) {
      const right = (((across + 0.5) / width) * 2 - 1) * halfHeight * camera.aspect;
      const up = (1 - ((down + 0.5) / height) * 2) * halfHeight;
      let lineX = turn[0] * right + turn[4] * up - turn[8];
      let lineY = turn[1] * right + turn[5] * up - turn[9];
      let lineZ = turn[2] * right + turn[6] * up - turn[10];
      const length = Math.hypot(lineX, lineY, lineZ);
      lineX /= length;
      lineY /= length;
      lineZ /= length;
      if (lineY > -0.01 || eye.y <= 0) continue;

      const toSea = -eye.y / lineY;
      const seaX = eye.x + lineX * toSea;
      const seaZ = eye.z + lineZ * toSea;
      if (hooks.groundHeight(seaX, seaZ) >= 0) continue;

      const bentX = lineX * INTO_WATER;
      const bentZ = lineZ * INTO_WATER;
      const bentY = -Math.sqrt(1 - INTO_WATER * INTO_WATER * (1 - lineY * lineY));
      let along = 0;
      while (along < FURTHEST) {
        const next = along + STEP;
        if (next * bentY <= hooks.groundHeight(seaX + bentX * next, seaZ + bentZ * next)) break;
        along = next;
      }
      if (along >= FURTHEST) continue;

      // (the ground is met within the last step: halved eight times, to a tenth of a millimetre)
      let above = along;
      let below = along + STEP;
      for (let halving = 0; halving < 8; halving++) {
        const middle = (above + below) / 2;
        const isUnder =
          middle * bentY <= hooks.groundHeight(seaX + bentX * middle, seaZ + bentZ * middle);
        if (isUnder) below = middle;
        else above = middle;
      }
      spots.push(across, down, seaX + bentX * above, seaZ + bentZ * above);
    }
  }
  return spots;
}

for (let frame = 0; frame < FRAMES_TO_SETTLE; frame++) await runAFrame(frameMilliseconds);
const places = [];
const truths: { frame: number; spots: number[] }[] = [];
for (let frame = 0; frame < frameCount; frame++) {
  places.push(await runAFrame(frameMilliseconds));
  const name = `frame-${String(frame).padStart(4, '0')}.png`;
  writeFileSync(path.join(folder, name), await takePicture(page, view));
  if (values.truth && frame % TRUTH_EVERY === 0) {
    const spots = await page.evaluate(whatRefractionShows, [width, height, TRUTH_SPOTS_APART]);
    truths.push({ frame, spots });
  }
}
await browser.close();

writeFileSync(
  path.join(folder, 'walk.json'),
  JSON.stringify({ walk: values.walk, framesASecond, width, height, fieldOfView, places, truths }),
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
