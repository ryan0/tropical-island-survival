import { PNG } from 'pngjs';

interface Rectangle {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PictureDifference {
  differingPixels: number;
  /** Those of them that differ by more than CLEAR_DIFFERENCE. */
  clearlyDifferingPixels: number;
  comparedPixels: number;
  /** The largest difference in any one colour channel, out of 255. */
  largestDifference: number;
  /**
   * A PNG: the reference, the candidate, and the reference dimmed with the differing pixels
   * marked, brightly where they differ clearly and dimly where faintly.
   */
  sideBySide: Buffer;
}

/**
 * A pixel that differs by more than this in a colour channel, out of 255, differs clearly: an
 * eye can pick it out. Less is faint: a shift of under a pixel, or a rounding step in a shader,
 * leaves many such and nothing to see.
 */
export const CLEAR_DIFFERENCE = 8;

const CHANNELS = 4;
const CLEAR_MARK = [255, 0, 200];
const FAINT_MARK = [70, 80, 170];
const DIMMING = 0.35;

function contains(area: Rectangle, x: number, y: number): boolean {
  return (
    x >= area.left && x < area.left + area.width && y >= area.top && y < area.top + area.height
  );
}

// The two pages rightly differ where each prints which build it is: bottom centre.
function buildLabelArea(width: number, height: number): Rectangle {
  return { left: Math.round(width / 2) - 70, top: height - 16, width: 140, height: 16 };
}

export function comparePictures(referencePng: Buffer, candidatePng: Buffer): PictureDifference {
  const reference = PNG.sync.read(referencePng);
  const candidate = PNG.sync.read(candidatePng);
  const { width, height } = reference;
  if (candidate.width !== width || candidate.height !== height) {
    throw new Error(
      `pictures differ in size: ${width} x ${height} and ${candidate.width} x ${candidate.height}`,
    );
  }

  const buildLabel = buildLabelArea(width, height);
  const sideBySide = new PNG({ width: width * 3, height });
  let differingPixels = 0;
  let clearlyDifferingPixels = 0;
  let comparedPixels = 0;
  let largestDifference = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * CHANNELS;
      const ignored = contains(buildLabel, x, y);
      let difference = 0;
      for (let channel = 0; channel < CHANNELS && !ignored; channel++) {
        const inReference = reference.data[from + channel];
        const inCandidate = candidate.data[from + channel];
        difference = Math.max(difference, Math.abs(inReference - inCandidate));
      }

      const mark = difference > CLEAR_DIFFERENCE ? CLEAR_MARK : FAINT_MARK;
      for (let channel = 0; channel < CHANNELS; channel++) {
        const isAlpha = channel === 3;
        const dimmed = isAlpha ? 255 : reference.data[from + channel] * DIMMING;
        const marked = isAlpha ? 255 : mark[channel];
        const to = (y * width * 3 + x) * CHANNELS + channel;
        sideBySide.data[to] = reference.data[from + channel];
        sideBySide.data[to + width * CHANNELS] = candidate.data[from + channel];
        sideBySide.data[to + width * 2 * CHANNELS] = difference > 0 ? marked : dimmed;
      }
      if (ignored) continue;

      comparedPixels++;
      if (difference === 0) continue;

      differingPixels++;
      if (difference > CLEAR_DIFFERENCE) clearlyDifferingPixels++;
      largestDifference = Math.max(largestDifference, difference);
    }
  }

  return {
    differingPixels,
    clearlyDifferingPixels,
    comparedPixels,
    largestDifference,
    sideBySide: PNG.sync.write(sideBySide),
  };
}
