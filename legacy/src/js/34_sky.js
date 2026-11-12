/* Sky dome, time of day, and the uniforms every shader shares. */

/* One set of uniforms shared by every custom shader (sky, water, terrain, plants, flame):
     uTime seconds, uSunDir/uSunCol, uTop/uHor sky colours, uDay/uNight 0..1, uLevel sea level,
     uUnder 1 when the camera is under water, uFogC underwater fog colour, uObs the 16 biggest obstacles (x,z,radius),
     uDet the detail texture (22_detail.js), uCloudA/uCloudB the two sky pictures of the clouds being blended, uCloudMix how far from A to B, uCloudShift how far each has drifted, uCloudShade the map of their shadows, uSunThru how much sun reaches the camera through them (23_clouds.js), uCloudSun/uCloudShd the colours of sunlit and shaded cloud, uReef how high the coral heads stand (47_reef.js), uWind the wind's strength 0..1 (23_clouds.js), uCam the camera's position (for materials three.js does not give it to),
     uDbg debug switch (0 normal, 1 waves off, 2 no falling lip, 3 plain water colour). */
var sharedUniforms={uTime:{value:0},uSunDir:{value:new THREE.Vector3(0,1,0)},uSunCol:{value:new THREE.Color()},
  uTop:{value:new THREE.Color()},uHor:{value:new THREE.Color()},uNight:{value:0},uDay:{value:1},uLevel:{value:0},uUnder:{value:0},uBandOn:{value:0},uDbg:{value:0},uFogC:{value:new THREE.Color()},uDet:{value:detailTex},uCloudA:{value:null},uCloudB:{value:null},uCloudMix:{value:0},uCloudShift:{value:new THREE.Vector4()},uCloudShade:{value:null},uReef:{value:null},uWind:{value:0.66},uSunThru:{value:1},uCloudSun:{value:new THREE.Color()},uCloudShd:{value:new THREE.Color()},uCam:{value:new THREE.Vector3()},uObs:{value:(function(){
  var a=[];
  for(var i=0;i<16;i++)a.push(new THREE.Vector3(0,0,-1));
  return a;
})()}};
glslFill('sky.frag',{I2R:glslFloat(CLOUD_EARTH),REF:glslFloat(CLOUD_REF),HALF:'vec2('+glslFloat(0.5/CLOUD_W)+','+glslFloat(0.5/CLOUD_H)+')'});
var sky=new THREE.Mesh(new THREE.SphereGeometry(3000,32,20),new THREE.ShaderMaterial({
  uniforms:sharedUniforms,side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:glsl('sky.vert'),
  fragmentShader:glsl('sky.frag')}));
sky.frustumCulled=false;
sky.renderOrder=10;   /* after the other solid things: sky hidden behind land is rejected by the depth test before its shader runs */
scene.add(sky);
/* The day. It lasts DAY_LENGTH seconds from one midnight to the next; dayPhase says where in it we are:
   0 midnight, 0.25 morning, 0.5 noon, 0.75 afternoon. The sun's height follows from the phase (sunHeightAt): up for
   about 6.4 minutes of the ten, with dusk, night and dawn sharing the rest. It rises in the east-north-east and sets
   in the west-north-west. The button in the corner names the time; it opens the menu (75_menu.js), where a time can be chosen and held. */
var DAY_LENGTH=600,
    dayPhase=0.40,          /* (the island starts in mid-morning) */
    dayTarget=null,         /* a phase the menu has asked for, while the day is hurrying on to it */
    dayHold=false,          /* the menu has stopped the clock at a chosen time */
    sunFixed=null,          /* tests: a sun height that overrides the day (set by __lag.sun) */
    todBtn=document.getElementById('tod'),
    TIMES_OF_DAY=[['dawn',0.19],['day',0.5],['golden',0.754],['sunset',0.825],['night',0.0]];
function sunHeightAt(phase){
  return 0.28+0.44*Math.cos(6.2831853*(phase-0.5));
}
function cycleTimeOfDay(){
  var best=TIMES_OF_DAY[0],gap=9;
  TIMES_OF_DAY.forEach(function(T){
    var ahead=((T[1]-dayPhase)%1+1)%1;
    if(ahead>0.02&&ahead<gap){
      gap=ahead;
      best=T;
    }
  });
  dayTarget=best[1];
}
var glareEl=document.getElementById('glare'),glareV=new THREE.Vector3(),glareF=new THREE.Vector3();

/* frame step: sun position and sky colours for the current time of day -> shared uniforms, fog colour.
   Sets F.day (0..1 daylight), F.night (0..1), F.vis (=1-night), F.sunEl (sun elevation, radians), F.sunCol ([r,g,b]). */
