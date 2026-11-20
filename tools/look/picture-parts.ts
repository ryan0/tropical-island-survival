// Measures a named part of a picture: its colour, and how far its dots stray from that colour.
//
// A part is named on the grid a contact sheet draws over a picture (contact-sheet.ts): ten
// columns A to J and ten rows 0 to 9. 'C3' is one square; 'C3:E4' runs from the top left of C3 to
// the bottom right of E4. A part should hold one material and nothing else.
//
// The pictures are read with ffmpeg, which the project already asks for (it cuts the wave
// videos into stills), so that photographs in any format can be measured.

import { execFileSync } from 'node:child_process';
import { oklabOf, oklchOfOklab, type Oklab, type Oklch, type Rgb } from './oklch.ts';

/** A picture's file, and the squares of its grid: ['photo.jpg', 'C3:E4']. */
export type Part = readonly [picture: string, cells: string];

const COLUMNS = 'ABCDEFGHIJ';
const SQUARES_EACH_WAY = 10;
const CELLS = /^([A-J])(\d)(?::([A-J])(\d))?$/;
// The part is shrunk to this many dots a side before its colour is taken, each the average of
// the dots it stands for.
const COLOUR_DOTS = 24;
// Of those, the darkest and the brightest of this share are left out: a glint, a twig's shadow.
const SHARE_LEFT_OUT_EACH_END = 0.2;
// For the spread the part is shrunk to this many dots across, so that grain too fine to see on
// a phone is left out, and what is measured is blotches and patterns.
const SPREAD_DOTS_ACROSS = 40;
const FEWEST_SPREAD_ROWS = 8;
const CHANNELS = 3;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

function sizeOf(picture: string): [width: number, height: number] {
  const answer = execFileSync(
    'ffprobe',
    [
      ...['-v', 'error', '-select_streams', 'v:0'],
      ...['-show_entries', 'stream=width,height', '-of', 'csv=p=0', picture],
    ],
    { encoding: 'utf8' },
  );
  const [width, height] = answer.trim().split(',').map(Number);
  if (!(width > 0 && height > 0)) throw new Error(`${picture} has no size that can be read`);
  return [width, height];
}

function boxOf([picture, cells]: Part): Box {
  const named = CELLS.exec(cells);
  if (named === null) throw new Error(`'${cells}' names no part of a picture: write C3 or C3:E4`);
  const [, firstColumn, firstRow, lastColumn = firstColumn, lastRow = firstRow] = named;
  const [width, height] = sizeOf(picture);
  const left = (COLUMNS.indexOf(firstColumn) / SQUARES_EACH_WAY) * width;
  const top = (Number(firstRow) / SQUARES_EACH_WAY) * height;
  const right = ((COLUMNS.indexOf(lastColumn) + 1) / SQUARES_EACH_WAY) * width;
  const bottom = ((Number(lastRow) + 1) / SQUARES_EACH_WAY) * height;
  return {
    left: Math.floor(left),
    top: Math.floor(top),
    width: Math.max(2, Math.floor(right - left)),
    height: Math.max(2, Math.floor(bottom - top)),
  };
}

/** The part shrunk to `across` by `down` dots, each the average of the dots it stands for. */
function dotsOf(part: Part, across: number, down: number): Rgb[] {
  const { left, top, width, height } = boxOf(part);
  const raw = execFileSync(
    'ffmpeg',
    [
      ...['-v', 'error', '-i', part[0]],
      ...['-vf', `crop=${width}:${height}:${left}:${top},scale=${across}:${down}:flags=area`],
      ...['-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    ],
    { maxBuffer: across * down * CHANNELS + 1024 },
  );
  const dots: Rgb[] = [];
  for (let at = 0; at + CHANNELS <= raw.length; at += CHANNELS) {
    dots.push([raw[at] / 255, raw[at + 1] / 255, raw[at + 2] / 255]);
  }
  return dots;
}

function brightnessOf([red, green, blue]: Rgb): number {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** The part's colour: the average of its dots, the darkest and brightest fifths left out. */
export function colourOf(part: Part): Rgb {
  const dots = dotsOf(part, COLOUR_DOTS, COLOUR_DOTS);
  dots.sort((one, other) => brightnessOf(one) - brightnessOf(other));
  const leftOut = Math.floor(dots.length * SHARE_LEFT_OUT_EACH_END);
  const kept = dots.slice(leftOut, dots.length - leftOut);
  const sum = [0, 0, 0];
  for (const dot of kept)
    for (let channel = 0; channel < CHANNELS; channel++) sum[channel] += dot[channel];
  return [sum[0] / kept.length, sum[1] / kept.length, sum[2] / kept.length];
}

/**
 * One colour for several parts of the same material, each part counting alike: their lightness
 * and chroma averaged, and their hue as the direction most of them lie in. (Averaged as colours,
 * a blue part and an orange one would come out grey, which neither is.)
 */
export function colourOfAll(parts: readonly Part[]): Oklch {
  if (parts.length === 0) throw new Error('no parts to measure');
  const colours = parts.map((part) => oklabOf(colourOf(part)));
  let lightness = 0;
  let chroma = 0;
  let alongRed = 0;
  let alongYellow = 0;
  for (const [l, a, b] of colours) {
    const itsChroma = Math.hypot(a, b);
    lightness += l;
    chroma += itsChroma;
    alongRed += a / Math.max(itsChroma, 1e-6);
    alongYellow += b / Math.max(itsChroma, 1e-6);
  }
  const { hue } = oklchOfOklab([0, alongRed, alongYellow]);
  return { lightness: lightness / parts.length, chroma: chroma / parts.length, hue };
}

export interface Spread {
  /** How far the dots' lightness strays from the part's average (a standard deviation). */
  lightness: number;
  /** How far their colour strays, as a distance in OKLab. */
  colour: number;
}

/** How busy a part is: 0 for a flat colour; clean sand is about 0.03 in lightness. */
export function spreadOf(part: Part): Spread {
  const { width, height } = boxOf(part);
  const rows = Math.max(FEWEST_SPREAD_ROWS, Math.round((SPREAD_DOTS_ACROSS * height) / width));
  const dots: Oklab[] = dotsOf(part, SPREAD_DOTS_ACROSS, rows).map(oklabOf);
  const mean = [0, 0, 0];
  for (const dot of dots) for (let k = 0; k < CHANNELS; k++) mean[k] += dot[k] / dots.length;
  let lightness = 0;
  let colour = 0;
  for (const [l, a, b] of dots) {
    lightness += (l - mean[0]) ** 2;
    colour += (a - mean[1]) ** 2 + (b - mean[2]) ** 2;
  }
  return { lightness: Math.sqrt(lightness / dots.length), colour: Math.sqrt(colour / dots.length) };
}
