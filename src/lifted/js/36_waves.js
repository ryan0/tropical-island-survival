/* A bridge. Build 78's 36_waves.js is now src/sea/wave-model.ts (the program's copy of the wave model; the wave trains are
   in src/sea/sea-config.ts and reach the shader through src/sea/water-materials.ts). This makes the model at the same point
   in start-up and passes on what the lifted files expect. */
import './34_sky.js';   /* first, so that the files still run in build 78's order */
import {hgt,islandR,landW,openSea,passGap,shoreH} from 'virtual:island-shape';
import {createWaveModel} from '../../sea/wave-model.ts';

/* the island's shape, as the cleaned systems are handed it */
var island={groundHeight:hgt,radius:islandR,landWidth:landW,passGap:passGap,openSea:openSea,shoreHeight:shoreH};
var waves=createWaveModel(island);
/* waveH(x,z,t) returns the water surface height the shader will draw at (x,z) at time t; waves.spot then holds what the
   model found there (ground height, swash, falling and landing lips, bore, breaker height) */
function waveH(x,z,t,noLip){
  return waves.heightAt(x,z,t,noLip);
}

export {island,waveH,waves};
