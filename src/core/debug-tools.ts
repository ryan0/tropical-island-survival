import type { DirectionalLight, ShaderMaterial, WebGLRenderer } from 'three';
import type { Breaker } from '../sea/breaker';
import type { CrestLine } from '../sea/crest-line';
import type { CrestPicture } from '../sea/crest-picture';
import type { SeaFloorPictures } from '../sea/sea-floor-pictures';
import type { Spray } from '../sea/spray';
import type { Water } from '../sea/water';
import type { Player } from '../player/player';
import { FULL_TURN } from './maths';
import type { BuildInfo } from '../ui/build-label';
import type { DebugAction, DebugSwitch } from '../ui/debug-panel';
import type { FrameRateLabel } from '../ui/frame-rate-label';
import type { InstanceCells, InstanceKind } from '../world/instance-cells';
import type { IslandShape } from '../world/island-shape';
import type { Terrain } from '../world/terrain';
import type { AutomaticQuality } from './automatic-quality';
import type { FrameMeter } from './frame-meter';
import { SEA_DRAINED, type SharedUniforms } from './shared-uniforms';
import type { TestHooks } from './test-hooks';

/** The graphics card's own name for itself, where the browser will say. */
function graphicsCardName(context: WebGLRenderingContext | WebGL2RenderingContext): string {
  try {
    const extension = context.getExtension('WEBGL_debug_renderer_info');
    if (extension === null) return 'n/a';
    return String(context.getParameter(extension.UNMASKED_RENDERER_WEBGL));
  } catch {
    return 'n/a';
  }
}

function fragmentPrecisionBits(context: WebGLRenderingContext | WebGL2RenderingContext): string {
  try {
    const format = context.getShaderPrecisionFormat(context.FRAGMENT_SHADER, context.HIGH_FLOAT);
    return format === null ? 'none' : String(format.precision);
  } catch {
    return 'n/a';
  }
}

/**
 * The lines at the top of the debug panel: which build this is and what it is running on.
 * They helped find a bug that showed only on one phone (docs/DEVICE_NOTES.md).
 */
export function describeBuild(
  renderer: WebGLRenderer,
  build: BuildInfo,
  water: Water,
  quality: AutomaticQuality,
  seaFloor: SeaFloorPictures,
  crests: CrestPicture,
  breaker: Breaker,
): string[] {
  const context = renderer.getContext();
  const webGl = renderer.capabilities.isWebGL2 ? '2' : '1';
  return [
    `build v${build.version} · ${build.commit} · WebGL${webGl} · frag highp bits ${fragmentPrecisionBits(context)} · three precision ${renderer.capabilities.precision}`,
    `GPU: ${graphicsCardName(context)}`,
    `water: ${water.waveMeshDescription} · breaker ${breaker.description} · quality stage ${quality.stage} · pixel ratio ${renderer.getPixelRatio()}`,
    `sea floor pictures: ${seaFloor.size} dots across, made in ${seaFloor.madeInMilliseconds.toFixed(0)} ms · a crest found in ${(crests.shareOfDirectionsFound * 100).toFixed(0)}% of directions`,
  ];
}

/**
 * How fast the page is running and how much it is drawing, for the phone to report. A phone draws
 * no faster than its screen refreshes, so at full speed the frame rate says nothing of what is
 * to spare: the program's own time for a frame does.
 */
export function describeSpeed(renderer: WebGLRenderer, frames: FrameMeter): string {
  const { calls, triangles } = renderer.info.render;
  return [
    `${frames.framesPerSecond.toFixed(0)} frames a second`,
    `slowest ${frames.slowestFrameMilliseconds.toFixed(0)} ms`,
    `program ${frames.programMilliseconds.toFixed(1)} ms a frame`,
    `${calls} draws`,
    `${Math.round(triangles / 1000)} thousand triangles`,
  ].join(' · ');
}

/**
 * The places the water's colouring can be ended at (water.frag.glsl's WATER_STOPS_AFTER_...), in the
 * order the shader works.
 */
