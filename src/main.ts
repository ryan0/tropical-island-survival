import { createAudio } from './audio/audio';
import { createAutomaticQuality } from './core/automatic-quality';
import { debugSwitches, describeBuild, describeEye, describeSpeed } from './core/debug-tools';
import { createFrameMeter } from './core/frame-meter';
import { createRandomStreams } from './core/random';
import { createSharedUniforms } from './core/shared-uniforms';
import { createStage } from './core/stage';
import { createTestHooks } from './core/test-hooks';
import { createView } from './core/view';
import { createLife, type LifeFrame } from './life/life';
import { createFootprints } from './player/footprints';
import { createPlayer, type PlayerFrame } from './player/player';
import { seaConfig } from './sea/sea-config';
import { createSpray, type SprayFrame } from './sea/spray';
import { createUnderWater } from './sea/under-water';
import { createWater, type WaterFrame } from './sea/water';
import { createWaterMaterials } from './sea/water-materials';
import { createWaveModel } from './sea/wave-model';
import { createDetailTexture } from './shaders/detail-texture';
import { createCloudNoise } from './sky/cloud-noise';
import { createClouds, type CloudsFrame } from './sky/clouds';
import { cloudsConfig } from './sky/clouds-config';
import { createDayCycle } from './sky/day-cycle';
import { createLights, type LightsFrame } from './sky/lights';
import { createSkyDome } from './sky/sky-dome';
import { createSkyLight } from './sky/sky-light';
import { createSunGlare, type SunGlareFrame } from './sky/sun-glare';
import { createWeather, windDirection } from './sky/weather';
import { createWeatherMap } from './sky/weather-map';
import { showBuildLabel } from './ui/build-label';
import { watchCornerButton } from './ui/corner-button';
import { createDebugPanel } from './ui/debug-panel';
import { createSceneMenu } from './ui/scene-menu';
import { watchSoundButton } from './ui/sound-button';
import { createBeachFinds } from './world/beach/beach-finds';
import { createCamp } from './world/camp/camp';
import { createFire } from './world/camp/fire';
import { createInstanceCells } from './world/instance-cells';
import { createIslandShape } from './world/island-shape';
import { createLandmarks } from './world/landmarks';
import { createFlowers } from './world/plants/flowers';
import { createGrass } from './world/plants/grass';
import { createPalms } from './world/plants/palms';
import { createPlants } from './world/plants/plants';
import { createReef } from './world/reef/reef';
import { createRocks } from './world/rocks/rocks';
import { createTerrain } from './world/terrain';
import { worldConfig } from './world/world-config';

// Builds every system, wires them together and runs the frame loop.
//
// three.js numbers its objects as they are made and draws by those numbers where nothing else
// decides, so moving a line here can change which of two things is drawn first. It cannot move
// anything: each kind of thing that is placed draws from a random stream of its own, by name.

function pageElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`the page has no #${id}`);
  return element;
}

const build = { version: import.meta.env.BUILD_VERSION, commit: import.meta.env.BUILD_COMMIT };
const testHooks = createTestHooks();
const { renderer, canvas, scene, camera, fog } = createStage(
  pageElement('err'),
  pageElement('hint'),
);
const randomStream = createRandomStreams(worldConfig.seed);
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
const { hasCamp } = worldConfig;

// ---- the sky's pictures, and the uniforms every shader shares ----
const detailTexture = createDetailTexture(maxAnisotropy);
const weather = createWeather();
const cloudPictureWidth = testHooks.cloudPictureWidth ?? cloudsConfig.pictureWidth;
const clouds = createClouds({
  renderer,
  weather,
  noise: createCloudNoise(),
  weatherMap: createWeatherMap(),
  pictureWidth: cloudPictureWidth,
});
const instanceCells = createInstanceCells(scene);
const dayCycle = createDayCycle();
const skyLight = createSkyLight();
const uniforms = createSharedUniforms(detailTexture, skyLight.uniforms, clouds.uniforms);
const cloudShadeSpan = cloudsConfig.shadeMapSpan * 1000;