function updateSky(F){
  var t=F.t,dt=F.dt,level=WATER_LEVEL;
  if(dayTarget!==null){
    /* (hurrying on to the time the button asked for: fast at first, easing in) */
    var ahead=((dayTarget-dayPhase)%1+1)%1,step=Math.min(ahead,dt*Math.max(0.03,ahead*1.5));
    dayPhase=(dayPhase+step)%1;
    if(ahead-step<0.001)dayTarget=null;
  }else if(!window.__freeze&&!dayHold)dayPhase=(dayPhase+Math.min(F.rawDt,0.5)/DAY_LENGTH)%1;   /* (by the real clock, so a slow phone still gets a ten-minute day) */
  var e=sunFixed!==null?sunFixed:sunHeightAt(dayPhase),morning=sunFixed===null&&dayPhase<0.5;
  var d=smoothstep(0,0.5,e),ng=1-smoothstep(-0.14,0.04,e),vis=1-ng;
  todBtn.textContent=e<0?'night':(e<0.14?(morning?'dawn':'sunset'):(e<0.42?(morning?'morning':'golden'):'day'));
  var top=mix3(mix3([.17,.19,.45],[.07,.36,.84],Math.pow(d,0.55)),[.01,.015,.06],ng);   /* overhead it stays blue until late */
  var hor=mix3(mix3([1,.60,.34],[.70,.88,.97],d),[.07,.09,.22],ng);
  var sc=mix3([1,.46,.14],[1,.96,.82],Math.pow(d,1.6));   /* stays golden well up the sky */
  /* the sun comes up on one side of its noon bearing and goes down on the other (out over the sea from the home beach) */
  var el=-0.09+e*1.0,az=0.35+(morning?1.25:-1.25)*(1-d);
  sharedUniforms.uSunDir.value.set(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).normalize();
  sharedUniforms.uSunCol.value.setRGB(sc[0],sc[1],sc[2]);
  sharedUniforms.uTop.value.setRGB(top[0],top[1],top[2]);
  sharedUniforms.uHor.value.setRGB(hor[0],hor[1],hor[2]);
  /* what the sun does to cloud: white light by day, gold as it sinks, orange-pink at sunset (clouds stand high and still
     catch it when the ground has lost it), the moon by night; and the shade the sky fills in: blue-grey by day, slate at dusk */
  var cs=mix3(mix3([1,.60,.41],[1,.83,.60],smoothstep(0,0.5,d)),[1,.99,.97],smoothstep(0.45,1,d)),
      csh=mix3(mix3([.33,.34,.44],[.68,.74,.86],d),[.10,.12,.19],ng);
  sharedUniforms.uCloudSun.value.setRGB(cs[0]*vis+0.15*ng,cs[1]*vis+0.19*ng,cs[2]*vis+0.30*ng);
  sharedUniforms.uCloudShd.value.setRGB(csh[0],csh[1],csh[2]);
  sharedUniforms.uNight.value=ng;
  sharedUniforms.uDay.value=d;
  if(!window.__freeze)sharedUniforms.uTime.value=t;
  sharedUniforms.uLevel.value=level;
  scene.fog.color.setRGB(hor[0],hor[1],hor[2]);
  sky.position.copy(camera.position);
  sharedUniforms.uCam.value.copy(camera.position);
  F.day=d;
  F.night=ng;
  F.vis=vis;
  F.sunEl=el;
  F.sunCol=sc;
}

/* frame step: the soft sun glare overlay (a DOM element positioned over the sun) */
function updateGlare(F){
  var vis=F.vis*(0.15+0.85*F.sunThru),el=F.sunEl,under=F.under;   /* (less glare with a cloud across the sun) */
  glareV.copy(sharedUniforms.uSunDir.value).multiplyScalar(1000).add(camera.position).project(camera);
  camera.getWorldDirection(glareF);
  var face=glareF.dot(sharedUniforms.uSunDir.value),go=0;
  if(face>0&&Math.abs(glareV.x)<1.4&&Math.abs(glareV.y)<1.4){
    go=Math.pow(face,8)*vis*Math.max(0,Math.min(1,el*8+0.6))*0.85;
    glareEl.style.transform='translate3d('+((glareV.x*0.5+0.5)*VW).toFixed(1)+'px,'+((-glareV.y*0.5+0.5)*VH).toFixed(1)+'px,0)';
  }
  if(under)go=0;
  glareEl.style.opacity=go.toFixed(3);
}
