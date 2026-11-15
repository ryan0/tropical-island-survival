import { expect, test } from '@playwright/test';
import { builtPage } from './pages';
import { picturesOfReference } from './reference-pictures';
import { describeMoment, referenceViews } from './reference-views';
import { recordPicture } from './review-records';
import { drawView } from './scene-page';

// Every view is drawn from the working files, by the same browser on the same machine and
// through the same frames as the reference build's picture of it, and the two go on the review
// page. A picture that has changed is reported there; only a page that cannot draw the view fails.

const MOST_MOMENTS_IN_A_VIEW = 100;

for (const [viewIndex, view] of referenceViews.entries()) {
  const tag = view.inQuickCheck ? '@quick' : [];
  test(`${view.name}: ${view.shows}`, { tag }, async ({ context }) => {
    const before = await picturesOfReference(context, view);
    const after = await drawView(context, builtPage, view);

    for (const [index, moment] of view.moments.entries()) {
      recordPicture(
        {
          order: viewIndex * MOST_MOMENTS_IN_A_VIEW + index,
          name: view.name,
          shows: view.shows,
          when: describeMoment(moment),
        },
        before?.[index] ?? null,
        after.pictures[index],
      );
    }
    expect(after.problems, 'problems in the page').toEqual([]);
  });
}
