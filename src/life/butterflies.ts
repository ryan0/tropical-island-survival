import {
  Color,
  DoubleSide,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Scene,
} from 'three';
import { within, type Random } from '../core/random';
import { addInstances, coloursAreSet, whiteMaterial } from './instances';
import { lifeConfig } from './life-config';
import {
  ANY_DIRECTION,
  mustFindPlace,
  squareAround,
  type GroundHeight,
  type Point,
} from './placing';
import { shapeFrom } from './shapes';

export interface ButterfliesDependencies {
  scene: Scene;
  random: Random;
  groundHeight: GroundHeight;
  /** The middle of the home islet. */
  home: Point;
}

export interface Butterflies {
  /** `daylight` is 0 at night and 1 in full day. */
  update(time: number, daylight: number): void;
}

interface Butterfly {
  /** The spot it wanders about. */
  x: number;
  z: number;
  phase: number;
  /** Its own multiple of the pace it wanders at. */
  paceVariation: number;
  climb: number;
  wingPace: number;
}

const config = lifeConfig.butterflies;
// A butterfly is drawn pointing at where it will be this much later.
const SECONDS_AHEAD = 0.1;

function wingShape(side: 1 | -1): BufferGeometry {
  const corners = [
    [0.03, 0, 0.005 * side],
    [-0.025, 0, 0.005 * side],
    [0, 0, 0.09 * side],
    [-0.04, 0, 0.07 * side],
  ];
  return shapeFrom(corners.flat(), side > 0 ? [0, 2, 1, 1, 2, 3] : [0, 1, 2, 1, 3, 2]);
}

export function createButterflies(dependencies: ButterfliesDependencies): Butterflies {
  const { scene, random, groundHeight, home } = dependencies;
  const rightWings = addInstances(scene, wingShape(1), whiteMaterial(DoubleSide), config.count);
  const leftWings = addInstances(scene, wingShape(-1), whiteMaterial(DoubleSide), config.count);

  const butterflies: Butterfly[] = [];
  const colour = new Color();
  for (let i = 0; i < config.count; i++) {
    const place = mustFindPlace(
      'a butterfly',
      random,
      groundHeight,
      squareAround(home, config.reachFromHome),
      config.tries,
      (height) => height > config.lowestGround,
    );
    butterflies.push({
      x: place.x,
      z: place.z,
      phase: within(random, ANY_DIRECTION),
      paceVariation: within(random, config.paceVariation),
      climb: within(random, config.climb),
      wingPace: within(random, config.wingPace),
    });
    colour.setHex(config.colours[i % config.colours.length]);
    rightWings.setColorAt(i, colour);
    leftWings.setColorAt(i, colour);
  }
  coloursAreSet(rightWings);
  coloursAreSet(leftWings);

  const heading = new Euler();
  const facing = new Quaternion();
  const position = new Vector3();
  const fullSize = new Vector3(1, 1, 1);
  const bodyMatrix = new Matrix4();
  const wingBeat = new Matrix4();
  const wingMatrix = new Matrix4();
  const spot = { x: 0, z: 0 };

  function findSpot(butterfly: Butterfly, time: number): void {
    const { x, z, phase, paceVariation } = butterfly;
    spot.x =
      x +
      3 * Math.sin(0.31 * time * paceVariation + phase) +
      1.5 * Math.sin(0.77 * time + phase * 2);
    spot.z =
      z + 3 * Math.cos(0.23 * time * paceVariation + phase) + 1.5 * Math.cos(0.6 * time + phase);
  }

  return {
    update(time, daylight) {
      for (let i = 0; i < butterflies.length; i++) {
        const butterfly = butterflies[i];
        const { phase } = butterfly;
        findSpot(butterfly, time);
        const x = spot.x;
        const z = spot.z;
        findSpot(butterfly, time + SECONDS_AHEAD);
        const yaw = Math.atan2(-(spot.z - z), spot.x - x);
        const y =
          groundHeight(x, z) +
          config.lowestFlight +
          butterfly.climb * (0.5 + 0.5 * Math.sin(0.4 * time + phase)) +
          0.15 * Math.sin(5 * time + phase);

        facing.setFromEuler(heading.set(0, yaw, 0));
        bodyMatrix.compose(position.set(x, y, z), facing, fullSize);
        const wingAngle = 0.4 + 0.9 * Math.sin(time * butterfly.wingPace + phase);
        wingMatrix.multiplyMatrices(bodyMatrix, wingBeat.makeRotationX(-wingAngle));
        rightWings.setMatrixAt(i, wingMatrix);
        wingMatrix.multiplyMatrices(bodyMatrix, wingBeat.makeRotationX(wingAngle));
        leftWings.setMatrixAt(i, wingMatrix);
      }
      rightWings.instanceMatrix.needsUpdate = true;
      leftWings.instanceMatrix.needsUpdate = true;

      const areOut = daylight >= config.outAboveDaylight;
      rightWings.visible = areOut;
      leftWings.visible = areOut;
    },
  };
}
