// Shared helpers for the test tools: headless Chromium (software GL) with three.js served from tools/vendor.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const THREE_LIB = fs.readFileSync(path.join(__dirname, 'vendor/three.min.js'), 'utf8');
const SEEDED_RANDOM = `(()=>{let s=12345;Math.random=function(){s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();`;
// a stand-in for three.js that swallows every call and records ShaderMaterial parameters (for shader-only checks)
const STUB = `(function(){const f=function(){};const u=new Proxy(f,{get:(t,k)=>{if(k===Symbol.toPrimitive)return ()=>0;if(k==='then')return undefined;return u;},apply:()=>u,construct:()=>u,set:()=>true});
window.__sh=[];const ib=Node.prototype.insertBefore;Node.prototype.insertBefore=function(a,b){try{return ib.call(this,a,b)}catch(e){return a}};window.THREE=new Proxy({}, {get:(t,k)=>k==='ShaderMaterial'?function(o){window.__sh.push(o);return u;}:u});})();`;

async function open(file, opts) {
  opts = opts || {};
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: opts.width || 420, height: opts.height || 420 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR ' + e.message.slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/GPU stall/.test(m.text())) errors.push('CONSOLE ' + m.text().slice(0, 300)); });
  await page.addInitScript(SEEDED_RANDOM + 'window.__noq=1;' + (process.env.LAGOON_SEED ? 'window.__seed=' + (+process.env.LAGOON_SEED) + ';' : '') + (process.env.LAGOON_CLOUDW ? 'window.__cloudW=' + (+process.env.LAGOON_CLOUDW) + ';' : ''));
  await page.route('**/three.min.js', r => r.fulfill({ contentType: 'application/javascript', body: opts.stub ? STUB : THREE_LIB }));
  await page.goto('file://' + path.resolve(file));
  await page.waitForTimeout(1500);
  if (!opts.stub && !opts.keepIntro) {
    await page.evaluate(() => { window.__lag.skip(); ['title', 'cap', 'hint', 'joy', 'snd', 'tod', 'glare', 'vig'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; }); });
    await page.waitForTimeout(1500);
  }
  return { browser, page, errors };
}
// freeze the wave clock at T and place the free camera; view = {fly:[x,y,z,yaw,pitch], fov}
async function pose(page, view, T) {
  await page.evaluate(([v, T]) => {
    if (T !== null) { __lag.freeze(T); } else window.__freeze = false;
    window.__fly = v.fly || null; if (v.sun !== undefined) __lag.sun(v.sun);
    __lag.cam.fov = v.fov || 60; __lag.cam.updateProjectionMatrix();
  }, [view, T === undefined ? null : T]);
  await page.waitForTimeout(view.wait || 3200);
}
module.exports = { open, pose };
