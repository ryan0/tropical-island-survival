/* Tools for building plants (used by 40_palms.js and 45_plants.js).

   Shape collects triangles for one kind of plant. Its methods add a part - a mass of leaves, a crown of blades, a
   stem, a dark core - and each part is written twice: in full to the Shape itself, and thinned out to shape.lo, the
   simpler level of detail that 24_instances.js draws for plants further away (every third sprig, drawn larger; every
   second blade, wider and with fewer bends). Building both at once from the same random numbers is what makes the
   two levels the same plant.

   shape.region names where in a shared picture ("atlas") the next part's texture coordinates should land; see
   FOLIAGE_REGIONS. Several parts with different looks (leaves, bark, the dark inside of a bush) can then share one
   picture and one material, and the whole plant is drawn in one go. */

/* random numbers for building shapes and pictures. NOT the island's layout (that is rnd): the same plants are
   built whatever the layout seed */
var leafSeed=987654321;
function leafRand(){
  leafSeed=(Math.imul(leafSeed,1664525)+1013904223)>>>0;
  return leafSeed/4294967296;
}
/* the leaf atlas is 1024 x 512: the left half holds four sprigs of leaves (2 x 2), the right half is solid - the dark
   inside of a bush, then a strip of bark. Each entry maps a part's own 0..1 coordinates into its region. */
var FOLIAGE_REGIONS={
  leaf:function(u,v){return [u*0.5,v];},
  core:function(u,v){return [(592+u*64)/1024,(16+v*240)/512];},          /* a core's own coordinates run 0..2 */
  bark:function(u,v){return [(816+(u-0.1)*1600)/1024,v];}                /* a stem's run 0.1..0.2 across, 0..1 along */
};
function Shape(noLo){
  this.P=[];
  this.U=[];
  this.N=[];
  this.C=[];
  this.region=null;
  this.lo=noLo?null:new Shape(true);
}
/* a corner is [x,y,z, u,v, nx,ny,nz, shade]; shade is one number or [r,g,b] and may be left out (= 1) */
Shape.prototype.tri=function(a,b,c){
  for(var t=0;t<3;t++){
    var v=[a,b,c][t],sh=v.length>8?v[8]:1,rgb=sh.length?sh:[sh,sh,sh],uv=this.region?FOLIAGE_REGIONS[this.region](v[3],v[4]):[v[3],v[4]];
    this.P.push(v[0],v[1],v[2]);
    this.U.push(uv[0],uv[1]);
    this.N.push(v[5],v[6],v[7]);
    this.C.push(rgb[0],rgb[1],rgb[2]);
  }
};
/* the same triangle in both levels of detail */
Shape.prototype.triBoth=function(a,b,c){
  this.tri(a,b,c);
  if(this.lo){
    this.lo.region=this.region;
    this.lo.tri(a,b,c);
  }
};
/* the dark heart of a bush: a plain ball that stops you seeing through it */
Shape.prototype.blob=function(cx,cy,cz,r,ry,seg,rings){
  var V=[],a,b;
  for(b=0;b<=rings;b++)for(a=0;a<=seg;a++){
    var th=a/seg*6.283,ph=b/rings*Math.PI,nx=Math.sin(ph)*Math.cos(th),ny=Math.cos(ph),nz=Math.sin(ph)*Math.sin(th);
    V.push([cx+nx*r,cy+ny*ry,cz+nz*r,a/seg*2,b/rings*2,nx,ny*0.6+0.4,nz]);
  }
  for(b=0;b<rings;b++)for(a=0;a<seg;a++){
    var o=b*(seg+1)+a;
    this.triBoth(V[o],V[o+1],V[o+seg+1]);
    this.triBoth(V[o+1],V[o+seg+2],V[o+seg+1]);
  }
};
/* a mass of foliage: n sprigs of leaves set all over a ball, each a small card turned outwards and then knocked
   askew, so the outline is made of leaves. Every card is lit as if it were part of the ball's surface, which is
   what makes the mass read as one rounded bush; sprigs low down and deep inside are darker.
   (centre, radii, how many, size of a sprig, low = how far below the middle the sprigs go, 0..1) */
