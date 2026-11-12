/* Lifted from legacy/src/js/47_reef.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './45_plants.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {hgt} from 'virtual:shader-chunks';
import {camera,rndStream,scene,smoothstep} from './05_core.js';
import {glsl} from './20_glsl.js';
import {setPlantKind,splitInstances} from './24_instances.js';
import {HOME_X,HOME_Z,PIER_LEN,PIER_X,PIER_Z0} from './30_terrain.js';
import {sharedUniforms} from './34_sky.js';
import {inRock,reefRockMat} from './39_rocks.js';

/* The coral reef in the lagoon: coral heads (mounds of reef rock, "bommies") scattered over the sandy floor in 1.8-7 m of
   water, each packed with corals of five kinds (lobed mounds, fine-branched bushes, tables, knobs, staghorn), and smaller corals on the sand round them. Everything is built here
   from simple shapes with colours painted on their corners; each kind is one model, drawn many times with its own
   size, turn and tint (24_instances.js cuts them into map squares). Colours are dimmed by depth as the water does
   it: red goes first. The sunlight's ripple pattern (caustics) plays over them as it does over the sand. */
/* reefFishGeo(deep,paint): the fish model, for the schools in 52_life.js too */
var reefFishGeo=null;
(function(){
  var rnd=rndStream('reef');
  /* join shapes into one model (corner positions, facing, colour) */
  function merge(list){
    var P=[],N=[],C=[],U=[];
    list.forEach(function(g0){
      var g=g0.index?g0.toNonIndexed():g0,pa=g.attributes.position.array,na=g.attributes.normal.array,ca=g.attributes.color.array,ua=g.attributes.uv.array,j;
      for(j=0;j<pa.length;j++){
        P.push(pa[j]);
        N.push(na[j]);
        C.push(ca[j]);
      }
      for(j=0;j<ua.length;j++)U.push(ua[j]);
    });
    var o=new THREE.BufferGeometry();
    o.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
    o.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
    o.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
    o.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
    return o;
  }
  /* move every corner of a shape (fn returns the new [x,y,z]) and paint it (shade returns its brightness, or [r,g,b]) */
  function work(g,fn,shade){
    var pa=g.attributes.position,C=[],i,v;
    for(i=0;i<pa.count;i++){
      v=fn?fn(pa.getX(i),pa.getY(i),pa.getZ(i)):[pa.getX(i),pa.getY(i),pa.getZ(i)];
      pa.setXYZ(i,v[0],v[1],v[2]);
      var c=shade(v[0],v[1],v[2]);
      if(typeof c==='number')C.push(c,c,c);
      else C.push(c[0],c[1],c[2]);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
    g.computeVertexNormals();
    return g;
  }
  /* a lumpy field: a few sine waves with random phases (cheap, smooth, different for every model) */
  function lumpy(n){
    var ph=[];
    for(var i=0;i<n*4;i++)ph.push(rnd()*6.283,2+rnd()*5);
    return function(x,y,z){
      var a=0;
      for(var k=0;k<n;k++)a+=Math.sin(x*ph[k*8+1]+ph[k*8])*Math.sin(y*ph[k*8+3]+ph[k*8+2])*Math.sin(z*ph[k*8+5]+ph[k*8+4]);
      return a/n;
    };
  }
  var UP=new THREE.Vector3(0,1,0),ONE=new THREE.Vector3(1,1,1);
  /* a tapering stick from a point along a direction, painted dark at the foot (b0) to pale at the tip (b1) */
  function stick(out,ox,oy,oz,dx,dy,dz,len,r0,r1,sides,b0,b1,cap){
    var l=Math.hypot(dx,dy,dz),g=new THREE.CylinderGeometry(r1,r0,len,sides,1,!cap);
    g.translate(0,len/2,0);
    work(g,null,function(x,y){return b0+(b1-b0)*y/len;});
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(ox,oy,oz),new THREE.Quaternion().setFromUnitVectors(UP,new THREE.Vector3(dx/l,dy/l,dz/l)),ONE));
    out.push(g);
    return [ox+dx/l*len,oy+dy/l*len,oz+dz/l*len];
  }

  /* ---- the models (each about a metre across at size 1) ---- */
  /* a coral head: a platform of old reef rock, steep-sided and nearly flat on top, with an uneven outline; pale, crusted
     pink and tufted yellow-green in patches, dark low down and under its rim (which is what outlines it from above) */
  function headGeo(){
    var f=lumpy(3),f2=lumpy(3),g=new THREE.SphereGeometry(1,26,14,0,6.2832,0,1.5708);
    return merge([work(g,function(x,y,z){
      var rho=Math.hypot(x,z),a=Math.atan2(z,x),out=1.06+0.09*Math.sin(a*2+f(1,2,3)*9)+0.06*Math.sin(a*5+1.7)+0.06*f(x*3,y*3,z*3)+0.04*f2(x*8,y*8,z*8);
      var top=Math.pow(Math.max(0,1-Math.pow(rho,3.5)),0.5),hy=top*(0.92+0.08*f2(x*4,0,z*4))+0.05*f(x*6,1,z*6)*top;
      /* (the foot spreads out in irregular buttresses, so the rock runs into the sea floor rather than standing on it;
         the sides are rough and ledged) */
      var foot=Math.max(0,1-hy/0.45);
      out*=1+foot*(0.12+0.26*Math.abs(Math.sin(a*3.5+f(3,1,2)*6)))+0.07*(1-foot)*f(x*7,hy*9,z*7)*smoothstep(0.7,1,rho)+0.05*Math.sin(hy*21+a*2)*smoothstep(0.75,1,rho);
      return [x*out,hy,z*out];
    },function(x,y,z){
      var crust=f(x*3+3,y*4,z*3+1),turf=f2(x*5,y*5,z*5),b=(0.72+0.58*smoothstep(0.2,0.95,y))*(0.86+0.3*f2(x*9,y*9,z*9)+0.2*f(x*4,y*6,z*4));
      return crust>0.3?[b*1.03,b*0.84,b*0.88]:(turf>0.45?[b*0.86,b*0.90,b*0.60]:[b,b*0.97,b*0.90]);
    })]);
  }
  /* a lump of broken reef rock, for the rubble that lies round the foot of a head */
  function rubbleGeo(){
    var f=lumpy(3),g=new THREE.SphereGeometry(0.5,8,6);
    return merge([work(g,function(x,y,z){
      var k=1+0.34*f(x*4,y*4,z*4)+0.14*f(x*9,y*9,z*9);
      return [x*k,y*k*0.7,z*k];
    },function(x,y,z){return 0.8+0.5*y+0.35*f(x*8,y*8,z*8);})]);
  }
  /* lobed coral (Porites): a mound of smooth rounded lobes */
  function brainGeo(far){
    var f=lumpy(3),g=new THREE.SphereGeometry(0.5,far?9:20,far?5:10,0,6.2832,0,1.8);
    return merge([work(g,function(x,y,z){
      var k=1+0.17*f(x*5,y*5,z*5)+0.05*f(x*11,y*11,z*11);
      return [x*k,y*0.8*k,z*k];
    },function(x,y,z){return 0.74+0.45*y+0.42*f(x*5,y*5,z*5);})]);
  }
  /* bushy coral (Acropora): a dome of many short fine branches, paler at the tips */
  function bushGeo(far){
    var out=[],n=far?0:62,k,g=new THREE.SphereGeometry(far?0.42:0.34,9,5,0,6.2832,0,1.7),f=lumpy(2);
    /* (seen from far off, just the dome, a little larger and mottled pale as the tips make it) */
    out.push(work(g,function(x,y,z){return [x,y*0.75,z];},function(x,y,z){return far?0.8+0.5*y+0.3*f(x*14,y*14,z*14):0.5;}));
    for(k=0;k<n;k++){
      /* stubs all over the dome, pointing outward and up, each forking once */
      var up=Math.pow(rnd(),0.7),a=k*2.4+rnd()*0.5,hr=Math.sqrt(1-up*up),len=0.09+0.06*rnd();
      var e=stick(out,Math.cos(a)*hr*0.31,up*0.24,Math.sin(a)*hr*0.31,Math.cos(a)*hr,up+0.55,Math.sin(a)*hr,len,0.020,0.014,3,0.6,0.95,false);
      for(var t2=0;t2<2;t2++)stick(out,e[0],e[1],e[2],Math.cos(a)*hr+(rnd()-0.5)*1.1,up+0.7,Math.sin(a)*hr+(rnd()-0.5)*1.1,0.06+0.04*rnd(),0.013,0.004,3,0.95,1.35,false);
    }
    return merge(out);
  }
  /* staghorn coral: a thicket of forking branches, pale at the tips */
  function stagGeo(){
    var out=[];
    function fork(ox,oy,oz,dx,dy,dz,len,rad,depth){
      var e=stick(out,ox,oy,oz,dx,dy,dz,len,rad,rad*0.7,depth>0?5:4,0.55+0.1*(3-depth),depth>0?0.7+0.1*(3-depth):1.15,depth===0);
      if(depth<=0)return;
      var n=depth>1?3:2,l=Math.hypot(dx,dy,dz);
      for(var b=0;b<n;b++){
        var a=b*6.283/n+rnd()*1.3,sp=0.5+rnd()*0.35;
        fork(e[0],e[1],e[2],dx/l+Math.cos(a)*sp,dy/l+0.35,dz/l+Math.sin(a)*sp,len*(0.62+0.2*rnd()),rad*0.7,depth-1);
      }
    }
    for(var k=0;k<3;k++){
      var a0=k*2.1+rnd();
      fork(Math.cos(a0)*0.1,-0.04,Math.sin(a0)*0.1,Math.cos(a0)*0.45,1,Math.sin(a0)*0.45,0.26+rnd()*0.08,0.05,2);
    }
    return merge(out);
  }
  /* table coral: a wide thin plate on a short stalk, its rim paler, with a smaller plate above on some */
  function tableGeo(tiers){
    var out=[],f=lumpy(2);
    stick(out,0,-0.05,0,0.1,1,0.05,0.34,0.13,0.09,6,0.5,0.6,false);
    for(var t=0;t<tiers;t++){
      var R=t?0.3:0.5,y0=0.3+t*0.2,g=new THREE.CylinderGeometry(R,R*0.72,0.06,16,1);
      out.push(work(g,function(x,y,z){
        var rr=Math.hypot(x,z)/R,k=1+0.1*f(x*4,0,z*4);
        return [x*k+(t?0.12:0),y0+y+0.07*rr*rr+0.03*f(x*5,1,z*5),z*k];
      },function(x,y,z){
        var rr=Math.hypot(x-(t?0.12:0),z)/R;
        return (y-y0>0.03*rr?0.95:0.7)+0.3*smoothstep(0.7,1.05,rr)+0.08*f(x*9,2,z*9);
      }));
    }
    return merge(out);
  }
  /* cauliflower coral: a tight bunch of knobs */
  function knobGeo(far){
    var out=[],f=lumpy(2);
    for(var k=0;k<(far?1:5);k++){
      var a=k*1.257+rnd(),d=k?0.2:0,r=far?0.36:(k?0.17+rnd()*0.07:0.24),cy=far?0.14:(k?0.12+rnd()*0.08:0.2),g=new THREE.SphereGeometry(r,8,5);
      out.push(work(g,function(x,y,z){
        var q=1+0.14*f(x*14,y*14,z*14);
        return [x*q+Math.cos(a)*d,y*q*0.85+cy,z*q+Math.sin(a)*d];
      },function(x,y,z){return 0.62+1.1*y+0.14*f(x*20,y*20,z*20);}));
    }
    return merge(out);
  }
  /* giant clam: two fat ribbed shells a little open, the fleshy lips between them in a vivid colour (lip = [r,g,b]) */
  function clamGeo(lip){
    var g=new THREE.SphereGeometry(0.5,16,8);
    return merge([work(g,function(x,y,z){
      var rib=1+0.07*Math.sin(x*26);
      return [x*1.25,y*0.62*rib+0.12,z*0.8*rib];
    },function(x,y,z){
      /* the wavy slit along the top */
      var slit=Math.abs(z-0.05*Math.sin(x*16))/(0.05+0.1*Math.max(0,y));
      return y>0.2&&slit<1.3?[lip[0]*(1.2-0.5*slit),lip[1]*(1.2-0.5*slit),lip[2]*(1.2-0.5*slit)]:0.75+0.3*Math.sin(x*26);
    })]);
  }

  /* one material for the lot: plain matt colour, plus the ripple of sunlight through the waves (as terrain_color.glsl draws it on the sand) */
  function reefMat(opts,key){
    var mat=new THREE.MeshLambertMaterial(opts);
    mat.customProgramCacheKey=function(){return key;};
    mat.onBeforeCompile=function(sh){
      sh.uniforms.uDet=sharedUniforms.uDet;
      sh.uniforms.uTime=sharedUniforms.uTime;
      sh.uniforms.uDay=sharedUniforms.uDay;
      sh.uniforms.uLevel=sharedUniforms.uLevel;
      sh.uniforms.uCam=sharedUniforms.uCam;
      sh.uniforms.uWind=sharedUniforms.uWind;
      sh.vertexShader='varying vec3 vRp;\n'+sh.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\n vec4 rwp=vec4(transformed,1.);\n#ifdef USE_INSTANCING\n rwp=instanceMatrix*rwp;\n#endif\n vRp=(modelMatrix*rwp).xyz;');
      sh.fragmentShader='uniform sampler2D uDet;uniform float uTime,uDay,uLevel,uWind;uniform vec3 uCam;varying vec3 vRp;\n'+glsl('seatint')+sh.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\n{vec2 cq=vRp.xz*.34+vec2(uTime*.010,uTime*.006);vec2 cw=(texture2D(uDet,cq*.31+vec2(uTime*.017,-uTime*.013)).rg-.5)*.16;'+
        'float c1=texture2D(uDet,cq+cw).a,c2=texture2D(uDet,vec2(cq.x*.6+cq.y*.8,-cq.x*.8+cq.y*.6)*1.63-cw*1.4).a;float ca=c1*c1;ca*=ca*c1;float ca2=c2*c2;ca2*=ca2;'+
        'vec2 gq=vec2(vRp.x+vRp.y*.8,vRp.z-vRp.y*.6);vec4 dt=texture2D(uDet,gq*1.9);diffuseColor.rgb*=.86+.28*dt.b+.10*(dt.a-.3);'+
        /* close up, the polyps: a fine pitted grain (the detail texture read very small, twice) */
        'float pn=exp(-length(uCam-vRp)*.22);if(pn>.03){vec4 d2=texture2D(uDet,gq*11.),d3=texture2D(uDet,gq.yx*23.);diffuseColor.rgb*=1.+pn*(.42*(d2.a-.35)+.30*(d3.b-.5));}'+
        'diffuseColor.rgb=seaTint(diffuseColor.rgb,vRp,.6,.5);}');
    };
    return mat;
  }
  var solid=reefMat({vertexColors:true},'reef-solid'),rock=reefRockMat({SCALE:0.30,CRACK:0.7,PIT:1.0,BUMP:1.1,BLEACH:0,BARNACLE:0.35});
  /* kind: models, material, tints (before the water dims them), how tall a size-1 one stands */
  var KIND={
    /* (the heads and their rubble are rock: the rock material of 39_rocks.js, cracked and pitted, with the sea's tint) */
    head:{geo:[headGeo(),headGeo(),headGeo()],mat:rock,tall:1,tint:[[.80,.73,.62],[.76,.71,.62],[.84,.75,.65]]},
    rubble:{geo:[rubbleGeo(),rubbleGeo(),rubbleGeo()],mat:rock,tall:0.4,tint:[[.62,.58,.50],[.74,.70,.62],[.56,.54,.50],[.72,.62,.60]]},
    brain:{geo:[brainGeo(),brainGeo(),brainGeo()],far:brainGeo(true),lod:15,mat:solid,tall:0.4,tint:[[.80,.72,.56],[.70,.70,.82],[.78,.72,.58],[.82,.74,.60],[.76,.68,.66]]},
    bush:{geo:[bushGeo(),bushGeo(),bushGeo()],far:bushGeo(true),lod:10,mat:solid,tall:0.5,tint:[[.94,.82,.72],[.84,.78,.90],[.96,.86,.70],[.92,.76,.78],[.92,.84,.72]]},
    stag:{geo:[stagGeo(),stagGeo()],mat:solid,tall:0.85,tint:[[.84,.74,.56],[.70,.70,.86],[.86,.72,.72]]},
    table:{geo:[tableGeo(1),tableGeo(2)],mat:solid,tall:0.6,tint:[[.80,.70,.54],[.74,.68,.76],[.84,.76,.60]]},
    knob:{geo:[knobGeo(),knobGeo()],far:knobGeo(true),lod:11,mat:solid,tall:0.45,tint:[[.86,.72,.56],[.88,.68,.72],[.78,.72,.60]]},
    /* (the same two as simple shapes, for the many small ones that carpet the heads and the slopes) */
    knobS:{geo:[knobGeo(true),knobGeo(true)],mat:solid,tall:0.45,tint:[[.86,.72,.56],[.88,.68,.72],[.78,.72,.60]]},
    brainS:{geo:[brainGeo(true),brainGeo(true)],mat:solid,tall:0.4,tint:[[.80,.72,.56],[.70,.70,.82],[.78,.72,.58],[.76,.68,.66]]},
    clam:{geo:[clamGeo([.15,.45,1.3]),clamGeo([.2,1.0,.75]),clamGeo([.75,.3,1.2])],mat:solid,tall:0.4,tint:[[.92,.90,.86]]}
  };
  var placed={},k;
  for(k in KIND)placed[k]=KIND[k].geo.map(function(){return [];});
  function put(kind,x,y,z,size,tilt,bearing,squash){
    var K=KIND[kind];
    /* nothing may stand nearer the surface than 30 cm */
    if(y+K.tall*size*(squash||1)>-0.12)size=(-0.12-y)/(K.tall*(squash||1));
    if(size<0.2||inRock(x,z,0.2))return;
    placed[kind][Math.floor(rnd()*K.geo.length)].push([x,y,z,size,tilt||0,bearing||0,squash||1]);
  }

  /* ---- where ---- */
  /* the coral heads: in patches, clear of the pier. Where the water is shallow enough they grow up to just under the
     surface, as wide flat platforms; in deeper water they are lower mounds */
  var heads=[],tries,i;
  for(tries=0;tries<60000&&heads.length<70;tries++){
    var x=HOME_X+(rnd()*2-1)*150,z=HOME_Z+(rnd()*2-1)*150,fl=hgt(x,z);
    if(fl>-1.3||fl<-7)continue;
    if(Math.sin(x*.11+1.7*Math.sin(z*.07))*Math.sin(z*.13+1.2*Math.sin(x*.09)+1.)<0.1+rnd()*0.3)continue;
    if(inRock(x,z,1.5)||Math.abs(x-PIER_X)<8&&Math.abs(z-PIER_Z0)<PIER_LEN+10)continue;
    var r=1.4+rnd()*rnd()*5.5,hh=Math.min(-fl-0.72-0.3*rnd(),1.2+r*0.6),ok=hh>0.4;
    for(i=0;ok&&i<heads.length;i++)if(Math.hypot(x-heads[i][0],z-heads[i][1])<(r+heads[i][3])*0.9)ok=false;
    if(!ok)continue;
    heads.push([x,z,fl,r,hh]);
    put('head',x,fl-0.12*hh,z,r,0,rnd()*6.283,hh*1.12/r);
  }
  /* each head is packed with coral: bushes, tables and lobed mounds on top, mounds and knobs down its sides; then
     smaller corals on the sand about it */
  function pick(u){
    var q=rnd();
    if(u<0.8)return q<0.36?'bush':(q<0.56?'table':(q<0.80?'brain':(q<0.93?'knob':'stag')));
    return q<0.5?'brain':(q<0.75?'bush':'knob');
  }
  var SIZE={table:[0.7,1.7],stag:[0.6,1.1],brain:[0.6,1.9],bush:[0.6,1.3],knob:[0.6,1.2]};
  heads.forEach(function(h){
    var n=Math.round(6+h[3]*h[3]*4.4),j,a,u,kind,sz;
    for(j=0;j<n;j++){
      a=rnd()*6.283;
      u=Math.sqrt(rnd())*1.04;
      kind=pick(u);
      sz=(SIZE[kind][0]+rnd()*(SIZE[kind][1]-SIZE[kind][0]))*Math.min(1,0.5+h[3]*0.2);
      put(kind,h[0]+Math.cos(a)*u*h[3],h[2]-0.12*h[4]+1.03*h[4]*Math.pow(Math.max(0,1-Math.pow(u,3.5)),0.5)-0.06,h[1]+Math.sin(a)*u*h[3],sz,u>0.8?(u-0.8)*4:0,a);
    }
    for(j=0;j<h[3]*h[3]*2.6;j++){   /* and between them a carpet of small ones, so that little bare rock shows */
      a=rnd()*6.283;
      u=Math.sqrt(rnd());
      kind=rnd()<0.5?'knobS':(rnd()<0.7?'brainS':'bush');
      put(kind,h[0]+Math.cos(a)*u*h[3],h[2]-0.12*h[4]+1.03*h[4]*Math.pow(Math.max(0,1-Math.pow(u,3.5)),0.5)-0.05,h[1]+Math.sin(a)*u*h[3],0.3+rnd()*0.35,u>0.8?(u-0.8)*4:0,a);
    }
    for(j=0;j<5+h[3]*5;j++){   /* broken rock round the foot, half sunk in the sand */
      a=rnd()*6.283;
      u=0.95+rnd()*rnd()*1.0;
      var bx=h[0]+Math.cos(a)*u*h[3],bz=h[1]+Math.sin(a)*u*h[3];
      put('rubble',bx,hgt(bx,bz)-0.08,bz,0.3+rnd()*rnd()*0.9,0,rnd()*6.283,0.6+rnd()*0.4);
    }
    for(j=0;j<1+h[3]*0.5;j++){   /* a few clams set into the top */
      a=rnd()*6.283;
      u=Math.sqrt(rnd())*0.75;
      put('clam',h[0]+Math.cos(a)*u*h[3],h[2]-0.12*h[4]+1.03*h[4]*Math.pow(Math.max(0,1-Math.pow(u,3.5)),0.5)-0.12,h[1]+Math.sin(a)*u*h[3],0.3+rnd()*0.3,0,a);
    }
    for(j=0;j<n*0.3;j++){
      a=rnd()*6.283;
      u=1.1+rnd()*0.9;
      var sx=h[0]+Math.cos(a)*u*h[3],szz=h[1]+Math.sin(a)*u*h[3],sf=hgt(sx,szz);
      if(sf>-1.0)continue;
      kind=rnd()<0.45?'brain':(rnd()<0.5?'knob':'bush');
      put(kind,sx,sf-0.03,szz,0.4+rnd()*0.6,0,rnd()*6.283);
    }
  });

  /* the reef slopes, 2.5-8 m down: knob and lobed corals growing thickly straight on the sea floor, in broad patches */
  for(tries=0,i=0;tries<60000&&i<900;tries++){
    var sx2=HOME_X+(rnd()*2-1)*160,sz2=HOME_Z+(rnd()*2-1)*160,sf2=hgt(sx2,sz2);
    if(sf2>-2.5||sf2<-8)continue;
    if(Math.sin(sx2*.045+1.3*Math.sin(sz2*.05))*Math.sin(sz2*.04+1.6*Math.sin(sx2*.035)+2.)<0.05+rnd()*0.3)continue;
    put(rnd()<0.5?'knobS':(rnd()<0.6?'brainS':(rnd()<0.5?'knob':'bush')),sx2,sf2-0.04,sz2,0.45+rnd()*0.9,0,rnd()*6.283);
    i++;
  }

  /* a map of how high the coral heads stand (300 m square about the home islet), for the water shader: over a head the
     water is shallow, so it must be drawn as clear as shallow water, not as the deep water round it */
  var RN=256,rpx=new Uint8Array(RN*RN*4);
  heads.forEach(function(h){
    var c0=(h[0]-HOME_X)/300*RN+RN/2,c1=(h[1]-HOME_Z)/300*RN+RN/2,rr=h[3]*3.4/300*RN,xi,zi;
    /* (never the outermost dots: they must stay empty) */
    for(zi=Math.max(2,Math.floor(c1-rr));zi<=Math.min(RN-3,Math.ceil(c1+rr));zi++)for(xi=Math.max(2,Math.floor(c0-rr));xi<=Math.min(RN-3,Math.ceil(c0+rr));xi++){
      var u=Math.hypot((xi+0.5-c0)/RN*300,(zi+0.5-c1)/RN*300)/h[3],top=h[2]-0.12*h[4]+1.12*h[4]*Math.pow(Math.max(0,1-Math.pow(u/1.08,3.5)),0.5)+0.15;
      rpx[(zi*RN+xi)*4]=Math.max(rpx[(zi*RN+xi)*4],u<1.08?Math.round(255*Math.max(0,Math.min(1,(top+8)/8))):0);
      /* (green: 1 under the head and at its foot, falling to 0 at 3.3 radii - the terrain paints reef rock and rubble there) */
      rpx[(zi*RN+xi)*4+1]=Math.max(rpx[(zi*RN+xi)*4+1],Math.round(255*(1-smoothstep(1.3,3.3,u))));
    }
  });
  var reefTex=new THREE.DataTexture(rpx,RN,RN,THREE.RGBAFormat);
  reefTex.magFilter=reefTex.minFilter=THREE.LinearFilter;
  reefTex.needsUpdate=true;
  sharedUniforms.uReef.value=reefTex;
  window.__reefHeads=heads;   /* (for the test tools) */
  window.__reefFishMeshes=function(){return [blue,yel];};

  /* ---- build ---- */
  var m=new THREE.Matrix4(),q=new THREE.Quaternion(),q2=new THREE.Quaternion(),ax=new THREE.Vector3(),s=new THREE.Vector3(),p=new THREE.Vector3(),col=new THREE.Color();
  for(k in KIND)placed[k].forEach(function(list,gi){
    if(!list.length)return;
    var K=KIND[k],im=new THREE.InstancedMesh(K.geo[gi],K.mat,list.length);
    list.forEach(function(t,n){
      /* lean outward with the slope of the head it grows on, then turn about its own stem */
      ax.set(Math.sin(t[5]),0,-Math.cos(t[5]));
      q.setFromAxisAngle(ax,-t[4]);
      q2.setFromAxisAngle(UP,k==='head'?t[5]:rnd()*6.283);
      q.multiply(q2);
      s.set(t[3],t[3]*t[6]*(k==='head'?1:0.85+rnd()*0.3),t[3]);
      p.set(t[0],t[1],t[2]);
      m.compose(p,q,s);
      im.setMatrixAt(n,m);
      var c=K.tint[Math.floor(rnd()*K.tint.length)],d=-t[1],b=0.85+rnd()*0.25;
      col.setRGB(c[0]*b*1.12,c[1]*b*0.97,c[2]*b*0.92);   /* (the sea's dimming with depth is done in the shader, seatint.glsl, as for the sand; here only a little warmth) */
      im.setColorAt(n,col);
    });
    setPlantKind({g:'reef',s:'coral '+k});
    splitInstances(im,k==='head'?8:2.5,k==='head'?140:65,K.far?{geo:K.far,dist:K.lod,cell:32}:undefined);
    setPlantKind(null);
  });

  /* ---- reef fish: small blue ones in loose clouds over the bigger heads near home, yellow butterflyfish in pairs ---- */
  /* a fish, nose towards +x, one unit long: a body deep in the middle and thin side to side, tapering to the tail;
     a forked tail, a fin along the back and one under the belly. deep = how tall the body is for its length;
     paint(x,y,part) colours it (part: 0 body, 1 tail, 2 fins) */
  function fishGeo(deep,paint){
    var g=new THREE.SphereGeometry(0.5,10,6),parts,tri=function(pts,part){
      var t=new THREE.BufferGeometry(),u=[];
      for(var q=0;q<pts.length/3;q++)u.push(0,0);
      t.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
      t.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));
      return work(t,null,function(x,y){return paint(x,y,part);});
    },h=0.5*deep;
    work(g,function(x,y,z){
      /* (x runs -0.5 tail .. 0.5 nose: fullest a little ahead of the middle, a blunt head, a narrow tail stalk) */
      var k=Math.pow(Math.max(0,1-Math.pow(Math.abs(x-0.08)/0.6,2.2)),0.55)*(x<0?1-0.55*smoothstep(-0.1,-0.5,x):1);
      return [x*0.9+0.05,y*2*h*k,z*0.26*k*(0.6+0.4*deep)];
    },function(x,y){return paint(x,y,0);});
    parts=[g,
      tri([-0.38,0,0,-0.62,0.9*h,0,-0.5,0,0, -0.38,0,0,-0.5,0,0,-0.62,-0.9*h,0],1),
      tri([0.2,0.9*h,0,-0.25,0.55*h,0,-0.12,1.35*h,0, 0.2,0.9*h,0,-0.12,1.35*h,0,0.1,1.2*h,0],2),
      tri([0.0,-0.85*h,0,-0.28,-0.5*h,0,-0.18,-1.25*h,0],2)];
    return merge(parts);
  }
  reefFishGeo=fishGeo;
  /* the small blue-green ones (chromis): dark back, bright side, pale belly, a dark eye */
  function paintBlue(x,y,part){
    if(part)return [0.25,0.75,1.0];
    if(Math.hypot(x-0.36,y-0.03)<0.035)return [0.05,0.05,0.08];
    var v=smoothstep(-0.12,0.1,y);
    return [0.55-0.4*v,0.95-0.25*v,1.0+0.15*v];
  }
  /* butterflyfish: pale yellow-white with fine slanting stripes, a black bar through the eye, yellow fins and tail */
  function paintYellow(x,y,part){
    if(part)return part===1?[1.1,0.8,0.2]:[1.15,0.9,0.25];
    if(x>0.27&&x<0.36)return [0.08,0.08,0.08];
    if(x>0.36)return [1.0,0.95,0.8];
    var st=0.5+0.5*Math.sin((x+y*0.8)*46);
    return x<-0.3?[1.1,0.75,0.2]:[1.1-0.12*st,1.0-0.2*st,0.7-0.3*st];
  }
  /* every head of any size has its fish: more of them round the bigger heads */
  var big=heads.filter(function(h){return h[3]>1.7;}),fishes=[],NB=0,NY=0;
  big.forEach(function(h){
    var k2,nBlue=Math.round(2+h[3]*1.1),nYel=h[3]>3.2?2:(rnd()<0.5?1:0);
    for(k2=0;k2<nBlue+nYel;k2++){
      var isBlue=k2<nBlue;
      fishes.push({blue:isBlue,h:h,a:rnd()*6.283,r:(isBlue?1.08+rnd()*0.45:1.15+rnd()*0.3)*h[3],y:h[2]+h[4]*(isBlue?0.55+rnd()*0.6:0.3+rnd()*0.5),   /* (round the outside of the head, clear of the coral on top) */
        w:(0.16+rnd()*0.2)*(rnd()<0.5?1:-1)/Math.max(1,h[3]*0.3),ph:rnd()*6.283,len:isBlue?0.08+rnd()*0.04:0.13+rnd()*0.04,i:0,m:null});
      if(isBlue)NB++;
      else NY++;
    }
  });
  var blue=new THREE.InstancedMesh(fishGeo(0.42,paintBlue),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),Math.max(1,NB)),
      yel=new THREE.InstancedMesh(fishGeo(0.82,paintYellow),blue.material,Math.max(1,NY));
  fishes.forEach(function(f){f.m=f.blue?blue:yel;});
  var nb=0,ny=0;
  fishes.forEach(function(f){f.i=f.m===blue?nb++:ny++;});
  [blue,yel].forEach(function(im){
    im.frustumCulled=false;
    scene.add(im);
  });
  var fm=new THREE.Matrix4(),fq=new THREE.Quaternion(),fs=new THREE.Vector3(),fp=new THREE.Vector3();
  /* where fish f is at moment t: circling its coral head, now faster now slower (never backwards: the sway is kept
     smaller than its steady speed), drifting in and out and up and down */
  function fishAt(f,t,o){
    var a=f.a+f.w*(t+0.55/0.7*Math.sin(t*0.7+f.ph)),r=f.r*(1+0.08*Math.sin(t*0.37+f.ph*2));
    o.set(f.h[0]+Math.cos(a)*r,Math.min(-0.15,f.y+0.1*Math.sin(t*0.9+f.ph)),f.h[1]+Math.sin(a)*r);
  }
  var fp2=new THREE.Vector3(),fe=new THREE.Euler(0,0,0,'YZX');
  /* frame step: place every fish, its nose along the way it is actually moving, its body wagging as it swims */
  window.__reefFish=function(t){
    /* (only the fish of heads within 70 m of the camera are drawn: each mesh's first `count` places are filled afresh) */
    var cb=0,cy=0,cxx=camera.position.x,czz=camera.position.z;
    for(var n=0;n<fishes.length;n++){
      var f=fishes[n];
      if(Math.hypot(f.h[0]-cxx,f.h[1]-czz)>70&&!window.__allFish)continue;
      fishAt(f,t,fp);
      fishAt(f,t+0.1,fp2);
      var dx=fp2.x-fp.x,dy=fp2.y-fp.y,dz=fp2.z-fp.z,run=Math.hypot(dx,dz);
      /* (a turn of th about the upright axis carries the nose, +x, to (cos th, 0, -sin th)) */
      fe.set(0,Math.atan2(-dz,dx)+0.14*Math.sin(t*(7+f.ph)+f.ph),Math.atan2(dy,Math.max(run,1e-4))*0.8);
      fq.setFromEuler(fe);
      fs.set(f.len,f.len,f.len);
      fm.compose(fp,fq,fs);
      f.m.setMatrixAt(f.blue?cb++:cy++,fm);
    }
    blue.count=cb;
    yel.count=cy;
    blue.instanceMatrix.needsUpdate=true;
    yel.instanceMatrix.needsUpdate=true;
  };
})();
/* frame step: move the reef fish */
function updateReef(F){
  window.__reefFish(sharedUniforms.uTime.value);
}

export {reefFishGeo,updateReef};
