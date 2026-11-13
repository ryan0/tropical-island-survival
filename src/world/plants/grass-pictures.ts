import type { Random } from '../../core/random';

// The pictures on the tufts' cards. Each is drawn in units, 128 to a side, at twice as many
// pixels to keep the detail; blades grow up from the bottom edge. Colours here are red, green,
// blue from 0 to 255.

type Rgb = readonly [number, number, number];

interface Blade {
  /** Where its foot is along the bottom edge. */
  root: number;
  width: number;
  height: number;
  /** How far its tip is to the side of its foot. */
  lean: number;
  /** The colour of its tip; it darkens towards its foot. */
  colour: Rgb;
}

interface SeedHead {
  x: number;
  y: number;
  tilt: number;
  colour: Rgb;
}

const UNITS = 128;
const PIXELS = 256;
const BOTTOM = UNITS;
const MIDDLE = UNITS / 2;
// Rounded, not 2π: every pixel of the picture depends on the exact number.
const FULL_TURN = 6.283;

function startPicture(): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = PIXELS;
  canvas.height = PIXELS;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('the browser gave no canvas to draw the grass on');
  context.scale(PIXELS / UNITS, PIXELS / UNITS);
  return { canvas, context };
}

/** A colour as the canvas takes it; a channel above 255 is held at 255. */
function rgb(red: number, green: number, blue: number): string {
  const channel = (value: number) => Math.round(Math.min(255, value));
  return `rgb(${channel(red)},${channel(green)},${channel(blue)})`;
}

/** A blade: a sliver curving up from its foot to its tip, dark at the foot and light at the tip. */
function drawBlade(context: CanvasRenderingContext2D, blade: Blade): void {
  const { root, width, height, lean } = blade;
  const [red, green, blue] = blade.colour;
  const shading = context.createLinearGradient(0, BOTTOM, 0, BOTTOM - height);
  shading.addColorStop(0, rgb(red * 0.46, green * 0.5, blue * 0.42));
  shading.addColorStop(0.5, rgb(red * 0.78, green * 0.8, blue * 0.74));
  shading.addColorStop(1, rgb(red, green, blue));
  context.fillStyle = shading;
  context.beginPath();
  context.moveTo(root - width / 2, BOTTOM);
  context.quadraticCurveTo(
    root - width / 2 + lean * 0.35,
    BOTTOM - height * 0.6,
    root + lean,
    BOTTOM - height,
  );
  context.quadraticCurveTo(
    root + width / 2 + lean * 0.45,
    BOTTOM - height * 0.55,
    root + width / 2,
    BOTTOM,
  );
  context.closePath();
  context.fill();
}

function drawSeedHead(context: CanvasRenderingContext2D, seedHead: SeedHead): void {
  context.save();
  context.translate(seedHead.x, seedHead.y);
  context.rotate(seedHead.tilt);
  context.fillStyle = rgb(...seedHead.colour);
  context.beginPath();
  context.ellipse(0, 0, 1.7, 8, 0, 0, FULL_TURN);
  context.fill();
  context.restore();
}

/** Turf: a tussock - many fine blades fanning out from one crowded base, most of them short, a few dry. */
export function drawTurf(random: Random): HTMLCanvasElement {
  const { canvas, context } = startPicture();
  for (let i = 0; i < 95; i++) {
    const root = MIDDLE + (random() - 0.5) * 50;
    const isDry = random() < 0.22;
    const height = 22 + random() * random() * 100;
    const width = 1.6 + random() * 1.9;
    const lean = (root - MIDDLE) * (0.5 + random() * 0.9) + (random() - 0.5) * 26;
    const colour: Rgb = isDry
      ? [250, 232, 150]
      : [205 + random() * 40, 236 + random() * 19, 185 + random() * 30];
    drawBlade(context, { root, width, height, lean, colour });
  }
  return canvas;
}

/** Taller grass, every third blade tipped with a pale seed head. */
export function drawSeedHeadGrass(random: Random): HTMLCanvasElement {
  const { canvas, context } = startPicture();
  for (let i = 0; i < 40; i++) {
    const root = MIDDLE + (random() - 0.5) * 46;
    const height = 60 + random() * 62;
    const lean = (root - MIDDLE) * (0.6 + random() * 0.8) + (random() - 0.5) * 24;
    const width = 1.5 + random() * 1.5;
    const colour: Rgb = [225 + random() * 25, 240, 198 + random() * 20];
    drawBlade(context, { root, width, height, lean, colour });
    if (i % 3 !== 0) continue;

    const seedHead: SeedHead = {
      x: root + lean,
      y: BOTTOM - height + 4,
      tilt: lean * 0.012,
      colour: [238 + random() * 12, 222, 165],
    };
    drawSeedHead(context, seedHead);
  }
  return canvas;
}

/** Dune grass: long pale blades splayed wide from a narrow base. */
export function drawDuneGrass(random: Random): HTMLCanvasElement {
  const { canvas, context } = startPicture();
  for (let i = 0; i < 34; i++) {
    const root = MIDDLE + (random() - 0.5) * 30;
    const width = 1.4 + random() * 1.6;
    const height = 60 + random() * 62;
    const lean = (root - MIDDLE) * 1.6 + (random() - 0.5) * 60;
    const colour: Rgb = [252, 240 + random() * 12, 172 + random() * 28];
    drawBlade(context, { root, width, height, lean, colour });
  }
  return canvas;
}

/** Sea grass: a few broad ribbons spread across the card. */
export function drawSeaGrass(random: Random): HTMLCanvasElement {
  const { canvas, context } = startPicture();
  for (let i = 0; i < 16; i++) {
    const root = 20 + random() * 88;
    const width = 7 + random() * 6;
    const height = 80 + random() * 46;
    const lean = (random() - 0.5) * 30;
    const colour: Rgb = [150 + random() * 40, 200 + random() * 40, 120 + random() * 40];
    drawBlade(context, { root, width, height, lean, colour });
  }
  return canvas;
}
