import { PNG } from 'pngjs';

export interface Rectangle {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PictureDifference {
  differingPixels: number;
  comparedPixels: number;
  /** The largest difference in any one colour channel, out of 255. */
  largestDifference: number;
  /** The smallest rectangle that holds every differing pixel. */
  area: Rectangle | null;
  /** A PNG: the reference, the candidate, and the reference dimmed with differing pixels marked. */
  sideBySide: Buffer;
}

const CHANNELS = 4;
const MARK = [255, 0, 200];
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
  let comparedPixels = 0;
  let largestDifference = 0;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

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

      for (let channel = 0; channel < CHANNELS; channel++) {
        const isAlpha = channel === 3;
        const dimmed = isAlpha ? 255 : reference.data[from + channel] * DIMMING;
        const marked = isAlpha ? 255 : MARK[channel];
        const to = (y * width * 3 + x) * CHANNELS + channel;
        sideBySide.data[to] = reference.data[from + channel];
        sideBySide.data[to + width * CHANNELS] = candidate.data[from + channel];
        sideBySide.data[to + width * 2 * CHANNELS] = difference > 0 ? marked : dimmed;
      }
      if (ignored) continue;

      comparedPixels++;
      if (difference === 0) continue;

      differingPixels++;
      largestDifference = Math.max(largestDifference, difference);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  const area =
    differingPixels === 0 ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
  return {
    differingPixels,
    comparedPixels,
    largestDifference,
    area,
    sideBySide: PNG.sync.write(sideBySide),
  };
}

export function describeDifference(difference: PictureDifference): string {
  const { differingPixels, comparedPixels, largestDifference, area } = difference;
  if (area === null) return 'the pictures are the same';

  const share = ((100 * differingPixels) / comparedPixels).toFixed(2);
  return (
    `${differingPixels} of ${comparedPixels} pixels differ (${share}%), ` +
    `by up to ${largestDifference} of 255, ` +
    `all within ${area.width} x ${area.height} at ${area.left}, ${area.top}`
  );
}
