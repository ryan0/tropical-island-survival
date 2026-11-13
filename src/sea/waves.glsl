// The wave model (vertex shader side). The program's copy is wave-model.ts: change both together.
// RULES (docs/DEVICE_NOTES.md): no out/inout parameters, no loops, no arrays, branch-free maths, guarded pow and divisions.
//
// The swell meets the atoll twice. It breaks on the outer edge of the reef flat (REEF metres off the beach), crosses
// the flat as a line of white water that dies down, and what is left laps onto the beach as a small wave.
#include "../world/island-shape/shore"

/* size of one wave along its crest: big peaks, small shoulders (psi = where along the shore, c = the train's seed) */
float wsize(float As,float psi,float c){
  float P=pow(max(.5+.5*sin(psi*18.+2.5*sin(psi*6.+c)+c),1e-4),2.2);
  return As*(.62+.55*P+.25*(.5+.5*sin(psi*9.+c*5.)));}

/* the breaking wave's front: where a point of it ends up (x ahead of the crest, y up; both in wave heights).
   From the foot of the face (xi=-1.2) up a hollow face to the crest, then out along the lip and back under it.
   xi = phase ahead (-) / behind (+) of the crest, be = 0..1 how far the lip has fallen,
   ho = 0..1 how hollow: a big wave throws its lip further out over a deeper face, which leaves a tube under it */
vec2 lipC(float xi,float be,float ho){float Xt=.10*smoothstep(0.,.2,be)+(.48+.40*ho)*be,Yt=1.-.90*be*be;
  float lb=.15+.85*smoothstep(0.,.25,be);        /* the lip starts as nothing and thickens as it is thrown */
  float f=clamp((xi+1.2)/.5,0.,1.)*1.5708;vec2 A=vec2(.62+.33*ho-(.63+.33*ho)*sin(f),.75-.75*cos(f));
  float lo=step(xi,-.3);
  float v=mix(1.-clamp((xi+.3)/.4,0.,1.),clamp((xi+.7)/.4,0.,1.),lo);
  vec2 U=vec2(-.05+(Xt+.05)*v,1.-(1.-Yt)*v*v)+lo*lb*vec2(.04*(1.-v),-.18*(1.-v)-.07);
  return mix(U,A,step(xi,-.7));}

/* One swell train at one spot. Returns (height, push towards the shore, foam 0..1, crest height).
   w0   phase of the train here            As   the train's size here
   sr   metres outside the line where the swell breaks on the reef (negative: on the reef flat)
   d    depth the swell feels on its way in (m)
   site (wave number / om, depth at the beach, fade to nothing up the beach, foam fade at the waterline) */
