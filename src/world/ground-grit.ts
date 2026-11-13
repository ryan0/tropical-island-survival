import { CanvasTexture, RepeatWrapping } from 'three';
import type { Random } from '../core/random';
import { worldConfig } from './world-config';

export interface GroundGrit {
  texture: CanvasTexture;
  /** The picture's average brightness, 0 to 1, so that the grit neither darkens nor lightens the ground overall. */
  mean: number;
}

const { gritSize: SIZE, gritRepeats, gritSpecks, shareOfDarkSpecks } = worldConfig.terrain;
// A speck touches the dots within this many of its middle.
const SPECK_REACH = 3;

/** Soft noise that wraps at the edges: random values on a grid of `cells` a side, blended smoothly between. */
function createClumps(random: Random, cells: number): (u: number, v: number) => number {
  const values = new Float32Array(cells * cells);
  for (let i = 0; i < values.length; i++) values[i] = random();

  return (u, v) => {
    const x = u * cells;
    const y = v * cells;
    const column = Math.floor(x);
    const row = Math.floor(y);
    let acrossShare = x - column;
    let downShare = y - row;
    acrossShare = acrossShare * acrossShare * (3 - 2 * acrossShare);
    downShare = downShare * downShare * (3 - 2 * downShare);
    const x0 = column % cells;
    const x1 = (column + 1) % cells;
    const y0 = row % cells;
    const y1 = (row + 1) % cells;
    return (
      (values[y0 * cells + x0] * (1 - acrossShare) + values[y0 * cells + x1] * acrossShare) *
        (1 - downShare) +
      (values[y1 * cells + x0] * (1 - acrossShare) + values[y1 * cells + x1] * acrossShare) *
        downShare
    );
  };
}

/**
 * The ground's grit: every dot a slightly different grey (grains of sand) over soft clumps a few
 * dots and a few dozen dots across, with scattered round specks. One dot is about 1.4 cm on
 * the ground and the picture repeats every 3.5 m; all of it wraps at the edges.
 */
export function createGroundGrit(random: Random): GroundGrit {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('the browser gave no canvas to draw the ground grit on');

  const picture = context.createImageData(SIZE, SIZE);
  const dots = SIZE * SIZE;
  const grey = new Float32Array(dots);
  const smallClumps = createClumps(random, 64);
  const largeClumps = createClumps(random, 16);
  for (let i = 0; i < dots; i++) {
    const u = (i % SIZE) / SIZE;
    const v = Math.floor(i / SIZE) / SIZE;
    grey[i] = 0.45 * random() + 0.33 * smallClumps(u, v) + 0.22 * largeClumps(u, v);
  }

  for (let speck = 0; speck < gritSpecks; speck++) {
    const x = random() * SIZE;
    const y = random() * SIZE;
    const radius = 0.6 + random() * 0.9;
    const tone = random() < shareOfDarkSpecks ? -(0.12 + random() * 0.2) : 0.2 + random() * 0.2;
    const column = Math.round(x);
    const row = Math.round(y);
    for (let down = -SPECK_REACH; down <= SPECK_REACH; down++) {
      for (let across = -SPECK_REACH; across <= SPECK_REACH; across++) {
        const distance = Math.hypot(across + column - x, down + row - y);
        if (distance >= radius + 0.5) continue;

        const dot = ((row + down) & (SIZE - 1)) * SIZE + ((column + across) & (SIZE - 1));
        grey[dot] += tone * Math.min(1, radius + 0.5 - distance);
      }
    }
  }

  let sum = 0;
  for (let i = 0; i < dots; i++) {
    const value = Math.max(0, Math.min(255, Math.round(150 + 105 * grey[i])));
    picture.data[i * 4] = value;
    picture.data[i * 4 + 1] = value;
    picture.data[i * 4 + 2] = value;
    picture.data[i * 4 + 3] = 255;
    sum += value;
  }
  context.putImageData(picture, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(gritRepeats, gritRepeats);
  return { texture, mean: sum / dots / 255 };
}
