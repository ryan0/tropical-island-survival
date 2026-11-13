import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { writeChangedCopy } from './changed-page';
import { legacyPage, scenePage } from './pages';
import { referenceViews, type Moment, type ReferenceView } from './reference-views';
import { openScenePage, showMoment } from './scene-page';

// A picture shows what is in front of the camera at one moment; most of the animals are
// somewhere else, or between leaps. These tests compare the scene itself instead: where every
// object in it is, whether it is shown, and every copy of everything drawn in copies, in
// build 78 and in the page under test, at several moments and as time passes.

// Nothing here looks at a picture, and the software renderer is quicker over a small one.
test.use({ viewport: { width: 64, height: 64 } });

const STEP_MILLISECONDS = 50;
// A frame may be any length of time away from the last, though no animal moves further in it
// than in a twentieth of a second. So a few long frames reach moments many seconds apart.
const LEAP_MILLISECONDS = 2300;
const CRABS = 8;

const NOON: Moment = { waveTime: 20, wind: 0.66, cloudCover: 0.45, sun: { dayPhase: 0.5 } };
const MIDNIGHT: Moment = { ...NOON, sun: { dayPhase: 0 } };

interface SceneStates {
  /** One line for each object in the scene, at each of the moments looked at. */
  moments: Record<string, string[]>;
  problems: string[];
}

function theView(name: string): ReferenceView {
  const view = referenceViews.find((candidate) => candidate.name === name);
  if (view === undefined) throw new Error(`the ${name} view is gone`);
  return view;
}

function describeScene(): string[] {
  const NEGATIVE_ZERO = 0x80000000;
  const oneNumber = new Float64Array(1);
  const itsTwoWords = new Uint32Array(oneNumber.buffer);
  // A short stand-in for a long list of numbers: lists that differ anywhere give different ones.
  // The scene holds eight million numbers, so each is taken in as whole words, not byte by byte.
  const digest = (numbers: Iterable<number> | null | undefined): string => {
    if (!numbers) return 'none';
    let hash = 0x811c9dc5;
    if (numbers instanceof Float32Array) {
      const words = new Uint32Array(numbers.buffer, numbers.byteOffset, numbers.length);
      for (const word of words) {
        // A turn of exactly nothing can leave -0 where another way round leaves the 0 it equals.
        hash = Math.imul(hash ^ (word === NEGATIVE_ZERO ? 0 : word), 0x01000193);
      }
    } else {
      for (const number of numbers) {
        oneNumber[0] = number + 0;
        for (const word of itsTwoWords) hash = Math.imul(hash ^ word, 0x01000193);
      }
    }
    return (hash >>> 0).toString(16);
  };

  const lines: string[] = [];
  window.__lag.scene.traverse((object) => {
    const { material } = object;
    const parts = [
      `${lines.length}: ${object.type}`,
      object.visible ? 'shown' : 'hidden',
      `placed ${digest(object.matrixWorld.elements)}`,
      `shape ${digest(object.geometry?.attributes.position?.array)}`,
    ];
    if (object.instanceMatrix !== undefined) {
      parts.push(
        `${object.count} copies placed ${digest(object.instanceMatrix.array)}`,
        `coloured ${digest(object.instanceColor?.array)}`,
      );
    }
    if (material?.type !== undefined) {
      parts.push(`${material.type} ${material.color?.getHex().toString(16)} ${material.opacity}`);
    }
    lines.push(parts.join(', '));
  });
  return lines;
}

async function runFrames(page: Page, count: number, millisecondsEach: number): Promise<void> {
  await page.evaluate(
    ([frames, milliseconds]) => {
      window.__runFrames(frames, milliseconds);
    },
    [count, millisecondsEach] as const,
  );
}

// Several things are drawn in eight copies; the crabs are the ones that walk about. A second
// and a bit of small steps is long enough for most of them to have set off of their own accord.
// The player is then put a step from the first of them, at eye height: near enough that it runs.
// (Each frame costs the software renderer an eighth of a second, however small the picture.)
async function letTheCrabsWalkThenStandBesideOne(page: Page): Promise<void> {
  await page.evaluate(
    ([crabs, frames, milliseconds]) => {
      const inEightCopies: Float32Array[] = [];
      window.__lag.scene.traverse((object) => {
        if (object.instanceMatrix !== undefined && object.count === crabs) {
          inEightCopies.push(object.instanceMatrix.array);
        }
      });
      const before = inEightCopies.map((places) => places.slice());
      window.__runFrames(frames, milliseconds);
      const moved = inEightCopies.filter((places, index) =>
        places.some((value, at) => value !== before[index][at]),
      );
      if (moved.length !== 1) {
        throw new Error(
          `${moved.length} things drawn in ${crabs} copies moved; expected the crabs`,
        );
      }

      const x = moved[0][12] + 1.5;
      const z = moved[0][14];
      window.__fly = [x, window.__lag.hgt(x, z) + 1.6, z, 0, 0];
    },
    [CRABS, 24, STEP_MILLISECONDS] as const,
  );
}

async function watchTheScene(context: BrowserContext, file: string): Promise<SceneStates> {
  const { page, problems } = await openScenePage(context, file);
  const moments: Record<string, string[]> = {};
  const look = async (name: string) => {
    moments[name] = await page.evaluate(describeScene);
  };

  await showMoment(page, theView('home-clearing'), NOON);
  await look('at the start, by day');

  await runFrames(page, 3, LEAP_MILLISECONDS);
  await look('seven seconds on');

  await showMoment(page, theView('lagoon-beach'), MIDNIGHT);
  await runFrames(page, 3, LEAP_MILLISECONDS);
  await look('at night, by the lagoon');

  await showMoment(page, theView('ocean-shore'), NOON);
  await letTheCrabsWalkThenStandBesideOne(page);
  await look('after a second of small steps');

  await runFrames(page, 6, STEP_MILLISECONDS);
  await look('with the player beside a crab');

  return { moments, problems };
}

function momentsThatDiffer(reference: SceneStates, candidate: SceneStates): string[] {
  return Object.keys(reference.moments).filter(
    (name) => reference.moments[name].join('\n') !== candidate.moments[name].join('\n'),
  );
}

test('everything in the scene is where build 78 has it', { tag: '@quick' }, async ({ context }) => {
  const reference = await watchTheScene(context, legacyPage);
  const candidate = await watchTheScene(context, scenePage);

  for (const [name, lines] of Object.entries(reference.moments)) {
    expect(lines.length, `build 78's scene is empty ${name}`).toBeGreaterThan(0);
    expect(candidate.moments[name], name).toEqual(lines);
  }
  expect(reference.problems, 'problems in the reference page').toEqual([]);
  expect(candidate.problems, 'problems in the page under test').toEqual([]);
});

test('a crab that runs from the player at another speed is reported', async ({
  context,
}, testInfo) => {
  const changedPage = testInfo.outputPath('build78-with-faster-crabs.html');
  writeChangedCopy(legacyPage, changedPage, 'sp = 2.4;', 'sp = 2.6;');

  const reference = await watchTheScene(context, legacyPage);
  const changed = await watchTheScene(context, changedPage);

  expect(momentsThatDiffer(reference, changed)).toEqual(['with the player beside a crab']);
});
