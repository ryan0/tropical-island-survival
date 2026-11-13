import {
  Color,
  ConeGeometry,
  DoubleSide,
  Euler,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Scene,
} from 'three';
import { clamp } from '../core/maths';
import { within, type Random } from '../core/random';
import { addInstances, coloursAreSet, whiteMaterial } from './instances';
import { lifeConfig } from './life-config';
import { ANY_DIRECTION, type Point } from './placing';
import { merged, placed, shapeFrom, spindle, triangle } from './shapes';

export interface GullsDependencies {
  scene: Scene;
  random: Random;
  /** The middle of the home islet. */
  home: Point;
}

export interface Gulls {
  update(time: number, dt: number): void;
}

interface Gull {
  centreX: number;
  centreZ: number;
  reachX: number;
  reachZ: number;
  /** Radians a second round its figure of eight; the sign is which way round. */
  pace: number;
  phase: number;
  height: number;
  wingPace: number;
  /** Which way it faced a frame ago: how fast that changes is how hard it is turning. */
  lastYaw: number | null;
  bank: number;
}

const config = lifeConfig.gulls;

// The models' noses point along +x.
function bodyShape(): BufferGeometry {
  const body = spindle(0.55, 0.07, 0.07, 6, 6);
  const head = placed(new SphereGeometry(0.05, 6, 5), [0.3, 0.03, 0]);
  const beak = placed(new ConeGeometry(0.015, 0.07, 4), [0.38, 0.025, 0], undefined, [
    0,
    0,
    -Math.PI / 2,
  ]);
  const tail = placed(triangle([0, 0, 0.07], [0, 0, -0.07], [-0.2, 0, 0]), [-0.25, 0.01, 0]);
  return merged([body, head, beak, tail]);
}

function wingShape(side: 1 | -1): BufferGeometry {
  const corners = [
    [0.06, 0, 0],
    [-0.08, 0, 0],
    [0.0, 0, side * 0.3],
    [-0.12, 0, side * 0.32],
    [-0.02, 0, side * 0.62],
    [-0.1, 0, side * 0.6],
  ];
  return shapeFrom(corners.flat(), [0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5]).translate(0, 0.02, 0);
}

export function createGulls({ scene, random, home }: GullsDependencies): Gulls {
  const bodies = addInstances(scene, bodyShape(), whiteMaterial(DoubleSide), config.count);
  const rightWings = addInstances(scene, wingShape(1), whiteMaterial(DoubleSide), config.count);
  const leftWings = addInstances(scene, wingShape(-1), whiteMaterial(DoubleSide), config.count);

  const gulls: Gull[] = [];
  const colour = new Color();
  for (let i = 0; i < config.count; i++) {
    gulls.push({
      centreX: home.x + within(random, config.centreX),
      centreZ: home.z + within(random, config.centreZ),
      reachX: within(random, config.reachX),
      reachZ: within(random, config.reachZ),
      pace: within(random, config.pace) * (i % 2 === 1 ? 1 : -1),
      phase: within(random, ANY_DIRECTION),
      height: within(random, config.height),
      wingPace: within(random, config.wingPace),
      lastYaw: null,
      bank: 0,
    });
    const whiteness = within(random, config.whiteness);
    colour.setRGB(whiteness, whiteness, whiteness * 0.98);
    bodies.setColorAt(i, colour);
    rightWings.setColorAt(i, colour);
    leftWings.setColorAt(i, colour);
  }
  coloursAreSet(bodies);
  coloursAreSet(rightWings);
  coloursAreSet(leftWings);

  const tilt = new Euler();
  const facing = new Quaternion();
  const position = new Vector3();
  const fullSize = new Vector3(1, 1, 1);
  const bodyMatrix = new Matrix4();
  const wingBeat = new Matrix4();
  const wingMatrix = new Matrix4();

  return {
    update(time, dt) {
      for (let i = 0; i < gulls.length; i++) {
        const gull = gulls[i];
        const angle = gull.pace * time + gull.phase;
        const x = gull.centreX + gull.reachX * Math.cos(angle);
        const z = gull.centreZ + gull.reachZ * 0.6 * Math.sin(2 * angle);
        const y = gull.height + config.drift * Math.sin(0.3 * time + gull.phase);
        // which way it is going: how x and z above change with time
        const dx = -gull.reachX * Math.sin(angle) * gull.pace;
        const dz = gull.reachZ * 1.2 * Math.cos(2 * angle) * gull.pace;
        const yaw = Math.atan2(-dz, dx);

        let turned = gull.lastYaw === null ? 0 : yaw - gull.lastYaw;
        if (turned > Math.PI) turned -= 2 * Math.PI;
        if (turned < -Math.PI) turned += 2 * Math.PI;
        gull.lastYaw = yaw;
        const bankForThisTurn = clamp(
          (-turned / Math.max(dt, 0.001)) * 2,
          -config.steepestBank,
          config.steepestBank,
        );
        gull.bank += (bankForThisTurn - gull.bank) * Math.min(1, dt * 3);

        facing.setFromEuler(tilt.set(gull.bank, yaw, 0, 'YXZ'));
        bodyMatrix.compose(position.set(x, y, z), facing, fullSize);
        bodies.setMatrixAt(i, bodyMatrix);

        // It glides with its wings nearly still, and now and then beats them hard for a while.
        const beatDepth = 0.1 + 0.45 * clamp(Math.sin(time * 0.25 + gull.phase * 3) * 2, 0, 1);
        const wingAngle = 0.15 + beatDepth * Math.sin(time * gull.wingPace + gull.phase);
        wingMatrix.multiplyMatrices(bodyMatrix, wingBeat.makeRotationX(-wingAngle));
        rightWings.setMatrixAt(i, wingMatrix);
        wingMatrix.multiplyMatrices(bodyMatrix, wingBeat.makeRotationX(wingAngle));
        leftWings.setMatrixAt(i, wingMatrix);
      }
      bodies.instanceMatrix.needsUpdate = true;
      rightWings.instanceMatrix.needsUpdate = true;
      leftWings.instanceMatrix.needsUpdate = true;
    },
  };
}
