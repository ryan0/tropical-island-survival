import { layerEdgeWander, soilPatches, turfDryness, turfLushness } from 'virtual:ground-patterns';

// The patterns of the turf as the ground draws them, for the grass to follow. They are written
// once, in ground-patterns/*.glsl, for the terrain's shader; the build turns the same formulas
// into these functions.
export { layerEdgeWander, soilPatches, turfDryness, turfLushness };

/**
 * The turf's colours: yellow-green where it is thin, greener where it is lush, straw where it has
 * dried out. terrain.ts writes them into the terrain's shader.
 */
export const turfColours = {
  thin: [0.46, 0.49, 0.31],
  lush: [0.36, 0.43, 0.26],
  dry: [0.6, 0.56, 0.39],
} as const;
