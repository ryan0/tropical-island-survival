import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import packageJson from '../package.json' with { type: 'json' };

const projectRoot = path.resolve(import.meta.dirname, '..');
const dist = path.join(projectRoot, 'dist');
const pageUrl = pathToFileURL(path.join(dist, 'index.html')).href;

test('the build is one HTML file', () => {
  expect(readdirSync(dist, { recursive: true })).toEqual(['index.html']);
});

test('the page loads nothing but itself', async ({ page }) => {
  const requestedUrls: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(pageUrl);
  await expect(page.locator('.build-label')).toBeVisible();

  expect(requestedUrls).toEqual([pageUrl]);
  expect(errors).toEqual([]);
});

test('the page shows its version and the commit it was built from', async ({ page }) => {
  const headCommit = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
    cwd: projectRoot,
    encoding: 'utf8',
  }).trim();

  await page.goto(pageUrl);
  const label = await page.locator('.build-label').innerText();

  expect(label.replace(/-dirty$/, '')).toBe(`v${packageJson.version} · ${headCommit}`);
});
