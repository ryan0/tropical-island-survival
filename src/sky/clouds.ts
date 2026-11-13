import {
  Color,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { smoothstep } from '../core/maths';
import { glslFloat, glslVec2 } from '../shaders/defines';
import bakeShader from './cloud-bake.frag.glsl';
import { createCloudField, type CloudMoment } from './cloud-field';
import type { CloudPicture } from './cloud-noise';
import shadeShader from './cloud-shade.frag.glsl';
import { cloudsConfig } from './clouds-config';
import { skyConfig } from './sky-config';
import type { Weather } from './weather';
import wholePictureShader from './whole-picture.vert.glsl';

// The clouds: all of them, as real volumes.
//
// Clouds are not surfaces, so they are not drawn as surfaces. There is a field of cloud in the
// air round the island - fair-weather cumulus with flat bases at 800 m, here and there a tower
// several kilometres tall, thin cirrus far above - described by two small noise pictures and a
// shader (cloud-bake.frag.glsl) that walks out through that air along a line of sight, adding
// up how much cloud it passes, how much sunlight reaches each bit of it through the cloud in
// the way, and how much haze lies in front.
//
// That walk is far too slow to do for every dot of the screen every frame. So it is done into
// a picture of the whole sky instead (all 360 degrees round, horizon to zenith), a thin strip
// of it each frame; the sky's shader then only has to look its direction up in that picture.
// Three such pictures take turns: the sky shows a blend sliding from the last finished one to
// the newest while the third is being redrawn, so the clouds change smoothly - they drift with
// the wind (each picture is slid to where its clouds have got to by now), and they billow and
// re-form.
//
// What a sky picture holds, for each direction (already multiplied by how much of it shows
// through nearer cloud):
//   red     sunlit cloud (to be coloured by the sun of the moment)
//   green   cloud lit by the sky (to be coloured by the shade colour)
//   blue    cloud lost in haze (takes the sky's own colour)
//   alpha   how much the clouds hide of what is behind them

export interface CloudsDependencies {
  renderer: WebGLRenderer;
  weather: Weather;
  noise: CloudPicture;
  weatherMap: CloudPicture;
  /** How wide to make a sky picture, in dots. The tests ask for smaller ones than the config's. */
  pictureWidth: number;
}

export interface CloudsFrame {
  /** Seconds on the clock the waves run by. */
  time: number;
  dt: number;
  /** The true time since the last frame. */
  realSeconds: number;
  /** A test has stopped the clock: one whole picture is drawn for the moment, at once. */
  isClockStopped: boolean;
  /** The unit vector towards the sun. */
  sunDirection: Vector3;
  /** 0 by day to 1 at night. */
  night: number;
  /** In metres. */
  cameraPosition: Vector3;
}

/** The uniforms the clouds own. Every shader that shows the sky or its shadows shares them. */
export interface CloudUniforms {
  /** The two sky pictures being blended, and how far from A to B. */
  uCloudA: { value: Texture | null };
  uCloudB: { value: Texture | null };
  uCloudMix: { value: number };
  /** How far the clouds of each have drifted since it was drawn, in km: A's x and z, then B's. */
  uCloudShift: { value: Vector4 };
  /** The map of the clouds' shadows. */
  uCloudShade: { value: Texture | null };
  /** How much of the sun reaches the camera through the clouds. */
  uSunThru: { value: number };
  /** The wind's strength. */
  uWind: { value: number };
}

export interface Clouds {
  uniforms: CloudUniforms;
  shadeMap: WebGLRenderTarget;
  /** How much of the sun reaches the camera through the clouds, 0 to 1, as of the last update. */
  readonly sunThrough: number;
  update(frame: CloudsFrame): void;
}

const config = cloudsConfig;
const PICTURES = 3;
// A frame that took longer than this is counted as this: a pause must not skip the weather on.
const LONGEST_FRAME = 0.5;

function driftSpeed(wind: number): number {
  return config.driftSpeed * Math.pow(wind / skyConfig.wind.usualBreeze, 1.3);
}

function boilSpeed(wind: number): number {
  return (
    config.boilSpeedInCalm +
    config.boilSpeedFromWind * Math.pow(wind / skyConfig.wind.usualBreeze, 1.6)
  );
}

function createFieldUniforms(noise: CloudPicture, weatherMap: CloudPicture, size: Vector2) {
  return {
    uWeather: { value: 1 },
    uN3: { value: noise.texture },
    uWx: { value: weatherMap.texture },
    uLight: { value: new Vector3(0, 1, 0) },
    uCT: { value: new Vector4() },
    uEvo: { value: new Vector4() },
    uCRes: { value: size },
  };
}

function fieldDefines(): Record<string, string> {
  return {
    EARTH_CURVE: glslFloat(config.earthCurve),
    SUNSET_LANE: glslVec2(Math.sin(config.sunsetBearing), Math.cos(config.sunsetBearing)),
    SUNRISE_LANE: glslVec2(Math.sin(config.sunriseBearing), Math.cos(config.sunriseBearing)),
  };
}

function createPicture(width: number, height: number): WebGLRenderTarget {
  const picture = new WebGLRenderTarget(width, height, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
  picture.texture.generateMipmaps = false;
  // Only the strip being redrawn is touched.
  picture.scissorTest = true;
  return picture;
}

export function createClouds(dependencies: CloudsDependencies): Clouds {
  const { renderer, weather, noise, weatherMap, pictureWidth } = dependencies;
  const pictureHeight = pictureWidth / 8;
  const stripWidth = pictureWidth / config.pictureStrips;
  const shadeStripWidth = config.shadeMapSize / config.shadeMapStrips;

  const skyPictures = [0, 1, 2].map(() => {
    const picture = createPicture(pictureWidth, pictureHeight);
    picture.texture.wrapS = RepeatWrapping;
    return picture;
  });
  const bakeUniforms = createFieldUniforms(
    noise,
    weatherMap,
    new Vector2(pictureWidth, pictureHeight),
  );
  const bakeScene = new Scene();
  const wholePictureCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bakeQuad = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({
      uniforms: bakeUniforms,
      defines: fieldDefines(),
      depthTest: false,
      depthWrite: false,
      vertexShader: wholePictureShader,
      fragmentShader: bakeShader,
    }),
  );
  bakeQuad.frustumCulled = false;
  bakeScene.add(bakeQuad);

  const shadeMap = createPicture(config.shadeMapSize, config.shadeMapSize);
  const shadeUniforms = {
    ...createFieldUniforms(
      noise,
      weatherMap,
      new Vector2(config.shadeMapSize, config.shadeMapSize),
    ),
    uStrength: { value: 1 },
  };
  const shadeScene = new Scene();
  const shadeQuad = new Mesh(
    bakeQuad.geometry,
    new ShaderMaterial({
      uniforms: shadeUniforms,
      defines: { ...fieldDefines(), SHADE_SPAN: glslFloat(config.shadeMapSpan) },
      depthTest: false,
      depthWrite: false,
      vertexShader: wholePictureShader,
      fragmentShader: shadeShader,
    }),
  );
  shadeQuad.frustumCulled = false;
  shadeScene.add(shadeQuad);

  const moonDirection = new Vector3(...config.moonDirection).normalize();
  const field = createCloudField(noise.pixels, weatherMap.pixels);
  const uniforms: CloudUniforms = {
    uCloudA: { value: null },
    uCloudB: { value: null },
    uCloudMix: { value: 0 },
    uCloudShift: { value: new Vector4() },
    uCloudShade: { value: null },
    uSunThru: { value: 1 },
    uWind: { value: skyConfig.wind.usualBreeze },
  };

  // The clouds' two clocks, in seconds at the usual breeze: how far they have drifted and how
  // far they have boiled; with how cloudy it is, the moment the cloud field is at.
  const now: CloudMoment = { cloudCover: 1, drift: 0, boil: 0 };
  // Which picture is which: the sky slides from `shownFrom` to `shownTo` while `beingDrawn` is
  // redrawn. `drawnFor` is the drift clock at the moment each picture shows.
  let shownFrom = 0;
  let shownTo = 1;
  let beingDrawn = 2;
  const drawnFor = [0, 0, 0];
  let stripsDrawn = 0;
  let shadeStrip = 0;
  let hasShade = false;
  let sunThrough = 1;
  // The sky takes as long to slide from one picture to the next as the next took to draw.
  let slideSeconds = 1.2;
  let slideBegan = 0;
  let drawingBegan = 0;
  let isFirstFrame = true;
  let isDrawing = false;
  let isWarmingUp = false;
  let picturesBegun = 0;
  let momentDrawnWithClockStopped = '';

  /** Sets a shader's uniforms to where the cloud field is with the clocks at `drift` and `boil`. */
  function showMoment(fieldUniforms: typeof bakeUniforms, drift: number, boil: number): void {
    fieldUniforms.uWeather.value = weather.cloudCover.now;
    fieldUniforms.uCT.value.set(
      config.startsAt[0] + config.drift[0] * drift,
      config.startsAt[1] + config.drift[1] * drift,
      0,
      0,
    );
    // The shapes slide a little against the weather map, rise slowly, and their fine lumps
    // rise faster: clouds that boil.
    fieldUniforms.uEvo.value.set(
      0.0018 * boil,
      -0.0011 * boil,
      (boil * 0.0012) % 1,
      (boil * 0.0063) % 1,
    );
  }

  /** Sets up a redraw showing the clouds as they will be `secondsAhead` from now. */
  function beginPicture(secondsAhead: number, frame: CloudsFrame): void {
    const wind = weather.wind.now;
    const drift = now.drift + secondsAhead * driftSpeed(wind);
    showMoment(bakeUniforms, drift, now.boil + secondsAhead * boilSpeed(wind));
    // A different grain in each picture, so that it averages away.
    bakeUniforms.uCT.value.w = (picturesBegun++ * 7.31) % 64;
    bakeUniforms.uLight.value.copy(frame.night > 0.5 ? moonDirection : frame.sunDirection);
    drawnFor[beingDrawn] = drift;
    stripsDrawn = 0;
  }

  function drawStrips(count: number): void {
    const picture = skyPictures[beingDrawn];
    for (let i = 0; i < count && stripsDrawn < config.pictureStrips; i++) {
      picture.scissor.set(stripsDrawn * stripWidth, 0, stripWidth, pictureHeight);
      renderer.setRenderTarget(picture);
      renderer.render(bakeScene, wholePictureCamera);
      stripsDrawn++;
    }
    renderer.setRenderTarget(null);
  }

  /** Empty skies for the very first picture to fade in from. */
  function emptyThePictures(): void {
    const clearColour = new Color();
    const clearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(clearColour);
    renderer.setClearColor(0, 0);
    for (const picture of skyPictures) {
      picture.scissor.set(0, 0, pictureWidth, pictureHeight);
      renderer.setRenderTarget(picture);
      renderer.clear();
    }
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearColour, clearAlpha);
  }

  /** With the clock stopped: one complete picture for the moment, drawn once. */
  function drawForStoppedClock(frame: CloudsFrame): void {
    const { time, sunDirection } = frame;
    const wind = weather.wind.now;
    const moment = `${time},${sunDirection.x.toFixed(3)},${sunDirection.y.toFixed(3)},${frame.night.toFixed(2)},${weather.cloudCover.now},${wind}`;
    if (moment === momentDrawnWithClockStopped) return;

    momentDrawnWithClockStopped = moment;
    now.drift = time * driftSpeed(wind);
    now.boil = time;
    beginPicture(0, frame);
    drawStrips(config.pictureStrips);
    shownTo = beingDrawn;
    shownFrom = beingDrawn;
    beingDrawn = (beingDrawn + 1) % PICTURES;
    isFirstFrame = false;
  }

  /** Draws a little more of the picture being redrawn; returns how far the sky has slid. */
  function drawAsTimePasses(frame: CloudsFrame): number {
    const { time } = frame;
    if (isFirstFrame) {
      emptyThePictures();
      isFirstFrame = false;
      isWarmingUp = true;
      stripsDrawn = config.pictureStrips;
      slideBegan = time - 9;
    }

    let slid = Math.min(1, (time - slideBegan) / slideSeconds);
    if (stripsDrawn >= config.pictureStrips && slid >= 1) {
      // The picture being redrawn is finished and the sky has finished sliding to the newest
      // one: they take turns.
      if (isDrawing) {
        slideSeconds = Math.max(0.4, Math.min(3, time - drawingBegan));
        const oldest = shownFrom;
        shownFrom = shownTo;
        shownTo = beingDrawn;
        beingDrawn = oldest;
        slideBegan = time;
        slid = 0;
        isWarmingUp = false;
      }
      isDrawing = true;
      drawingBegan = time;
      // It will be on show from one slide to three slides from now.
      beginPicture(2 * slideSeconds, frame);
    }

    // In a high wind the clouds travel far between redraws, so the sky is redrawn two or three
    // times as often. The very first picture is drawn fast.
    const speed = driftSpeed(weather.wind.now);
    drawStrips(isWarmingUp ? 8 : speed > 4.6 ? 3 : speed > 3.6 ? 2 : 1);
    return slid;
  }

  // Shadows fade out as the sun gets low: they would be many kilometres long, and from clouds
  // that this map does not reach.
  function drawShadeMap(frame: CloudsFrame): void {
    const drawsItAll = frame.isClockStopped || (shadeStrip === 0 && !hasShade);
    showMoment(shadeUniforms, now.drift, now.boil);
    shadeUniforms.uLight.value.copy(frame.sunDirection);
    shadeUniforms.uStrength.value = smoothstep(0.04, 0.16, frame.sunDirection.y);
    const strips = drawsItAll ? config.shadeMapStrips : 1;
    for (let i = 0; i < strips; i++) {
      shadeMap.scissor.set(shadeStrip * shadeStripWidth, 0, shadeStripWidth, config.shadeMapSize);
      renderer.setRenderTarget(shadeMap);
      renderer.render(shadeScene, wholePictureCamera);
      shadeStrip = (shadeStrip + 1) % config.shadeMapStrips;
    }
    renderer.setRenderTarget(null);
    hasShade = true;
  }

  return {
    uniforms,
    shadeMap,
    get sunThrough() {
      return sunThrough;
    },

    update(frame) {
      let slid = 1;
      if (frame.isClockStopped) {
        drawForStoppedClock(frame);
      } else {
        const seconds = Math.min(frame.realSeconds, LONGEST_FRAME);
        weather.update(seconds);
        now.drift += seconds * driftSpeed(weather.wind.now);
        now.boil += seconds * boilSpeed(weather.wind.now);
        slid = drawAsTimePasses(frame);
      }
      now.cloudCover = weather.cloudCover.now;
      drawShadeMap(frame);

      const { cameraPosition } = frame;
      const through = field.sunThrough(
        cameraPosition.x / 1000,
        cameraPosition.z / 1000,
        frame.sunDirection,
        now,
      );
      // Eased, so that a cloud's edge does not flicker the light.
      sunThrough = frame.isClockStopped
        ? through
        : sunThrough + (through - sunThrough) * Math.min(1, frame.dt * 3);

      uniforms.uSunThru.value = sunThrough;
      uniforms.uCloudShade.value = shadeMap.texture;
      uniforms.uCloudA.value = skyPictures[shownFrom].texture;
      uniforms.uCloudB.value = skyPictures[shownTo].texture;
      uniforms.uCloudMix.value = slid;
      uniforms.uWind.value = weather.wind.now;
      const sinceFrom = now.drift - drawnFor[shownFrom];
      const sinceTo = now.drift - drawnFor[shownTo];
      uniforms.uCloudShift.value.set(
        config.drift[0] * sinceFrom,
        config.drift[1] * sinceFrom,
        config.drift[0] * sinceTo,
        config.drift[1] * sinceTo,
      );
    },
  };
}
