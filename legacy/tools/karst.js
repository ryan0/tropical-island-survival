// node tools/karst.js <page.html> <out.png>  - three karst groups near home: from the beach at eye level, close up, and from above
const { open, pose } = require('./lib'); const { execSync } = require('child_process');
(async () => {
  const [file, out] = process.argv.slice(2);
  const { browser, page } = await open(file, { width: 520, height: 520 });
  const L = (await page.evaluate(() => __lag.plants['rock karst'] ? __lag.plants['rock karst'].samples['rock karst'] : [])).sort((a, b) => Math.hypot(a[0], a[2] - 150) - Math.hypot(b[0], b[2] - 150));
  const files = [], picks = [L[0], L[Math.min(6, L.length - 1)]];
  for (const [n, p] of picks.entries()) {
    const r = Math.hypot(p[0], p[2]), ux = p[0] / r, uz = p[2] / r, tx = -uz, tz = ux;
    const views = [[ux * 6 + tx * 3, uz * 6 + tz * 3, 1.7, -0.18], [ux * 2.6 - tx * 1.5, uz * 2.6 - tz * 1.5, 1.5, -0.4], [ux * 3, uz * 3, 6, -1.05]];
    for (const [i, v] of views.entries()) {
      const cx = p[0] + v[0], cz = p[2] + v[1], gy = await page.evaluate(([x, z]) => Math.max(__lag.hgt(x, z), 0), [cx, cz]);
      await pose(page, { fly: [cx, gy + v[2], cz, Math.atan2(-(p[0] - cx), -(p[2] - cz)), v[3]], fov: 62, sun: 0.72, wait: 2600 }, 20);
      const f = '/tmp/karst_' + n + '_' + i + '.png'; await page.screenshot({ path: f }); files.push(f);
    }
  }
  await browser.close(); execSync(`python3 ${__dirname}/sheet.py ${out} 3 420 ${files.join(' ')}`); console.log(L.length, 'sampled');
})().catch(e => { console.log('FAIL', e.message.slice(0, 500)); process.exit(1); });
