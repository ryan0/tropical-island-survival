/* Grass tufts, dune grass and flowers (instanced, wind-animated in the vertex shader). */

(function(){
  var rnd=rndStream('grass');
  var m=new THREE.Matrix4(),
      qq=new THREE.Quaternion(),
      e=new THREE.Euler(),
      s=new THREE.Vector3(),
      p=new THREE.Vector3(),
      col=new THREE.Color(),
      k=0,
      tries=0,
      T=[0,0,0];
  function tintAt(x,z,o){
    var lush=.5+.5*Math.sin(x*.07+1.9*Math.sin(z*.05+.4))*Math.sin(z*.09+1.3*Math.sin(x*.06));
    var dry=.5+.5*Math.sin(x*.13+2.1)*Math.sin(z*.11+.7),d2=dry*dry*.6;
    /* (the same turf colours as the ground: terrain_color.glsl) */
    o[0]=.56+(.36-.56)*lush;
    o[1]=.62+(.52-.62)*lush;
    o[2]=.26+(.19-.26)*lush;
    d2=dry*dry*.7;
    o[0]+=(.72-o[0])*d2;
    o[1]+=(.66-o[1])*d2;
    o[2]+=(.40-o[2])*d2;
    return lush;
  }
  function edgeW(x,z){return .45*Math.sin(x*.31+z*.17)+.3*Math.sin(z*.43-x*.23+1.);}
  function dirtA(x,z){
    return Math.sin(x*.23+1.1*Math.sin(z*.17))*Math.sin(z*.21+1.4*Math.sin(x*.19)+2.);
  }
  function rgb(r,g,b){
    return 'rgb('+Math.round(Math.min(255,r))+','+Math.round(Math.min(255,g))+','+Math.round(Math.min(255,b))+')';
  }
  function mk(){
    var c=document.createElement('canvas');
    c.width=c.height=256;
    c.getContext('2d').scale(2,2);   /* drawn in 128 units, kept at twice the detail */
    return c;
  }
  function blade(x,x0,w,h,lean,r,g,b){
    var gr=x.createLinearGradient(0,128,0,128-h);
    gr.addColorStop(0,rgb(r*.46,g*.50,b*.42));
    gr.addColorStop(.5,rgb(r*.78,g*.8,b*.74));
    gr.addColorStop(1,rgb(r,g,b));
    x.fillStyle=gr;
    x.beginPath();
    x.moveTo(x0-w/2,128);
    x.quadraticCurveTo(x0-w/2+lean*.35,128-h*.6,x0+lean,128-h);
    x.quadraticCurveTo(x0+w/2+lean*.45,128-h*.55,x0+w/2,128);
    x.closePath();
    x.fill();
  }
  var cA=mk(),xA=cA.getContext('2d'),i;
  /* turf: a tussock - many fine blades fanning out from one crowded base, most of them short, a few dry */
  for(i=0;i<95;i++){
    var ax0=64+(rnd()-.5)*50,adry=rnd()<0.22?1:0,ah=22+rnd()*rnd()*100;
    blade(xA,ax0,1.6+rnd()*1.9,ah,(ax0-64)*(0.5+rnd()*0.9)+(rnd()-.5)*26,adry?250:205+rnd()*40,adry?232:236+rnd()*19,adry?150:185+rnd()*30);
  }
  var cB=mk(),xB=cB.getContext('2d');
  for(i=0;i<40;i++){
    var bx0=64+(rnd()-.5)*46,bh=60+rnd()*62,bl=(bx0-64)*(0.6+rnd()*0.8)+(rnd()-.5)*24;
    blade(xB,bx0,1.5+rnd()*1.5,bh,bl,225+rnd()*25,240,198+rnd()*20);
    if(i%3===0){
      xB.save();
      xB.translate(bx0+bl,128-bh+4);
      xB.rotate(bl*0.012);
      xB.fillStyle=rgb(238+rnd()*12,222,165);
      xB.beginPath();
      xB.ellipse(0,0,1.7,8,0,0,6.283);
      xB.fill();
      xB.restore();
    }
  }
  var cD=mk(),xD=cD.getContext('2d');
  for(i=0;i<34;i++){
    var dx0=64+(rnd()-.5)*30;
    blade(xD,dx0,1.4+rnd()*1.6,60+rnd()*62,(dx0-64)*1.6+(rnd()-.5)*60,252,240+rnd()*12,172+rnd()*28);
  }
  function crossGeo(nq,w,h){
    var g=new THREE.BufferGeometry(),P=[],U=[],N=[],I=[];
    for(var q=0;q<nq;q++){
      var a=q*Math.PI/nq+0.3,cx=Math.cos(a)*w/2,cz=Math.sin(a)*w/2,o=q*4;
      P.push(-cx,0,-cz,cx,0,cz,cx,h,cz,-cx,h,-cz);
      U.push(0,0,1,0,1,1,0,1);
      N.push(0,1,0,0,1,0,0,1,0,0,1,0);
      I.push(o,o+1,o+2,o,o+2,o+3);   /* seen from both sides (the material is two-sided and lit the same on each) */
    }
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
    g.setIndex(I);
    return g;
  }
  function gmat(cv,amp){
    var mt=leafLight(new THREE.MeshLambertMaterial({map:new THREE.CanvasTexture(cv),alphaTest:0.45,side:THREE.DoubleSide}));
    var lit=mt.onBeforeCompile;
    mt.onBeforeCompile=function(sh,r){
      lit(sh,r);
      sh.uniforms.uTime=sharedUniforms.uTime;
      sh.uniforms.uWind=sharedUniforms.uWind;
      sh.vertexShader='uniform float uTime,uWind;\n'+sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n#ifdef USE_INSTANCING\n float gph=instanceMatrix[3].x*.35+instanceMatrix[3].z*.27;float gw=sin(uTime*1.7+gph)+.5*sin(uTime*3.1+gph*1.7);\n float gk=position.y*position.y*uWind*1.5*'+amp.toFixed(3)+';transformed.x+=gw*gk;transformed.z+=gw*gk*.6;\n#endif');
    };
    return mt;
  }
  /* the kinds of tuft: [0] short turf, [1] taller grass with seed heads, [2] dune grass on the sand. L = where they go */
  var V=[{g:crossGeo(2,1.25,0.62),m:gmat(cA,0.090),cap:9000,L:[]},{g:crossGeo(3,0.9,1.0),m:gmat(cB,0.063),cap:2100,L:[]},
         {g:crossGeo(2,1.1,0.8),m:gmat(cD,0.072),cap:1300,L:[]}];
  function consider(x,z){
    var h=hgt(x,z);
    if(h<0.95||h>11.2)return;
    if(Math.hypot(x-HUT_X,z-HUT_Z)<4.5)return;
    var ed=h+edgeW(x,z);
    if(ed<1.8){
      if(h>1.0&&ed>1.12&&rnd()<0.11&&V[2].L.length<V[2].cap){
        var dj=.9+rnd()*.2;
        V[2].L.push([x,z,h,.5+rnd()*.45,.70*dj,.74*dj,.50*dj]);
      }
      return;
    }
    if(pathD(x,z)<1.25)return;
    var da=dirtA(x,z);
    if(da>0.74)return;
    if(da>0.6&&rnd()<0.7)return;
    var lush=tintAt(x,z,T),r=rnd(),j=.92+rnd()*.24,vi=0,sc=(.5+.4*lush+rnd()*.35)*(rnd()<0.12?0.9:0.55),   /* mostly short turf, the odd tall clump */
        cr=T[0]*j,cg=T[1]*j,cb=T[2]*j;
    if(r>0.72&&r<=0.90){
      vi=1;
      sc=.55+rnd()*.45;
      cr=cr*.75+.15;
      cg=cg*.75+.15;
      cb=cb*.75+.07;
    }
    if(V[vi].L.length>=V[vi].cap)return;
    V[vi].L.push([x,z,h,sc,cr*(.95+rnd()*.1),cg,cb*(.95+rnd()*.1)]);
  }
  for(tries=0;tries<300000;tries++){
    var gp=ringPoint(rnd);
    if(rnd()<nearHome(gp[0],gp[1]))consider(gp[0],gp[1]);
  }
  for(tries=0;tries<1500;tries++){
    var ia=rnd()*6.283,ir=Math.sqrt(rnd())*17;
    consider(sandbankX()+Math.cos(ia)*ir,sandbankZ()+Math.sin(ia)*ir);
  }
  V.forEach(function(v){
    if(!v.L.length)return;
    var im=new THREE.InstancedMesh(v.g,v.m,v.L.length);
    v.L.forEach(function(t,i2){
      e.set(0,rnd()*6.283,0);
      qq.setFromEuler(e);
      s.set(t[3],t[3]*(0.8+rnd()*0.5),t[3]);
      if(inRock(t[0],t[1],0.1))s.set(0,0,0);   /* none inside a rock */
      p.set(t[0],t[2]-0.03,t[1]);
      m.compose(p,qq,s);
      im.setMatrixAt(i2,m);
      col.setRGB(t[4]*0.92,t[5]*0.92,t[6]*0.86);
      im.setColorAt(i2,col);
    });
    im.receiveShadow=true;
    plantKind={g:'grass',s:'grass '+['turf','seed heads','dune'][V.indexOf(v)]};
    splitInstances(im,2.5,110);
    plantKind=null;
  });
  /* sea grass: beds of short blades on the sandy floor of the lagoon, 1-4 m down (the coral is in 47_reef.js) */
  var cK=mk(),xK=cK.getContext('2d');
  for(i=0;i<16;i++)blade(xK,20+rnd()*88,7+rnd()*6,80+rnd()*46,(rnd()-.5)*30,150+rnd()*40,200+rnd()*40,120+rnd()*40);
  var kelp=[];
  for(tries=0;tries<90000&&kelp.length<1500;tries++){
    var rx=HOME_X+(rnd()*2-1)*130,rz=HOME_Z+(rnd()*2-1)*130,rh=hgt(rx,rz);
    if(rh>-1.0||rh<-4.2)continue;
    /* (in beds, and thinning towards a bed's edge) */
    var bed=Math.sin(rx*.05+2.+1.3*Math.sin(rz*.04))*Math.sin(rz*.06+1.1*Math.sin(rx*.07));
    if(bed<0.15+rnd()*0.35||inRock(rx,rz,0.3))continue;
    kelp.push([rx,rz,rh]);
  }
  var km=new THREE.InstancedMesh(crossGeo(3,0.55,1.5),gmat(cK,0.03),Math.max(1,kelp.length));
  kelp.forEach(function(t,i2){
    e.set(0,rnd()*6.283,0);
    qq.setFromEuler(e);
    var ks=.1+rnd()*.08;   /* (short and wide: from above a bed reads as a mottling of the sand, not as things standing on it) */
    s.set(ks*4.5,ks*(.7+rnd()*.6),ks*4.5);
    p.set(t[0],t[2]-0.04,t[1]);
    m.compose(p,qq,s);
    km.setMatrixAt(i2,m);
    var kd=-t[2];
    col.setRGB((.70+rnd()*.14)*Math.exp(-kd*.20),(.68+rnd()*.12)*Math.exp(-kd*.06),(.48+rnd()*.10)*Math.exp(-kd*.04));
    km.setColorAt(i2,col);
  });
  km.count=kelp.length;
  plantKind={g:'reef',s:'sea grass'};
  splitInstances(km,3,60);
  plantKind=null;
})();
