// A formula that both the shaders and the program need is written once, in GLSL, for the shaders:
// the shape of the island (src/world/island-shape), the patterns of the turf that the grass
// follows (src/world/ground-patterns), and the swell's timing (src/sea/wave-timing). This plugin
// turns the .glsl files of such a folder into JavaScript functions of the same names and offers
// them to the program as a module ('virtual:island-shape', 'virtual:ground-patterns',
// 'virtual:wave-timing'), so that shaders and program can never disagree.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

// The whole of GLSL that can be turned into JavaScript here: float functions of float arguments,
// and float constants.
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
    throw new Error(`${file}: only float functions and float constants can be shared`);
  }
  const functions = text
    .replace(/\bfloat\s+(\w+)\s*\(([^)]*)\)\s*\{/g, (_, name: string, parameters: string) => {
      const names = parameters
        .split(',')
        .filter((parameter) => parameter.trim() !== '')
        .map((parameter) => parameter.trim().split(/\s+/).at(-1));
      return `function ${name}(${names.join(',')}){`;
    })
    .replace(/\bconst\s+float\s+/g, 'const ')
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

/** Offers the .glsl files in `folder`, relative to the project, to the program as `moduleId`. */
export function glslForProgram(moduleId: string, folder: string): Plugin {
  const resolvedModuleId = `\0${moduleId}`;
  let projectRoot = '';

  return {
    name: `glsl-for-program:${moduleId}`,

    configResolved(config) {
      projectRoot = config.root;
    },

    resolveId(id) {
      return id === moduleId ? resolvedModuleId : null;
    },

    load(id) {
      if (id !== resolvedModuleId) return null;

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
