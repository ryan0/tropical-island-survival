import path from 'node:path';

export const projectRoot = path.resolve(import.meta.dirname, '..');

/** The page under test: the working files, built. */
export const builtPage = path.join(projectRoot, 'dist', 'index.html');

/** What a run compares the built page with (reference-build.ts). */
export interface Reference {
  /** The reference build's page; null where there is nothing to compare with. */
  page: string | null;
  /** Which commit it was built from, or why there is none. */
  description: string;
}

// The reference is found once, before any test starts, and every test reads it from here.
const REFERENCE_VARIABLE = 'REVIEW_REFERENCE';

export function announceReference(reference: Reference): void {
  process.env[REFERENCE_VARIABLE] = JSON.stringify(reference);
}

export function theReference(): Reference {
  const announced = process.env[REFERENCE_VARIABLE];
  if (announced === undefined) throw new Error('no reference was announced before the tests');
  return JSON.parse(announced) as Reference;
}

/**
 * What the reference build answers; null where there is no reference build, or where it can no
 * longer be driven as the tests now drive a page (a renamed hook, a control that has gone).
 */
export async function askTheReference<Answer>(
  ask: (referencePage: string) => Promise<Answer>,
): Promise<Answer | null> {
  const { page } = theReference();
  if (page === null) return null;
  try {
    return await ask(page);
  } catch (error) {
    const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);
    console.warn(`The reference build could not be asked: ${reason}`);
    return null;
  }
}
