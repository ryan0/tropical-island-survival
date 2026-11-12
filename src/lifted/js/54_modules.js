/* Lifted from legacy/src/js/54_modules.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './52_life.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {hgt,islandR} from 'virtual:shader-chunks';
import {CAMP} from './00_config.js';
import {camera,rndStream,scene} from './05_core.js';
import {HOME_X,HOME_Z,HUT_X,HUT_Z,PIER_LEN,PIER_X,PIER_Z0,shoreZ} from './30_terrain.js';
import {waveH} from './36_waves.js';
import {FIRE_X,FIRE_Z} from './48_fire.js';
import {buildProps} from './50_props.js';
import {buildLife} from './52_life.js';

/* Props and wildlife are self-contained "modules": a function build(THREE, scene, moduleApi) that adds its objects and
   returns {update(t, dt, moduleEnv)}. moduleApi is what they may ask the world (ground height, positions of landmarks);
   moduleEnv is what they are told each frame. A module that throws is dropped; the rest of the scene carries on. */

var modules=[],moduleEnv={day:1,night:0,waterLevel:0,camera:camera,playerPos:camera.position};
var moduleApi={hgt:hgt,shoreZ:shoreZ,islandR:islandR,pier:{x:PIER_X,z0:PIER_Z0,len:PIER_LEN,deckTop:1.0,width:2.4},hut:{x:HUT_X,z:HUT_Z},home:{x:HOME_X,z:HOME_Z},fire:{x:FIRE_X,z:FIRE_Z}};
(CAMP?[buildProps,buildLife]:[buildLife]).forEach(function(build){
  var name=build===buildProps?'buildProps':'buildLife';   /* (was build.name, which does not survive the bundler shortening names) */
  try{
    var mo=build(THREE,scene,Object.assign({},moduleApi,{rnd:rndStream(name)}));   /* each module its own random stream */
    if(mo&&mo.update)modules.push(mo);
  }catch(e){console.log('module '+name+' failed: '+e.message);}
});

/* frame step: props and wildlife */
function updateModules(F){
  var t=F.t,dt=F.dt;
  moduleEnv.day=F.day;
  moduleEnv.night=F.night;
  moduleEnv.waterLevel=waveH(PIER_X+2.3,PIER_Z0+PIER_LEN-3,t);
  for(var mi=modules.length-1;mi>=0;mi--){
    try{modules[mi].update(t,dt,moduleEnv);}catch(er){
      console.log('module update failed: '+er.message);
      modules.splice(mi,1);
    }
  }
}

export {updateModules};
