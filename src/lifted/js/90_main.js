/* Lifted from legacy/src/js/90_main.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './80_debug.js';   /* first, so that the files still run in build 78's order */
import {camera,renderer,scene} from './05_core.js';
import {updateClouds} from './23_clouds.js';
import {updateInstanceCells} from './24_instances.js';
import {sunLight,updateLights} from './32_lights.js';
import {updateGlare,updateSky} from './34_sky.js';
import {updateWater} from './38_water.js';
import {updateReef} from './47_reef.js';
import {updateFire} from './48_fire.js';
import {updateModules} from './54_modules.js';
import {intro,updateCaptions,updatePlayer} from './60_player.js';
import {updateFootprints} from './62_footprints.js';
import {updateUnderwater} from './64_underwater.js';
import {updateSpray} from './66_spray.js';
import {updateAudio} from './70_audio.js';

/* The frame loop. Every system exposes an update function; FRAME_STEPS is the order they run in.
   F is the per-frame state they share: a step may read what earlier steps wrote (see each step's comment). */
var F={ms:0,t:0,dt:0,rawDt:0,       /* clock: ms from requestAnimationFrame, t seconds since start, dt capped step, rawDt real step */
       ground:0,swimming:false,    /* updatePlayer */
       day:1,night:0,vis:1,sunEl:0.6,sunCol:[1,1,1],   /* updateSky */
       sunThru:1,                  /* updateClouds: how much of the sun gets through the clouds to the camera */
       surfY:0,under:false};       /* updateUnderwater */
var FRAME_STEPS=[updateQuality,resize,updatePlayer,updateFootprints,updateCaptions,updateSky,updateClouds,updateUnderwater,updateLights,
                 updateFire,updateAudio,updateModules,updateSpray,updateGlare,updateWater,updateReef,updateInstanceCells];

var VW=0,VH=0;
function resize(){
  var w=window.innerWidth,h=window.innerHeight;
  if(w!==VW||h!==VH){
    VW=w;
    VH=h;
    renderer.setSize(w,h);
    camera.aspect=w/h;
    camera.fov=w<h?72:60;
    camera.updateProjectionMatrix();
  }
}

/* automatic quality: if the phone can't keep ~28 fps, drop resolution, then shadows, then resolution again.
   qStage 0..2 = steps taken so far, 3 = settled (also the test hook window.__noq starts here). */
var qStage=window.__noq?3:0,qN=0,qT=0;
function updateQuality(F){
  var rawDt=F.rawDt;
  if(!intro.on&&qStage<3&&rawDt<1){
    qN++;
    qT+=rawDt;
    if(qN>=90){
      var avg=qT/qN;
      qN=0;
      qT=0;
      if(avg>0.036){
        qStage++;
        if(qStage===1){
          renderer.setPixelRatio(1);
          renderer.setSize(VW,VH);
        }else if(qStage===2){
          sunLight.castShadow=false;
        }else{
          renderer.setPixelRatio(0.75);
          renderer.setSize(VW,VH);
        }
      }else if(avg<0.024)qStage=3;
    }
  }
}

var t0=performance.now(),prev=t0;
function frame(ms){
  F.ms=ms;
  F.rawDt=(ms-prev)/1000;
  F.dt=Math.min(0.05,F.rawDt);
  F.t=(ms-t0)/1000;
  prev=ms;
  for(var i=0;i<FRAME_STEPS.length;i++)FRAME_STEPS[i](F);
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {VH,VW,qStage};
