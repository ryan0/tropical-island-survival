import { MeshLambertMaterial, type IUniform } from 'three';
import { glslFloat } from '../../shaders/defines';
import colourShader from './rock-colour.glsl';
import declarations from './rock-declarations.glsl';
import type { RockSurface } from './rocks-config';

/** The shared uniforms the rock colouring reads. */
const SHARED_UNIFORMS = ['uLevel', 'uTime', 'uWind', 'uDay', 'uDet'] as const;

// Where the rock's surface is and which way it faces, in the world: the pattern is laid on from
// three sides by those, so that it never stretches.
const WORLD_POSITION_AND_FACING = [
  '#include <project_vertex>',
  ' vec4 rwp=vec4(transformed,1.);vec3 rwn=objectNormal;',
  '#ifdef USE_INSTANCING',
  ' rwp=instanceMatrix*rwp;rwn=mat3(instanceMatrix)*rwn;',
  '#endif',
  ' vRp=(modelMatrix*rwp).xyz;vRn=normalize(mat3(modelMatrix)*rwn);',
].join('\n');

/**
 * The material of one kind of rock. The mesh brings each rock's own tone; this adds the surface
 * and what the sea does to it. `uniforms` are the ones every shader shares, read when the rock
 * is first drawn.
 */
export function createRockMaterial(
  surface: RockSurface,
  uniforms: Record<string, IUniform>,
): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ vertexColors: true });
  material.defines = {
    ROCK_SCALE: glslFloat(surface.scale),
    ROCK_CRACK: glslFloat(surface.crack),
    ROCK_PIT: glslFloat(surface.pit),
    ROCK_BUMP: glslFloat(surface.bump),
    ROCK_BLEACH: glslFloat(surface.bleach),
    ROCK_BARNACLE: glslFloat(surface.barnacle),
  };
  // The colouring runs inside three.js's own Lambert shader, so its lighting and shadows still apply.
  material.onBeforeCompile = (shader) => {
    for (const name of SHARED_UNIFORMS) shader.uniforms[name] = uniforms[name];
    shader.vertexShader =
      'varying vec3 vRp;varying vec3 vRn;\n' +
      shader.vertexShader.replace('#include <project_vertex>', WORLD_POSITION_AND_FACING);
    shader.fragmentShader =
      declarations +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n{${colourShader}}`,
      );
  };
  return material;
}