// ---- the land, the lights and the sky ----
const island = createIslandShape();
const landmarks = createLandmarks(island.groundHeight, island.radius);
createTerrain({
  scene,
  random: randomStream('terrain'),
  groundHeight: island.groundHeight,
  landmarks,
  uniforms,
  windDirection: windDirection(),
  cloudShadeSpan,
});
const lights = createLights({ scene, renderer, camera });
const skyDome = createSkyDome({
  scene,
  uniforms,
  cloudPictureWidth,
  cloudPictureHeight: clouds.pictureHeight,
});
const sunGlare = createSunGlare(pageElement('glare'), camera);

// ---- the sea ----
const waves = createWaveModel(island);
const waterMaterials = createWaterMaterials({
  uniforms,
  home: landmarks.home,
  cloudShadeSpan,
  windDirection: windDirection(),
});
const water = createWater({
  scene,
  camera,
  island,
  sandbank: island.sandbank,
  createMaterial: waterMaterials.create,
});

// ---- what stands and grows on the island, and what lives there ----
const rocks = createRocks({
  random: randomStream('rocks'),
  island,
  landmarks,
  hasCamp,
  uniforms,
  instanceCells,
});
const palms = createPalms({
  random: randomStream('palms'),
  groundHeight: island.groundHeight,
  landmarks,
  sandbank: island.sandbank,
  isInRock: rocks.isInRock,
  uniforms,
  instanceCells,
  maxAnisotropy,
});
createGrass({
  random: randomStream('grass'),
  groundHeight: island.groundHeight,
  landmarks,
  sandbank: island.sandbank,
  isInRock: rocks.isInRock,
  uniforms,
  instanceCells,
});
createPlants({
  random: randomStream('plants'),
  groundHeight: island.groundHeight,
  landmarks,
  isInRock: rocks.isInRock,
  palmFrondPicture: palms.frondPicture,
  instanceCells,
  maxAnisotropy,
});
createFlowers({
  scene,
  random: randomStream('flowers'),
  groundHeight: island.groundHeight,
  isInRock: rocks.isInRock,
  landmarks,
});
createBeachFinds({
  scene,
  randomStream,
  groundHeight: island.groundHeight,
  isInRock: rocks.isInRock,
  home: landmarks.home,
});
const reef = createReef({
  randomStream,
  groundHeight: island.groundHeight,
  landmarks,
  isInRock: rocks.isInRock,
  createRockMaterial: rocks.createMaterial,
  uniforms,
  instanceCells,
});
uniforms.uReefMap.value = reef.map;
// The camp and its fire are a starting point for what the player will build; for now there is neither.
const fire = hasCamp
  ? createFire({ scene, uniforms, groundHeight: island.groundHeight, place: landmarks.fire })
  : null;
if (hasCamp) {
  createCamp({
    scene,
    random: randomStream('camp'),
    groundHeight: island.groundHeight,
    landmarks,
  });
}
const life = createLife({
  scene,
  randomStream,
  groundHeight: island.groundHeight,
  islandRadius: island.radius,
  home: landmarks.home,
  hut: landmarks.hut,
  pier: landmarks.pier,
  coralHeads: reef.heads,
});

