/* A bridge. Build 78's 39_rocks.js is now src/world/rocks/; this builds the rocks at the same point in start-up and passes
   on what the lifted files expect: where the plants must not grow, the rocks in the surf, and the rock material. */
import './39_foliage.js';   /* first, so that the files still run in build 78's order */
import {hgt,islandR,landW,passGap} from 'virtual:shader-chunks';
import {createRocks} from '../../world/rocks/rocks.ts';
import {CAMP} from './00_config.js';
import {OBSTACLES,rndStream,sharedUniforms} from './05_core.js';
import {instanceCells} from './24_instances.js';
import {landmarks} from './30_terrain.js';

var rocks=createRocks({random:rndStream('rocks'),island:{groundHeight:hgt,radius:islandR,landWidth:landW,passGap:passGap},
  landmarks:landmarks,hasCamp:CAMP,uniforms:sharedUniforms,instanceCells:instanceCells});
/* rocks standing in the surf register as OBSTACLES (spray and foam round them: 66_spray.js) */
rocks.inSurf.forEach(function(rock){OBSTACLES.push({x:rock.x,z:rock.z,r:rock.radius,g:rock.groundHeight,prev:0});});

/* inRock(x,z,margin) tells the plants (40_palms, 44_grass, 45_plants) where not to grow */
var inRock=rocks.isInRock;
/* reefRockMat(style): the rock material, for the coral heads' rock in 47_reef.js too */
function reefRockMat(style){
  return rocks.createMaterial({scale:style.SCALE,crack:style.CRACK,pit:style.PIT,bump:style.BUMP,bleach:style.BLEACH,barnacle:style.BARNACLE});
}

export {inRock,reefRockMat};