Shape.prototype.leaves=function(cx,cy,cz,rx,ry,rz,n,size,low){
  var rl=leafRand;
  for(var i=0;i<n;i++){
    var y=1-(i+0.5)/n*(1+low),r=Math.sqrt(Math.max(0,1-y*y)),ph=i*2.39996+cx*3,dx=r*Math.cos(ph),dz=r*Math.sin(ph);
    var depth=0.72+0.36*rl(),px=cx+dx*rx*depth,py=cy+y*ry*depth,pz=cz+dz*rz*depth;
    var nx=dx+(rl()-0.5)*0.9,ny=y+(rl()-0.5)*0.9+0.25,nz=dz+(rl()-0.5)*0.9,nl=Math.hypot(nx,ny,nz)||1;
    nx/=nl;
    ny/=nl;
    nz/=nl;
    var tx=nz,ty=0,tz=-nx,tl=Math.hypot(tx,tz);
    if(tl<0.05){
      tx=1;
      tz=0;
      tl=1;
    }
    tx/=tl;
    tz/=tl;
    var bx=ny*tz-nz*ty,by=nz*tx-nx*tz,bz=nx*ty-ny*tx,ro=rl()*6.283,cr=Math.cos(ro),sr=Math.sin(ro),s=size*(0.8+0.45*rl());
    var cell=Math.floor(rl()*4),u0=(cell&1)*0.5,v0=(cell>>1)*0.5,sh=(0.50+0.50*Math.min(1,Math.max(0,(y+low)/(1+low)+0.15)))*(0.62+0.5*depth)*(0.85+0.3*rl());
    var sn=[dx*0.75,y*0.6+0.5,dz*0.75];
    for(var lv=0;lv<2;lv++){
      var T=lv?this.lo:this,k=lv?s*1.6:s;
      if(!T||(lv&&i%3))continue;
      var ax=(tx*cr+bx*sr)*k,ay=(ty*cr+by*sr)*k,az=(tz*cr+bz*sr)*k,ex=(bx*cr-tx*sr)*k,ey=(by*cr-ty*sr)*k,ez=(bz*cr-tz*sr)*k;
      var A=[px-ax-ex,py-ay-ey,pz-az-ez,u0,v0,sn[0],sn[1],sn[2],sh],B=[px+ax-ex,py+ay-ey,pz+az-ez,u0+0.5,v0,sn[0],sn[1],sn[2],sh],
          C=[px+ax+ex,py+ay+ey,pz+az+ez,u0+0.5,v0+0.5,sn[0],sn[1],sn[2],sh],D=[px-ax+ex,py-ay+ey,pz-az+ez,u0,v0+0.5,sn[0],sn[1],sn[2],sh];
      T.region=this.region;
      T.tri(A,B,C);
      T.tri(A,C,D);
    }
  }
};
/* a stem from one point to another (five-sided); v = where along the bark picture it starts */
Shape.prototype.stem=function(x0,y0,z0,x1,y1,z1,r0,r1,v){
  for(var s=0;s<5;s++){
    var a0=s*1.2566,a1=a0+1.2566,c0=Math.cos(a0),s0=Math.sin(a0),c1=Math.cos(a1),s1=Math.sin(a1);
    var A=[x0+c0*r0,y0,z0+s0*r0,0.1,v,c0,0.2,s0],B=[x0+c1*r0,y0,z0+s1*r0,0.2,v,c1,0.2,s1],C=[x1+c1*r1,y1,z1+s1*r1,0.2,v+0.3,c1,0.2,s1],D=[x1+c0*r1,y1,z1+s0*r1,0.1,v+0.3,c0,0.2,s0];
    this.triBoth(A,B,C);
    this.triBoth(A,C,D);
  }
};
/* a crown of sword-shaped leaves, each one a real strip of surface: it springs from the middle, arches out and
   droops at its point; tapered to that point, a little folded along its length. Young leaves in the middle stand
   up, the outer ones lie over. Every leaf is lit as part of one rounded crown (and the same on both sides), so
   the whole tuft shades smoothly; colour runs from dark at the base to lighter at the tip.
   n leaves, L long, W wide; up = how upright the middle is (1 = a fountain, 0.4 = a low star); dead = how many
   brown leaves hang underneath */
