/**
 * The shape of the island as the program sees it. It is written once, in island-shape/*.glsl,
 * for the shaders; the build turns the same formulas into these functions.
 * A direction is the angle from the atoll's centre: 0 east, a quarter turn south.
 */
export interface IslandShape {
  /** Height of the ground at a point; below zero it is under the sea. */
  groundHeight(x: number, z: number): number;
  /** Distance from the centre to the outer shoreline. */
  radius(direction: number): number;
  /** How wide the ring of land is. */
  landWidth(direction: number): number;
  /** How much of the pass through the reef lies in a direction: 0 where there is none. */
  passGap(direction: number): number;
  /** How open a direction is to the swell: 1 on the open sea's side, less in the lee. */
  openSea(direction: number): number;
  /** The ground's height as the waves feel it: the island's shape without what stands in the lagoon. */
  shoreHeight(x: number, z: number): number;
}
