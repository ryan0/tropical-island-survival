import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
  type Matrix3,
  type Scene,
} from 'three';
import { mix, smoothstep } from '../core/maths';
import type { Random } from '../core/random';
import type { SharedUniforms } from '../core/shared-uniforms';
import { glslFloat, glslVec2, glslVec3 } from '../shaders/defines';
import { skyConfig } from './sky-config';
import { galacticDirection } from './sky-turn';
import { STAR_PLACES, type StarColourClass } from './star-places';
import fragmentShader from './stars.frag.glsl';
import vertexShader from './stars.vert.glsl';

// The stars: a point each, set in the sky by its turn (sky-turn.ts) and drawn over the dome. The
// real sky's brightest and best known are in their places (star-places.ts); the rest are
// scattered at random, many faint for each bright one and more of them in the Milky Way.

export interface StarsDependencies {
  scene: Scene;
  /** The uniforms every shader shares: the stars read the clock, the night, the moon and the cloud pictures. */
  uniforms: SharedUniforms;
  /** The sky's turn of the moment (sky-turn.ts). */
  skyTurn: { value: Matrix3 };
  random: Random;
  /** The defines the dome's shader is given for the sky pictures and the moon, which the stars read too. */
  skyDefines: Record<string, string>;
}

export interface Stars {
  /** `pixelRatio` is the renderer's: dots to a CSS pixel. */
  update(pixelRatio: number): void;
}

const config = skyConfig.stars;
const COLOUR_CLASSES: readonly StarColourClass[] = ['B', 'A', 'F', 'G', 'K', 'M'];
// A magnitude's ratio of light.
const LIGHT_RATIO_OF_A_MAGNITUDE = 2.512;
// Inside the dome (sky-dome.ts), whose radius is 3000: anything nearer hides a star.
const STAR_DISTANCE = 2800;
// A star's point is this many spreads wide: its spot is all but gone at the point's edge.
const SPREADS_ACROSS = 6;

/** A magnitude from the spread of the real sky's: each magnitude fainter has more stars. */
function randomMagnitude(random: Random): number {
  const [brightest, faintest] = config.randomMagnitudes;
  const growth = config.moreAtEachMagnitude;
  const allOfThem = growth ** (faintest - brightest) - 1;
  return brightest + Math.log(1 + random() * allOfThem) / Math.log(growth);
}

/** A direction in the galaxy's frame, more often near its plane. */
function randomGalacticDirection(random: Random, into: Float32Array, index: number): void {
  const extraInPlane = config.crowdingInMilkyWay - 1;
  for (;;) {
    const up = 2 * random() - 1;
    const around = 2 * Math.PI * random();
    const latitude = Math.asin(up) / config.crowdingWidth;
    const chance = (1 + extraInPlane * Math.exp(-latitude * latitude)) / (1 + extraInPlane);
    if (random() < chance) {
      const across = Math.sqrt(1 - up * up);
      into[index * 3] = across * Math.cos(around);
      into[index * 3 + 1] = across * Math.sin(around);
      into[index * 3 + 2] = up;
      return;
    }
  }
}

function randomColourClass(random: Random): StarColourClass {
  let share = random();
  for (const colourClass of COLOUR_CLASSES) {
    share -= config.colourShares[colourClass];
    if (share < 0) return colourClass;
  }
  return 'A';
}

/** A star's colour as the eye sees it: some of its class's colour on a bright star, little on a faint one. */
function writeColour(
  colourClass: StarColourClass,
  magnitude: number,
  into: Float32Array,
  index: number,
): void {
  const [onFaintest, onBrightest] = config.colourShown;
  const faintest = config.randomMagnitudes[1];
  const shown = mix(onFaintest, onBrightest, smoothstep(faintest, 0, magnitude));
  const colour = config.classColours[colourClass];
  for (let channel = 0; channel < 3; channel++) {
    into[index * 3 + channel] = mix(1, colour[channel], shown);
  }
}

