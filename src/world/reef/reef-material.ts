import { MeshLambertMaterial, type IUniform } from 'three';
import { CAUSTICS_BRIGHTEST } from '../../shaders/caustics-texture';
import { glslFloat } from '../../shaders/defines';
import { withColouring } from '../../shaders/sunlight-under-water';
import { SWAY_DECLARATIONS, swayOf } from '../../shaders/sway-under-water';
import colourShader from './coral-colour.glsl';
import declarations from './coral-declarations.glsl';

/** The shared uniforms the coral colouring reads. */
const SHARED_UNIFORMS = [
  'uDetail',
  'uCaustics',
  'uTime',
  'uDaylight',
  'uSeaLevel',
  'uUnderWater',
  'uDebugMode',
  'uCameraPosition',
  'uWind',
] as const;

// Where the coral's surface is in the world: the mottling and the sea's tint go by that.
const WORLD_POSITION = [
  '#include <project_vertex>',
  ' vec4 rwp=vec4(transformed,1.);',
  '#ifdef USE_INSTANCING',
  ' rwp=instanceMatrix*rwp;',
  '#endif',
  ' vSurfacePosition=(modelMatrix*rwp).xyz;',
  swayOf('vSurfacePosition'),
].join('\n');

/**
 * One material for every coral: the models bring their colours painted on their corners.
 * `uniforms` are the ones every shader shares, read when the coral is first drawn.
 */
export function createCoralMaterial(uniforms: Record<string, IUniform>): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ vertexColors: true });
  material.defines = { CAUSTICS_BRIGHTEST: glslFloat(CAUSTICS_BRIGHTEST) };
  // The colouring runs inside three.js's own Lambert shader, so its lighting still applies.
  material.onBeforeCompile = (shader) => {
    for (const name of SHARED_UNIFORMS) shader.uniforms[name] = uniforms[name];
    shader.vertexShader =
      `${SWAY_DECLARATIONS}\nvarying vec3 vSurfacePosition;\n` +
      shader.vertexShader.replace('#include <project_vertex>', WORLD_POSITION);
    shader.fragmentShader = declarations + withColouring(shader.fragmentShader, colourShader);
  };
  return material;
}
