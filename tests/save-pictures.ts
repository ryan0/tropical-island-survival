import { writeFileSync } from 'node:fs';
import type { TestInfo } from '@playwright/test';
import type { PictureDifference } from './picture-difference';

// Reference, candidate and difference side by side, as a file in test-results/ to open after a
// failure, whichever way the results were reported.
export async function savePictures(
  testInfo: TestInfo,
  name: string,
  difference: PictureDifference,
): Promise<void> {
  const file = testInfo.outputPath(`${name.replace(/[^a-z0-9.]+/gi, '-')}.png`);
  writeFileSync(file, difference.sideBySide);
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
}
