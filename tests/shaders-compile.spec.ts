import { expect, test, type BrowserContext } from '@playwright/test';
import { builtPage } from './pages';
import { openScenePage } from './scene-page';

// three.js compiles a material when it first draws it, so a broken shader on something out of
// sight goes unnoticed. This compiles every material in the scene, seen or not, by day and by
// night: with the sun down the lit materials are built again for one light fewer.
async function compileEveryShader(context: BrowserContext, breakOneFirst = false) {
  const scene = await openScenePage(context, builtPage);
  const programs = await scene.page.evaluate((breakOne) => {
    const hooks = window.__scene;
    if (breakOne) {
      let isBroken = false;
      hooks.scene.traverse(({ material }) => {
        if (isBroken || material?.fragmentShader === undefined) return;
        material.fragmentShader += 'void brokenOnPurpose() { notDeclaredAnywhere(); }';
        isBroken = true;
      });
    }
    for (const dayPhase of [0.5, 0]) {
      hooks.stopClockAt(20);
      hooks.jumpToTimeOfDay(dayPhase);
      window.__runFrames(1, 50);
      hooks.renderer.compile(hooks.scene, hooks.camera);
    }
    return hooks.renderer.info.programs?.length ?? 0;
  }, breakOneFirst);
  return { programs, problems: scene.problems };
}

test('every shader in the scene compiles', { tag: '@quick' }, async ({ context }) => {
  const { programs, problems } = await compileEveryShader(context);

  expect(problems).toEqual([]);
  expect(programs).toBeGreaterThan(0);
});

// A check that cannot fail proves nothing: one shader is given a line that cannot compile.
test('a shader that does not compile is reported', async ({ context }) => {
  const { problems } = await compileEveryShader(context, true);

  expect(problems.join('\n')).toContain('notDeclaredAnywhere');
});
