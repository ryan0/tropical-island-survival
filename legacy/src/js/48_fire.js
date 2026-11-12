/* The campfire: flame, embers and its flickering light. */

var FIRE_X=5,FIRE_Z=shoreZ(5,1.0)-5,FIRE_Y=hgt(FIRE_X,FIRE_Z);
var flame=new THREE.Group();
flame.position.set(FIRE_X,FIRE_Y+0.06,FIRE_Z);
scene.add(flame);
var flameMat=new THREE.ShaderMaterial({uniforms:sharedUniforms,transparent:true,depthWrite:false,fog:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  vertexShader:glsl('flame.vert'),
  fragmentShader:glsl('flame.frag')});
(function(){
  var fg2=new THREE.PlaneGeometry(1.15,1.7);
  fg2.translate(0,0.85,0);
  for(var i=0;i<3;i++){
    var fm2=new THREE.Mesh(fg2,flameMat);
    fm2.rotation.y=i*Math.PI/3;
    flame.add(fm2);
  }
  var coal=new THREE.Mesh(new THREE.CircleGeometry(0.36,14),new THREE.MeshBasicMaterial({color:0xff5a12,fog:false}));
  coal.rotation.x=-Math.PI/2;
  coal.position.set(FIRE_X,FIRE_Y+0.09,FIRE_Z);
  scene.add(coal);
})();
var EMB=40,embPos=new Float32Array(EMB*3),embGeo=new THREE.BufferGeometry();
embGeo.setAttribute('position',new THREE.BufferAttribute(embPos,3));
var embers=new THREE.Points(embGeo,new THREE.PointsMaterial({color:0xffa040,size:0.055,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
embers.frustumCulled=false;
scene.add(embers);
var fireLight=new THREE.PointLight(0xff8a35,0,34,2);
fireLight.position.set(FIRE_X,FIRE_Y+1.1,FIRE_Z);
scene.add(fireLight);
(function(){
  var lg=new THREE.CylinderGeometry(0.09,0.09,1.1,5),lm=new THREE.MeshLambertMaterial({color:0x3a2a1c});
  for(var i=0;i<4;i++){
    var l=new THREE.Mesh(lg,lm);
    l.position.set(FIRE_X,FIRE_Y+0.12,FIRE_Z);
    l.rotation.set(Math.PI/2,0,i*0.8);
    if(CAMP)scene.add(l);
  }
})();

/* frame step: flame flicker, fire light (brighter at night) and rising embers */
function updateFire(F){
  if(!CAMP)return;
  var t=F.t,d=F.day;
  var fl=0.85+0.15*Math.sin(t*13)+0.1*Math.sin(t*7.3);
  fireLight.intensity=(0.25+1.9*(1-d))*fl;
  flame.scale.set(fl,0.8+0.4*fl,fl);
  flame.rotation.y=t*0.35;
  for(var ei=0;ei<EMB;ei++){
    var eph=(t*0.42+ei*0.137)%1,ew=0.10+eph*0.5;
    embPos[ei*3]=FIRE_X+Math.sin(ei*12.9+t*1.3)*ew;
    embPos[ei*3+1]=FIRE_Y+0.3+eph*3.0;
    embPos[ei*3+2]=FIRE_Z+Math.cos(ei*7.7+t*1.1)*ew;
  }
  embGeo.attributes.position.needsUpdate=true;
}
/* (no camp, no fire: see CAMP in 00_config.js) */
if(!CAMP){
  flame.visible=false;
  embers.visible=false;
  fireLight.visible=false;
}
