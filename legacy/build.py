#!/usr/bin/env python3
"""Assemble src/ into the single self-contained page dist/index.html.

  src/index.html   page shell (CSS + overlay elements); <!--BUILD:JS--> marks where the script goes
  src/glsl/*.glsl  shader chunks, embedded as the GLSL_SRC table (see src/js/20_glsl.js)
  src/shared/*.glsl  formulas needed by BOTH the shaders and the program: embedded as shader chunks
                   and converted to JavaScript functions of the same names
  src/js/*.js      concatenated in file-name order inside ONE function scope
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

def strip_glsl_comments(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    t = re.sub(r'//[^\n]*', '', t)
    return '\n'.join(l.rstrip() for l in t.split('\n') if l.strip()) + '\n'

MATH = 'sin|cos|exp|sqrt|abs|min|max|pow|floor'

def glsl_to_js(t):
    """Convert the scalar subset of GLSL used in src/shared to JavaScript (see the note at the top of those files)."""
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    t = re.sub(r'//[^\n]*', '', t)
    t = re.sub(r'^[ \t]*#include[^\n]*', '', t, flags=re.M)
    if re.search(r'\b(vec[234]|mat[234]|int|bool|uniform|varying|out|inout)\b', t):
        raise SystemExit('src/shared: only float functions of float arguments can be shared with JavaScript')
    t = re.sub(r'\bfloat\s+(\w+)\s*\(([^)]*)\)\s*\{', lambda m: 'function %s(%s){' % (m.group(1), ','.join(a.split()[-1] for a in m.group(2).split(',') if a.strip())), t)
    t = re.sub(r'\bfloat\s+', 'var ', t)
    t = re.sub(r'\batan\(', 'Math.atan2(', t)
    t = re.sub(r'\b(%s)\(' % MATH, r'Math.\1(', t)
    return '\n'.join(l.rstrip() for l in t.split('\n') if l.strip()) + '\n'

def build():
    shell = open(os.path.join(ROOT, 'src/index.html'), encoding='utf8').read()
    glsl = {}
    for p in sorted(glob.glob(os.path.join(ROOT, 'src/glsl/*.glsl'))):
        glsl[os.path.basename(p)[:-5]] = strip_glsl_comments(open(p, encoding='utf8').read())
    shared_js = []
    for p in sorted(glob.glob(os.path.join(ROOT, 'src/shared/*.glsl'))):
        text = open(p, encoding='utf8').read()
        glsl[os.path.basename(p)[:-5]] = strip_glsl_comments(text)
        shared_js.append('\n/* ---- generated from src/shared/%s (edit that file, not this) ---- */\n' % os.path.basename(p) + glsl_to_js(text))
    parts = ['(function(){\n"use strict";\nvar GLSL_SRC=' + json.dumps(glsl, indent=0) + ';\n' + ''.join(shared_js)]
    for p in sorted(glob.glob(os.path.join(ROOT, 'src/js/*.js'))):
        parts.append('\n/* ================= %s ================= */\n' % os.path.basename(p))
        parts.append(open(p, encoding='utf8').read())
    parts.append('\n})();\n')
    js = ''.join(parts).replace('</script', '<\\/script')
    assert shell.count('<!--BUILD:JS-->') == 1
    out = shell.replace('<!--BUILD:JS-->', '<script>\n' + js + '</script>')
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    open(os.path.join(ROOT, 'dist/index.html'), 'w', encoding='utf8').write(out)
    open(os.path.join(ROOT, 'dist/app.js'), 'w', encoding='utf8').write(js)   # same script on its own, for the checks
    m = re.search(r'BUILD\s*=\s*(\d+)', js)
    print('dist/index.html  %d bytes  build %s  (%d js files, %d shader chunks)' % (len(out), m.group(1) if m else '?', len(parts) // 2 - 1, len(glsl)))

if __name__ == '__main__':
    build()
