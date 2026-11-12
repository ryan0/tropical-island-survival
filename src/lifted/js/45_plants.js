/* Lifted from legacy/src/js/45_plants.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './44_grass.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {hgt} from 'virtual:shader-chunks';
import {renderer,rndStream} from './05_core.js';
import {setPlantKind,splitInstances} from './24_instances.js';
import {HUT_X,HUT_Z,nearHome,pathD,ringPoint} from './30_terrain.js';
import {Shape,leafLight,leafRand} from './39_foliage.js';
import {inRock} from './39_rocks.js';
import {palmFrondTex} from './40_palms.js';

/* The island's other plants (the palms are in 40_palms.js, grass in 44_grass.js):
     beach shrub     rounded mounds of glossy paddle-leaved scrub (naupaka), packed into a hedge along the back of the beach
     scrub bush      taller and looser: masses of the same leaves on leaning stems, inland
     broadleaf tree  small spreading trees, a canopy of leaf masses on bending limbs
     screw pine      (pandanus) a forking stem on stilt roots, every branch ending in a mop of long drooping blades
     rosette         knee-high stars of strap leaves on the ground
     fallen frond, vine mat, stump   things lying on the ground under the trees
   Shapes are built with Shape (39_foliage.js), which also makes each plant's simpler far-away version; plant() scatters
   them and hands them to splitInstances (24_instances.js). */
