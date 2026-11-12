/* Lifted from legacy/src/js/38_water.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './36_waves.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {islandR,landW,sandbankX,sandbankZ} from 'virtual:shader-chunks';
import {REEF_BREAK,WATER_LEVEL,WAVE_TRAINS} from './00_config.js';
import {camera,glslFloat,scene,smoothstep} from './05_core.js';
import {glsl,glslFill} from './20_glsl.js';
import {CLOUD_SHADE_SPAN} from './23_clouds.js';
import {HOME_X,HOME_Z} from './30_terrain.js';
import {sharedUniforms} from './34_sky.js';
import {player} from './60_player.js';

/* The sea: materials, the far sea and the wave mesh.
   Shaders: src/glsl/water.vert.glsl (moves the mesh using waves.glsl) and water.frag.glsl (colour, foam, reflections).
   Read docs/DEVICE_NOTES.md before changing water.vert.glsl or the mesh's attributes. */

/* far=1: the flat far sea (the vertex shader leaves it alone). far=0: the wave mesh. Same shaders for both. */
/* (SWELL: the slope of each wave train's swell line, for the shading of the open sea - see water.frag.glsl) */
glslFill('water.frag',{SWELL:WAVE_TRAINS.map(function(T){
  return glslFloat(1.25*T.A*T.om/4.95)+'*(.70+.30*sin(t*'+glslFloat(T.g)+'+tha*2.+'+glslFloat(T.c)+'))*cos('+glslFloat(T.om)+'*ts+'+glslFloat(T.m)+'*tha+'+glslFloat(T.ph)+'+wob)';
}).join('+')+
  /* and out at sea a longer, slower swell that the reef's wave model does not carry (9 s, 44 m from crest to crest),
     coming and going in sets */
  '+'+glslFloat(0.50*0.70/4.95)+'*smoothstep(95.,170.,sS)*(.55+.45*sin(t*.07+tha*3.))*cos(.70*ts+4.*tha+1.3+wob)',SPAN_M:glslFloat(CLOUD_SHADE_SPAN*1000),HOME:'vec2('+glslFloat(HOME_X)+','+glslFloat(HOME_Z)+')'});
var WFRAG=glsl('water.frag');
var WVERT=glsl('water.vert');
function wmat(far){
  return new THREE.ShaderMaterial({uniforms:Object.assign({uFar:{value:far},uBand:{value:0}},sharedUniforms),transparent:true,extensions:{derivatives:true},depthWrite:!far,fog:false,side:THREE.DoubleSide,polygonOffset:!far,polygonOffsetFactor:-1,polygonOffsetUnits:-4,vertexShader:WVERT,fragmentShader:WFRAG});
}
/* the far sea: one big flat sheet out to the horizon. The shader cuts a ring-shaped hole in it where the wave mesh is,
   so the same sheet is also the calm water of the lagoon. */
var farSea=new THREE.Mesh(new THREE.PlaneGeometry(6500,6500,1,1).rotateX(-Math.PI/2),wmat(1));
farSea.frustumCulled=false;
farSea.renderOrder=5;
scene.add(farSea);
/* The wave mesh: a ring of water hugging the atoll, from 9 m up the ocean beach to 95 m offshore.
   Rows are lines of equal distance from the shore, packed tightly where the swell breaks on the reef edge and at the
   waterline, loosely elsewhere;
   columns fan out around the atoll, denser on the south side where the swell is biggest.
   Its vertex shader is the most expensive thing in the scene, so the ring is cut into 16 sectors:
   a sector that is out of view is not drawn at all, and each sector exists at three levels of detail (all points,
   every 2nd, every 4th in both directions) chosen by its distance from the camera. */
