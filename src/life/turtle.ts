import {
  ConeGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
  type Scene,
} from 'three';
import { FULL_TURN, mix } from '../core/maths';
import type { GroundHeight } from '../world/landmarks';
import { merged, placed } from '../world/simple-shapes';
import { lifeConfig } from './life-config';

export interface TurtleDependencies {
  scene: Scene;
  groundHeight: GroundHeight;
}

export interface Turtle {
  update(time: number, waterLevel: number): void;
}

const config = lifeConfig.turtle;
const RING_POINTS = 64;

/** How far from the atoll's centre the turtle's ring lies, in each of RING_POINTS directions. */
function measureRing(groundHeight: GroundHeight): number[] {
  const ring: number[] = [];
  for (let i = 0; i < RING_POINTS; i++) {
    const direction = (i / RING_POINTS) * FULL_TURN;
    let distance: number = config.ringFrom;
    while (
      distance < config.ringTo &&
      groundHeight(Math.cos(direction) * distance, Math.sin(direction) * distance) >
        config.ringGround
    ) {
      distance += 0.5;
    }
    ring.push(distance);
  }
  return ring;
}

export function createTurtle({ scene, groundHeight }: TurtleDependencies): Turtle {
  const shellMaterial = new MeshLambertMaterial({ color: config.shell });
  const flipperMaterial = new MeshLambertMaterial({ color: config.flippers, side: DoubleSide });
  const turtle = new Group();
  scene.add(turtle);

  // The head points along +x.
  const shell = placed(new SphereGeometry(0.5, 12, 8), [0, 0, 0], [1.05, 0.38, 0.9]);
  const head = placed(new SphereGeometry(0.1, 8, 6), [0.62, 0.02, 0], [1.3, 0.9, 0.9]);
  const tail = placed(new ConeGeometry(0.04, 0.2, 5), [-0.58, -0.02, 0], undefined, [
    0,
    0,
    FULL_TURN / 4,
  ]);
  turtle.add(new Mesh(merged([shell, head, tail]), shellMaterial));

  function addFlipper(x: number, z: number, length: number, width: number, side: 1 | -1): Mesh {
    const shape = new SphereGeometry(1, 8, 5);
    shape.scale(width, 0.025, length);
    shape.translate(0, 0, side * length * 0.9);
    const flipper = new Mesh(shape, flipperMaterial);
    flipper.position.set(x, -0.05, z);
    turtle.add(flipper);
    return flipper;
  }
  const frontRight = addFlipper(0.25, 0.3, 0.32, 0.1, 1);
  const frontLeft = addFlipper(0.25, -0.3, 0.32, 0.1, -1);
  const backRight = addFlipper(-0.3, 0.2, 0.15, 0.06, 1);
  const backLeft = addFlipper(-0.3, -0.2, 0.15, 0.06, -1);

  const ring = measureRing(groundHeight);

  function ringDistance(direction: number): number {
    const along = ((((direction / FULL_TURN) % 1) + 1) % 1) * RING_POINTS;
    const from = Math.floor(along);
    return mix(ring[from % RING_POINTS], ring[(from + 1) % RING_POINTS], along - from);
  }
  function ringX(direction: number): number {
    return ringDistance(direction) * Math.cos(direction);
  }
  function ringZ(direction: number): number {
    return ringDistance(direction) * Math.sin(direction);
  }

  return {
    update(time, waterLevel) {
      const direction = time * config.pace + config.startsAt;
      const x = ringX(direction);
      const z = ringZ(direction);
      const aheadX = ringX(direction + 0.01) - x;
      const aheadZ = ringZ(direction + 0.01) - z;
      turtle.position.set(x, waterLevel - config.depth + config.drift * Math.sin(time * 0.5), z);
      turtle.rotation.set(
        0.04 * Math.sin(time * 0.8),
        Math.atan2(-aheadZ, aheadX),
        0.05 * Math.sin(time * 0.8 + 1),
      );

      const frontStroke = 0.2 + 0.55 * Math.sin(time * 1.5);
      const backStroke = 0.15 + 0.3 * Math.sin(time * 1.5 + 1);
      frontRight.rotation.x = frontStroke;
      frontLeft.rotation.x = -frontStroke;
      backRight.rotation.x = backStroke;
      backLeft.rotation.x = -backStroke;
      frontRight.rotation.y = -0.3 * Math.cos(time * 1.5);
      frontLeft.rotation.y = 0.3 * Math.cos(time * 1.5);
    },
  };
}
