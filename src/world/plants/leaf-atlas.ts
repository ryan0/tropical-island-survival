import type { Random } from '../../core/random';

// The leafy plants share one picture, the leaf atlas, so that their leaves, bark and dark insides
// need only one material and a whole plant is drawn in one go. It is 1024 x 512: the left half
// holds four sprigs of leaves (2 x 2), the right half is solid, the dark inside of a bush and then
// a strip of bark.

/** Where in the leaf atlas a part of a plant takes its picture from. */
export type AtlasRegion = 'leaf' | 'core' | 'bark';

/** Each maps a part's own texture coordinates into its region of the atlas. */
export const ATLAS_REGIONS: Readonly<
  Record<AtlasRegion, (u: number, v: number) => [number, number]>
> = {
  leaf: (u, v) => [u * 0.5, v],
  // A dark core's own coordinates run from 0 to 2.
  core: (u, v) => [(592 + u * 64) / 1024, (16 + v * 240) / 512],
  // A stem's run from 0.1 to 0.2 across and from 0 to 1 along.
  bark: (u, v) => [(816 + (u - 0.1) * 1600) / 1024, v],
};

export interface LeafPictures {
  leafAtlas: HTMLCanvasElement;
  /** Bark on its own, for stems that are not part of a leafy plant. */
  bark: HTMLCanvasElement;
}

type Rgb = readonly [red: number, green: number, blue: number];

interface Sprig {
  x: number;
  y: number;
  hue: number;
}

const SPRIGS: readonly Sprig[] = [
  { x: 128, y: 128, hue: 0.0 },
  { x: 384, y: 128, hue: 0.5 },
  { x: 128, y: 384, hue: 0.2 },
  { x: 384, y: 384, hue: 0.9 },
];
const SPRIG_RADIUS = 120;
// From the outside in: fewer and shorter leaves, and paler, for the new ones in the middle.
const SPRIG_RINGS = [
  { leaves: 9, reach: 1, green: 96 },
  { leaves: 7, reach: 0.72, green: 116 },
  { leaves: 5, reach: 0.42, green: 150 },
] as const;

interface Canvas {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

function createCanvas(width: number, height: number): Canvas {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('the browser gave no canvas to draw the leaves on');
  return { canvas, context };
}

/**
 * A paddle-shaped leaf along x from its stalk at the origin, `width` either side of its middle:
 * narrow at the stalk and rounded at the tip, glossy, with a pale midrib.
 */
function drawLeaf(
  context: CanvasRenderingContext2D,
  length: number,
  width: number,
  [r, g, b]: Rgb,
): void {
  const gloss = context.createLinearGradient(0, -width, 0, width);
  gloss.addColorStop(
    0,
    `rgb(${Math.floor(r * 0.72)},${Math.floor(g * 0.74)},${Math.floor(b * 0.7)})`,
  );
  gloss.addColorStop(0.45, `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`);
  gloss.addColorStop(
    1,
    `rgb(${Math.floor(Math.min(255, r * 1.22))},${Math.floor(Math.min(255, g * 1.12))},${Math.floor(b * 1.05)})`,
  );
  context.fillStyle = gloss;
  context.beginPath();
  context.moveTo(0, 0);
  context.bezierCurveTo(
    length * 0.35,
    -width * 0.35,
    length * 0.62,
    -width,
    length * 0.9,
    -width * 0.72,
  );
  context.bezierCurveTo(
    length * 1.04,
    -width * 0.3,
    length * 1.04,
    width * 0.3,
    length * 0.9,
    width * 0.72,
  );
  context.bezierCurveTo(length * 0.62, width, length * 0.35, width * 0.35, 0, 0);
  context.fill();
  context.strokeStyle = 'rgba(225,245,160,.5)';
  context.lineWidth = 1.3;
  context.beginPath();
  context.moveTo(length * 0.08, 0);
  context.lineTo(length * 0.92, 0);
  context.stroke();
}

/** What ends every twig of a beach shrub: a whorl of leaves in three rings round its middle. */
function drawSprig(context: CanvasRenderingContext2D, random: Random, sprig: Sprig): void {
  for (const [ring, { leaves, reach, green }] of SPRIG_RINGS.entries()) {
    const ringReach = SPRIG_RADIUS * reach;
    const firstAngle = random() * 6.283;
    for (let q = 0; q < leaves; q++) {
      const angle = firstAngle + (q * 6.283) / leaves + (random() - 0.5) * 0.35;
      const g = green * (0.9 + random() * 0.2);
      const length = ringReach * (0.85 + random() * 0.2);
      context.save();
      context.translate(sprig.x, sprig.y);
      context.rotate(angle);
      drawLeaf(context, length, ringReach * 0.24, [
        g * (0.46 + 0.14 * sprig.hue + 0.1 * ring),
        g,
        g * (0.3 + 0.06 * ring),
      ]);
      context.restore();
    }
  }
}

/** The dark inside of a bush: speckled dark green. */
function drawDarkCore(random: Random): HTMLCanvasElement {
  const { canvas, context } = createCanvas(64, 64);
  for (let x = 0; x < 64; x++) {
    for (let y = 0; y < 64; y++) {
      const dark = 34 + Math.floor(random() * 26);
      context.fillStyle = `rgb(${Math.floor(dark * 0.55)},${dark},${Math.floor(dark * 0.45)})`;
      context.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

/** Bark: bands across the stem. */
function drawBark(random: Random): HTMLCanvasElement {
  const { canvas, context } = createCanvas(64, 64);
  for (let y = 0; y < 64; y++) {
    const light = 120 + Math.floor(random() * 45);
    context.fillStyle = `rgb(${light},${Math.floor(light * 0.86)},${Math.floor(light * 0.7)})`;
    context.fillRect(0, y, 64, 1);
  }
  return canvas;
}

export function drawLeafPictures(random: Random): LeafPictures {
  const { canvas: leafAtlas, context: atlas } = createCanvas(1024, 512);
  for (const sprig of SPRIGS) drawSprig(atlas, random, sprig);
  const darkCore = drawDarkCore(random);
  // Stretched without smoothing, the speckles and bands keep their sharp edges.
  atlas.imageSmoothingEnabled = false;
  atlas.drawImage(darkCore, 544, 0, 256, 512);
  const bark = drawBark(random);
  atlas.drawImage(bark, 800, 0, 224, 512);
  return { leafAtlas, bark };
}
