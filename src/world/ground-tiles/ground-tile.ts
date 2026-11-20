import type { Texture } from 'three';

/** A picture of one material lying on the ground, seen from straight above, that repeats in both directions. */
export interface GroundTile {
  texture: Texture;
  /** How many metres of ground one repeat of the picture covers. */
  span: number;
  /** The average colour of the dots that hold a thing (alpha above nothing), red, green, blue from 0 to 1. */
  averageColour: readonly [number, number, number];
}
