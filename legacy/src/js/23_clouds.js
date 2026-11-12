/* The clouds: all of them, as real volumes.

   Clouds are not surfaces, so they are not drawn as surfaces. There is a field of cloud in the air round the island -
   fair-weather cumulus with flat bases at 800 m, here and there a tower several kilometres tall, thin cirrus far above -
   described by two small noise pictures (below), and a shader (cloudbake.frag.glsl) that walks out through that air
   along a line of sight, adding up how much cloud it passes, how much sunlight reaches each bit of it through the
   cloud in the way, and how much haze lies in front.

   That walk is far too slow to do for every dot of the screen every frame. So it is done into a picture of the whole
   sky instead (all 360 degrees round, horizon to zenith), a thin slice of it each frame; the sky shader then only has
   to look its direction up in that picture. Three such pictures take turns: the sky shows a blend sliding from the
   last finished one to the newest while the third is being redrawn, so the clouds change smoothly - they drift with
   the wind (each picture is shifted to where its clouds have got to by now), and they billow and re-form.

   What a sky picture holds, for each direction (already multiplied by how much of it shows through nearer cloud):
     red     sunlit cloud (to be coloured by the sun of the moment)
     green   cloud lit by the sky (to be coloured by the shade colour)
     blue    cloud lost in haze (takes the sky's own colour)
     alpha   how much the clouds hide of what is behind them */
var CLOUD_W=window.__cloudW||4096,CLOUD_H=CLOUD_W/8,CLOUD_SLICES=128,
    CLOUD_WIND=[-0.0058,0.0012],  /* km a second: the trade wind, from the east, about 20 km/h (it brings the cumulus field that
                                     starts out east of the island over it: cloud shadows come and go) */
    CLOUD_START=[12,23],          /* km: where on the weather map the island starts out - chosen (by a search) so that towers stand
                                     opposite the sunset and to one side of it and none overhead, the first cloud shadows cross the island
                                     after about eight minutes, and there is no long overcast spell at midday in the first hour */
    CLOUD_REF=1.2,                /* km: the height whose drift the pictures are shifted by between redraws */
    CLOUD_LANE=[Math.sin(-0.85),Math.cos(-0.85)],   /* the bearing the sun sets on (x,z): cloud is kept thin along it */
    CLOUD_LANE2=[Math.sin(1.5),Math.cos(1.5)],     /* ... and the bearing it rises on */
    CLOUD_SHADE_SPAN=24,          /* km: the side of the square the cloud-shadow map covers, the island in its middle */
    CLOUD_EARTH=1/2400;           /* 1/(2R): the ground curves away as for a small earth (R = 1200 km), so far clouds sink to the horizon */

/* Noise that fills space, as 64 slices of 64 x 64 laid out 8 x 8 in one picture (each slice with a one-dot border
   copied from its far side, so reading across the edge is seamless). It repeats in all three directions.
     red    the cloud shapes: round lumps, big and middling, on soft noise
     green  finer round lumps (read again at a smaller scale to nibble the edges into cauliflower) */
