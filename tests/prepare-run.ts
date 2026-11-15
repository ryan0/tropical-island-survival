import { rmSync } from 'node:fs';
import { announceReference } from './pages';
import { findReference } from './reference-build';
import { REVIEW_IN_PROGRESS } from './review-records';

// Playwright runs this once, before any test.
export default function prepareRun(): void {
  announceReference(findReference());
  rmSync(REVIEW_IN_PROGRESS, { recursive: true, force: true });
}
