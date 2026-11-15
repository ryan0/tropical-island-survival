import { expect, test, type BrowserContext } from '@playwright/test';
import { builtPage } from './pages';
import { openScenePage } from './scene-page';

// The wave model is written twice: in the shader that moves the water, and in the program for
// everything that must know where the water is (swimming, spray, footprints). Both read the same
// pictures of the sea floor and share their timing; the shapes are written in each. They are kept
// in step by this test, which draws the shader's wave heights along lines running out to sea and
// compares them with the program's.

const LINES_OUT_TO_SEA = 24;
const SAMPLES_ALONG_A_LINE = 256;

// Metres. The two copies agree to 0.00006 on average and 0.0007 at the 99th percentile; the
// limits leave seven times that. (Limits of 0.004 and 0.04 once let a visibly different shoaling
// curve through.)
const MEAN_LIMIT = 0.0005;
const NINETY_NINTH_PERCENTILE_LIMIT = 0.005;

// Runs in the page. Returns, for every sample, how far apart the two copies are in metres.
// (`programIsAhead` asks the program for the waves that many seconds later than the shader.)
function differencesBetweenShaderAndProgram([lines, samples, programIsAhead]: readonly [
  number,
  number,
  number,
]): number[] {
  const hooks = window.__scene;
  const canvas = document.createElement('canvas');
  canvas.width = samples;
  canvas.height = 1;
  // (WebGL 2: the sea floor's pictures are half floats, read smoothly)
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
  if (gl === null) throw new Error('no WebGL 2 for the wave mirror test');

  // Each pixel along the row is one point on the line; its colour is the wave height there,
  // from -4 m to 4 m, spread over the three channels to keep the precision.
  const pointsSource = 'attribute vec2 a; void main() { gl_Position = vec4(a, 0., 1.); }';
  // (The wave model reads a debug switch that whoever includes it declares.)
  const heightsSource = `precision highp float;
    uniform float uDebugMode;
    ${hooks.waveShaderSource()}
    uniform vec2 uDir;
    uniform float uT, uR0, uDr;
    void main() {
      vec2 p = uDir * (uR0 + floor(gl_FragCoord.x) * uDr);
      float v = clamp((waveF(p, uT).x + 4.) / 8., 0., .99999);
      vec3 e = fract(v * vec3(1., 255., 65025.));
      e -= e.yzz * vec3(1. / 255., 1. / 255., 0.);
      gl_FragColor = vec4(e, 1.);
    }`;

  function compile(type: number, source: string): WebGLShader {
    const shader = gl?.createShader(type);
    if (!gl || !shader) throw new Error('could not create a shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
      const log = gl.getShaderInfoLog(shader) ?? '';
      throw new Error(`the wave shader did not compile on its own: ${log}`);
    }
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, pointsSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, heightsSource));
  gl.linkProgram(program);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(program, 'a');
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, samples, 1);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  // The wave model reads the sea floor's two pictures: it is given the page's own.
  const { size, floor, breaks } = hooks.seaFloor;
  [floor, breaks].forEach((picture, unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA16F,
      size,
      size,
      0,
      gl.RGBA,
      gl.HALF_FLOAT,
      picture.image.data,
    );
    for (const filter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) {
      gl.texParameteri(gl.TEXTURE_2D, filter, gl.LINEAR);
    }
    for (const wrap of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) {
      gl.texParameteri(gl.TEXTURE_2D, wrap, gl.CLAMP_TO_EDGE);
    }
    gl.uniform1i(uniform(unit === 0 ? 'uSeaFloor' : 'uBreakTimes'), unit);
  });
  const metresBetweenSamples = 0.25;
  const metresUpTheBeach = 8;
  const breakingLipOff = 2;
  const pixels = new Uint8Array(samples * 4);
  const differences: number[] = [];

  for (let line = 0; line < lines; line++) {
    // Lines spread right round the atoll, each at its own moment of the swell.
    const th = 0.3 + line * 0.777;
    const waveTime = 12 + line * 2.37;
    const firstRadius = hooks.islandRadius(th) - metresUpTheBeach;
    gl.uniform2f(uniform('uDir'), Math.cos(th), Math.sin(th));
    gl.uniform1f(uniform('uT'), waveTime);
    gl.uniform1f(uniform('uR0'), firstRadius);
    gl.uniform1f(uniform('uDr'), metresBetweenSamples);
    // The program's copy does not model the falling lip, so the shader's is switched off too.
    gl.uniform1f(uniform('uDebugMode'), breakingLipOff);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.readPixels(0, 0, samples, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    for (let i = 0; i < samples; i++) {
      const [red, green, blue] = pixels.subarray(i * 4, i * 4 + 3);
      const inShader = (red / 255 + green / 65025 + blue / 16581375) * 8 - 4;
      const radius = firstRadius + i * metresBetweenSamples;
      const programTime = waveTime + programIsAhead;
      const inProgram = hooks.waveHeight(
        Math.cos(th) * radius,
        Math.sin(th) * radius,
        programTime,
        true,
      );
      differences.push(Math.abs(inShader - inProgram));
    }
  }
  return differences;
}

async function measureMirror(context: BrowserContext, programIsAhead = 0) {
  const scene = await openScenePage(context, builtPage);
  const differences = await scene.page.evaluate(differencesBetweenShaderAndProgram, [
    LINES_OUT_TO_SEA,
    SAMPLES_ALONG_A_LINE,
    programIsAhead,
  ] as const);
  differences.sort((a, b) => a - b);

  expect(scene.problems).toEqual([]);
  expect(differences).toHaveLength(LINES_OUT_TO_SEA * SAMPLES_ALONG_A_LINE);
  return {
    mean: differences.reduce((sum, difference) => sum + difference, 0) / differences.length,
    ninetyNinthPercentile: differences[Math.floor(differences.length * 0.99)] ?? Infinity,
  };
}

test(
  'the wave model in the shader and its copy in the program agree',
  { tag: '@quick' },
  async ({ context }) => {
    const { mean, ninetyNinthPercentile } = await measureMirror(context);

    expect(mean).toBeLessThan(MEAN_LIMIT);
    expect(ninetyNinthPercentile).toBeLessThan(NINETY_NINTH_PERCENTILE_LIMIT);
  },
);

// A check that cannot fail proves nothing: the two copies are asked for moments a fiftieth of
// a second apart, in which a wave travels about a hand's width.
test('a program out of step with the shader is reported', async ({ context }) => {
  const { mean } = await measureMirror(context, 0.02);

  expect(mean).toBeGreaterThan(MEAN_LIMIT);
});
