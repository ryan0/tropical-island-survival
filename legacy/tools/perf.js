// node tools/perf.js <page.html> [breakdown=0] [frames=24]
// Triangles, draw calls and SOFTWARE frame time from a few camera positions. With breakdown=1 it also hides one thing
// at a time (each kind of plant, shadows, water, terrain) and reports what that saves.
// The frame time is from a software renderer on a CPU: it is NOT the phone's speed. It is only good for comparing two
// builds, or for seeing which part of the scene the shaders spend most of their work on.
const { open, pose } = require('./lib');
const ALL = { 'beach, looking inland': [3, 3.1, 160, 0, 0], 'in the grove': [-6, 4.2, 150, 0.4, -0.05], 'along the shore': [3, 3.1, 160, 1.57, -0.05], 'out to sea': [3, 3.1, 160, 3.1416, -0.05] };
const VIEWS = {}; for (const k in ALL) if (!process.env.PERF_VIEW || k.includes(process.env.PERF_VIEW)) VIEWS[k] = ALL[k];
(async () => {
  const [file, breakdown, frames] = process.argv.slice(2), NF = +(frames || 24);
  const { browser, page } = await open(file, { width: 300, height: 534 });
  const measure = () => page.evaluate(NF => new Promise(res => {
    let n = 0, t0 = 0; const i = __lag.renderer.info;
    function f(t) { if (n === 3) t0 = t; if (n === NF + 3) return res({ ms: (t - t0) / NF, tris: i.render.triangles, calls: i.render.calls }); n++; requestAnimationFrame(f); }
    requestAnimationFrame(f);
  }), NF);
  const fmt = r => (r.tris / 1000).toFixed(0).padStart(6) + 'k tris ' + String(r.calls).padStart(4) + ' calls ' + r.ms.toFixed(0).padStart(5) + ' ms';
  for (const name in VIEWS) {
    await pose(page, { fly: VIEWS[name], fov: 72, sun: 0.72, wait: 2500 }, 20);
    const base = await measure();
    console.log((name + '                       ').slice(0, 24), fmt(base));
    if (!+breakdown) continue;
    const groups = await page.evaluate(() => Object.keys(__lag.plants));
    const tests = groups.map(g => ['without ' + g, `for(const m of __lag.plants[${JSON.stringify(g)}].meshes){m.userData.off=ON;m.visible=!ON;}`]);
    tests.push(['without shadows', `__lag.sunLight.castShadow=!ON;`],
      ['without water', `__lag.scene.traverse(m=>{if(m.renderOrder===5){m.visible=!ON;if(m.parent&&m.parent.type==='Group')m.parent.visible=!ON;}});`],
      ['without terrain', `__lag.scene.traverse(m=>{if(m.isMesh&&m.geometry.type==='PlaneGeometry'&&m.geometry.parameters.width===520)m.visible=!ON;});`]);
    for (const [label, code] of tests) {
      await page.evaluate(c => { (new Function('ON', c))(true); }, code); await page.waitForTimeout(700);
      const r = await measure();
      await page.evaluate(c => { (new Function('ON', c))(false); }, code);
      console.log('   ' + (label + '                       ').slice(0, 26), 'saves ' + ((base.tris - r.tris) / 1000).toFixed(0).padStart(5) + 'k tris ' + (base.ms - r.ms).toFixed(0).padStart(5) + ' ms');
    }
  }
  await browser.close();
})().catch(e => { console.log('FAIL', e.message.slice(0, 400)); process.exit(1); });