var cloudNoise=(function(){
  var n=64,G=66,AW=G*8,px=new Uint8Array(AW*AW*4),sd=91173,x,y,z,i,q;
  function r(){
    sd=(Math.imul(sd,1664525)+1013904223)>>>0;
    return sd/4296967296;
  }
  /* lumps: f cells a side with one point in each; the value is 1 at a point, falling to 0 a cell-width away */
  function lumps(f){
    var m=f*f*f,PX=new Float32Array(m),PY=new Float32Array(m),PZ=new Float32Array(m),out=new Float32Array(n*n*n),a,b,c;
    for(i=0;i<m;i++){
      PX[i]=r();
      PY[i]=r();
      PZ[i]=r();
    }
    q=0;
    for(z=0;z<n;z++)for(y=0;y<n;y++)for(x=0;x<n;x++){
      var gx=(x+0.5)/n*f,gy=(y+0.5)/n*f,gz=(z+0.5)/n*f,cx=Math.floor(gx),cy=Math.floor(gy),cz=Math.floor(gz),best=9;
      for(c=cz-1;c<=cz+1;c++)for(b=cy-1;b<=cy+1;b++)for(a=cx-1;a<=cx+1;a++){
        var k=((c+f)%f*f+(b+f)%f)*f+(a+f)%f,dx=a+PX[k]-gx,dy=b+PY[k]-gy,dz=c+PZ[k]-gz,d2=dx*dx+dy*dy+dz*dz;
        if(d2<best)best=d2;
      }
      out[q++]=1-Math.min(1,Math.sqrt(best));
    }
    return out;
  }
  /* soft noise: random values at the corners of f cells a side, blended smoothly between */
  function soft(f){
    var m=f*f*f,V=new Float32Array(m),out=new Float32Array(n*n*n);
    for(i=0;i<m;i++)V[i]=r();
    q=0;
    for(z=0;z<n;z++)for(y=0;y<n;y++)for(x=0;x<n;x++){
      var gx=(x+0.5)/n*f,gy=(y+0.5)/n*f,gz=(z+0.5)/n*f,x0=Math.floor(gx),y0=Math.floor(gy),z0=Math.floor(gz),fx=gx-x0,fy=gy-y0,fz=gz-z0;
      fx=fx*fx*(3-2*fx);
      fy=fy*fy*(3-2*fy);
      fz=fz*fz*(3-2*fz);
      var x1=(x0+1)%f,y1=(y0+1)%f,z1=(z0+1)%f;
      var a0=V[(z0*f+y0)*f+x0]*(1-fx)+V[(z0*f+y0)*f+x1]*fx,a1=V[(z0*f+y1)*f+x0]*(1-fx)+V[(z0*f+y1)*f+x1]*fx;
      var b0=V[(z1*f+y0)*f+x0]*(1-fx)+V[(z1*f+y0)*f+x1]*fx,b1=V[(z1*f+y1)*f+x0]*(1-fx)+V[(z1*f+y1)*f+x1]*fx;
      out[q++]=(a0*(1-fy)+a1*fy)*(1-fz)+(b0*(1-fy)+b1*fy)*fz;
    }
    return out;
  }
  var w4=lumps(4),w8=lumps(8),w16=lumps(16),s4=soft(4),s8=soft(8),s16=soft(16),N=n*n*n,R=new Float32Array(N),lo=9,hi=-9;
  for(i=0;i<N;i++){
    var sn=s4[i]*0.56+s8[i]*0.29+s16[i]*0.15,lw=w4[i]*0.68+w8[i]*0.32;
    R[i]=lw*0.62+sn;
    lo=Math.min(lo,R[i]);
    hi=Math.max(hi,R[i]);
  }
  for(z=0;z<n;z++)for(y=-1;y<=n;y++)for(x=-1;x<=n;x++){
    i=(z*n+(y+n)%n)*n+(x+n)%n;
    q=((Math.floor(z/8)*G+y+1)*AW+(z%8)*G+x+1)*4;
    px[q]=Math.round(255*(R[i]-lo)/(hi-lo));
    px[q+1]=Math.round(255*Math.min(1,(w8[i]*0.62+w16[i]*0.38)*1.25));
    px[q+2]=0;
    px[q+3]=255;
  }
  var tex=new THREE.DataTexture(px,AW,AW,THREE.RGBAFormat);
  tex.magFilter=tex.minFilter=THREE.LinearFilter;
  tex.needsUpdate=true;
  return tex;
})();

/* The weather map: where over the sea there is cloud, 64 km a side, repeating.
     red    how much fair-weather cumulus (patchy: fields of it, and clear stretches)
     green  where the few great towers stand
     blue   how tall the clouds grow just there
     alpha  the cirrus: long streaks */
