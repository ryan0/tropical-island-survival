// Distances are metres. A pair is a range: lowest, highest. Ground heights are measured from
// still sea level; a flower's size is a multiple of its model's.

export const flowersConfig = {
  count: 350,
  /** They grow on high ground within this far of the middle of home, clear of rocks and paths. */
  lowestGround: 1.9,
  reachFromHome: 60,
  clearOfRocks: 0.1,
  clearOfPaths: 1.5,
  triesEach: 800,
  size: [0.7, 1.4],
  stemHeight: 0.2,
  stem: 0x3f7a2c,
  blooms: [0xff7fb0, 0xffffff, 0xffe14a, 0xe02a2a],
} as const;
