import type { RandomStreams } from '../../core/random';
import type { GroundTile } from './ground-tile';
import { createGravelTile } from './gravel-tile';
import { createLitterTile } from './litter-tile';
import { createLowPlantsTile } from './low-plants-tile';

// Pictures of what lies on the island's ground, each seen from straight above and painted once at
// start-up: the ground's colouring lays them over the sand where its patterns and the map of the
// trees say each belongs (terrain-colour.glsl). In each, alpha is a rank: the colouring shows a
// thing only where its rank is above a threshold, so that one picture serves for a few stones on
// clean sand and for a bank of rubble.

export interface GroundTiles {
  /** Coral gravel and rubble. */
  gravel: GroundTile;
  /** Dead leaflets, dry leaves, twigs and husk. */
  litter: GroundTile;
  /** Creepers and seedlings. */
  lowPlants: GroundTile;
}

/** `maxAnisotropy` is the most anisotropic filtering the graphics card offers. */
export function createGroundTiles(randomStream: RandomStreams, maxAnisotropy: number): GroundTiles {
  const tiles = {
    gravel: createGravelTile(randomStream('gravel tile')),
    litter: createLitterTile(randomStream('litter tile')),
    lowPlants: createLowPlantsTile(randomStream('low plants tile')),
  };
  // The ground is seen at a low angle, where plain filtering would blur these to nothing a few steps off.
  for (const tile of Object.values(tiles)) tile.texture.anisotropy = Math.min(4, maxAnisotropy);
  return tiles;
}