// ---- the player, and the sea round the player ----
const player = createPlayer({
  camera,
  canvas,
  elements: {
    title: pageElement('title'),
    hint: pageElement('hint'),
    joystickPad: pageElement('joy'),
    joystickKnob: pageElement('knob'),
    caption: pageElement('cap'),
  },
  island,
  sandbank: island.sandbank,
  landmarks,
  hasCamp,
  waves,
});
const footprints = createFootprints({
  scene,
  groundHeight: island.groundHeight,
  waves,
  player,
});
const underWater = createUnderWater({
  scene,
  camera,
  waves,
  fog,
  overlay: pageElement('uw'),
  uniforms,
});
const audio = createAudio();
// The biggest things standing in the surf also go to the water's shader, which draws foam round them.
const rocksInSurf = [...rocks.inSurf].sort((a, b) => b.radius - a.radius);
rocksInSurf.slice(0, uniforms.uSurfObstacles.value.length).forEach((rock, index) => {
  uniforms.uSurfObstacles.value[index].set(rock.x, rock.z, rock.radius);
});
const spray = createSpray({
  scene,
  camera,
  random: randomStream('spray'),
  waves,
  islandRadius: island.radius,
  obstacles: rocksInSurf,
  hearSurf: audio.setSurfBreaking,
});

// ---- the page's controls ----
const view = createView(renderer, camera);
const quality = createAutomaticQuality(
  renderer,
  view,
  lights.sunLight,
  testHooks.isAutomaticQualityOff,
);
const frameMeter = createFrameMeter();
const soundButton = pageElement('snd');
watchSoundButton(soundButton, audio.toggle);
const menu = createSceneMenu(document.body, {
  chooseTime(phase) {
    dayCycle.hold(phase !== null);
    dayCycle.hurryTo(phase);
  },
  chooseCloudCover: weather.cloudCover.choose,
  chooseWind: weather.wind.choose,
  soundButton,
});
const debugPanel = createDebugPanel(
  document.body,
  () => [
    ...describeBuild(renderer, build, water, quality),
    describeSpeed(renderer, frameMeter),
    describeEye(camera.position),
  ],
  debugSwitches(water, uniforms, testHooks, player),
);
// The button in the corner names the time of day. A tap opens the menu; a long press, the debug panel.
const timeButton = pageElement('tod');
watchCornerButton(timeButton, { onTap: menu.toggle, onLongPress: debugPanel.toggle });
showBuildLabel(document.body, build);
testHooks.install({
  scene,
  camera,
  renderer,
  groundHeight: island.groundHeight,
  islandRadius: island.radius,
  waveHeight: waves.heightAt,
  waveShaderSource: waterMaterials.waveShaderSource,
  setWaveTime(time) {
    uniforms.uTime.value = time;
  },
  jumpToTimeOfDay: dayCycle.jumpTo,
  fixSunHeight: dayCycle.fixSunHeight,
  placePlayer(x, z, yaw, pitch) {
    player.place(x, z, yaw, pitch);
  },
  endIntro() {
    player.endIntro();
  },
});

// ---- the frame loop ----
// What each system is told every frame. The objects are made once and refilled: a frame must
// allocate nothing.
const sunDirection = uniforms.uSunDirection.value;
const light = skyLight.light;
const playerFrame: PlayerFrame = { time: 0, dt: 0, cameraOverride: undefined };
const cloudsFrame: CloudsFrame = {
  time: 0,
  dt: 0,
  realSeconds: 0,
  isClockStopped: false,
  sunDirection,
  night: 0,
  cameraPosition: camera.position,
};
const lightsFrame: LightsFrame = {
  sunDirection,
  daylight: 1,
  night: 0,
  sunElevation: 0,
  sunColour: light.sunColour,
  sunThrough: 1,
};
const lifeFrame: LifeFrame = {
  time: 0,
  waveTime: 0,
  dt: 0,
  daylight: 1,
  night: 0,
  waterLevel: 0,
  player: camera.position,
};
const sprayFrame: SprayFrame = {
  time: 0,
  dt: 0,
  daylight: 1,
  night: 0,
  isCameraUnderWater: false,
  pixelRatio: 1,
  viewHeight: 0,
};
const glareFrame: SunGlareFrame = {
  sunDirection,
  sunElevation: 0,
  night: 0,
  sunThrough: 1,
  isUnderWater: false,
  viewWidth: 0,
  viewHeight: 0,
};
const waterFrame: WaterFrame = { player: player.position, wind: 0, isCameraUnderWater: false };
// The turtle and the dolphins break the surface at the height the sea has off the pier's end.
const waterLevelX = landmarks.pier.x + 2.3;
const waterLevelZ = landmarks.pier.z0 + landmarks.pier.length - 3;
// No frame is taken to be longer than this, however long the phone took over it.
const LONGEST_STEP = 0.05;

