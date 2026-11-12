/* Lifted from legacy/src/js/66_spray.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './64_underwater.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {islandR} from 'virtual:shader-chunks';
import {REEF_BREAK} from './00_config.js';
import {OBSTACLES,camera,renderer,rnd,scene} from './05_core.js';
import {glsl} from './20_glsl.js';
import {sharedUniforms} from './34_sky.js';
import {WP_H,WP_bore,WP_imp,WP_lip,waveH} from './36_waves.js';
import {surfGain} from './70_audio.js';
import {VH} from './90_main.js';

/* Spray: a pool of point sprites thrown up by breaking waves and by water hitting posts and rocks. */

/* the 16 biggest obstacles are also sent to the water shader, which draws foam rings around them */
OBSTACLES.sort(function(a,b){return b.r-a.r;});
(function(){
  for(var i=0;i<16&&i<OBSTACLES.length;i++)sharedUniforms.uObs.value[i].set(OBSTACLES[i].x,OBSTACLES[i].z,OBSTACLES[i].r);
})();
/* particles: position spP, velocity spV, size spS (+growth spG), alpha spA, life left spL of spM, brightness spK.
   surfE is how much is breaking near the camera (0..1) - it also drives the surf sound. */
var SPN=2600,
    surfE=0,
    spP=new Float32Array(SPN*3),
    spS=new Float32Array(SPN),
    spA=new Float32Array(SPN),
    spV=new Float32Array(SPN*3),
    spL=new Float32Array(SPN),
    spM=new Float32Array(SPN),
    spG=new Float32Array(SPN),
    spK=new Float32Array(SPN),
    spI=0;
var sprayDir=new THREE.Vector3();
var spGeo=new THREE.BufferGeometry();
spGeo.setAttribute('position',new THREE.BufferAttribute(spP,3));
spGeo.setAttribute('aSize',new THREE.BufferAttribute(spS,1));
spGeo.setAttribute('aAlpha',new THREE.BufferAttribute(spA,1));
var spU={uPx:{value:600},uCol:{value:new THREE.Color(1,1,1)}};
var spray=new THREE.Points(spGeo,new THREE.ShaderMaterial({uniforms:spU,transparent:true,depthWrite:false,fog:false,
  vertexShader:glsl('spray.vert'),
  fragmentShader:glsl('spray.frag')}));
spray.frustumCulled=false;
spray.renderOrder=7;
scene.add(spray);
function emit(x,y,z,vx,vy,vz,life,size,grow,k){
  var i=spI;
  spI=(spI+1)%SPN;
  spP[i*3]=x;
  spP[i*3+1]=y;
  spP[i*3+2]=z;
  spV[i*3]=vx;
  spV[i*3+1]=vy;
  spV[i*3+2]=vz;
  spL[i]=life;
  spM[i]=life;
  spS[i]=size;
  spG[i]=grow;
  spK[i]=k;
}

/* frame step: spray. Samples the wave model around the camera and throws droplets where lips land, off crests,
   from bores and where water hits posts and rocks; then moves every live droplet. Also sets the surf loudness. */
