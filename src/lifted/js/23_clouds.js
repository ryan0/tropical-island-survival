/* A bridge. Build 78's 23_clouds.js is now src/sky/ (clouds.ts, weather.ts, cloud-noise.ts, weather-map.ts, cloud-field.ts);
   this builds the weather and the clouds at the same point in start-up and passes on what the lifted files expect. */
import './22_detail.js';   /* first, so that the files still run in build 78's order */
import {createCloudNoise} from '../../sky/cloud-noise.ts';
import {createClouds} from '../../sky/clouds.ts';
import {cloudsConfig} from '../../sky/clouds-config.ts';
import {createWeatherMap} from '../../sky/weather-map.ts';
import {createWeather} from '../../sky/weather.ts';
import {camera,renderer} from './05_core.js';
import {sharedUniforms} from './34_sky.js';

var CLOUD_W=window.__cloudW||cloudsConfig.pictureWidth,CLOUD_H=CLOUD_W/8,   /* (window.__cloudW: tests ask for smaller sky pictures) */
    CLOUD_WIND=cloudsConfig.drift,CLOUD_SHADE_SPAN=cloudsConfig.shadeMapSpan;
var weather=createWeather(),
    clouds=createClouds({renderer:renderer,weather:weather,noise:createCloudNoise(),weatherMap:createWeatherMap(),pictureWidth:CLOUD_W}),
    cloudShade=clouds.shadeMap;

/* frame step: redraw a little more of the cloud picture, and tell the sky which pictures to blend and how far each has drifted.
   Sets F.sunThru: how much of the sun gets through the clouds to the camera. */
var cloudsFrame={time:0,dt:0,realSeconds:0,isClockStopped:false,sunDirection:null,night:0,cameraPosition:camera.position};
function updateClouds(F){
  cloudsFrame.isClockStopped=!!window.__freeze;
  if(cloudsFrame.isClockStopped)weather.set(window.__weather,window.__wind);   /* (tests choose the weather) */
  cloudsFrame.time=sharedUniforms.uTime.value;
  cloudsFrame.dt=F.dt;
  cloudsFrame.realSeconds=F.rawDt;
  cloudsFrame.sunDirection=sharedUniforms.uSunDir.value;
  cloudsFrame.night=sharedUniforms.uNight.value;
  clouds.update(cloudsFrame);
  F.sunThru=clouds.sunThrough;
}

export {CLOUD_H,CLOUD_SHADE_SPAN,CLOUD_W,CLOUD_WIND,cloudShade,clouds,updateClouds,weather};
