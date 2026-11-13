/* A bridge. Build 78's 45_plants.js is now src/world/plants/ (plants.ts, the plant models and the leaf pictures); this
   plants the island's other plants, and the things lying on the ground under them, at the same point in start-up. */
import './44_grass.js';   /* first, so that the files still run in build 78's order */
import {hgt} from 'virtual:shader-chunks';
import {createPlants} from '../../world/plants/plants.ts';
import {renderer,rndStream} from './05_core.js';
import {instanceCells} from './24_instances.js';
import {landmarks} from './30_terrain.js';
import {rocks} from './39_rocks.js';
import {palms} from './40_palms.js';

createPlants({random:rndStream('plants'),groundHeight:hgt,landmarks:landmarks,isInRock:rocks.isInRock,
  palmFrondPicture:palms.frondPicture,instanceCells:instanceCells,maxAnisotropy:renderer.capabilities.getMaxAnisotropy()});
