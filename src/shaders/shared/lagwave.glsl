// Small wind waves coming ashore on the lagoon's beaches. water.frag.glsl draws them on the water, terrain-colour.glsl
// draws what they do on the sand, and in a high wind lagband.vert.glsl gives them real height; all three must agree,
// so all three use this. (Needs "noise" and uWind. Vertex-shader rules apply: docs/DEVICE_NOTES.md.)
//   light air: none (the lagoon's edge only laps)   medium wind: small ones, flat, drawn by shading and foam alone
//   high wind: 2.3 times the size, with real height, coming in sets, running further up the sand
const vec2 WIND_DIR=LAGOON_WIND_DIRECTION;     // the way the wind blows (level, unit length): a define
const float LW_T=2.1;                // seconds between waves
// 0 up to a medium wind, 1 in a high one
float lagHi(){return smoothstep(.7,1.,uWind);}
// How open the lagoon shore near p is to the wind's waves: 1 where the wind blows onto the beach, .2 in the lee.
// Round the sandbank in the middle, where "outwards" says nothing about which way a beach faces, middling.
float lagEx(vec2 p){
  float r=length(p);
  return mix(.6,clamp(.55+.6*dot(WIND_DIR,p/max(r,1.)),.2,1.),smoothstep(40.,80.,r));
}
// How strong the waves are on the shore near p: 0 in light airs, lagEx in a medium wind, 2.3 times that in a high one.
float lagExposure(vec2 p){return lagEx(p)*(smoothstep(.4,.66,uWind)+1.3*lagHi());}
// p = the place, d = the depth of still water there (0 or less on the sand above the water's edge).
// Returns x = seconds since a crest last passed here (on the sand: since it reached the water's edge),
//         y = how big that wave was along this stretch of shore (0..1, up to 1.5 in a high wind: they come in
//             stretches a few metres long, and in a high wind in sets - some half as big again, some half the size),
//         z = the same for the wave that comes next.
// The crests follow the depth: a wave slows as the water shallows (tau = the seconds it still needs to reach the edge,
// on a beach that falls 1 in 7, as the lagoon's do just under water), so the lines close up towards the shore. They
// do not arrive all at once along a beach: they come in at a slant, from the wind's side, and unevenly.
vec3 lagWave(vec2 p,float d,float t){
  float tau=4.56*(sqrt(clamp(d,0.,.69)+.04)-.2)+max(d-.69,0.)*2.75;   // (a broken wave does not stall at the edge: it arrives at walking pace)
  float ph=(t+tau)/LW_T-dot(p,WIND_DIR)*.06+1.3*noise(p*.045)+.15*(noise(p*1.9)-.5),n=floor(ph);   // (the last term: a crest is never a ruled line)
  vec2 nn=vec2(n,n+1.),g=mix(vec2(1.),.95+.3*sin(nn*1.93)+.25*sin(nn*.71+2.),lagHi());
  return vec3((ph-n)*LW_T,smoothstep(.34,.62,noise(p*.16+n*vec2(5.3,2.1)))*g.x,smoothstep(.34,.62,noise(p*.16+(n+1.)*vec2(5.3,2.1)))*g.y);
}
// The foam a broken wave of size sz leaves, u seconds after its crest passed: white at once, lace within a second
// (a bigger wave's lasts a little longer).
float lagFoam(float u,float sz){return smoothstep(.06,.28,sz)*max(1.-smoothstep(0.,.3,u),.8*exp(-u/(.7+.25*min(sz,2.))));}
