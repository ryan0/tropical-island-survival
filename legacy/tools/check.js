// node tools/check.js      - run after every change:  build -> lint -> boot the page -> wave mirror test
//   1. python3 build.py
//   2. tools/lint.js                 names declared twice / used but never declared
//   3. boot dist/index.html in headless Chromium for a few seconds: any page error or shader compile error fails
//   4. wave mirror: the JavaScript copy of the wave height (waveH, used for swimming, spray, footprints, the boat)
//      is compared with the shader's on the GPU along lines running out to sea
const { execSync } = require('child_process'); const path = require('path');
const { open } = require('./lib');
const ROOT = path.join(__dirname, '..');
function run(cmd) { try { process.stdout.write(execSync(cmd, { cwd: ROOT, encoding: 'utf8' })); return true; } catch (e) { process.stdout.write((e.stdout || '') + (e.stderr || '')); return false; } }
(async () => {
  let ok = run('python3 build.py') && run('node tools/lint.js --write-docs');
  if (!ok) { console.log('CHECK FAILED'); process.exit(1); }
  const { browser, page, errors } = await open(path.join(ROOT, 'dist/index.html'), { width: 300, height: 300 });
  await page.waitForTimeout(5000);
  const mirror = await page.evaluate(() => {
    const N = 256, cv = document.createElement('canvas'); cv.width = N; cv.height = 1;
    const gl = cv.getContext('webgl', { preserveDrawingBuffer: true }); if (!gl) return { error: 'no webgl for the mirror test' };
    const vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    const fs = 'precision highp float;uniform float uDbg;\n' + __lag.glslWaves() + '\nuniform vec2 uDir;uniform float uT,uR0,uDr;' +
      'void main(){vec2 p=uDir*(uR0+floor(gl_FragCoord.x)*uDr);float v=clamp((waveF(p,uT).x+4.)/8.,0.,.99999);' +
      'vec3 e=fract(v*vec3(1.,255.,65025.));e-=e.yzz*vec3(1./255.,1./255.,0.);gl_FragColor=vec4(e,1.);}';
    function sh(t, s) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
    let pr;
    try { pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); } catch (e) { return { error: 'wave shader did not compile on its own: ' + e.message }; }
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n), px = new Uint8Array(N * 4), diffs = [];
    const DR = 0.25;                                 // from 8 m up the beach to 56 m offshore
    for (let k = 0; k < 24; k++) {
      const th = 0.3 + k * 0.777, T = 12 + k * 2.37, R0 = __lag.islandR(th) - 8;
      gl.uniform2f(U('uDir'), Math.cos(th), Math.sin(th)); gl.uniform1f(U('uT'), T); gl.uniform1f(U('uR0'), R0); gl.uniform1f(U('uDr'), DR); gl.uniform1f(U('uDbg'), 2);   // 2 = lip off
      gl.viewport(0, 0, N, 1); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.readPixels(0, 0, N, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      for (let i = 0; i < N; i++) {
        const gpu = (px[i * 4] / 255 + px[i * 4 + 1] / 65025 + px[i * 4 + 2] / 16581375) * 8 - 4, r = R0 + i * DR;
        diffs.push(Math.abs(gpu - __lag.waveH(Math.cos(th) * r, Math.sin(th) * r, T, true)));
      }
    }
    diffs.sort((x, y) => x - y);
    return { n: diffs.length, mean: diffs.reduce((s, x) => s + x, 0) / diffs.length, p99: diffs[Math.floor(diffs.length * 0.99)], max: diffs[diffs.length - 1] };
  });
  await browser.close();
  const errs = [...new Set(errors)];
  if (errs.length) { ok = false; console.log('PAGE ERRORS:\n  ' + errs.join('\n  ')); } else console.log('boot ok - no page or shader errors');
  if (mirror.error) { ok = false; console.log('MIRROR: ' + mirror.error); }
  else {
    // compared with the breaking lip switched off on both sides (the JavaScript copy does not model it), so the two should agree closely
    const pass = mirror.mean < 0.004 && mirror.p99 < 0.04;
    console.log('wave mirror ' + (pass ? 'ok' : 'FAILED') + ' - ' + mirror.n + ' points: mean ' + mirror.mean.toFixed(4) + ' m, 99% under ' + mirror.p99.toFixed(3) + ' m, worst ' + mirror.max.toFixed(3) + ' m');
    if (!pass) ok = false;
  }
  console.log(ok ? 'CHECK PASSED' : 'CHECK FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('CHECK FAILED', e.message.slice(0, 500)); process.exit(1); });