const WATER_STAGES = [
  { label: 'the depth', define: 'WATER_STOPS_AFTER_DEPTH' },
  { label: 'the ripples', define: 'WATER_STOPS_AFTER_RIPPLES' },
  { label: 'the mirror', define: 'WATER_STOPS_AFTER_MIRROR' },
  { label: 'the colour', define: 'WATER_STOPS_AFTER_COLOUR' },
  { label: 'the white horses', define: 'WATER_STOPS_AFTER_WHITE_HORSES' },
  { label: 'the foam', define: 'WATER_STOPS_AFTER_FOAM' },
] as const;

/** The keys that fly, for whoever has a keyboard. */
export const FLYING_KEYS =
  'flying: Space up · C down (or Ctrl, but Ctrl with W closes the tab) · Shift fast · wheel sets the pace';

/**
 * Where the eye is, to say where something was seen: and the ground under it, and how far along
 * the reef and in which direction from the atoll's centre that is, as the island's shape counts
 * them (0 degrees east, 90 south).
 */
export function describeEye(eye: { x: number; y: number; z: number }, island: IslandShape): string {
  const direction = Math.atan2(eye.z, eye.x);
  const offshore = Math.hypot(eye.x, eye.z) - island.radius(direction);
  const ground = island.groundHeight(eye.x, eye.z);
  const degrees = ((direction / FULL_TURN) * 360 + 360) % 360;
  return [
    `eye at x ${eye.x.toFixed(0)}, z ${eye.z.toFixed(0)}`,
    `${eye.y.toFixed(1)} m above the sea`,
    ground < 0 ? `floor ${(-ground).toFixed(1)} m down` : `ground ${ground.toFixed(1)} m up`,
    offshore > 0
      ? `${island.alongReef(offshore, direction).toFixed(0)} m along the reef at ${degrees.toFixed(0)}°`
      : `at ${degrees.toFixed(0)}°`,
  ].join(' · ');
}

/** The everyday switches: for looking at the scene and at what the waves are doing. */
export function debugSwitches(
  water: Water,
  uniforms: SharedUniforms,
  testHooks: TestHooks,
  player: Pick<Player, 'setFlying' | 'isFlying'>,
  frameRate: FrameRateLabel,
  crestLine: CrestLine,
): DebugSwitch[] {
  // Only one of these can be on at a time: each button shows whether its own is.
  const waterDebug = (mode: number) => ({
    set(on: boolean) {
      uniforms.uDebugMode.value = on ? mode : 0;
    },
    isOn: () => uniforms.uDebugMode.value === mode,
  });
  return [
    { label: 'fly', key: 'f', set: player.setFlying, isOn: () => player.isFlying },
    { label: 'drain the sea', key: 'g', ...waterDebug(SEA_DRAINED) },
    { label: 'frame rate', set: frameRate.show, isOn: () => frameRate.isShown },
    {
      label: 'wireframe',
      set(on) {
        water.waveMaterial.wireframe = on;
      },
    },
    { label: 'freeze waves', set: testHooks.stopClock },
    { label: 'waves off', ...waterDebug(1) },
    { label: 'no falling lip', ...waterDebug(2) },
    { label: 'plain water colour', ...waterDebug(3) },
    { label: 'sea floor pictures', ...waterDebug(4) },
    { label: 'breaking crests', set: crestLine.show, isOn: () => crestLine.isShown },
  ];
}

/** Sets or clears a define on the sea's two great sheets, the wave mesh and the far sea (which is also the lagoon). */
function defineOnTheSea(water: Water, define: string, isDefined: boolean): void {
  for (const material of [water.waveMaterial, water.farSea.material as ShaderMaterial]) {
    // (three.js leaves out a define whose value is false)
    material.defines[define] = isDefined ? '' : false;
    material.needsUpdate = true;
  }
}

/** What the cost switches can leave out, or draw plainly, besides the water. */
export interface LandToLeaveOut {
  instanceCells: Pick<InstanceCells, 'show' | 'isShown'>;
  terrain: Terrain;
  /** The sky dome's material. */
  sky: ShaderMaterial;
  sunLight: DirectionalLight;
}

