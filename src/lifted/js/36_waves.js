/* Lifted from legacy/src/js/36_waves.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './34_sky.js';   /* first, so that the files still run in build 78's order */
import {GLSL_SRC,hgt,islandR,openSea,shoreH} from 'virtual:shader-chunks';
import {REEF_BREAK,WATER_LEVEL,WAVE_TRAINS} from './00_config.js';
import {glslFloat,smoothstep} from './05_core.js';
import {glslFill} from './20_glsl.js';

/* The wave model.

   The real thing is the shader src/glsl/waves.glsl (it moves the water mesh). Each wave shoals by Green's law
   (H ~ depth^-1/4) and starts to break where H = 0.78 x depth. Its progress q then runs 0..1 while the crest throws a
   lip that falls ahead of it, 1..1.6 while that collapses, and afterwards it runs in as a bore (H ~ 0.55 x depth).

   This file writes the wave trains from 00_config.js into that shader and holds a JavaScript copy of the same
   maths for everything that is not a shader: swimming height, spray, footprints being washed away, the boat.
   IF YOU CHANGE ONE, CHANGE THE OTHER - `node tools/check.js` compares the two on the GPU and fails when they drift. */

/* one wave train's lines of the wave shader (src/glsl/wave_train.glsl) with its numbers written in */
function trainGlsl(vars){
  return GLSL_SRC.wave_train.replace(/\{\{(\w+)\}\}/g,function(_,k){return vars[k];});
}
glslFill('waves',{TRAINS:WAVE_TRAINS.map(function(T,i){
  return trainGlsl({i:i,A:glslFloat(T.A),g:glslFloat(T.g),c:glslFloat(T.c),c17:glslFloat(T.c*1.7),om:glslFloat(T.om),m:glslFloat(T.m),ph:glslFloat(T.ph),cu:glslFloat(T.cu),ru:glslFloat(T.ru)});
}).join(''),REEF:glslFloat(REEF_BREAK)});
/* ---------- the same model in JavaScript ----------
   waveH(x,z,t) returns the water surface height the shader will draw at (x,z) at time t, and leaves details about
   that spot in the WP_ variables:
     WP_h    ground height there            WP_Hr   how high the swash is running up the beach
     WP_lip  0..1 a lip is falling here     WP_imp  0..1 a lip is landing here
     WP_bore 0..1 a broken wave front       WP_H    height of the breaking wave (m)
   It leaves out the hollow face and the falling lip of a breaking wave (it only lifts the crest). With noLip it
   leaves breaking out altogether, which is what tools/check.js compares against the shader with its lip switched off. */
