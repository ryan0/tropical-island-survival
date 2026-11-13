import { DoubleSide, ShaderMaterial, type IUniform } from 'three';
import { glslFloat, glslVec2 } from '../shaders/defines';
import bandVertexShader from './lagoon-shore-band.vert.glsl';
import { seaConfig } from './sea-config';
import fragmentShader from './water.frag.glsl';
import vertexShader from './water.vert.glsl';
import wavesShader from './waves.glsl';

/**
 * The three sheets of water, all coloured by one shader: the wave mesh that the vertex shader
 * moves, the flat far sea (which is also the calm water of the lagoon), and the band along the
 * lagoon's shore that lifts into small waves in a high wind.
 */
export type WaterSheet = 'far sea' | 'wave mesh' | 'lagoon shore band';

export interface WaterMaterialsDependencies {
  /** The uniforms every shader shares. */
  uniforms: Record<string, IUniform>;
  /** The middle of the home islet, which the map of the coral heads is centred on. */
  home: { x: number; z: number };
  /** The side of the square the map of cloud shadows covers, in metres. */
  cloudShadeSpan: number;
  /** The way the wind blows, level and of unit length (x, z). */
  windDirection: readonly [number, number];
}

export interface WaterMaterials {
  create(sheet: WaterSheet): ShaderMaterial;
  /** The wave model as the shader has it, ready to compile on its own: the tests compare it with the program's copy. */
  waveShaderSource(): string;
}

// The speed the swell's lines travel at out at sea, in metres a second, as the shaders have it.
const SWELL_SPEED = 4.95;

/** One WAVE_TRAIN(...) of waves.glsl for each train, with the config's numbers. */
function waveTrainsDefine(): string {
  return seaConfig.waveTrains
    .map((train, index) => {
      const numbers = [
        train.amplitude,
        train.setPace,
        train.variety,
        train.variety * 1.7,
        train.frequency,
        train.crests,
        train.phase,
        train.canPlunge,
        train.runUp,
      ];
      return `WAVE_TRAIN(a${index},${numbers.map(glslFloat).join(',')})`;
    })
    .join(' ');
}

/** One SWELL_LINE(...) of water.frag.glsl for each train, added together. */
function swellDefine(): string {
  return seaConfig.waveTrains
    .map((train) => {
      const numbers = [
        (1.25 * train.amplitude * train.frequency) / SWELL_SPEED,
        train.setPace,
        train.variety,
        train.frequency,
        train.crests,
        train.phase,
      ];
      return `SWELL_LINE(${numbers.map(glslFloat).join(',')})`;
    })
    .join('+');
}

export function createWaterMaterials(dependencies: WaterMaterialsDependencies): WaterMaterials {
  const { uniforms, home, windDirection } = dependencies;
  const waveDefines = {
    WAVE_TRAINS: waveTrainsDefine(),
    REEF_BREAK: glslFloat(seaConfig.reefBreak),
  };
  const defines = {
    ...waveDefines,
    WATER_SWELL: swellDefine(),
    LONG_SWELL_SLOPE: glslFloat((seaConfig.longSwell * 0.7) / SWELL_SPEED),
    HOME_ISLET: glslVec2(home.x, home.z),
    CLOUD_SHADE_SPAN_M: glslFloat(dependencies.cloudShadeSpan),
    LAGOON_WIND_DIRECTION: glslVec2(windDirection[0], windDirection[1]),
  };

  return {
    create(sheet) {
      const isWaveMesh = sheet === 'wave mesh';
      const isBand = sheet === 'lagoon shore band';
      return new ShaderMaterial({
        // uFar: 1 leaves the sheet flat (the vertex shader moves only the wave mesh). uBand: 1 for the band.
        uniforms: {
          uFar: { value: isWaveMesh ? 0 : 1 },
          uBand: { value: isBand ? 1 : 0 },
          ...uniforms,
        },
        defines,
        transparent: true,
        extensions: { derivatives: true },
        // The far sea lies under everything and must not hide what is drawn after it.
        depthWrite: sheet !== 'far sea',
        fog: false,
        side: DoubleSide,
        polygonOffset: sheet !== 'far sea',
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4,
        vertexShader: isBand ? bandVertexShader : vertexShader,
        fragmentShader,
      });
    },

    waveShaderSource() {
      const lines = Object.entries(waveDefines).map(([name, value]) => `#define ${name} ${value}`);
      return `${lines.join('\n')}\n${wavesShader}`;
    },
  };
}
