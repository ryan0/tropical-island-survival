import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

/**
 * Draws a page of HTML to a picture, as long as the page is. The page is kept beside the picture
 * (a page made from a string may not read pictures off the disk, and it is worth opening anyway).
 */
export async function drawPageToPicture(
  html: string,
  picture: string,
  width: number,
): Promise<void> {
  const pageFile = path.join(path.dirname(picture), `${path.parse(picture).name}.html`);
  writeFileSync(pageFile, `<!doctype html><meta charset="utf-8">${html}`);
  const browser = await chromium.launch();
  // (The picture is as tall as the page: a short window keeps a short page from being padded out.)
  const page = await browser.newPage({ viewport: { width, height: 10 } });
  await page.goto(pathToFileURL(path.resolve(pageFile)).href, { waitUntil: 'load' });
  await page.screenshot({ path: picture, fullPage: true });
  await browser.close();
}
