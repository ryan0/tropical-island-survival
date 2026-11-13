import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { legacyPage, scenePage } from './pages';
import { comparePictures, describeDifference } from './picture-difference';
import { referenceViews, type ReferenceView } from './reference-views';
import { savePictures } from './save-pictures';
import { openScenePage, showMoment, takePicture } from './scene-page';

// The reference views look at the scene. These use the page as a player does - the menu, the
// joystick, walking into a named place, the debug panel - on build 78 and on the page under
// test alike, and compare what the two then show.

const FRAME_MILLISECONDS = 50;
// The corner button opens the debug panel when held for 1.3 s, on the browser's own clock.
const LONG_PRESS_MILLISECONDS = 1600;

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

async function expectTheSameAfter(
  context: BrowserContext,
  testInfo: TestInfo,
  use: (page: Page) => Promise<void>,
): Promise<void> {
  const view = theViewWithControls();
  const reference = await openScenePage(context, legacyPage);
  const candidate = await openScenePage(context, scenePage);
  for (const { page } of [reference, candidate]) {
    await page.bringToFront();
    await showMoment(page, view, view.moments[0]);
    await use(page);
  }

  const difference = comparePictures(
    await takePicture(reference.page, view),
    await takePicture(candidate.page, view),
  );
  if (difference.differingPixels > 0) await savePictures(testInfo, testInfo.title, difference);
  expect(difference.differingPixels, describeDifference(difference)).toBe(0);
  expect(reference.problems, 'problems in the reference page').toEqual([]);
  expect(candidate.problems, 'problems in the page under test').toEqual([]);
}

async function openTheDebugPanel(page: Page): Promise<void> {
  await page.locator('#tod').dispatchEvent('pointerdown');
  await page.waitForTimeout(LONG_PRESS_MILLISECONDS);
  await page.locator('#tod').dispatchEvent('pointerup');
}

test('the corner button opens the menu', { tag: '@quick' }, async ({ context }, testInfo) => {
  await expectTheSameAfter(context, testInfo, async (page) => {
    await page.locator('#tod').click();
    await expect(page.locator('#menu')).toBeVisible();
  });
});

test('choosing a time, a sky and a wind in the menu changes the scene', async ({
  context,
}, testInfo) => {
  await expectTheSameAfter(context, testInfo, async (page) => {
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
});

test('swimming into the lagoon shows its name', async ({ context }, testInfo) => {
  await expectTheSameAfter(context, testInfo, async (page) => {
    await page.evaluate(() => {
      window.__fly = undefined;
      window.__lag.set(5, 60, 0.3, -0.1);
    });
    await runFrames(page, 3);
    await expect(page.locator('#cap')).toContainText('The Lagoon');
  });
});

test('pushing the joystick walks the player and clears the hint', async ({ context }, testInfo) => {
  await expectTheSameAfter(context, testInfo, async (page) => {
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
});

test('the debug panel has the same switches and they do the same', async ({
  context,
}, testInfo) => {
  const labels: string[][] = [];

  await expectTheSameAfter(context, testInfo, async (page) => {
    await openTheDebugPanel(page);
    const switches = page
      .getByRole('button', { name: 'wireframe' })
      .locator('..')
      .locator('button');
    labels.push(await switches.allTextContents());

    await page.getByRole('button', { name: 'plain water colour' }).click();
    await page.getByRole('button', { name: 'hide far sea' }).click();
    // The panel names the build, which rightly differs, so it is closed again for the picture.
    await openTheDebugPanel(page);
    await runFrames(page, 2);
  });

  expect(labels[0]).not.toHaveLength(0);
  expect(labels[1]).toEqual(labels[0]);
});
