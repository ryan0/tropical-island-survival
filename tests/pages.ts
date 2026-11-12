import path from 'node:path';

export const projectRoot = path.resolve(import.meta.dirname, '..');

export const builtPage = path.join(projectRoot, 'dist', 'index.html');
export const legacyPage = path.join(projectRoot, 'legacy', 'build78.html');

// Until step 3 of the refactor brings the scene into the new build, that build is an empty
// page, so the scene tests run against build 78 itself. That proves the tests; step 3 points
// this at builtPage.
export const scenePage = legacyPage;

// Build 78 fetches three.js from a CDN. The tests hand it this copy instead, so they run
// without a network and always against the same library.
export const threeLibraryOnCdn = '**/three.min.js';
export const threeLibraryFile = path.join(projectRoot, 'legacy', 'tools', 'vendor', 'three.min.js');