function wsizeJ(As,psi,c){
  var P=Math.pow(0.5+0.5*Math.sin(psi*18+2.5*Math.sin(psi*6+c)+c),2.2);
  return As*(0.62+0.55*P+0.25*(0.5+0.5*Math.sin(psi*9+c*5)));
}
var WP_Hr=0,WP_h=0,WP_lip=0,WP_imp=0,WP_bore=0,WP_H=0;
var WP_trains=null;   /* debugging: set to [] and waveH fills in each train's numbers at that spot (see __lag.waveInfo) */
function waveH(x,z,t,noLip){
  var th=Math.atan2(z,x),R=55;
  if(Math.hypot(x,z)<islandR(th)-9){
    /* inside the ring. The lagoon is still water (it is drawn by the far sea, not by the wave mesh). */
    WP_lip=0;WP_imp=0;WP_bore=0;WP_H=0;WP_Hr=0;
    WP_h=hgt(x,z);
    return WATER_LEVEL;
  }
  var h=shoreH(x,z);
  var s=R*(Math.sqrt(Math.max(1-h/5,0.04))-1),
      sr=s-REEF_BREAK,                       /* metres outside the line where the swell breaks on the reef */
      ur=1+sr/R,
      cs=Math.sqrt(Math.max(0,Math.min(40,s))+1.5),
      tau=2.6*cs+Math.max(s-40,0)/4.95+Math.min(s,0)*1.06;
  var env=(1-smoothstep(62,95,s))*(0.68+0.32*smoothstep(-0.4,0.8,Math.sin(th)))*openSea(th),
      eta=0,
      Hr=0,
      cw=[0,0,0],
      gate=smoothstep(-1.5,0.3,s),
      dd=Math.max(0.12,Math.min(6,5*(ur*ur-1))),
      sh=Math.pow(6/dd,0.25),
      sho=1-smoothstep(0.35,1.3,Math.max(0.12,Math.min(6,-h))),   /* the shore break: see waves.glsl */
      lim=0.66*Math.max(0.12,Math.min(6,-h))+0.04;
  WP_lip=0;
  WP_imp=0;
  WP_bore=0;
  WP_H=0;
  for(var i=0;i<3;i++){
    var T=WAVE_TRAINS[i],As=T.A*env*(0.70+0.30*Math.sin(t*T.g+th*2+T.c))*(0.88+0.12*Math.sin(th*13+T.c*1.7+t*0.05));
    var w0=T.om*(t+tau)+T.m*th+T.ph,fb=(w0+1.5708)/6.2832,n=Math.floor(fb),Aw=wsizeJ(As,th-6.2832*n/T.m,T.c);
    Aw+=(0.95*As-Aw)*smoothstep(0.75,1,Math.abs(fb-n-0.5)*2);
    var w=w0+1.6*(Aw-As)*(1-smoothstep(0,45,sr)),
        H0=Math.min(1.65*Aw,1),
        HS0=Math.min(1.65*As,1),
        db=Math.pow(Math.max(H0,1e-4)*2.0064,0.8),
        dbS=Math.pow(Math.max(HS0,1e-4)*2.0064,0.8);
    var Hb=0.78*db,HbS=0.78*dbS,sb=R*(Math.sqrt(1+db/5)-1),sbS=R*(Math.sqrt(1+dbS/5)-1);
    var ho=smoothstep(0.55,1.05,Hb),
        wd=Math.max(Math.min((1.3+2.6*Hb)*(1+0.45*ho),0.85*sb),0.3),
        q=(sb-sr)/wd,
        qS=(sbS-sr)/Math.max(Math.min(1.3+2.6*HbS,0.85*sbS),0.3);
    var sig=smoothstep(-1.8,0,q),xi=((w-1.5708+0.45*sig+3.1416)%6.2832+6.2832)%6.2832-3.1416,k=T.om*1.3/cs;
    /* qc: the breaking stage measured at this wave's crest, so the whole wave agrees on it (see waves.glsl) */
    var qc=q+Math.max(-1.6,Math.min(1.4,xi))*(1-smoothstep(2.2,3,Math.abs(xi)))/(k*wd);
    var post=smoothstep(0.95,1.6,qc),postS=smoothstep(0.95,1.6,qS);
    var Hp=Math.min(Hb,(0.05+0.12*Hb+0.55*(dd-0.12)+0.66*Hb*(1-smoothstep(1.5,6,qc)))*(1+2.2*sho),lim),
        HpS=Math.min(HbS,(0.05+0.12*HbS+0.55*(dd-0.12)+0.5*HbS*(1-smoothstep(1.5,6,qS)))*(1+0.8*sho),lim);
    var H=(Math.min(H0*sh,Hb*1.05)*(1-post)+Hp*post)*gate;
    var HS=(Math.min(HS0*sh,HbS*1.05)*(1-postS)+HpS*postS)*gate;
    var kc=1+(Math.max(0.55/k,1)-1)*smoothstep(-5,-1.2,q),
        wc=Math.max(-3.1416,Math.min(3.1416,xi*kc))+1.5708-0.45*sig;
    var Cpk=Math.pow(Math.max(0.5+0.5*Math.sin(wc+0.45*sig*Math.sin(wc)),1e-4),2.4+3.6*sig);
    var fw=Math.min(0.75,1.4*k)*(1-0.6*sho);
    var Cb=smoothstep(-0.2-fw,-0.2,xi)*Math.exp(-Math.max(xi,0)*Math.max(0.6,0.4/k)*(1+0.9*sho))*(1-smoothstep(1.2,2.2,xi))*(1+0.30*Math.sin(th*190+xi*3+T.c)*Math.sin(th*67-w0*0.5)),C=Cpk*(1-post)+Cb*post;
    var plg=(1-smoothstep(1.9,3.2,0.18*(6.2832/T.om)*1.25/Math.sqrt(Math.max(Hb,0.02))))*T.cu,
        M=noLip?0:smoothstep(-0.6,-0.1,qc)*(1-smoothstep(1.0,1.8,qc))*plg;
    var be=Math.max(0,Math.min(1,qc)),
        cr=smoothstep(0.9,1.15,qc)*(1-smoothstep(1.5,2.4,qc))*plg,
        xc=xi+0.40,
        xs=xi+1.4,
        size=smoothstep(0.03,0.10,Aw),
        near=smoothstep(-1.05,-0.5,xi)*(1-smoothstep(0.2,0.55,xi));
    if(WP_trains)WP_trains[i]={As:As,Aw:Aw,Hb:Hb,sb:sb,q:q,qc:qc,xi:xi,M:M,post:post,H:H,ho:ho,k:k};
    cw[i]=0.62*H*C;
    var y0=0.62*H*C-0.22*HS;
    eta+=y0-0.10*H*M*Math.exp(-xs*xs/0.35)+0.45*Hb*cr*Math.exp(-xc*xc/0.16);
    /* a wave about to break stands up: its crest and back are lifted (the hollow face and the lip are left out) */
    eta+=(-0.22*HS-0.10*H+1.15*H-y0)*M*(xi>=0.1?1-smoothstep(0,1,(xi-0.1)/Math.min(1.1,3.6*k)):smoothstep(-0.5,-0.1,xi));
    WP_lip=Math.max(WP_lip,M*near*smoothstep(0.25,0.9,be)*size);
    WP_imp=Math.max(WP_imp,cr*Math.exp(-xc*xc/0.3)*size);
    WP_bore=Math.max(WP_bore,post*smoothstep(-0.2-1.25*fw,-0.2-0.4*fw,xi)*(1-smoothstep(-0.3,0.6,xi))*size*Math.exp(-Math.max(q-1.6,0)*0.5));
    WP_H=Math.max(WP_H,Hb*Math.max(near*M,cr,Cb*post*Math.exp(-Math.max(q-1.6,0)*0.5)));
    var fbs=(T.om*(t+3.184)+T.m*th+T.ph-1.5708)/6.2832,
        kk=Math.floor(fbs),
        qq=(fbs-kk)*6.2832,
        Ak=wsizeJ(As,th-6.2832*kk/T.m,T.c);
    Ak+=(0.95*As-Ak)*smoothstep(0.75,1,Math.abs(fbs-kk-0.5)*2);
    qq+=1.6*(Ak-As);
    Hr+=T.ru*Math.min(1.9*Ak*(1+1.8*Ak),1.0)*smoothstep(0,1.0,qq)*(1-smoothstep(1.2,3.8,qq));
  }
  eta+=0.9*(cw[0]*cw[1]+cw[0]*cw[2]+cw[1]*cw[2]);
  Hr*=0.8;
  eta+=0.2*Hr*(1-smoothstep(0,7,s));
  var film=Math.max(-0.2,Math.min(0.10,(Hr-h)*0.3));
  if(h>-0.5&&h+film>eta)eta=h+film;
  WP_Hr=Hr;
  WP_h=h;
  return eta;
}

/* other files may not assign to a variable they import, so they call these */
function setWP_trains(v){WP_trains=v;}
export {WP_H,WP_Hr,WP_bore,WP_h,WP_imp,WP_lip,WP_trains,setWP_trains,waveH};
