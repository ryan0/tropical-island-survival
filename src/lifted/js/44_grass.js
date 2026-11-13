/* A bridge. Build 78's 44_grass.js is now src/world/plants/ (grass.ts and its shapes and pictures); this grows the grass
   and the sea grass at the same point in start-up. */
import './40_palms.js';   /* first, so that the files still run in build 78's order */
import {hgt,sandbankX,sandbankZ} from 'virtual:shader-chunks';
import {createGrass} from '../../world/plants/grass.ts';
import {rndStream,sharedUniforms} from './05_core.js';
import {instanceCells} from './24_instances.js';
import {landmarks} from './30_terrain.js';
import {rocks} from './39_rocks.js';

createGrass({random:rndStream('grass'),groundHeight:hgt,landmarks:landmarks,sandbank:{x:sandbankX(),z:sandbankZ()},
  isInRock:rocks.isInRock,uniforms:sharedUniforms,instanceCells:instanceCells});
