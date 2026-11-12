/* Lifted from legacy/src/js/22_detail.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './20_glsl.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {renderer} from './05_core.js';

/* The detail texture: one small repeating picture that the sea and the sea floor read several times over, each time
   at a different size and angle and drifting its own way, so that no repeat ever shows.
     red, green   the slope of a field of small waves (which way the surface tilts)
     blue         soft blotches (gusts on the water, foam thinning out): the height of those small waves
     alpha        a net of thin lines: foam lace on the surface, the net of light on the sea floor
   It is made here, once, with its own little random-number generator so that the island's layout (rnd) is untouched. */
var detailTex=(function(){
  var N=256,NN=N*N,TAU=6.2831853,h=new Float32Array(NN),gx=new Float32Array(NN),gy=new Float32Array(NN),px=new Uint8Array(NN*4);
  var sd=20260711,i,x,y,o;
  function r(){
    sd=(Math.imul(sd,1664525)+1013904223)>>>0;
    return sd/4294967296;
  }
  /* small waves: 46 sine waves that each fit the tile a whole number of times, most of them running with the wind */
  var cxT=new Float32Array(N),sxT=new Float32Array(N),cyT=new Float32Array(N),syT=new Float32Array(N);
  for(i=0;i<46;i++){
    var km=2*Math.pow(13,r()),ang=r()<0.7?0.6+(r()-0.5)*1.9:r()*TAU,kx=Math.round(km*Math.cos(ang)),ky=Math.round(km*Math.sin(ang));
    if(!kx&&!ky)kx=2;
    var amp=Math.pow(Math.hypot(kx,ky),-1.7),ph=r()*TAU;
    for(x=0;x<N;x++){
      cxT[x]=Math.cos(TAU*kx*x/N+ph);
      sxT[x]=Math.sin(TAU*kx*x/N+ph);
      cyT[x]=Math.cos(TAU*ky*x/N);
      syT[x]=Math.sin(TAU*ky*x/N);
    }
    for(y=0;y<N;y++)for(x=0,o=y*N;x<N;x++,o++){
      var c=cxT[x]*cyT[y]-sxT[x]*syT[y],s=sxT[x]*cyT[y]+cxT[x]*syT[y];
      h[o]+=amp*c;
      gx[o]-=amp*kx*s;
      gy[o]-=amp*ky*s;
    }
  }
  /* sharper crests and flatter troughs, then scale so that 2.6 x the typical slope fills the 0..255 range */
  var hs=0,gm=0;
  for(o=0;o<NN;o++)hs+=h[o]*h[o];
  hs=Math.sqrt(hs/NN);
  for(o=0;o<NN;o++){
    var f=Math.max(0.2,1+0.7*h[o]/hs);
    gx[o]*=f;
    gy[o]*=f;
    gm+=gx[o]*gx[o]+gy[o]*gy[o];
  }
  gm=Math.sqrt(gm/NN)*2.6;
  /* smooth random values at four sizes that wrap at the tile's edge; they bend and thin the net of lines below */
  var LN=[4,8,16,32],LW=[0.5,0.27,0.15,0.08],LT=LN.map(function(n){
    var a=new Float32Array(n*n);
    for(var q=0;q<n*n;q++)a[q]=r();
    return a;
  });
  function blot(u,v){   /* u,v in tiles */
    var sum=0;
    for(var l=0;l<4;l++){
      var n=LN[l],a=LT[l],fx=u*n,fy=v*n,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;
      tx=tx*tx*(3-2*tx);
      ty=ty*ty*(3-2*ty);
      var x0=((ix%n)+n)%n,x1=(x0+1)%n,y0=((iy%n)+n)%n,y1=(y0+1)%n;
      sum+=LW[l]*((a[y0*n+x0]*(1-tx)+a[y0*n+x1]*tx)*(1-ty)+(a[y1*n+x0]*(1-tx)+a[y1*n+x1]*tx)*ty);
    }
    return sum;
  }
  /* the net of lines: how close each point is to a border between cells scattered over the tile (1 = on a border) */
  function cells(G){
    var a=new Float32Array(G*G*2);
    for(var q=0;q<G*G*2;q++)a[q]=r();
    return a;
  }
  function border(P,G,u,v){   /* u,v in cells */
    var cx=Math.floor(u),cy=Math.floor(v),f1=9,f2=9;
    for(var b=-1;b<=1;b++)for(var a=-1;a<=1;a++){
      var q=((((cy+b)%G)+G)%G*G+(((cx+a)%G)+G)%G)*2,dx=cx+a+P[q]-u,dy=cy+b+P[q+1]-v,d=dx*dx+dy*dy;
      if(d<f1){
        f2=f1;
        f1=d;
      }else if(d<f2)f2=d;
    }
    return Math.sqrt(f2)-Math.sqrt(f1);
  }
  var G1=17,G2=41,P1=cells(G1),P2=cells(G2);
  for(y=0;y<N;y++)for(x=0;x<N;x++){
    o=y*N+x;
    var u=x/N,v=y/N,b0=blot(u,v),wx=blot(u+0.37,v+0.11)-0.5,wy=blot(u+0.71,v+0.53)-0.5;
    var e1=border(P1,G1,u*G1+wx*1.5,v*G1+wy*1.5),e2=border(P2,G2,u*G2+wx*3,v*G2+wy*3);
    var net=Math.max(1-e1/0.5,(1-e2/0.55)*(0.62+0.5*b0));
    px[o*4]=Math.round(255*Math.max(0,Math.min(1,0.5+0.5*gx[o]/gm)));
    px[o*4+1]=Math.round(255*Math.max(0,Math.min(1,0.5+0.5*gy[o]/gm)));
    px[o*4+2]=Math.round(255*Math.max(0,Math.min(1,0.5+h[o]/(hs*5))));   /* the height of the same small waves: blotches with no grid in them */
    px[o*4+3]=Math.round(255*Math.max(0,Math.min(1,net)));
  }
  var tex=new THREE.DataTexture(px,N,N,THREE.RGBAFormat);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.magFilter=THREE.LinearFilter;
  tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps=true;
  tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate=true;
  return tex;
})();

export {detailTex};
