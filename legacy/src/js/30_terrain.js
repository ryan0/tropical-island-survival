/* The ground: footpaths, the terrain mesh and how it is coloured (sand, grass, rock, wet sand, sea-floor caustics).
   The height formula itself is in src/shared/island.glsl: hgt(x,z) here, hgt(vec2) in shaders. */

/* Landmarks. Everything placed by hand sits on the home islet (the wide southern one) and is measured from its ocean beach. */
var HOME_X=0,HOME_SHORE=shoreZ(0,1.0),HOME_Z=HOME_SHORE-32;   /* HOME_Z is roughly the middle of the islet */
var HUT_X=-18,HUT_Z=shoreZ(-18,1.0)-30;
/* footpaths: PATHP are the junction points [x,z], PATHS the segments between them (beach - fork - hut, fork - lagoon beach) */
var PATHP=[[0,HOME_SHORE-2],[-7,HUT_Z+12],[-16,HUT_Z+5.5],[-2,HUT_Z-6],[4,lagoonZ(4,0.7)]],
    PATHS=[[0,1],[1,2],[1,3],[3,4]];
/* distance from (x,z) to the nearest footpath */
function pathD(x,z){
  var best=1e9;
  for(var i=0;i<PATHS.length;i++){
    var A=PATHP[PATHS[i][0]],B=PATHP[PATHS[i][1]];
    var pax=x-A[0],
        paz=z-A[1],
        bax=B[0]-A[0],
        baz=B[1]-A[1],
        h=Math.max(0,Math.min(1,(pax*bax+paz*baz)/(bax*bax+baz*baz)));
    var d=Math.hypot(pax-bax*h,paz-baz*h);
    if(d<best)best=d;
  }
  return best;
}
/* the same segments are written into the terrain shader, so grass thins out along the paths there too */
function gv2(i){return 'vec2('+PATHP[i][0].toFixed(2)+','+PATHP[i][1].toFixed(2)+')';}
glslFill('terrain_fn',{PATH_SEGMENTS:PATHS.map(function(sg){return 'd=min(d,sdSeg(p,'+gv2(sg[0])+','+gv2(sg[1])+'));';}).join('')});
/* (the wind's direction, for the lagoon's shore break: both the sand and the water shaders read it from this chunk) */
glslFill('lagwave',{WINDDIR:'vec2('+glslFloat(CLOUD_WIND[0]/Math.hypot(CLOUD_WIND[0],CLOUD_WIND[1]))+','+glslFloat(CLOUD_WIND[1]/Math.hypot(CLOUD_WIND[0],CLOUD_WIND[1]))+')'});
glslFill('terrain_color',{SPAN_M:glslFloat(CLOUD_SHADE_SPAN*1000),HOME:'vec2('+glslFloat(HOME_X)+','+glslFloat(HOME_Z)+')'});
var TERR=glsl('terrain_color');
var TERR_PRE=glsl('terrain_pre');
/* the ocean shoreline of the southern side: coming in from the sea along a given x, the first z where the ground reaches `level` */
function shoreZ(x,level){
  for(var z=330;z>60;z-=0.25)if(hgt(x,z)>=level)return z;
  return 150;
}
/* the lagoon shoreline of the home islet: walking north from its middle along a given x, the first z where the ground is below `level` */
function lagoonZ(x,level){
  for(var z=HOME_Z;z>20;z-=0.25)if(hgt(x,z)<level)return z;
  return HOME_Z-30;
}
/* a random point on or near the ring of land (roughly even by area), for scattering plants and rocks.
   rnd = the caller's own random stream */
function ringPoint(rnd){
  var th=rnd()*6.2831853,R=islandR(th)+4,a=R-82,r=Math.sqrt(a*a+rnd()*(R*R-a*a));
  return [Math.cos(th)*r,Math.sin(th)*r];
}
/* 1 on and around the home islet, falling to 0.2 on the far side of the atoll: plants are scattered thickly where
   the player starts and thinly elsewhere, to keep the instance counts down */
