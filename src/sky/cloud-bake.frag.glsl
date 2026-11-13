// One picture of all the clouds in the sky (see clouds.ts). Each dot is a direction: across = bearing, up = elevation
// (finer near the horizon). The shader walks out along that direction through the cloud field. Distances in km.
uniform vec3 uLight;uniform vec2 uCRes;

#include "../shaders/shared/noise"
#include "cloud-field"

void main(){
  vec2 uv=gl_FragCoord.xy/uCRes;
  float az=(uv.x-.5)*6.28318,el=1.5708*(.5*uv.y+.5*uv.y*uv.y);
  vec3 d=vec3(cos(az)*cos(el),sin(el),sin(az)*cos(el));
  // where the line of sight enters the cloud layer and where it leaves it (or gives up, 105 km out)
  float a=(1.-d.y*d.y)*I2R;
  float s0=2.*HB/(d.y+sqrt(d.y*d.y+4.*a*HB)),s1=min(2.*HT/(d.y+sqrt(d.y*d.y+4.*a*HT)),105.);
  // 64 steps, each a fixed fraction longer than the last (far cloud is small on the screen and needs no finer);
  // where the weather map says cloud may be, each is walked in six. The walk starts at a different point of the
  // first step on every dot so that the steps do not show as bands.
  float k=pow(s1/s0,1./64.),jit=hash(gl_FragCoord.xy+uCT.w);
  float s=s0*pow(k,hash(gl_FragCoord.yx*1.3+uCT.w)-1.);
  // cloud scatters light mostly onward: brighter looking towards the sun through thin cloud
  float ph=1.+1.3*pow(max(dot(d,uLight),0.),5.);
  vec3 acc=vec3(0.);float T=1.;
  for(int i=0;i<64;i++){
    float ds=s*(k-1.);
    vec3 pm=d*(s+.5*ds);
    vec2 w=weather(pm);
    if(w.x>.01&&d.y*s+s*s*a<w.y){
      for(int j=0;j<6;j++){
        vec3 p=d*(s+ds*(float(j)+jit)/6.);
        vec2 c=cloud(p,weather(p),1.);   // (the weather read afresh at every point: one reading a step shows as rings)
        if(c.x>.003){
          // how much cloud lies between here and the sun: six steps towards it, each longer than the last
          float tau=0.,ls=.07*(.55+.9*hash(gl_FragCoord.xy*1.7+float(j)*13.1+uCT.w));vec3 lp=p;   // (of a length that varies from dot to dot, or the steps show as rings)
          for(int l=0;l<6;l++){lp+=uLight*ls;tau+=cloud(lp,weather(lp),0.).x*ls;ls*=1.8;}
          float od=tau*SIGL;
          // (the second term: light that has bounced about inside the cloud gets much deeper than a straight beam)
          float sun=max(exp(-od),.68*exp(-od*.22))*ph;
          float amb=.5+.5*c.y;
          float al=1.-exp(-SIG*c.x*ds/6.);
          float f=1.-exp(-s/70.);
          acc+=T*al*vec3((1.-f)*sun/2.3,(1.-f)*amb,f);
          T*=1.-al;
        }
      }
      if(T<.012)break;
    }
    s*=k;
  }
  // cirrus, 9 km up: one thin sheet of streaks (drifting faster, as high cloud does)
  if(T>.012){
    float sc=2.*9./(d.y+sqrt(d.y*d.y+4.*a*9.));
    vec2 q=(d*sc).xz-uCT.xy*7.5;
    float ci=texture2D(uWx,q/110.).a*.62+texture2D(uWx,q/31.+.37).a*.38;
    float f=1.-exp(-sc/70.);
    float al=smoothstep(.55,.85,ci)*.42*smoothstep(.05,.6,uWeather);
    acc+=T*al*vec3((1.-f)*ph*.8/2.3,1.-f,f);
    T*=1.-al;
  }
  gl_FragColor=vec4(acc,1.-T);
}
