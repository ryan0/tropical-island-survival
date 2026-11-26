import { ShaderChunk, ShaderLib } from 'three';
import depthInSeaPicture from '../shaders/shared/depth-in-sea-picture.glsl';
import raisedThroughSurface from '../shaders/shared/raised-through-surface.glsl';
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
// The same place in every material does two things more, while the picture of what is under the
// sea is drawn for the sea's surface to read (under-water-picture.ts). Into that picture each
// thing writes, beside its colour, how deep under the sea it lies (depth-in-sea-picture.glsl):
// the surface draws the water over each thing by that. And in that picture every corner of every
// thing under the sea is drawn raised to where it seems to be through the surface, and what
// stands a little out of the sea lower by the same rule (raised-through-surface.glsl), so that
// the picture holds what the eye would see through a flat sea. (In the picture only. On the screen things stand where they are: raised there, the
// far floor of the reef stood up out of the troughs of the waves.) For these a material must know
// four numbers that three.js does not hand it: how high the eye is above the still sea, whether
// it is the picture that is being drawn, how much of the raising to draw (all of it, but for a
// debug switch), and how high the eye is above the level the raising takes the sea to lie at
// (the still sea's, but lifted with a swimmer whom a wave lifts: under-water-picture.ts). They
// are one uniform, whose value is one array that every material shares: three.js copies a
// material's uniforms when it first compiles it, but an array of this kind it hands over as it
// is, so what is written into it reaches them all (docs/DEVICE_NOTES.md).

/** Where the scene's fog begins while the eye is under water (under-water.ts sets it). */
export const FOG_BEGINS_UNDER_WATER = -1;

// Where the point is from the eye, in the eye's own axes, and how far above the eye it is: the
// second column of the view matrix is the world's up as the eye sees it. That is where it truly
// is, and the fog and the depth written into the picture go by it. Then, in the picture of what is
// under the sea, the point is drawn raised to where it seems to be (three.js has placed it
// already: it is placed again). It is the last thing a vertex shader of three.js's does, and
// nothing after it reads the place. How far it was raised goes on to the fragment shader, for
// the ground, which there works out which point of itself each dot shows
// (shaders/shared/seen-through-surface.glsl).
const PLACE_FROM_EYE = `
#ifdef USE_FOG
	vec3 worldUpFromEye = viewMatrix[ 1 ].xyz;
	vPlaceFromEye = vec4( mvPosition.xyz, dot( mvPosition.xyz, worldUpFromEye ) );
	vec3 alongLevel = mvPosition.xyz - worldUpFromEye * vPlaceFromEye.w;
	vRaisedBy = intoSeaPicture.y * intoSeaPicture.z * raisedThroughSurface(
		dot( alongLevel, alongLevel ), - ( vPlaceFromEye.w + intoSeaPicture.w ), intoSeaPicture.w );
	mvPosition.xyz += worldUpFromEye * vRaisedBy;
	gl_Position = projectionMatrix * mvPosition;
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
			if ( intoSeaPicture.y > 0.5 ) {
				gl_FragColor.a = depthAsHeld( - ( vPlaceFromEye.w + intoSeaPicture.x ) );
			}
		}
	#else
		gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor,
			1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth ) );
	#endif
#endif`;

/** What every material is told, for drawing the picture of what is under the sea. */
export interface IntoSeaPicture {
  /**
   * While the picture is drawn: `eyeOverSea` is how high the eye is above the still sea, in
   * metres. Then each thing writes its depth under the still sea beside its colour, and is
   * drawn where it seems to be through a flat sea that lies `eyeOverRaisingLevel` under the eye:
   * `raisingShare` of the way there, which is 1 but for a debug switch.
   */
  begin(eyeOverSea: number, eyeOverRaisingLevel: number, raisingShare: number): void;
  end(): void;
}

/**
 * Gives three.js's fog its cases for water, for every material made afterwards. In air, drawn to
 * the screen, nothing changes. If a different three.js is ever loaded and its fog is not written
 * as expected, it is left alone, and what is returned does nothing.
 */
export function useWaterAsFog(): IntoSeaPicture {
  const numbers = new Float32Array(4);
  const intoSeaPicture: IntoSeaPicture = {
    begin(eyeOverSea, eyeOverRaisingLevel, raisingShare) {
      numbers[0] = eyeOverSea;
      numbers[1] = 1;
      numbers[2] = raisingShare;
      numbers[3] = eyeOverRaisingLevel;
    },
    end() {
      numbers[1] = 0;
    },
  };
  const isAsExpected =
    ShaderChunk.fog_pars_vertex.includes('varying float fogDepth;') &&
    ShaderChunk.fog_vertex.includes('fogDepth = - mvPosition.z;') &&
    ShaderChunk.fog_pars_fragment.includes('uniform float fogNear;') &&
    ShaderChunk.fog_fragment.includes('smoothstep( fogNear, fogFar, fogDepth )');
  if (!isAsExpected) return intoSeaPicture;

  // (Each addition begins on a line of its own: three.js's chunks do not all end with one.)
  const declarations =
    '\n#ifdef USE_FOG\n\tvarying vec4 vPlaceFromEye;\n\tvarying float vRaisedBy;\n\tuniform vec4 intoSeaPicture;\n#endif\n';
  ShaderChunk.fog_pars_vertex += `${declarations}${raisedThroughSurface}\n`;
  ShaderChunk.fog_vertex += PLACE_FROM_EYE;
  ShaderChunk.fog_pars_fragment += `${declarations}${throughWater}\n${depthInSeaPicture}\n`;
  ShaderChunk.fog_fragment = SEEN_THROUGH_WATER;
  // (every kind of material three.js has: each takes its uniforms from its own list of them)
  for (const kind of Object.values(ShaderLib)) {
    kind.uniforms.intoSeaPicture = { value: numbers };
  }
  return intoSeaPicture;
}
