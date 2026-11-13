import {
  Color,
  DoubleSide,
  Euler,
  MeshLambertMaterial,
  Quaternion,
  type BufferGeometry,
  type Scene,
} from 'three';
import { smoothstep } from '../core/maths';
import { within, type Random } from '../core/random';
import { addInstances, coloursAreSet, createInstancePlacer } from './instances';
import { lifeConfig } from './life-config';
import {
  ANY_DIRECTION,
  findPlace,
  mustFindPlace,
  squareAround,
  type GroundHeight,
  type Place,
  type Point,
} from './placing';

/**
 * Builds the fish model that the reef's fish share: nose towards +x, one unit long. `bodyDepth`
 * is how tall the body is for its length; `paint` gives the brightness of each point of it, and
 * is told whether the point is on the body (0), the tail (1) or a fin (2).
 */
export type FishModel = (
  bodyDepth: number,
  paint: (x: number, y: number, part: number) => number,
) => BufferGeometry;

export interface Pier {
  x: number;
  /** Where it leaves the shore. */
  z0: number;
  length: number;
}

export interface FishDependencies {
  scene: Scene;
  random: Random;
  groundHeight: GroundHeight;
  /** The middle of the home islet. */
  home: Point;
  pier: Pier;
  fishModel: FishModel;
}

export interface Fish {
  update(time: number): void;
}

/** A school's middle travels a loop round a spot; its fish circle the middle. */
interface School {
  x: number;
  z: number;
  reachX: number;
  reachZ: number;
  paceX: number;
  paceZ: number;
  phaseX: number;
  phaseZ: number;
  /** Fish turn back towards the school's spot over ground lower than this. */
  deepestGround: number;
}

interface OneFish {
  school: School;
  phase: number;
  /** How far from the middle of the school it circles. */
  circle: number;
  /** Radians a second round that circle; the sign is which way round. */
  pace: number;
  /** Its own multiple of that pace. */
  paceVariation: number;
  length: number;
}

const config = lifeConfig.fish;
// A fish is drawn pointing at where it will be this much later.
const SECONDS_AHEAD = 0.2;
// How much of its distance from the school's spot a fish keeps when it has strayed out of its
// depth, and the ground it is then taken to swim over if even that is too shallow.
const KEPT_WHEN_OUT_OF_DEPTH = 0.25;
const GROUND_IF_STILL_TOO_SHALLOW = -0.9;

// Greys, for each fish's own colour to tint: a darker back, a pale belly, a dark eye and a pale
// stripe along the side.
function paint(x: number, y: number, part: number): number {
  if (part !== 0) return 0.9;
  if (Math.hypot(x - 0.36, y - 0.03) < 0.035) return 0.06;
  return (
    1.3 - 0.75 * smoothstep(-0.12, 0.12, y) + 0.35 * smoothstep(0.035, 0.0, Math.abs(y - 0.01))
  );
}

function isBetween(height: number, [lowest, highest]: readonly [number, number]): boolean {
  return height > lowest && height < highest;
}