vec4 trn(float w0,float As,float sr,float d,float th,float m,float c,float om,float cu,float R,vec4 site){
  float fb=(w0+1.5708)/6.2832;float n=floor(fb);
  /* every wave has its own size; half way between two crests the sizes meet, so the surface has no step there */
  float Aw=mix(wsize(As,th-6.2832*n/m,c),.95*As,smoothstep(.75,1.,abs(fb-n-.5)*2.));
  float w=w0+1.6*(Aw-As)*(1.-smoothstep(0.,45.,sr));
  float gate=site.z;
  float dd=clamp(d,.12,6.);float sh=pow(6./dd,.25);
  float H0=min(1.65*Aw,1.),HS0=min(1.65*As,1.);
  float db=pow(max(H0,1e-4)*2.0064,.8),dbS=pow(max(HS0,1e-4)*2.0064,.8);
  float Hb=.78*db,HbS=.78*dbS;
  float sb=R*(sqrt(1.+db/5.)-1.),sbS=R*(sqrt(1.+dbS/5.)-1.);
  float ho=smoothstep(.55,1.05,Hb);                /* big waves are hollow and take longer over breaking */
  float wd=max(min((1.3+2.6*Hb)*(1.+.45*ho),.85*sb),.3),wdS=max(min(1.3+2.6*HbS,.85*sbS),.3);
  float q=(sb-sr)/wd,qS=(sbS-sr)/wdS;
  float sig=smoothstep(-1.8,0.,q);
  float xi=mod(w-1.5708+.45*sig+3.1416,6.2832)-3.1416;
  float k=om*site.x;
  /* qc: how far along its breaking THIS WAVE is - q measured where its crest is, not at this point. Every point of
     the wave's front then agrees on the stage, so the face and the lip hold their shape as the wave travels.
     (q changes by more than 1 across the few metres of water that are drawn up into a breaking wave's front.) */
  float qc=q+clamp(xi,-1.6,1.4)*(1.-smoothstep(2.2,3.,abs(xi)))/(k*wd);
  float post=smoothstep(.95,1.6,qc),postS=smoothstep(.95,1.6,qS);
  /* after breaking: white water that loses height as it crosses the flat, down to a small wave that reaches the beach */
  /* The shore break. Where the sand rises to the beach, what is left of the wave stands up again - up to three times
     as high as it crossed the flat, a hand to a knee - until the water is too shallow to carry it (lim) and it breaks
     on the sand. sho = how far that has gone: 0 out on the flat, 1 in the last metre or two. */
  float sho=1.-smoothstep(.35,1.3,site.y);
  float lim=.66*site.y+.04;
  float Hp=min(min(Hb,(.05+.12*Hb+.55*(dd-.12)+.66*Hb*(1.-smoothstep(1.5,6.,qc)))*(1.+2.2*sho)),lim);
  /* (HS sets how far the water draws down between crests: that grows much less, or the sea would stand a hand lower all along the beach) */
  float HpS=min(min(HbS,(.05+.12*HbS+.55*(dd-.12)+.5*HbS*(1.-smoothstep(1.5,6.,qS)))*(1.+.8*sho)),lim);
  float H=mix(min(H0*sh,Hb*1.05),Hp,post)*gate;
  float HS=mix(min(HS0*sh,HbS*1.05),HpS,postS)*gate;
  /* in shallow water a swell stops being a sine: the crest narrows and peaks, the trough goes long and flat */
  float kc=1.+(max(.55/k,1.)-1.)*smoothstep(-5.,-1.2,q);
  float wc=clamp(xi*kc,-3.1416,3.1416)+1.5708-.45*sig;
  float Cpk=pow(max(.5+.5*sin(wc+.45*sig*sin(wc)),1e-4),2.4+3.6*sig);
  float fw=min(.75,1.4*k)*(1.-.6*sho);            /* the white-water front is about 1.4 m deep - at the beach, where the wave stands up again, half a metre */
  /* white water: a steep front and a back that falls away over a few metres (2.5 m to lose two thirds; at the beach
     half that: there it is a wave again, with a crest, not a low hump) */
  float Cb=smoothstep(-.2-fw,-.2,xi)*exp(-max(xi,0.)*max(.6,.4/k)*(1.+.9*sho))*(1.-smoothstep(1.2,2.2,xi));
  /* white water is lumpy: its height varies along the front and keeps changing */
  Cb*=1.+.30*sin(th*190.+xi*3.+c)*sin(th*67.-w0*.5);
  float C=mix(Cpk,Cb,post);
  float y0=.62*H*C-.22*HS;
  float xib=.18*(6.2832/om)*1.25/sqrt(max(Hb,.02));
  float plg=(1.-smoothstep(1.9,3.2,xib))*cu;
  /* M: the wave stands up into a steep hollow face a little before its lip starts to fall (be) */
  float M=smoothstep(-.6,-.1,qc)*(1.-smoothstep(1.0,1.8,qc))*plg;M*=abs(uDbg-2.)<.5?0.:1.;
  float Hl=1.15*H;float be=clamp(qc,0.,1.);
  /* the water just ahead (xi -1.5..-1.2) is drawn in flat to the foot of the face, so the trough runs right up to it */
  float inT=step(-1.5,xi)*step(xi,.1);float inL=step(-.7,xi)*inT;
  vec2 c0=lipC(xi,be,ho);
  float wrA=smoothstep(-1.5,-1.2,xi);
  float g=(1.-smoothstep(0.,1.,(xi-.1)/min(1.1,3.6*k)))*step(.1,xi);   /* the back of the wave: about 3.6 m long */
  float bas=-.22*HS-.10*H;
  float ds=((Hl*c0.x+xi/k)*wrA*inT+(-.05*Hl+.1/k)*g)*M;
  float dy=((bas+Hl*c0.y-y0)*wrA*inT+(bas+Hl-y0)*g)*M;
  float xs=xi+1.4;float suck=-.10*H*M*exp(-xs*xs/.35);
  float cr=smoothstep(.9,1.15,qc)*(1.-smoothstep(1.5,2.4,qc))*plg;
  float xc=xi+.40;float mound=.45*Hb*cr*exp(-xc*xc/.16);
  float big=clamp(Aw/.4,0.,1.);
  /* the lip is a sheet of clear water that whitens from its edge inwards as it falls */
  float lipf=M*(inL*(.10+smoothstep(.25,.8,be)*(.25+.75*clamp(1.-abs(xi+.3)/.4,0.,1.)))+(inT-inL)*wrA*clamp((xi+1.2)/.5,0.,1.)*smoothstep(.7,1.,be)*.6);
  /* foam: thick behind the break, thinning out over the flat, a little again where the last of the wave meets the beach */
  float fz=min(exp(-max(q-1.6,0.)*wd*.13)+1.-smoothstep(.3,.85,site.y),1.);   /* (the shore break whitens from about knee depth in) */
  float ffr=smoothstep(-.2-1.25*fw,-.2-.4*fw,xi);
  float boref=post*ffr*exp(-max(xi,0.)*max(mix(1.6,1.1,big),.28/k))*(1.-smoothstep(1.3,2.2,xi))*fz*site.w;
  /* and long after the white water has gone by, thin foam is still lying there in streaks, until the next wave */
  boref+=post*ffr*.30*big*exp(-max(xi,0.)*.30)*(1.-smoothstep(2.3,3.,xi))*min(fz*1.6,1.)*site.w;
  float cap=smoothstep(.93,1.,Cpk)*sig*.4*(1.-post)*(1.-M);
  float fo=(lipf+boref*(.6+.4*big)+cap+cr*exp(-xc*xc/.9)*1.2)*smoothstep(.03,.10,Aw);
  /* (the shore break leans towards the beach as it stands up, which is what makes its face steep; not in the last
     half metre of depth, where waveF lays the swash sheet on the sand and must not be pushed about) */
  return vec4(y0+dy+suck+mound,.45*H*sig*Cpk*(1.-post)*(1.-M)+ds+.9*H*Cb*post*sho*smoothstep(.5,.75,site.y),fo,.62*H*C);}

