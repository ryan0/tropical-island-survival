import { ShaderChunk } from 'three';
import throughWater from '../shaders/shared/through-water.glsl';

// To an eye under water, the water between it and a thing is what fog is in air, with two
// differences: it takes red long before it takes blue, and its own light is brighter looking up
// than down (through-water.glsl). three.js fogs every material it draws by one rule of its own,
// so that rule is given a second case here, for every material made afterwards: the ground, the
// rocks, the coral, the plants and the animals all go into the distance alike, and none needs to
// be told.
//
// three.js hands a material the fog's colour, where it begins and where it ends, and nothing
// else. So being under water is said with what there is: a fog that begins behind the eye, which
// no fog in air does. (Another kind of fog would say it more plainly, but three.js compiles every
// shader again when the kind of fog changes: a long stumble on a phone at every dive.) Under
// water the fog's colour is the water's colour looking level, and where it ends means nothing.

/** Where the scene's fog begins while the eye is under water (under-water.ts sets it). */
export const FOG_BEGINS_UNDER_WATER = -1;

// Where the point is from the eye, in the eye's own axes, and how far above the eye it is:
// the second column of the view matrix is the world's up as the eye sees it.
const PLACE_FROM_EYE = `
#ifdef USE_FOG
	vPlaceFromEye = vec4( mvPosition.xyz, dot( mvPosition.xyz, viewMatrix[ 1 ].xyz ) );
#endif`;

const SEEN_THROUGH_WATER = `
#ifdef USE_FOG
	#ifndef FOG_EXP2
		if ( fogNear < 0.0 ) {
			float metresOfWater = length( vPlaceFromEye.xyz );
			gl_FragColor.rgb = seenThroughWater( gl_FragColor.rgb, fogColor, metresOfWater,
				vPlaceFromEye.w / max( metresOfWater, 1e-3 ) );
		} else {
			gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, smoothstep( fogNear, fogFar, fogDepth ) );
		}
	#else
		gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor,
			1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth ) );
	#endif
#endif`;

/**
 * Gives three.js's fog its second case, for every material made afterwards. In air nothing
 * changes. If a different three.js is ever loaded and its fog is not written as expected, it is
 * left alone.
 */
export function useWaterAsFog(): void {
  const isAsExpected =
    ShaderChunk.fog_pars_vertex.includes('varying float fogDepth;') &&
    ShaderChunk.fog_vertex.includes('fogDepth = - mvPosition.z;') &&
    ShaderChunk.fog_pars_fragment.includes('uniform float fogNear;') &&
    ShaderChunk.fog_fragment.includes('smoothstep( fogNear, fogFar, fogDepth )');
  if (!isAsExpected) return;

  // (Each addition begins on a line of its own: three.js's chunks do not all end with one.)
  const declaration = '\n#ifdef USE_FOG\n\tvarying vec4 vPlaceFromEye;\n#endif\n';
  ShaderChunk.fog_pars_vertex += declaration;
  ShaderChunk.fog_vertex += PLACE_FROM_EYE;
  ShaderChunk.fog_pars_fragment += `${declaration}${throughWater}\n`;
  ShaderChunk.fog_fragment = SEEN_THROUGH_WATER;
}
