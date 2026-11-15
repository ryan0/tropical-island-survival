import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { askTheReference, builtPage } from './pages';
import { comparePictures } from './picture-difference';
import { referenceViews, type ReferenceView } from './reference-views';
import { recordPicture } from './review-records';
import { openScenePage, showMoment, takePicture } from './scene-page';

// The reference views look at the scene. These use the page as a player does: the menu, the
// joystick, walking into a named place, the debug panel. Each must change what the page shows,
// and what it then shows goes on the review page beside the same steps on the reference build.

const FRAME_MILLISECONDS = 50;
// The corner button opens the debug panel when held for 1.3 s, on the browser's own clock.
const LONG_PRESS_MILLISECONDS = 1600;
// A control that is not there is given up on after this long, not after the whole test's time.
const WAIT_FOR_A_CONTROL_MILLISECONDS = 20_000;
/** On the review page these come after every view. */
const FIRST_ORDER = 1_000_000;

type Use = (page: Page) => Promise<void>;

function theViewWithControls(): ReferenceView {
  const view = referenceViews.find((candidate) => candidate.showsControls);
  if (view === undefined) throw new Error('no reference view shows the controls');
  return view;
}

async function runFrames(page: Page, count: number): Promise<void> {
  await page.evaluate(
    ([frames, milliseconds]) => {
      window.__runFrames(frames, milliseconds);
    },
    [count, FRAME_MILLISECONDS] as const,
  );
}

async function usePage(context: BrowserContext, file: string, use: Use) {
  const view = theViewWithControls();
  const { page, problems } = await openScenePage(context, file);
  page.setDefaultTimeout(WAIT_FOR_A_CONTROL_MILLISECONDS);
  await showMoment(page, view, view.moments[0]);
  const untouched = await takePicture(page, view);
  await use(page);
  const used = await takePicture(page, view);
  await page.close();
  return { untouched, used, problems };
}

function useOf(what: string, order: number, use: Use): void {
  test(what, async ({ context }) => {
    const now = await usePage(context, builtPage, use);
    const before = await askTheReference(async (page) => (await usePage(context, page, use)).used);

    recordPicture(
      {
        order: FIRST_ORDER + order,
        name: 'controls in use',
        shows: 'the page after its controls were used',
        when: what,
      },
      before,
      now.used,
    );
    const changedByUse = comparePictures(now.untouched, now.used).differingPixels;
    expect(changedByUse, 'pixels that using the controls changed').toBeGreaterThan(0);
    expect(now.problems, 'problems in the page').toEqual([]);
  });
}

async function openTheDebugPanel(page: Page): Promise<void> {
  await page.locator('#tod').dispatchEvent('pointerdown');
  await page.waitForTimeout(LONG_PRESS_MILLISECONDS);
  await page.locator('#tod').dispatchEvent('pointerup');
}

useOf('the corner button opens the menu', 0, async (page) => {
  await page.locator('#tod').click();
  await expect(page.locator('#menu')).toBeVisible();
});

useOf('choosing a time, a sky and a wind in the menu changes the scene', 1, async (page) => {
  // The menu steers the weather only while the clock runs.
  await page.evaluate(() => {
    window.__freeze = false;
  });
  await page.locator('#tod').click();
  await page.getByRole('button', { name: 'sunset', exact: true }).click();
  await page.getByRole('button', { name: 'clear', exact: true }).click();
  await page.getByRole('button', { name: 'high', exact: true }).click();
  await runFrames(page, 12);
});

useOf('swimming into the lagoon shows its name', 2, async (page) => {
  await page.evaluate(() => {
    window.__fly = undefined;
    window.__lag.set(5, 60, 0.3, -0.1);
  });
  await runFrames(page, 3);
  await expect(page.locator('#cap')).toContainText('The Lagoon');
});

useOf('pushing the joystick walks the player and clears the hint', 3, async (page) => {
  await page.evaluate(() => {
    window.__fly = undefined;
  });
  const pad = await page.locator('#joy').boundingBox();
  if (pad === null) throw new Error('the joystick is not on the page');
  const centre = { x: pad.x + pad.width / 2, y: pad.y + pad.height / 2 };

  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + 15, centre.y - 40);
  await runFrames(page, 10);
});

useOf('the debug panel has switches for the water and the far sea', 4, async (page) => {
  await openTheDebugPanel(page);
  await page.getByRole('button', { name: 'plain water colour' }).click();
  await page.getByRole('button', { name: 'hide far sea' }).click();
  // The panel names the build, which rightly differs from one build to the next, so it is
  // closed again for the picture.
  await openTheDebugPanel(page);
  await runFrames(page, 2);
});
