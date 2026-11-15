import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { projectRoot, type Reference } from './pages';

// The working files are compared with the reference build: the build of the commit this work
// started from, which is the last one Ryan merged. His merge is what accepts a change, so nothing
// about the reference is kept in the repository; it is built from its commit when first asked
// for and kept on this machine.
//
// REFERENCE=<commit, tag or branch> compares with that instead.

const MAIN_BRANCH = 'main';
const KEPT_IN = path.join(projectRoot, 'node_modules', '.cache', 'reference-builds');
const VITE = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

function git(...args: string[]): string {
  const options = { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' } as const;
  return execFileSync('git', args, options).trim();
}

function hasUncommittedChanges(): boolean {
  return git('status', '--porcelain') !== '';
}

function referenceCommit(): string | null {
  const chosen = process.env.REFERENCE;
  if (chosen !== undefined) {
    try {
      return git('rev-parse', '--verify', `${chosen}^{commit}`);
    } catch {
      throw new Error(`REFERENCE=${chosen} names no commit here`);
    }
  }
  try {
    return git('merge-base', 'HEAD', MAIN_BRANCH);
  } catch {
    // GitHub's checks have the pushed commit and nothing else.
    return null;
  }
}

// The commit is checked out beside the kept pages, inside node_modules, so that it finds the
// packages installed here and its page names its own commit.
function build(commit: string, page: string): void {
  const checkout = path.join(KEPT_IN, `checkout-${commit}`);
  // (What a run that was stopped half way left behind.)
  rmSync(checkout, { recursive: true, force: true });
  git('worktree', 'add', '--force', '--detach', checkout, commit);
  try {
    execFileSync(process.execPath, [VITE, 'build'], { cwd: checkout, stdio: 'pipe' });
    copyFileSync(path.join(checkout, 'dist', 'index.html'), page);
  } finally {
    git('worktree', 'remove', '--force', checkout);
  }
}

function discardAllBut(page: string): void {
  for (const name of readdirSync(KEPT_IN)) {
    const kept = path.join(KEPT_IN, name);
    if (kept !== page) rmSync(kept, { recursive: true, force: true });
  }
}

export function findReference(): Reference {
  const commit = referenceCommit();
  if (commit === null) return { page: null, description: `no ${MAIN_BRANCH} branch here` };

  const name = git('log', '-1', '--format=%h %s', commit);
  const isWhatIsUnderTest = git('rev-parse', 'HEAD') === commit && !hasUncommittedChanges();
  if (isWhatIsUnderTest) return { page: null, description: `the working files are ${name} itself` };

  const page = path.join(KEPT_IN, `${commit}.html`);
  mkdirSync(KEPT_IN, { recursive: true });
  if (!existsSync(page)) {
    try {
      build(commit, page);
    } catch {
      return { page: null, description: `${name} does not build with the packages installed` };
    }
  }
  discardAllBut(page);
  return { page, description: name };
}

/** The working files, as the review page names them. */
export function describeWorkingFiles(): string {
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  const commit = git('log', '-1', '--format=%h %s');
  return hasUncommittedChanges()
    ? `the working files on ${branch}: changes not yet committed, on top of ${commit}`
    : `${branch} at ${commit}`;
}
