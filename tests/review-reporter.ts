import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Reporter } from '@playwright/test/reporter';
import { projectRoot, theReference, type Reference } from './pages';
import { describeWorkingFiles } from './reference-build';
import { describeChange, reviewPage, VERDICT_WORDS } from './review-page';
import {
  PICTURES_FOLDER,
  readRecords,
  REVIEW_IN_PROGRESS,
  type ReviewRecord,
} from './review-records';

// When a run ends, what its tests recorded becomes the review page, and a few lines in the
// terminal say what changed. A run that compared nothing leaves the last review page alone.

const REVIEW = path.join(projectRoot, 'review');
const REVIEW_PAGE = path.join(REVIEW, 'index.html');
const MOST_LISTED = 12;
const TALLY_WORDS = { changed: 'changed', same: 'the same', new: 'with nothing to compare with' };

function summary(records: ReviewRecord[], reference: Reference): string[] {
  const pictures = records.filter((record) => record.kind === 'picture');
  const changed = pictures
    .filter((picture) => picture.verdict === 'changed')
    .sort((a, b) => b.clearShare - a.clearShare);
  const tally = (['changed', 'same', 'new'] as const).flatMap((verdict) => {
    const count = pictures.filter((picture) => picture.verdict === verdict).length;
    return count === 0 ? [] : [`${count} ${TALLY_WORDS[verdict]}`];
  });
  const howMany = pictures.length === 1 ? '1 picture' : `${pictures.length} pictures`;

  const lines = [
    reference.page === null
      ? `Nothing to compare with: ${reference.description}.`
      : `Compared with ${reference.description}`,
    `  ${howMany}: ${tally.join(', ')}`,
  ];
  for (const picture of changed.slice(0, MOST_LISTED)) {
    const file = path.join(path.basename(REVIEW), PICTURES_FOLDER, picture.file);
    lines.push(`    ${file}: ${describeChange(picture)}`);
  }
  if (changed.length > MOST_LISTED) lines.push(`    and ${changed.length - MOST_LISTED} more`);

  for (const record of records) {
    if (record.kind !== 'finding') continue;
    lines.push(`  ${record.name}: ${VERDICT_WORDS[record.verdict]}`);
    lines.push(...record.details.slice(0, MOST_LISTED).map((detail) => `    ${detail}`));
  }
  lines.push(`Review page: ${pathToFileURL(REVIEW_PAGE).href}`);
  return lines;
}

export default class ReviewReporter implements Reporter {
  onEnd(): void {
    const records = readRecords();
    if (records.length === 0) return;

    const reference = theReference();
    rmSync(REVIEW, { recursive: true, force: true });
    mkdirSync(REVIEW);
    renameSync(path.join(REVIEW_IN_PROGRESS, PICTURES_FOLDER), path.join(REVIEW, PICTURES_FOLDER));
    writeFileSync(
      REVIEW_PAGE,
      reviewPage(records, {
        before: reference.description,
        after: describeWorkingFiles(),
        drawnAt: new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }),
      }),
    );
    console.log(`\n${summary(records, reference).join('\n')}\n`);
  }
}
