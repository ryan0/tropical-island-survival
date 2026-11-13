/* A bridge. Build 78's 24_instances.js is now src/world/instance-cells.ts; this makes the one set of map squares at the same
   point in start-up, for the rocks, the reef and the plants to put their instances in. */
import './23_clouds.js';   /* first, so that the files still run in build 78's order */
import {createInstanceCells} from '../../world/instance-cells.ts';
import {camera,scene} from './05_core.js';

var instanceCells=createInstanceCells(scene);

/* frame step: for every square, pick the full shape, the simpler shape or nothing by its distance from the camera.
   (__lod: test hook, 1 = always full, 2 = always simple) */
function updateInstanceCells(F){
  instanceCells.update(camera.position,window.__lod?(window.__lod===1?'always full':'always simpler'):'follow distance');
}

export {instanceCells,updateInstanceCells};
