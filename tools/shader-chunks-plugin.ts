// Build 78 keeps its shaders as chunks of text that the program joins up, and writes numbers
// into, as it starts (src/lifted/js/20_glsl.js). Its build script gathered the chunks into one
// table, and turned the formulas that the program needs as well as the shaders - the island's
// shape - into JavaScript functions of the same names. This plugin does both, exactly as that
// script did, and offers the result as the module 'virtual:shader-chunks'.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const MODULE_ID = 'virtual:shader-chunks';
const RESOLVED_MODULE_ID = `\0${MODULE_ID}`;

// The whole of GLSL that may be shared with the program: float functions of float arguments.
const NOT_SHARED = /\b(vec[234]|mat[234]|int|bool|uniform|varying|out|inout)\b/;
const MATHS_FUNCTIONS = /\b(sin|cos|exp|sqrt|abs|min|max|pow|floor)\(/g;

/** Folders of .glsl files, relative to the project. */
export interface ShaderChunkFolders {
  /** Chunks for shaders only. */
  chunks: string;
  /** Chunks that are also turned into functions for the program. */
  shared: string;
}

function withoutComments(glsl: string): string {
  return glsl.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function withoutBlankLines(text: string): string {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  return `${lines.map((line) => line.trimEnd()).join('\n')}\n`;
}

function asJavaScript(glsl: string, file: string): string {
  const text = withoutComments(glsl).replace(/^[ \t]*#include[^\n]*/gm, '');
  if (NOT_SHARED.test(text)) {
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

function chunkName(file: string): string {
  return path.basename(file, '.glsl');
}

export function shaderChunks(folders: ShaderChunkFolders): Plugin {
  let projectRoot = '';

  return {
    name: 'shader-chunks',

    configResolved(config) {
      projectRoot = config.root;
    },

    resolveId(id) {
      return id === MODULE_ID ? RESOLVED_MODULE_ID : null;
    },

    load(id) {
      if (id !== RESOLVED_MODULE_ID) return null;

      const table: Record<string, string> = {};
      const programCode: string[] = [];
      // The dev server reloads the page when a watched file changes; it wants the full path.
      for (const file of glslFilesIn(path.resolve(projectRoot, folders.chunks))) {
        this.addWatchFile(file);
        table[chunkName(file)] = withoutBlankLines(withoutComments(readFileSync(file, 'utf8')));
      }
      for (const file of glslFilesIn(path.resolve(projectRoot, folders.shared))) {
        this.addWatchFile(file);
        const glsl = readFileSync(file, 'utf8');
        table[chunkName(file)] = withoutBlankLines(withoutComments(glsl));
        programCode.push(asJavaScript(glsl, file));
      }

      const code = programCode.join('\n');
      const functionNames = [...code.matchAll(/^function (\w+)\(/gm)].map((match) => match[1]);
      return [
        `export var GLSL_SRC=${JSON.stringify(table)};`,
        code,
        `export {${functionNames.join(',')}};`,
      ].join('\n');
    },
  };
}
