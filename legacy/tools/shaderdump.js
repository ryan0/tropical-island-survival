// node tools/shaderdump.js <page.html> <out.json>   - every ShaderMaterial source plus the terrain/rock hooks, comments stripped
const { open } = require('./lib'); const fs = require('fs');
(async () => {
  const { browser, page, errors } = await open(process.argv[2], { stub: true });
  const res = await page.evaluate(() => { const o = {}; window.__sh.forEach((m, i) => { o[i + '.vert'] = m.vertexShader; o[i + '.frag'] = m.fragmentShader; });
    ['__terr', '__terrFn', '__terrBody', '__glslH', '__glslW', '__rock'].forEach(k => { if (window[k]) o[k] = window[k]; }); return o; });
  const norm = t => String(t).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  Object.keys(res).forEach(k => res[k] = norm(res[k]));
  fs.writeFileSync(process.argv[3], JSON.stringify(res, null, 1));
  console.log(Object.keys(res).length + ' shader sources', errors.length ? errors.join('\n') : '');
  await browser.close();
})();
