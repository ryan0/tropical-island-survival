import { readFileSync, writeFileSync } from 'node:fs';

// A check that cannot fail proves nothing. The tests show that they notice a change by making
// one in a copy of the page: `original` must occur in it exactly once.
export function writeChangedCopy(
  pageFile: string,
  copyFile: string,
  original: string,
  replacement: string,
): void {
  const text = readFileSync(pageFile, 'utf8');
  const occurrences = text.split(original).length - 1;
  if (occurrences !== 1) {
    throw new Error(`"${original}" occurs ${occurrences} times in ${pageFile}; expected once`);
  }
  writeFileSync(copyFile, text.replace(original, replacement));
}
