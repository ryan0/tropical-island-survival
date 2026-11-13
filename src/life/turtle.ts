import {
  ConeGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
  type Scene,
} from 'three';
import { within, type Random } from '../core/random';
import { lifeConfig } from './life-config';
import type { GroundHeight, Point } from './placing';
import { merged, placed } from './shapes';

export interface TurtleDependencies {
  scene: Scene;
  random: Random;
  groundHeight: GroundHeight;
  /** The middle of the home islet. */
  home: Point;
}

export interface Turtle {
  update(time: number, waterLevel: number): void;
}

const config = lifeConfig.turtle;
// A full turn as build 78 wrote it for the turtle's ring; see ANY_DIRECTION in placing.ts.
const FULL_TURN = 6.283185;
const RING_POINTS = 64;

// Build 78 once looked for a patch of water for the turtle to circle, and later sent it round
// the lagoon instead. Nothing uses what the search finds, but it draws from the random stream,
// and where every shell, flower, butterfly and firefly lies depends on how many numbers it
// drew. So the search is still made. Dropping it is a change that can be seen.
function drawTheNumbersOfTheOldSearch(
  random: Random,
  groundHeight: GroundHeight,
  home: Point,
): void {
  const RADIUS = 9;
  const POINTS_TRIED = 24;
  for (let attempt = 0; attempt < 400; attempt++) {
    const x = home.x + within(random, [-40, 40]);
    const z = home.z + within(random, [-75, 30]);
    let isAllWater = true;
    for (let i = 0; i < POINTS_TRIED && isAllWater; i++) {
      const angle = (i / POINTS_TRIED) * 6.283;
      const ground = groundHeight(x + RADIUS * Math.cos(angle), z + RADIUS * 0.6 * Math.sin(angle));
      isAllWater = ground <= -2 && ground >= -4.2;
    }
    if (isAllWater) return;
  }
}

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

export function createTurtle(dependencies: TurtleDependencies): Turtle {
  const { scene, random, groundHeight, home } = dependencies;
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
    Math.PI / 2,
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

  drawTheNumbersOfTheOldSearch(random, groundHeight, home);
  const ring = measureRing(groundHeight);

  function ringDistance(direction: number): number {
    const along = ((((direction / FULL_TURN) % 1) + 1) % 1) * RING_POINTS;
    const from = Math.floor(along);
    const share = along - from;
    return ring[from % RING_POINTS] * (1 - share) + ring[(from + 1) % RING_POINTS] * share;
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
