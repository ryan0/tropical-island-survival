import type { Range } from '../../core/random';

type Rgb = readonly [red: number, green: number, blue: number];

/**
 * The litter under coconut palms and beach trees, painted once at start-up. Sizes are in metres
 * on the ground; colours are on the scale where the game's clean dry coral sand is (0.72, 0.715, 0.70),
 * measured from the reference photographs against sunlit sand or gravel in the same picture.
 * A rank runs from 0 (only in a deep mat) to 1 (lies alone on open sand); things are laid down in
 * the order of their ranks, and the ranks the picture finally carries are spread from that order
 * so that the ground covered falls evenly as the threshold rises.
 */
export const litterTileConfig = {
  // Dots a side: a power of two, so that it mipmaps.
  size: 1024,
  // Metres of ground one repeat covers: a dot is 2.9 mm.
  span: 3,

  colours: {
    // Dead coconut leaflets, measured on Majuro, Rangiroa and Midway: silver-grey, straw, grey-brown.
    leaflet: [
      [0.57, 0.555, 0.52],
      [0.56, 0.52, 0.44],
      [0.49, 0.46, 0.41],
      [0.44, 0.4, 0.34],
      [0.39, 0.35, 0.3],
    ] satisfies Rgb[],
    // The bare midribs of leaflets whose blades have rotted away: pale grey to grey-brown.
    rib: [
      [0.62, 0.6, 0.56],
      [0.55, 0.52, 0.47],
      [0.46, 0.42, 0.37],
    ] satisfies Rgb[],
    // Dry broad leaves of beach trees: tan to brown, some weathered grey, a few dark.
    broadLeaf: [
      [0.59, 0.53, 0.42],
      [0.52, 0.45, 0.36],
      [0.47, 0.4, 0.32],
      [0.54, 0.5, 0.45],
      [0.42, 0.36, 0.3],
    ] satisfies Rgb[],
    // Coconut husk: the fibre inside and the smooth grey-brown skin.
    huskFibre: [0.54, 0.47, 0.38] satisfies Rgb,
    huskSkin: [0.45, 0.42, 0.38] satisfies Rgb,
    // Twigs: grey-brown, some bleached.
    twig: [
      [0.46, 0.42, 0.37],
      [0.4, 0.36, 0.31],
      [0.62, 0.6, 0.56],
    ] satisfies Rgb[],
    // Bits of leaf stalk and frond midrib.
    stalk: [
      [0.58, 0.55, 0.49],
      [0.5, 0.46, 0.4],
    ] satisfies Rgb[],
    // The broken bits of a deep mat run a little darker than the whole things lying on it.
    bitShade: [0.78, 1] satisfies Range,
    // How far one thing's colour strays from its kind's, as a share of it.
    lightnessSpread: 0.08,
    // The colour a dot holds before anything covers it; only soft edges show it.
    background: [0.5, 0.46, 0.39] satisfies Rgb,
  },

  // How dark the contact shadow is where a thing lies on another, and how far it reaches, in dots:
  // a thin thing lies closer to what is under it.
  contactShadow: {
    darkness: 0.16,
    reach: 2.2,
    reachOfLeaflets: 1.6,
    reachOfTwigs: 1.4,
    reachOfBits: 1,
  },
  // How dark a thing is along its own edge, and how wide that edge is, in dots.
  edgeShade: { darkness: 0.14, width: 1.4 },

  leaflets: {
    // Where a frond fell: several leaflets lying nearly parallel.
    // Kept small and loose, so that no bundle stands out to be found again in each repeat.
    frondFalls: 30,
    perFall: [2, 4] satisfies Range,
    // How far the leaflets of one fall stray from its direction, in radians, and how wide it lies, in metres.
    fallSpread: 0.3,
    fallWidth: 0.16,
    singles: 230,
    length: [0.3, 0.7] satisfies Range,
    // Most dead leaflets are folded along the midrib or shredded, so from above most look far
    // narrower than their 2 to 3 cm; the widths lean towards the narrow end.
    width: [0.007, 0.028] satisfies Range,
    // How much lighter the half of a folded leaflet facing the sky is, and the other darker.
    fold: 0.07,
    // How far the middle lies off the line between the ends, as a share of the length.
    bend: 0.06,
    shareTwisted: 0.4,
    shareBroken: 0.4,
    shareSplit: 0.25,
    rank: [0.45, 1] satisfies Range,
  },

  broadLeaves: {
    count: 440,
    length: [0.06, 0.2] satisfies Range,
    // Width as a share of length.
    breadth: [0.4, 0.65] satisfies Range,
    // How far the edge strays from a smooth outline, as a share of the width.
    ragged: 0.08,
    shareCurled: 0.5,
    shareBroken: 0.3,
    rank: [0.3, 1] satisfies Range,
  },

  ribs: {
    count: 240,
    length: [0.15, 0.5] satisfies Range,
    thickness: [0.003, 0.006] satisfies Range,
    rank: [0.35, 0.95] satisfies Range,
  },

  huskFlakes: {
    count: 190,
    length: [0.05, 0.13] satisfies Range,
    breadth: [0.35, 0.6] satisfies Range,
    shareWithSkin: 0.5,
    rank: [0.15, 0.7] satisfies Range,
  },

  twigs: {
    count: 260,
    length: [0.05, 0.3] satisfies Range,
    thickness: [0.003, 0.01] satisfies Range,
    rank: [0.25, 0.9] satisfies Range,
  },

  stalks: {
    count: 70,
    length: [0.08, 0.35] satisfies Range,
    width: [0.01, 0.025] satisfies Range,
    rank: [0.3, 0.9] satisfies Range,
  },

  // The mat of small broken bits: leaf, leaflet, twig and husk.
  bits: {
    count: 5500,
    // Across, in metres.
    size: [0.012, 0.035] satisfies Range,
    // Most gather in drifts this far across (a standard deviation, in metres); the rest lie anywhere.
    drifts: 160,
    driftReach: 0.1,
    shareLoose: 0.3,
    rank: [0, 0.4] satisfies Range,
  },
};
