import type { IslandRadius } from '../world/landmarks';
import { seaConfig } from './sea-config';

// How far the sea's surface ever goes from its still level, at a place: for the picture of what is
// under the sea (under-water-picture.ts). What lies deeper than the surface ever goes is always
// behind the surface for an eye above the sea, and is drawn into that picture and nowhere else;
// what stands higher than it ever rises is never behind it, and is not drawn into the picture.

const config = seaConfig.underWaterPicture;
// The lagoon's flat water begins this far inside the island's outer shore (m): within it the land
// and the lagoon lie, and no swell.
const INSIDE_OUTER_SHORE = 5;

export interface SeaReach {
  /** How far under the still sea (m, more than nought) the surface never goes, at a place. */
  alwaysUnder: (x: number, z: number) => number;
  /** How far above the still sea (m) a thing must stand, at a place, for the sea never to reach it. */
  clearAbove: (x: number, z: number) => number;
}

export function createSeaReach(islandRadius: IslandRadius): SeaReach {
  const isWithinOuterShore = (x: number, z: number) =>
    Math.hypot(x, z) < islandRadius(Math.atan2(z, x)) - INSIDE_OUTER_SHORE;
  return {
    alwaysUnder: (x, z) =>
      isWithinOuterShore(x, z) ? config.alwaysUnderSea.inLagoon : config.alwaysUnderSea.elsewhere,
    clearAbove: (x, z) =>
      isWithinOuterShore(x, z)
        ? config.clearOfTheSea.withinOuterShore
        : config.clearOfTheSea.offshore,
  };
}
