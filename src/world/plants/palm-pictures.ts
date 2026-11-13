import { CanvasTexture } from 'three';
import type { Random } from '../../core/random';

// The palms' two pictures, painted on canvases from the palms' stream of random numbers.

const FROND_WIDTH = 512;
const FROND_HEIGHT = 128;
const MIDRIB = FROND_HEIGHT / 2;
const LEAFLETS_EACH_SIDE = 78;
/** The trunk's length runs across the bark picture, from its foot on the left; its girth runs down. */
const BARK_WIDTH = 256;
const BARK_HEIGHT = 32;
const BARK_STREAKS = 60;

function createCanvas(width: number, height: number, what: string) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error(`the browser gave no canvas to paint ${what} on`);
  return { canvas, context };
}

function rgb(red: number, green: number, blue: number): string {
  return `rgb(${Math.floor(red)},${Math.floor(green)},${Math.floor(blue)})`;
}

/** One leaflet, a thin blade from the midrib at `x`, leaning towards the frond's tip. */
function paintLeaflet(
  context: CanvasRenderingContext2D,
  random: Random,
  x: number,
  side: number,
  length: number,
): void {
  const green = 70 + Math.floor(random() * 45);
  const lean = 14 + random() * 8;
  const wobble = (random() - 0.5) * 5;
  const pointY = MIDRIB + side * length;
  // Pale and yellow-green at the midrib, darker towards its point.
  const shade = context.createLinearGradient(x, MIDRIB, x + lean, pointY);
  shade.addColorStop(0, rgb(green * 0.78, green * 1.26, green * 0.44));
  shade.addColorStop(1, rgb(green * 0.42, green * 0.92, green * 0.34));
  context.fillStyle = shade;
  context.beginPath();
  context.moveTo(x - 3.1, MIDRIB);
  context.lineTo(x + 3.1, MIDRIB);
  context.lineTo(x + lean + wobble, pointY);
  context.closePath();
  context.fill();
}

/**
 * The picture of one frond: a feather-shaped leaf, a midrib along the middle with separate
 * leaflets either side, its base on the left.
 */
export function paintFrondPicture(random: Random, maxAnisotropy: number): CanvasTexture {
  const { canvas, context } = createCanvas(FROND_WIDTH, FROND_HEIGHT, 'a palm frond');
  for (let i = 0; i < LEAFLETS_EACH_SIDE; i++) {
    const along = i / LEAFLETS_EACH_SIDE;
    const x = 10 + along * 488;
    // Leaflets are longest in the middle of the frond, and the last seventh tapers to its tip.
    const taper = along > 0.86 ? ((1 - along) / 0.14) * 0.8 + 0.2 : 1;
    const length =
      (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + 0.95 * along)), 0.55)) *
      58 *
      taper;
    for (const side of [-1, 1]) paintLeaflet(context, random, x, side, length);
  }
  context.strokeStyle = '#6a7a3a';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(0, MIDRIB);
  context.lineTo(500, MIDRIB);
  context.stroke();

  const picture = new CanvasTexture(canvas);
  picture.anisotropy = Math.min(4, maxAnisotropy);
  return picture;
}

/** Bark with ring scars close together and darker streaks, darker still where it meets the ground. */
export function paintBarkPicture(random: Random): CanvasTexture {
  const { canvas, context } = createCanvas(BARK_WIDTH, BARK_HEIGHT, 'bark');
  for (let column = 0; column < BARK_WIDTH; column++) {
    const ringScar = column % 4 === 0 ? -16 : 0;
    const nearFoot = Math.floor(18 * Math.exp(-column / 40));
    const shade = 118 + ringScar + Math.floor(random() * 18) - nearFoot;
    context.fillStyle = rgb(shade, shade * 0.93, shade * 0.84);
    context.fillRect(column, 0, 1, BARK_HEIGHT);
  }
  for (let i = 0; i < BARK_STREAKS; i++) {
    context.fillStyle = `rgba(40,34,28,${0.1 + random() * 0.16})`;
    const x = random() * BARK_WIDTH;
    const y = random() * BARK_HEIGHT;
    const length = 14 + random() * 50;
    const thickness = 1 + random() * 3;
    context.fillRect(x, y, length, thickness);
  }
  return new CanvasTexture(canvas);
}
