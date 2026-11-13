import { expect, test, type BrowserContext } from '@playwright/test';
import { writeChangedCopy } from './changed-page';
import { legacyPage, scenePage } from './pages';
import { comparePictures, describeDifference, type PictureDifference } from './picture-difference';
import { describeMoment, referenceViews, type Moment, type ReferenceView } from './reference-views';
import { savePictures } from './save-pictures';
import { openScenePage, showMoment, takePicture } from './scene-page';

interface MomentDifference {
  moment: Moment;
  difference: PictureDifference;
}

// Nothing is stored: the reference is drawn afresh, in the same browser on the same machine as
// the candidate, and both pages are taken through the same frames.
async function drawAndCompare(
  context: BrowserContext,
  referenceFile: string,
  candidateFile: string,
  view: ReferenceView,
): Promise<MomentDifference[]> {
  const reference = await openScenePage(context, referenceFile);
  const candidate = await openScenePage(context, candidateFile);
  const differences: MomentDifference[] = [];

  for (const moment of view.moments) {
    await showMoment(reference.page, view, moment);
    await showMoment(candidate.page, view, moment);
    const difference = comparePictures(
      await takePicture(reference.page, view),
      await takePicture(candidate.page, view),
    );
    differences.push({ moment, difference });
  }

  expect(reference.problems, 'problems in the reference page').toEqual([]);
  expect(candidate.problems, 'problems in the page under test').toEqual([]);
  return differences;
}

for (const view of referenceViews) {
  test(`${view.name}: ${view.shows}`, async ({ context }, testInfo) => {
    const differences = await drawAndCompare(context, legacyPage, scenePage, view);

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

  const differences = await drawAndCompare(context, legacyPage, changedPage, theWholeLagoon);
  const first = differences.at(0);
  if (first === undefined) throw new Error('the lagoon view has no moments');

  await savePictures(testInfo, 'reference, changed page, difference', first.difference);
  expect(first.difference.differingPixels, describeDifference(first.difference)).toBeGreaterThan(0);
});
