/* A bridge. Build 78's 47_reef.js is now src/world/reef/; this builds the reef at the same point in start-up, gives the
   water's and the sand's shaders its map of the coral heads, and passes each frame on to its fish. */
import './45_plants.js';   /* first, so that the files still run in build 78's order */
import {hgt} from 'virtual:shader-chunks';
import {createReef} from '../../world/reef/reef.ts';
import {camera,rndStream,scene,sharedUniforms} from './05_core.js';
import {instanceCells} from './24_instances.js';
import {landmarks} from './30_terrain.js';
import {rocks} from './39_rocks.js';

var reef=createReef({scene:scene,random:rndStream('reef'),groundHeight:hgt,landmarks:landmarks,isInRock:rocks.isInRock,
  createRockMaterial:rocks.createMaterial,uniforms:sharedUniforms,instanceCells:instanceCells});
sharedUniforms.uReef.value=reef.map;

/* frame step: move the reef fish */
function updateReef(F){
  reef.update(sharedUniforms.uTime.value,camera.position);
}

export {updateReef};