var cloudWeather=(function(){
  var n=256,px=new Uint8Array(n*n*4),sd=1234567,x,y,i,c;
  function r(){
    sd=(Math.imul(sd,1664525)+1013904223)>>>0;
    return sd/4296967296;
  }
  /* one layer of soft noise, fx by fy cells, added into F with weight w */
  function layer(F,fx,fy,w){
    var V=new Float32Array(fx*fy);
    for(i=0;i<fx*fy;i++)V[i]=r();
    for(y=0;y<n;y++)for(x=0;x<n;x++){
      var gx=(x+0.5)/n*fx,gy=(y+0.5)/n*fy,x0=Math.floor(gx),y0=Math.floor(gy),ax=gx-x0,ay=gy-y0,x1=(x0+1)%fx,y1=(y0+1)%fy;
      ax=ax*ax*(3-2*ax);
      ay=ay*ay*(3-2*ay);
      F[y*n+x]+=w*((V[y0*fx+x0]*(1-ax)+V[y0*fx+x1]*ax)*(1-ay)+(V[y1*fx+x0]*(1-ax)+V[y1*fx+x1]*ax)*ay);
    }
  }
  var plans=[[[5,5,0.5],[10,10,0.27],[20,20,0.15],[40,40,0.08]],
             [[5,5,0.5],[10,10,0.3],[20,20,0.2]],
             [[9,9,0.65],[18,18,0.35]],
             [[3,13,0.5],[6,26,0.3],[12,52,0.2]]];
  for(c=0;c<4;c++){
    var F=new Float32Array(n*n),lo=9,hi=-9;
    plans[c].forEach(function(p){layer(F,p[0],p[1],p[2]);});
    for(i=0;i<n*n;i++){
      lo=Math.min(lo,F[i]);
      hi=Math.max(hi,F[i]);
    }
    for(i=0;i<n*n;i++)px[i*4+c]=Math.round(255*(F[i]-lo)/(hi-lo));
  }
  var tex=new THREE.DataTexture(px,n,n,THREE.RGBAFormat);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.magFilter=tex.minFilter=THREE.LinearFilter;
  tex.needsUpdate=true;
  return tex;
})();

/* the three sky pictures, and the one-rectangle scene that draws into them */
var cloudSky=[0,1,2].map(function(){
  var rt=new THREE.WebGLRenderTarget(CLOUD_W,CLOUD_H,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false});
  rt.texture.wrapS=THREE.RepeatWrapping;
  rt.texture.generateMipmaps=false;
  rt.scissorTest=true;
  return rt;
});
glslFill('cloudfield',{I2R:glslFloat(CLOUD_EARTH),LANE:'vec2('+glslFloat(CLOUD_LANE[0])+','+glslFloat(CLOUD_LANE[1])+')',LANE2:'vec2('+glslFloat(CLOUD_LANE2[0])+','+glslFloat(CLOUD_LANE2[1])+')'});
glslFill('cloudshade.frag',{SPAN:glslFloat(CLOUD_SHADE_SPAN)});
var cloudBakeUniforms={uWeather:{value:1},uN3:{value:cloudNoise},uWx:{value:cloudWeather},uLight:{value:new THREE.Vector3(0,1,0)},
      uCT:{value:new THREE.Vector4()},uEvo:{value:new THREE.Vector4()},uCRes:{value:new THREE.Vector2(CLOUD_W,CLOUD_H)}},
    cloudScene=new THREE.Scene(),
    cloudCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),
    cloudQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:cloudBakeUniforms,depthTest:false,depthWrite:false,
      vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:glsl('cloudbake.frag')}));
cloudQuad.frustumCulled=false;
cloudScene.add(cloudQuad);
/* the map of the clouds' shadows (cloudshade.frag.glsl), drawn the same way, an eighth of it each frame */
var CLOUD_SHADE_N=256,
    cloudShade=new THREE.WebGLRenderTarget(CLOUD_SHADE_N,CLOUD_SHADE_N,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false}),
    cloudShadeUniforms={uWeather:{value:1},uN3:{value:cloudNoise},uWx:{value:cloudWeather},uLight:{value:new THREE.Vector3(0,1,0)},uStrength:{value:1},
      uCT:{value:new THREE.Vector4()},uEvo:{value:new THREE.Vector4()},uCRes:{value:new THREE.Vector2(CLOUD_SHADE_N,CLOUD_SHADE_N)}},
    cloudShadeScene=new THREE.Scene(),
    cloudShadeQuad=new THREE.Mesh(cloudQuad.geometry,new THREE.ShaderMaterial({uniforms:cloudShadeUniforms,depthTest:false,depthWrite:false,
      vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:glsl('cloudshade.frag')}));
