/* A bridge. Build 78's 64_underwater.js is now src/sea/under-water.ts; this builds it at the same point in start-up and
   passes each frame on. */
import './62_footprints.js';   /* first, so that the files still run in build 78's order */
import {createUnderWater} from '../../sea/under-water.ts';
import {camera,scene,sharedUniforms} from './05_core.js';
import {waves} from './36_waves.js';

var underWater=createUnderWater({scene:scene,camera:camera,waves:waves,fog:scene.fog,overlay:document.getElementById('uw'),uniforms:sharedUniforms});

/* frame step: is the camera below the water surface? Switches fog, the blue overlay and the bubbles.
   Sets F.surfY (water surface height at the camera) and F.under. */
function updateUnderwater(F){
  underWater.update(F.t,F.day,F.night);
  F.surfY=underWater.surfaceHeight;
  F.under=underWater.isCameraUnder;
}

export {updateUnderwater};
