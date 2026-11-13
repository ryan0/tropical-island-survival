import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Points,
  PointsMaterial,
  type Scene,
} from 'three';
import { within, type Random, type Range } from '../core/random';
import { lifeConfig } from './life-config';
import {
  ANY_DIRECTION,
  mustFindPlace,
  squareAround,
  type GroundHeight,
  type Point,
} from './placing';

export interface FirefliesDependencies {
  scene: Scene;
  random: Random;
  groundHeight: GroundHeight;
  /** The middle of the home islet. */
  home: Point;
  hut: Point;
}

export interface Fireflies {
  /** `night` is 0 by day and 1 at night. */
  update(time: number, night: number): void;
}

const config = lifeConfig.fireflies;

/** A soft dot: pale yellow at the middle, green round it, fading to nothing at the edge. */
function glowPicture(): HTMLCanvasElement {
  const SIZE = 64;
  const MIDDLE = SIZE / 2;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('the browser gave no canvas to draw the fireflies on');

  const glow = context.createRadialGradient(MIDDLE, MIDDLE, 0, MIDDLE, MIDDLE, MIDDLE);
  glow.addColorStop(0, 'rgba(255,255,210,1)');
  glow.addColorStop(0.35, 'rgba(210,255,110,0.55)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, SIZE, SIZE);
  return canvas;
}

export function createFireflies(dependencies: FirefliesDependencies): Fireflies {
  const { scene, random, groundHeight, home, hut } = dependencies;
  // x, y, z for each firefly: the spot it hovers about, where it is in each of its three
  // sways, and where it is drawn.
  const homes = new Float32Array(config.count * 3);
  const phases = new Float32Array(config.count * 3);
  const positions = new Float32Array(config.count * 3);
  const shape = new BufferGeometry();
  const nearTheHut: Range = [-config.reachFromHut, config.reachFromHut];

  for (let i = 0; i < config.count; i++) {
    let x: number;
    let z: number;
    if (i < config.roundTheHut) {
      x = hut.x + within(random, nearTheHut);
      z = hut.z + within(random, nearTheHut);
    } else {
      ({ x, z } = mustFindPlace(
        'a firefly',
        random,
        groundHeight,
        squareAround(home, config.reachFromHome),
        config.tries,
        (height) => height > config.lowestGround,
      ));
    }
    homes[i * 3] = x;
    homes[i * 3 + 1] = groundHeight(x, z) + within(random, config.heightAboveGround);
    homes[i * 3 + 2] = z;
    phases[i * 3] = within(random, ANY_DIRECTION);
    phases[i * 3 + 1] = within(random, ANY_DIRECTION);
    phases[i * 3 + 2] = within(random, ANY_DIRECTION);
  }

  const positionAttribute = new BufferAttribute(positions, 3);
  shape.setAttribute('position', positionAttribute);
  const material = new PointsMaterial({
    size: config.size,
    sizeAttenuation: true,
    map: new CanvasTexture(glowPicture()),
    color: config.colour,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    opacity: 0,
  });
  const points = new Points(shape, material);
  // The shape's own bounds are all zeros until the first night, so three.js would hide it.
  points.frustumCulled = false;
  scene.add(points);

  return {
    update(time, night) {
      material.opacity = night;
      points.visible = night > config.outAboveNight;
      if (!points.visible) return;

      for (let i = 0; i < config.count; i++) {
        const x = i * 3;
        const y = x + 1;
        const z = x + 2;
        positions[x] = homes[x] + 1.0 * Math.sin(0.5 * time + phases[x]);
        positions[y] = homes[y] + 0.4 * Math.sin(0.7 * time + phases[y]);
        positions[z] = homes[z] + 1.0 * Math.cos(0.4 * time + phases[z]);
      }
      positionAttribute.needsUpdate = true;
    },
  };
}