function starField(random: Random): BufferGeometry {
  const { count } = config;
  const directions = new Float32Array(count * 3);
  const magnitudes = new Float32Array(count);
  const colours = new Float32Array(count * 3);
  const seeds = new Float32Array(count);

  STAR_PLACES.forEach(([, rightAscension, declination, magnitude, colourClass], index) => {
    galacticDirection({ rightAscension, declination }).toArray(directions, index * 3);
    magnitudes[index] = magnitude;
    writeColour(colourClass, magnitude, colours, index);
  });
  for (let index = STAR_PLACES.length; index < count; index++) {
    randomGalacticDirection(random, directions, index);
    magnitudes[index] = randomMagnitude(random);
    writeColour(randomColourClass(random), magnitudes[index], colours, index);
  }
  for (let index = 0; index < count; index++) seeds[index] = random();

  const field = new BufferGeometry();
  field.setAttribute('position', new BufferAttribute(directions, 3));
  field.setAttribute('aMagnitude', new BufferAttribute(magnitudes, 1));
  field.setAttribute('aColour', new BufferAttribute(colours, 3));
  field.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  return field;
}

function starDefines(): Record<string, string> {
  const { faintestSeen } = config;
  const brighterPerMagnitude = config.contrast * Math.log2(LIGHT_RATIO_OF_A_MAGNITUDE);
  return {
    STAR_DISTANCE: glslFloat(STAR_DISTANCE),
    SPREADS_ACROSS: glslFloat(SPREADS_ACROSS),
    FAINTEST_SEEN_BY_DAY: glslFloat(faintestSeen.byDay),
    FAINTEST_SEEN_BY_NIGHT: glslFloat(faintestSeen.byNight),
    LOST_TO_MOONLIGHT: glslFloat(faintestSeen.lostToMoonlight),
    LOST_NEAR_MOON: glslFloat(faintestSeen.lostNearMoon),
    NEAR_MOON: glslVec2(...config.nearMoon),
    FADES_OVER: glslFloat(config.fadesOver),
    LOW_DOWN: glslFloat(config.lowDown),
    LOST_AT_HORIZON: glslFloat(config.lostAtHorizon),
    COLOUR_AT_HORIZON: glslVec3(...config.colourAtHorizon),
    BRIGHTNESS_AT_MAGNITUDE_ZERO: glslFloat(config.brightnessAtMagnitudeZero),
    BRIGHTER_PER_MAGNITUDE: glslFloat(brighterPerMagnitude),
    SPREAD: glslVec2(...config.spread),
    SPREAD_AT_MAGNITUDES: glslVec2(...config.spreadAtMagnitudes),
    TWINKLE: glslVec2(...config.twinkle),
    TWINKLE_PACES: glslVec2(...config.twinklePaces),
  };
}

export function createStars({
  scene,
  uniforms,
  skyTurn,
  random,
  skyDefines,
}: StarsDependencies): Stars {
  const pixelRatio = { value: 1 };
  const stars = new Points(
    starField(random),
    new ShaderMaterial({
      uniforms: {
        uSkyTurn: skyTurn,
        uTime: uniforms.uTime,
        uNight: uniforms.uNight,
        uMoonDirection: uniforms.uMoonDirection,
        uUnderWater: uniforms.uUnderWater,
        uSkyPictureFrom: uniforms.uSkyPictureFrom,
        uSkyPictureTo: uniforms.uSkyPictureTo,
        uSkyPictureBlend: uniforms.uSkyPictureBlend,
        uSkyPictureDrift: uniforms.uSkyPictureDrift,
        uPixelRatio: pixelRatio,
      },
      defines: { ...skyDefines, ...starDefines() },
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
      vertexShader,
      fragmentShader,
    }),
  );
  // The shader sets them round the camera, wherever the shape's bounds say they are.
  stars.frustumCulled = false;
  // Just after the dome, over it: land, sea and anything else already drawn hides them.
  stars.renderOrder = 11;
  scene.add(stars);

  return {
    update(ratio) {
      pixelRatio.value = ratio;
      stars.visible = uniforms.uNight.value > 0;
    },
  };
}
