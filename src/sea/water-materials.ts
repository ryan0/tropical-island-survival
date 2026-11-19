import { DoubleSide, ShaderMaterial, type IUniform } from 'three';
import { glslFloat, glslVec2, glslVec3 } from '../shaders/defines';
import { cloudsConfig } from '../sky/clouds-config';
import { skyConfig } from '../sky/sky-config';
import { reefConfig } from '../world/reef/reef-config';
import breakerDepthFragmentShader from './breaker-depth.frag.glsl';
import { breakerPath } from './breaker-shapes';
import breakerVertexShader from './breaker.vert.glsl';
import bandVertexShader from './lagoon-shore-band.vert.glsl';
import { seaConfig } from './sea-config';
import { waterConfig } from './water-config';
import fragmentShader from './water.frag.glsl';
import vertexShader from './water.vert.glsl';
import wavesShader from './waves.glsl';

/**
 * The sheets of water, all coloured by one shader: the wave mesh that the vertex shader moves,
 * the flat far sea (which is also the calm water of the lagoon), the band along the lagoon's
 * shore that lifts into small waves in a high wind, and the breaker's own mesh, which draws the
 * front of a breaking wave.
 */
export type WaterSheet =
  'far sea' | 'wave mesh' | 'lagoon shore band' | 'breaker' | 'breaker depth';

export interface WaterMaterialsDependencies {
  /** The uniforms every shader shares. */
  uniforms: Record<string, IUniform>;
  /** The middle of the home islet, which the map of the coral heads is centred on. */
  home: { x: number; z: number };
  /** The side of the square the map of cloud shadows covers, in metres. */
  cloudShadeSpan: number;
  /** The way the wind blows, level and of unit length (x, z). */
  windDirection: readonly [number, number];
  /** Metres a second a swell makes in the open sea (sea-floor-pictures.ts). */
  openSeaSpeed: number;
}

export interface WaterMaterials {
  create: (sheet: WaterSheet) => ShaderMaterial;
  /** The wave model's defines, for another shader that includes it (crest-line.ts). */
  waveDefines: Readonly<Record<string, string>>;
  /** The wave model as the shader has it, ready to compile on its own: the tests compare it with the program's copy. */
  waveShaderSource: () => string;
}

// The speed the open sea's shaded swell lines travel at, in metres a second, as water.frag.glsl has it.
const OPEN_SEA_LINES_SPEED = 4.95;
// The channel of the floor picture that holds each swell's delay.
const DELAY_CHANNELS = ['x', 'y'];

/** One SWELL(...) of waves.glsl for each swell, with the config's numbers. */
function swellsDefine(): string {
  return seaConfig.swells
    .map((swell, index) => {
      const numbers = [swell.period, swell.size, swell.variety, swell.canPlunge, swell.runUp];
      const towards = glslVec2(...swell.towards);
      return `SWELL(swell${index},${DELAY_CHANNELS[index]},${towards},${numbers.map(glslFloat).join(',')})`;
    })
    .join(' ');
}

/** One SWELL_FOAM(...) of waves.glsl for each swell, added together. */
function swellsFoamDefine(): string {
  return seaConfig.swells
    .map((swell, index) => {
      const numbers = [swell.period, swell.size, swell.variety].map(glslFloat).join(',');
      return `SWELL_FOAM(${DELAY_CHANNELS[index]},${glslVec2(...swell.towards)},${numbers})`;
    })
    .join('+');
}

/**
 * One MODELLED_SWELL_LINE(...) of water.frag.glsl for each swell, added together: the swell as
 * the far sea shades it, out past the wave mesh. Its slope is the swell's steepness in deep water.
 */
function modelledSwellDefine(openSeaSpeed: number): string {
  return seaConfig.swells
    .map((swell, index) => {
      const slope = (1.25 * swell.size * ((Math.PI * 2) / swell.period)) / openSeaSpeed;
      const numbers = [slope, swell.period, swell.variety].map(glslFloat).join(',');
      return `MODELLED_SWELL_LINE(${glslVec2(...swell.towards)},${DELAY_CHANNELS[index]},${numbers})`;
    })
    .join('+');
}

/** One SWELL_LINE(...) of water.frag.glsl for each family of the open sea's lines, added together. */
function openSeaLinesDefine(): string {
  return seaConfig.openSeaLines
    .map((lines) => {
      const numbers = [
        (1.25 * lines.amplitude * lines.frequency) / OPEN_SEA_LINES_SPEED,
        lines.setPace,
        lines.variety,
        lines.frequency,
        lines.crests,
        lines.phase,
      ];
      return `SWELL_LINE(${numbers.map(glslFloat).join(',')})`;
    })
    .join('+');
}