(function(){
  function canvas(w,h){
    var c=document.createElement('canvas');
    c.width=w;
    c.height=h;
    return c;
  }
  /* ---- pictures ---- */
  var i,k,rl=leafRand,rnd=rndStream('plants');   /* rl shapes the plants, rnd places them */
  /* leaves: four different sprigs, cut out, in a 2 x 2 sheet. A sprig is what ends every twig of a beach shrub:
     a whorl of paddle-shaped leaves, narrow at the stalk and rounded at the tip, glossy, the new ones in the middle paler. */
  var cR=canvas(1024,512),xl=cR.getContext('2d');   /* the leaf atlas: see FOLIAGE_REGIONS in 39_foliage.js */
  function leaf(len,wid,r,g,b){
    var gr=xl.createLinearGradient(0,-wid,0,wid);
    gr.addColorStop(0,'rgb('+Math.floor(r*0.72)+','+Math.floor(g*0.74)+','+Math.floor(b*0.7)+')');
    gr.addColorStop(0.45,'rgb('+Math.floor(r)+','+Math.floor(g)+','+Math.floor(b)+')');
    gr.addColorStop(1,'rgb('+Math.floor(Math.min(255,r*1.22))+','+Math.floor(Math.min(255,g*1.12))+','+Math.floor(b*1.05)+')');
    xl.fillStyle=gr;
    xl.beginPath();
    xl.moveTo(0,0);
    xl.bezierCurveTo(len*0.35,-wid*0.35,len*0.62,-wid,len*0.9,-wid*0.72);
    xl.bezierCurveTo(len*1.04,-wid*0.3,len*1.04,wid*0.3,len*0.9,wid*0.72);
    xl.bezierCurveTo(len*0.62,wid,len*0.35,wid*0.35,0,0);
    xl.fill();
    xl.strokeStyle='rgba(225,245,160,.5)';
    xl.lineWidth=1.3;
    xl.beginPath();
    xl.moveTo(len*0.08,0);
    xl.lineTo(len*0.92,0);
    xl.stroke();
  }
  function sprig(cx,cy,R,hue){
    for(var ring=0;ring<3;ring++){
      var n=ring===0?9:(ring===1?7:5),rr=R*(ring===0?1:(ring===1?0.72:0.42)),a0=rl()*6.283;
      for(var q=0;q<n;q++){
        var a=a0+q*6.283/n+(rl()-0.5)*0.35,g=(ring===0?96:(ring===1?116:150))*(0.9+rl()*0.2);
        xl.save();
        xl.translate(cx,cy);
        xl.rotate(a);
        leaf(rr*(0.85+rl()*0.2),rr*0.24,g*(0.46+0.14*hue+0.1*ring),g,g*(0.30+0.06*ring));
        xl.restore();
      }
    }
  }
  sprig(128,128,120,0.0);
  sprig(384,128,120,0.5);
  sprig(128,384,120,0.2);
  sprig(384,384,120,0.9);
  /* the right half of the atlas: the dark inside of a bush (speckled dark green), then bark (bands across the stem) */
  var cL=canvas(64,64),xc=cL.getContext('2d');
  for(i=0;i<64;i++)for(k=0;k<64;k++){
    var dk=34+Math.floor(rl()*26);
    xc.fillStyle='rgb('+Math.floor(dk*0.55)+','+dk+','+Math.floor(dk*0.45)+')';
    xc.fillRect(i,k,1,1);
  }
  xl.imageSmoothingEnabled=false;
  xl.drawImage(cL,544,0,256,512);
  var cB=canvas(64,64);
  xc=cB.getContext('2d');
  for(i=0;i<64;i++){
    var bk=120+Math.floor(rl()*45);
    xc.fillStyle='rgb('+bk+','+Math.floor(bk*0.86)+','+Math.floor(bk*0.70)+')';
    xc.fillRect(0,i,64,1);
  }
  xl.drawImage(cB,800,0,224,512);
  var texR=new THREE.CanvasTexture(cR);
  texR.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  var texB=new THREE.CanvasTexture(cB);   /* bark on its own, for stems that are not part of a leafy plant */
  /* ---- shapes (each is one mesh: leaves, dark core and stems share the leaf atlas) ---- */
  /* beach shrub: a low spreading mound - one big mass of sprigs and two on its shoulders, over a dark heart */
  var shrub=new Shape();
  shrub.region='core';
  shrub.blob(0,0.5,0,0.72,0.5,6,3);
  shrub.blob(0.6,0.36,0.3,0.42,0.3,5,3);
  shrub.blob(-0.5,0.34,-0.45,0.44,0.3,5,3);
  shrub.region='leaf';
  shrub.leaves(0,0.55,0,1.0,0.72,1.0,66,0.19,0.35);
  shrub.leaves(0,0.5,0,0.78,0.56,0.78,20,0.17,0.4);
  shrub.leaves(0.66,0.38,0.32,0.62,0.46,0.62,30,0.165,0.3);
  shrub.leaves(-0.56,0.36,-0.5,0.64,0.45,0.64,30,0.165,0.3);
  shrub.leaves(0.1,0.3,0.75,0.5,0.36,0.5,18,0.16,0.3);
  /* broadleaf tree: a trunk forking into limbs that bend out and then up, each into its own mass of leaves */
  var tree=new Shape();
  tree.region='bark';
  tree.stem(0,-0.3,0,0.15,1.5,0.1,0.30,0.20,0.0);
  tree.stem(0.15,1.4,0.1,0.25,2.4,0.1,0.20,0.15,0.2);
  [[1.9,3.3,0.6,1.25],[-1.7,3.5,-0.8,1.3],[0.3,3.4,-1.9,1.2],[0.1,4.5,0.2,1.6],[-0.6,3.2,1.7,1.2],[1.3,4.0,-1.0,1.1],[-1.2,4.2,0.9,1.1]].forEach(function(b,bi){
    var mx=b[0]*0.55,my=2.3+(b[1]-2.3)*0.35,mz=b[2]*0.55;
    tree.region='bark';
    tree.stem(0.25,bi<3?1.5:2.3,0.1,mx,my,mz,0.11,0.07,0.3);
    tree.stem(mx,my,mz,b[0]*0.9,b[1]-0.3,b[2]*0.9,0.07,0.03,0.5);
    tree.region='core';
    tree.blob(b[0],b[1],b[2],b[3]*0.5,b[3]*0.34,5,3);
    tree.region='leaf';
    tree.leaves(b[0],b[1],b[2],b[3],b[3]*0.62,b[3],Math.round(46*b[3]),0.24,0.6);
    tree.leaves(b[0],b[1]-0.1,b[2],b[3]*0.65,b[3]*0.4,b[3]*0.65,Math.round(14*b[3]),0.22,0.9);
  });
  /* scrub bush: taller and looser than the beach shrub - a few leaning stems, each carrying a mass of smaller leaves,
     with twigs showing between them */
  var scrub=new Shape();
  [[0.0,1.25,0.0,0.85],[0.75,0.85,0.35,0.62],[-0.7,0.95,-0.3,0.66],[0.15,0.7,-0.8,0.55],[-0.25,0.6,0.8,0.55]].forEach(function(b){
    scrub.region='bark';
    scrub.stem(b[0]*0.15,-0.15,b[2]*0.15,b[0]*0.8,b[1]-0.25,b[2]*0.8,0.045,0.02,0.2);
    scrub.region='core';
    scrub.blob(b[0],b[1],b[2],b[3]*0.36,b[3]*0.27,5,3);
    scrub.region='leaf';
    scrub.leaves(b[0],b[1],b[2],b[3],b[3]*0.74,b[3],Math.round(46*b[3]/0.85),0.2,0.65);
    scrub.leaves(b[0],b[1],b[2],b[3]*0.6,b[3]*0.45,b[3]*0.6,Math.round(12*b[3]/0.85),0.18,0.8);
  });
  /* ground rosette: a low star of broad strap leaves */
  var ro=new Shape();
  ro.blades(0,0.05,0,18,1.35,0.065,0.95,1);
  /* screw pine: a stem propped on stilt roots, forking into a few branches, each ending in a crown of leaves with
     some dead ones hanging under it */
  var pd=new Shape(),pdB=new Shape();
  pdB.stem(0,0.55,0,0.08,1.7,0,0.15,0.12,0.0);
  for(k=0;k<7;k++)pdB.stem(Math.cos(k*0.9)*(0.5+0.15*(k%2)),-0.25,Math.sin(k*0.9)*(0.5+0.15*(k%2)),Math.cos(k*0.9)*0.05,0.75+0.1*(k%3),Math.sin(k*0.9)*0.05,0.03,0.05,0.0);
  [[1.0,2.7,0.2],[-0.8,3.0,0.5],[0.1,3.5,-0.9],[-0.3,2.3,-0.5],[0.5,3.1,0.9]].forEach(function(b){
    var mx=0.08+(b[0]-0.08)*0.5,my=1.6+(b[1]-1.6)*0.35,mz=b[2]*0.5;
    pdB.stem(0.08,1.6,0,mx,my,mz,0.11,0.09,0.2);
    pdB.stem(mx,my,mz,b[0],b[1],b[2],0.09,0.07,0.4);
    pd.blades(b[0],b[1],b[2],22,1.5,0.05,1.05,4);
  });
  /* ---- things lying on the ground ---- */
  /* a fallen palm frond, dried out: the same feather picture as the fronds on the trees, lying on the ground with its
     midrib arched a little and its leaflets drooping to the soil either side */
  var ff=new Shape();
  (function(){
    var SEG=6,prev=null;
    for(var j=0;j<=SEG;j++){
      var t=j/SEG,x=3.6*t,zc=0.5*t*t,y=0.06+0.16*Math.sin(Math.PI*t),w=0.75*(0.45+0.55*Math.sin(Math.PI*Math.min(1,0.15+0.8*t)));
      var row=[[x,0.03,zc-w,t,0,0,1,0.2],[x,y,zc,t,0.5,0,1,0],[x,0.03,zc+w,t,1,0,1,-0.2]];
      if(prev){
        ff.tri(prev[0],prev[1],row[1]);
        ff.tri(prev[0],row[1],row[0]);
        ff.tri(prev[1],prev[2],row[2]);
        ff.tri(prev[1],row[2],row[1]);
      }
      prev=row;
    }
  })();
  /* a mat of creeping beach vine: runners spreading over the ground from a middle, round notched leaves standing
     off them on short stalks at all angles, and a few purple trumpet flowers */
  var vn=new Shape();
  (function(){
    var leafNo=0;
    function leafAt(x,y,z,r,rot,tx,tz,c){
      /* a round leaf with a notch at the tip: a fan of five triangles, tilted (tx,tz) */
      var P=[],q;
      for(q=0;q<=4;q++){
        var a=rot+(q/4-0.5)*5.3,rr=r*(q===0||q===4?0.85:1);
        P.push([x+Math.cos(a)*rr,y+Math.cos(a)*rr*tx+Math.sin(a)*rr*tz,z+Math.sin(a)*rr]);
      }
      var n=[-tx,1,-tz],dk=[c[0]*0.7,c[1]*0.7,c[2]*0.7],far=(leafNo++)%2===0;
      for(q=0;q<4;q++){
        vn.tri([x,y+0.01,z,0,0,n[0],n[1],n[2],dk],[P[q+1][0],P[q+1][1],P[q+1][2],0,0,n[0],n[1],n[2],c],[P[q][0],P[q][1],P[q][2],0,0,n[0],n[1],n[2],c]);
        /* further away: every second leaf, half as big again */
        if(far)vn.lo.tri([x,y+0.01,z,0,0,n[0],n[1],n[2],dk],[x+(P[q+1][0]-x)*1.5,P[q+1][1],z+(P[q+1][2]-z)*1.5,0,0,n[0],n[1],n[2],c],[x+(P[q][0]-x)*1.5,P[q][1],z+(P[q][2]-z)*1.5,0,0,n[0],n[1],n[2],c]);
      }
    }
    for(var rn=0;rn<9;rn++){
      var a0=rn*0.7+rl()*0.5,px=0,pz=0,dir=a0,len=1.2+rl()*1.3,steps=8;
      for(var sI=0;sI<steps;sI++){
        var nx2=px+Math.cos(dir)*len/steps,nz2=pz+Math.sin(dir)*len/steps,w=0.012,sx=-Math.sin(dir)*w,sz=Math.cos(dir)*w,cs=[0.20,0.16,0.08];
        vn.tri([px-sx,0.03,pz-sz,0,0,0,1,0,cs],[px+sx,0.03,pz+sz,0,0,0,1,0,cs],[nx2+sx,0.03,nz2+sz,0,0,0,1,0,cs]);
        px=nx2;
        pz=nz2;
        dir+=(rl()-0.5)*0.7;
        for(var lf=0;lf<3;lf++){
          var g=0.95+0.5*rl(),side=(rl()-0.5)*0.42;
          leafAt(px-Math.sin(dir)*side,0.05+0.07*rl(),pz+Math.cos(dir)*side,0.085+0.04*rl(),rl()*6.283,(rl()-0.5)*0.7,(rl()-0.5)*0.7,[0.15*g,0.36*g,0.10*g]);
        }
      }
    }
    for(var fl=0;fl<3;fl++){
      var fa=rl()*6.283,fr=0.4+rl()*1.2;
      leafAt(Math.cos(fa)*fr,0.13,Math.sin(fa)*fr,0.06,rl()*6.283,0,0,[0.78,0.36,0.74]);
    }
  })();
  /* a palm stump: the swollen foot of a trunk, roots spreading into the ground, snapped off unevenly at knee height,
     pale wood showing in the break */
  var st=new Shape();
  (function(){
    var N=10,rings=[[-0.3,0.74],[0.07,0.46],[0.2,0.35],[0.4,0.30],[0.6,0.28]],R=[],a,j;
    for(j=0;j<rings.length;j++){
      R.push([]);
      for(a=0;a<=N;a++){
        var th=a/N*6.283,lump=1+0.10*Math.sin(th*3+j)+(j===0?0.25*Math.sin(th*5):(j===1?0.10*Math.sin(th*5):0)),top=j===rings.length-1?0.10*Math.sin(th*2+1)+0.07*Math.sin(th*5):0;
        var dark=j<2?0.62:(0.8+0.25*Math.sin(th*7+j*2));
        R[j].push([Math.cos(th)*rings[j][1]*lump,rings[j][0]+top,Math.sin(th)*rings[j][1]*lump,a/N*2,rings[j][0],Math.cos(th),0.25,Math.sin(th),dark]);
      }
    }
    for(j=0;j<rings.length-1;j++)for(a=0;a<N;a++){
      st.tri(R[j][a],R[j+1][a+1],R[j][a+1]);
      st.tri(R[j][a],R[j+1][a],R[j+1][a+1]);
    }
    var T=R[rings.length-1];
    for(a=0;a<N;a++){
      var c0=[1.5,1.7,1.85];
      st.tri([0,0.50,0,0.5,0.5,0,1,0,[0.8,0.85,0.9]],[T[a+1][0],T[a+1][1],T[a+1][2],0.6,0.5,0,1,0,c0],[T[a][0],T[a][1],T[a][2],0.4,0.5,0,1,0,c0]);
    }
  })();
  /* things washed up on the beach: lumps of coral rock (pale, knobbly) and coconuts (smooth, brown) */
  function lump(knobs,squash){
    var S=new Shape(true),V=[],a,b,SEG=7,RINGS=5;
    for(b=0;b<=RINGS;b++)for(a=0;a<=SEG;a++){
      var th=a/SEG*6.283,ph=b/RINGS*Math.PI,nx=Math.sin(ph)*Math.cos(th),ny=Math.cos(ph),nz=Math.sin(ph)*Math.sin(th);
      var r=1+knobs*(Math.sin(th*3+ph*4)*0.5+Math.sin(th*5-ph*3+1)*0.3),sh=0.72+0.28*(ny*0.5+0.5)+knobs*0.4*Math.sin(th*7+ph*9);
      V.push([nx*r,(ny*r*squash)+squash*0.55,nz*r,0,0,nx,ny*0.8+0.2,nz,sh]);
    }
    for(b=0;b<RINGS;b++)for(a=0;a<SEG;a++){
      var o=b*(SEG+1)+a;
      S.tri(V[o],V[o+1],V[o+SEG+1]);
      S.tri(V[o+1],V[o+SEG+2],V[o+SEG+1]);
    }
    return S;
  }
  var coralLump=lump(0.22,0.6),coconut=lump(0.03,0.8);
  /* ---- planting ---- */
  var mB=new THREE.MeshLambertMaterial({map:texB,vertexColors:true}),
      mR=leafLight(new THREE.MeshLambertMaterial({map:texR,alphaTest:0.5,side:THREE.DoubleSide,vertexColors:true})),
      dR=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:texR,alphaTest:0.5}),
      mG=leafLight(new THREE.MeshLambertMaterial({side:THREE.DoubleSide,vertexColors:true})),
      mF=leafLight(new THREE.MeshLambertMaterial({map:palmFrondTex,alphaTest:0.4,side:THREE.DoubleSide}));
  var m=new THREE.Matrix4(),q4=new THREE.Quaternion(),e=new THREE.Euler(),s3=new THREE.Vector3(),p3=new THREE.Vector3(),col=new THREE.Color();
  /* scatter one kind of plant. o = {
       name    for tools/plants.js
       parts   [[shape, material, shadow material or null], ...] - meshes that stand in the same places
       count   at most this many, in at most `tries` attempts
       want    function(x,z,h): 0 = not here, otherwise the plant's size
       tint    function(colour): set this plant's colour
       pad     how far it reaches from its foot (m), far = not drawn beyond this (m),
       lod     beyond this many metres the simpler shape is drawn (0 = this kind has only one shape)
       shadow  whether it casts one } */
  function plant(o){
    var ims=o.parts.map(function(pt){return new THREE.InstancedMesh(pt[0].geo(),pt[1],o.count);}),c=0;
    for(var t=0;t<o.tries&&c<o.count;t++){
      var pp=ringPoint(rnd),x=pp[0],z=pp[1],h=hgt(x,z);
      if(Math.hypot(x-HUT_X,z-HUT_Z)<6.5||pathD(x,z)<2.3)continue;
      var size=o.want(x,z,h);
      if(!size)continue;
      e.set((rnd()-0.5)*0.12,rnd()*6.283,(rnd()-0.5)*0.12);
      q4.setFromEuler(e);
      s3.set(size*(0.85+rnd()*0.3),size*(0.8+rnd()*0.35),size*(0.85+rnd()*0.3));
      p3.set(x,h-0.08*size,z);
      m.compose(p3,q4,s3);
      o.tint(col);
      if(inRock(x,z,0.3*size))continue;   /* (checked last, after every random draw, so the other plants do not move) */
      for(var w=0;w<ims.length;w++){
        ims[w].setMatrixAt(c,m);
        ims[w].setColorAt(c,col);
      }
      c++;
    }
    ims.forEach(function(im,w){
      im.count=c;
      im.castShadow=o.shadow;
      im.receiveShadow=true;
      if(o.parts[w][2])im.customDepthMaterial=o.parts[w][2];
      setPlantKind({g:o.name,s:w===0?o.name:null});
      splitInstances(im,o.pad,o.far,o.lod?{geo:o.parts[w][0].lo.geo(),dist:o.lod,cell:32}:null);
      setPlantKind(null);
    });
  }
  /* the hedge: thick just behind the beach (1.6-2.7 m up), thinning out inland */
  plant({name:'beach shrub',parts:[[shrub,mR,dR]],count:480,tries:90000,pad:3.5,far:170,lod:34,shadow:true,want:function(x,z,h){
    if(h<1.6||h>9)return 0;
    var belt=h<2.7;
    if(rnd()>(belt?0.85:0.10)*(0.4+0.6*nearHome(x,z)))return 0;
    return belt?1.0+rnd()*1.5:0.8+rnd()*1.0;
  },tint:function(c){
    var b=0.92+rnd()*0.3;
    c.setRGB(b*(0.9+rnd()*0.16),b,b*(0.85+rnd()*0.2));
  }});
  plant({name:'broadleaf tree',parts:[[tree,mR,dR]],count:46,tries:40000,pad:7,far:420,lod:60,shadow:true,want:function(x,z,h){
    if(h<2.5||h>9||rnd()>0.25*(0.4+0.6*nearHome(x,z)))return 0;
    return 0.9+rnd()*0.8;
  },tint:function(c){
    var b=0.74+rnd()*0.22;
    c.setRGB(b*0.88,b,b*0.84);
  }});
  plant({name:'scrub bush',parts:[[scrub,mR,dR]],count:200,tries:60000,pad:3.5,far:170,lod:34,shadow:true,want:function(x,z,h){
    if(h<2.0||h>11||rnd()>0.3*(0.4+0.6*nearHome(x,z)))return 0;
    return 0.8+rnd()*1.0;
  },tint:function(c){
    var b=0.62+rnd()*0.22;
    c.setRGB(b*0.86,b,b*0.82);
  }});
  plant({name:'screw pine',parts:[[pd,mG,null],[pdB,mB,null]],count:70,tries:40000,pad:4,far:200,lod:40,shadow:true,want:function(x,z,h){
    if(h<1.7||h>6||rnd()>(h<3?0.5:0.15)*(0.4+0.6*nearHome(x,z)))return 0;
    return 0.7+rnd()*0.7;
  },tint:function(c){
    var b=0.9+rnd()*0.3;
    c.setRGB(b,b,b);
  }});
  plant({name:'rosette',parts:[[ro,mG,null]],count:420,tries:60000,pad:2,far:70,lod:20,shadow:true,want:function(x,z,h){
    if(h<1.8||h>10||rnd()>0.5*nearHome(x,z))return 0;
    return 0.45+rnd()*0.6;
  },tint:function(c){
    var b=0.9+rnd()*0.3,y=rnd();
    c.setRGB(b*(1+0.5*y*y),b*(1+0.1*y),b*(1-0.2*y));
  }});
  plant({name:'fallen frond',parts:[[ff,mF,null]],count:240,tries:40000,pad:3.5,far:110,lod:0,shadow:false,want:function(x,z,h){
    if(h<1.8||h>9||rnd()>0.4*(0.4+0.6*nearHome(x,z)))return 0;
    return 0.7+rnd()*0.5;
  },tint:function(c){
    /* straw to grey-brown (the picture is green: this bleaches it) */
    var b=0.75+rnd()*0.5,old=rnd();
    c.setRGB(b*(1.5-0.35*old),b*(0.95-0.2*old),b*(0.9+0.5*old));
  }});
  plant({name:'vine mat',parts:[[vn,mG,null]],count:260,tries:60000,pad:2.5,far:70,lod:16,shadow:false,want:function(x,z,h){
    if(h<1.55||h>8||rnd()>(h<2.4?0.7:0.2)*(0.4+0.6*nearHome(x,z)))return 0;   /* thickest creeping out onto the back of the beach */
    return 0.7+rnd()*0.8;
  },tint:function(c){
    var b=0.95+rnd()*0.3;
    c.setRGB(b,b,b);
  }});
  plant({name:'coral lump',parts:[[coralLump,mG,null]],count:520,tries:80000,pad:1,far:60,lod:0,shadow:true,want:function(x,z,h){
    /* scattered over the beach, thickest along the drift line and at the back where storms throw it */
    if(h<0.35||h>1.9||rnd()>(h>1.45||(h>0.75&&h<0.95)?0.8:0.05)*nearHome(x,z))return 0;
    return 0.04+rnd()*rnd()*0.16;
  },tint:function(c){
    var b=0.62+rnd()*0.3,w=rnd();
    c.setRGB(b,b*(0.97-0.07*w),b*(0.92-0.17*w));
  }});
  plant({name:'coconut',parts:[[coconut,mG,null]],count:70,tries:40000,pad:1,far:90,lod:0,shadow:true,want:function(x,z,h){
    if(h<0.6||h>2.6||rnd()>0.35*nearHome(x,z))return 0;
    return 0.13+rnd()*0.04;
  },tint:function(c){
    var b=0.30+rnd()*0.2,g=rnd();
    c.setRGB(b*(1.2+0.3*g),b*(0.95+0.3*g),b*0.55);
  }});
  plant({name:'stump',parts:[[st,mB,null]],count:26,tries:20000,pad:2,far:200,lod:0,shadow:true,want:function(x,z,h){
    if(h<2||h>8||rnd()>0.1*nearHome(x,z))return 0;
    return 0.8+rnd()*0.6;
  },tint:function(c){
    var b=0.6+rnd()*0.25;
    c.setRGB(b,b*0.92,b*0.82);
  }});
})();