var waveMesh=new THREE.Group(),waveMat=wmat(0),waveSectors=[],waveMeshInfo;
var viewFrustum=new THREE.Frustum(),viewProj=new THREE.Matrix4(),probeBall=new THREE.Sphere(new THREE.Vector3(),32);
scene.add(waveMesh);
(function(){
  /* rows, from the open sea inwards (metres off the beach). The falling lip is a thin sheet, so the rows are closest
     where the swell breaks on the reef edge; the reef flat only has to carry lines of white water */
  var rows=[],sv=95,st=4.8,RB=REEF_BREAK;
  while(sv>RB+13){
    rows.push(sv);
    st=Math.max(0.8,st/1.10);
    sv-=st;
  }
  for(sv=RB+13;sv>RB+10.2;sv-=0.22)rows.push(sv);    /* where the biggest waves start to stand up */
  for(;sv>RB-5;sv-=0.18)rows.push(sv);               /* the break on the reef edge */
  for(;sv>RB-7;sv-=0.3)rows.push(sv);
  for(;sv>7;sv-=0.5)rows.push(sv);                    /* the reef flat */
  for(;sv>1.6;sv-=0.2)rows.push(sv);
  for(;sv>-1.6;sv-=0.1)rows.push(sv);                 /* the waterline */
  for(;sv>-4;sv-=0.3)rows.push(sv);
  for(;sv>-9;sv-=1)rows.push(sv);
  rows.push(-9);
  var NSEC=16,NA=640,NR=rows.length,TH=new Float32Array(NA+1),cum=[0],FN=4000,i,j;
  for(i=0;i<FN;i++){
    var ft=(i+0.5)/FN*6.2831853;
    cum.push(cum[i]+1+1.6*smoothstep(-0.4,0.8,Math.sin(ft)));
  }
  for(i=0,j=0;i<=NA;i++){
    var tgt=cum[FN]*i/NA;
    while(j<FN-1&&cum[j+1]<tgt)j++;
    TH[i]=(j+(tgt-cum[j])/(cum[j+1]-cum[j]))/FN*6.2831853;
  }
  TH[0]=0;
  TH[NA]=6.2831853;
  /* one piece of the ring: the given columns x the given rows. Position is the only attribute (docs/DEVICE_NOTES.md). */
  function piece(cols,rws){
    var nc=cols.length,nr=rws.length,P=new Float32Array(nc*nr*3),I=[],k=0,a,b,cx=0,cz=0,rad=0;
    for(b=0;b<nr;b++)for(a=0;a<nc;a++){
      var th=TH[cols[a]],r=islandR(th)+rows[rws[b]];
      P[k++]=Math.cos(th)*r;
      P[k++]=0;
      P[k++]=Math.sin(th)*r;
      cx+=P[k-3];
      cz+=P[k-1];
    }
    cx/=nc*nr;
    cz/=nc*nr;
    for(k=0;k<P.length;k+=3)rad=Math.max(rad,Math.hypot(P[k]-cx,P[k+2]-cz));
    for(b=0;b<nr-1;b++)for(a=0;a<nc-1;a++){
      var a0=b*nc+a,b0=a0+nc;
      /* each square is split along the diagonal that runs the way the big swell's crests cross the mesh, so a crest
         is drawn as a clean ridge and not as a row of teeth */
      I.push(a0,a0+1,b0+1,a0,b0+1,b0);
    }
    var g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(P,3));
    g.setIndex(I);
    g.boundingSphere=new THREE.Sphere(new THREE.Vector3(cx,0,cz),rad+10);
    var mesh=new THREE.Mesh(g,waveMat);
    mesh.frustumCulled=false;   /* updateWater decides, with a tighter test than one big sphere */
    mesh.renderOrder=5;
    waveMesh.add(mesh);
    return mesh;
  }
  var per=NA/NSEC,rowSets=[[],[],[]];
  for(j=0;j<NR;j++){
    rowSets[0].push(j);
    if(j%2===0||j===NR-1)rowSets[1].push(j);
    if(j%4===0||j===NR-1)rowSets[2].push(j);
  }
  for(var sct=0;sct<NSEC;sct++){
    var colSets=[[],[],[]];
    for(i=sct*per;i<=(sct+1)*per;i++){
      colSets[0].push(i);
      if((i-sct*per)%2===0)colSets[1].push(i);
      if((i-sct*per)%4===0)colSets[2].push(i);
    }
    var lod=[piece(colSets[0],rowSets[0]),piece(colSets[1],rowSets[1]),piece(colSets[2],rowSets[2])];
    /* twenty points spread over the sector: it is drawn only if a 32 m ball around one of them is in view
       (sectors on the north side are up to 180 m long, so fewer points would leave gaps and the sea would vanish there) */
    var probes=[];
    [sct*per,sct*per+per/4,sct*per+per/2,sct*per+3*per/4,(sct+1)*per].forEach(function(ci){
      [-9,22,58,95].forEach(function(off){
        var r=islandR(TH[ci])+off;
        probes.push(new THREE.Vector3(Math.cos(TH[ci])*r,0,Math.sin(TH[ci])*r));
      });
    });
    waveSectors.push({lod:lod,c:lod[0].geometry.boundingSphere.center,probes:probes});
  }
  waveMeshInfo=(NA+1)*NR+' vertices in '+NSEC+' sectors';
})();

/* The lagoon's shore-wave band. In a high wind the small waves that come ashore on the lagoon's beaches have real
   height (lagwave.glsl says where and when, lagband.vert.glsl lifts the mesh, water.frag.glsl colours it like any
   water and cuts the matching gap out of the flat far sea). A strip of mesh along the lagoon's own shore and another
   round the sandbank, from 2.5 m up the beach to 13.3 m out: rows 0.4 m apart near the edge, where the waves stand up
   and break, 0.7 m further out; columns about 1.3 m apart. Cut into pieces of 24 columns: a piece is drawn only in a
   high wind, in view and within reach of the eye (beyond 150 m the far sea draws that water flat again).
   Position is the only attribute (docs/DEVICE_NOTES.md). */