Shape.prototype.blades=function(cx,cy,cz,n,L,W,up,dead){
  var SEG=4,tot=n+dead,rl=leafRand;
  for(var i=0;i<tot;i++){
    var isDead=i>=n,f=isDead?1:(i+0.5)/n,az=i*2.39996+cx*5+cz*3,el=isDead?-0.75-0.4*rl():(1.35*up)*(1-f)+(-0.15)*f+(rl()-0.5)*0.3;
    var len=L*(isDead?0.8:(0.62+0.38*Math.sin(Math.PI*(0.25+0.6*f))))*(0.85+0.3*rl()),droop=(isDead?0.2:0.65+0.75*f)*(0.8+0.4*rl());
    var dx=Math.cos(az),dz=Math.sin(az),sx=-dz,sz=dx,ce=Math.cos(el),se=Math.sin(el);
    var g=isDead?0:0.85+0.3*rl(),base=isDead?[0.22,0.15,0.08]:[0.09*g,0.22*g,0.07*g],tip=isDead?[0.36,0.27,0.15]:[(0.22+0.10*f)*g,0.42*g,0.13*g];
    for(var lv=0;lv<2;lv++){
      var T=lv?this.lo:this,step=lv?2:1,wide=lv?1.5:1,prev=null;
      if(!T||(lv&&i%2))continue;
      for(var k=0;k<=SEG;k+=step){
        var t=k/SEG,r=len*ce*t,y=len*(se*t-droop*t*t*0.55),w=wide*W*(k===SEG?0:Math.pow(Math.sin(Math.PI*Math.min(1,0.12+0.84*t)),0.7))*(isDead?0.7:1);
        var px=cx+dx*r,py=cy+y,pz=cz+dz*r,fold=w*0.35;
        /* lit as a point on a ball round the crown's middle, tipped up */
        var nx=dx*ce*t*0.9,ny=0.75+0.3*se,nz=dz*ce*t*0.9,nl=Math.hypot(nx,ny,nz);
        var c=[base[0]+(tip[0]-base[0])*t,base[1]+(tip[1]-base[1])*t,base[2]+(tip[2]-base[2])*t];
        var row=[[px-sx*w,py+fold,pz-sz*w,0,t,nx/nl,ny/nl,nz/nl,c],[px,py,pz,0.5,t,nx/nl,ny/nl,nz/nl,[c[0]*0.8,c[1]*0.8,c[2]*0.8]],[px+sx*w,py+fold,pz+sz*w,1,t,nx/nl,ny/nl,nz/nl,c]];
        if(prev){
          T.tri(prev[0],prev[1],row[1]);
          T.tri(prev[0],row[1],row[0]);
          T.tri(prev[1],prev[2],row[2]);
          T.tri(prev[1],row[2],row[1]);
        }
        prev=row;
      }
    }
  }
};
/* the finished shape as a three.js geometry */
Shape.prototype.geo=function(){
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(this.P,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(this.U,2));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(this.N,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(this.C,3));
  return g;
};

/* several three.js geometries as one (positions, normals, texture coordinates; colours[i] = [r,g,b] for all of part i) */
function joinGeometries(parts,colours){
  var P=[],N=[],U=[],C=[];
  parts.forEach(function(g,gi){
    var n=g.index?g.toNonIndexed():g,p=n.attributes.position.array,c=colours[gi];
    Array.prototype.push.apply(P,p);
    Array.prototype.push.apply(N,n.attributes.normal.array);
    Array.prototype.push.apply(U,n.attributes.uv.array);
    for(var i=0;i<p.length;i+=3)C.push(c[0],c[1],c[2]);
  });
  var out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  out.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
  out.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
  out.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  return out;
}

/* How leaves take the light. three.js lights the back of a two-sided surface as if it faced the other way, which
   turns the far side of every leaf card black. A leaf is thin: light that falls on one side shows on the other.
   through = how much of it comes through (0 = lit the same from both sides as if the back did not exist;
   [r,g,b] = that fraction of the light on the far side is added, tinted - the yellow-green glow of a frond seen
   from underneath with the sun above it). Call from a material's onBeforeCompile, or pass the material. */
var leafLightCount=0;
function leafLight(material,through){
  var prev=material.onBeforeCompile,key='leaf'+(leafLightCount++);
  /* three.js shares one compiled shader between materials whose patch functions read the same; this keeps them apart
     (otherwise fronds lying on the ground sway with the palms' wind) */
  material.customProgramCacheKey=function(){return key;};
  material.onBeforeCompile=function(sh,r){
    if(prev)prev(sh,r);
    var t=through?'vec3('+through.join(',')+')':'';
    sh.fragmentShader=through?
      sh.fragmentShader.replace('( gl_FrontFacing ) ? vLightFront : vLightBack','( gl_FrontFacing ) ? vLightFront + vLightBack * '+t+' : vLightBack + vLightFront * '+t):
      sh.fragmentShader.replace(/\( gl_FrontFacing \) \? (\w+) : \w+/g,'$1');
  };
  return material;
}