function nearHome(x,z){
  return 1-0.8*smoothstep(70,170,Math.hypot(x-HOME_X,z-HOME_Z));
}
/* the pier: where it leaves the beach, and how long it is */
var PIER_X=-12,PIER_Z0=shoreZ(PIER_X,0.9)-1,PIER_LEN=20;
(function(){
  var rnd=rndStream('terrain');
  var g=new THREE.PlaneGeometry(520,520,260,260);
  g.rotateX(-Math.PI/2);
  var p=g.attributes.position,n=p.count,col=new Float32Array(n*3);
  for(var i=0;i<n;i++){
    var x=p.getX(i),z=p.getZ(i),h=hgt(x,z);
    p.setY(i,h);
    var v=0.5+0.5*Math.sin(x*1.7+z*0.9)*Math.sin(z*1.3-x*0.6);
    var r=0.97,gg=0.89,b=0.71;
    if(h<0.25){
      var w=Math.max(0,Math.min(1,(0.25-h)/0.5));
      r-=0.2*w;
      gg-=0.17*w;
      b-=0.2*w;
    }
    var gr=Math.max(0,Math.min(1,(h-1.3-v*0.5)/0.9));
    var tr=0.26+0.10*v,tg=0.52+0.10*v,tb=0.20;
    var rk=Math.max(0,Math.min(1,(h-10.5)/2.5));
    tr+=(0.42-tr)*rk;
    tg+=(0.44-tg)*rk;
    tb+=(0.36-tb)*rk;
    r+=(tr-r)*gr;
    gg+=(tg-gg)*gr;
    b+=(tb-b)*gr;
    col[i*3]=r;
    col[i*3+1]=gg;
    col[i*3+2]=b;
  }
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  /* Nearly half of the square is the flat sea floor beyond the reef (9.5 m down, the lowest the height formula goes).
     Those grid squares are left out and the whole floor is drawn as one big rectangle instead: the same picture,
     about 60,000 fewer triangles every frame. */
  (function(){
    var N=261,keep=[],FLOOR=-9.49,a,b,ix,iz;
    for(iz=0;iz<N-1;iz++)for(ix=0;ix<N-1;ix++){
      a=ix+N*iz;
      b=a+N;
      if(p.getY(a)>FLOOR||p.getY(a+1)>FLOOR||p.getY(b)>FLOOR||p.getY(b+1)>FLOOR)keep.push(a,b,a+1,b,b+1,a+1);
    }
    keep.push(0,N*(N-1),N-1,N*(N-1),N*N-1,N-1);
    g.setIndex(keep);
  })();
  g.computeVertexNormals();
  var dc=document.createElement('canvas');
  dc.width=dc.height=256;
  var dx=dc.getContext('2d');
  /* the ground's grit: every dot a slightly different grey (grains of sand), with scattered larger specks.
     One dot is about 1.4 cm on the ground; the picture repeats every 3.5 m. */
  /* fine grain (every dot its own grey) over soft clumps a few dots and a few dozen dots across, then round specks:
     mostly dark grains, some bright shell chips. All of it wraps at the edges. */
  var k,gritSum=0,gd=dx.createImageData(256,256),GV=new Float32Array(65536);
  function clumps(n){
    var a=new Float32Array(n*n),q;
    for(q=0;q<n*n;q++)a[q]=rnd();
    return function(u,v){
      var fx=u*n,fy=v*n,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;
      tx=tx*tx*(3-2*tx);
      ty=ty*ty*(3-2*ty);
      var x0=ix%n,x1=(ix+1)%n,y0=iy%n,y1=(iy+1)%n;
      return (a[y0*n+x0]*(1-tx)+a[y0*n+x1]*tx)*(1-ty)+(a[y1*n+x0]*(1-tx)+a[y1*n+x1]*tx)*ty;
    };
  }
  var c1=clumps(64),c2=clumps(16);
  for(k=0;k<65536;k++)GV[k]=0.45*rnd()+0.33*c1((k%256)/256,(k>>8)/256)+0.22*c2((k%256)/256,(k>>8)/256);
  for(k=0;k<260;k++){
    var sx=rnd()*256,sy=rnd()*256,sr=0.6+rnd()*0.9,sd=rnd()<0.6?-(0.12+rnd()*0.2):0.2+rnd()*0.2;
    for(var oy=-3;oy<=3;oy++)for(var ox=-3;ox<=3;ox++){
      var dd=Math.hypot(ox+Math.round(sx)-sx,oy+Math.round(sy)-sy);
      if(dd<sr+0.5)GV[(((Math.round(sy)+oy)&255)<<8)+((Math.round(sx)+ox)&255)]+=sd*Math.min(1,sr+0.5-dd);
    }
  }
  for(k=0;k<65536;k++){
    var gv=Math.max(0,Math.min(255,Math.round(150+105*GV[k])));
    gd.data[k*4]=gd.data[k*4+1]=gd.data[k*4+2]=gv;
    gd.data[k*4+3]=255;
    gritSum+=gv;
  }
  dx.putImageData(gd,0,0);
  var dtex=new THREE.CanvasTexture(dc);
  dtex.wrapS=dtex.wrapT=THREE.RepeatWrapping;
  dtex.repeat.set(150,150);
  var tmat=new THREE.MeshLambertMaterial({vertexColors:true,map:dtex});
  tmat.onBeforeCompile=function(sh){
    sh.uniforms.uTime=sharedUniforms.uTime;
    sh.uniforms.uLevel=sharedUniforms.uLevel;
    sh.uniforms.uDay=sharedUniforms.uDay;
    sh.uniforms.uHor=sharedUniforms.uHor;
    sh.uniforms.uDet=sharedUniforms.uDet;
    sh.uniforms.uCloudShade=sharedUniforms.uCloudShade;
    sh.uniforms.uReef=sharedUniforms.uReef;
    sh.uniforms.uWind=sharedUniforms.uWind;
    sh.uniforms.uCam=sharedUniforms.uCam;
    sh.uniforms.uSunDir=sharedUniforms.uSunDir;
    sh.uniforms.uGritMean={value:gritSum/65536/255};   /* the speckle picture's average, so the grit neither darkens nor lightens the ground overall */
    sh.vertexShader='varying vec3 vWp;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n vWp=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader=TERR_PRE+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n{'+TERR+'}');
  };
  var tmesh=new THREE.Mesh(g,tmat);
  tmesh.receiveShadow=true;
  tmesh.renderOrder=1;   /* drawn after the plants, rocks and props: its costly colouring is then skipped wherever they hide the ground */
  scene.add(tmesh);
})();
