// sky dome: gradient, sun, moon, stars, milky way, shooting stars, clouds
uniform float uTime,uNight,uDay,uUnder;uniform vec3 uSunDir,uSunCol,uTop,uHor,uFogC;uniform sampler2D uCloudA,uCloudB;uniform vec4 uCloudShift;uniform float uCloudMix;uniform vec3 uCloudSun,uCloudShd;varying vec3 vDir;

#include "noise"

// what a sky picture shows in direction d, the picture having been made `shift` km of wind drift ago: find the spot at
// the clouds' usual height that d looks at, step back upwind, and look up the direction of that spot
vec4 cloudAt(sampler2D tex,vec3 d,vec2 shift){
  float dy=max(d.y,0.),a=(1.-dy*dy)*{{I2R}};
  vec3 p=d*(2.*{{REF}}/(dy+sqrt(dy*dy+4.*a*{{REF}})));
  p.xz-=shift;p.y={{REF}}-dot(p.xz,p.xz)*{{I2R}};
  vec3 dd=normalize(p);
  // (read twice, half a dot apart each way, and averaged: that smooths away the grain the picture's stepping leaves)
  vec2 uv=vec2(atan(dd.z,dd.x)/6.28318+.5,-.5+sqrt(.25+2.*asin(clamp(dd.y,0.,1.))/1.5708));
  return .5*(texture2D(tex,uv+{{HALF}})+texture2D(tex,uv-{{HALF}}));
}
void main(){vec3 d=normalize(vDir);float sy=clamp(d.y,0.,1.);
  vec3 sky=mix(uHor,uTop*(1.-.22*sy),pow(sy,.5));float vis=1.-uNight;
  // which way round the horizon this is, relative to the sun
  vec2 dnh=normalize(d.xz+1e-5);float toSun=dot(dnh,normalize(uSunDir.xz+1e-5));
  // by day the air near the horizon is paler and warmer towards the sun
  sky+=vec3(.10,.08,.05)*uDay*smoothstep(-.2,1.,toSun)*exp(-sy*5.);
  // towards evening: fire low down on the sun's side, a mauve band (the earth's shadow rising) on the other,
  // and a wash of pink above both
  float eve=smoothstep(.40,1.,1.-uDay)*vis;
  // golden hour, before that: the whole sky warms, most of all low down and towards the sun
  float gold=smoothstep(.15,.5,1.-uDay)*(1.-eve)*vis;
  sky=mix(sky,vec3(1.,.80,.52),gold*(.25+.35*smoothstep(-.4,1.,toSun))*exp(-sy*3.2));
  sky+=vec3(.95,.34,.10)*eve*smoothstep(-.3,1.,toSun)*exp(-sy*6.)*.55;
  sky=mix(sky,vec3(.56,.40,.62),eve*smoothstep(.3,-.9,toSun)*exp(-sy*5.)*.65);
  sky=mix(sky,vec3(.98,.60,.55),eve*exp(-pow((sy-.16)/.12,2.))*.28);
  float ang=sqrt(max(0.,2.-2.*dot(d,uSunDir)));
  sky+=uSunCol*(.28*exp(-ang*3.5)+.5*exp(-ang*16.))*vis;
  sky=mix(sky,uSunCol*1.5+.3,smoothstep(.034,.026,ang));
  if(uNight>.004){   // stars, milky way, shooting stars, moon
  vec3 sp=d*180.;vec3 g=floor(sp);vec3 sf=fract(sp)-.5;
  float sh=hash(g.xy+g.z*vec2(17.3,31.7));
  float st=step(.9975,sh)*smoothstep(.45,.05,length(sf))*uNight*smoothstep(0.,.2,d.y);
  sky+=st*(.7+.3*sin(uTime*2.+g.x+g.z))*1.4;
  vec3 mwn=normalize(vec3(.35,.5,-.79));float mwd=dot(d,mwn)*3.2;float band=exp(-mwd*mwd);
  float mwf=fbm5(d.xz*3.+d.y*2.5);
  sky+=uNight*band*(.25+.75*mwf)*smoothstep(-.05,.3,d.y)*vec3(.15,.17,.26);
  vec3 g2=floor(d*420.);
  sky+=step(.9965-.006*band*mwf,hash(g2.xy+g2.z*vec2(13.1,29.7)))*uNight*smoothstep(0.,.2,d.y)*.32;
  float ts=uTime*.12;float sid=floor(ts);float tt=fract(ts)*6.;
  vec3 so=normalize(vec3(hash(vec2(sid,1.))-.5,.45+.4*hash(vec2(sid,2.)),hash(vec2(sid,3.))-.5));
  vec3 sv=normalize(vec3(hash(vec2(sid,4.))-.5,-.25,hash(vec2(sid,5.))-.5));
  vec3 hp=normalize(so+sv*tt*.35);vec3 dh=d-hp;float along=dot(dh,-sv);float perp=length(cross(dh,sv));
  sky+=smoothstep(.0045,0.,perp)*smoothstep(.13,0.,along)*step(0.,along)*step(tt,1.)*uNight*vec3(1.,.95,.8)*1.6;
  vec3 md=normalize(vec3(-.57,.63,-.52));float ma=sqrt(max(0.,2.-2.*dot(d,md)));
  sky+=uNight*(vec3(.92,.95,1.)*smoothstep(.042,.034,ma)+vec3(.20,.26,.42)*exp(-ma*8.));
  }
  // The clouds: looked up in the two sky pictures the sky is sliding between (23_clouds.js), each shifted to where
  // its clouds have drifted to by now.
  if(d.y>-.012){
    vec4 ck=mix(cloudAt(uCloudA,d,uCloudShift.xy),cloudAt(uCloudB,d,uCloudShift.zw),uCloudMix)*smoothstep(-.012,.004,d.y);
    // the low sun's light is redder and weaker on a cloud's lower parts than on its top
    vec3 sunc=uCloudSun*mix(vec3(.95,.66,.58),vec3(1.),clamp(uDay*2.2+smoothstep(.04,.26,asin(clamp(d.y,0.,1.))),0.,1.));
    sky=sky*(1.-ck.a+ck.b)+sunc*ck.r*mix(2.4,1.85,uDay)+uCloudShd*ck.g*.82;
  }
  sky=mix(sky,uHor,smoothstep(.07,0.,d.y)*.55);
  sky=mix(sky,uFogC,uUnder);
  sky+=(hash(gl_FragCoord.xy)-.5)*(2./255.);
  gl_FragColor=vec4(sky,1.);}
