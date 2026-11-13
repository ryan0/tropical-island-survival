/* A bridge. Build 78's 24_instances.js is now src/world/instance-cells.ts; this makes the one set of map squares at the same
   point in start-up and keeps the names the lifted plant files call. */
import './23_clouds.js';   /* first, so that the files still run in build 78's order */
import {createInstanceCells} from '../../world/instance-cells.ts';
import {camera,scene} from './05_core.js';

var instanceCells=createInstanceCells(scene);
/* For looking at one kind of plant on its own (tools/plants.js): while plantKind is set, e.g. {g:'palm',s:'palm tall'},
   splitInstances notes the meshes it makes under group g and a few of the places under sample name s. */
var plantKind=null,PLANT_REG={};
function plantSample(g,s,x,y,z,size){
  var R=PLANT_REG[g]=PLANT_REG[g]||{meshes:[],samples:{}};
  (R.samples[s]=R.samples[s]||[]).push([x,y,z,size]);
}
/* splitInstances(mesh, pad, maxDist, lod): see instance-cells.ts. pad = how far one instance can reach from its own origin;
   maxDist (optional) = not drawn beyond it; lod (optional) = {geo, dist, cell}: a simpler shape beyond dist. */
function splitInstances(im,pad,maxDist,lod){
  if(plantKind&&plantKind.s){
    for(var i=0;i<im.count;i+=Math.max(1,Math.floor(im.count/40))){
      var pm=im.instanceMatrix.array,po=i*16;
      plantSample(plantKind.g,plantKind.s,pm[po+12],pm[po+13],pm[po+14],Math.hypot(pm[po],pm[po+1],pm[po+2]));
    }
  }
  var meshes=instanceCells.split(im,{reach:pad,shownWithin:maxDist||0,simpler:lod?{shape:lod.geo,beyond:lod.dist,cellSize:lod.cell}:null});
  if(plantKind){
    var R=PLANT_REG[plantKind.g]=PLANT_REG[plantKind.g]||{meshes:[],samples:{}};
    meshes.forEach(function(m){R.meshes.push(m);});
  }
}
/* frame step: for every square, pick the full shape, the simpler shape or nothing by its distance from the camera.
   (__lod: test hook, 1 = always full, 2 = always simple) */
function updateInstanceCells(F){
  instanceCells.update(camera.position,window.__lod?(window.__lod===1?'always full':'always simpler'):'follow distance');
}

/* other files may not assign to a variable they import, so they call these */
function setPlantKind(v){plantKind=v;}
export {PLANT_REG,instanceCells,plantSample,setPlantKind,splitInstances,updateInstanceCells};