cloudShade.texture.generateMipmaps=false;
cloudShade.scissorTest=true;
cloudShadeQuad.frustumCulled=false;
cloudShadeScene.add(cloudShadeQuad);
var MOON_DIR=new THREE.Vector3(-0.57,0.63,-0.52).normalize();   /* (the same as in sky.frag.glsl) */
/* which picture is which, how far the one being redrawn has got, and the moment each picture shows */
var cloudState={prev:0,next:1,work:2,slice:0,shadeSlice:0,thru:1,when:[0,0,0],shaded:false,began:0,period:1.2,swapped:0,first:true,drawing:false,warm:false,count:0,key:''};

/* draw `count` more slices of the picture being redrawn */
function cloudDraw(count){
  var rt=cloudSky[cloudState.work],sw=CLOUD_W/CLOUD_SLICES;
  for(var k=0;k<count&&cloudState.slice<CLOUD_SLICES;k++){
    rt.scissor.set(cloudState.slice*sw,0,sw,CLOUD_H);
    renderer.setRenderTarget(rt);
    renderer.render(cloudScene,cloudCam);
    cloudState.slice++;
  }
  renderer.setRenderTarget(null);
}
/* The weather: how cloudy it is, from 0 (a clear sky, not a cloud) through 0.45 (a few small clouds) to 1 (the full
   field of cumulus and towers). It moves through the list below - [how cloudy, for how many seconds] - over and over,
   easing from one to the next over about a minute: clouds thin and vanish or gather and grow rather than switching.
   The list is 12 minutes long against a ten-minute day, so each day's weather falls at different hours. */
var WEATHER=[[1,140],[0.45,110],[0,100],[0.45,90],[1,170],[0.45,110]],
    weather={i:0,left:WEATHER[0][1],now:1,fixed:null};
/* The wind: 0 none, 0.33 light, 0.66 moderate (the island's usual breeze), 1 high. It works through its own list -
   [how strong, for how many seconds], 10.7 minutes round - easing over about half a minute. It sets:
     how fast the clouds drift (cloudSpeed: not at all in a calm) and how fast they boil (cloudBoil);
     how ruffled the water's surface is, down to a mirror in a calm (water.frag.glsl; the swell is not the wind's doing
       and carries on regardless), and with it the net of light on the sea floor;
     how much the palms and grasses sway.
   uWind carries it to the shaders. */
var WIND=[[0.66,120],[0.33,90],[0,70],[0.33,80],[0.66,100],[1,100],[0.66,80]],
    wind={i:0,left:WIND[0][1],now:0.66,fixed:null},   /* fixed: a strength chosen in the menu, or null to follow the list */
    cloudNow={d:0,e:0};   /* the clouds' two clocks, in seconds at the usual breeze: how far they have drifted, how far they have boiled */
