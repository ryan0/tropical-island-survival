import type { MeshLambertMaterial } from 'three';

type Rgb = readonly [number, number, number];

/**
 * How leaves take the light. three.js lights the back of a two-sided surface as if it faced the
 * other way, which turns the far side of every leaf card black. A leaf is thin: light that
 * falls on one side shows on the other.
 *
 * With no `through`, the leaf is lit the same from both sides, as if its back did not exist.
 * With one, that share of the light on the far side is added, tinted: the yellow-green glow of
 * a frond seen from underneath with the sun above it.
 *
 * `name` must differ for every material this is called on. three.js shares one compiled shader
 * between materials whose patches read the same, and fronds lying on the ground would then
 * sway with the palms' wind.
 */
export function lightLeavesFromBothSides(
  material: MeshLambertMaterial,
  name: string,
  through: Rgb | null = null,
): MeshLambertMaterial {
  const patchBefore = material.onBeforeCompile.bind(material);
  material.customProgramCacheKey = () => name;
  material.onBeforeCompile = (shader, renderer) => {
    patchBefore(shader, renderer);
    if (through === null) {
      shader.fragmentShader = shader.fragmentShader.replace(
        /\( gl_FrontFacing \) \? (\w+) : \w+/g,
        '$1',
      );
      return;
    }
    const tint = `vec3(${through.join(',')})`;
    shader.fragmentShader = shader.fragmentShader.replace(
      '( gl_FrontFacing ) ? vLightFront : vLightBack',
      `( gl_FrontFacing ) ? vLightFront + vLightBack * ${tint} : vLightBack + vLightFront * ${tint}`,
    );
  };
  return material;
}
