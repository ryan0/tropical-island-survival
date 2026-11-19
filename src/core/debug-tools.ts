import type { ShaderMaterial, WebGLRenderer } from 'three';
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
import type { IslandShape } from '../world/island-shape';
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
 * Switches that end the water's colouring part-way and draw what has been worked out so far
 * (water.frag.glsl's WATER_STOPS_AFTER_...), in the order the shader works: read with the frame
 * rate, they say which part of the colouring costs the frames. Only one can be on at a time.
 */
const WATER_STAGES = [
  { label: 'water: depth only', define: 'WATER_STOPS_AFTER_DEPTH' },
  { label: 'water: to ripples', define: 'WATER_STOPS_AFTER_RIPPLES' },
  { label: 'water: to mirror', define: 'WATER_STOPS_AFTER_MIRROR' },
  { label: 'water: to colour', define: 'WATER_STOPS_AFTER_COLOUR' },
  { label: 'water: to white horses', define: 'WATER_STOPS_AFTER_WHITE_HORSES' },
  { label: 'water: to foam', define: 'WATER_STOPS_AFTER_FOAM' },
] as const;

/**
 * The filtering the `sharper filtering` switch gives the detail and caustics textures: sharp
 * across the view at a low angle, as they were until 18 November 2026 (three.js asks for no more
 * than the graphics card offers).
 */
const SHARPER_FILTERING = 4;

/**
 * The pace the `slower ripples` switch sets, against the usual 1: the pace they had until 18
 * November 2026, a quarter of what real ripples run at.
 */
const SLOWER_RIPPLES = 0.25;

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

export function debugSwitches(
  water: Water,
  uniforms: SharedUniforms,
  testHooks: TestHooks,
  player: Pick<Player, 'setFlying' | 'isFlying'>,
  frameRate: FrameRateLabel,
  crestLine: CrestLine,
  breaker: Breaker,
  spray: Pick<Spray, 'throwFromCrest' | 'isThrownFromCrest'>,
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
    { label: 'freeze waves', set: testHooks.stopClock },
    { label: 'waves off', ...waterDebug(1) },
    { label: 'no falling lip', ...waterDebug(2) },
    { label: 'plain water colour', ...waterDebug(3) },
    { label: 'sea floor pictures', ...waterDebug(4) },
    { label: 'breaking crests', set: crestLine.show, isOn: () => crestLine.isShown },
    // (without it the sea shows what it does under the breaking wave's front)
    { label: 'breaker mesh', key: 'b', set: breaker.show, isOn: () => breaker.isShown },
    // (the spray along the breaking crest: read the frame rate beside a breaking wave with and without)
    { label: 'crest spray', set: spray.throwFromCrest, isOn: () => spray.isThrownFromCrest },
    // For finding where a slow frame goes: read the frame rate with it on.
    { label: 'coarse wave mesh', set: water.drawWaveMeshCoarsely },
    {
      // To see what the wave mesh's colouring costs, all of it: the mesh drawn in one flat colour
      // (water.frag.glsl's WATER_BARE). What is left is its points and the filling of its triangles.
      label: 'bare wave mesh',
      set(on) {
        const { defines } = water.waveMaterial;
        if (on) defines.WATER_BARE = '';
        else delete defines.WATER_BARE;
        water.waveMaterial.needsUpdate = true;
      },
    },
    ...WATER_STAGES.map((stage) => ({
      label: stage.label,
      set(on: boolean) {
        for (const material of [water.waveMaterial, water.farSea.material as ShaderMaterial]) {
          // (three.js leaves out a define whose value is false)
          for (const other of WATER_STAGES) material.defines[other.define] = false;
          if (on) material.defines[stage.define] = '';
          material.needsUpdate = true;
        }
      },
      isOn: () => water.waveMaterial.defines[stage.define] === '',
    })),
    {
      // The sea and the lagoon coloured as if their floor lay level, with nothing of the island's formula
      // worked out for each dot (water.frag.glsl's WATER_FLOOR_IS_FLAT): to see what the formula costs.
      label: 'no floor formula',
      set(on) {
        for (const material of [water.waveMaterial, water.farSea.material as ShaderMaterial]) {
          if (on) material.defines.WATER_FLOOR_IS_FLAT = '';
          else delete material.defines.WATER_FLOOR_IS_FLAT;
          material.needsUpdate = true;
        }
      },
    },
    {
      // An experiment, off unless switched on: the sea and the lagoon make their readings of the detail texture
      // for foam and steep water only where there may be either, inside a branch, each told its own sharpness
      // outright (water.frag.glsl's WATER_READS_WHERE_NEEDED; WebGL 2 only). The picture should not change; the
      // frame rate may. It breaks a hard rule as written (docs/DEVICE_NOTES.md), which is why it is only a switch.
      label: 'skip unused readings',
      set(on) {
        for (const material of [water.waveMaterial, water.farSea.material as ShaderMaterial]) {
          if (on) material.defines.WATER_READS_WHERE_NEEDED = '';
          else delete material.defines.WATER_READS_WHERE_NEEDED;
          material.needsUpdate = true;
        }
      },
    },
    {
      // The same: the wave mesh's colouring without what only steep water needs (two readings of
      // the detail texture for every dot of it: water.frag.glsl's WATER_STANDS_STEEP).
      label: 'plain steep water',
      set(on) {
        const { defines } = water.waveMaterial;
        if (on) delete defines.WATER_STANDS_STEEP;
        else defines.WATER_STANDS_STEEP = '';
        water.waveMaterial.needsUpdate = true;
      },
    },
    {
      // The same, for the sea and the lagoon: their colouring without the readings that follow the eye's line
      // on under the surface (water.frag.glsl's WATER_FOLLOWS_SIGHT: two for every dot of water, and four more
      // near a coral head). With it on, coral heads show through the water beside where they stand, and the
      // sky can show through clear water at the reef's edge.
      label: 'plain water depth',
      set(on) {
        for (const material of [water.waveMaterial, water.farSea.material as ShaderMaterial]) {
          if (on) delete material.defines.WATER_FOLLOWS_SIGHT;
          else material.defines.WATER_FOLLOWS_SIGHT = '';
          material.needsUpdate = true;
        }
      },
    },
    {
      // The same again: the sea and the lagoon without the sun's sparkle (water.frag.glsl's WATER_SPARKLES:
      // up to two noises for every dot of water towards the sun).
      label: 'no sparkle',
      set(on) {
        for (const material of [water.waveMaterial, water.farSea.material as ShaderMaterial]) {
          if (on) delete material.defines.WATER_SPARKLES;
          else material.defines.WATER_SPARKLES = '';
          material.needsUpdate = true;
        }
      },
    },
    {
      // To see what plain filtering saves, and loses: the detail and caustics textures filtered to stay sharp
      // across the view at a low angle, as they were.
      label: 'sharper filtering',
      set(on) {
        for (const texture of [uniforms.uDetail.value, uniforms.uCaustics.value]) {
          texture.anisotropy = on ? SHARPER_FILTERING : 1;
          texture.needsUpdate = true;
        }
      },
      isOn: () => uniforms.uDetail.value.anisotropy > 1,
    },
    {
      // For judging motion, which only the phone shows: the water's ripples running at a quarter of their pace.
      label: 'slower ripples',
      set(on) {
        uniforms.uRipplePace.value = on ? SLOWER_RIPPLES : 1;
      },
      isOn: () => uniforms.uRipplePace.value !== 1,
    },
    {
      // For judging motion too: what lies under water held still, where it sways as the ripples pass
      // (sway-under-water.glsl).
      label: 'still under water',
      set(on) {
        uniforms.uSwayUnderWater.value = on ? 0 : 1;
      },
      isOn: () => uniforms.uSwayUnderWater.value === 0,
    },
  ];
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
