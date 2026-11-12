/* Lifted from legacy/src/js/32_lights.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './30_terrain.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {camera,mix3,renderer,scene,smoothstep} from './05_core.js';
import {sharedUniforms} from './34_sky.js';

/* Sun (casts the shadows), moon and ambient sky light.

   Shadows are drawn into a picture (the shadow map) of a square box of the world. On foot the box is 96 m across and
   sits ahead of the camera, where you are looking, so a dot of the map is under 5 cm and palm fronds throw sharp
   dappled shade. The higher the camera, the bigger the box (five sizes, up to the whole island seen from the air).
   Nothing that casts a shadow moves, so the picture is only redrawn when it has to be: when the box must move (it
   moves in steps of whole dots, so shadows never shimmer) or change size, or when the sun has moved. */

var hemi=new THREE.HemisphereLight(0xffffff,0x9a8a66,0.8);
scene.add(hemi);
var sunLight=new THREE.DirectionalLight(0xffffff,1);
scene.add(sunLight);
scene.add(sunLight.target);
sunLight.castShadow=true;
sunLight.shadow.mapSize.set(2048,2048);
sunLight.shadow.bias=-0.0004;
renderer.shadowMap.autoUpdate=false;
var SHADOW_HALF=[48,72,108,162,243],        /* half the box's width at each size (m) */
    shadowHalf=0,shadowAt=new THREE.Vector3(),shadowSun=new THREE.Vector3(),shadowLive=false,
    shadowRight=new THREE.Vector3(),shadowUp=new THREE.Vector3(),shadowMid=new THREE.Vector3(),shadowLook=new THREE.Vector3();
var moon=new THREE.DirectionalLight(0x8fa8ff,0);
moon.position.set(-60,66,-54);
scene.add(moon);

/* frame step: sun, moon and ambient light follow the time of day; the shadow camera follows the player */
function updateLights(F){
  var d=F.day,ng=F.night,vis=F.vis,el=F.sunEl,sc=F.sunCol;
  moon.intensity=ng*0.34;
  sunLight.color.setRGB(sc[0],sc[1],sc[2]);
  /* the sun is warm and strong and the sky fills the shade with blue, so shade is clearly cooler than sunlit ground.
     A low sun strikes flat ground at a shallow angle; it is made stronger then, as an eye (or a camera) adapts. */
  sunLight.intensity=vis*(0.50+0.80*d)*(1+1.2*(1-smoothstep(0.08,0.55,el)))*Math.max(0,Math.min(1,el*6+0.6))*(0.22+0.78*F.sunThru);   /* (the last: a cloud across the sun) */
  sunLight.visible=sunLight.intensity>0.02;
  /* which size of box: by the camera's height (a little slack so it does not flip back and forth at a boundary) */
  var sun=sharedUniforms.uSunDir.value,cp=camera.position,live=sunLight.visible&&sunLight.castShadow,si=0,want=48+cp.y*0.9;
  while(si<SHADOW_HALF.length-1&&SHADOW_HALF[si]<want)si++;
  var half=SHADOW_HALF[si];
  if(shadowHalf&&half!==shadowHalf&&Math.abs(want-SHADOW_HALF[Math.min(si,SHADOW_HALF.indexOf(shadowHalf))])<6)half=shadowHalf;
  /* where: on the ground ahead of the camera - where the view meets the ground, but no further than 0.6 of the half-width */
  camera.getWorldDirection(shadowLook);
  var hl=Math.hypot(shadowLook.x,shadowLook.z),ahead=Math.min(half*0.6,shadowLook.y<-0.02?cp.y*hl/-shadowLook.y:1e9);
  shadowMid.set(cp.x+(hl>1e-4?shadowLook.x/hl*ahead:0),0,cp.z+(hl>1e-4?shadowLook.z/hl*ahead:0));
  /* ...rounded to a step of 109 dots along the shadow map's own axes */
  var step=109*2*half/2048;
  shadowRight.set(sun.z,0,-sun.x);
  if(shadowRight.lengthSq()<1e-6)shadowRight.set(1,0,0);
  shadowRight.normalize();
  shadowUp.crossVectors(sun,shadowRight);
  var mr=Math.round(shadowMid.dot(shadowRight)/step)*step,mu=Math.round(shadowMid.dot(shadowUp)/step)*step,ms=Math.round(shadowMid.dot(sun)/step)*step;
  shadowMid.set(0,0,0).addScaledVector(shadowRight,mr).addScaledVector(shadowUp,mu).addScaledVector(sun,ms);
  if(!live||!shadowLive||half!==shadowHalf||shadowMid.distanceToSquared(shadowAt)>1e-4||sun.dot(shadowSun)<0.999999){
    if(half!==shadowHalf){
      var sc2=sunLight.shadow.camera,reach=half*1.3+160;
      sc2.left=sc2.bottom=-half;
      sc2.right=sc2.top=half;
      sc2.near=1;
      sc2.far=reach*2;
      sc2.updateProjectionMatrix();
      sunLight.shadow.normalBias=2.5*2*half/2048;   /* (lifts the surface by 2.5 dots: enough to stop it shading itself) */
      shadowHalf=half;
    }
    shadowAt.copy(shadowMid);
    shadowSun.copy(sun);
    sunLight.target.position.copy(shadowMid);
    sunLight.position.copy(sun).multiplyScalar(shadowHalf*1.3+160).add(shadowMid);
    renderer.shadowMap.needsUpdate=true;
  }
  shadowLive=live;
  var hc=mix3([.74,.66,.74],[.78,.90,1.06],d),gc=mix3([.62,.42,.34],[.86,.78,.60],d);   /* light from the sky; light bounced up off the sand */
  hemi.color.setRGB(hc[0],hc[1],hc[2]);
  hemi.groundColor.setRGB(gc[0],gc[1],gc[2]);
  hemi.intensity=(0.15+0.36*(1-0.85*ng)*(0.6+0.4*d)+0.22*(1-d)*vis)*(0.84+0.16*F.sunThru);   /* (+ the glow of the whole evening sky) */
}

export {sunLight,updateLights};