/* how far up the beach the water is running (m above sea level): one pulse per wave, timed to its arrival */
float runup(float w0,float As,float th,float m,float c){
  float fb=(w0-1.5708)/6.2832;float k=floor(fb);float q=(fb-k)*6.2832;
  float Aw=mix(wsize(As,th-6.2832*k/m,c),.95*As,smoothstep(.75,1.,abs(fb-k-.5)*2.));q+=1.6*(Aw-As);
  return min(1.9*Aw*(1.+1.8*Aw),1.0)*smoothstep(0.,1.0,q)*(1.-smoothstep(1.2,3.8,q));}

/* One wave train's part in the sea surface: its size here and now (sets, and crests of different heights), the wave
   itself (kept in the variable NAME), and how far its swash runs up the beach. WAVE_TRAINS, a define written by
   water-materials.ts from the sea's config, is one of these for each train; REEF_BREAK is a define too. */
#define WAVE_TRAIN(NAME,AMPLITUDE,SET_PACE,VARIETY,VARIETY17,FREQUENCY,CRESTS,PHASE,CAN_PLUNGE,RUN_UP) A=AMPLITUDE*env*(.70+.30*sin(t*SET_PACE+th*2.+VARIETY))*(.88+.12*sin(th*13.+VARIETY17+t*.05)); vec4 NAME=trn(FREQUENCY*(t+tau)+CRESTS*th+PHASE,A,sr,5.*(ur*ur-1.),th,CRESTS,VARIETY,FREQUENCY,CAN_PLUNGE,R,site); Hr+=RUN_UP*runup(FREQUENCY*(t+3.184)+CRESTS*th+PHASE,A,th,CRESTS,VARIETY);

/* the whole sea surface at p: (height above still water, push towards the shore, foam 0..1, metres offshore) */
vec4 waveF(vec2 p,float t){
  float th=atan(p.y,p.x);float R=55.;
  float h=shoreH(p.x,p.y);
  float s=R*(sqrt(max(1.-h/5.,.04))-1.);
  float sr=s-REEF_BREAK;float ur=1.+sr/R;
  float cs=sqrt(clamp(s,0.,40.)+1.5);
  float tau=2.6*cs+max(s-40.,0.)/4.95+min(s,0.)*1.06;
  vec4 site=vec4(1.3/cs,clamp(-h,.12,6.),smoothstep(-1.5,.3,s),smoothstep(-.4,.9,s));
  float env=(1.-smoothstep(62.,95.,s))*(.68+.32*smoothstep(-.4,.8,sin(th)))*openSea(th)*(abs(uDbg-1.)<.5?0.:1.);
  float Hr=0.;float A;
  WAVE_TRAINS
  float pr=a0.w*a1.w+a0.w*a2.w+a1.w*a2.w;
  float eta=a0.x+a1.x+a2.x+0.9*pr;
  /* foam: the three trains, extra where crests cross, and the patchy foam that never quite clears where the swell breaks.
     Where one train is standing up to break, the foam the others left there is stretched thin over its face. */
  float f0=1.-.88*smoothstep(.05,.30,abs(a0.y)),f1=1.-.88*smoothstep(.05,.30,abs(a1.y)),f2=1.-.88*smoothstep(.05,.30,abs(a2.y));
  float fo=a0.z*f1*f2+a1.z*f0*f2+a2.z*f0*f1+(2.5*pr*(1.-smoothstep(2.,12.,sr))+.15*env*smoothstep(-16.,-3.,sr)*(1.-smoothstep(4.,9.,sr)))*f0*f1*f2;
  Hr*=.8;
  eta+=.2*Hr*(1.-smoothstep(0.,7.,s));
  float film=clamp((Hr-h)*.3,-.2,.10);
  float act=smoothstep(.02,.14,abs(a0.y+a1.y+a2.y));float lift=max(h+film-eta,0.)*step(-.5,h)*(1.-act);
  eta+=lift;   /* (the sheet of water this leaves on the sand carries no foam of its own: it used to, and it showed as a
     band of lace sitting on the beach above the waves) */
  return vec4(eta,a0.y+a1.y+a2.y,min(fo,1.),s);}
