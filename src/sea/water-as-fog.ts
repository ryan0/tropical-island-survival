import { ShaderChunk, ShaderLib } from 'three';
import depthInSeaPicture from '../shaders/shared/depth-in-sea-picture.glsl';
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
//
// The same place in every material does one thing more. For an eye above the sea, what is under
// it is drawn first into a picture that the sea's surface reads (under-water-picture.ts), and
// into that picture each thing writes, beside its colour, how deep under the sea it lies
// (depth-in-sea-picture.glsl): the surface draws the water over each thing by that. For it a
// material must know two numbers that three.js does not hand it: how high the eye is above the
// sea, and whether it is the picture that is being drawn. They are one uniform, whose value is one
// array that every material shares: three.js copies a material's uniforms when it first compiles
// it, but an array of this kind it hands over as it is, so what is written into it reaches them
// all (docs/DEVICE_NOTES.md).

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
			if ( depthIntoSeaPicture.y > 0.5 ) {
				gl_FragColor.a = depthAsHeld( - ( vPlaceFromEye.w + depthIntoSeaPicture.x ) );
			}
		}
	#else
		gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor,
			1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth ) );
	#endif
#endif`;

/** What every material is told, so that it can be drawn into the picture of what is under the sea. */
export interface DepthIntoSeaPicture {
  /** How high the eye is above the still sea, in metres (in a wave's trough, less than nought). */
  setEyeOverSea(metres: number): void;
  /** While on, each thing writes its depth under the sea beside its colour. */
  write(on: boolean): void;
}

/**
 * Gives three.js's fog its cases for water, for every material made afterwards. In air, drawn to
 * the screen, nothing changes. If a different three.js is ever loaded and its fog is not written
 * as expected, it is left alone, and what is returned does nothing.
 */
export function useWaterAsFog(): DepthIntoSeaPicture {
  const numbers = new Float32Array(2);
  const depthIntoSeaPicture: DepthIntoSeaPicture = {
    setEyeOverSea(metres) {
      numbers[0] = metres;
    },
    write(on) {
      numbers[1] = on ? 1 : 0;
    },
  };
  const isAsExpected =
    ShaderChunk.fog_pars_vertex.includes('varying float fogDepth;') &&
    ShaderChunk.fog_vertex.includes('fogDepth = - mvPosition.z;') &&
    ShaderChunk.fog_pars_fragment.includes('uniform float fogNear;') &&
    ShaderChunk.fog_fragment.includes('smoothstep( fogNear, fogFar, fogDepth )');
  if (!isAsExpected) return depthIntoSeaPicture;

  // (Each addition begins on a line of its own: three.js's chunks do not all end with one.)
  const declaration = '\n#ifdef USE_FOG\n\tvarying vec4 vPlaceFromEye;\n#endif\n';
  ShaderChunk.fog_pars_vertex += declaration;
  ShaderChunk.fog_vertex += PLACE_FROM_EYE;
  ShaderChunk.fog_pars_fragment += `${declaration}#ifdef USE_FOG\n\tuniform vec2 depthIntoSeaPicture;\n#endif\n${throughWater}\n${depthInSeaPicture}\n`;
  ShaderChunk.fog_fragment = SEEN_THROUGH_WATER;
  // (every kind of material three.js has: each takes its uniforms from its own list of them)
  for (const kind of Object.values(ShaderLib)) {
    kind.uniforms.depthIntoSeaPicture = { value: numbers };
  }
  return depthIntoSeaPicture;
}
