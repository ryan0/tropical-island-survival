/* Lifted from legacy/src/js/80_debug.js. The imports are new, and the debug panel and the corner button's presses are now
   src/ui/debug-panel.ts and src/ui/corner-button.ts, given their contents here; the rest is build 78's. */
import './75_menu.js';   /* first, so that the files still run in build 78's order */
import {watchCornerButton} from '../../ui/corner-button.ts';
import {createDebugPanel} from '../../ui/debug-panel.ts';
import {hgt,islandR} from 'virtual:shader-chunks';
import {BUILD} from './00_config.js';
import {camera,renderer,scene} from './05_core.js';
import {glsl} from './20_glsl.js';
import {cloudShade,weather} from './23_clouds.js';
import {PLANT_REG} from './24_instances.js';
import {HOME_SHORE,HOME_Z,HUT_Z,PIER_X,PIER_Z0} from './30_terrain.js';
import {sunLight} from './32_lights.js';
import {dayCycle,sharedUniforms,todBtn} from './34_sky.js';
import {WP_H,WP_Hr,WP_bore,WP_imp,WP_lip,WP_trains,setWP_trains,waveH} from './36_waves.js';
import {bandInfo,bandPieces,farSea,waveMat,waveMesh,waveMeshInfo} from './38_water.js';
import {FIRE_X,FIRE_Z} from './48_fire.js';
import {intro,player,setPitch,setSwimY,setYaw} from './60_player.js';
import {menu} from './75_menu.js';
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
  sun:function(e){dayCycle.fixSunHeight(e);},
  phase:function(p){dayCycle.fixSunHeight(null);dayCycle.jumpTo(p);},
  dayState:function(){return {phase:dayCycle.phase,weather:weather.cloudCover.now,target:dayCycle.hurryingTo};},
  nextTime:dayCycle.hurryToNextNamedTime,
  cloudShade:cloudShade,uniforms:sharedUniforms,
  skip:function(){intro.t=intro.dur;},
  freeze:function(T){window.__freeze=true;sharedUniforms.uTime.value=T;},
  PIER_X:PIER_X,PIER_Z0:PIER_Z0,FIRE_X:FIRE_X,FIRE_Z:FIRE_Z
};

/* ---------- debug panel: hold the DAY button for about 1.5 s ----------
   Shows build, WebGL version and GPU, and a few switches that helped find a phone-only bug (docs/DEVICE_NOTES.md). */
var debugPanel=createDebugPanel(document.body,function(){
  var gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),gpu='n/a';
  try{if(ext)gpu=gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);}catch(e){}
  var hp='n/a';
  try{
    var f=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
    hp=f?f.precision:'none';
  }catch(e){}
  return ['build '+BUILD+' · WebGL'+(renderer.capabilities.isWebGL2?'2':'1')+' · frag highp bits '+hp+' · three precision '+renderer.capabilities.precision,
          'GPU: '+gpu,
          'water: '+waveMeshInfo+' · quality stage '+qStage+' · pixel ratio '+renderer.getPixelRatio()];
},[
  {label:'wireframe',set:function(on){waveMat.wireframe=on;}},
  {label:'hide wave mesh',set:function(on){waveMesh.visible=!on;}},
  {label:'hide far sea',set:function(on){farSea.visible=!on;}},
  {label:'freeze waves',set:function(on){window.__freeze=on;}},
  {label:'waves off',set:function(on){sharedUniforms.uDbg.value=on?1:0;}},
  {label:'no falling lip',set:function(on){sharedUniforms.uDbg.value=on?2:0;}},
  {label:'plain water colour',set:function(on){sharedUniforms.uDbg.value=on?3:0;}}
]);
watchCornerButton(todBtn,{onTap:menu.toggle,onLongPress:debugPanel.toggle});
