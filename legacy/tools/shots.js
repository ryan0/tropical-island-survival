// node tools/shots.js <page.html> <outdir> [views.json] [waveTime] [size]
// Renders every view in views.json with the wave clock frozen at waveTime (default 20 s) -> <outdir>/<name>.png
const { open, pose } = require('./lib'); const fs = require('fs'), path = require('path');
(async () => {
  const [file, outdir, vfile, T, size] = process.argv.slice(2);
  const views = JSON.parse(fs.readFileSync(vfile || path.join(__dirname, 'views.json'), 'utf8'));
  fs.mkdirSync(outdir, { recursive: true });
  const s = +(size || 420);
  const { browser, page, errors } = await open(file, { width: s, height: s });
  for (const v of views) { await pose(page, v, T === undefined ? 20 : +T); await page.screenshot({ path: path.join(outdir, v.name + '.png'), timeout: 120000 }); }
  if (errors.length) console.log([...new Set(errors)].join('\n'));
  await browser.close();
})().catch(e => { console.log('FAIL', e.message.slice(0, 400)); process.exit(1); });
