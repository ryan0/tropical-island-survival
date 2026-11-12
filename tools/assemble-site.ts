// Builds the whole GitHub Pages site into site/:
//
//   site/index.html                    main
//   site/preview/<branch>/index.html   each branch not yet merged into main
//   site/preview/index.html            links to every page here
//   site/legacy/index.html             build 78, to compare old and new on the phone
//
// A Pages deployment replaces the entire site, so every run builds every page again from its
// branch. Nothing is kept between runs: a branch that is merged or deleted drops out by itself.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const REMOTE = 'origin';
const MAIN_BRANCH = 'main';

const repository = path.resolve(import.meta.dirname, '..');
const site = path.join(repository, 'site');

interface Page {
  branch: string;
  folder: string;
  commit: string;
  wasBuilt: boolean;
}

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
}

function branchesNotMergedIntoMain(): string[] {
  const names = git(
    'for-each-ref',
    `--no-merged=${REMOTE}/${MAIN_BRANCH}`,
    '--format=%(refname:lstrip=3)',
    `refs/remotes/${REMOTE}`,
  );
  // A clone also holds origin/HEAD, a pointer to the remote's default branch and not a branch.
  return names.split('\n').filter((name) => name !== '' && name !== 'HEAD');
}

function buildPage(branch: string, folder: string): Page {
  const ref = `${REMOTE}/${branch}`;
  const commit = git('rev-parse', '--short=7', ref);
  const checkout = mkdtempSync(path.join(tmpdir(), 'site-'));
  let wasBuilt = true;

  git('worktree', 'add', '--detach', checkout, ref);
  try {
    execFileSync('npm', ['ci'], { cwd: checkout, stdio: 'inherit' });
    execFileSync('npm', ['run', 'build'], { cwd: checkout, stdio: 'inherit' });
    cpSync(path.join(checkout, 'dist', 'index.html'), path.join(site, folder, 'index.html'));
  } catch {
    // One branch that does not build must not take every other page off the site. Its own
    // checks fail on its own push; here it is left out and reported.
    wasBuilt = false;
    console.log(`::warning::${branch} (${commit}) did not build and has no page on the site`);
  } finally {
    git('worktree', 'remove', '--force', checkout);
  }
  return { branch, folder, commit, wasBuilt };
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function listItem(page: Page): string {
  const name = escapeHtml(page.branch);
  if (!page.wasBuilt) return `<li>${name} <small>${page.commit} did not build</small></li>`;

  const link = `../${page.folder.split('/').map(encodeURIComponent).join('/')}`;
  return `<li><a href="${link}">${name}</a> <small>${page.commit}</small></li>`;
}

function listOfPages(pages: Page[]): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tropical Island Survival: builds</title>
    <style>
      body { margin: 24px; background: #0a2a4a; color: #fff; font: 18px/1.4 system-ui, sans-serif; }
      ul { padding: 0; list-style: none; }
      li { padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.2); }
      a { color: #9fe3ff; }
      small { opacity: 0.6; font: 13px monospace; }
    </style>
  </head>
  <body>
    <h1>Builds</h1>
    <ul>
      ${pages.map(listItem).join('\n      ')}
      <li><a href="../legacy/">legacy</a> <small>build 78</small></li>
    </ul>
  </body>
</html>
`;
}

rmSync(site, { recursive: true, force: true });
mkdirSync(path.join(site, 'preview'), { recursive: true });

const pages = [
  buildPage(MAIN_BRANCH, ''),
  ...branchesNotMergedIntoMain().map((branch) => buildPage(branch, `preview/${branch}/`)),
];

writeFileSync(path.join(site, 'preview', 'index.html'), listOfPages(pages));
cpSync(path.join(repository, 'legacy', 'build78.html'), path.join(site, 'legacy', 'index.html'));

for (const page of pages) {
  console.log(
    `${page.wasBuilt ? 'built  ' : 'MISSING'} /${page.folder}  ${page.branch} ${page.commit}`,
  );
}
