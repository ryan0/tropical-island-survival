/* A bridge. Build 78's 39_rocks.js is now src/world/rocks/; this builds the rocks at the same point in start-up and passes
   on what the lifted files expect: where the plants must not grow and the rocks in the surf. */
import './38_water.js';   /* first, so that the files still run in build 78's order */
import {hgt,islandR,landW,passGap} from 'virtual:island-shape';
import {createRocks} from '../../world/rocks/rocks.ts';
import {CAMP} from './00_config.js';
import {OBSTACLES,rndStream,sharedUniforms} from './05_core.js';
import {instanceCells} from './24_instances.js';
import {landmarks} from './30_terrain.js';

var rocks=createRocks({random:rndStream('rocks'),island:{groundHeight:hgt,radius:islandR,landWidth:landW,passGap:passGap},
  landmarks:landmarks,hasCamp:CAMP,uniforms:sharedUniforms,instanceCells:instanceCells});
/* rocks standing in the surf register as OBSTACLES (spray and foam round them: 66_spray.js) */
rocks.inSurf.forEach(function(rock){OBSTACLES.push({x:rock.x,z:rock.z,r:rock.radius,g:rock.groundHeight,prev:0});});

export {rocks};
