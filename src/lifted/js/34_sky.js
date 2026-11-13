/* A bridge. Build 78's 34_sky.js is now src/sky/ (day-cycle.ts, sky-light.ts, sky-dome.ts, sun-glare.ts); this builds them
   at the same point in start-up, still gathers the uniforms every shader shares (which go to src/core/ last of all), and
   passes on what the lifted files expect. */
import './32_lights.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {createDayCycle} from '../../sky/day-cycle.ts';
import {createSkyDome} from '../../sky/sky-dome.ts';
import {createSkyLight} from '../../sky/sky-light.ts';
import {createSunGlare} from '../../sky/sun-glare.ts';
import {WATER_LEVEL} from './00_config.js';
import {camera,scene,sharedUniforms} from './05_core.js';
import {detailTex} from './22_detail.js';
import {CLOUD_H,CLOUD_W,clouds} from './23_clouds.js';
import {VH,VW} from './90_main.js';

var dayCycle=createDayCycle(),skyLight=createSkyLight();

/* One set of uniforms shared by every custom shader (sky, water, terrain, plants, flame):
     uTime seconds, uSunDir/uSunCol, uTop/uHor sky colours, uDay/uNight 0..1, uLevel sea level,
     uUnder 1 when the camera is under water, uFogC underwater fog colour, uObs the 16 biggest obstacles (x,z,radius),
     uDet the detail texture (22_detail.js), uCloudA/uCloudB the two sky pictures of the clouds being blended, uCloudMix how far from A to B, uCloudShift how far each has drifted, uCloudShade the map of their shadows, uSunThru how much sun reaches the camera through them (clouds.ts), uCloudSun/uCloudShd the colours of sunlit and shaded cloud, uReef how high the coral heads stand (47_reef.js), uWind the wind's strength 0..1 (clouds.ts), uCam the camera's position (for materials three.js does not give it to),
     uDbg debug switch (0 normal, 1 waves off, 2 no falling lip, 3 plain water colour).
   The sky's light and the clouds each own theirs (sky-light.ts, clouds.ts); the rest are made here. */
Object.assign(sharedUniforms,{uTime:{value:0},uLevel:{value:0},uUnder:{value:0},uBandOn:{value:0},uDbg:{value:0},uFogC:{value:new THREE.Color()},
  uDet:{value:detailTex},uReef:{value:null},uCam:{value:new THREE.Vector3()},uObs:{value:(function(){
  var a=[];
  for(var i=0;i<16;i++)a.push(new THREE.Vector3(0,0,-1));
  return a;
})()}},skyLight.uniforms,clouds.uniforms);
var skyDome=createSkyDome({scene:scene,uniforms:sharedUniforms,cloudPictureWidth:CLOUD_W,cloudPictureHeight:CLOUD_H});
/* The button in the corner names the time of day; it opens the menu (75_menu.js), where a time can be chosen and held. */
var todBtn=document.getElementById('tod'),sunGlare=createSunGlare(document.getElementById('glare'),camera);

/* frame step: sun position and sky colours for the current time of day -> shared uniforms, fog colour.
   Sets F.day (0..1 daylight), F.night (0..1), F.vis (=1-night), F.sunEl (sun elevation, radians), F.sunCol ([r,g,b]). */
function updateSky(F){
  var light=skyLight.light;
  dayCycle.update(F.dt,F.rawDt,!!window.__freeze);
  skyLight.update(dayCycle.sunHeight(),dayCycle.isMorning());
  todBtn.textContent=light.timeOfDay;
  if(!window.__freeze)sharedUniforms.uTime.value=F.t;
  sharedUniforms.uLevel.value=WATER_LEVEL;
  scene.fog.color.copy(sharedUniforms.uHor.value);
  skyDome.update(camera.position);
  sharedUniforms.uCam.value.copy(camera.position);
  F.day=light.daylight;
  F.night=light.night;
  F.vis=1-light.night;
  F.sunEl=light.sunElevation;
  F.sunCol=light.sunColour;
}

/* frame step: the soft sun glare overlay (a DOM element positioned over the sun) */
var glareFrame={sunDirection:sharedUniforms.uSunDir.value,sunElevation:0,night:0,sunThrough:1,isUnderWater:false,viewWidth:0,viewHeight:0};
function updateGlare(F){
  glareFrame.sunElevation=F.sunEl;
  glareFrame.night=F.night;
  glareFrame.sunThrough=F.sunThru;
  glareFrame.isUnderWater=F.under;
  glareFrame.viewWidth=VW;
  glareFrame.viewHeight=VH;
  sunGlare.update(glareFrame);
}

export {dayCycle,sharedUniforms,todBtn,updateGlare,updateSky};
