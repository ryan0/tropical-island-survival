/* Props and wildlife are self-contained "modules": a function build(THREE, scene, moduleApi) that adds its objects and
   returns {update(t, dt, moduleEnv)}. moduleApi is what they may ask the world (ground height, positions of landmarks);
   moduleEnv is what they are told each frame. A module that throws is dropped; the rest of the scene carries on. */

var modules=[],moduleEnv={day:1,night:0,waterLevel:0,camera:camera,playerPos:camera.position};
var moduleApi={hgt:hgt,shoreZ:shoreZ,islandR:islandR,pier:{x:PIER_X,z0:PIER_Z0,len:PIER_LEN,deckTop:1.0,width:2.4},hut:{x:HUT_X,z:HUT_Z},home:{x:HOME_X,z:HOME_Z},fire:{x:FIRE_X,z:FIRE_Z}};
(CAMP?[buildProps,buildLife]:[buildLife]).forEach(function(build){
  try{
    var mo=build(THREE,scene,Object.assign({},moduleApi,{rnd:rndStream(build.name)}));   /* each module its own random stream */
    if(mo&&mo.update)modules.push(mo);
  }catch(e){console.log('module '+build.name+' failed: '+e.message);}
});

/* frame step: props and wildlife */
function updateModules(F){
  var t=F.t,dt=F.dt;
  moduleEnv.day=F.day;
  moduleEnv.night=F.night;
  moduleEnv.waterLevel=waveH(PIER_X+2.3,PIER_Z0+PIER_LEN-3,t);
  for(var mi=modules.length-1;mi>=0;mi--){
    try{modules[mi].update(t,dt,moduleEnv);}catch(er){
      console.log('module update failed: '+er.message);
      modules.splice(mi,1);
    }
  }
}
