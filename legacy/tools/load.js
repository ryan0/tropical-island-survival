// node tools/load.js <page.html>   - how much geometry is drawn per frame from a few camera positions (triangles in the picture itself - the shadow pass is not counted - and draw calls).
// Software rendering says nothing about speed, but this number is real: it is what the phone's GPU is asked to process.
const { open, pose } = require('./lib');
const VIEWS = { 'beach, looking out to sea': [3, 3.1, 160, 3.1416, -0.05], 'beach, looking inland': [3, 3.1, 160, 0, 0], 'along the shore': [3, 3.1, 160, 1.57, -0.05],
  'lagoon beach': [5, 3.4, 101, 0.1, -0.1], 'fly-in (high)': [-150, 150, 330, -0.45, -0.45] };
(async () => {
  const { browser, page } = await open(process.argv[2], { width: 300, height: 534 });
  for (const name in VIEWS) {
    await pose(page, { fly: VIEWS[name], fov: 72, sun: 0.72, wait: 2500 }, 20);
    const r = await page.evaluate(() => {
      if (__lag.renderer) { const i = __lag.renderer.info.render; return { tris: i.triangles, calls: i.calls }; }
      let t = 0, c = 0; __lag.scene.traverse(m => { if (!(m.isMesh || m.isPoints) || !m.visible || !m.geometry) return; const g = m.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); t += n * (m.castShadow ? 2 : 1); c += m.castShadow ? 2 : 1; });
      return { tris: Math.round(t), calls: c, note: 'no culling in this build: everything is drawn' };
    });
    console.log((name + '                         ').slice(0, 27), (r.tris / 1000).toFixed(0).padStart(6) + 'k triangles', String(r.calls).padStart(5) + ' draw calls', r.note || '');
  }
  await browser.close();
})().catch(e => { console.log('FAIL', e.message.slice(0, 300)); process.exit(1); });
