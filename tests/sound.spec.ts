import { expect, test, type BrowserContext } from '@playwright/test';
import { writeChangedCopy } from './changed-page';
import { legacyPage, scenePage } from './pages';
import { referenceViews, type Moment, type ReferenceView } from './reference-views';
import { openScenePage, showMoment } from './scene-page';

// Nothing here can listen. So the page is given an audio context that renders its sound into
// memory instead of playing it, and the samples that build 78 and the page under test render
// are compared: the same sound is the same numbers.

const RENDERED = { seconds: 2, samplesPerSecond: 22050 };
const FRAME_MILLISECONDS = 50;
// Long enough for the page to measure the surf that is breaking in front of the camera.
const FRAMES_OF_SURF = 10;
// The browser adds up the signals that steer one setting in whatever order they lie in its
// memory, so one sound rendered twice can differ by a rounding step of its samples, 0.00000006.
// The quietest step of a CD is five hundred times that; this allows sixteen rounding steps.
const ROUNDING = 1e-6;
// Crickets sing only at night, and the surf is loudest in a high wind.
const MIDNIGHT_IN_A_HIGH_WIND: Moment = {
  waveTime: 34.7,
  wind: 1,
  cloudCover: 0,
  sun: { dayPhase: 0 },
};

interface HeardSound {
  samples: number[];
  /** What the sound button says after one tap and after a second. */
  buttonTexts: (string | null)[];
  problems: string[];
}

function renderSoundInsteadOfPlayingIt({ seconds, samplesPerSecond }: typeof RENDERED): void {
  class RenderedSound extends OfflineAudioContext {
    constructor() {
      super(1, seconds * samplesPerSecond, samplesPerSecond);
      // The surf is made of random noise. From the moment the sound is built the page draws
      // its random numbers from one fixed series, so that two pages make the same noise.
      let last = 1;
      Math.random = () => {
        last = (last * 16807) % 2147483647;
        return last / 2147483647;
      };
      window.__sound = this;
    }

    // The page resumes its context at every tap; one that renders was never suspended.
    override resume(): Promise<void> {
      return Promise.resolve();
    }
  }
  window.AudioContext = RenderedSound as unknown as typeof AudioContext;
}

function removeAudioFromTheBrowser(): void {
  Object.assign(window, { AudioContext: undefined, webkitAudioContext: undefined });
}

function theOceanShore(): ReferenceView {
  const view = referenceViews.find((candidate) => candidate.name === 'ocean-shore');
  if (view === undefined) throw new Error('the ocean-shore view is gone');
  return view;
}

async function tapTheSoundButton(context: BrowserContext, file: string) {
  const { page, problems } = await openScenePage(context, file);
  await showMoment(page, theOceanShore(), MIDNIGHT_IN_A_HIGH_WIND);
  // The sound button is in the menu.
  await page.locator('#tod').click();
  const soundButton = page.locator('#snd');
  await soundButton.click();
  return { page, problems, soundButton };
}

async function hearSound(context: BrowserContext, file: string): Promise<HeardSound> {
  const { page, problems, soundButton } = await tapTheSoundButton(context, file);
  const afterOneTap = await soundButton.textContent();

  const samples = await page.evaluate(
    async ([frames, milliseconds]) => {
      // The surf breaks only while the wave clock runs.
      window.__freeze = false;
      window.__runFrames(frames, milliseconds);
      if (window.__sound === undefined) throw new Error('the page built no sound');
      const rendered = await window.__sound.startRendering();
      return Array.from(rendered.getChannelData(0));
    },
    [FRAMES_OF_SURF, FRAME_MILLISECONDS] as const,
  );
  await soundButton.click();
  const afterTwoTaps = await soundButton.textContent();

  return { samples, buttonTexts: [afterOneTap, afterTwoTaps], problems };
}

function largestDifference(reference: number[], candidate: number[]): number {
  return reference.reduce(
    (largest, sample, index) => Math.max(largest, Math.abs(sample - candidate[index])),
    0,
  );
}

function loudest(samples: number[]): number {
  return samples.reduce((largest, sample) => Math.max(largest, Math.abs(sample)), 0);
}

test('the surf and the crickets sound the same', async ({ context }) => {
  await context.addInitScript(renderSoundInsteadOfPlayingIt, RENDERED);

  const reference = await hearSound(context, legacyPage);
  const candidate = await hearSound(context, scenePage);

  expect(loudest(reference.samples), 'build 78 is silent: nothing is compared').toBeGreaterThan(0);
  expect(candidate.samples).toHaveLength(reference.samples.length);
  expect(largestDifference(reference.samples, candidate.samples)).toBeLessThan(ROUNDING);
  expect(reference.buttonTexts).toEqual(['waves on', 'waves off']);
  expect(candidate.buttonTexts).toEqual(reference.buttonTexts);
  expect(reference.problems, 'problems in the reference page').toEqual([]);
  expect(candidate.problems, 'problems in the page under test').toEqual([]);
});

test('a browser without audio is told so on the sound button', async ({ context }) => {
  await context.addInitScript(removeAudioFromTheBrowser);

  const reference = await tapTheSoundButton(context, legacyPage);
  const candidate = await tapTheSoundButton(context, scenePage);

  await expect(reference.soundButton).toHaveText('no audio');
  await expect(candidate.soundButton).toHaveText('no audio');
  expect(reference.problems, 'problems in the reference page').toEqual([]);
  expect(candidate.problems, 'problems in the page under test').toEqual([]);
});

test('a surf that answers differently to the breaking waves is reported', async ({
  context,
}, testInfo) => {
  const changedPage = testInfo.outputPath('build78-with-louder-breaking-surf.html');
  writeChangedCopy(legacyPage, changedPage, '=0.22+0.55*surfE', '=0.22+0.75*surfE');
  await context.addInitScript(renderSoundInsteadOfPlayingIt, RENDERED);

  const reference = await hearSound(context, legacyPage);
  const changed = await hearSound(context, changedPage);

  expect(largestDifference(reference.samples, changed.samples)).toBeGreaterThan(ROUNDING);
});