const startedAt = performance.now();
let lastFrameAt = startedAt;

function frame(now: number): void {
  const begunAt = performance.now();
  const realSeconds = (now - lastFrameAt) / 1000;
  const dt = Math.min(LONGEST_STEP, realSeconds);
  const time = (now - startedAt) / 1000;
  lastFrameAt = now;
  const isClockStopped = testHooks.isClockStopped();

  quality.update(realSeconds, player.isIntroRunning);
  view.update();

  playerFrame.time = time;
  playerFrame.dt = dt;
  playerFrame.cameraOverride = testHooks.cameraPose();
  player.update(playerFrame);
  footprints.update(time);
  player.updatePlaceNames(dt);

  // The light of the moment, which most of what follows reads.
  dayCycle.update(dt, realSeconds, isClockStopped);
  skyLight.update(dayCycle.sunHeight(), dayCycle.isMorning());
  timeButton.textContent = light.timeOfDay;
  if (!isClockStopped) uniforms.uTime.value = time;
  uniforms.uSeaLevel.value = seaConfig.level;
  uniforms.uCameraPosition.value.copy(camera.position);
  fog.color.copy(uniforms.uSkyHorizon.value);
  skyDome.update(camera.position);

  if (isClockStopped) weather.set(testHooks.cloudCover(), testHooks.wind());
  cloudsFrame.time = uniforms.uTime.value;
  cloudsFrame.dt = dt;
  cloudsFrame.realSeconds = realSeconds;
  cloudsFrame.isClockStopped = isClockStopped;
  cloudsFrame.night = light.night;
  clouds.update(cloudsFrame);

  underWater.update(time, light.daylight, light.night);

  lightsFrame.daylight = light.daylight;
  lightsFrame.night = light.night;
  lightsFrame.sunElevation = light.sunElevation;
  lightsFrame.sunThrough = clouds.sunThrough;
  lights.update(lightsFrame);

  fire?.update(time, light.daylight);
  audio.update(light.night);

  lifeFrame.time = time;
  lifeFrame.waveTime = uniforms.uTime.value;
  lifeFrame.dt = dt;
  lifeFrame.daylight = light.daylight;
  lifeFrame.night = light.night;
  lifeFrame.waterLevel = waves.heightAt(waterLevelX, waterLevelZ, time);
  life.update(lifeFrame);

  // With the clock stopped the spray follows the stopped wave.
  sprayFrame.time = isClockStopped ? uniforms.uTime.value : time;
  sprayFrame.dt = dt;
  sprayFrame.daylight = light.daylight;
  sprayFrame.night = light.night;
  sprayFrame.isCameraUnderWater = underWater.isCameraUnder;
  sprayFrame.pixelRatio = renderer.getPixelRatio();
  sprayFrame.viewHeight = view.height;
  spray.update(sprayFrame);

  glareFrame.sunElevation = light.sunElevation;
  glareFrame.night = light.night;
  glareFrame.sunThrough = clouds.sunThrough;
  glareFrame.isUnderWater = underWater.isCameraUnder;
  glareFrame.viewWidth = view.width;
  glareFrame.viewHeight = view.height;
  sunGlare.update(glareFrame);

  waterFrame.wind = uniforms.uWind.value;
  waterFrame.isCameraUnderWater = underWater.isCameraUnder;
  water.update(waterFrame);
  uniforms.uShoreBandShown.value = water.isBandShown ? 1 : 0;

  instanceCells.update(camera.position);

  renderer.render(scene, camera);
  frameMeter.update(realSeconds, (performance.now() - begunAt) / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
