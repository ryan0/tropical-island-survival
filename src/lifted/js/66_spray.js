/* A bridge. Build 78's 66_spray.js is now src/sea/spray.ts; this builds the spray at the same point in start-up and passes
   each frame on. */
import './64_underwater.js';   /* first, so that the files still run in build 78's order */
import {islandR} from 'virtual:island-shape';
import {createSpray} from '../../sea/spray.ts';
import {OBSTACLES,camera,renderer,rnd,scene,sharedUniforms} from './05_core.js';
import {waves} from './36_waves.js';
import {audio} from './70_audio.js';
import {VH} from './90_main.js';

/* the 16 biggest obstacles are also sent to the water shader, which draws foam rings around them */
OBSTACLES.sort(function(a,b){return b.r-a.r;});
(function(){
  for(var i=0;i<16&&i<OBSTACLES.length;i++)sharedUniforms.uObs.value[i].set(OBSTACLES[i].x,OBSTACLES[i].z,OBSTACLES[i].r);
})();
var spray=createSpray({scene:scene,camera:camera,random:rnd,waves:waves,islandRadius:islandR,
  obstacles:OBSTACLES.map(function(ob){return {x:ob.x,z:ob.z,radius:ob.r,groundHeight:ob.g};}),
  hearSurf:function(breaking){audio.setSurfBreaking(breaking);}});   /* (the surf's loudness follows how much is breaking near the camera) */

/* frame step: spray */
var sprayFrame={time:0,dt:0,daylight:1,night:0,isCameraUnderWater:false,pixelRatio:1,viewHeight:0};
function updateSpray(F){
  sprayFrame.time=window.__freeze?sharedUniforms.uTime.value:F.t;   /* (frozen waves in the tests: spray follows the frozen wave) */
  sprayFrame.dt=F.dt;
  sprayFrame.daylight=F.day;
  sprayFrame.night=F.night;
  sprayFrame.isCameraUnderWater=F.under;
  sprayFrame.pixelRatio=renderer.getPixelRatio();
  sprayFrame.viewHeight=VH;
  spray.update(sprayFrame);
}

export {updateSpray};
