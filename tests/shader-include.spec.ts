import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

const projectRoot = path.resolve(import.meta.dirname, '..');
const fixtures = path.join(import.meta.dirname, 'fixtures/shader-include');

let vite: ViteDevServer;

test.beforeAll(async () => {
  vite = await createServer({
    configFile: path.join(projectRoot, 'vite.config.ts'),
    root: fixtures,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null },
  });
});

test.afterAll(async () => {
  await vite.close();
});

async function importShader(fileName: string): Promise<string> {
  const module = (await vite.ssrLoadModule(`/${fileName}`)) as { default: string };
  return module.default;
}

function countOf(needle: string, text: string): number {
  return text.split(needle).length - 1;
}

test('a chunk that two chunks include appears once, ahead of what uses it', async () => {
  const sea = await importShader('sea.frag.glsl');

  expect(countOf('float noise(', sea)).toBe(1);
  expect(sea.indexOf('float noise(')).toBeLessThan(sea.indexOf('float foam('));
  expect(sea.indexOf('float foam(')).toBeLessThan(sea.indexOf('void main('));
  expect(sea).not.toContain('#include "');
});

test('a chunk already used by one shader is still given to the next', async () => {
  await importShader('sea.frag.glsl');
  const sky = await importShader('sky.frag.glsl');

  expect(countOf('float noise(', sky)).toBe(1);
});

test("three.js's own includes are left for three.js to fill in", async () => {
  const sea = await importShader('sea.frag.glsl');

  expect(sea).toContain('#include <common>');
});