function cloudSpeed(w){return 3.25*Math.pow(w/0.66,1.3);}   /* 0 in a calm, 1.3 light, 3.25 moderate, 5.6 high (1 = 20 km/h) */
function cloudBoil(w){return 0.25+0.75*Math.pow(w/0.66,1.6);}   /* how fast clouds change shape: 0.25 calm, 0.5 light, 1 moderate, 1.7 high */
function updateWeather(dt){
  if(window.__freeze){
    weather.now=window.__weather===undefined?1:window.__weather;   /* (tests choose it) */
    wind.now=window.__wind===undefined?0.66:window.__wind;
    return;
  }
  wind.left-=dt;
  if(wind.left<=0){
    wind.i=(wind.i+1)%WIND.length;
    wind.left=WIND[wind.i][1];
  }
  /* (a choice made in the menu is reached in a few seconds, so that it can be looked at straight away) */
  var wr=wind.fixed!==null?dt/4:dt/60;
  wind.now+=Math.max(-wr,Math.min(wr,(wind.fixed!==null?wind.fixed:WIND[wind.i][0])-wind.now));
  cloudNow.d+=dt*cloudSpeed(wind.now);
  cloudNow.e+=dt*cloudBoil(wind.now);
  weather.left-=dt;
  if(weather.left<=0){
    weather.i=(weather.i+1)%WEATHER.length;
    weather.left=WEATHER[weather.i][1];
  }
  var cr=weather.fixed!==null?dt/8:dt/55;
  weather.now+=Math.max(-cr,Math.min(cr,(weather.fixed!==null?weather.fixed:WEATHER[weather.i][0])-weather.now));
}
/* where the cloud field has got to at moment T, for a shader's uniforms */
function cloudMoment(u,D,E){   /* D, E: the drift clock and the boil clock (cloudNow) at that moment */
  u.uWeather.value=weather.now;
  u.uCT.value.set(CLOUD_START[0]+CLOUD_WIND[0]*D,CLOUD_START[1]+CLOUD_WIND[1]*D,0,0);
  /* the shapes slide a little against the weather map, rise slowly, and their fine lumps rise faster: clouds that boil */
  u.uEvo.value.set(0.0018*E,-0.0011*E,(E*0.0012)%1,(E*0.0063)%1);
}

/* ---- the same cloud field in JavaScript (cloudfield.glsl, without the fine lumps): change both together ----
   Needed for one number a frame: how much sunlight reaches the camera (cloudSunThrough), which dims the sun lamp and the glare. */
function cloudLookup(px,n,stride,u,v,c){   /* a repeating picture read between its dots, as the graphics card does */
  u=u*n-0.5;
  v=v*n-0.5;
  var x0=Math.floor(u),y0=Math.floor(v),fx=u-x0,fy=v-y0,x1=((x0+1)%n+n)%n,y1=((y0+1)%n+n)%n;
  x0=(x0%n+n)%n;
  y0=(y0%n+n)%n;
  return (px[(y0*stride+x0)*4+c]*(1-fx)+px[(y0*stride+x1)*4+c]*fx)*(1-fy)+(px[(y1*stride+x0)*4+c]*(1-fx)+px[(y1*stride+x1)*4+c]*fx)*fy;
}
/* weather over (x,z) km at moment T: [how much cloud, how high its tops] */
function cloudWeatherAt(x,z,T){
  var px=cloudWeather.image.data,u=(x-CLOUD_START[0]-CLOUD_WIND[0]*cloudNow.d)/64,v=(z-CLOUD_START[1]-CLOUD_WIND[1]*cloudNow.d)/64;   /* (T is no longer used: the field as it is now) */
  var r=cloudLookup(px,256,256,u,v,0)/255,g=cloudLookup(px,256,256,u,v,1)/255,b=cloudLookup(px,256,256,u,v,2)/255,far=Math.hypot(x,z);
  var W=weather.now,lane=Math.max(smoothstep(0.90,0.975,(x*CLOUD_LANE[0]+z*CLOUD_LANE[1])/Math.max(far,0.001)),smoothstep(0.90,0.975,(x*CLOUD_LANE2[0]+z*CLOUD_LANE2[1])/Math.max(far,0.001)))*smoothstep(4,9,far);
  var tall=smoothstep(0.95-0.35*W,1.06-0.32*W,g)*(1-lane),k=smoothstep(0,0.3,tall);
  return [Math.max(smoothstep(0.78-0.42*W,1-0.18*W,r)*smoothstep(0,0.12,W)*0.52*(1-0.8*smoothstep(20,50,far))*(1-0.75*lane),tall*0.95),0.8+(0.6+1.5*b)*(1-k)+(3.4+3.0*b)*k];
}
/* the shape noise at a point of its repeating cube (0..1 each way) */
function cloudShapeAt(x,y,z){
  var px=cloudNoise.image.data;
  x-=Math.floor(x);
  y-=Math.floor(y);
  z=(z-Math.floor(z))*64;
  var z0=Math.floor(z)%64,z1=(z0+1)%64,fz=z-Math.floor(z),u=x*64-0.5,v=y*64-0.5,x0=Math.floor(u),y0=Math.floor(v),fx=u-x0,fy=v-y0;
  function slice(k){   /* (dots x0, x0+1 of slice k: its tile starts one dot in, and has the far side's dots copied round it) */
    var o=(Math.floor(k/8)*66+y0+1)*528+(k%8)*66+x0+1;
    return (px[o*4]*(1-fx)+px[o*4+4]*fx)*(1-fy)+(px[(o+528)*4]*(1-fx)+px[(o+528)*4+4]*fx)*fy;
  }
  return (slice(z0)*(1-fz)+slice(z1)*fz)/255;
}
/* how much cloud at (x,y,z) km at moment T (0..1) */
function cloudAmountAt(x,y,z,T){
  var h=y+(x*x+z*z)*CLOUD_EARTH,w=cloudWeatherAt(x,z,T),hn=(h-0.8)/(w[1]-0.8);
  if(hn<=0||hn>=1||w[0]<0.01)return 0;
  var a=0.2+0.3*smoothstep(2.5,4,w[1]),c=w[0]*smoothstep(0,0.07,hn)*(1-0.9*smoothstep(a,1,hn));
  var d=(cloudShapeAt((x-CLOUD_START[0]-CLOUD_WIND[0]*cloudNow.d+0.0018*cloudNow.e)/6,(z-CLOUD_START[1]-CLOUD_WIND[1]*cloudNow.d-0.0011*cloudNow.e)/6,h*0.7/6-(cloudNow.e*0.0012)%1)-(1-c))/Math.max(c,0.05);
  return Math.max(0,Math.min(1,d*2.5));
}
/* how much of the sun's light gets through the clouds to the spot (x,z) km: 1 = clear, 0 = a thick cloud in the way.
   Walks from the spot towards the sun, through the heights where cloud can be (as the sky's own walk does). */
