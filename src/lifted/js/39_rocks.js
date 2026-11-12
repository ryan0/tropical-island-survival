/* Lifted from legacy/src/js/39_rocks.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './39_foliage.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {GLSL_SRC,hgt,islandR,landW,passGap} from 'virtual:shader-chunks';
import {CAMP} from './00_config.js';
import {OBSTACLES,glslFloat,rndStream} from './05_core.js';
import {glsl} from './20_glsl.js';
import {setPlantKind,splitInstances} from './24_instances.js';
import {HOME_SHORE,HOME_X,HUT_X,HUT_Z,PIER_LEN,PIER_X,PIER_Z0,pathD,shoreZ} from './30_terrain.js';
import {sharedUniforms} from './34_sky.js';

/* Rocks. Five kinds, each in two or three different shapes:
     boulder   big rounded-angular blocks with flat fracture faces and a few cracks; brown to grey, bleached on top
     crag      dark, jagged rock with sharp ridges, standing in or at the water
     slab      low ledges of beachrock: flat-topped, stepped at the edges, half buried in the sand along the waterline
     karst     old reef limestone: grey, pitted and spiky, at the back of the beach and on the horns
     cobble    small stones scattered round the others (and the ring round the campfire)
   They are placed in groups, the way rock lies on a shore - a few big ones, smaller ones round them, cobbles spilling
   out - and not at random: boulder and crag groups on the waterline, ledges along it, karst behind the beach, lone
   crags out on the reef flat. Rocks standing in the surf register as OBSTACLES (spray and foam round them).
   inRock(x,z,margin) tells the plants (40_palms, 44_grass, 45_plants) where not to grow. */

