import {
  BoxGeometry,
  Color,
  DoubleSide,
  Euler,
  Quaternion,
  SphereGeometry,
  type BufferGeometry,
  type Scene,
} from 'three';
import { within, type Random } from '../core/random';
import { addInstances, coloursAreSet, createInstancePlacer, whiteMaterial } from './instances';
import { lifeConfig } from './life-config';
import {
  ANY_DIRECTION,
  mustFindPlace,
  squareAround,
  type GroundHeight,
  type Point,
} from './placing';
import { merged, placed } from './shapes';

export interface CrabsDependencies {
  scene: Scene;
  random: Random;
  groundHeight: GroundHeight;
  /** The middle of the home islet. */
  home: Point;
}

export interface Crabs {
  update(time: number, dt: number, player: Point): void;
}

interface Crab {
  x: number;
  z: number;
  /** The direction it last went, as a step of length one. */
  goingX: number;
  goingZ: number;
  isScuttling: boolean;
  /** Seconds until it next stops or starts. */
  secondsToChange: number;
}

const config = lifeConfig.crabs;
const SIDES = [-1, 1];
// A crab that cannot go the way it means to tries a little to each side, then further round.
const TURNS_TRIED = [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, 3.14];

// The claws point along +x.
function crabShape(): BufferGeometry {
  const shell = placed(new SphereGeometry(1, 8, 6), [0, 0, 0], [0.09, 0.05, 0.12]);
  const parts = [shell];

  for (let pair = 0; pair < 4; pair++) {
    for (const side of SIDES) {
      const leg = new BoxGeometry(0.012, 0.012, 0.1);
      parts.push(
        placed(leg, [-0.05 + pair * 0.035, -0.012, side * 0.15], undefined, [-side * 0.5, 0, 0]),
      );
    }
  }
  for (const side of SIDES) {
    const arm = new BoxGeometry(0.1, 0.014, 0.014);
    parts.push(placed(arm, [0.1, 0.01, side * 0.07], undefined, [0, side * 0.3, 0]));
    const claw = new SphereGeometry(0.04, 6, 4);
    parts.push(placed(claw, [0.17, 0.012, side * 0.1], [1, 0.45, 0.8]));
    const eye = new SphereGeometry(0.012, 4, 3);
    parts.push(placed(eye, [0.07, 0.045, side * 0.04]));
  }
  return merged(parts);
}

export function createCrabs({ scene, random, groundHeight, home }: CrabsDependencies): Crabs {
  const mesh = addInstances(scene, crabShape(), whiteMaterial(DoubleSide), config.count);
  const [lowestStart, highestStart] = config.startingGround;
  const [lowestWalkable, highestWalkable] = config.walkableGround;
  const fleeWithinSquared = config.fleeWithin * config.fleeWithin;

  const crabs: Crab[] = [];
  const colour = new Color();
  for (let i = 0; i < config.count; i++) {
    const place = mustFindPlace(
      'a crab',
      random,
      groundHeight,
      squareAround(home, config.reachFromHome),
      config.startingTries,
      (height) => height > lowestStart && height < highestStart,
    );
    crabs.push({
      x: place.x,
      z: place.z,
      goingX: 1,
      goingZ: 0,
      isScuttling: false,
      secondsToChange: within(random, config.firstRestSeconds),
    });
    colour.setHSL(
      within(random, config.hue),
      within(random, config.saturation),
      within(random, config.lightness),
    );
    mesh.setColorAt(i, colour);
  }
  coloursAreSet(mesh);

  const placeInstance = createInstancePlacer();
  const heading = new Euler();
  const facing = new Quaternion();

  return {
    update(time, dt, player) {
      for (let i = 0; i < crabs.length; i++) {
        const crab = crabs[i];
        const fromPlayerX = crab.x - player.x;
        const fromPlayerZ = crab.z - player.z;
        const distanceSquared = fromPlayerX * fromPlayerX + fromPlayerZ * fromPlayerZ;
        const isFleeing = distanceSquared < fleeWithinSquared;
        let speed = 0;
        let direction = Math.atan2(crab.goingZ, crab.goingX);

        if (isFleeing) {
          const distance = Math.sqrt(distanceSquared) + 1e-4;
          direction = Math.atan2(fromPlayerZ / distance, fromPlayerX / distance);
          speed = config.fleeSpeed;
          crab.isScuttling = true;
        } else {
          crab.secondsToChange -= dt;
          if (crab.secondsToChange < 0) {
            crab.isScuttling = !crab.isScuttling;
            crab.secondsToChange = crab.isScuttling
              ? within(random, config.scuttleSeconds)
              : within(random, config.restSeconds);
            if (crab.isScuttling) direction = within(random, ANY_DIRECTION);
          }
          if (crab.isScuttling) speed = config.scuttleSpeed;
        }

        if (speed > 0) {
          for (let k = 0; k < TURNS_TRIED.length; k++) {
            const tried = direction + TURNS_TRIED[k];
            const x = crab.x + Math.cos(tried) * speed * dt;
            const z = crab.z + Math.sin(tried) * speed * dt;
            const ground = groundHeight(x, z);
            if (ground > lowestWalkable && ground < highestWalkable) {
              crab.x = x;
              crab.z = z;
              crab.goingX = Math.cos(tried);
              crab.goingZ = Math.sin(tried);
              break;
            }
            // Only a crab running from the player looks for a way round.
            if (k === 0 && !isFleeing) {
              crab.secondsToChange = within(random, config.restWhenBlockedSeconds);
              crab.isScuttling = false;
              break;
            }
          }
        }

        const bob = speed > 0 ? config.bob * Math.sin(time * 40 + i) : 0;
        const y = groundHeight(crab.x, crab.z) + config.standsAt + bob;
        heading.set(0, Math.atan2(crab.goingX, crab.goingZ), 0);
        facing.setFromEuler(heading);
        placeInstance(mesh, i, crab.x, y, crab.z, facing, 1, 1, 1);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