/** The heading over `frameCostSwitches`. */
export const FRAME_COST_HEADING = 'what a frame costs: read the frame rate with one on';

/**
 * Switches for finding where a slow frame goes on the phone, which nothing but the phone can say
 * (docs/DEVICE_NOTES.md): each leaves something out or draws it more simply, and the frame rate
 * with it on says what that thing costs.
 */
export function frameCostSwitches(
  water: Water,
  uniforms: SharedUniforms,
  breaker: Breaker,
  spray: Pick<Spray, 'throwFromCrest' | 'isThrownFromCrest'>,
  quality: Pick<AutomaticQuality, 'drawMoreDots' | 'isDrawingMoreDots'>,
  land: LandToLeaveOut,
): DebugSwitch[] {
  const leaveOut = (kind: InstanceKind): DebugSwitch => ({
    label: `hide ${kind}`,
    set(on) {
      land.instanceCells.show(kind, !on);
    },
    isOn: () => !land.instanceCells.isShown(kind),
  });
  return [
    {
      // Once the frame rate is at the screen's own 60, which hides what anything costs: half as many dots
      // again each way, so that every dot's work counts two and a quarter times over and the frame rate falls
      // to where the other switches can be told apart. Automatic quality stands still meanwhile.
      label: 'more dots',
      set: quality.drawMoreDots,
      isOn: () => quality.isDrawingMoreDots,
    },
    // (each kind of thing left out of the picture and of the shadows)
    leaveOut('plants'),
    leaveOut('rocks'),
    leaveOut('coral'),
    {
      label: 'hide ground',
      set(on) {
        land.terrain.tiles.visible = !on;
      },
    },
    {
      // What the ground's colouring costs: the ground in the plain colour of its corners, with none of
      // terrain-colour.glsl worked out (TERRAIN_BARE). What is left is its triangles.
      label: 'plain ground',
      set(on) {
        const { material } = land.terrain;
        material.defines = { ...material.defines, TERRAIN_BARE: on ? '' : false };
        material.needsUpdate = true;
      },
    },
    {
      // What the sky costs: the dome in one flat colour (sky.frag.glsl's SKY_BARE).
      label: 'plain sky',
      set(on) {
        land.sky.defines.SKY_BARE = on ? '' : false;
        land.sky.needsUpdate = true;
      },
    },
    {
      // What the sun's shadows cost: none are cast (the same as automatic quality's second step down).
      label: 'no shadows',
      set(on) {
        land.sunLight.castShadow = !on;
      },
      isOn: () => !land.sunLight.castShadow,
    },
    {
      label: 'hide wave mesh',
      set(on) {
        water.waveMesh.visible = !on;
      },
    },
    {
      label: 'hide far sea',
      set(on) {
        water.farSea.visible = !on;
      },
    },
    // (without it the sea shows what it does under the breaking wave's front)
    { label: 'breaker mesh', key: 'b', set: breaker.show, isOn: () => breaker.isShown },
    // (the spray along the breaking crest: read the frame rate beside a breaking wave with and without)
    { label: 'crest spray', set: spray.throwFromCrest, isOn: () => spray.isThrownFromCrest },
    // (what the wave mesh's points cost: no tile of it at its finest)
    { label: 'coarse wave mesh', set: water.drawWaveMeshCoarsely },
    {
      // What the wave mesh's colouring costs, all of it: the mesh drawn in one flat colour (water.frag.glsl's
      // WATER_BARE). What is left is its points and the filling of its triangles.
      label: 'bare wave mesh',
      set(on) {
        water.waveMaterial.defines.WATER_BARE = on ? '' : false;
        water.waveMaterial.needsUpdate = true;
      },
    },
    {
      // The sea and the lagoon working the island's formula out for every dot, as they did until 19 November
      // 2026, where they now read the ground's height from a picture made from it (water.frag.glsl's
      // WATER_FLOOR_FROM_PICTURE; sea/floor-height-picture.ts): to compare the look and the frame rate. (The
      // breaker's mesh and the lagoon's shore band keep to the picture.)
      label: 'floor from the formula',
      set(on) {
        if (uniforms.uFloorHeight.value !== null)
          defineOnTheSea(water, 'WATER_FLOOR_FROM_PICTURE', !on);
      },
      isOn: () => water.waveMaterial.defines.WATER_FLOOR_FROM_PICTURE !== '',
    },
    {
      // The same for the shore: its formula worked out for every dot, where the sea and the lagoon now read it
      // from a picture of the shore round the atoll (WATER_SHORE_FROM_PICTURE; sea/shore-round-picture.ts).
      label: 'shore from the formula',
      set(on) {
        defineOnTheSea(water, 'WATER_SHORE_FROM_PICTURE', !on);
      },
      isOn: () => water.waveMaterial.defines.WATER_SHORE_FROM_PICTURE !== '',
    },
  ];
}

