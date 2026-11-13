// campfire flame: scrolling noise shaped into tongues
uniform float uTime;varying vec2 vUv;

#include "../../shaders/shared/noise"

void main(){float y=vUv.y,x=(vUv.x-.5)*2.;
  float n=fbm(vec2(x*1.8,y*2.4-uTime*2.2));float n2=noise(vec2(x*4.+3.,y*5.-uTime*3.6));
  x+=(n-.5)*.6*y;
  float n3=noise(vec2(x*7.-1.,y*4.5-uTime*4.6));float shape=(1.-y)*(.66+.7*n)-abs(x)*(1.45+1.2*y)-.10+(n2-.5)*.45*y+(n3-.5)*.4*(y+.15);
  float f=smoothstep(0.,.26,shape)*smoothstep(0.,.07,y);
  float core=smoothstep(.34,.80,shape);
  vec3 col=mix(vec3(.85,.12,.02),vec3(1.,.55,.10),smoothstep(.1,.9,f));col=mix(col,vec3(1.,.93,.70),core);
  gl_FragColor=vec4(col*f*1.2,f);}
