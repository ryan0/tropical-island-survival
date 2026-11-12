// node tools/profile.js <page.html> [thetaDeg=90] [t0=20] [dt=1.3] [n=6]  - wave height along a line out to sea, at n times
// columns: metres off the beach, then for each time the surface height in cm (L = lip falling, * = white water)
const { open } = require('./lib');
(async () => {
  const [file, thd, t0, dt, n] = process.argv.slice(2);
  const { browser, page } = await open(file, { width: 64, height: 64 });
  const out = await page.evaluate(([thd, t0, dt, n]) => {
    const L = window.__lag, th = thd * Math.PI / 180, R = L.islandR(th), rows = [];
    for (let s = 70; s >= -3; s -= (s > 52 || s <= 36 && s > 8 ? 2 : (s > 36 ? 0.5 : 1))) {
      let line = (s.toFixed(1) + '   ').slice(0, 6);
      for (let i = 0; i < n; i++) { const e = L.waveH(Math.cos(th) * (R + s), Math.sin(th) * (R + s), t0 + i * dt); const w = L.wp ? L.wp() : {};
        line += (' ' + (e * 100).toFixed(0)).padStart(5) + (w.lip > .3 ? 'L' : (w.bore > .3 ? '*' : (w.imp > .3 ? 'i' : ' '))); }
      rows.push(line);
    }
    return rows.join('\n');
  }, [+(thd || 90), +(t0 || 20), +(dt || 1.3), +(n || 6)]);
  console.log(out); await browser.close();
})().catch(e => { console.log('FAIL', e.message.slice(0, 400)); process.exit(1); });
