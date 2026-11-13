import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { BrowserContext, Page } from '@playwright/test';
import { threeLibraryFile, threeLibraryOnCdn } from './pages';
import type { Moment, ReferenceView } from './reference-views';

// The page's own cloud pictures are 4096 wide, which the software renderer takes far too long over.
const CLOUD_PICTURE_WIDTH = 1024;
// The longest step the frame loop accepts before it starts to clip.
const FRAME_MILLISECONDS = 50;
// The first frame sizes the canvas and the second ends the fly-in.
const FRAMES_TO_START = 2;
// Everything is placed and drawn within one frame; the second is slack for anything a frame late.
const FRAMES_PER_MOMENT = 2;

const CONTROLS = '#title, #cap, #hint, #joy, #snd, #tod, #menu';

export interface ScenePage {
  page: Page;
  /** Page errors, console errors and anything the page reports as failed. */
  problems: string[];
}

// Two renders of one view are the same to the last pixel only if the page lives through exactly
// the same frames. So the page's clock is replaced by one the tests step: nothing moves between
// steps, and how long the software renderer takes over a frame does not matter.
// The page must take the time from requestAnimationFrame and performance.now and nowhere else.
function installSteppedClock(): void {
  let waitingFrame: FrameRequestCallback | null = null;
  let now = 0;
  window.requestAnimationFrame = (callback) => {
    waitingFrame = callback;
    return 0;
  };
  performance.now = () => now;
  window.__runFrames = (count, millisecondsEach) => {
    for (let i = 0; i < count; i++) {
      const frame = waitingFrame;
      waitingFrame = null;
      now += millisecondsEach;
      frame?.(now);
    }
  };
}

function collectProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    // Build 78 drops a part of the scene that throws and carries on, saying so only in the log.
    const saysFailed = message.text().includes(' failed: ');
    if (message.type() === 'error' || saysFailed) problems.push(`console: ${message.text()}`);
  });
  return problems;
}

export async function openScenePage(context: BrowserContext, file: string): Promise<ScenePage> {
  const page = await context.newPage();
  const problems = collectProblems(page);

  await page.addInitScript(installSteppedClock);
  await page.addInitScript((cloudPictureWidth) => {
    window.__noq = 1;
    window.__cloudW = cloudPictureWidth;
  }, CLOUD_PICTURE_WIDTH);
  await page.route(threeLibraryOnCdn, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: readFileSync(threeLibraryFile) }),
  );

  await page.goto(pathToFileURL(file).href);
  await page.evaluate(
    ([frames, milliseconds]) => {
      window.__lag.skip();
      window.__runFrames(frames, milliseconds);
    },
    [FRAMES_TO_START, FRAME_MILLISECONDS] as const,
  );
  return { page, problems };
}

export async function showMoment(page: Page, view: ReferenceView, moment: Moment): Promise<void> {
  await page.evaluate(
    ({ view, moment, frames, milliseconds }) => {
      const hooks = window.__lag;
      const [x, height, z, yaw, pitch] = view.pose;
      const y = view.heightIsAboveGround ? hooks.hgt(x, z) + height : height;

      hooks.freeze(moment.waveTime);
      window.__wind = moment.wind;
      window.__weather = moment.cloudCover;
      if ('dayPhase' in moment.sun) hooks.phase(moment.sun.dayPhase);
      else hooks.sun(moment.sun.elevation);
      window.__fly = [x, y, z, yaw, pitch];
      hooks.cam.fov = view.fieldOfView;
      hooks.cam.updateProjectionMatrix();

      window.__runFrames(frames, milliseconds);
    },
    { view, moment, frames: FRAMES_PER_MOMENT, milliseconds: FRAME_MILLISECONDS },
  );
}

export async function takePicture(page: Page, view: ReferenceView): Promise<Buffer> {
  // Transitions and animations in the page's style sheet run on the browser's own clock, which
  // the tests do not step; 'disabled' jumps each to its end.
  return page.screenshot({
    animations: 'disabled',
    style: view.showsControls ? undefined : `${CONTROLS} { display: none !important; }`,
  });
}

export interface DrawnView {
  /** One picture for each of the view's moments, in order. */
  pictures: Buffer[];
  problems: string[];
}

export async function drawView(
  context: BrowserContext,
  file: string,
  view: ReferenceView,
): Promise<DrawnView> {
  const { page, problems } = await openScenePage(context, file);
  const pictures: Buffer[] = [];
  for (const moment of view.moments) {
    await showMoment(page, view, moment);
    pictures.push(await takePicture(page, view));
  }
  await page.close();
  return { pictures, problems };
}
