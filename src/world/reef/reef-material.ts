import { MeshLambertMaterial, type IUniform } from 'three';
import { CAUSTICS_BRIGHTEST } from '../../shaders/caustics-texture';
import { glslFloat, glslVec3 } from '../../shaders/defines';
import { withColouring } from '../../shaders/sunlight-under-water';
import colourShader from './coral-colour.glsl';
import type { CoralSurfacePicture } from './coral-surface-picture';
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
  'uLightNetShare',
] as const;

// Where the coral's surface is in the world, and which way it faces: the mottling, the surface's
// own pattern and the sea's tint go by those. And what the surface is like (coral-shapes.ts).
const WORLD_POSITION = [
  '#include <project_vertex>',
  ' vec4 rwp=vec4(transformed,1.);',
  '#ifdef USE_INSTANCING',
  ' rwp=instanceMatrix*rwp;',
  '#endif',
  ' vSurfacePosition=(modelMatrix*rwp).xyz;',
  ' vSurfaceFacing=inverseTransformDirection(transformedNormal,viewMatrix);',
  ' vSurfaceKind=surface;',
].join('\n');

/**
 * One material for every coral: the models bring their colours painted on their corners, and
 * what their surface is like. `uniforms` are the ones every shader shares, read when the coral is
 * first drawn; `surface` is the picture of the corals' surfaces.
 */
export function createCoralMaterial(
  uniforms: Record<string, IUniform>,
  surface: CoralSurfacePicture,
): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ vertexColors: true });
  const [ridges, skin, warts] = surface.averages;
  material.defines = {
    CAUSTICS_BRIGHTEST: glslFloat(CAUSTICS_BRIGHTEST),
    CORAL_SURFACE_SPAN: glslFloat(surface.span),
    CORAL_SURFACE_AVERAGES: glslVec3(ridges, skin, warts),
  };
  // The colouring runs inside three.js's own Lambert shader, so its lighting still applies.
  material.onBeforeCompile = (shader) => {
    for (const name of SHARED_UNIFORMS) shader.uniforms[name] = uniforms[name];
    shader.uniforms.uCoralSurface = { value: surface.texture };
    shader.vertexShader =
      `attribute vec3 surface;\nvarying vec3 vSurfacePosition;\n` +
      'varying vec3 vSurfaceFacing;\nvarying vec3 vSurfaceKind;\n' +
      shader.vertexShader.replace('#include <project_vertex>', WORLD_POSITION);
    shader.fragmentShader = declarations + withColouring(shader.fragmentShader, colourShader);
  };
  return material;
}
