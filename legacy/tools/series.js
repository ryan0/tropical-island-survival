// node tools/series.js <page.html> <out.png-prefix> '<view json>' t0 dt n [size]   - one view at n wave times (to watch waves break)
const { open, pose } = require('./lib');
(async () => {
  const [file, prefix, vj, t0, dt, n, size] = process.argv.slice(2); const v = JSON.parse(vj), s = +(size || 360);
  const { browser, page, errors } = await open(file, { width: s, height: s });
  for (let i = 0; i < +n; i++) { await pose(page, v, +t0 + i * +dt); await page.screenshot({ path: prefix + i + '.png', timeout: 120000 }); }
  const info = await page.evaluate(() => { const o = {}; __lag.scene.traverse(m => { if (m.isInstancedMesh) o['inst'] = (o['inst'] || 0) + m.count; }); return o; });
  console.log(JSON.stringify(info), errors.length ? [...new Set(errors)].join('\n') : '');
  await browser.close();
})().catch(e => { console.log('FAIL', e.message.slice(0, 300)); process.exit(1); });