function updateSpray(F){
  var t=window.__freeze?sharedUniforms.uTime.value:F.t,dt=F.dt,   /* (frozen waves in the test tools: spray follows the frozen wave) */d=F.day,ng=F.night,under=F.under;
  var cpx=camera.position.x,cpz=camera.position.z,crad=Math.hypot(cpx,cpz);
  var cth=Math.atan2(cpz,cpx);
  /* look for breaking water around the stretch of reef the camera is facing (30 m ahead of it), not just beside it */
  camera.getWorldDirection(sprayDir);
  var lth=Math.atan2(cpz+sprayDir.z*30,cpx+sprayDir.x*30);
  if(Math.abs(crad-islandR(cth))<110&&!under){
    var sE=0,rf=Math.min(1,dt*30);
    for(var sk=0;sk<170;sk++){
      var sth=(sk&1?cth:lth)+(rnd()-0.5)*(sk&1?0.6:0.32),
          sgr=REEF_BREAK-11+rnd()*21,   /* where the swell breaks on the reef edge, and the white water just inside it */
          sR=islandR(sth)+sgr,
          sx=Math.cos(sth)*sR,
          sz=Math.sin(sth)*sR;
      var se=waveH(sx,sz,t),ix=-Math.cos(sth),iz=-Math.sin(sth),hp=Math.sqrt(WP_H+0.08);
      sE+=WP_imp*2+WP_bore;
      if(WP_imp>0.12&&rnd()<WP_imp*1.6*rf){
        var nn=3+Math.floor(rnd()*9*WP_H);
        for(var sn=0;sn<nn;sn++)emit(sx+ix*0.3+(rnd()-0.5)*0.9,se+0.1+rnd()*0.3*WP_H,sz+iz*0.3+(rnd()-0.5)*0.9,ix*(1+rnd()*2.4)+(rnd()-0.5)*1.4,(1.6+rnd()*3.4)*hp,iz*(1+rnd()*2.4)+(rnd()-0.5)*1.4,0.6+rnd()*0.7,0.035+rnd()*0.055,0.05,0.85);
        if(rnd()<0.5)emit(sx,se+0.25,sz,ix*0.9,0.9+rnd(),iz*0.9,1.2+rnd()*0.9,0.45+rnd()*0.5,1.1,0.15);
        /* the burst where the lip lands: clouds of mist thrown up and forward */
        emit(sx,se+0.3,sz,ix*(0.6+rnd()*1.6),(1.1+rnd()*1.5)*hp,iz*(0.6+rnd()*1.6),1.6+rnd()*1.2,1.0+rnd()*1.2,2.4,0.10);
        emit(sx+(rnd()-0.5)*2,se+0.2,sz+(rnd()-0.5)*2,ix*(0.4+rnd()),(0.7+rnd()*1.0)*hp,iz*(0.4+rnd()),1.8+rnd()*1.2,1.2+rnd()*1.2,2.0,0.08);
      }else if(WP_lip>0.3&&rnd()<WP_lip*0.6*rf){
        emit(sx,se+0.25*WP_H+0.1,sz,-ix*(0.4+rnd())+(rnd()-0.5)*0.5,0.8+rnd()*1.3,-iz*(0.4+rnd())+(rnd()-0.5)*0.5,0.45+rnd()*0.5,0.03+rnd()*0.04,0.04,0.8);
        /* spindrift: mist torn off the top of the lip and carried back over the wave */
        if(rnd()<0.7)emit(sx,se+0.45*WP_H+0.15,sz,-ix*(1.2+rnd()*1.8),0.9+rnd()*1.4,-iz*(1.2+rnd()*1.8),1.3+rnd()*0.9,0.4+rnd()*0.5,1.5,0.11);
      }else if(WP_bore>0.4&&rnd()<WP_bore*0.45*rf){
        emit(sx,se+0.05,sz,ix*(0.5+rnd()*1.2),0.7+rnd()*1.5,iz*(0.5+rnd()*1.2),0.4+rnd()*0.45,0.03+rnd()*0.045,0.04,0.8);
        /* white water carries a low cloud of mist along with it */
        emit(sx+(rnd()-0.5)*1.5,se+0.1+0.3*WP_H,sz+(rnd()-0.5)*1.5,ix*(1.4+rnd()),0.3+rnd()*0.6,iz*(1.4+rnd()),1.0+rnd()*0.8,0.6+rnd()*0.8+WP_H,1.3,0.09);
        if(rnd()<0.35)emit(sx+(rnd()-0.5)*1.5,se+0.2+0.4*WP_H,sz+(rnd()-0.5)*1.5,ix*(1.2+rnd()),0.5+rnd()*0.9,iz*(1.2+rnd()),1.4+rnd()*1.1,0.8+rnd()*1.0+WP_H,1.5,0.08);
      }
    }
    surfE+=(Math.min(1,sE/14)-surfE)*Math.min(1,dt*3);
    if(surfGain)surfGain.gain.value=0.22+0.55*surfE;
    for(var oi2=0;oi2<OBSTACLES.length;oi2++){
      var ob=OBSTACLES[oi2],oe=waveH(ob.x,ob.z,t),ov=(oe-ob.prev)/Math.max(dt,0.008);
      ob.prev=oe;
      if(oe>ob.g+0.06){
        var pw=Math.max(0,ov-0.7)*0.8+WP_bore*0.7+WP_imp;
        if(pw>0.35&&rnd()<pw*dt*22){
          var on=2+Math.floor(pw*5*rnd());
          for(var oj=0;oj<on;oj++){
            var oa=rnd()*6.283;
            emit(ob.x+Math.cos(oa)*ob.r*0.9,oe+0.05,ob.z+Math.sin(oa)*ob.r*0.9,Math.cos(oa)*(0.4+rnd()*1.2),(1.1+rnd()*2.1)*Math.min(1.5,0.5+pw),Math.sin(oa)*(0.4+rnd()*1.2),0.45+rnd()*0.5,0.03+rnd()*0.05,0.04,0.85);
          }
          if(rnd()<0.3)emit(ob.x,oe+0.15,ob.z,0,0.5+rnd()*0.5,0,0.9+rnd()*0.5,0.3+rnd()*0.3+ob.r*0.3,0.8,0.12);
        }
      }
    }
  }
  for(var si=0;si<SPN;si++){
    if(spL[si]>0){
      spL[si]-=dt;
      var s3=si*3,dr=1-1.1*dt;
      spV[s3+1]-=(spG[si]>0.5?2.6:6.8)*dt;   /* mist (the particles that grow) hangs in the air; droplets fall */
      spV[s3]*=dr;
      spV[s3+1]*=dr;
      spV[s3+2]*=dr;
      spP[s3]+=spV[s3]*dt;
      spP[s3+1]+=spV[s3+1]*dt;
      spP[s3+2]+=spV[s3+2]*dt;
      spS[si]+=spG[si]*dt;
      var lf=spL[si]/spM[si];
      spA[si]=spL[si]>0?Math.min(1,(1-lf)*9)*lf*spK[si]:0;
    }
  }
  spGeo.attributes.position.needsUpdate=true;
  spGeo.attributes.aSize.needsUpdate=true;
  spGeo.attributes.aAlpha.needsUpdate=true;
  spU.uPx.value=renderer.getPixelRatio()*VH*0.5/Math.tan(camera.fov*Math.PI/360);
  spU.uCol.value.setRGB((1-0.75*ng),(0.8+0.2*d)*(1-0.75*ng),(0.75+0.25*d)*(1-0.75*ng));
}

export {updateSpray};
