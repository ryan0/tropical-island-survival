/* The player: position and view direction, walking / swimming / diving, the opening fly-in, place-name captions, input.
   player = {x,z,y} is the eye position; yaw and pitch the view direction; swimY the eye height while swimming. */

/* what the player stands on: the terrain */
function ground(x,z){
  return hgt(x,z);
}
var player={x:3,z:shoreZ(3,1.0)-1.5,y:3},yaw=Math.PI-0.75,pitch=-0.02,stickX=0,stickY=0,keys={},moved=false,bob=0;
var titleEl=document.getElementById('title'),capEl=document.getElementById('cap');
/* the opening fly-in: the camera travels from intro.A to wherever the player camera is */
var intro={t:0,dur:9,on:true,speed:1,A:new THREE.Vector3(),F:new THREE.Vector3(),qa:new THREE.Quaternion(),qb:new THREE.Quaternion()};
intro.A.set(player.x-150,205,player.z+225);
(function(){
  var ic=new THREE.PerspectiveCamera();
  ic.position.copy(intro.A);
  ic.lookAt(0,0,25);
  intro.qa.copy(ic.quaternion);
})();
document.body.classList.add('intro');
function skipIntro(){if(intro.on)intro.speed=5;}
/* place names shown when the player walks into a spot (index = what zoneAt() returns) */
var ZN=[['',''],['Campfire','warmer after dark'],['Shelter','a roof of fronds'],['The Lagoon','still water inside the ring'],['The Sandbank','you swam all this way'],['Open Water','the atoll looks small from here']];
var swimY=0.5,swimHint=false,capZone=-1,capTimer=0;
function zoneAt(x,z,sw,g){
  if(CAMP&&Math.hypot(x-FIRE_X,z-FIRE_Z)<3.2)return 1;
  if(CAMP&&Math.hypot(x-HUT_X,z-HUT_Z)<6.5)return 2;
  if(Math.hypot(x-sandbankX(),z-sandbankZ())<19&&g>0.3)return 4;
  if(sw){
    var r=Math.hypot(x,z),th=Math.atan2(z,x),R=islandR(th);
    if(r<R-landW(th)-8)return 3;
    if(r>R+75)return 5;
  }
  return -1;
}
/* ---------- input: on-screen stick, drag to look, keyboard ---------- */
var joy=document.getElementById('joy'),knob=document.getElementById('knob'),jid=null;
function jset(e){
  var r=joy.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
  var l=Math.hypot(dx,dy),mx=46;
  if(l>mx){
    dx*=mx/l;
    dy*=mx/l;
  }
  stickX=dx/mx;
  stickY=dy/mx;
  knob.style.transform='translate('+dx+'px,'+dy+'px)';
}
joy.addEventListener('pointerdown',function(e){
  skipIntro();
  jid=e.pointerId;
  try{joy.setPointerCapture(jid);}catch(_){}
  jset(e);
  if(!moved){
    moved=true;
    hintEl.style.opacity=0;
  }
  e.preventDefault();
});
joy.addEventListener('pointermove',function(e){if(e.pointerId===jid)jset(e);});
function jend(e){
  if(e.pointerId!==jid)return;
  jid=null;
  stickX=stickY=0;
  knob.style.transform='';
}
joy.addEventListener('pointerup',jend);
joy.addEventListener('pointercancel',jend);
var looks={};
canvas.addEventListener('pointerdown',function(e){
  skipIntro();
  looks[e.pointerId]={x:e.clientX,y:e.clientY};
  try{canvas.setPointerCapture(e.pointerId);}catch(_){}
});
canvas.addEventListener('pointermove',function(e){
  var l=looks[e.pointerId];
  if(!l)return;
  yaw-=(e.clientX-l.x)*0.0055;
  pitch-=(e.clientY-l.y)*0.0055;
  pitch=Math.max(-1.2,Math.min(1.2,pitch));
  l.x=e.clientX;
  l.y=e.clientY;
});
function lend(e){delete looks[e.pointerId];}
canvas.addEventListener('pointerup',lend);
canvas.addEventListener('pointercancel',lend);
window.addEventListener('keydown',function(e){
  skipIntro();
  keys[e.key.toLowerCase()]=1;
});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=0;});

