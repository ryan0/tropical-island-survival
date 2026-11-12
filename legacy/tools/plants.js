// node tools/plants.js <page.html> <out.png> [filter] [size=420] [cols=4] [variant=0]
// Portraits of every kind of plant, each shown with all OTHER kinds of plant hidden. filter = part of a name
// (e.g. "palm"); with a filter each kind is shown twice: whole, and close up. variant picks a different specimen.
const { open, pose } = require('./lib'); const { execSync } = require('child_process');
// [distance, camera height above the plant's foot, height looked at] for the whole view, in units of the plant's size
const VIEW = { 'palm ordinary': [13, 3, 4.5], 'palm tall': [17, 3, 6], 'palm leaning': [13, 3, 4], 'palm young': [8, 2.5, 2.5], 'beach shrub': [5, 1.8, 0.6],
  'broadleaf tree': [10, 2.5, 3], 'screw pine': [7, 2.2, 2.2], 'rosette': [3.2, 1.5, 0.3], 'fallen frond': [4.5, 2.2, 0], 'vine mat': [4.5, 2.4, 0], 'stump': [3, 1.4, 0.3], 'rock boulder': [7, 2.2, 0.6], 'rock crag': [8, 2.4, 0.6], 'rock slab': [8, 2.6, 0.2], 'rock karst': [6, 2.2, 0.5], 'rock cobble': [3, 1.5, 0.1],
  'scrub bush': [5.5, 1.8, 0.9], 'grass turf': [2.6, 1.3, 0.2], 'grass seed heads': [2.6, 1.3, 0.3], 'grass broad': [2.6, 1.3, 0.3], 'grass dune': [2.6, 1.3, 0.3] };
(async () => {
  const [file, out, filter, size, cols, variant] = process.argv.slice(2), S = +(size || 420);
  const { browser, page, errors } = await open(file, { width: S, height: S });
  const reg = await page.evaluate(() => { const o = {}; for (const g in __lag.plants) for (const s in __lag.plants[g].samples) o[s] = { g, list: __lag.plants[g].samples[s] }; return o; });
  const names = Object.keys(reg).filter(n => !filter || n.includes(filter)).sort(), files = [];
  for (const name of names) {
    const L = reg[name].list, near = L.filter(p => Math.hypot(p[0], p[2] - 150) < 70), pool = near.length ? near : L, p = pool[(+(variant || 0)) % pool.length];
    await page.evaluate(g => { for (const k in __lag.plants) __lag.plants[k].meshes.forEach(m => { m.userData.off = k !== g; m.visible = k === g; }); }, reg[name].g);
    const V = VIEW[name] || [6, 2, 1], sc = name.startsWith('palm') || name === 'broadleaf tree' || name === 'screw pine' || name === 'beach shrub' || name === 'scrub bush' ? p[3] : 1;
    const shots = filter ? [[1, 1], [0.42, 1.25]] : [[1, 1]];
    for (let i = 0; i < shots.length; i++) {
      const d = V[0] * sc * shots[i][0], ux = 0.35, uz = 0.94, cy = p[1] + V[1] * sc * (i ? 1.1 : 1), ty = p[1] + V[2] * sc * shots[i][1];
      await pose(page, { fly: [p[0] + ux * d, cy, p[2] + uz * d, Math.atan2(ux, uz), Math.atan2(ty - cy, d)], fov: 55, sun: 0.72, wait: 2600 }, 20);
      const f = '/tmp/plant_' + name.replace(/ /g, '_') + (i ? '_close' : '') + '.png'; await page.screenshot({ path: f }); files.push(f);
    }
  }
  if (errors.length) console.log([...new Set(errors)].join('\n'));
  await browser.close();
  execSync(`python3 ${__dirname}/sheet.py ${out} ${cols || 4} ${Math.min(S, 400)} ${files.join(' ')}`);
  console.log(names.join(', '));
})().catch(e => { console.log('FAIL', e.message.slice(0, 500)); process.exit(1); });