/** The heading over `waterStageSwitches`. */
export const WATER_STAGES_HEADING = "end the water's colouring after";

/**
 * Switches that end the colouring of the sea and the lagoon part-way and draw what has been worked
 * out so far, in the order the shader works: read with the frame rate, they say which part of the
 * colouring costs the frames. Only one can be on at a time.
 */
export function waterStageSwitches(water: Water): DebugSwitch[] {
  return WATER_STAGES.map((stage) => ({
    label: stage.label,
    set(on: boolean) {
      for (const other of WATER_STAGES) defineOnTheSea(water, other.define, on && other === stage);
    },
    isOn: () => water.waveMaterial.defines[stage.define] === '',
  }));
}

interface PlaceToFlyTo {
  label: string;
  /** The direction from the atoll's centre (radians: 0 east, a quarter turn south). */
  direction: number;
  /** How far out from the centre the eye is, and how high. */
  fromCentre: number;
  height: number;
  /** Whether it faces out to sea, or back at the atoll. */
  facesOut: boolean;
  /** How far down it looks (radians, negative down). */
  pitch: number;
}

function lookingOut(
  label: string,
  direction: number,
  fromCentre: number,
  height: number,
  pitch: number,
): PlaceToFlyTo {
  return { label, direction, fromCentre, height, facesOut: true, pitch };
}

function lookingBack(
  label: string,
  direction: number,
  fromCentre: number,
  height: number,
  pitch: number,
): PlaceToFlyTo {
  return { label, direction, fromCentre, height, facesOut: false, pitch };
}

/** Places to fly the eye to, for looking at the reef: direction, distance from the centre, height, pitch. */
const PLACES_TO_FLY_TO: PlaceToFlyTo[] = [
  lookingOut('home beach', 1.5708, 172, 6, -0.1),
  lookingOut('ridge', 1.5708, 286, 10, -0.3),
  lookingBack('reef front', 1.5708, 410, 12, -0.2),
  lookingOut('wide notch', 2.05, 235, 40, -0.75),
  lookingOut('east notch', 0.95, 245, 35, -0.75),
  lookingOut('small notch', 2.6, 240, 30, -0.75),
  lookingOut('east flank', 0.2, 235, 40, -0.7),
  lookingOut('pass', 3.55, 160, 45, -0.55),
  lookingBack('lee wall', 4.7124, 330, 20, -0.3),
  lookingOut('lagoon hole', 5.55, 20, 30, -0.75),
  lookingBack('above', 1.5708, 10, 395, -1.5),
];

/** The debug panel's buttons that fly the eye to a place. */
export function placesToFlyTo(player: Pick<Player, 'flyTo'>): DebugAction[] {
  return PLACES_TO_FLY_TO.map(({ label, direction, fromCentre, height, facesOut, pitch }) => ({
    label,
    run() {
      const outX = Math.cos(direction);
      const outZ = Math.sin(direction);
      // The eye looks along (-sin yaw, -cos yaw).
      const yaw = facesOut ? Math.atan2(-outX, -outZ) : Math.atan2(outX, outZ);
      player.flyTo(outX * fromCentre, height, outZ * fromCentre, yaw, pitch);
    },
  }));
}
