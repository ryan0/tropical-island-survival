// node tools/tris.js <page.html> [view=inland]  - which things the triangles of one frame belong to (main picture only, not the shadow pass)
const { open, pose } = require('./lib');
const VIEWS = { inland: [3, 3.1, 160, 0, 0], grove: [-6, 4.2, 150, 0.4, -0.05], shore: [3, 3.1, 160, 1.57, -0.05], sea: [3, 3.1, 160, 3.1416, -0.05], flyin: [-150, 150, 330, -0.45, -0.45] };
(async () => {
  const { browser, page } = await open(process.argv[2], { width: 300, height: 534 });
  await pose(page, { fly: VIEWS[process.argv[3] || 'inland'], fov: 72, sun: 0.72, wait: 3000 }, 20);
  const out = await page.evaluate(async () => {
    const info = __lag.renderer.info.render, frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await frame(); const base = { t: info.triangles, c: info.calls }, rows = [];
    const cats = {}; for (const g in __lag.plants) cats[g] = __lag.plants[g].meshes;
    const known = new Set(); for (const g in cats) cats[g].forEach(m => known.add(m));
    const other = { terrain: [], water: [], 'everything else': [] };
    __lag.scene.traverse(m => { if (!(m.isMesh || m.isPoints) || known.has(m)) return;
      if (m.geometry.type === 'PlaneGeometry' && m.geometry.parameters.width === 520) other.terrain.push(m); else if (m.renderOrder === 5) other.water.push(m); else other['everything else'].push(m); });
    Object.assign(cats, other);
    for (const g in cats) { const vis = cats[g].map(m => m.visible); cats[g].forEach(m => { m.userData.off = true; m.visible = false; }); await frame();
      rows.push([g, base.t - info.triangles, base.c - info.calls]); cats[g].forEach((m, i) => { m.userData.off = false; m.visible = vis[i]; }); }
    return { base, rows };
  });
  console.log('total', (out.base.t / 1000).toFixed(0) + 'k triangles,', out.base.c, 'draw calls');
  out.rows.sort((a, b) => b[1] - a[1]).forEach(r => console.log('  ' + (r[0] + '                    ').slice(0, 18), (r[1] / 1000).toFixed(0).padStart(5) + 'k', String(r[2]).padStart(4) + ' calls'));
  await browser.close();
})().catch(e => { console.log('FAIL', e.message.slice(0, 400)); process.exit(1); });
