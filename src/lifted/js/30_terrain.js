/* A bridge. Build 78's 30_terrain.js is now src/world/ (landmarks.ts, terrain.ts, ground-grit.ts); this finds the landmarks
   and builds the ground at the same point in start-up and passes on the names the lifted files expect. */
import './24_instances.js';   /* first, so that the files still run in build 78's order */
import {GLSL_SRC,hgt,islandR} from 'virtual:shader-chunks';
import {glslVec2} from '../../shaders/defines.ts';
import {windDirection} from '../../sky/weather.ts';
import {createLandmarks} from '../../world/landmarks.ts';
import {createTerrain} from '../../world/terrain.ts';
import {rndStream,scene,sharedUniforms} from './05_core.js';
import {CLOUD_SHADE_SPAN} from './23_clouds.js';

/* Landmarks. Everything placed by hand sits on the home islet (the wide southern one) and is measured from its ocean beach. */
var landmarks=createLandmarks(hgt,islandR),
    HOME_X=landmarks.home.x,HOME_Z=landmarks.home.z,HOME_SHORE=landmarks.homeShoreZ,
    HUT_X=landmarks.hut.x,HUT_Z=landmarks.hut.z,
    PIER_X=landmarks.pier.x,PIER_Z0=landmarks.pier.z0,PIER_LEN=landmarks.pier.length,
    shoreZ=landmarks.shoreZ,pathD=landmarks.pathDistance,nearHome=landmarks.nearHome;
function ringPoint(rnd){
  var point=landmarks.ringPoint(rnd);
  return [point.x,point.z];
}

/* The wind's direction, for the lagoon's shore break. The chunk reads it from a define, which the cleaned terrain gives
   its own shader; the water's shaders are still lifted, so for them the define is written at the head of the chunk. */
var wind=windDirection();
GLSL_SRC.lagwave='#define LAGOON_WIND_DIRECTION '+glslVec2(wind[0],wind[1])+'\n'+GLSL_SRC.lagwave;

createTerrain({scene:scene,random:rndStream('terrain'),groundHeight:hgt,landmarks:landmarks,uniforms:sharedUniforms,
  windDirection:wind,cloudShadeSpan:CLOUD_SHADE_SPAN*1000});

export {HOME_SHORE,HOME_X,HOME_Z,HUT_X,HUT_Z,PIER_LEN,PIER_X,PIER_Z0,nearHome,pathD,ringPoint,shoreZ};
