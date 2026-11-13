import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { viteSingleFile } from 'vite-plugin-singlefile';
import packageJson from './package.json' with { type: 'json' };
import { shaderChunks } from './tools/shader-chunks-plugin.ts';

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: import.meta.dirname, encoding: 'utf8' }).trim();
}

// A page built from edited files must not pass for the commit it started from in a screenshot.
function commitOfThisBuild(): string {
  const commit = git('rev-parse', '--short=7', 'HEAD');
  const hasUncommittedChanges = git('status', '--porcelain') !== '';
  return hasUncommittedChanges ? `${commit}-dirty` : commit;
}

export default defineConfig({
  base: './',
  // The page is one file, so there is never a module to preload.
  build: { modulePreload: { polyfill: false } },
  define: {
    'import.meta.env.BUILD_VERSION': JSON.stringify(packageJson.version),
    'import.meta.env.BUILD_COMMIT': JSON.stringify(commitOfThisBuild()),
  },
  plugins: [
    // Chunks include what they need, so two chunks may both include a third: it must appear once.
    glsl({ removeDuplicatedImports: true, warnDuplicatedImports: false }),
    // Build 78's shaders still lifted include chunks that cleaned shaders share with them.
    shaderChunks({
      chunks: ['src/lifted/glsl', 'src/shaders/shared'],
      shared: 'src/lifted/shared',
    }),
    viteSingleFile(),
  ],
});
