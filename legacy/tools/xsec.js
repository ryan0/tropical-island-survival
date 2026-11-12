// node tools/xsec.js <page.html> <out.png> [thetaDeg=92] [t0=59] [dt=0.3] [n=6] [s0=34] [s1=58]
// Cross-sections of the water surface along a line out to sea, as the GPU draws it (falling lip included), one per time.
// Sea on the right, beach on the left; true proportions (grid lines every metre).
const { open } = require('./lib'); const fs = require('fs'); const { execSync } = require('child_process');
(async () => {
  const a = process.argv.slice(2), file = a[0], out = a[1], thd = +(a[2] || 92), t0 = +(a[3] || 59), dt = +(a[4] || 0.3), n = +(a[5] || 6), s0 = +(a[6] || 34), s1 = +(a[7] || 58);
  const { browser, page } = await open(file, { width: 64, height: 64 });
  const data = await page.evaluate(([thd, t0, dt, n, s0, s1]) => {
    const N = 1024, cv = document.createElement('canvas'); cv.width = N; cv.height = 1;
    const gl = cv.getContext('webgl', { preserveDrawingBuffer: true });
    const vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    const fs = 'precision highp float;uniform float uDbg,uCh;\n' + __lag.glslWaves() + '\nuniform vec2 uDir;uniform float uT,uR0,uDr;' +
      'void main(){vec2 p=uDir*(uR0+floor(gl_FragCoord.x)*uDr);vec4 w=waveF(p,uT);float v=clamp(((uCh<.5?w.x:(uCh<1.5?w.y:w.z))+16.)/32.,0.,.99999);' +
      'vec3 e=fract(v*vec3(1.,255.,65025.));e-=e.yzz*vec3(1./255.,1./255.,0.);gl_FragColor=vec4(e,1.);}';
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = k => gl.getUniformLocation(pr, k), px = new Uint8Array(N * 4), th = thd * Math.PI / 180, R0 = __lag.islandR(th) + s0, DR = (s1 - s0) / N, res = [];
    gl.uniform2f(U('uDir'), Math.cos(th), Math.sin(th)); gl.uniform1f(U('uR0'), R0); gl.uniform1f(U('uDr'), DR); gl.uniform1f(U('uDbg'), 0); gl.viewport(0, 0, N, 1);
    for (let i = 0; i < n; i++) {
      const row = [[], [], []]; gl.uniform1f(U('uT'), t0 + i * dt);
      for (let c = 0; c < 3; c++) { gl.uniform1f(U('uCh'), c); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.readPixels(0, 0, N, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        for (let j = 0; j < N; j++) row[c].push((px[j * 4] / 255 + px[j * 4 + 1] / 65025 + px[j * 4 + 2] / 16581375) * 32 - 16); }
      res.push(row);
    }
    return { res, DR };
  }, [thd, t0, dt, n, s0, s1]);
  await browser.close();
  fs.writeFileSync('/tmp/xsec.json', JSON.stringify({ data, s0, s1, t0, dt }));
  execSync(`python3 - <<'PY'
import json
from PIL import Image, ImageDraw
J=json.load(open('/tmp/xsec.json')); res=J['data']['res']; DR=J['data']['DR']; s0=J['s0']; s1=J['s1']
SC=40; W=int((s1-s0)*SC); RH=int(3.2*SC); im=Image.new('RGB',(W,RH*len(res)),(248,250,252)); d=ImageDraw.Draw(im)
for i,(eta,ds,fo) in enumerate(res):
    y0=i*RH+int(2.1*SC)
    for m in range(int(s1-s0)+1): d.line([(m*SC,i*RH),(m*SC,(i+1)*RH)],fill=(228,232,238))
    for m in (-1,0,1,2): d.line([(0,y0-m*SC),(W,y0-m*SC)],fill=(170,200,230) if m==0 else (228,232,238))
    pts=[((j*DR-ds[j])*SC, y0-eta[j]*SC) for j in range(len(eta))]
    for j in range(len(pts)-1):
        f=max(fo[j],0); col=(int(20+200*min(f,1)),int(90+60*min(f,1)),int(190-150*min(f,1)))
        d.line([pts[j],pts[j+1]],fill=col,width=2)
    d.text((6,i*RH+4),'t=%.2f  (%d m off the beach at the left edge, sea to the right; red = foam)'%(J['t0']+i*J['dt'],s0),fill=(60,60,60))
im.save('${out}')
PY`);
  console.log('wrote', out);
})().catch(e => { console.log('FAIL', e.message.slice(0, 600)); process.exit(1); });
