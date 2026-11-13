/* A bridge. Build 78's 38_water.js is now src/sea/ (water.ts, wave-mesh.ts, lagoon-shore-band.ts and water-materials.ts,
   with the water's shaders beside them); this builds the sea at the same point in start-up and passes on what the lifted
   files expect. */
import './36_waves.js';   /* first, so that the files still run in build 78's order */
import {sandbankX,sandbankZ} from 'virtual:island-shape';
import {createWaterMaterials} from '../../sea/water-materials.ts';
import {createWater} from '../../sea/water.ts';
import {windDirection} from '../../sky/weather.ts';
import {camera,scene,sharedUniforms} from './05_core.js';
import {CLOUD_SHADE_SPAN} from './23_clouds.js';
import {landmarks} from './30_terrain.js';
import {island} from './36_waves.js';
import {player} from './60_player.js';

var waterMaterials=createWaterMaterials({uniforms:sharedUniforms,home:landmarks.home,cloudShadeSpan:CLOUD_SHADE_SPAN*1000,windDirection:windDirection()});
var water=createWater({scene:scene,camera:camera,island:island,sandbank:{x:sandbankX(),z:sandbankZ()},createMaterial:waterMaterials.create});
var farSea=water.farSea,waveMesh=water.waveMesh,waveMat=water.waveMaterial,bandPieces=water.bandPieces,
    waveMeshInfo=water.waveMeshDescription,bandInfo=water.bandDescription;

/* frame step: the far sea is a big sheet that follows the player; each wave-mesh sector shows the level of detail that suits its distance */
var waterFrame={player:null,wind:0,isCameraUnderWater:false};
function updateWater(F){
  waterFrame.player=player;
  waterFrame.wind=sharedUniforms.uWind.value;
  waterFrame.isCameraUnderWater=sharedUniforms.uUnder.value>0.5;
  water.update(waterFrame);
  sharedUniforms.uBandOn.value=water.isBandShown?1:0;
}

export {bandInfo,bandPieces,farSea,updateWater,waterMaterials,waveMat,waveMesh,waveMeshInfo};
