import { BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, type Scene } from 'three';
import { sprayConfig } from './spray-config';
import fragmentShader from './spray.frag.glsl';
import vertexShader from './spray.vert.glsl';

// The spray is a pool of point sprites: droplets, which fall, and puffs of mist, which grow and
// hang in the air. Once all of them are in the air, each one thrown takes the place of the oldest.

export interface SprayDroplets {
  /**
   * Throws one from (x, y, z) at (vx, vy, vz) metres a second, to last `seconds`. It starts `size`
   * across and grows by `growth` a second; at its brightest it shows `brightness`, 0 to 1.
   */
  launch(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    seconds: number,
    size: number,
    growth: number,
    brightness: number,
  ): void;
  /** Moves every one in the air on by `dt` seconds. */
  move(dt: number): void;
  /**
   * `focalLength` is in pixels: how many a metre spans at a metre away. `daylight` is 0 at night
   * and 1 in full day, `night` 0 by day and 1 at night.
   */
  show(focalLength: number, daylight: number, night: number): void;
}

const config = sprayConfig.flight;

export function createSprayDroplets(scene: Scene): SprayDroplets {
  const count = sprayConfig.poolSize;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const velocities = new Float32Array(count * 3);
  const secondsLeft = new Float32Array(count);
  const lifetimes = new Float32Array(count);
  const growths = new Float32Array(count);
  const brightnesses = new Float32Array(count);
  let next = 0;

  const shape = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions, 3);
  shape.setAttribute('position', positionAttribute);
  const sizeAttribute = new BufferAttribute(sizes, 1);
  shape.setAttribute('aSize', sizeAttribute);
  const alphaAttribute = new BufferAttribute(alphas, 1);
  shape.setAttribute('aAlpha', alphaAttribute);
  const uniforms = { uPx: { value: 600 }, uCol: { value: new Color(1, 1, 1) } };
  const points = new Points(
    shape,
    new ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      fog: false,
      vertexShader,
      fragmentShader,
    }),
  );
  // The shape's bounds are never measured again as the droplets fly, so three.js must not use them.
  points.frustumCulled = false;
  // After the water and the bubbles under it.
  points.renderOrder = 7;
  scene.add(points);

  function moveOne(i: number, dt: number, drag: number): void {
    secondsLeft[i] -= dt;
    const x = i * 3;
    const y = x + 1;
    const z = x + 2;
    velocities[y] -=
      (growths[i] > config.mistGrowsFasterThan ? config.mistFall : config.dropletFall) * dt;
    velocities[x] *= drag;
    velocities[y] *= drag;
    velocities[z] *= drag;
    positions[x] += velocities[x] * dt;
    positions[y] += velocities[y] * dt;
    positions[z] += velocities[z] * dt;
    sizes[i] += growths[i] * dt;
    const lifeLeft = secondsLeft[i] / lifetimes[i];
    alphas[i] =
      secondsLeft[i] > 0
        ? Math.min(1, (1 - lifeLeft) * config.fadeInSpeed) * lifeLeft * brightnesses[i]
        : 0;
  }

  return {
    launch(x, y, z, vx, vy, vz, seconds, size, growth, brightness) {
      const i = next;
      next = (next + 1) % count;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      velocities[i * 3] = vx;
      velocities[i * 3 + 1] = vy;
      velocities[i * 3 + 2] = vz;
      secondsLeft[i] = seconds;
      lifetimes[i] = seconds;
      sizes[i] = size;
      growths[i] = growth;
      brightnesses[i] = brightness;
    },

    move(dt) {
      const drag = 1 - config.drag * dt;
      for (let i = 0; i < count; i++) {
        if (secondsLeft[i] > 0) moveOne(i, dt, drag);
      }
      positionAttribute.needsUpdate = true;
      sizeAttribute.needsUpdate = true;
      alphaAttribute.needsUpdate = true;
    },

    show(focalLength, daylight, night) {
      uniforms.uPx.value = focalLength;
      // White by day, warmer with the sun low, and dim at night.
      const dimmed = 1 - 0.75 * night;
      uniforms.uCol.value.setRGB(
        dimmed,
        (0.8 + 0.2 * daylight) * dimmed,
        (0.75 + 0.25 * daylight) * dimmed,
      );
    },
  };
}
