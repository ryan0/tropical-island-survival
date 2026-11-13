// The shape of the island is written once, in GLSL, for the shaders (src/world/island-shape).
// The program needs the same formulas: where the ground is, how far out the shore lies. This
// plugin turns them into JavaScript functions of the same names and offers them as the module
// 'virtual:island-shape', so that shaders and program can never disagree about the ground.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const MODULE_ID = 'virtual:island-shape';
const RESOLVED_MODULE_ID = `\0${MODULE_ID}`;

// The whole of GLSL that can be turned into JavaScript here: float functions of float arguments.
const NOT_CONVERTED = /\b(vec[234]|mat[234]|int|bool|uniform|varying|out|inout)\b/;
const MATHS_FUNCTIONS = /\b(sin|cos|exp|sqrt|abs|min|max|pow|floor)\(/g;

function withoutComments(glsl: string): string {
  return glsl.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function withoutBlankLines(text: string): string {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  return `${lines.map((line) => line.trimEnd()).join('\n')}\n`;
}

function asJavaScript(glsl: string, file: string): string {
  const text = withoutComments(glsl).replace(/^[ \t]*#include[^\n]*/gm, '');
  if (NOT_CONVERTED.test(text)) {
    throw new Error(`${file}: only float functions of float arguments can be shared`);
  }
  const functions = text
    .replace(/\bfloat\s+(\w+)\s*\(([^)]*)\)\s*\{/g, (_, name: string, parameters: string) => {
      const names = parameters
        .split(',')
        .filter((parameter) => parameter.trim() !== '')
        .map((parameter) => parameter.trim().split(/\s+/).at(-1));
      return `function ${name}(${names.join(',')}){`;
    })
    .replace(/\bfloat\s+/g, 'var ')
    .replace(/\batan\(/g, 'Math.atan2(')
    .replace(MATHS_FUNCTIONS, 'Math.$1(');
  return withoutBlankLines(functions);
}

function glslFilesIn(folder: string): string[] {
  return readdirSync(folder)
    .filter((name) => name.endsWith('.glsl'))
    .sort()
    .map((name) => path.join(folder, name));
}

/** `folder` holds the .glsl files of the island's shape, relative to the project. */
export function islandShape(folder: string): Plugin {
  let projectRoot = '';

  return {
    name: 'island-shape',

    configResolved(config) {
      projectRoot = config.root;
    },

    resolveId(id) {
      return id === MODULE_ID ? RESOLVED_MODULE_ID : null;
    },

    load(id) {
      if (id !== RESOLVED_MODULE_ID) return null;

      const programCode: string[] = [];
      // The dev server reloads the page when a watched file changes; it wants the full path.
      for (const file of glslFilesIn(path.resolve(projectRoot, folder))) {
        this.addWatchFile(file);
        programCode.push(asJavaScript(readFileSync(file, 'utf8'), file));
      }

      const code = programCode.join('\n');
      const functionNames = [...code.matchAll(/^function (\w+)\(/gm)].map((match) => match[1]);
      return [code, `export {${functionNames.join(',')}};`].join('\n');
    },
  };
}
