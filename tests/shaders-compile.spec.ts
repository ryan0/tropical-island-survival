import { expect, test, type BrowserContext } from '@playwright/test';
import { writeChangedCopy } from './changed-page';
import { legacyPage, scenePage } from './pages';
import { openScenePage } from './scene-page';

// three.js compiles a material when it first draws it, so a broken shader on something out of
// sight goes unnoticed. This compiles every material in the scene, seen or not, by day and by
// night: with the sun down the lit materials are built again for one light fewer.
async function compileEveryShader(context: BrowserContext, file: string) {
  const scene = await openScenePage(context, file);
  const programs = await scene.page.evaluate(() => {
    const hooks = window.__lag;
    for (const dayPhase of [0.5, 0]) {
      hooks.freeze(20);
      hooks.phase(dayPhase);
      window.__runFrames(1, 50);
      hooks.renderer.compile(hooks.scene, hooks.cam);
    }
    return hooks.renderer.info.programs?.length ?? 0;
  });
  return { programs, problems: scene.problems };
}

test('every shader in the scene compiles', { tag: '@quick' }, async ({ context }) => {
  const { programs, problems } = await compileEveryShader(context, scenePage);

  expect(problems).toEqual([]);
  expect(programs).toBeGreaterThan(0);
});

test('a shader that does not compile is reported', async ({ context }, testInfo) => {
  const brokenPage = testInfo.outputPath('build78-with-a-broken-shader.html');
  writeChangedCopy(legacyPage, brokenPage, 'vec3 seaTint(vec3 c', 'vec3 seaTintMisnamed(vec3 c');

  const { problems } = await compileEveryShader(context, brokenPage);

  expect(problems.join('\n')).toContain('seaTint');
});
