// Water colour: ripples, reflection of sky and clouds, sun glint, depth colour, foam, obstacle foam, the view from below.
uniform float uTime,uNight,uDay,uLevel,uUnder,uDbg;uniform vec3 uSunDir,uSunCol,uTop,uHor,uFogC;uniform float uFar;uniform vec3 uObs[16];
uniform sampler2D uDet,uCloudA,uCloudB,uCloudShade,uReef;uniform float uCloudMix,uSunThru,uWind,uBand,uBandOn;uniform vec3 uCloudSun,uCloudShd;
varying vec3 vW;varying vec3 vN;varying vec3 vWave;

#include "../shaders/shared/noise"

#include "../world/island-shape/island"

#include "../shaders/shared/lagwave"

// The slope of one wave train's swell line, for the shading of the open sea. WATER_SWELL, a define written by
// water-materials.ts from the sea's config, adds one of these for each train; LONG_SWELL_SLOPE, HOME_ISLET and
// CLOUD_SHADE_SPAN_M are defines too.
#define SWELL_LINE(SLOPE,SET_PACE,VARIETY,FREQUENCY,CRESTS,PHASE) SLOPE*(.70+.30*sin(t*SET_PACE+tha*2.+VARIETY))*cos(FREQUENCY*ts+CRESTS*tha+PHASE+wob)

