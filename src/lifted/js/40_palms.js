/* A bridge. Build 78's 40_palms.js is now src/world/plants/ (palms.ts and its shapes and pictures); this plants the palms
   at the same point in start-up. */
import './39_rocks.js';   /* first, so that the files still run in build 78's order */
import {hgt,sandbankX,sandbankZ} from 'virtual:island-shape';
import {createPalms} from '../../world/plants/palms.ts';
import {renderer,rndStream,sharedUniforms} from './05_core.js';
import {instanceCells} from './24_instances.js';
import {landmarks} from './30_terrain.js';
import {rocks} from './39_rocks.js';

var palms=createPalms({random:rndStream('palms'),groundHeight:hgt,landmarks:landmarks,sandbank:{x:sandbankX(),z:sandbankZ()},
  isInRock:rocks.isInRock,uniforms:sharedUniforms,instanceCells:instanceCells,maxAnisotropy:renderer.capabilities.getMaxAnisotropy()});

export {palms};
