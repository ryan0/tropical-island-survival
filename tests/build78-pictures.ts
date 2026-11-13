import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BrowserContext } from '@playwright/test';
import { legacyPage, projectRoot, threeLibraryFile } from './pages';
import type { ReferenceView } from './reference-views';
import { drawView } from './scene-page';

// Build 78 never changes, so its picture of a view is drawn once and kept on this machine:
// drawing it again was half of every picture test. A kept picture is used only while all that
// it was drawn with is unchanged - the page, its library, how the tests open and step the page,
// the browser and its settings, the installed packages, the processor - and the view is the
// same. Otherwise it is drawn again. To have everything drawn again, delete the folder.
const KEPT_IN = path.join(projectRoot, 'node_modules', '.cache', 'build78-pictures');

const DRAWN_WITH = [
  legacyPage,
  threeLibraryFile,
  import.meta.filename,
  path.join(import.meta.dirname, 'scene-page.ts'),
  path.join(projectRoot, 'playwright.config.ts'),
  path.join(projectRoot, 'package-lock.json'),
];

function fingerprint(parts: (string | Buffer)[]): string {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(part).update('\0');
  return hash.digest('hex').slice(0, 16);
}

function fingerprintOfAllDrawnWith(context: BrowserContext): string {
  const browser = context.browser();
  if (browser === null) throw new Error('the pictures need to know which browser draws them');
  return fingerprint([
    ...DRAWN_WITH.map((file) => readFileSync(file)),
    browser.version(),
    os.cpus()[0]?.model ?? os.arch(),
  ]);
}

function pictureFile(folder: string, index: number): string {
  return path.join(folder, `${index}.png`);
}

// Pictures drawn with something that has since changed will not be asked for again.
function discardAllBut(current: string): void {
  for (const name of readdirSync(KEPT_IN)) {
    if (name !== current) rmSync(path.join(KEPT_IN, name), { recursive: true, force: true });
  }
}

function keep(folder: string, pictures: Buffer[]): void {
  const unfinished = `${folder}.unfinished-${process.pid}`;
  mkdirSync(unfinished, { recursive: true });
  pictures.forEach((picture, index) => {
    writeFileSync(pictureFile(unfinished, index), picture);
  });
  // The folder appears complete or not at all. If another test running at the same time has
  // drawn the same view, its pictures are the same and stay.
  try {
    renameSync(unfinished, folder);
  } catch {
    rmSync(unfinished, { recursive: true, force: true });
  }
}

/** Build 78's picture of each of the view's moments, in order. */
export async function picturesOfBuild78(
  context: BrowserContext,
  view: ReferenceView,
): Promise<Buffer[]> {
  const drawnWith = fingerprintOfAllDrawnWith(context);
  const viewFolder = `${view.name}-${fingerprint([JSON.stringify(view)])}`;
  const folder = path.join(KEPT_IN, drawnWith, viewFolder);
  if (existsSync(folder)) {
    return view.moments.map((_, index) => readFileSync(pictureFile(folder, index)));
  }

  const { pictures, problems } = await drawView(context, legacyPage, view);
  if (problems.length > 0) throw new Error(`problems in build 78's page:\n${problems.join('\n')}`);
  keep(folder, pictures);
  discardAllBut(drawnWith);
  return pictures;
}
