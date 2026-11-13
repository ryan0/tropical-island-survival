/* A bridge. Build 78's 52_life.js is now src/life/ (one file for each animal); this builds the wildlife where
   54_modules.js asks for it, from what the lifted files still hold, and passes each frame on. */
import './48_fire.js';   /* first, so that the files still run in build 78's order */
import {createLife} from '../../life/life.ts';
import {createFishModel} from '../../world/reef/fish-model.ts';

/* Wildlife: fish, turtle, crabs, gulls, reef. Built once by buildLife(); see 54_modules.js. */
function buildLife(THREE, scene, api) {
  var life=createLife({scene:scene,random:api.rnd,groundHeight:api.hgt,islandRadius:api.islandR,home:api.home,hut:api.hut,
    pier:{x:api.pier.x,z0:api.pier.z0,length:api.pier.len},fishModel:createFishModel});
  var frame={time:0,dt:0,daylight:1,night:0,waterLevel:0,player:null};
  return {
    update:function(t,dt,env){
      frame.time=t;
      frame.dt=dt;
      frame.daylight=env.day;
      frame.night=env.night;
      frame.waterLevel=env.waterLevel||0;
      frame.player=env.playerPos;
      life.update(frame);
    }
  };
}

export {buildLife};
