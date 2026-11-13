/* Lifted from legacy/src/js/62_footprints.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './60_player.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {hgt} from 'virtual:island-shape';
import {scene} from './05_core.js';
import {waveH,waves} from './36_waves.js';
import {intro,player} from './60_player.js';

/* Footprints in dry sand (a ring buffer of instanced decals; the swash washes them away). */

var FPN=70,
    fpI=0,
    fpXZ=new Float32Array(FPN*2),
    fpH=new Float32Array(FPN),
    fpLast={x:player.x,z:player.z},
    fpSide=1,
    fpM=new THREE.Matrix4(),
    fpQ=new THREE.Quaternion(),
    fpE=new THREE.Euler(),
    fpS=new THREE.Vector3(1,1,1),
    fpP=new THREE.Vector3(),
    fpZero=new THREE.Matrix4().makeScale(0,0,0);
var fpG=new THREE.CircleGeometry(0.075,10);
fpG.rotateX(-Math.PI/2);
fpG.scale(1,1,1.9);
var fpMesh=new THREE.InstancedMesh(fpG,new THREE.MeshBasicMaterial({color:0x7a6646,transparent:true,opacity:0.34,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),FPN);
(function(){
  for(var i=0;i<FPN;i++){
    fpMesh.setMatrixAt(i,fpZero);
    fpH[i]=99;
  }
})();
fpMesh.frustumCulled=false;
fpMesh.renderOrder=1;
scene.add(fpMesh);

/* frame step: lay a print every stride on dry sand; wash away prints the swash reaches */
function updateFootprints(F){
  var t=F.t,g1=F.ground;
  var fdx=player.x-fpLast.x,fdz=player.z-fpLast.z,fd=Math.hypot(fdx,fdz);
  if(fd>0.72){
    fpLast.x=player.x;
    fpLast.z=player.z;
    var fh=hgt(player.x,player.z);
    if(!intro.on&&fh>0.1&&fh<1.7&&g1===fh){
      fpSide=-fpSide;
      var fhx=fdx/fd,fhz=fdz/fd;
      fpP.set(player.x+fhz*0.13*fpSide,0,player.z-fhx*0.13*fpSide);
      fpP.y=hgt(fpP.x,fpP.z)+0.025;
      fpE.set(0,Math.atan2(fhx,fhz),0);
      fpQ.setFromEuler(fpE);
      fpM.compose(fpP,fpQ,fpS);
      fpMesh.setMatrixAt(fpI,fpM);
      fpH[fpI]=fpP.y;
      fpXZ[fpI*2]=fpP.x;
      fpXZ[fpI*2+1]=fpP.z;
      fpI=(fpI+1)%FPN;
      fpMesh.instanceMatrix.needsUpdate=true;
    }
  }
  for(var fi=0;fi<FPN;fi++)if(fpH[fi]<1.7&&(waveH(fpXZ[fi*2],fpXZ[fi*2+1],t),waves.spot.runUp>waves.spot.groundHeight+0.02)){
    fpH[fi]=99;
    fpMesh.setMatrixAt(fi,fpZero);
    fpMesh.instanceMatrix.needsUpdate=true;
  }
}

export {updateFootprints};
