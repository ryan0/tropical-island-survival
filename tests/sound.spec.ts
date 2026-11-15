import { expect, test, type BrowserContext } from '@playwright/test';
import { askTheReference, builtPage } from './pages';
import { referenceViews, type Moment, type ReferenceView } from './reference-views';
import { recordFinding } from './review-records';
import { openScenePage, showMoment } from './scene-page';

// Nothing here can listen. So the page is given an audio context that renders its sound into
// memory instead of playing it, and the samples that the reference build and the working files
// render are compared: the same sound is the same numbers. A sound that has changed is reported
// on the review page; only a page that makes no sound fails.

const RENDERED = { seconds: 2, samplesPerSecond: 22050 };
const FRAME_MILLISECONDS = 50;
// Long enough for the page to measure the surf that is breaking in front of the camera.
const FRAMES_OF_SURF = 10;
// The browser adds up the signals that steer one setting in whatever order they lie in its
// memory, so one sound rendered twice can differ by a rounding step of its samples, 0.00000006.
// The quietest step of a CD is five hundred times that; this allows sixteen rounding steps.
const ROUNDING = 1e-6;
/** On the review page this comes after the scene. */
const ORDER = 1;
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

function whatSoundsDifferent(reference: HeardSound, now: HeardSound): string[] {
  const difference = largestDifference(reference.samples, now.samples);
  if (difference < ROUNDING && reference.samples.length === now.samples.length) return [];
  return [`samples differ by up to ${difference.toFixed(6)}, where the loudest is 1`];
}

test('the surf and the crickets sound, and the button says so', async ({ context }) => {
  await context.addInitScript(renderSoundInsteadOfPlayingIt, RENDERED);

  const now = await hearSound(context, builtPage);
  const reference = await askTheReference((page) => hearSound(context, page));

  recordFinding(
    {
      order: ORDER,
      name: 'the sound',
      shows: 'two seconds of surf and crickets at night in a high wind, sample by sample',
    },
    reference === null ? null : whatSoundsDifferent(reference, now),
  );
  expect(loudest(now.samples), 'the loudest sample').toBeGreaterThan(0);
  expect(now.buttonTexts).toEqual(['waves on', 'waves off']);
  expect(now.problems, 'problems in the page').toEqual([]);
});

test('a browser without audio is told so on the sound button', async ({ context }) => {
  await context.addInitScript(removeAudioFromTheBrowser);

  const { soundButton, problems } = await tapTheSoundButton(context, builtPage);

  await expect(soundButton).toHaveText('no audio');
  expect(problems, 'problems in the page').toEqual([]);
});
