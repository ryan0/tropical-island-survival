import {
  hgt,
  alongReef,
  islandR,
  landW,
  offshoreOfReef,
  openSea,
  openSeaAt,
  passGap,
  sandbankX,
  sandbankZ,
  shoreH,
} from 'virtual:island-shape';
import type { GroundHeight, IslandRadius, Point } from './landmarks';

/**
 * The shape of the island as the program sees it. It is written once, in island-shape/*.glsl,
 * for the shaders; the build turns the same formulas into these functions.
 * A direction is the angle from the atoll's centre: 0 east, a quarter turn south.
 */
export interface IslandShape {
  groundHeight: GroundHeight;
  radius: IslandRadius;
  /**
   * The reef's zones lie at the same distances along the reef all round the atoll, though the reef
   * is narrower round the north: a distance off the ocean beach in a direction as the distance
   * along the reef, and back.
   */
  alongReef: (offshore: number, direction: number) => number;
  offshoreOfReef: (along: number, direction: number) => number;
  /** How wide the ring of land is. */
  landWidth: (direction: number) => number;
  /** How much of the pass through the reef lies in a direction: 0 where there is none. */
  passGap: (direction: number) => number;
  /**
   * How open a direction is to the swell at the beach: 1 everywhere but at the inlet through the
   * sandbar; and the same a distance off the beach, where the swell soon runs again.
   */
  openSea: (direction: number) => number;
  openSeaAt: (direction: number, offshore: number) => number;
  /** The ground's height as the waves feel it: the island's shape without what stands in the lagoon. */
  shoreHeight: (x: number, z: number) => number;
  /** The middle of the sandbank in the lagoon. */
  sandbank: Point;
}

export function createIslandShape(): IslandShape {
  return {
    groundHeight: hgt,
    radius: islandR,
    alongReef,
    offshoreOfReef,
    landWidth: landW,
    passGap,
    openSea,
    openSeaAt,
    shoreHeight: shoreH,
    sandbank: { x: sandbankX(), z: sandbankZ() },
  };
}
