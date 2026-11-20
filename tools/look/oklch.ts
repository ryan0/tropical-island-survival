// Colour as the eye measures it, for comparing our pictures with photographs (docs/LOOK.md,
// "Colour, measured"). OKLCH is a space in which equal steps look equal: lightness 0 to 1,
// chroma (how far from grey: 0.1 is a clear colour, 0.2 a loud one) and hue in degrees. OKLab is
// the same space with the colour as two distances, which is what averages and spreads are taken
// in. The numbers are Björn Ottosson's (2020).

/** Red, green and blue as a picture stores them, each 0 to 1. */
export type Rgb = readonly [red: number, green: number, blue: number];

/** Lightness, and the colour as two distances: green to red, blue to yellow. */
export type Oklab = readonly [lightness: number, greenToRed: number, blueToYellow: number];

export interface Oklch {
  /** 0 black to 1 white. */
  lightness: number;
  /** 0 grey; a clear colour is about 0.1 and a loud one 0.2. */
  chroma: number;
  /** Degrees: 30 red, 70 orange, 110 yellow-green, 140 green, 200 turquoise, 250 blue, 300 violet. */
  hue: number;
}

const FULL_TURN = 360;
const DEGREES = 180 / Math.PI;

/** A stored channel as the amount of light it stands for. */
function lightOf(stored: number): number {
  return stored <= 0.04045 ? stored / 12.92 : ((stored + 0.055) / 1.055) ** 2.4;
}

/** An amount of light as a picture stores it, kept within what a picture can hold. */
function storedOf(light: number): number {
  const stored = light <= 0.0031308 ? 12.92 * light : 1.055 * light ** (1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, stored));
}

export function oklabOf([red, green, blue]: Rgb): Oklab {
  const r = lightOf(red);
  const g = lightOf(green);
  const b = lightOf(blue);
  const long = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const middle = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const short = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * long + 0.793617785 * middle - 0.0040720468 * short,
    1.9779984951 * long - 2.428592205 * middle + 0.4505937099 * short,
    0.0259040371 * long + 0.7827717662 * middle - 0.808675766 * short,
  ];
}

/** The nearest colour a picture can hold: one outside its range is clipped channel by channel. */
export function rgbOfOklab([lightness, greenToRed, blueToYellow]: Oklab): Rgb {
  const long = (lightness + 0.3963377774 * greenToRed + 0.2158037573 * blueToYellow) ** 3;
  const middle = (lightness - 0.1055613458 * greenToRed - 0.0638541728 * blueToYellow) ** 3;
  const short = (lightness - 0.0894841775 * greenToRed - 1.291485548 * blueToYellow) ** 3;
  return [
    storedOf(4.0767416621 * long - 3.3077115913 * middle + 0.2309699292 * short),
    storedOf(-1.2684380046 * long + 2.6097574011 * middle - 0.3413193965 * short),
    storedOf(-0.0041960863 * long - 0.7034186147 * middle + 1.707614701 * short),
  ];
}

export function oklchOfOklab([lightness, greenToRed, blueToYellow]: Oklab): Oklch {
  const hue = Math.atan2(blueToYellow, greenToRed) * DEGREES;
  return {
    lightness,
    chroma: Math.hypot(greenToRed, blueToYellow),
    hue: (hue + FULL_TURN) % FULL_TURN,
  };
}

export function oklabOfOklch({ lightness, chroma, hue }: Oklch): Oklab {
  return [lightness, chroma * Math.cos(hue / DEGREES), chroma * Math.sin(hue / DEGREES)];
}

export function oklchOf(rgb: Rgb): Oklch {
  return oklchOfOklab(oklabOf(rgb));
}

export function rgbOf(colour: Oklch): Rgb {
  return rgbOfOklab(oklabOfOklch(colour));
}

/** From one hue round to another the short way, in degrees: -180 to 180. */
export function hueTurn(from: number, to: number): number {
  return ((((to - from + 180) % FULL_TURN) + FULL_TURN) % FULL_TURN) - 180;
}

/** As the docs write a colour: "lightness 0.66, chroma 0.107, hue 250". */
export function describe({ lightness, chroma, hue }: Oklch): string {
  return `lightness ${lightness.toFixed(2)}, chroma ${chroma.toFixed(3)}, hue ${hue.toFixed(0)}`;
}

/** As a shader or a config writes a colour: "0.43, 0.61, 0.85". */
export function writeRgb(rgb: Rgb): string {
  return rgb.map((channel) => channel.toFixed(3)).join(', ');
}
