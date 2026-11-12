// node tools/probe.js <page.html> '<view json>' T [hideWater=0]  - prints the average colour of a 5x5 grid of screen patches (and saves /tmp/probe.png)
const { open, pose } = require('./lib');
(async () => {
  const [file, vj, T, hide] = process.argv.slice(2);
  const { browser, page } = await open(file, { width: 400, height: 400 });
  if (+hide) await page.evaluate(() => { __lag.scene.traverse(m => { if (m.renderOrder === 5) { m.visible = false; if (m.parent && m.parent.type === "Group") m.parent.visible = false; } }); window.__hideWater = 1; });
  await pose(page, JSON.parse(vj), +T);
  if (+hide) await page.evaluate(() => { __lag.scene.traverse(m => { if (m.renderOrder === 5) { m.visible = false; if (m.parent && m.parent.type === "Group") m.parent.visible = false; } }); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/probe.png' });
  await browser.close();
  const { execSync } = require('child_process');
  console.log(execSync(`python3 -c "
from PIL import Image
im=Image.open('/tmp/probe.png').convert('RGB').resize((5,5),Image.BOX)
for y in range(5): print('  '.join('%3d,%3d,%3d'%im.getpixel((x,y)) for x in range(5)))
"`).toString());
})().catch(e => { console.log('FAIL', e.message.slice(0, 400)); process.exit(1); });
