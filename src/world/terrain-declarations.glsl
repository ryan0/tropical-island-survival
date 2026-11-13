// declarations the terrain colouring needs; put in front of three.js's Lambert fragment shader by terrain.ts
uniform float uTime,uLevel,uDay,uGritMean,uWind;uniform vec3 uCam,uSunDir;uniform vec3 uHor;uniform sampler2D uDet,uCloudShade,uReef;varying vec3 vWp;

#include "footpaths"

#include "island-shape/shore"

#include "../shaders/shared/lagwave"

// Bits of leaf litter and twig lying on sand: at most one short dark fleck in each square of p, at its own angle.
float fleck(vec2 p){
  vec2 ci=floor(p),d=fract(p)-(vec2(hash(ci+13.),hash(ci+29.))*.6+.2);
  float a=hash(ci+41.)*6.283;
  d=vec2(d.x*cos(a)+d.y*sin(a),(-d.x*sin(a)+d.y*cos(a))*(2.5+3.*hash(ci+53.)));
  return smoothstep(.22,.12,length(d))*step(.45,hash(ci+61.));
}
// One layer of coral rubble: at most one stone in each square of p - anywhere in it, any size from a chip to a
// fist, oval or angular, at any angle - and many squares empty (dens = the share that hold one).
// Returns (how much of this spot the stone covers, how brightly it is lit from L, its own tone 0..1).
vec3 pebble(vec2 p,vec2 L,float dens){
  vec2 ci=floor(p),c=vec2(hash(ci+3.),hash(ci+8.))*.5+.25,d=fract(p)-c;
  float rad=.07+.18*hash(ci+15.)*hash(ci+27.);
  float a=hash(ci+33.)*3.1416,ca=cos(a),sa=sin(a);
  vec2 e=vec2(d.x*ca+d.y*sa,(-d.x*sa+d.y*ca)*(1.+.9*hash(ci+39.)));
  float r=mix(length(e),(abs(e.x)+abs(e.y))*.8,.75*hash(ci+45.))/rad;   /* between a round pebble and a broken chunk */
  return vec3(smoothstep(1.,.78,r)*step(1.-dens,hash(ci+21.)),.82+.42*dot(d,L)/rad+.12*(1.-r),hash(ci+51.));
}
// One layer of dimples in loose sand (footprints, hollows the wind has rounded off): at most one round hollow in each
// square of p, anywhere in it. Returns how much lighter (+) or darker (-) the spot is when lit from direction L:
// inside a hollow the wall nearer the sun is in shade and the far wall catches the light.
float dimples(vec2 p,vec2 L){
  vec2 ci=floor(p),c=vec2(hash(ci+3.),hash(ci+11.))*.44+.28;
  float rad=.20+.20*hash(ci+7.);
  vec2 d=(fract(p)-c)/rad;
  /* each hollow is an oval at its own angle (a footprint, not a hailstone dent) and its own depth */
  float a=hash(ci+23.)*3.1416,ca=cos(a),sa=sin(a);
  vec2 e=vec2(d.x*ca+d.y*sa,(-d.x*sa+d.y*ca)*(1.+.9*hash(ci+37.)));
  float w=max(1.-dot(e,e),0.);
  return -dot(d,L)*w*sqrt(w)*step(.3,hash(ci+19.))*(.35+.65*hash(ci+43.));
}
