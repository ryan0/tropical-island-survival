/* Lifted from legacy/src/js/05_core.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './00_config.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {WORLD_SEED} from './00_config.js';

/* Page-level setup that everything else builds on: error display, the three.js renderer, scene and camera,
   plus a few small helpers. */

var errEl=document.getElementById('err'), hintEl=document.getElementById('hint');
function fail(m){
  errEl.style.display='flex';
  errEl.textContent=m;
}
var renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true});}catch(e){
  fail('WebGL is not available in this browser.');
  throw e;   /* (a module cannot return; this stops the files after it from running, as the return did) */
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
/* three.js softens shadow edges by reading the shadow map 17 times for every pixel it lights. This replaces that
   with 9 reads, weighted by where the pixel falls between shadow-map dots, which gives an edge just as soft and
   smoother (no steps). If a different three.js is ever loaded and its shader text is not as expected, it is left alone. */
(function(){
  var c=THREE.ShaderChunk.shadowmap_pars_fragment,a=c.indexOf('#if defined( SHADOWMAP_TYPE_PCF )'),b=c.indexOf('#elif defined( SHADOWMAP_TYPE_PCF_SOFT )');
  if(a<0||b<0||c.indexOf('texture2DCompare')<0)return;
  THREE.ShaderChunk.shadowmap_pars_fragment=c.slice(0,a)+[
    '#if defined( SHADOWMAP_TYPE_PCF )',
    'vec2 smT = 1.0 / shadowMapSize; vec2 smP = shadowCoord.xy * shadowMapSize; vec2 smF = fract( smP ); vec2 smC = ( floor( smP ) + 0.5 ) * smT;',
    'vec3 smW = vec3( 1.0 - smF.x, 1.0, smF.x );',
    'float smA = dot( smW, vec3( texture2DCompare( shadowMap, smC + vec2( - smT.x, - smT.y ), shadowCoord.z ), texture2DCompare( shadowMap, smC + vec2( 0.0, - smT.y ), shadowCoord.z ), texture2DCompare( shadowMap, smC + vec2( smT.x, - smT.y ), shadowCoord.z ) ) );',
    'float smB = dot( smW, vec3( texture2DCompare( shadowMap, smC + vec2( - smT.x, 0.0 ), shadowCoord.z ), texture2DCompare( shadowMap, smC, shadowCoord.z ), texture2DCompare( shadowMap, smC + vec2( smT.x, 0.0 ), shadowCoord.z ) ) );',
    'float smD = dot( smW, vec3( texture2DCompare( shadowMap, smC + vec2( - smT.x, smT.y ), shadowCoord.z ), texture2DCompare( shadowMap, smC + vec2( 0.0, smT.y ), shadowCoord.z ), texture2DCompare( shadowMap, smC + vec2( smT.x, smT.y ), shadowCoord.z ) ) );',
    'shadow = dot( vec3( 1.0 - smF.y, 1.0, smF.y ), vec3( smA, smB, smD ) ) * 0.25;',
    ''].join('\n')+c.slice(b);
})();
window.addEventListener('error',function(e){
  hintEl.style.opacity=1;
  hintEl.textContent='error: '+(e.message||'')+' @'+(e.lineno||'');
});
document.body.insertBefore(renderer.domElement,document.body.firstChild);
var canvas=renderer.domElement;
var scene=new THREE.Scene();
var camera=new THREE.PerspectiveCamera(68,1,0.2,7000);
camera.rotation.order='YXZ';
scene.fog=new THREE.Fog(0xa8e0f7,220,2600);

/* ---------- helpers ---------- */

/* Random numbers, seeded, so the island is identical on every load and a screenshot or bug report always refers to
   the same rock. Each part that scatters things draws from its OWN stream - rndStream('palms'), rndStream('rocks') -
   so changing how one kind of thing is placed does not move all the others. rnd() is the general stream, for effects
   while the scene runs (spray). */
function rndStream(name){
  var state=(window.__seed||WORLD_SEED)>>>0;   /* window.__seed: test hook for trying other layouts */
  for(var i=0;i<name.length;i++)state=Math.imul(state^name.charCodeAt(i),0x9E3779B1)>>>0;
  return function(){
    state=(state+0x6D2B79F5)|0;
    var t=Math.imul(state^(state>>>15),1|state);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
var rnd=rndStream('general');
function smoothstep(a,b,x){
  var t=Math.max(0,Math.min(1,(x-a)/(b-a)));
  return t*t*(3-2*t);
}
/* blend two [r,g,b] arrays */
function mix3(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
/* a number written the way GLSL wants a float ("2." rather than "2") */
function glslFloat(v){
  var t=(+v).toFixed(4);
  return t.indexOf('.')<0?t+'.':t;
}

/* Things standing in the water that waves splash against: posts and rocks push {x,z,r,g,prev} here as they are built
   (r radius, g ground height there, prev last water height). 66_spray.js reads the list. */
var OBSTACLES=[];

export {OBSTACLES,camera,canvas,glslFloat,hintEl,mix3,renderer,rnd,rndStream,scene,smoothstep};
