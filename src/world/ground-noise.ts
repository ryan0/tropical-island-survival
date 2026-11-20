import { DataTexture, LinearFilter, LuminanceFormat, RepeatWrapping } from 'three';
import { worldConfig } from './world-config';

// The noise the ground's patterns are made of, as a picture. The ground's colouring asks for noise
// some fifty times over for a dot of turf and a dozen for a dot of sea floor, and on Ryan's phone
// working it out by arithmetic each time is dear where reading a picture costs next to nothing.
// The picture holds the same kind of noise (smooth, with one rise and fall to a cell), made once
// here; it repeats, every `period` cells.

const config = worldConfig.groundNoise;
// A number of its own, so that nothing else's pattern moves.
const SEED = 20261119;

/** The smooth step that carries the slope, too, on across a cell's edge (as noise.glsl's does). */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * The picture: one number to a dot, 0 to 1, `config.dotsACell` dots to a cell of the noise and
 * `config.period` cells across, repeating. It has no mipmaps, so that it may be read inside a
 * branch (docs/DEVICE_NOTES.md), and is small enough to stay close at hand however scattered the
 * readings of it are.
 */
export function createGroundNoise(): DataTexture {
  const { period, dotsACell } = config;
  let state = SEED;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  // A slope at each corner of the grid of cells, as gradient noise has.
  const slopes = new Float32Array(period * period * 2);
  for (let i = 0; i < slopes.length; i++) slopes[i] = random() * 2 - 1;
  const slopeAt = (column: number, row: number, across: number, down: number) => {
    const corner = ((row % period) * period + (column % period)) * 2;
    return slopes[corner] * across + slopes[corner + 1] * down;
  };

  const size = period * dotsACell;
  const dots = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const column = Math.floor(x / dotsACell);
      const row = Math.floor(y / dotsACell);
      const across = ((x % dotsACell) + 0.5) / dotsACell;
      const down = ((y % dotsACell) + 0.5) / dotsACell;
      const near = slopeAt(column, row, across, down);
      const nearNext = slopeAt(column + 1, row, across - 1, down);
      const far = slopeAt(column, row + 1, across, down - 1);
      const farNext = slopeAt(column + 1, row + 1, across - 1, down - 1);
      const nearEdge = near + (nearNext - near) * fade(across);
      const farEdge = far + (farNext - far) * fade(across);
      const value = nearEdge + (farEdge - nearEdge) * fade(down);
      // (centred on a half, as noise.glsl's is)
      dots[y * size + x] = Math.round(255 * Math.max(0, Math.min(1, value * 0.75 + 0.5)));
    }
  }
  const picture = new DataTexture(dots, size, size, LuminanceFormat);
  picture.wrapS = picture.wrapT = RepeatWrapping;
  picture.minFilter = picture.magFilter = LinearFilter;
  picture.needsUpdate = true;
  return picture;
}
