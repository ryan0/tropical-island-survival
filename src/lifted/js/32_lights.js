/* A bridge. Build 78's 32_lights.js is now src/sky/lights.ts; this builds the lights at the same point in start-up and
   passes each frame on. */
import './30_terrain.js';   /* first, so that the files still run in build 78's order */
import {createLights} from '../../sky/lights.ts';
import {camera,renderer,scene} from './05_core.js';
import {sharedUniforms} from './34_sky.js';

/* Sun (casts the shadows), moon and ambient sky light. */
var lights=createLights({scene:scene,renderer:renderer,camera:camera}),sunLight=lights.sunLight;

/* frame step: sun, moon and ambient light follow the time of day; the shadow camera follows the player */
var lightsFrame={sunDirection:null,daylight:1,night:0,sunElevation:0,sunColour:null,sunThrough:1};
function updateLights(F){
  lightsFrame.sunDirection=sharedUniforms.uSunDir.value;
  lightsFrame.daylight=F.day;
  lightsFrame.night=F.night;
  lightsFrame.sunElevation=F.sunEl;
  lightsFrame.sunColour=F.sunCol;
  lightsFrame.sunThrough=F.sunThru;
  lights.update(lightsFrame);
}

export {sunLight,updateLights};
