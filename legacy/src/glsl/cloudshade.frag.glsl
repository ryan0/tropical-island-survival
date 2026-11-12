// The clouds' shadows on the sea and the island: a map, seen from above, of how much sunlight gets down through the
// clouds (red: 1 = full sun). {{SPAN}} km a side, the island in the middle.
uniform vec3 uLight;uniform vec2 uCRes;uniform float uStrength;

#include "noise"
#include "cloudfield"

void main(){
  vec2 g=(gl_FragCoord.xy/uCRes-.5)*{{SPAN}};
  // from the spot on the ground towards the sun, from the height of the cloud bases to 4.2 km, in 14 steps
  float ly=max(uLight.y,.06),ds=(4.2-HB)/ly/14.,tau=0.;
  vec3 o=vec3(g.x,0.,g.y)+uLight*(HB/ly);
  for(int i=0;i<14;i++){vec3 p=o+uLight*(ds*(float(i)+.5));tau+=cloud(p,weather(p),0.).x*ds;}
  gl_FragColor=vec4(mix(1.,exp(-tau*2.6),uStrength),0.,0.,1.);
}