var rockSpots=[];   /* [x,z,radius] of every rock bigger than a cobble */
function inRock(x,z,margin){
  for(var i=0;i<rockSpots.length;i++){
    var s=rockSpots[i];
    if(Math.hypot(x-s[0],z-s[1])<s[2]+margin)return true;
  }
  return false;
}
/* reefRockMat(style): the rock material, for the coral heads' rock in 47_reef.js too */
var reefRockMat=null;
(function(){
  var rnd=rndStream('rocks');
  /* ---------- shapes ---------- */
  /* smooth random values in space (the same for a given seed whatever the island's layout seed) */
  function h3(i,j,k,sd){
    var n=Math.imul(i,374761393)^Math.imul(j,668265263)^Math.imul(k,1274126177)^Math.imul(sd,974634721);
    n=Math.imul(n^(n>>>13),1103515245);
    return ((n^(n>>>16))>>>0)/4294967296;
  }
  function vn(x,y,z,sd){
    var i=Math.floor(x),j=Math.floor(y),k=Math.floor(z),u=x-i,v=y-j,w=z-k;
    u=u*u*(3-2*u);
    v=v*v*(3-2*v);
    w=w*w*(3-2*w);
    function L(a,b,t){return a+(b-a)*t;}
    return L(L(L(h3(i,j,k,sd),h3(i+1,j,k,sd),u),L(h3(i,j+1,k,sd),h3(i+1,j+1,k,sd),u),v),
             L(L(h3(i,j,k+1,sd),h3(i+1,j,k+1,sd),u),L(h3(i,j+1,k+1,sd),h3(i+1,j+1,k+1,sd),u),v),w);
  }
  function fbm(x,y,z,sd,oct){
    var s=0,a=0.5,t=0;
    for(var o=0;o<oct;o++){
      s+=a*vn(x,y,z,sd+o*7);
      t+=a;
      a*=0.5;
      x=x*2.03+1.7;
      y=y*2.03+3.1;
      z=z*2.03+5.3;
    }
    return s/t;
  }
  function ridge(x,y,z,sd){return 1-Math.abs(2*vn(x,y,z,sd)-1);}
  function sstep(a,b,x){
    var t=Math.max(0,Math.min(1,(x-a)/(b-a)));
    return t*t*(3-2*t);
  }
  function unit(sd,i){   /* a direction that depends only on (seed, i) */
    var z=h3(i,1,2,sd)*2-1,a=h3(i,3,4,sd)*6.283,r=Math.sqrt(1-z*z);
    return [r*Math.cos(a),z,r*Math.sin(a)];
  }
  /* Each SHAPE function turns a direction d (unit vector) into a point of the rock's surface, o[0..2], and a tone
     o[3] (below 1 in hollows and cracks, above 1 on edges and ridges) */
  var SHAPE={
    boulder:function(d,sd,o){
      var r=0.78+0.5*fbm(d[0]*1.3+sd,d[1]*1.3,d[2]*1.3,sd,3),x=d[0]*r,y=d[1]*r,z=d[2]*r,tone=1,i;
      /* flat fracture faces: whatever sticks out past each of a few random planes is cut back to it */
      for(i=0;i<11;i++){
        var n=unit(sd,i),lim=0.50+0.34*h3(i,5,6,sd),t=x*n[0]+y*n[1]+z*n[2]-lim;
        if(t>0){
          x-=n[0]*t*0.92;
          y-=n[1]*t*0.92;
          z-=n[2]*t*0.92;
          tone+=0.04;
        }
      }
      /* cracks: narrow grooves that run right round the rock */
      for(i=0;i<3;i++){
        var c=unit(sd+50,i),u=d[0]*c[0]+d[1]*c[1]+d[2]*c[2]+0.10*(vn(d[0]*3,d[1]*3,d[2]*3,sd+i)-0.5),g=Math.exp(-u*u/0.0012);
        x*=1-0.07*g;
        y*=1-0.07*g;
        z*=1-0.07*g;
        tone-=0.5*g;
      }
      var f=fbm(d[0]*6,d[1]*6,d[2]*6,sd+9,2)-0.5;
      o[0]=x*(1+0.07*f);
      o[1]=Math.max(y*(1+0.07*f)*0.85,-0.38);
      o[2]=z*(1+0.07*f);
      o[3]=tone+0.7*f;
    },
    crag:function(d,sd,o){
      var a=ridge(d[0]*1.7+sd,d[1]*1.7,d[2]*1.7,sd),b=ridge(d[0]*4.1,d[1]*4.1+sd,d[2]*4.1,sd+3),f=fbm(d[0]*8,d[1]*8,d[2]*8,sd+5,2)-0.5;
      /* broad blunt ridges with smaller sharp ones on them, and facets cut across the whole like a boulder's */
      var r=0.66+0.42*a+0.16*b*b+0.10*f,x=d[0]*r,y=d[1]*r,z=d[2]*r;
      for(var i=0;i<6;i++){
        var n=unit(sd+20,i),t=x*n[0]+y*n[1]+z*n[2]-(0.6+0.3*h3(i,5,6,sd));
        if(t>0){
          x-=n[0]*t*0.85;
          y-=n[1]*t*0.85;
          z-=n[2]*t*0.85;
        }
      }
      o[0]=x;
      o[1]=Math.max(y*1.05,-0.4);
      o[2]=z;
      o[3]=0.55+0.5*a+0.25*b+0.5*f;
      return;
      o[2]=d[2]*r;
      o[3]=0.55+0.5*a+0.25*b+0.5*f;
    },
    slab:function(d,sd,o){
      var out=0.7+0.6*fbm(d[0]*1.4+sd,0.5,d[2]*1.4,sd,3),y=d[1]*0.22,i;
      /* straight broken edges: the outline is cut back to a few random lines */
      for(i=0;i<6;i++){
        var ea=h3(i,9,1,sd)*6.283,el=0.55+0.35*h3(i,9,2,sd),et=(d[0]*Math.cos(ea)+d[2]*Math.sin(ea))*out-el;
        if(et>0)out-=et*0.9;
      }
      var top=0.10+0.03*(vn(d[0]*out*3,sd,d[2]*out*3,sd+2)-0.5);
      if(y>top)y=top+(y-top)*0.12;
      /* beds: the edge is stepped, each bed a little further in or out than the next */
      var q=y/0.055+40,bed=Math.floor(q),fr=q-bed;
      y=0.055*(bed-40+sstep(0.55,1,fr));
      out*=1+0.10*(h3(bed,7,8,sd)-0.5)*(1-sstep(0.8,1,Math.abs(d[1])));
      o[0]=d[0]*out;
      o[1]=Math.max(y,-0.10);
      o[2]=d[2]*out;
      o[3]=0.72+0.33*fr+0.4*(fbm(d[0]*5,d[1]*5,d[2]*5,sd+4,2)-0.5);
    },
    karst:function(d,sd,o){
      /* Old reef limestone, eaten by rain and spray into a low ragged mass: a lobed outline, a low dome, and on it
         pinnacles that all point UP (rain cuts downwards) between deep pits, some of them holding blown sand.
         Below its widest line the rock goes straight down into the ground, so nothing shows of an underside. */
      var hl=Math.hypot(d[0],d[2])||1e-6,hx=d[0]/hl,hz=d[2]/hl,rho=d[1]>0?hl:1;
      var R=(0.62+0.75*fbm(hx*1.1+sd,0.3,hz*1.1,sd,3))*(1+0.12*(vn(hx*4,sd,hz*4,sd+1)-0.5));
      var x=hx*R*rho,z=hz*R*rho,edge=1-Math.pow(rho,5);
      var big=ridge(x*2.3+sd,0.7,z*2.3,sd+2),sp=ridge(x*6.1,sd*0.37,z*6.1,sd+3),fine=ridge(x*11,1.3,z*11+sd,sd+5);
      var pit=Math.max(sstep(0.52,0.74,vn(x*3.7+9,sd,z*3.7,sd+4)),0.8*sstep(0.62,0.80,vn(x*8.3,sd+0.5,z*8.3+4,sd+6)));
      /* the mass slopes away under the sand before its outline, so its edge at ground level is ragged: only the
         pinnacles of its fringe stand out of the beach */
      var y=0.36*(1-rho*rho)-0.22*Math.pow(rho,6)+(0.34*big*big+0.30*sp*sp+0.10*fine*fine)*(0.35+0.65*edge)-0.34*pit*(0.3+0.7*edge);
      if(d[1]<=0)y=Math.min(y,-0.1)+d[1]*0.5;
      o[0]=x;
      o[1]=y;
      o[2]=z;
      o[3]=0.42+0.30*big+0.50*sp*sp+0.22*fine-0.70*pit;
      o[4]=pit>0.85&&y<0.26&&d[1]>0?1:0;      /* a pocket of sand */
    },
    cobble:function(d,sd,o){
      var r=0.8+0.4*fbm(d[0]*1.1+sd,d[1]*1.1,d[2]*1.1,sd,2);
      o[0]=d[0]*r;
      o[1]=Math.max(d[1]*r*0.62,-0.3);
      o[2]=d[2]*r*0.85;
      o[3]=0.9+0.3*(vn(d[0]*4,d[1]*4,d[2]*4,sd)-0.5);
    }
  };
  /* the mesh of one shape: a ball of triangles pushed out to the shape, with normals measured from the shape itself
     and the tone stored per vertex. detail = how finely the ball is divided (triangles = 20 x (detail+1)^2) */
  function rockGeo(kind,sd,detail){
    var g=new THREE.IcosahedronGeometry(1,detail),pa=g.attributes.position,N=pa.count,nr=new Float32Array(N*3),col=new Float32Array(N*3);
    var A=[0,0,0,0,0],B=[0,0,0,0,0],C=[0,0,0,0,0],ep=0.012,f=SHAPE[kind];
    for(var i=0;i<N;i++){
      var dx=pa.getX(i),dy=pa.getY(i),dz=pa.getZ(i),dl=Math.hypot(dx,dy,dz),ux=0,uy=1,uz=0;
      dx/=dl;
      dy/=dl;
      dz/=dl;
      if(Math.abs(dy)>0.9){
        ux=1;
        uy=0;
      }
      var t1x=dy*uz-dz*uy,t1y=dz*ux-dx*uz,t1z=dx*uy-dy*ux,l=Math.hypot(t1x,t1y,t1z);
      t1x/=l;
      t1y/=l;
      t1z/=l;
      var t2x=dy*t1z-dz*t1y,t2y=dz*t1x-dx*t1z,t2z=dx*t1y-dy*t1x;
      function at(vx,vy,vz,o){
        var vl=Math.hypot(vx,vy,vz);
        f([vx/vl,vy/vl,vz/vl],sd,o);
      }
      at(dx,dy,dz,A);
      at(dx+ep*t1x,dy+ep*t1y,dz+ep*t1z,B);
      at(dx+ep*t2x,dy+ep*t2y,dz+ep*t2z,C);
      var e1x=B[0]-A[0],e1y=B[1]-A[1],e1z=B[2]-A[2],e2x=C[0]-A[0],e2y=C[1]-A[1],e2z=C[2]-A[2];
      var nx=e1y*e2z-e1z*e2y,ny=e1z*e2x-e1x*e2z,nz=e1x*e2y-e1y*e2x,nl=Math.hypot(nx,ny,nz)||1;
      nx/=nl;
      ny/=nl;
      nz/=nl;
      if(nx*dx+ny*dy+nz*dz<0){
        nx=-nx;
        ny=-ny;
        nz=-nz;
      }
      /* (a little of the plain outward direction mixed in: where the shape has a sharp step the measured normal is wild) */
      nx=nx*0.8+dx*0.2;
      ny=ny*0.8+dy*0.2;
      nz=nz*0.8+dz*0.2;
      nl=Math.hypot(nx,ny,nz);
      pa.setXYZ(i,A[0],A[1],A[2]);
      nr[i*3]=nx/nl;
      nr[i*3+1]=ny/nl;
      nr[i*3+2]=nz/nl;
      var tone=Math.max(0.4,Math.min(1.25,A[3]));
      col[i*3]=col[i*3+1]=col[i*3+2]=tone;
      if(A[4]>0.5){   /* sand lying in a hollow: pale and warm whatever the rock's own colour */
        col[i*3]=1.9;
        col[i*3+1]=1.8;
        col[i*3+2]=1.6;
      }
    }
    g.setAttribute('normal',new THREE.BufferAttribute(nr,3));
    g.setAttribute('color',new THREE.BufferAttribute(col,3));
    g.computeBoundingSphere();
    return g;
  }
  /* ---------- look ---------- */
  var PRE=GLSL_SRC.rock_pre+glsl('seatint'),COLOR=GLSL_SRC.rock_color,matCount=0;
  /* one material per kind: SCALE = size of the surface pattern, CRACK/PIT/BUMP = how strongly cracks, pits and grain
     show, BLEACH = how pale the tops go, BARNACLE = how much white crust the tide leaves */
  function rockMat(style){
    var mat=new THREE.MeshLambertMaterial({vertexColors:true}),key='rock'+(matCount++);
    var code=COLOR.replace(/\{\{(\w+)\}\}/g,function(_,k){return glslFloat(style[k]);});
    mat.customProgramCacheKey=function(){return key;};
    mat.onBeforeCompile=function(sh){
      sh.uniforms.uLevel=sharedUniforms.uLevel;
      sh.uniforms.uTime=sharedUniforms.uTime;
      sh.uniforms.uWind=sharedUniforms.uWind;
      sh.uniforms.uDay=sharedUniforms.uDay;
      sh.uniforms.uDet=sharedUniforms.uDet;
      sh.vertexShader='varying vec3 vRp;varying vec3 vRn;\n'+sh.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\n vec4 rwp=vec4(transformed,1.);vec3 rwn=objectNormal;\n#ifdef USE_INSTANCING\n rwp=instanceMatrix*rwp;rwn=mat3(instanceMatrix)*rwn;\n#endif\n vRp=(modelMatrix*rwp).xyz;vRn=normalize(mat3(modelMatrix)*rwn);');
      sh.fragmentShader=PRE+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n{'+code+'}');
    };
    return mat;
  }
  reefRockMat=rockMat;
  /* kind: shapes (seeds), triangles near and far, material, how far it sits above its own foot (x size), colours */
  var KIND={
    boulder:{seeds:[11,23,37],detail:7,far:2,sit:0.16,mat:rockMat({SCALE:0.11,CRACK:0.7,PIT:0.4,BUMP:0.9,BLEACH:0.5,BARNACLE:0.7}),
             tint:function(c){var b=0.25+rnd()*0.15,w=rnd();c.setRGB(b*(1+0.25*w),b*(1+0.08*w),b*(1-0.20*w));}},
    crag:{seeds:[5,19],detail:8,far:3,sit:0.2,mat:rockMat({SCALE:0.15,CRACK:0.5,PIT:0.5,BUMP:0.8,BLEACH:0.25,BARNACLE:0.5}),
          tint:function(c){var b=0.20+rnd()*0.09,w=rnd();c.setRGB(b*(1+0.15*w),b*(1+0.08*w),b*(1-0.12*w));}},
    slab:{seeds:[3,29],detail:7,far:2,sit:0.05,mat:rockMat({SCALE:0.13,CRACK:0.75,PIT:0.5,BUMP:0.9,BLEACH:0.3,BARNACLE:0.4}),
          tint:null},
    karst:{seeds:[7,31,43],detail:15,far:5,sit:-0.10,mat:rockMat({SCALE:0.36,CRACK:0.6,PIT:0.9,BUMP:1.2,BLEACH:0.3,BARNACLE:0.2}),
           tint:function(c){var b=0.33+rnd()*0.10;c.setRGB(b,b*1.01,b*1.02);}},
    cobble:{seeds:[2,13],detail:2,far:0,sit:0.2,mat:rockMat({SCALE:0.5,CRACK:0.25,PIT:0.3,BUMP:0.5,BLEACH:0.4,BARNACLE:0.4}),
            tint:function(c){var b=0.36+rnd()*0.30,w=rnd();c.setRGB(b*(1+0.18*w),b*(1+0.06*w),b*(1-0.14*w));}}
  };
  /* ---------- placement ---------- */
  var placed={},m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),s=new THREE.Vector3(),p=new THREE.Vector3(),col=new THREE.Color();
  var FIRE=[5,shoreZ(5,1.0)-5];   /* the campfire (48_fire.js puts it here) */
  /* is (x,z) clear of the things people use: the pier, the hut, the paths, the fire, the beach in front of home? */
  function clear(x,z,k){
    if(Math.abs(x-PIER_X)<3+k&&z>PIER_Z0-3-k&&z<PIER_Z0+PIER_LEN+3+k)return false;
    if(Math.hypot(x-HUT_X,z-HUT_Z)<8+k||pathD(x,z)<1.6+k)return false;
    if(Math.hypot(x-FIRE[0],z-FIRE[1])<3.5+k)return false;
    if(x>HOME_X-10-k&&x<HOME_X+17+k&&z>HOME_SHORE-10&&z<HOME_SHORE+9)return false;
    return true;
  }
  /* put one rock down. k = size (m), yaw = heading or null for any, tone = [r,g,b] or null for the kind's own */
  function put(kind,x,z,k,yaw,tone,force){
    if(!force&&!clear(x,z,k))return;
    var K=KIND[kind],shape=Math.floor(rnd()*K.seeds.length),key=kind+shape,ground=hgt(x,z),flat=kind==='slab';
    if(kind==='karst')flat=true;   /* (karst sits level too: its pinnacles must point up) */
    e.set((rnd()-0.5)*(flat?0.10:0.5),yaw===null?rnd()*6.283:yaw+(rnd()-0.5)*0.5,(rnd()-0.5)*(flat?0.10:0.5));
    q.setFromEuler(e);
    s.set(k*(kind==='karst'?1.2+rnd()*0.6:0.9+rnd()*0.45),k*(kind==='karst'?0.6+rnd()*0.45:(flat?0.9+rnd()*0.5:0.75+rnd()*0.4)),k*(kind==='karst'?1.1+rnd()*0.6:0.85+rnd()*0.4));
    p.set(x,ground+k*K.sit,z);
    m.compose(p,q,s);
    var tb=0.85+rnd()*0.3;
    if(tone)col.setRGB(tone[0]*tb,tone[1]*tb,tone[2]*tb);
    else K.tint(col);
    (placed[key]=placed[key]||{kind:kind,seed:K.seeds[shape],list:[]}).list.push([m.clone(),col.clone()]);
    if(kind!=='cobble')rockSpots.push([x,z,k*(flat?1.0:0.8)]);
    if(k>0.45&&ground>-2.2&&ground<0.4&&Math.hypot(x,z)>islandR(Math.atan2(z,x))-9)OBSTACLES.push({x:x,z:z,r:k*(flat?0.8:1.0),g:ground,prev:0});
  }
  /* the distance from the atoll's middle, along direction a, at which the beach is `level` metres above the sea
     (the ocean beach, or the lagoon beach) */
  function shoreR(a,level,lagoon){
    var r,ca=Math.cos(a),sa=Math.sin(a);
    if(lagoon){
      for(r=islandR(a)-landW(a)-14;r<islandR(a)-landW(a)+16;r+=0.2)if(hgt(ca*r,sa*r)>=level)return r;
    }else{
      for(r=islandR(a)+10;r>islandR(a)-18;r-=0.2)if(hgt(ca*r,sa*r)>=level)return r;
    }
    return 0;
  }
  /* a group: `big` large rocks close together, `mid` smaller ones round them, cobbles spilling out furthest */
  function group(kind,a,level,lagoon,big,mid,cob,size){
    var r=shoreR(a,level,lagoon);
    if(!r)return;
    var cx=Math.cos(a)*r,cz=Math.sin(a)*r,i,an,d;
    for(i=0;i<big;i++){
      an=rnd()*6.283;
      d=i?size*(0.9+rnd()*0.9):0;
      put(kind,cx+Math.cos(an)*d,cz+Math.sin(an)*d,size*(0.75+rnd()*0.55),null,null);
    }
    for(i=0;i<mid;i++){
      an=rnd()*6.283;
      d=size*(1.0+rnd()*2.4);
      put(kind,cx+Math.cos(an)*d,cz+Math.sin(an)*d,size*(0.22+rnd()*0.32),null,null);
    }
    for(i=0;i<cob;i++){
      an=rnd()*6.283;
      d=size*(0.8+rnd()*rnd()*5);
      put('cobble',cx+Math.cos(an)*d,cz+Math.sin(an)*d,0.07+rnd()*rnd()*0.22,null,null);
    }
  }
  /* How rocky each stretch of the island is, 0..1 by bearing (0 = east, pi/2 = south, where home is). Three rocky
     reaches - the west side, the east point, and a lesser one in the north-east - and clean beach everywhere else. */
  var REACH=[[2.70,0.42,1],[0.09,0.36,1],[5.32,0.26,0.55]];   /* [bearing, half-width in radians, how rocky] */
  function rocky(a){
    var v=0;
    for(var i=0;i<REACH.length;i++){
      var d=Math.abs(Math.atan2(Math.sin(a-REACH[i][0]),Math.cos(a-REACH[i][0])));
      v=Math.max(v,REACH[i][2]*(1-sstep(REACH[i][1]*0.6,REACH[i][1]*1.3,d)));
    }
    return v;
  }
  /* up to n directions round the atoll, at least `gap` apart, that miss the pass - most of them on rocky stretches
     (a clean stretch takes about one in twenty-five of what is offered to it) */
  function bearings(n,gap,avoid){
    var out=[],tries=0;
    while(out.length<n&&tries++<n*7){
      var a=rnd()*6.283,ok=passGap(a)<0.02&&rnd()<0.04+0.96*rocky(a);
      for(var i=0;ok&&i<avoid.length;i++)if(Math.abs(Math.atan2(Math.sin(a-avoid[i]),Math.cos(a-avoid[i])))<gap)ok=false;
      for(i=0;ok&&i<out.length;i++)if(Math.abs(Math.atan2(Math.sin(a-out[i]),Math.cos(a-out[i])))<gap)ok=false;
      if(ok)out.push(a);
    }
    return out;
  }
  var a,i,j,r,x,z;
  /* 1. boulder and crag groups on the ocean waterline: two either side of home, the rest spread round the island */
  group('boulder',1.39,0.15,false,2,4,9,1.25);
  group('crag',1.77,-0.15,false,1,2,5,1.15);
  var shoreGroups=bearings(14,0.26,[1.39,1.77,1.5708]);
  shoreGroups.forEach(function(a2,n){
    var crag=n%3===1;
    var much=0.4+rocky(a2);   /* bigger, fuller groups where the shore is rocky */
    group(crag?'crag':'boulder',a2,crag?-0.2:0.1+rnd()*0.3,false,1+Math.floor(rnd()*2.4*much),Math.round((2+rnd()*4)*much),Math.round((5+rnd()*10)*much),0.8+rnd()*0.6+0.4*rocky(a2));
  });
  /* 2. smaller groups of rounded boulders on the lagoon beach */
  bearings(8,0.4,[]).forEach(function(a2){
    group('boulder',a2,0.0+rnd()*0.3,true,1,1+Math.floor(rnd()*3),3+Math.floor(rnd()*6),0.6+rnd()*0.5);
  });
  /* 3. ledges of beachrock along the waterline: each stretch a row of slabs lying along the shore, dark or sandy grey */
  [1.25].concat(bearings(7,0.4,[1.25,1.5708])).forEach(function(a2,n){
    var tone=n%2?[0.27,0.27,0.27]:[0.44,0.42,0.37],count=Math.round((2+rnd()*5)*(0.5+rocky(a2))),da=0;
    for(j=0;j<count;j++){
      var k=0.8+rnd()*1.1,lev=0.10+rnd()*0.35;
      a=a2+da;
      r=shoreR(a,lev,false);
      if(r)put('slab',Math.cos(a)*r,Math.sin(a)*r,k,-a+1.5708,tone);
      /* a broken-off piece or two just seaward of it */
      if(r&&rnd()<0.6)put('slab',Math.cos(a)*(r+k*0.9+rnd()),Math.sin(a)*(r+k*0.9+rnd()),k*(0.3+rnd()*0.3),-a+1.5708,tone);
      da+=(k*1.5+rnd()*1.5)/160;
    }
  });
  /* 4. karst limestone at the back of the ocean beach: ragged ridges a few metres long, with broken bits round them */
  bearings(12,0.28,[1.5708]).forEach(function(a2){
    var count=Math.round((2+rnd()*5)*(0.4+rocky(a2))),da=0;
    for(j=0;j<count;j++){
      var k=1.0+rnd()*1.0;
      a=a2+da;
      r=shoreR(a,1.35+rnd()*0.5,false);
      if(r)put('karst',Math.cos(a)*r,Math.sin(a)*r,k,null,null);
      if(r&&rnd()<0.7)put('karst',Math.cos(a)*r+(rnd()-0.5)*3,Math.sin(a)*r+(rnd()-0.5)*3,k*(0.25+rnd()*0.3),null,null);
      da+=(k*1.0+rnd()*0.6)/160;
    }
  });
  /* 5. lone crags out on the reef flat, tall enough to stand clear of the water */
  bearings(13,0.25,[1.5708]).forEach(function(a2){
    var off=5+rnd()*26,k=1.5+rnd()*0.9;
    r=islandR(a2)+off;
    x=Math.cos(a2)*r;
    z=Math.sin(a2)*r;
    if(hgt(x,z)>-2.2)put('crag',x,z,k,null,null);
    if(rnd()<0.6)put('crag',x+(rnd()-0.5)*4,z+(rnd()-0.5)*4,k*(0.4+rnd()*0.3),null,null);
  });
  /* 6. a few landmarks: one great boulder with its litter on each horn of the island, and one down the beach from home */
  [[0.05,2.6],[2.75,2.2]].concat(bearings(2,0.6,[1.5708,0.05,2.75]).map(function(b){return [b,2.4+rnd()*0.9];})).forEach(function(L){
    group('boulder',L[0],0.2,false,1,6,18,L[1]);
  });
  /* 7. the ring of stones round the campfire */
  if(CAMP)for(i=0;i<9;i++)put('cobble',FIRE[0]+Math.cos(i*0.698)*0.62,FIRE[1]+Math.sin(i*0.698)*0.62,0.13+rnd()*0.06,null,[0.42,0.40,0.37],true);
  /* ---------- meshes ---------- */
  Object.keys(placed).forEach(function(key){
    var P=placed[key],K=KIND[P.kind],im=new THREE.InstancedMesh(rockGeo(P.kind,P.seed,K.detail),K.mat,P.list.length);
    P.list.forEach(function(it,n){
      im.setMatrixAt(n,it[0]);
      im.setColorAt(n,it[1]);
    });
    im.castShadow=true;
    im.receiveShadow=true;
    setPlantKind({g:'rock '+P.kind,s:'rock '+P.kind});
    splitInstances(im,4,P.kind==='cobble'?70:0,K.far?{geo:rockGeo(P.kind,P.seed,K.far),dist:36,cell:64}:null);
    setPlantKind(null);
  });
})();

export {inRock,reefRockMat};