export function createWaterMaterials(dependencies: WaterMaterialsDependencies): WaterMaterials {
  const { uniforms, home, windDirection } = dependencies;
  const meshRows = waterConfig.waveMesh.rows;
  const waveDefines = {
    SWELLS: swellsDefine(),
    SWELLS_FOAM: swellsFoamDefine(),
    SEA_PICTURE_SPAN: glslFloat(seaConfig.floorPicture.span),
    FLOOR_HEIGHT_SPAN: glslFloat(seaConfig.floorHeightPicture.span),
    WAVE_MESH_FADES_FROM: glslFloat(meshRows.outerEdge - meshRows.swellFadesOver),
    WAVE_MESH_ENDS: glslFloat(meshRows.outerEdge),
    OPEN_SEA_SPEED: glslFloat(dependencies.openSeaSpeed),
  };
  const band = waterConfig.lagoonShoreBand;
  const defines = {
    ...waveDefines,
    MODELLED_SWELL: modelledSwellDefine(dependencies.openSeaSpeed),
    WATER_SWELL: openSeaLinesDefine(),
    LONG_SWELL_SLOPE: glslFloat((seaConfig.longSwell * 0.7) / OPEN_SEA_LINES_SPEED),
    HOME_ISLET: glslVec2(home.x, home.z),
    REEF_MAP_SPAN: glslFloat(reefConfig.mapSpan),
    OBSTACLE_FOAM_REACH: glslFloat(waterConfig.surfObstacles.foamReach),
    OBSTACLE_FOAM_REACH_BY_RADIUS: glslFloat(waterConfig.surfObstacles.foamReachByRadius),
    CLOUD_SHADE_SPAN_M: glslFloat(dependencies.cloudShadeSpan),
    USUAL_WIND: glslFloat(skyConfig.wind.usualBreeze),
    MOON_DIRECTION: glslVec3(...cloudsConfig.moonDirection),
    BAND_UP_BEACH: glslFloat(band.rows.first),
    BAND_SHOWN_WITHIN: glslFloat(band.shownWithin),
    LAGOON_WIND_DIRECTION: glslVec2(windDirection[0], windDirection[1]),
    SWELL_0_TOWARDS: glslVec2(...seaConfig.swells[0].towards),
    SWELL_1_TOWARDS: glslVec2(...seaConfig.swells[1].towards),
    SWELL_0_PERIOD: glslFloat(seaConfig.swells[0].period),
    SWELL_1_PERIOD: glslFloat(seaConfig.swells[1].period),
    // (for the breaker's own mesh)
    MAIN_SWELL_TOWARDS: glslVec2(...seaConfig.swells[0].towards),
    MAIN_SWELL_PERIOD: glslFloat(seaConfig.swells[0].period),
    MAIN_SWELL_SIZE: glslFloat(seaConfig.swells[0].size),
    MAIN_SWELL_VARIETY: glslFloat(seaConfig.swells[0].variety),
    MAIN_SWELL_CAN_PLUNGE: glslFloat(seaConfig.swells[0].canPlunge),
    SECOND_SWELL_SIZE: glslFloat(seaConfig.swells[1].size),
    SECOND_SWELL_VARIETY: glslFloat(seaConfig.swells[1].variety),
    BREAK_LINE_ALONG: glslFloat(seaConfig.reefBreak),
    CREST_SECONDS_BEFORE: glslFloat(seaConfig.crestPicture.secondsBefore),
    CREST_SECONDS_AFTER: glslFloat(seaConfig.crestPicture.secondsAfter),
    SHAPE_PLACES: glslFloat(seaConfig.breakerShapes.places),
    SHAPE_FIRST_STAGE: glslFloat(seaConfig.breakerShapes.firstStage),
    SHAPE_LAST_STAGE: glslFloat(seaConfig.breakerShapes.lastStage),
    SHAPE_FACE_ENDS: glslFloat(breakerPath.faceEnds),
    SHAPE_TOP_ENDS: glslFloat(breakerPath.topEnds),
    SHAPE_PEAK_AT: glslFloat(breakerPath.peakAt),
    SHAPE_BURST_FORMED_BY: glslFloat(breakerPath.burstFormedBy),
    SHAPE_BURST_BREAKS_UP: glslVec2(...breakerPath.burstBreaksUp),
    SHAPE_LAST_OFF_BACK: glslFloat(breakerPath.lastPlaceOffBack),
    SHAPE_BACK_FROM: glslFloat(breakerPath.firstPlaceOnBack),
  };

  return {
    waveDefines,

    create(sheet) {
      const isWaveMesh = sheet === 'wave mesh';
      const isBand = sheet === 'lagoon shore band';
      const isBreakerDepth = sheet === 'breaker depth';
      const isBreaker = sheet === 'breaker' || isBreakerDepth;
      return new ShaderMaterial({
        // uIsFlatSheet: 1 leaves the sheet flat (the vertex shader moves only the wave mesh). uIsShoreBand: 1 for the band.
        uniforms: {
          uIsFlatSheet: { value: isWaveMesh || isBreaker ? 0 : 1 },
          uIsShoreBand: { value: isBand ? 1 : 0 },
          ...uniforms,
        },
        // (Each sheet is compiled with only what it can show: water.frag.glsl says what these switch on.)
        defines: {
          ...defines,
          WATER_FOLLOWS_SIGHT: '',
          WATER_SPARKLES: '',
          ...(isWaveMesh || isBreaker ? { WATER_STANDS_STEEP: '' } : {}),
          ...(isBreaker ? { WATER_HAS_TORN_EDGE: '' } : {}),
          ...(isBreakerDepth ? { BREAKER_DEPTH_ONLY: '' } : {}),
        },
        transparent: true,
        // (the breaker's first drawing writes its depth and no colour: breaker-depth.frag.glsl)
        colorWrite: !isBreakerDepth,
        extensions: { derivatives: true },
        // The far sea lies under everything and must not hide what is drawn after it.
        depthWrite: sheet !== 'far sea',
        fog: false,
        side: DoubleSide,
        polygonOffset: sheet !== 'far sea',
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4,
        vertexShader: isBreaker ? breakerVertexShader : isBand ? bandVertexShader : vertexShader,
        fragmentShader: isBreakerDepth ? breakerDepthFragmentShader : fragmentShader,
      });
    },

    waveShaderSource() {
      const lines = Object.entries(waveDefines).map(([name, value]) => `#define ${name} ${value}`);
      return `${lines.join('\n')}\n${wavesShader}`;
    },
  };
}
