// node tools/rocks.js <page.html> <out.png> [size=520]  - the rock groups nearest home, each seen from the beach side at eye level
const { open, pose } = require('./lib'); const { execSync } = require('child_process');
(async () => {
  const [file, out, size] = process.argv.slice(2), S = +(size || 520);
  const { browser, page } = await open(file, { width: S, height: S });
  const spots = await page.evaluate(() => { const o = []; for (const g in __lag.plants) if (g.startsWith('rock ') && g !== 'rock cobble') for (const s in __lag.plants[g].samples) __lag.plants[g].samples[s].forEach(p => o.push([g, p[0], p[1], p[2], p[3]])); return o; });
  const kinds = ['rock boulder', 'rock crag', 'rock slab', 'rock karst'], files = [];
  for (const k of kinds) {
    const L = spots.filter(s => s[0] === k).sort((a, b) => (Math.hypot(a[1], a[3] - 150) - Math.hypot(b[1], b[3] - 150)) || 0);
    // the biggest of the eight nearest home, then one from further round the island
    const near = L.slice(0, 8).sort((a, b) => b[4] - a[4])[0], far = L[Math.min(L.length - 1, 14)];
    for (const [i, p] of [[0, near], [1, far]]) {
      if (!p) continue;
      const r = Math.hypot(p[1], p[3]), ux = p[1] / r, uz = p[3] / r, tx = -uz, tz = ux, inl = k === 'rock karst' ? 1 : -1;
      // stand 7 m away, up the beach (down it for karst) and a little along it, looking at the rock
      const cx = p[1] + ux * 6 + tx * 4.5 * inl, cz = p[3] + uz * 6 + tz * 4.5 * inl, gy = await page.evaluate(([x, z]) => Math.max(__lag.hgt(x, z), 0), [cx, cz]);
      const dx = p[1] - cx, dz = p[3] - cz;
      await pose(page, { fly: [cx, gy + 1.7, cz, Math.atan2(-dx, -dz), -0.16], fov: 62, sun: 0.72, wait: 2600 }, 20);
      const f = '/tmp/rocks_' + k.replace(' ', '_') + i + '.png'; await page.screenshot({ path: f }); files.push(f);
    }
  }
  await browser.close();
  execSync(`python3 ${__dirname}/sheet.py ${out} 4 400 ${files.join(' ')}`); console.log(files.length, 'views');
})().catch(e => { console.log('FAIL', e.message.slice(0, 500)); process.exit(1); });