var bandMat=new THREE.ShaderMaterial({uniforms:Object.assign({uFar:{value:1},uBand:{value:1}},sharedUniforms),transparent:true,extensions:{derivatives:true},depthWrite:true,fog:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4,vertexShader:glsl('lagband.vert'),fragmentShader:WFRAG});
var bandPieces=[],bandInfo;
(function(){
  var rows=[],v,tris=0;
  for(v=2.5;v>-6.2;v-=0.4)rows.push(v);
  for(;v>-13.3;v-=0.7)rows.push(v);
  rows.push(-13.3);
  /* one strip: at(k, v) gives the point of column k (0..n, the last equal to the first) that lies v metres on the
     land side of the water's edge */
  function strip(n,at){
    for(var c0=0;c0<n;c0+=24){
      var c1=Math.min(c0+24,n),nc=c1-c0+1,nr=rows.length,P=new Float32Array(nc*nr*3),I=[],k=0,a,b,cx=0,cz=0,rad=0;
      for(b=0;b<nr;b++)for(a=0;a<nc;a++){
        var q=at(c0+a,rows[b]);
        P[k++]=q[0];
        P[k++]=0;
        P[k++]=q[1];
        cx+=q[0];
        cz+=q[1];
      }
      cx/=nc*nr;
      cz/=nc*nr;
      for(k=0;k<P.length;k+=3)rad=Math.max(rad,Math.hypot(P[k]-cx,P[k+2]-cz));
      for(b=0;b<nr-1;b++)for(a=0;a<nc-1;a++){
        var a0=b*nc+a,b0=a0+nc;
        I.push(a0,a0+1,b0+1,a0,b0+1,b0);
      }
      var g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.BufferAttribute(P,3));
      g.setIndex(I);
      g.boundingSphere=new THREE.Sphere(new THREE.Vector3(cx,WATER_LEVEL,cz),rad+1.5);
      var mesh=new THREE.Mesh(g,bandMat);
      mesh.frustumCulled=false;   /* updateWater decides */
      mesh.renderOrder=6;         /* after the far sea, which does not write depth */
      mesh.position.y=WATER_LEVEL;
      mesh.visible=false;
      scene.add(mesh);
      bandPieces.push(mesh);
      tris+=I.length/3;
    }
  }
  /* the lagoon's own shore: its edge lies landW inside the ocean shoreline (island.glsl) */
  var len=0,i,N,pr=null;
  for(i=0;i<=720;i++){
    var t0=i/720*6.2831853,r0=islandR(t0)-landW(t0),pt=[Math.cos(t0)*r0,Math.sin(t0)*r0];
    if(pr)len+=Math.hypot(pt[0]-pr[0],pt[1]-pr[1]);
    pr=pt;
  }
  N=Math.ceil(len/1.3);
  strip(N,function(k,vv){
    var t=(k%N)/N*6.2831853,r=islandR(t)-landW(t)+vv;
    return [Math.cos(t)*r,Math.sin(t)*r];
  });
  /* the sandbank: a round island 20 m in radius (island.glsl) */
  var NB=Math.ceil(6.2831853*25/1.3);
  strip(NB,function(k,vv){
    var t=(k%NB)/NB*6.2831853,r=20-vv;
    return [sandbankX()+Math.cos(t)*r,sandbankZ()+Math.sin(t)*r];
  });
  bandInfo=bandPieces.length+' pieces, '+tris+' triangles, lagoon shore '+Math.round(len)+' m';
})();

/* frame step: the far sea is a big sheet that follows the player; each wave-mesh sector shows the level of detail that suits its distance */
function updateWater(F){
  farSea.position.set(player.x,WATER_LEVEL,player.z);
  var cp=camera.position;
  camera.updateMatrixWorld();
  viewProj.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  viewFrustum.setFromProjectionMatrix(viewProj);
  for(var i=0;i<waveSectors.length;i++){
    var s=waveSectors[i],d=Math.hypot(cp.x-s.c.x,cp.y,cp.z-s.c.z),level=d<135?0:(d<300?1:2),seen=false;
    for(var k=0;k<s.probes.length&&!seen;k++){
      probeBall.center.copy(s.probes[k]);
      seen=viewFrustum.intersectsSphere(probeBall);
    }
    if(!seen)level=-1;
    s.lod[0].visible=level===0;
    s.lod[1].visible=level===1;
    s.lod[2].visible=level===2;
  }
  /* the lagoon's shore-wave band: only in a high wind, and only the pieces in view and within reach */
  var on=sharedUniforms.uWind.value>0.705&&!(sharedUniforms.uUnder.value>0.5);
  for(i=0;i<bandPieces.length;i++){
    var bs=bandPieces[i].geometry.boundingSphere;
    bandPieces[i].visible=on&&Math.hypot(cp.x-bs.center.x,cp.y-bs.center.y,cp.z-bs.center.z)<150+bs.radius&&viewFrustum.intersectsSphere(bs);
  }
  sharedUniforms.uBandOn.value=on?1:0;
}

export {bandInfo,bandPieces,farSea,updateWater,waveMat,waveMesh,waveMeshInfo};