function cloudSunThrough(x,z,sun,T){
  if(sun.y<-0.05)return 1;
  var a=(1-sun.y*sun.y)*CLOUD_EARTH,s0=2*0.8/(sun.y+Math.sqrt(sun.y*sun.y+4*a*0.8)),s1=Math.min(2*5/(sun.y+Math.sqrt(sun.y*sun.y+4*a*5)),70),k=Math.pow(s1/s0,1/24),s=s0,tau=0;
  for(var i=0;i<24;i++){
    var ds=s*(k-1),m=s+0.5*ds;
    tau+=cloudAmountAt(x+sun.x*m,sun.y*m,z+sun.z*m,T)*ds;
    s*=k;
  }
  return Math.exp(-tau*2.6);
}

/* set up a redraw showing the clouds as they are at moment T */
function cloudBegin(lead){   /* lead: how many seconds ahead of now the picture is for */
  var u=cloudBakeUniforms,S=cloudState;
  var D=cloudNow.d+lead*cloudSpeed(wind.now);
  cloudMoment(u,D,cloudNow.e+lead*cloudBoil(wind.now));
  u.uCT.value.w=(S.count++*7.31)%64;   /* (a different grain in each picture, so it averages away) */
  u.uLight.value.copy(sharedUniforms.uNight.value>0.5?MOON_DIR:sharedUniforms.uSunDir.value);
  S.when[S.work]=D;
  S.slice=0;
}
/* frame step: redraw a little more of the cloud picture, and tell the sky which pictures to blend and how far each has drifted */
function updateClouds(F){
  updateWeather(Math.min(F.rawDt,0.5));
  var S=cloudState,U=sharedUniforms,t=U.uTime.value,blend=1;
  if(window.__freeze){
    /* (test renders: the clock stands still, so one complete picture for that moment) */
    var sun=U.uSunDir.value,key=t+','+sun.x.toFixed(3)+','+sun.y.toFixed(3)+','+U.uNight.value.toFixed(2)+','+weather.now+','+wind.now;
    if(key!==S.key){
      S.key=key;
      cloudNow.d=t*cloudSpeed(wind.now);
      cloudNow.e=t;
      cloudBegin(0);
      cloudDraw(CLOUD_SLICES);
      S.next=S.work;
      S.prev=S.work;
      S.work=(S.work+1)%3;
      S.first=false;
    }
  }else{
    if(S.first){
      /* the very first picture: empty skies to fade in from, and draw fast */
      var col=new THREE.Color(),al=renderer.getClearAlpha();
      renderer.getClearColor(col);
      renderer.setClearColor(0,0);
      cloudSky.forEach(function(rt){
        rt.scissor.set(0,0,CLOUD_W,CLOUD_H);
        renderer.setRenderTarget(rt);
        renderer.clear();
      });
      renderer.setRenderTarget(null);
      renderer.setClearColor(col,al);
      S.first=false;
      S.warm=true;
      S.slice=CLOUD_SLICES;
      S.swapped=t-9;
    }
    blend=Math.min(1,(t-S.swapped)/S.period);
    if(S.slice>=CLOUD_SLICES&&blend>=1){
      /* the picture being redrawn is finished and the sky has finished sliding to the newest one: take turns */
      if(S.drawing){
        S.period=Math.max(0.4,Math.min(3,t-S.began));
        var old=S.prev;
        S.prev=S.next;
        S.next=S.work;
        S.work=old;
        S.swapped=t;
        blend=0;
        S.warm=false;
      }
      S.drawing=true;
      S.began=t;
      cloudBegin(2*S.period);   /* (it will be on show from one period to three periods from now) */
    }
    /* (in a high wind the clouds travel far between redraws, so the sky is redrawn two or three times as often) */
    cloudDraw(S.warm?8:(cloudSpeed(wind.now)>4.6?3:(cloudSpeed(wind.now)>3.6?2:1)));
  }
  /* the shadow map: an eighth more of it (all of it, for a test render), for the clouds as they are now. Shadows fade
     out as the sun gets low: they would be many kilometres long, and from clouds this map does not reach. */
  var su=cloudShadeUniforms,sw=CLOUD_SHADE_N/8,whole=window.__freeze||S.shadeSlice===0&&!S.shaded;
  cloudMoment(su,cloudNow.d,cloudNow.e);
  su.uLight.value.copy(U.uSunDir.value);
  su.uStrength.value=smoothstep(0.04,0.16,U.uSunDir.value.y);
  for(var k=0;k<(whole?8:1);k++){
    cloudShade.scissor.set(S.shadeSlice*sw,0,sw,CLOUD_SHADE_N);
    renderer.setRenderTarget(cloudShade);
    renderer.render(cloudShadeScene,cloudCam);
    S.shadeSlice=(S.shadeSlice+1)%8;
  }
  renderer.setRenderTarget(null);
  S.shaded=true;
  /* how much sun reaches the camera (eased, so a cloud's edge does not flicker the light) */
  var thru=cloudSunThrough(camera.position.x/1000,camera.position.z/1000,U.uSunDir.value,t);
  S.thru=window.__freeze?thru:S.thru+(thru-S.thru)*Math.min(1,F.dt*3);
  F.sunThru=S.thru;
  U.uSunThru.value=S.thru;
  U.uCloudShade.value=cloudShade.texture;
  U.uCloudA.value=cloudSky[S.prev].texture;
  U.uCloudB.value=cloudSky[S.next].texture;
  U.uCloudMix.value=blend;
  U.uWind.value=wind.now;
  U.uCloudShift.value.set(CLOUD_WIND[0]*(cloudNow.d-S.when[S.prev]),CLOUD_WIND[1]*(cloudNow.d-S.when[S.prev]),CLOUD_WIND[0]*(cloudNow.d-S.when[S.next]),CLOUD_WIND[1]*(cloudNow.d-S.when[S.next]));
}
