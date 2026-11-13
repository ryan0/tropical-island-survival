/* A bridge. Build 78's 48_fire.js is now src/world/camp/fire.ts; this builds the campfire at the same point in start-up
   and passes each frame on. */
import './47_reef.js';   /* first, so that the files still run in build 78's order */
import {hgt} from 'virtual:island-shape';
import {createFire} from '../../world/camp/fire.ts';
import {CAMP} from './00_config.js';
import {scene,sharedUniforms} from './05_core.js';
import {landmarks} from './30_terrain.js';

var FIRE_X=landmarks.fire.x,FIRE_Z=landmarks.fire.z;
var fire=createFire({scene:scene,uniforms:sharedUniforms,groundHeight:hgt,place:landmarks.fire,hasCamp:CAMP});

/* frame step: flame flicker, fire light (brighter at night) and rising embers */
function updateFire(F){
  fire.update(F.t,F.day);
}

export {FIRE_X,FIRE_Z,updateFire};
