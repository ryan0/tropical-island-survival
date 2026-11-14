import { ShaderChunk } from 'three';

// three.js softens shadow edges by reading the shadow map 17 times for every pixel it lights.
// These lines read it 9 times instead, weighted by where the pixel falls between the shadow
// map's dots, which gives an edge just as soft and smoother (no steps).
// prettier-ignore
const NINE_READS = [
  '#if defined( SHADOWMAP_TYPE_PCF )',
  'vec2 smT = 1.0 / shadowMapSize; vec2 smP = shadowCoord.xy * shadowMapSize; vec2 smF = fract( smP ); vec2 smC = ( floor( smP ) + 0.5 ) * smT;',
  'vec3 smW = vec3( 1.0 - smF.x, 1.0, smF.x );',
  'float smA = dot( smW, vec3( texture2DCompare( shadowMap, smC + vec2( - smT.x, - smT.y ), shadowCoord.z ), texture2DCompare( shadowMap, smC + vec2( 0.0, - smT.y ), shadowCoord.z ), texture2DCompare( shadowMap, smC + vec2( smT.x, - smT.y ), shadowCoord.z ) ) );',
  'float smB = dot( smW, vec3( texture2DCompare( shadowMap, smC + vec2( - smT.x, 0.0 ), shadowCoord.z ), texture2DCompare( shadowMap, smC, shadowCoord.z ), texture2DCompare( shadowMap, smC + vec2( smT.x, 0.0 ), shadowCoord.z ) ) );',
  'float smD = dot( smW, vec3( texture2DCompare( shadowMap, smC + vec2( - smT.x, smT.y ), shadowCoord.z ), texture2DCompare( shadowMap, smC + vec2( 0.0, smT.y ), shadowCoord.z ), texture2DCompare( shadowMap, smC + vec2( smT.x, smT.y ), shadowCoord.z ) ) );',
  'shadow = dot( vec3( 1.0 - smF.y, 1.0, smF.y ), vec3( smA, smB, smD ) ) * 0.25;',
  '',
].join('\n');

/**
 * Replaces three.js's own soft shadow edges, for every material made afterwards. If a different
 * three.js is ever loaded and its shader text is not as expected, it is left alone.
 */
export function useSmootherShadowEdges(): void {
  const chunk = ShaderChunk.shadowmap_pars_fragment;
  const from = chunk.indexOf('#if defined( SHADOWMAP_TYPE_PCF )');
  const to = chunk.indexOf('#elif defined( SHADOWMAP_TYPE_PCF_SOFT )');
  if (from < 0 || to < 0 || !chunk.includes('texture2DCompare')) return;

  ShaderChunk.shadowmap_pars_fragment = chunk.slice(0, from) + NINE_READS + chunk.slice(to);
}
