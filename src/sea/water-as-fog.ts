import { ShaderChunk, ShaderLib } from 'three';
import throughWater from '../shaders/shared/through-water.glsl';
import waterVeil from '../shaders/shared/water-veil.glsl';

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
//
// To an eye above the sea, the same rule has a third case: a thing under the sea is veiled by the
// water its own light comes up through (water-veil.glsl), whatever it is, so that the sea's
// surface need not hide it by the depth of whatever lies beside it. For that every material must
// know four numbers more: the daylight, the night, how high the eye is above the sea, and whether
// there is a sea (it can be drained). They
// are given as one uniform, whose value is one array that every material shares: three.js copies
// a material's uniforms when it first compiles it, but an array of this kind it hands over as it
// is, so what is written into it each frame reaches them all.

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
	{
		float metresFromEye = length( vPlaceFromEye.xyz );
		float riseFromEye = vPlaceFromEye.w / max( metresFromEye, 1e-3 );
		if ( fogNear < 0.0 ) {
			gl_FragColor.rgb = seenThroughWater( gl_FragColor.rgb, fogColor, metresFromEye, riseFromEye );
		} else {
			float depthUnderSea = - ( vPlaceFromEye.w + seaSeenFromAbove.z ) * seaSeenFromAbove.w;
			if ( depthUnderSea > 0.0 ) {
				float metresOfWater = metresOfWaterOver( depthUnderSea, riseFromEye );
				// (its colour goes by the depth alone, as the surface's does, whichever way the eye looks)
				vec3 waterColour = waterBodyColour( depthUnderSea )
					* waterInThisLight( seaSeenFromAbove.x, seaSeenFromAbove.y );
				gl_FragColor.rgb = mix( gl_FragColor.rgb, waterColour,
					hiddenByWater( metresOfWater, 1.0 - SURFACE_DRAWS ) );
			}
			gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, smoothstep( fogNear, fogFar, fogDepth ) );
		}
	}
	#else
		gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor,
			1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth ) );
	#endif
#endif`;

/** What every material is told of the sea, for a thing under it seen by an eye above it. */
export interface SeaSeenFromAbove {
  /**
   * daylight: 0 with the sun at the horizon to 1 by day. night: 0 by day to 1 at night.
   * eyeOverSea: how high the eye is above the still sea, in metres (below it, in the trough of a
   * wave, it is less than nought). isSeaThere: false while the sea is drained, and veils nothing.
   */
  set(daylight: number, night: number, eyeOverSea: number, isSeaThere: boolean): void;
}

/**
 * Gives three.js's fog its cases for water, for every material made afterwards. In air, over
 * dry land, nothing changes. If a different three.js is ever loaded and its fog is not written as
 * expected, it is left alone, and what is returned does nothing.
 */
export function useWaterAsFog(): SeaSeenFromAbove {
  const numbers = new Float32Array(4);
  const seaSeenFromAbove: SeaSeenFromAbove = {
    set(daylight, night, eyeOverSea, isSeaThere) {
      numbers[0] = daylight;
      numbers[1] = night;
      numbers[2] = eyeOverSea;
      numbers[3] = isSeaThere ? 1 : 0;
    },
  };
  const isAsExpected =
    ShaderChunk.fog_pars_vertex.includes('varying float fogDepth;') &&
    ShaderChunk.fog_vertex.includes('fogDepth = - mvPosition.z;') &&
    ShaderChunk.fog_pars_fragment.includes('uniform float fogNear;') &&
    ShaderChunk.fog_fragment.includes('smoothstep( fogNear, fogFar, fogDepth )');
  if (!isAsExpected) return seaSeenFromAbove;

  // (Each addition begins on a line of its own: three.js's chunks do not all end with one.)
  const declaration = '\n#ifdef USE_FOG\n\tvarying vec4 vPlaceFromEye;\n#endif\n';
  ShaderChunk.fog_pars_vertex += declaration;
  ShaderChunk.fog_vertex += PLACE_FROM_EYE;
  ShaderChunk.fog_pars_fragment += `${declaration}#ifdef USE_FOG\n\tuniform vec4 seaSeenFromAbove;\n#endif\n${throughWater}\n${waterVeil}\n`;
  ShaderChunk.fog_fragment = SEEN_THROUGH_WATER;
  // (every kind of material three.js has: each takes its uniforms from its own list of them)
  for (const kind of Object.values(ShaderLib)) kind.uniforms.seaSeenFromAbove = { value: numbers };
  return seaSeenFromAbove;
}
