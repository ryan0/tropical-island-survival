/* Lifted from legacy/src/js/64_underwater.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './62_footprints.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {camera,scene} from './05_core.js';
import {sharedUniforms} from './34_sky.js';
import {WP_h,waveH} from './36_waves.js';

/* Being under water: fog, the blue overlay with light rays (#uw in the page), rising bubbles. */

var uwEl=document.getElementById('uw');
var BUB=46,bubPos=new Float32Array(BUB*3),bubGeo=new THREE.BufferGeometry();
bubGeo.setAttribute('position',new THREE.BufferAttribute(bubPos,3));
var bubC=document.createElement('canvas');
bubC.width=bubC.height=32;
(function(){
  var x=bubC.getContext('2d');
  x.beginPath();
  x.arc(16,16,11,0,6.283);
  x.fillStyle='rgba(255,255,255,.22)';
  x.fill();
  x.strokeStyle='rgba(255,255,255,.95)';
  x.lineWidth=3;
  x.stroke();
})();
var bubbles=new THREE.Points(bubGeo,new THREE.PointsMaterial({map:new THREE.CanvasTexture(bubC),size:0.09,transparent:true,depthWrite:false,opacity:0.8}));
bubbles.frustumCulled=false;
bubbles.visible=false;
bubbles.renderOrder=6;
scene.add(bubbles);

/* frame step: is the camera below the water surface? Switches fog, the blue overlay and the bubbles.
   Sets F.surfY (water surface height at the camera) and F.under. */
function updateUnderwater(F){
  var t=F.t,d=F.day,ng=F.night;
  var surfY=waveH(camera.position.x,camera.position.z,t),
      under=camera.position.y<surfY-0.02&&surfY-WP_h>0.12,   /* below the surface, and there is actually water here */
      dayf=(1-0.8*ng)*(0.55+0.45*d);
  sharedUniforms.uUnder.value=under?1:0;
  sharedUniforms.uFogC.value.setRGB(0.04*dayf,0.38*dayf,0.50*dayf);
  if(under){
    scene.fog.color.copy(sharedUniforms.uFogC.value);
    scene.fog.near=0.5;
    scene.fog.far=55;
  }else{
    scene.fog.near=220;
    scene.fog.far=2600;
  }
  uwEl.style.opacity=under?1:0;
  bubbles.visible=under;
  if(under){
    uwEl.style.setProperty('--ray',dayf.toFixed(2));
    for(var bi2=0;bi2<BUB;bi2++){
      var bph=(t*0.22+bi2*0.173)%1,bang=bi2*2.4,brr=0.7+(bi2%7)*0.55;
      bubPos[bi2*3]=camera.position.x+Math.cos(bang)*brr+Math.sin(t*1.3+bi2)*0.07;
      bubPos[bi2*3+1]=Math.min(surfY-0.08,camera.position.y-2.2+bph*4.2);
      bubPos[bi2*3+2]=camera.position.z+Math.sin(bang)*brr+Math.cos(t*1.1+bi2)*0.07;
    }
    bubGeo.attributes.position.needsUpdate=true;
  }
  F.surfY=surfY;
  F.under=under;
}

export {updateUnderwater};
