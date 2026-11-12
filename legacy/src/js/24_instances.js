/* Instanced things (plants, rocks) in map squares, with two levels of detail.

   three.js draws an instanced mesh in full, on screen or not, in the picture AND in the shadow pass.
   splitInstances(mesh, pad, maxDist, lod) regroups a finished, static instanced mesh into one mesh per map square
   and adds those to the scene instead:
     - a square out of view (or outside the shadow box round the player) is skipped;
     - each square sits at its own middle, so three.js can draw the near ones first and skip pixels hidden behind them;
     - maxDist (optional): a square further than this from the camera is not drawn at all - for small things like
       grass that cannot be made out from far away;
     - lod (optional) {geo, dist, cell}: beyond `dist` metres the square is drawn with the simpler shape `geo`
       (fewer, larger leaves: the same plant to the eye at that range). `cell` is the square's size in metres
       (64 if not given; 32 for the kinds with two levels, so that only what is really close gets the full shape).
   pad = how far one instance can reach from its own origin (metres). */
var instanceCells=[];
/* For looking at one kind of plant on its own (tools/plants.js): while plantKind is set, e.g. {g:'palm',s:'palm tall'},
   splitInstances notes the meshes it makes under group g and a few of the places under sample name s. */
var plantKind=null,PLANT_REG={};
function plantSample(g,s,x,y,z,size){
  var R=PLANT_REG[g]=PLANT_REG[g]||{meshes:[],samples:{}};
  (R.samples[s]=R.samples[s]||[]).push([x,y,z,size]);
}
function splitInstances(im,pad,maxDist,lod){
  var i,k;
  if(plantKind&&plantKind.s){
    for(i=0;i<im.count;i+=Math.max(1,Math.floor(im.count/40))){
      var pm=im.instanceMatrix.array,po=i*16;
      plantSample(plantKind.g,plantKind.s,pm[po+12],pm[po+13],pm[po+14],Math.hypot(pm[po],pm[po+1],pm[po+2]));
    }
  }
  var CELL=(lod&&lod.cell)||64,n=im.count,M=im.instanceMatrix.array,C=im.instanceColor?im.instanceColor.array:null,cells={};
  for(i=0;i<n;i++){
    k=Math.floor(M[i*16+12]/CELL)+','+Math.floor(M[i*16+14]/CELL);
    (cells[k]=cells[k]||[]).push(i);
  }
  /* one mesh of a square: shares the vertex buffers of `geo` and (for the simpler level) the instance buffers of `like` */
  function cellMesh(geo,count,centre,radius,like){
    var g=new THREE.BufferGeometry();
    g.attributes=geo.attributes;
    g.index=geo.index;
    g.groups=geo.groups;
    g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),radius);
    var m=new THREE.InstancedMesh(g,im.material,count);
    if(like){
      m.instanceMatrix=like.instanceMatrix;
      m.instanceColor=like.instanceColor;
    }else if(C)m.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(count*3),3);
    m.position.copy(centre);
    m.updateMatrix();
    m.matrixAutoUpdate=false;
    m.frustumCulled=true;                      /* (three.js switches culling off for instanced meshes by default) */
    m.castShadow=im.castShadow;
    m.receiveShadow=im.receiveShadow;
    m.renderOrder=im.renderOrder;
    if(im.customDepthMaterial)m.customDepthMaterial=im.customDepthMaterial;
    scene.add(m);
    if(plantKind)(PLANT_REG[plantKind.g]=PLANT_REG[plantKind.g]||{meshes:[],samples:{}}).meshes.push(m);
    return m;
  }
  Object.keys(cells).forEach(function(key){
    var L=cells[key],j,o,c=new THREE.Vector3(),r=0;
    for(j=0;j<L.length;j++){
      o=L[j]*16;
      c.x+=M[o+12];
      c.y+=M[o+13];
      c.z+=M[o+14];
    }
    c.multiplyScalar(1/L.length);
    for(j=0;j<L.length;j++){
      o=L[j]*16;
      r=Math.max(r,Math.hypot(M[o+12]-c.x,M[o+13]-c.y,M[o+14]-c.z));
    }
    var hi=cellMesh(im.geometry,L.length,c,r+pad,null),A=hi.instanceMatrix.array;
    for(j=0;j<L.length;j++){
      o=L[j]*16;
      A.set(M.subarray(o,o+16),j*16);
      A[j*16+12]-=c.x;                         /* instances are placed relative to the square's middle */
      A[j*16+13]-=c.y;
      A[j*16+14]-=c.z;
      if(C)hi.instanceColor.array.set(C.subarray(L[j]*3,L[j]*3+3),j*3);
    }
    var lo=lod?cellMesh(lod.geo,L.length,c,r+pad,hi):null;
    if(lo)lo.visible=false;
    if(lo||maxDist)instanceCells.push({hi:hi,lo:lo,c:c,r:r,lodDist:lod?lod.dist:0,maxDist:maxDist||0});
  });
}
/* frame step: for every square, pick the full shape, the simpler shape or nothing by its distance from the camera.
   (mesh.userData.off: switched off by a test tool) */
function updateInstanceCells(F){
  var cp=camera.position;
  for(var i=0;i<instanceCells.length;i++){
    var k=instanceCells[i],d=Math.hypot(cp.x-k.c.x,cp.y-k.c.y,cp.z-k.c.z)-k.r,
        shown=!k.hi.userData.off&&(!k.maxDist||d<k.maxDist),near=!k.lo||(window.__lod?window.__lod===1:d<k.lodDist);   /* __lod: test hook, 1 = always full, 2 = always simple */
    k.hi.visible=shown&&near;
    if(k.lo)k.lo.visible=shown&&!near;
  }
}
