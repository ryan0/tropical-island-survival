import type { CanvasTexture } from 'three';

// A leaf picture is cut out where it is clear: a dot is drawn where the picture is more opaque
// than a cutoff, and not drawn where it is less. Far off, the graphics card reads a smaller copy
// of the picture, each dot of it the average of many, and an average of leaf and gap falls under
// the cutoff more often than not: thin leaves vanish, and far palms and shrubs look sparser than
// near ones. So the smaller copies are made here, each with its opacity raised until as much of
// it passes the cutoff as passes in the full picture.

/** The opacity (0 to 255) that `share` of the dots are at or above. */
function opacityReachedBy(share: number, opacities: Uint8ClampedArray, dots: number): number {
  const howManyAt = new Uint32Array(256);
  for (let dot = 0; dot < dots; dot++) howManyAt[opacities[dot * 4 + 3]]++;
  let above = 0;
  for (let opacity = 255; opacity > 0; opacity--) {
    above += howManyAt[opacity];
    if (above >= share * dots) return opacity;
  }
  return 1;
}

/**
 * Gives a cut-out picture smaller copies that keep as much of it drawn as the full picture has.
 * `cutoff` is the material's alphaTest. Call it before the picture is first drawn.
 */
export function keepCoverageFarOff(picture: CanvasTexture, cutoff: number): void {
  const full = picture.image as HTMLCanvasElement;
  const cutoffOpacity = cutoff * 255;
  const fullContext = full.getContext('2d');
  if (fullContext === null) throw new Error('a cut-out picture that cannot be read');
  const fullDots = fullContext.getImageData(0, 0, full.width, full.height).data;
  let drawn = 0;
  for (let i = 3; i < fullDots.length; i += 4) if (fullDots[i] >= cutoffOpacity) drawn++;
  const shareDrawn = drawn / (full.width * full.height);

  const copies: HTMLCanvasElement[] = [full];
  // (each copy is halved from the last one as the graphics card would halve it, before its opacity is raised)
  let halvedFrom = full;
  while (halvedFrom.width > 1 || halvedFrom.height > 1) {
    const width = Math.max(1, halvedFrom.width >> 1);
    const height = Math.max(1, halvedFrom.height >> 1);
    const halved = document.createElement('canvas');
    halved.width = width;
    halved.height = height;
    const halvedContext = halved.getContext('2d');
    if (halvedContext === null) throw new Error('no canvas to halve a cut-out picture into');
    halvedContext.drawImage(halvedFrom, 0, 0, width, height);
    const dots = halvedContext.getImageData(0, 0, width, height);

    const copy = document.createElement('canvas');
    copy.width = width;
    copy.height = height;
    const raise = cutoffOpacity / opacityReachedBy(shareDrawn, dots.data, width * height);
    // (never lowered: a copy with more of it drawn than the full picture is left as it is)
    if (raise > 1) {
      for (let i = 3; i < dots.data.length; i += 4)
        dots.data[i] = Math.min(255, dots.data[i] * raise);
    }
    copy.getContext('2d')?.putImageData(dots, 0, 0);
    copies.push(copy);
    halvedFrom = halved;
  }
  // (three.js sends these to the graphics card in place of making its own)
  picture.mipmaps = copies;
  picture.generateMipmaps = false;
}