// White horses: one family of wind-driven crests, lam metres apart, travelling at c m/s along dir.
//   pw     the place (wrp = metres by which the crests are bent here, so that they are not ruled lines)
//   v      the level direction in which the eye looks at this place
//   rise   how many metres of water a breaking crest hides behind itself, seen from the eye (its height x distance /
//          the eye's height): it is this, not the foam lying flat, that shows as white dashes far out on a real sea
//   fp     how far x (counted in crests) changes from one pixel to the next
//   flatW  how much of the foam lying on the water can be made out at this distance (0..1)
//   rag    small-scale unevenness, so that a patch of foam has a ragged outline; fat = how deep the white band at a crest is
// Returns x = foam lying on the water behind a crest, y = the white of a breaking crest standing up.
// A crest only breaks along stretches of itself, and each stretch only for a couple of seconds (thr = how rare).
vec2 horse(vec2 pw,float wrp,float rag,float fat,vec2 dir,float lam,float c,float t,float seed,float thr,vec2 v,float rise,float fp,float flatW){
  float x=(dot(pw,dir)+wrp-c*t)/lam,sd=dot(v,vec2(-dir.y,dir.x)),al=dot(pw,vec2(-dir.y,dir.x))*.075;vec2 o=vec2(0.);
  if(flatW>.01){
    float n=ceil(x),q=n-x,age=q*lam/c,nb=mod(n,1024.);   // q: 0 at the crest, growing behind it; age: seconds since it passed
    // was this stretch breaking when the crest stood here? Then it left foam, which thins out as it ages
    float g=smoothstep(thr,thr+.1,noise(vec2(nb*7.31+seed+(t-age)*.6,al+nb*3.7))+rag);
    /* (a white band under a metre deep at the crest; behind it foam already full of holes, thinning to a few threads) */
    o.x=g*max(1.-smoothstep(.2*fat,(.7+5.*max(rag+.08,0.))*fat,q*lam),.36+.2*exp(-age/2.2))*(1.-smoothstep(.72,.97,q))*smoothstep(0.,max(fp*1.2,1e-4),q)*flatW;
  }
  float k=dot(v,dir),ak=abs(k);
  if(ak>.06){
    /* Far off, crests this close together could not be told apart, so only every 2nd, 4th, 8th... is drawn (S), the
       ones in between fading out as they recede. A crest between this place and the eye hides it if it is near enough
       (rb, in crests) for its height; it is white where the stretch of it in the line of sight is breaking. A crest
       thinner than a pixel is drawn a pixel thick and fainter, so that it does not flicker. (Each crest drawn far off
       stands for several, so more of its length is white.) */
    float L=max(log2(fp/.16),0.),S=exp2(floor(L)),xs=x/S,up=step(k,0.),n=ceil(xs),q=n-xs,rb=mix(1.-q,q,up);
    float pix=fp/S*1.25,top=rise*ak/(lam*S);   /* (a pixel, and the tallest a crest can stand, both measured in crests) */
    if(rb<min(max(top,pix),.5)){
      float nc=n-1.+up,nb=mod(nc*S,1024.);
      float as=al-rb*lam*S/ak*sd*.075,tf=thr-.05*min(L,3.),g=smoothstep(tf,tf+.1,noise(vec2(nb*7.31+seed+t*.6,as+nb*3.7)));
      g=smoothstep(.1,.6,g)*(.65+.35*sin(as*31.+nb)*sin(as*13.7+1.3*nb));   /* (only where it breaks in earnest; a ragged top) */
      float band=top*mix(.75,1.,up)*g,be=min(max(band,pix),.5);   /* (less white shows from behind a crest) */
      o.y=(1.-smoothstep(.35*be,be,rb))*pow(min(1.,band/pix),.6)*mix(1.,1.-fract(L),mod(nc,2.))*smoothstep(.06,.22,ak)*smoothstep(0.,min(pix*.8,be*.3),rb);
    }
  }
  return o;
}
void main(){vec2 p=vW.xz,dpx=dFdx(vW.xz),dpy=dFdy(vW.xz);   /* (dpx, dpy: the metres of sea from one pixel to the next) */
  vec3 toC=cameraPosition-vW;float dist=length(toC);vec3 V=toC/dist;
  float lagoon=0.;
  if(uFar>.5){float th0=atan(p.y,p.x),Rs=islandR(th0),rp=length(p);if(rp<Rs+93.&&rp>Rs-8.6)discard;lagoon=step(rp,Rs);
    /* The lagoon's shore-wave band (lagoon-shore-band.ts, uBand=1; lagoon-shore-band.vert.glsl lifts it): a strip of mesh from 2.5 m up
       the lagoon's beaches (and the sandbank's) to 13 m out, drawn in a high wind within 150 m of the eye. Where it
       is drawn, the flat sheet leaves a gap for it; and the band draws nothing outside that. */
    float vb=max(rp-Rs+landW(th0),20.-length(p-vec2(sandbankX(),sandbankZ())));
    float inB=step(-13.,vb)*step(vb,2.5)*step(dist,150.)*uBandOn;
    if(abs(inB-uBand)>.5)discard;}
  float depth=vW.y+9.5;
  if(uFar<.5||lagoon>.5)depth=vW.y-hgt(p.x,p.y);
  float eta=(vW.y-uLevel)*uBand;   /* (how far the lagoon's shore-wave band stands above still water here) */
  float sandD=depth-eta;   /* (the depth of still water over the sand itself, coral heads apart) */
  /* over a coral head the water is only as deep as the head's top (a map from 47_reef.js) */
  /* (only inside the map's square: outside it the picture's edge dots would repeat out to the horizon) */
  vec2 ruv=(p-HOME_ISLET)/300.+.5;float rtop=texture2D(uReef,ruv).r*step(abs(ruv.x-.5),.49)*step(abs(ruv.y-.5),.49);if(rtop>.02)depth=min(depth,max(vW.y-(rtop*8.-8.),.05));
  float t=uTime;float vis=1.-uNight;
  float sg=vWave.y,wfv=vWave.x;
/* ripples: the detail texture (src/js/22_detail.js) read four times, from 37 m across down to 1.3 m, each copy turned
   and drifting its own way, so the eye finds no repeat. Far away the GPU blends each copy smooth by itself. */
  vec4 d1=texture2D(uDet,p*.027+t*vec2(.006,.004));
  vec4 d2=texture2D(uDet,vec2(p.x*.8-p.y*.6,p.x*.6+p.y*.8)*.071+t*vec2(-.011,.013));
  vec4 d3=texture2D(uDet,vec2(p.x*.28+p.y*.96,-p.x*.96+p.y*.28)*.23+t*vec2(.031,.017));
  vec4 d4=texture2D(uDet,vec2(-p.x*.71+p.y*.71,-p.x*.71-p.y*.71)*.77+t*vec2(-.05,-.06));
  /* (and once stretched twice along the wind, for the white horses' foam; read here and not inside their branch - docs/DEVICE_NOTES.md) */
  vec4 dW=texture2D(uDet,vec2(dot(p,vec2(-WIND_DIR.y,WIND_DIR.x))*.16,dot(p,WIND_DIR)*.07)+t*vec2(.008,.02));
  vec2 g1=d1.rg-.5,g2=d2.rg-.5,g3=d3.rg-.5,g4=d4.rg-.5;
  /* a fifth reading laid out along the shore and stretched 3.6 times across it: streaks that run the way the waves
     travel (foam drawn out behind white water, lines pulled up a wave's face). Its coordinates have a seam on the
     west side of the atoll (angle = +-pi), so it is faded out just there. */
  float tha=atan(p.y,p.x);vec4 dS=texture2D(uDet,vec2(tha*25.4648,sg*.035-t*.004));
  float strk=mix(.5,dS.a*.6+dS.b*.4,smoothstep(0.,.08,3.14159-abs(tha))*(1.-uFar));
  /* sheltered water (shallows, close to the beach, the lagoon) carries only small ripples; gusts come and go in patches */
  float calm=(.35+.65*smoothstep(0.,2.,depth))*mix(.55,1.,clamp(sg/70.,0.,1.))*(1.-.5*lagoon);
  /* The wind does not ruffle the water evenly: gusts roughen and darken it in patches, and between them lie slicks,
     glassy and paler, that mirror the sky - most of all on sheltered water. One slow reading of the detail texture,
     250 m across and drifting, mixed with the 37 m one. Fine ripples also count for less far from the eye, where
     they would otherwise show as a regular hatching. */
  vec4 dL=texture2D(uDet,p*.004+t*vec2(.0015,.0009));
  float slick=smoothstep(.42,.62,dL.b*.65+d1.b*.35)*(.55+.45*lagoon);
  /* (a light air leaves wide slicks, a calm is one great slick, a fresh breeze leaves few) */
  slick=clamp(slick*(1.6-.6*uWind/.66)+1.-smoothstep(0.,.5,uWind/.66),0.,1.);
  float gust=(.6+.8*d1.b)*(1.-.65*slick)*(.4+.6*exp(-dist*.025));
  vec2 s3=vec2(g3.x*.28-g3.y*.96,g3.x*.96+g3.y*.28),s4=vec2(-g4.x-g4.y,g4.x-g4.y)*.71;
  vec2 s=(g1*.40+vec2(g2.x*.8+g2.y*.6,-g2.x*.6+g2.y*.8)*.50)*calm+(s3*1.0+s4*.85)*(.70+.30*calm)*gust;
  /* the wind ruffles the surface (wk = 1 in the island's usual breeze): none of it in a calm - the water is glass -
     a little in a light air, more than usual when it blows fresh. The swell below is not the wind's and stays. */
  float wk=uWind/.66;
  s*=wk<1.?pow(max(wk,1e-4),1.4):1.+3.6*(wk-1.);
  /* Swell lines. Out beyond the reef the sea rolls in as long low lines: the same three trains that break on the reef
     (waves.glsl), before they have grown. Out there they are not modelled, only shaded - each line tilts the surface a
     little towards the island on its face and away on its back, which is what makes swell show as dark and light
     bands. The shading takes over where the modelled waves fade out (62-95 m offshore) and fades away far out.
     sS = metres offshore; the phases are waves.glsl's (crest where the phase is pi/2), wobbled a little far out so
     that the lines are not perfect rings. */
  float sS=mix(sg,length(p)-islandR(tha),uFar);
  float swW=smoothstep(62.,95.,sS)*(1.-smoothstep(240.,560.,sS))*(.28+.72*smoothstep(-.4,.8,sin(tha)))*openSea(tha)*(1.-lagoon)*(abs(uDbg-1.)<.5?0.:1.);   /* (strongest on the side the swell comes from, the south; faint in the atoll's lee) */
  float swB=0.;
  if(swW>.003){
    float ts=t+16.749+(sS-40.)/4.95,wob=(d1.b-.5)*1.6*smoothstep(95.,150.,sS);
    float sl=(WATER_SWELL+LONG_SWELL_SLOPE*smoothstep(95.,170.,sS)*(.55+.45*sin(t*.07+tha*3.))*cos(.70*ts+4.*tha+1.3+wob))*swW*(.8+.6*d1.b);   /* (uneven along each line: higher here, lower there) */
    s+=normalize(p)*sl*1.4;
    swB=clamp(sl*4.5,-1.,1.);   /* (+1 on a line's face, -1 on its back) */
  }
  float surf=(1.-smoothstep(2.,15.,sg))*smoothstep(-.5,1.5,sg);
  vec3 N=normalize(normalize(vN)+vec3(-s.x,0.,-s.y));
  if(dot(N,V)<0.)N=-N;
  /* how much sky the surface mirrors. A real sea is too rough to be a perfect mirror even at the horizon. */
  float fres=.02+.98*pow(clamp(1.-dot(N,V),0.001,1.),5.);fres*=1.-mix(.40,.14,slick)*min(uWind*2.3,1.)*fres;   /* (a calm sea is a true mirror at a low angle) */
  vec3 R=reflect(-V,N);R.y=abs(R.y)+.02;R=normalize(R);
  /* (ruffled water mirrors the sky from higher up, where it is bluer: gust patches read darker than the slicks) */
  vec3 skyc=mix(uHor,uTop,pow(clamp(R.y+(1.-slick)*(.12+.14*max(uWind/.66-1.,0.)),0.,1.),.5));
  if(fres>.05){
    // the clouds, mirrored: the same sky pictures the sky shows, looked up in the mirrored direction
    vec2 cuv=vec2(atan(R.z,R.x)/6.28318+.5,-.5+sqrt(.25+2.*asin(clamp(R.y,0.,1.))/1.5708));
    vec4 ck=mix(texture2D(uCloudA,cuv),texture2D(uCloudB,cuv),uCloudMix);
    skyc=skyc*(1.-ck.a+ck.b)+uCloudSun*ck.r*mix(2.4,1.85,uDay)+uCloudShd*ck.g*.82;
  }
  float sdot=max(dot(R,uSunDir),0.);
  vec3 spec=uSunCol*pow(sdot,60.)*.06*vis;
  if(sdot>.985)spec+=uSunCol*pow(sdot,340.)*7.*smoothstep(.56,.86,noise(p*17.+vec2(t*3.,-t*2.4)))*vis*min(uWind*2.3,1.3);
  /* (on glassy water the sun is mirrored whole, not scattered into glitter) */
  spec+=uSunCol*pow(sdot,900.)*5.*(1.-smoothstep(0.,.4,uWind))*vis;
  float mdot=max(dot(R,normalize(vec3(-.57,.63,-.52))),0.);
  spec+=vec3(.55,.62,.80)*(pow(mdot,180.)*1.6+pow(mdot,20.)*.10)*uNight;
/* the colour of the water itself: pale aqua over the sand, turquoise where it deepens, blue beyond the reef */
  vec3 shal=vec3(.15,.74,.72),mid=vec3(.03,.55,.70),deep=mix(vec3(.006,.12,.34),vec3(.015,.34,.53),lagoon);
  vec3 body=mix(mix(shal,mid,smoothstep(.6,3.2,depth)),deep,smoothstep(3.,9.5,depth));
  body+=vec3(0.,.10,.08)*clamp((s.x*uSunDir.x+s.y*uSunDir.z)*4.,0.,1.)*uDay;
  body*=.96+.09*slick;
  /* a wave standing up lets the light through: its face glows green */
  float lit=1.-smoothstep(58.,80.,sg);
  body=mix(body,vec3(.18,.78,.68),clamp(vWave.z*1.5,0.,.6)*lit);
  /* (the lagoon's shore waves, where they have real height: clear water, so their backs show little but the sky
     they mirror; a steep face is a small wall of water, and there you look into its green) */
  float bstp=clamp((1.-normalize(vN).y)*4.,0.,1.)*uBand;
  body=mix(mix(body,vec3(.16,.74,.66),clamp(eta*2.,0.,.35)),vec3(.05,.50,.47),bstp*.75);
  /* the steep face of a breaking wave is a wall of water: you look into it, not through it. Dark at the foot where
     it is thick, bright green towards the lip where it thins. */
  float steep=smoothstep(.992,.80,abs(normalize(vN).y))*lit*(1.-uFar);
  /* (a small wave in shallow water - the shore break - is never that dark: there is white sand close behind it) */
  body=mix(body,mix(vec3(.0,.21,.29),vec3(.10,.66,.62),max(smoothstep(-.3,1.1,vWave.z),.9*(1.-smoothstep(.5,1.9,depth))))*(.82+.36*strk),steep*.92);
/* aerated water: where waves have just broken the water is full of bubbles and turns pale and milky */
  body=mix(body,vec3(.52,.87,.85),clamp(wfv*.8,0.,.72));
  body*=mix(vec3(.62,.45,.55),vec3(1.),uDay)*(1.-.82*uNight);
  /* (a film of water a few centimetres deep on the sand is all but invisible: no tint, no dark edge) */
  float a=mix(.07,1.,smoothstep(.15,5.6,depth))*smoothstep(0.,.4,depth);
  a=max(a,(clamp(eta*2.2,0.,.28)+bstp*.5)*smoothstep(.05,.25,depth));
  /* (raised water is thick water - except the sheet running up the beach, which is raised but paper-thin) */
  float thick=smoothstep(.08,.5,depth);
  a=max(a,smoothstep(.12,.45,vWave.z)*.82*lit*thick);a=max(a,steep*.97*thick);
  /* where the swell breaks the water is churned up and never quite clear */
  a=max(a,.5*smoothstep(33.,40.,sg)*(1.-smoothstep(52.,62.,sg))*smoothstep(.3,1.2,depth));
  /* water with foam on it or bubbles in it is cloudy: it hides the sea floor and the light playing on it */
  a=max(a,smoothstep(.03,.5,wfv)*.86*smoothstep(.06,.4,depth));
  /* the clouds' shadows: the water under a cloud is duller, and the sun does not glitter there (nor anywhere, while a
     cloud stands between the eye and a low sun) */
  float cls=texture2D(uCloudShade,p/CLOUD_SHADE_SPAN_M+.5).r;
  body*=mix(.62,1.,cls);spec*=cls*cls*mix(uSunThru,1.,smoothstep(.04,.16,uSunDir.y));
  /* (a swell line's face is darker, its back lighter, from whatever angle it is seen: the tilt alone only shows at a low angle) */
  vec3 col=(mix(body,skyc,fres)+spec)*(1.-.13*swB);
  /* White horses. In a high wind the chop crests and breaks: a stretch of a crest turns white and tumbles for a couple
     of seconds, and the foam it leaves lies on the water behind it, thinning to lace and fading as the crest runs on.
     Two families of crests cross, 28 degrees either side of the wind, so that there are no rows and so that from any
     side some crests are seen broadside on. In sheltered water (shel) - the lagoon, and the reef flat between the
     ocean beach and the breakers - they are a third the size, lower and fewer, and leave little foam (on the reef
     flat less still); in the lagoon only where it is deep, and none among the breakers themselves.
     wD = foam lying on the water, wS = white crests standing up. */
  float shel=max(lagoon,step(sg,44.));
  float wD=0.,wS=0.,wcK=smoothstep(.74,1.,uWind)*(1.-uUnder)*mix(smoothstep(50.,66.,sg)*smoothstep(1.,2.6,depth),
    mix((1.-smoothstep(26.,38.,sg))*smoothstep(.5,1.1,depth),smoothstep(1.6,3.6,depth),lagoon),shel);
  if(wcK>.003){
    float ls=1.+2.*shel,wrp=((d2.b-.5)*2.5+(d1.b-.5)*5.+(dL.b-.5)*30.)*ls;
    vec2 wd=WIND_DIR,pw=p*ls,cv=p-cameraPosition.xz;float cd=max(length(cv),1.);cv/=cd;
    float rag=(d2.b-.5)*.2+(d3.b-.5)*.12,rise=mix(.6,mix(.15,.2,lagoon),shel)*wcK*ls*cd/max(cameraPosition.y-vW.y,.4),thr=mix(.75,.59,wcK)+mix(.09,.06,lagoon)*shel;
    float flatW=(1.-smoothstep(1.5,5.,max(length(dpx),length(dpy))*ls))*smoothstep(0.,.3,wcK);
    vec2 dA=vec2(wd.x*.883-wd.y*.469,wd.x*.469+wd.y*.883),dB=vec2(wd.x*.883+wd.y*.469,-wd.x*.469+wd.y*.883);
    vec2 hA=horse(pw,wrp,rag,1.+1.5*shel,dA,14.,4.,t,3.1,thr,cv,rise,(abs(dot(dpx,dA))+abs(dot(dpy,dA)))*ls/14.,flatW);
    vec2 hB=horse(pw,-wrp,-rag,1.+1.5*shel,dB,10.5,3.5,t,8.7,thr,cv,rise,(abs(dot(dpx,dB))+abs(dot(dpy,dB)))*ls/10.5,flatW);
    wD=max(hA.x,hB.x)*(1.-mix(.4,.3,lagoon)*shel);wS=max(hA.y,hB.y)*smoothstep(4.,18.,cd);   /* (right under the eye a crest is drawn by its foam alone) */
  }
  /* From a medium wind up, small waves come ashore on the lagoon's beaches (lagwave.glsl; terrain_color.glsl draws what
     they do on the sand; in a high wind the band mesh gives them height). The water there is too clear and thin to
     show much: ahead of each crest its face is a faint darker band (there you look into the water, not at the sky),
     its back a thin line of sky; from where it breaks - the bigger the wave, the further out - it is white. */
  if(lagoon>.5&&sandD<1.6){float lwK=lagExposure(p)*(1.-uUnder);
    if(lwK>.003){vec3 lw=lagWave(p,sandD,t);float sN=lw.x/LW_T,sz=lw.y*lwK;
      float shoal=(1.-smoothstep(.4,1.5,sandD))*smoothstep(.14,.28,sandD)*min(lw.z*lwK,1.);
      float face=smoothstep(.80,.95,sN)*(1.-smoothstep(.95,1.,sN))*shoal;
      col=mix(col,body*.45,face*.7);a=max(a,face*.3);
      float back=smoothstep(.94,1.,sN)*shoal;col=mix(col,skyc*1.05,back*.5);a=max(a,back*.32);
      /* (nothing is drawn here in the last hand's depth: the sand shader draws the foam there, since only it knows
         exactly where the ground's own triangles meet the water) */
      wD=max(wD,lagFoam(lw.x,sz)*(1.-smoothstep(.6,1.15,sandD/(.1+.26*min(sz,1.8))))*smoothstep(.10,.2,sandD));
    }
  }
/* foam: the wave model says how much (wfv); the detail texture turns that into lace where it is thin and a white sheet
   with holes where it is thick (soft patches only, further away, where the lace would be too fine to see).
   The pattern drifts slowly with the ripples instead of racing ashore. */
  float e0f=.3;float foam=0.,ln=mix(max(d3.a,d4.a*.9)*.6+(d3.b+d4.b)*.2,.22+d2.b*.36+d1.b*.30,smoothstep(8.,30.,dist))*.62+strk*.38;
  if(uFar<.5&&(wfv>.003||depth<.09||sg<16.)){
    float D=clamp(wfv*(.75+.5*d2.b),0.,1.);   /* only foam the waves made; no standing lace along the beach */
    /* the sheet of water sliding up and down the sand carries a white edge and a little lace, not a grey veil */
    float thin=max(smoothstep(.03,.15,depth),smoothstep(.4,.8,wfv));D*=mix(.3,1.,thin);
    float e0=mix(1.,-.12,D*D*(3.-2.*D));e0f=max(e0,-.05);
    foam=smoothstep(e0,e0+.14+.5*smoothstep(15.,90.,dist),ln)*(.62+.38*D);
    /* from far off the lace is too fine to see: thin foam then reads as a pale veil, patchier where it is thinner */
    foam=mix(foam,clamp(D*(.30+1.1*ln),0.,1.),smoothstep(12.,55.,dist)*thin);
    foam=max(foam,smoothstep(.72,1.,wfv)*(.55+.45*smoothstep(.3,.7,ln)));
    /* a line of foam at the very edge of moving water (not round a still puddle lying in a dip in the sand) */
    foam=max(foam,(1.-smoothstep(0.,.06,depth))*smoothstep(.45,.75,ln+.15)*smoothstep(.06,.22,wfv));
    if(sg<24.){float ob=0.;for(int oi=0;oi<16;oi++){vec3 o=uObs[oi];if(o.z>0.){float od=length(p-o.xy)-o.z;ob=max(ob,1.-smoothstep(.02,.5+.35*o.z,od));}}
      foam=max(foam,ob*smoothstep(.45,.75,ln+.30*clamp(vWave.z*3.+wfv,0.,1.)));}
  }
  /* the white horses' foam: a white sheet where it is fresh, lace as it thins - drawn out in streaks along the wind (dW, the
     detail texture read stretched twice that way) - and a pale veil from far off. Under it the
     water is full of bubbles for a while, and paler. */
  if(wD+wS>.003){
    float lw=mix(ln,dW.a*.65+dW.b*.35,.45);
    col=mix(col,vec3(.34,.66,.74)*(.45+.55*uDay)*(1.-.8*uNight),.3*wD);
    float e=mix(1.,-.12,wD*wD*(3.-2.*wD)),fw=smoothstep(e,e+.14+.5*smoothstep(15.,90.,dist),lw)*(.62+.38*wD);
    fw=mix(fw,clamp(smoothstep(.2,.85,wD)*(.45+1.1*lw),0.,1.),smoothstep(12.,55.,dist))*(1.-.3*lagoon);
    fw=max(fw,wS*(.82+.18*smoothstep(.3,.6,ln)));
    foam=max(foam,fw);e0f=min(e0f,mix(.3,-.05,max(wD,wS)));
  }
  /* foam is white where it is thick and blue-grey where it thins; the ripples under it catch the sun, so it looks frothy */
  vec3 fc=mix(vec3(1.,.8,.75),vec3(1.),uDay)*(1.-.75*uNight)*clamp(.97+dot(s3+s4,uSunDir.xz)*1.1*(1.-smoothstep(5.,22.,dist)),.84,1.07);
  /* close up, even thick foam is a mass of bubbles with water showing between them */
  foam*=1.-.45*(1.-smoothstep(.25,.75,d4.a))*(1.-smoothstep(3.,14.,dist));
  /* no foam at all on water a few centimetres deep unless the wave model put plenty there (the white edge of the swash) */
  foam*=max(smoothstep(.03,.10,depth),smoothstep(.2,.4,wfv));
  foam=min(foam,.94);col=mix(col,fc*mix(vec3(.66,.90,.92),vec3(1.08),smoothstep(e0f,e0f+.26,ln))*mix(vec3(.60,.72,.84),vec3(1.06),clamp(dot(normalize(normalize(vN)+vec3(-s3.x-s4.x,0.,-s3.y-s4.y)*(1.5+3.5*(1.-smoothstep(4.,30.,dist)))+vec3(strk-.5,0.,ln-.5)*.9),uSunDir)*1.1+.2,0.,1.)),foam);a=max(a*smoothstep(.01,.12,depth),foam*smoothstep(0.,.045,depth));   /* water under a few cm deep is invisible unless it carries foam */
  /* haze towards the horizon, much less when looking down from high up */
  float fg=1.-exp(-dist*.00042*(1.-.8*clamp(V.y,0.,1.)));
  col=mix(col,uHor,fg);a=mix(a,1.,fg);
  if(uUnder>.5){float up=clamp(-V.y,0.,1.);float win=smoothstep(.5,.8,up);
    float rp2=fbm(p*.9+vec2(t*.3,t*.2));
    vec3 dayf=mix(vec3(.6,.45,.5),vec3(1.),uDay)*(1.-.8*uNight);
    col=mix(vec3(.02,.28,.40),vec3(.60,.92,.96),win*(.45+.9*rp2))*dayf;
    col+=uSunCol*pow(max(dot(-V,normalize(vec3(uSunDir.x*.6,uSunDir.y,uSunDir.z*.6))),0.),40.)*1.2*(1.-uNight);
    col=mix(col,uFogC,1.-exp(-dist*.05));a=1.;}
  if(abs(uDbg-3.)<.5){col=vec3(.03,.25,.50);a=.95;}
  col+=(hash(gl_FragCoord.xy)-.5)*(2./255.);
  gl_FragColor=vec4(col,a);}
