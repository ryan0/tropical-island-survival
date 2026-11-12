/* Lifted from legacy/src/js/80_debug.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './75_menu.js';   /* first, so that the files still run in build 78's order */
import {hgt,islandR} from 'virtual:shader-chunks';
import {BUILD} from './00_config.js';
import {camera,renderer,scene} from './05_core.js';
import {glsl} from './20_glsl.js';
import {cloudShade,cloudState,cloudSunThrough,weather} from './23_clouds.js';
import {PLANT_REG} from './24_instances.js';
import {HOME_SHORE,HOME_Z,HUT_Z,PIER_X,PIER_Z0} from './30_terrain.js';
import {sunLight} from './32_lights.js';
import {cycleTimeOfDay,dayPhase,dayTarget,setDayPhase,setSunFixed,sharedUniforms,todBtn} from './34_sky.js';
import {WP_H,WP_Hr,WP_bore,WP_imp,WP_lip,WP_trains,setWP_trains,waveH} from './36_waves.js';
import {bandInfo,bandPieces,farSea,waveMat,waveMesh,waveMeshInfo} from './38_water.js';
import {FIRE_X,FIRE_Z} from './48_fire.js';
import {intro,player,setPitch,setSwimY,setYaw} from './60_player.js';
import {toggleMenu} from './75_menu.js';
import {qStage} from './90_main.js';

/* Developer aids: test hooks and the hidden debug panel. Nothing here affects the scene. */

/* ---------- hooks for the test tools (tools/lib.js) ----------
   window.__fly=[x,y,z,yaw,pitch]  overrides the camera      window.__freeze=true  stops the wave clock
   window.__noq=1 (before load)    disables automatic quality */
window.__lag={
  scene:scene,cam:camera,bandInfo:bandInfo,bandPieces:bandPieces,renderer:renderer,plants:PLANT_REG,sunLight:sunLight,waveH:waveH,waveInfo:function(x,z,t){setWP_trains([]);waveH(x,z,t);var o=WP_trains;setWP_trains(null);return o;},wp:function(){return {lip:WP_lip,imp:WP_imp,bore:WP_bore,H:WP_H,Hr:WP_Hr};},islandR:islandR,hgt:hgt,HOME_Z:HOME_Z,HOME_SHORE:HOME_SHORE,HUT_Z:HUT_Z,
  glslWaves:function(){return glsl('waves');},
  set:function(x,z,y,p){player.x=x;player.z=z;setYaw(y);setPitch(p);},
  look:function(y,p){setYaw(y);setPitch(p);},
  dive:function(y){setSwimY(y);},
  sun:function(e){setSunFixed(e);},
  phase:function(p){setSunFixed(null);setDayPhase(p);},
  dayState:function(){return {phase:dayPhase,weather:weather.now,target:dayTarget};},
  nextTime:cycleTimeOfDay,
  cloudState:cloudState,cloudShade:cloudShade,cloudSunThrough:cloudSunThrough,uniforms:sharedUniforms,
  skip:function(){intro.t=intro.dur;},
  freeze:function(T){window.__freeze=true;sharedUniforms.uTime.value=T;},
  PIER_X:PIER_X,PIER_Z0:PIER_Z0,FIRE_X:FIRE_X,FIRE_Z:FIRE_Z
};

/* ---------- debug panel: hold the DAY button for about 1.5 s ----------
   Shows build, WebGL version and GPU, and a few switches that helped find a phone-only bug (docs/DEVICE_NOTES.md). */
var dbgHeld=false,dbgTimer=0,dbgEl=null;
function dbgShow(){
  dbgHeld=true;
  if(dbgEl){
    dbgEl.style.display=dbgEl.style.display==='none'?'block':'none';
    return;
  }
  var gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),gpu='n/a';
  try{if(ext)gpu=gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);}catch(e){}
  var hp='n/a';
  try{
    var f=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
    hp=f?f.precision:'none';
  }catch(e){}
  dbgEl=document.createElement('div');
  dbgEl.style.cssText='position:fixed;left:10px;right:10px;top:60px;z-index:5;background:rgba(0,0,0,.72);color:#fff;font:12px/1.5 monospace;padding:10px;border-radius:8px';
  dbgEl.innerHTML='build '+BUILD+' · WebGL'+(renderer.capabilities.isWebGL2?'2':'1')+' · frag highp bits '+hp+' · three precision '+renderer.capabilities.precision+'<br>GPU: '+gpu+'<br>water: '+waveMeshInfo+' · quality stage '+qStage+' · pixel ratio '+renderer.getPixelRatio()+'<br>';
  [['wireframe',function(on){
    waveMat.wireframe=on;
  }],['hide wave mesh',function(on){
    waveMesh.visible=!on;
  }],
   ['hide far sea',function(on){farSea.visible=!on;}],['freeze waves',function(on){window.__freeze=on;}],
   ['waves off',function(on){sharedUniforms.uDbg.value=on?1:0;}],['no falling lip',function(on){sharedUniforms.uDbg.value=on?2:0;}],['plain water colour',function(on){sharedUniforms.uDbg.value=on?3:0;}]].forEach(function(o){
    var bt=document.createElement('button'),st=false;
    bt.textContent=o[0];
    bt.style.cssText='margin:6px 6px 0 0;padding:7px 9px;font:11px monospace;background:#234;color:#fff;border:1px solid #89a;border-radius:6px';
    bt.addEventListener('click',function(){
      st=!st;
      bt.style.background=st?'#2a7':'#234';
      o[1](st);
    });
    dbgEl.appendChild(bt);
  });
  document.body.appendChild(dbgEl);
}
todBtn.addEventListener('pointerdown',function(){
  dbgHeld=false;
  dbgTimer=setTimeout(dbgShow,1300);
});
todBtn.addEventListener('pointerup',function(){clearTimeout(dbgTimer);});
todBtn.addEventListener('pointerleave',function(){clearTimeout(dbgTimer);});
todBtn.addEventListener('click',function(){
  if(dbgHeld){
    dbgHeld=false;
    return;
  }
  toggleMenu();
});
