/* Lifted from legacy/src/js/40_palms.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './39_rocks.js';   /* first, so that the files still run in build 78's order */
import * as THREE from 'three';
import {hgt,sandbankX,sandbankZ} from 'virtual:shader-chunks';
import {renderer,rndStream} from './05_core.js';
import {plantSample,setPlantKind,splitInstances} from './24_instances.js';
import {HUT_X,HUT_Z,nearHome,pathD,ringPoint} from './30_terrain.js';
import {sharedUniforms} from './34_sky.js';
import {joinGeometries,leafLight} from './39_foliage.js';
import {inRock} from './39_rocks.js';

/* Coconut palms: four shapes of trunk (ordinary, tall and slender, leaning out over the beach, young and short),
   each palm with its own height, girth and lean, and a crown of feathery fronds that sway in the wind. */

var windShader=null,palmFrondTex=null;   /* palmFrondTex: the picture of one frond, also used for fronds lying on the ground */
(function(){
  var rnd=rndStream('palms');
  /* ---- the frond: a picture of one feather-shaped leaf (a midrib with separate leaflets either side), on a strip that
     arches up from the crown and droops at the tip, its two halves hanging down from the midrib ---- */
  var c=document.createElement('canvas');
  c.width=512;
  c.height=128;
  var x=c.getContext('2d');
  for(var i=0;i<78;i++){
    var u=i/78,px=10+u*488,len=(0.30+0.70*Math.pow(Math.sin(Math.PI*Math.min(1,0.12+0.95*u)),0.55))*58*(u>0.86?(1-u)/0.14*0.8+0.2:1);
    for(var side=-1;side<=1;side+=2){
      var g=70+Math.floor(rnd()*45),lean=14+rnd()*8,wob=(rnd()-0.5)*5;
      /* each leaflet: a thin blade, pale and yellow-green at the midrib, darker towards its point */
      var gr=x.createLinearGradient(px,64,px+lean,64+side*len);
      gr.addColorStop(0,'rgb('+Math.floor(g*0.78)+','+Math.floor(g*1.26)+','+Math.floor(g*0.44)+')');
      gr.addColorStop(1,'rgb('+Math.floor(g*0.42)+','+Math.floor(g*0.92)+','+Math.floor(g*0.34)+')');
      x.fillStyle=gr;
      x.beginPath();
      x.moveTo(px-3.1,64);
      x.lineTo(px+3.1,64);
      x.lineTo(px+lean+wob,64+side*len);
      x.closePath();
      x.fill();
    }
  }
  x.strokeStyle='#6a7a3a';
  x.lineWidth=3;
  x.beginPath();
  x.moveTo(0,64);
  x.lineTo(500,64);
  x.stroke();
  var tex=palmFrondTex=new THREE.CanvasTexture(c);
  tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  /* the strip the picture is on: S pieces along its length (10 close up, 5 for palms further away) */
  function frondGeo(S){
    var L=4.6,pos=[],uv=[],idx=[];
    for(var j=0;j<=S;j++){
      var u2=j/S,X=L*(u2-0.10*u2*u2*u2),Y=L*(0.46*u2-0.64*u2*u2),w2=1.30*(0.50+0.50*Math.sin(Math.PI*Math.min(1,0.15+0.8*u2)));
      /* the two halves hang a little from the midrib, more towards the tip */
      var dr=0.26+0.40*u2;
      pos.push(X,Y-dr*w2,-w2, X,Y,0, X,Y-dr*w2,w2);
      uv.push(u2,0,u2,0.5,u2,1);
      if(j<S){
        var a=j*3;
        idx.push(a,a+3,a+1, a+1,a+3,a+4, a+1,a+4,a+2, a+2,a+4,a+5);
      }
    }
    var g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  var fg=frondGeo(10),fgFar=frondGeo(5);
  var fm=new THREE.MeshLambertMaterial({map:tex,alphaTest:0.4,side:THREE.DoubleSide});
  var fdm=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:tex,alphaTest:0.4});
  fm.onBeforeCompile=function(sh){
    sh.uniforms.uTime=sharedUniforms.uTime;
    sh.uniforms.uWind=sharedUniforms.uWind;   /* (the sway is as it was at the usual breeze, 0.66; none in a calm) */
    sh.vertexShader='uniform float uTime,uWind;\n'+sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n#ifdef USE_INSTANCING\n transformed.y+=sin(uTime*1.6+instanceMatrix[3].x*1.3+instanceMatrix[3].z+position.x*.9)*.03*position.x*uWind*1.5;\n transformed.z+=sin(uTime*1.1+instanceMatrix[3].x)*.017*position.x*uWind*1.5;\n#endif');
    windShader=sh;
  };
  /* a frond is thin: sunlight on its upper side glows through, yellow-green, when you look up at it from below */
  leafLight(fm,[0.50,0.62,0.16]);
  /* ---- trunks: bark with ring scars close together and darker streaks, swollen where it meets the ground ---- */
  var bc=document.createElement('canvas');
  bc.width=256;
  bc.height=32;
  var bx2=bc.getContext('2d');
  for(var bi=0;bi<256;bi++){
    var sh2=118+((bi%4)===0?-16:0)+Math.floor(rnd()*18)-Math.floor(18*Math.exp(-bi/40));
    bx2.fillStyle='rgb('+sh2+','+Math.floor(sh2*0.93)+','+Math.floor(sh2*0.84)+')';
    bx2.fillRect(bi,0,1,32);
  }
  for(bi=0;bi<60;bi++){
    bx2.fillStyle='rgba(40,34,28,'+(0.10+rnd()*0.16)+')';
    bx2.fillRect(rnd()*256,rnd()*32,14+rnd()*50,1+rnd()*3);
  }
  var tm=new THREE.MeshLambertMaterial({map:new THREE.CanvasTexture(bc),vertexColors:true});
  var NUT=[0.76,0.82,0.42],WOOD=[1,1,1];   /* colours the bark picture is multiplied by: coconuts olive, trunk as it is */
  function trunkGeo(p0,p1,p2,girth,along,round){
    var curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(p0[0],p0[1],0),new THREE.Vector3(p1[0],p1[1],0),new THREE.Vector3(p2[0],p2[1],0));
    var tg=new THREE.TubeGeometry(curve,along,0.2,round,false),p=tg.attributes.position,c0=new THREE.Vector3(),parts=[tg],cols=[WOOD];
    for(var i=0;i<p.count;i++){
      var u=Math.min(1,Math.floor(i/(round+1))/along);
      curve.getPointAt(u,c0);
      /* swollen foot, and a boss of fibre and old leaf bases under the crown */
      var f=girth*(1.25-0.62*u+1.0*Math.exp(-u*16)+0.75*Math.exp(-(1-u)*9));
      p.setXYZ(i,c0.x+(p.getX(i)-c0.x)*f,c0.y+(p.getY(i)-c0.y)*f,c0.z+(p.getZ(i)-c0.z)*f);
    }
    /* (the tube's own normals are kept: recomputing them leaves a hard light/dark seam down one side) */
    /* three coconuts under the crown, part of the same mesh */
    for(var n=0;n<3;n++){
      var nut=new THREE.SphereGeometry(0.21,round>5?8:5,round>5?6:4),uvs=nut.attributes.uv;
      nut.scale(1,1.15,1);
      nut.translate(p2[0]+Math.cos(n*2.1)*0.3,p2[1]-0.4,Math.sin(n*2.1)*0.3);
      for(var q=0;q<uvs.count;q++)uvs.setXY(q,0.5,0.5);
      parts.push(nut);
      cols.push(NUT);
    }
    return joinGeometries(parts,cols);
  }
  /* one shape of trunk: its full form, a plainer one for palms further away, where its top is, and its palms */
  function trunkShape(p0,p1,p2,girth){
    return {g:trunkGeo(p0,p1,p2,girth,12,7),far:trunkGeo(p0,p1,p2,girth,5,5),top:[p2[0],p2[1]],list:[]};
  }
  var KIND=[trunkShape([0,-0.4],[0.2,3.6],[1.7,7.0],1.0),      /* ordinary: a gentle curve */
            trunkShape([0,-0.4],[0.9,5.2],[0.7,10.0],0.85),    /* tall and slender, nearly straight */
            trunkShape([0,-0.4],[2.9,1.7],[4.6,6.4],1.0),      /* leaning far out, then turning up */
            trunkShape([0,-0.3],[0.1,1.3],[0.5,2.7],1.25)];    /* young: short and stout */
  var spots=[],tries=0;
  while(spots.length<200&&tries<60000){
    tries++;
    var pp=ringPoint(rnd),px2=pp[0],pz=pp[1],h=hgt(px2,pz);
    if(rnd()>0.35+0.65*nearHome(px2,pz))continue;
    if(h<1.5||h>8)continue;
    if(Math.hypot(px2-HUT_X,pz-HUT_Z)<6||pathD(px2,pz)<2.2)continue;
    var ok=true;
    for(var k=0;k<spots.length;k++)if(Math.hypot(spots[k][0]-px2,spots[k][1]-pz)<2.7){
      ok=false;
      break;
    }
    if(ok)spots.push([px2,pz,h]);
  }
  [[sandbankX()+2,sandbankZ()+1],[sandbankX()-4,sandbankZ()-2],[sandbankX()+1,sandbankZ()+6]].forEach(function(s){spots.push([s[0],s[1],hgt(s[0],s[1])]);});
  /* no palm grows through a rock (dropped here, after placing, so that the others stay where they were) */
  spots=spots.filter(function(sp){return !inRock(sp[0],sp[1],0.4);});
  var NF=20,
      fr=new THREE.InstancedMesh(fg,fm,spots.length*NF);
  var frondCol=new THREE.Color(),m=new THREE.Matrix4(),
      q=new THREE.Quaternion(),
      q2=new THREE.Quaternion(),
      e=new THREE.Euler(),
      sc=new THREE.Vector3(),
      ps=new THREE.Vector3();
  spots.forEach(function(s,i){
    /* which shape: palms at the edge of the beach mostly lean out over it; inland they grow tall to reach the light */
    var r=rnd(),beach=s[2]<2.7,kind=beach?(r<0.55?2:(r<0.75?3:(r<0.9?0:1))):(r<0.40?1:(r<0.78?0:(r<0.90?3:2)));
    var K=KIND[kind],ya=rnd()*6.283,k=(kind===3?0.8:0.72)+rnd()*0.55,tilt=kind===2?0.12:0.22;
    if(kind===2&&beach){
      /* a leaning palm leans towards the sea (outwards from the island's middle) */
      ya=-Math.atan2(s[1],s[0])+(rnd()-0.5)*1.2;
    }
    e.set((rnd()-0.5)*tilt,ya,(rnd()-0.5)*tilt);
    q.setFromEuler(e);
    sc.set(k,k,k);
    ps.set(s[0],s[2],s[1]);
    m.compose(ps,q,sc);
    K.list.push(m.clone());
    plantSample('palm','palm '+['ordinary','tall','leaning','young'][kind],s[0],s[2],s[1],k);
    var top=new THREE.Vector3(K.top[0]*k,(K.top[1]-0.05)*k,0).applyQuaternion(q).add(ps);
    var crown=kind===3?1.05:(0.92+rnd()*0.2),dead=rnd()<0.6?1:0;
    for(var f=0;f<NF;f++){
      /* four tiers: a spear and young fronds standing up, the spreading crown, a skirt hanging down, and a few
         dead brown fronds against the trunk */
      var tier=f%4,pitch=(tier===0?0.95:(tier===1?0.48:(tier===2?0.05:-0.62)))+(rnd()-0.5)*0.36;
      e.set((rnd()-0.5)*0.5,f*6.283/NF*3.0+rnd()*0.6,pitch,'YZX');
      q2.setFromEuler(e);
      var fk=k*crown*(tier===0?0.72:(tier===3?0.86:1))*(0.88+rnd()*0.24)*(kind===3?1.15:1);
      sc.set(fk,fk*(0.85+rnd()*0.3),fk);
      m.compose(top,q2,sc);
      fr.setMatrixAt(i*NF+f,m);
      var fb=0.80+rnd()*0.32;
      if(tier===3&&dead&&f%8===3)frondCol.setRGB(fb*1.5,fb*0.92,fb*0.50);          /* dead: brown */
      else if(tier===3)frondCol.setRGB(fb*1.08,fb*1.0,fb*0.70);                    /* old: yellowing */
      else if(tier===0)frondCol.setRGB(fb*1.05,fb*1.08,fb*0.86);                    /* young: bright */
      else frondCol.setRGB(fb,fb,fb*0.92);
      fr.setColorAt(i*NF+f,frondCol);
    }
  });
  setPlantKind({g:'palm'});
  KIND.forEach(function(K){
    if(!K.list.length)return;
    var tr=new THREE.InstancedMesh(K.g,tm,K.list.length);
    K.list.forEach(function(mm,ii){tr.setMatrixAt(ii,mm);});
    tr.castShadow=true;
    splitInstances(tr,13,0,{geo:K.far,dist:50,cell:32});
  });
  fr.castShadow=true;
  fr.customDepthMaterial=fdm;
  splitInstances(fr,13,0,{geo:fgFar,dist:50,cell:32});
  setPlantKind(null);
})();

export {palmFrondTex};