export function createFish(dependencies: FishDependencies): Fish {
  const { scene, random, groundHeight, home, pier, fishModel } = dependencies;
  const { homeSchools, roamingParties, byThePier } = config;
  const fishCount =
    homeSchools.count * homeSchools.fishInEach + roamingParties.count * roamingParties.fishInEach;
  const mesh = addInstances(
    scene,
    fishModel(config.bodyDepth, paint),
    new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }),
    fishCount,
  );

  const placeByThePier = findPlace(
    random,
    groundHeight,
    {
      x: [pier.x - byThePier.toEachSide, pier.x + byThePier.toEachSide],
      z: [
        pier.z0 + pier.length * byThePier.fromShareOfLength,
        pier.z0 + pier.length + byThePier.pastTheEnd,
      ],
    },
    byThePier.tries,
    (height) => isBetween(height, byThePier.ground),
  );

  function placeToSettle(reachFromHome: number): Place {
    return mustFindPlace(
      'a school of fish',
      random,
      groundHeight,
      squareAround(home, reachFromHome),
      config.settlingTries,
      (height) => isBetween(height, config.settlingGround),
    );
  }

  function homeSchool(index: number): School {
    let place = placeByThePier;
    if (index > 0) place = placeToSettle(homeSchools.reachFromHome);
    if (place === null) throw new Error('nowhere found by the pier for a school of fish');

    return {
      x: place.x,
      z: place.z,
      reachX: homeSchools.wander,
      reachZ: homeSchools.wander,
      paceX: homeSchools.wanderPaceX,
      paceZ: homeSchools.wanderPaceZ,
      phaseX: index * 2,
      phaseZ: index,
      deepestGround: homeSchools.deepestGround,
    };
  }

  function loopStaysInWater(party: School): boolean {
    const POINTS_TRIED = 60;
    for (let i = 0; i < POINTS_TRIED; i++) {
      const height = groundHeight(
        party.x + party.reachX * Math.sin(i * 0.31 + party.phaseX),
        party.z + party.reachZ * Math.cos(i * 0.23 + party.phaseZ),
      );
      if (!isBetween(height, roamingParties.loopGround)) return false;
    }
    return true;
  }

  // The loop is as wide as stays in water all the way round. If none does, the narrowest stands.
  function roamingParty(): School {
    const place = placeToSettle(roamingParties.reachFromHome);
    const party: School = {
      x: place.x,
      z: place.z,
      reachX: 0,
      reachZ: 0,
      paceX: 0,
      paceZ: 0,
      phaseX: 0,
      phaseZ: 0,
      deepestGround: roamingParties.deepestGround,
    };
    for (
      let width: number = roamingParties.widestLoop;
      width > roamingParties.narrowestLoop;
      width *= roamingParties.narrowingStep
    ) {
      party.reachX = width * within(random, roamingParties.loopShare);
      party.reachZ = width * within(random, roamingParties.loopShare);
      party.paceX = within(random, roamingParties.speed) / Math.max(party.reachX, party.reachZ);
      party.paceZ = party.paceX * within(random, roamingParties.crossPaceShare);
      party.phaseX = within(random, ANY_DIRECTION);
      party.phaseZ = within(random, ANY_DIRECTION);
      if (loopStaysInWater(party)) break;
    }
    return party;
  }

  const fish: OneFish[] = [];
  const colour = new Color();
  const schoolCount = homeSchools.count + roamingParties.count;
  for (let index = 0; index < schoolCount; index++) {
    const roams = index >= homeSchools.count;
    const kind = roams ? roamingParties : homeSchools;
    const school = roams ? roamingParty() : homeSchool(index);

    for (let i = 0; i < kind.fishInEach; i++) {
      const isMainKind = random() < config.shareOfMainKind;
      const hue = config.hues[(isMainKind ? index : index + 1) % config.hues.length];
      colour.setHSL(hue + within(random, config.hueSpread), config.saturation, config.lightness);
      mesh.setColorAt(fish.length, colour);

      const phase = within(random, ANY_DIRECTION);
      const circle = within(random, kind.circle);
      const pace = within(random, config.circlingPace) * (random() < 0.5 ? 1 : -1);
      const length = within(random, config.length);
      const paceVariation = within(random, config.paceVariation);
      fish.push({ school, phase, circle, pace, paceVariation, length });
    }
  }
  coloursAreSet(mesh);

  const placeInstance = createInstancePlacer();
  const heading = new Euler();
  const facing = new Quaternion();
  const spot = { x: 0, z: 0 };

  function findSpot(one: OneFish, time: number): void {
    const { school } = one;
    const angle = one.pace * time * one.paceVariation + one.phase;
    const middleX = school.x + school.reachX * Math.sin(school.paceX * time + school.phaseX);
    const middleZ = school.z + school.reachZ * Math.cos(school.paceZ * time + school.phaseZ);
    spot.x = middleX + one.circle * Math.cos(angle) + 0.8 * Math.sin(2.3 * angle + one.phase);
    spot.z = middleZ + one.circle * Math.sin(angle * 0.8 + one.phase);
  }

  return {
    update(time) {
      for (let i = 0; i < fish.length; i++) {
        const one = fish[i];
        const { school } = one;
        findSpot(one, time);
        let x = spot.x;
        let z = spot.z;
        findSpot(one, time + SECONDS_AHEAD);
        let aheadX = spot.x;
        let aheadZ = spot.z;

        let ground = groundHeight(x, z);
        if (ground > config.shallowestGround || ground < school.deepestGround) {
          x = school.x + (x - school.x) * KEPT_WHEN_OUT_OF_DEPTH;
          z = school.z + (z - school.z) * KEPT_WHEN_OUT_OF_DEPTH;
          aheadX = school.x + (aheadX - school.x) * KEPT_WHEN_OUT_OF_DEPTH;
          aheadZ = school.z + (aheadZ - school.z) * KEPT_WHEN_OUT_OF_DEPTH;
          ground = groundHeight(x, z);
          if (ground > config.shallowestGround) ground = GROUND_IF_STILL_TOO_SHALLOW;
        }

        const lowest = ground + config.clearOfGround;
        const room = Math.max(0, config.belowSurface - lowest);
        const y = lowest + room * (0.5 + 0.4 * Math.sin(time * 0.7 + one.phase * 3));
        const wiggle = 0.14 * Math.sin(time * 9 + one.phase);
        heading.set(0, Math.atan2(-(aheadZ - z), aheadX - x) + wiggle, 0);
        facing.setFromEuler(heading);
        placeInstance(mesh, i, x, y, z, facing, one.length, one.length, one.length);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