/* frame step: walking, swimming and diving, the opening fly-in, and the camera. Sets F.ground and F.swimming. */
function updatePlayer(F){
  var t=F.t,dt=F.dt;
  /* move */
  var mf=-stickY,mr=stickX;
  if(keys.w||keys.arrowup)mf=1;
  if(keys.s||keys.arrowdown)mf=-1;
  if(keys.a)mr=-1;
  if(keys.d)mr=1;
  if(keys.arrowleft)yaw+=dt*1.6;
  if(keys.arrowright)yaw-=dt*1.6;
  if(intro.on){
    mf=0;
    mr=0;
  }
  var g0=ground(player.x,player.z),swim=g0<-1.2,sp=swim?3.6:(g0<-0.2?4.2:6.5);
  var fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
  player.x+=(fx*mf+rx*mr)*sp*dt;
  player.z+=(fz*mf+rz*mr)*sp*dt;
  var rr=Math.hypot(player.x,player.z);
  if(rr>420){
    player.x*=420/rr;
    player.z*=420/rr;
  }
  var mv=Math.min(1,Math.hypot(mf,mr));
  bob+=dt*mv*(swim?4:9);
  var g1=ground(player.x,player.z),ty;
  if(g1>-1.2){
    swimY=0.5;
    ty=g1+1.7+Math.sin(bob)*0.035*mv;
  }else{
    swimY=Math.max(g1+0.55,Math.min(0.5,swimY+Math.sin(pitch)*mf*sp*dt));
    ty=swimY+(swimY>0.2?waveH(player.x,player.z,t):0)+Math.sin(t*1.6)*(swimY>0.3?0.04:0.02);
    if(!swimHint&&!intro.on){
      swimHint=true;
      capEl.innerHTML='<b>Swimming</b><span>look down and push forward to dive</span>';
      capEl.style.opacity=1;
      capTimer=5;
    }
  }
  player.y+=(ty-player.y)*Math.min(1,dt*7);
  camera.position.set(player.x,player.y,player.z);
  camera.rotation.set(pitch,yaw,0);
  if(intro.on){
    intro.t+=dt*intro.speed;
    var ik=Math.min(1,intro.t/intro.dur);
    ik=ik*ik*ik*(ik*(ik*6-15)+10);
    intro.qb.copy(camera.quaternion);
    intro.F.copy(camera.position);
    camera.position.lerpVectors(intro.A,intro.F,ik);
    camera.position.y+=Math.sin(ik*Math.PI)*5;
    camera.quaternion.copy(intro.qa).slerp(intro.qb,ik);
    if(ik>0.5)titleEl.style.opacity=0;
    if(ik>=1){
      intro.on=false;
      document.body.classList.remove('intro');
    }
  }
  if(window.__fly){
    var fly=window.__fly;
    camera.position.set(fly[0],fly[1],fly[2]);
    camera.rotation.set(fly[4],fly[3],0);
  }
  F.ground=g1;
  F.swimming=g1<=-1.2;
}

/* frame step: place names that fade in when the player enters a named spot */
function updateCaptions(F){
  var dt=F.dt,g1=F.ground;
  var zn=intro.on?-1:zoneAt(player.x,player.z,g1<-1.2,g1);
  if(zn!==capZone){
    capZone=zn;
    if(zn>=0){
      capEl.innerHTML='<b>'+ZN[zn][0]+'</b><span>'+ZN[zn][1]+'</span>';
      capEl.style.opacity=1;
      capTimer=4.5;
    }
  }
  if(capTimer>0){
    capTimer-=dt;
    if(capTimer<=0)capEl.style.opacity=0;
  }
}
