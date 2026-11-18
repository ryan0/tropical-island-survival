// Under water the sun's light is not what it is in air, in two ways a colour alone cannot say.
// The net of light that ripples throw is the sun's own light, gathered into lines: it brightens
// only what the sun lights, and in a shadow there is none. And a shadow under water is not as
// dark as one in air, since the water scatters the sun's light into it.
//
// So a colouring shader that runs inside three.js's Lambert shader does not multiply its colour
// by the net: it sets `netOfLight` (how much brighter the sun's light is, less 1) and
// `shadowFilledIn` (0 for a shadow as dark as in air, 1 for none), and the line of three.js's
// shader that works out the sun's light is replaced by one that uses them.

const DECLARATIONS = 'float netOfLight = 0.0;\nfloat shadowFilledIn = 0.0;';

/** The line of three.js 0.128's Lambert fragment shader that works out the sun's light. */
const THE_SUNS_LIGHT =
  'reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();';

const THE_SUNS_LIGHT_UNDER_WATER = `float sunReaches = getShadowMask();
	reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb )
		* mix( sunReaches, 1.0, shadowFilledIn ) * ( 1.0 + netOfLight * sunReaches );`;

/**
 * A Lambert fragment shader with a colouring shader put in after three.js has the surface's own
 * colour, and with the sun's light worked out as the colouring shader says.
 */
export function withColouring(fragmentShader: string, colourShader: string): string {
  if (!fragmentShader.includes(THE_SUNS_LIGHT)) {
    throw new Error("three.js's Lambert shader no longer works out the sun's light as expected");
  }
  return fragmentShader
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>\n${DECLARATIONS}\n{${colourShader}}`,
    )
    .replace(THE_SUNS_LIGHT, THE_SUNS_LIGHT_UNDER_WATER);
}
