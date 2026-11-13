import { smoothstep } from '../core/maths';
import type { Random } from '../core/random';
import { worldConfig } from './world-config';

export interface Point {
  x: number;
  z: number;
}

/** Height of the ground at a point; below zero it is under the sea. */
export type GroundHeight = (x: number, z: number) => number;
/** Distance from the atoll's centre to the outer shoreline, in a direction. */
export type IslandRadius = (direction: number) => number;

export interface Landmarks {
  /** Roughly the middle of the home islet. */
  home: Point;
  /** Where the ocean beach in front of home is. */
  homeShoreZ: number;
  hut: Point;
  /** The campfire. */
  fire: Point;
  pier: {
    x: number;
    /** Where it leaves the beach. */
    z0: number;
    length: number;
  };
  /** The footpaths, as stretches from one point to another: beach - fork - hut, fork - lagoon beach. */
  paths: readonly (readonly [from: Point, to: Point])[];
  /** The ocean shoreline of the southern side: coming in from the sea along `x`, the first z where the ground reaches `height`. */
  shoreZ(x: number, height: number): number;
  /** How far a point is from the nearest footpath. */
  pathDistance(x: number, z: number): number;
  /** 1 on and around the home islet, falling to 0.2 on the far side of the atoll. */
  nearHome(x: number, z: number): number;
  /** A random point on or near the ring of land, roughly evenly by area, for scattering things. */
  ringPoint(random: Random): Point;
}

const config = worldConfig.landmarks;
// The shorelines are searched for in steps this long.
const STEP = 0.25;

export function createLandmarks(groundHeight: GroundHeight, islandRadius: IslandRadius): Landmarks {
  function shoreZ(x: number, height: number): number {
    for (let z = 330; z > 60; z -= STEP) if (groundHeight(x, z) >= height) return z;
    return 150;
  }

  const homeShoreZ = shoreZ(config.homeX, config.beachHeight);
  const home: Point = { x: config.homeX, z: homeShoreZ - config.homeInland };
  const hut: Point = {
    x: config.hutX,
    z: shoreZ(config.hutX, config.beachHeight) - config.hutInland,
  };

  /** The lagoon shoreline of the home islet: walking north from its middle along `x`, the first z where the ground is below `height`. */
  function lagoonZ(x: number, height: number): number {
    for (let z = home.z; z > 20; z -= STEP) if (groundHeight(x, z) < height) return z;
    return home.z - 30;
  }

  const beach: Point = { x: 0, z: homeShoreZ - 2 };
  const fork: Point = { x: -7, z: hut.z + 12 };
  const hutDoor: Point = { x: -16, z: hut.z + 5.5 };
  const towardsLagoon: Point = { x: -2, z: hut.z - 6 };
  const lagoonBeach: Point = { x: 4, z: lagoonZ(4, config.lagoonPathEndsAt) };
  const paths = [
    [beach, fork],
    [fork, hutDoor],
    [fork, towardsLagoon],
    [towardsLagoon, lagoonBeach],
  ] as const;

  return {
    home,
    homeShoreZ,
    hut,
    fire: {
      x: config.fireX,
      z: shoreZ(config.fireX, config.beachHeight) - config.fireInland,
    },
    pier: {
      x: config.pierX,
      z0: shoreZ(config.pierX, config.pierBeachHeight) - config.pierBehindBeach,
      length: config.pierLength,
    },
    paths,
    shoreZ,

    pathDistance(x, z) {
      let nearest = 1e9;
      for (const [from, to] of paths) {
        const fromX = x - from.x;
        const fromZ = z - from.z;
        const alongX = to.x - from.x;
        const alongZ = to.z - from.z;
        const share = Math.max(
          0,
          Math.min(1, (fromX * alongX + fromZ * alongZ) / (alongX * alongX + alongZ * alongZ)),
        );
        const distance = Math.hypot(fromX - alongX * share, fromZ - alongZ * share);
        if (distance < nearest) nearest = distance;
      }
      return nearest;
    },

    nearHome(x, z) {
      const fromHome = Math.hypot(x - home.x, z - home.z);
      return (
        1 -
        (1 - config.shareFarFromHome) *
          smoothstep(config.nearHomeWithin, config.farFromHomeBeyond, fromHome)
      );
    },

    ringPoint(random) {
      const direction = random() * 6.2831853;
      const outer = islandRadius(direction) + 4;
      const inner = outer - 82;
      const distance = Math.sqrt(inner * inner + random() * (outer * outer - inner * inner));
      return { x: Math.cos(direction) * distance, z: Math.sin(direction) * distance };
    },
  };
}
