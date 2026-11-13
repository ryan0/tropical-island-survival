import { expect, test, type BrowserContext } from '@playwright/test';
import { picturesOfBuild78 } from './build78-pictures';
import { writeChangedCopy } from './changed-page';
import { legacyPage, scenePage } from './pages';
import { comparePictures, describeDifference, type PictureDifference } from './picture-difference';
import { describeMoment, referenceViews, type Moment, type ReferenceView } from './reference-views';
import { savePictures } from './save-pictures';
import { drawView } from './scene-page';

interface MomentDifference {
  moment: Moment;
  difference: PictureDifference;
}

// Build 78's pictures are drawn once and kept (build78-pictures.ts). The page under test is drawn
// every time, by the same browser on the same machine and through the same frames.
async function drawAndCompare(
  context: BrowserContext,
  candidateFile: string,
  view: ReferenceView,
): Promise<MomentDifference[]> {
  const reference = await picturesOfBuild78(context, view);
  const candidate = await drawView(context, candidateFile, view);

  expect(candidate.problems, 'problems in the page under test').toEqual([]);
  return view.moments.map((moment, index) => ({
    moment,
    difference: comparePictures(reference[index], candidate.pictures[index]),
  }));
}

for (const view of referenceViews) {
  const tag = view.inQuickCheck ? '@quick' : [];
  test(`${view.name}: ${view.shows}`, { tag }, async ({ context }, testInfo) => {
    const differences = await drawAndCompare(context, scenePage, view);

    for (const { moment, difference } of differences) {
      const when = describeMoment(moment);
      if (difference.differingPixels > 0) {
        await savePictures(testInfo, `${view.name} at ${when}`, difference);
      }
      expect.soft(difference.differingPixels, `${when}: ${describeDifference(difference)}`).toBe(0);
    }
  });
}

test('the comparison catches a one-line change to a shader', async ({ context }, testInfo) => {
  const changedPage = testInfo.outputPath('build78-with-greener-shallows.html');
  // The glow that water adds to whatever lies under it: a hundredth more green.
  writeChangedCopy(legacyPage, changedPage, 'o+=vec3(0.,.075,.13)', 'o+=vec3(0.,.085,.13)');
  const theWholeLagoon = referenceViews.find((view) => view.name === 'lagoon');
  if (theWholeLagoon === undefined) throw new Error('the lagoon view is gone');

  const differences = await drawAndCompare(context, changedPage, theWholeLagoon);
  const first = differences.at(0);
  if (first === undefined) throw new Error('the lagoon view has no moments');

  await savePictures(testInfo, 'reference, changed page, difference', first.difference);
  expect(first.difference.differingPixels, describeDifference(first.difference)).toBeGreaterThan(0);
});
