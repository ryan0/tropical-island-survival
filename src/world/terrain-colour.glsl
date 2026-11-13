// Terrain colour: sand, grass, soil, paths, rock, wet sand, reef flat, depth tint and caustics.
// Runs inside three.js's Lambert shader (replaces diffuseColor.rgb), so lighting and shadows still apply.
float th=vWp.y;vec2 tp=vWp.xz;
// which side of the land this is: 1 on the lagoon's side (still water, no surf), 0 on the ocean's
float lagA=atan(tp.y,tp.x),lagK=1.-smoothstep(-.7,-.4,(length(tp)-islandR(lagA))/(26.+44.*pow(.5+.5*sin(lagA),1.6)+4.*sin(5.*lagA+1.)));   // (the divisor is landW() of island.glsl, which this shader does not have: keep the two the same)
// (uCam, not three.js's cameraPosition: three.js does not fill that in for this kind of material, and for a long time
// every close-up detail below was being faded out as if the camera stood in the middle of the lagoon)
float cdist=length(uCam-vWp);float nf=exp(-cdist*.05);
float dep=max(uLevel-th,0.);
vec2 cq=tp*.34+vec2(uTime*.010,uTime*.006);
vec2 cw=(texture2D(uDet,cq*.31+vec2(uTime*.017,-uTime*.013)).rg-.5)*.16;
// grit: the ground's speckle picture (the material's own map, which three.js has already read into texelColor).
// Everything below replaces the colour outright, so the speckle is put back at the end; it fades out with distance.
// read twice: grain close up (a dot is 1.4 cm), and the same picture four times larger for mottling further off
float grit=((texelColor.g-uGritMean)*exp(-cdist*.02)+(texture2D(map,vUv*.23+.37).g-uGritMean)*.10*exp(-cdist*.006))*(1.-.75*smoothstep(0.,.5,dep));
vec2 caus=vec2(texture2D(uDet,cq+cw).a,texture2D(uDet,vec2(cq.x*.6+cq.y*.8,-cq.x*.8+cq.y*.6)*1.63-cw*1.4).a);
if(dep>8.6){
  // the deep sea floor, only ever seen dimly through the water or when diving: plain sand
  diffuseColor.rgb=vec3(.77,.72,.61);
}else{
  float macro=fbm(tp*.11);
  vec2 sunXZ=normalize(uSunDir.xz+1e-4)*(1.-.45*uSunDir.y);
  // ---- the beach in zones, by height above the sea (th), each boundary wandering so that none is a contour line ----
  float zw=noise(tp*.23+7.)-.5;
  float loose=smoothstep(.30,.62,th+zw*.2)*(1.-smoothstep(1.75,2.1,th));   // dry, loose sand
  // coral sand: near white, a touch warm; paler and greyer in broad patches. Most of the beach is clean.
  // (kept well under 1: in full sun the lighting multiplies it by about 1.3, and sand that clips to pure white shows no relief)
  vec3 sand=mix(vec3(.725,.715,.69),vec3(.71,.71,.70),smoothstep(.35,.7,macro))*(.94+.12*macro)*(.97+.06*fbm(tp*1.9));
  // Loose dry sand is never flat. Close up it is dimpled - footprints and hollows, in two overlapping layers; further
  // off it rolls in low hummocks (the detail texture's small-wave field read large). Both are shaded against the
  // sun: lit on one side, darker and a little bluer on the other. Some stretches are trodden, some nearly smooth.
  vec4 r1=texture2D(uDet,tp*.06);
  float trod=.35+.65*smoothstep(.3,.6,noise(tp*.09+50.));
  float relief=0.;
  if(loose>.001){   // (the dry beach only: skipped for the sea floor and the land)
    // (each part fades with distance; beyond where it has faded to nothing it is not worked out at all)
    float dmp=0.,rpl=0.;
    if(cdist<120.)dmp=(dimples(tp*1.5,sunXZ)+dimples(vec2(tp.x*.6-tp.y*.8,tp.x*.8+tp.y*.6)*2.3+5.,sunXZ)+dimples(vec2(tp.x*.28+tp.y*.96,-tp.x*.96+tp.y*.28)*3.7+11.,sunXZ)*.7)*1.5*trod*exp(-cdist*.03);
    if(cdist<90.)rpl=cos(dot(tp,vec2(.8,.6))*13.+4.*noise(tp*.5))*dot(sunXZ,vec2(.8,.6))*.07*(1.-trod)*exp(-cdist*.05);
    relief=(dmp
               /* where nobody has walked, the wind leaves fine ripples across the sand */
               +rpl
               +dot(r1.rg-.5,sunXZ)*.14*exp(-cdist*.010))*loose;
  }
  sand*=1.+relief;sand=mix(sand,sand*vec3(.88,.95,1.06),clamp(-relief*4.,0.,1.));
  // ---- towards the water ----
  // soaked: where the swash runs, the sand is dark, tan and packed flat. damp: above it a band that is still drying,
  // in patches. Both fade out just below the waterline (under water, the sea's own colour takes over).
  float shoreK=smoothstep(-.3,.0,th);
  float soaked=(1.-smoothstep(.03,.30,th+zw*.14))*shoreK;
  float damp=(1.-smoothstep(.22,.60,th+zw*.28+(noise(tp*1.3)-.5)*.16))*shoreK;
  // The lagoon's edge has no swash: only a film of water that laps a hand's breadth up the sand and slides back.
  // So there the wet sand is a narrow strip (and paler), and `lap` is how high the film reaches at this moment.
  float lap=.035+.028*sin(uTime*1.25+6.*noise(tp*.13))+.012*sin(uTime*2.7+tp.x*.9+tp.y*.7)+.02*(noise(tp*.9)-.5);
  // From a medium wind up, small waves break on the lagoon's beaches (lagwave.glsl; water.frag.glsl draws them on the
  // water) - in a high wind bigger ones.
  // Each runs up the sand as a sheet with a foaming edge, a hand or two high, and slides back before the next:
  // then `lap` is that sheet's edge, and the sand is wet as high as the biggest of them reach.
  // lwAdv = the sheet is still running up (its edge foams), lwFoam = how much foam the wave that last came in has left.
  float lwK=lagK>.01?lagExposure(tp):0.,lwAdv=0.,lwFoam=0.,lwLight=0.;
  if(lwK>.003&&th>-.4-lagHi()&&th<.5){
    vec3 lw=lagWave(tp,-th,uTime);float sN=lw.x/LW_T;
    /* (in a high wind the waves stand up, and the sun through them falls on the sand as moving bands: bright under
       a crest, where the water gathers the light like a lens, dim under its face) */
    lwLight=lagHi()*lagEx(tp)*(1.-smoothstep(.5,1.4,-th))*smoothstep(.03,.2,-th)*(lw.y*(1.-smoothstep(0.,.12,sN))*.9+lw.z*(smoothstep(.93,1.,sN)*.9-smoothstep(.72,.9,sN)*(1.-smoothstep(.9,.95,sN))*.55));
    /* (how far a wave runs up differs along the beach - higher here, lower a few steps on - and its edge is never straight) */
    /* (in a high wind the big ones reach a foot up: a step and a half of sand) */
    float l1=min(lwK,1.),top=.42*(1.-exp(-.2*lw.y*(.55+.9*noise(tp*.7+3.))*lwK/.42)),up=smoothstep(0.,.3,sN);
    lap=lap*(1.-.6*l1)+top*up*(1.-smoothstep(.3,.95,sN))+l1*(.02*(noise(tp*3.1)-.5)-.03*(lw.z*smoothstep(.7,1.,sN)+lw.y*(1.-smoothstep(0.,.12,sN))));
    /* (the foam comes up the sand with the sheet's edge: none above where that has got to) */
    float reach=1.-smoothstep(-.004,.006,th-.01-top*up);
    lwAdv=smoothstep(.06,.28,lw.y*lwK)*smoothstep(0.,.08,sN)*(1.-smoothstep(.25,.6,sN));
    lwFoam=lagFoam(lw.x,lw.y*lwK)*reach;
  }
  soaked=mix(soaked,(1.-smoothstep(.07+.10*lwK,.14+.13*lwK,th+zw*.03))*shoreK,lagK);
  damp=mix(damp,(1.-smoothstep(.10+.12*lwK,.28+.14*lwK,th+zw*.10+(noise(tp*1.3)-.5)*.08))*shoreK,lagK);
  sand*=mix(vec3(1.),vec3(.955,.94,.91),damp*(.6+.4*smoothstep(.3,.7,noise(tp*.4+21.))))*mix(vec3(1.),mix(vec3(.92,.895,.85),vec3(.945,.925,.89),lagK),soaked);
  // the lines each retreating wave leaves behind: thin scalloped arcs, a darker wet edge with a paler rim of dried
  // foam and fine shell above it, closer together and fainter up the beach
  // (faint, unevenly spaced, and each one peters out along the beach: they must not read as contour lines)
  float slw=th+.16*noise(tp*.33+3.)+.03*noise(tp*1.7);
  float sl=fract(slw*5.+.35*sin(slw*17.));
  float slk=smoothstep(.35,.65,noise(vec2(tp.x*.5+floor(slw*5.)*7.3,tp.y*.5)));
  sand*=1.+(smoothstep(.0,.12,sl)*(1.-smoothstep(.12,.35,sl))*.035-(1.-smoothstep(.0,.06,sl))*.045)*slk*damp*(1.-.6*soaked)*shoreK*(1.-lagK);
  // soaked sand is glossy: at a low angle it mirrors the sky a little
  float graze=1.-clamp(normalize(uCam-vWp).y,0.,1.);
  sand=mix(sand,uHor*.80,soaked*smoothstep(-.02,.06,th)*graze*graze*graze*.38);
  if(lagK>.01){
    // under the film the sand shows clear but a touch cooler, and glassier; at the film's leading edge a thin broken
    // thread of white (broken along the shore and in time, so that it never reads as a drawn line)
    // (the film is painted from the lapping edge down to where the water proper starts to show, 20-30 cm under the
    // still level: without that the first metre of water looks like dry sand)
    float film=(1.-smoothstep(lap-.004,lap+.004,th))*smoothstep(-.32,-.2,th)*lagK;
    sand=mix(sand,sand*vec3(.90,.94,.95),film*.8);
    sand=mix(sand,uHor*.85,film*graze*graze*.36);
    float rim=exp(-pow((th-lap)/mix(.009,.02,lwAdv),2.))*mix(smoothstep(.42,.66,noise(vec2(tp.x+tp.y,tp.x-tp.y)*1.7+uTime*.15)),.45+.55*smoothstep(.2,.6,max(caus.x,caus.y)),lwAdv)*lagK;
    sand=mix(sand,vec3(.96,.97,.97),rim*mix(.26,.9,lwAdv)*(.35+.65*uDay));
    // (the foam of a broken wave: on the sheet running up the sand, and in the last hand's depth of water, which is
    // drawn here and not by water.frag.glsl: only this shader knows just where the ground meets the water. White where fresh, then lace.)
    if(lwFoam>.01){
      float fo=smoothstep(.9-lwFoam,1.1-lwFoam,max(caus.x,caus.y)*.7+.3*noise(tp*2.3+uTime*.2))*film*(1.-smoothstep(.10,.2,-th));
      sand=mix(sand,vec3(.90,.95,.95),film*lwFoam*.3);   // (the sheet itself is milky with bubbles)
      sand=mix(sand,vec3(.97,.98,.98),fo*.9*(.35+.65*uDay));
    }
  }
  sand*=1.+.3*lwLight*uDay;   // (the light the lagoon's shore waves throw on the sand under them)
  // Shells, coral chips and pebbles: one may sit in each 30 cm square, nearly all squares are empty - except along the
  // line where the last high tide left its drift. Each is a small round chip, pale, pink, tan or grey, with a sliver
  // of shadow on the side away from the sun.
  if(th>.2&&th<2.2&&cdist<45.){
    vec2 sc=tp*3.3,ci=floor(sc),off=vec2(hash(ci+31.),hash(ci+47.))*.7+.15;
    float drift=exp(-pow((th-mix(.85,.34,lagK)-.25*noise(tp*.21)*(1.-.6*lagK))/mix(.13,.07,lagK),2.));   // (the lagoon's tide line is low and thin)
    float here=step(1.-(.02+mix(.42,.16,lagK)*drift),hash(ci+17.)),hk=hash(ci+5.),rad=.05+.10*hk*hk;
    vec2 dv=fract(sc)-off;dv.x*=1.+.6*hash(ci+9.);
    float chip=smoothstep(rad,rad*.55,length(dv))*here,shade=smoothstep(rad*1.5,rad*.6,length(dv+sunXZ*rad*.8))*here;
    vec3 cc=mix(mix(vec3(.96,.94,.90),vec3(.86,.62,.52),step(.62,hk)),mix(vec3(.62,.60,.58),vec3(.74,.60,.42),step(.5,hash(ci+2.))),step(.8,hash(ci+71.)));
    float near=exp(-cdist*.05);
    sand=mix(sand*(1.-.45*shade*(1.-chip)*near),cc*(.85+.3*dot(dv,sunXZ)/rad),chip*near);
  }
  diffuseColor.rgb=sand;
  if(th>-.1){
    // dry land and the beach above the waterline
    float lush=.5+.5*sin(tp.x*.07+1.9*sin(tp.y*.05+.4))*sin(tp.y*.09+1.3*sin(tp.x*.06));
    float dry=.5+.5*sin(tp.x*.13+2.1)*sin(tp.y*.11+.7);
    // short sun-bleached turf: yellow-green where it is thin, greener where it is lush, straw where it has dried out
    vec3 tint=mix(vec3(.56,.62,.26),vec3(.36,.52,.19),lush);tint=mix(tint,vec3(.72,.66,.40),dry*dry*.7);
    float sa=noise(tp*.13+4.)*12.566;vec2 sdr=vec2(cos(sa),sin(sa));
    float st=noise(vec2(dot(tp,sdr)*1.7,dot(tp,vec2(-sdr.y,sdr.x))*10.)+3.*noise(tp*.7));
    float clv=smoothstep(.55,.68,fbm(tp*.8+21.));
    vec3 gg=mix(tint,tint*vec3(1.05,1.18,.95)+.03,clv*.6)*vec3(.90,.92,.82)*(.80+.40*fbm(tp*2.2))*(1.+(st-.5)*.45*nf);
    gg*=.86+.28*noise(tp*11.)*nf+.14*(1.-nf);
    // mats of creeping vine: darker, glossier green, speckled with small round leaves
    float vine=smoothstep(.54,.66,fbm(tp*.21+90.));
    gg=mix(gg,vec3(.17,.36,.12)*(.75+.7*hash(floor(tp*7.)+2.)*nf+.35*(1.-nf)),vine*.8);
    // bare patches where the sandy soil shows through the turf
    float bare=smoothstep(.56,.70,fbm(tp*.33+40.)+.25*(noise(tp*2.7)-.5));
    gg=mix(gg,vec3(.80,.73,.56)*(.85+.3*noise(tp*5.)),bare*.85);
    vec3 soil=vec3(.50,.38,.25)*(.75+.5*fbm(tp*1.3));
    soil*=1.-.25*step(.975,hash(floor(tp*18.)+9.))*smoothstep(.5,.2,length(fract(tp*18.)-.5))*nf;
    float dirtA=sin(tp.x*.23+1.1*sin(tp.y*.17))*sin(tp.y*.21+1.4*sin(tp.x*.19)+2.);
    float dm=smoothstep(.66,.80,dirtA+(fbm(tp*.6)-.5)*.5+(noise(tp*3.1)-.5)*.12);
    // under the trees the ground is not lawn: fallen fronds and leaf litter, brown and olive, darker than the grass
    float lit2=smoothstep(.35,.7,fbm(tp*.35+70.));
    gg=mix(gg,vec3(.50,.40,.25)*(.7+.6*noise(tp*4.3)),lit2*.45);
    vec3 land=mix(gg,soil,dm*.85);
    float pm=smoothstep(1.05,.72,pathD(tp)+(noise(tp*.9)-.5)*.7+(noise(tp*4.)-.5)*.25);
    vec3 pathc=mix(soil,vec3(.80,.70,.50),.55)*(.9+.2*noise(tp*3.));
    land=mix(land,pathc,pm);
    float rk=smoothstep(10.6,12.6,th+(noise(tp*.5)-.5)*2.);
    land=mix(land,vec3(.46,.44,.39)*(.7+.6*fbm(tp*1.5)),rk);
    float edgeW=.45*sin(tp.x*.31+tp.y*.17)+.3*sin(tp.y*.43-tp.x*.23+1.);
    float gline=th+edgeW+(fbm(tp*1.7)-.5)*.5;
    // ---- towards the vegetation, in layers ----
    // 1. the back of the beach: sand a shade greyer and warmer (old leaf mould), strewn with bits of leaf and twig
    float back=smoothstep(1.15,1.65,gline);
    vec3 fringe=mix(sand,sand*vec3(.86,.82,.74),back*(.55+.45*smoothstep(.3,.7,noise(tp*.31+9.))));
    float litter=0.;
    if(back>.001&&cdist<150.)litter=max(fleck(tp*6.),fleck(vec2(tp.x*.8+tp.y*.6,-tp.x*.6+tp.y*.8)*9.+3.))*back*smoothstep(.2,.55,noise(tp*.6+17.))*exp(-cdist*.025);
    fringe=mix(fringe,vec3(.34,.25,.15)*(.7+.6*hash(floor(tp*6.))),litter*.85);
    // 2. the turf does not stop at a line: it breaks up into islands and tongues, with sand between them
    float patchy=gline+(fbm(tp*.9+3.)-.5)*1.3+(noise(tp*3.3)-.5)*.30;
    float gm=smoothstep(1.74,1.84,patchy);
    // 3. round every patch of turf, a rim of sand stained dark by roots and humus
    fringe=mix(fringe,vec3(.52,.45,.34)*(.85+.3*noise(tp*4.)),smoothstep(1.45,1.74,patchy)*.7);
    // coral rubble thrown up at the back of the beach: a band of small grey-white stones where the sand meets the scrub
    float rub=smoothstep(.95,1.3,gline)*smoothstep(.42,.6,fbm(tp*.5+13.));
    // three sizes of stone laid one over another (big ones on top), at three angles, so no grid shows; grit between them
    vec3 rubc=vec3(.74,.72,.67)*(.9+.2*noise(tp*9.));
    if(rub>.002&&nf>.02){   // (only where there is rubble, and near enough for single stones to show)
    vec3 pb=pebble(vec2(tp.x*.5+tp.y*.87,-tp.x*.87+tp.y*.5)*15.+7.,sunXZ,.55);
    rubc=mix(rubc,mix(vec3(.56,.55,.52),vec3(.92,.90,.86),pb.z)*pb.y,pb.x);
    pb=pebble(vec2(tp.x*.94-tp.y*.34,tp.x*.34+tp.y*.94)*8.3+3.,sunXZ,.6);
    rubc=mix(rubc*(1.-.25*pb.x),mix(vec3(.60,.58,.54),vec3(.95,.93,.89),pb.z)*pb.y,pb.x);
    pb=pebble(tp*4.1,sunXZ,.45);
    rubc=mix(rubc,mix(mix(vec3(.66,.64,.60),vec3(.90,.87,.80),pb.z),vec3(.80,.66,.56),step(.85,pb.z))*pb.y,pb.x);
    }
    fringe=mix(fringe,mix(vec3(.74,.72,.68),rubc,nf),rub*.75);
    diffuseColor.rgb=mix(fringe,land,gm);
  }
  if(th<1.3){
    // wet sand near the waterline
    // (wet sand is dark in the air; seen through water the same sand is bright again)
    // only the strip the small waves actually reach (up to about 45 cm above the sea) is wet, and only a shade darker
    // (the damp and soaked sand towards the water is part of `sand`, above)
  }
}
// the clouds' shadows. The sun lamp is already dimmed by however much cloud stands between the sun and the camera
// (32_lights.js); this adds the difference between here and there, so that a shadow's edge can be seen crossing the ground.
diffuseColor.rgb*=mix(.45,1.,texture2D(uCloudShade,vWp.xz/CLOUD_SHADE_SPAN_M+.5).r)/mix(.45,1.,texture2D(uCloudShade,uCam.xz/CLOUD_SHADE_SPAN_M+.5).r);
diffuseColor.rgb*=1.+grit*(th<1.6?.55:1.1);   // fine and faint on the beach, coarser on soil and turf
if(dep>0.){
  // reef flat: dark coral heads and sea-grass beds mottle the sand in the shallows (what makes a lagoon look like one from above)
  float tha=atan(tp.y,tp.x),so=length(tp)-islandR(tha);       // so: metres outside the beach line (negative on the lagoon side)
  if(dep>.6){
    float rf=smoothstep(.6,1.7,dep)*(1.-smoothstep(5.5,7.9,dep));
    float cp=fbm(tp*.17+31.)+.30*(fbm(tp*.95+7.)-.5);
    // coral is scattered heads near the beach and closes up towards the outer edge of the flat, where the swell breaks
    float marg=smoothstep(18.,40.,so)*(1.-smoothstep(46.,53.,so));
    float thr=mix(.55,.64,step(0.,so))-.21*marg;
    float coral=smoothstep(thr,thr+.08,cp)*rf;
    // spur and groove: the seaward face of the reef is ribbed, dark coral ridges with sandy channels between, pointing out to sea
    float gr=.5+.5*sin(tha*280.+3.*noise(tp*.06)+1.6*noise(tp*.33));
    float front=smoothstep(40.,47.,so)*(1.-smoothstep(56.,64.,so));
    coral=max(coral,.62*smoothstep(.30,.55,gr)*front*(.6+.4*noise(tp*.5+11.)));
    coral*=1.-.8*smoothstep(.12,.0,gr)*smoothstep(34.,44.,so);
    vec3 cc=mix(vec3(.30,.25,.17),vec3(.13,.23,.15),noise(tp*.45+3.))*(.6+.8*noise(tp*2.3))*(.75+.5*noise(tp*7.));
    diffuseColor.rgb=mix(diffuseColor.rgb,cc,coral*(.55+.3*smoothstep(1.,3.,dep)));
  }
  // The strip the waves run up and drain off (down to 20 cm below the still sea) is bare sand half the time, so the
  // underwater look starts below it: dw is the depth of water that is always there.
  // Round the coral heads (47_reef.js; its map's green channel) the floor is not sand but old reef: rough pale rock,
  // crusted pink in places, strewn with coral rubble - solid at a head's foot, breaking up into the sand further out.
  vec2 ruv=(tp-TERRAIN_HOME)/300.+.5;
  float apron=texture2D(uReef,ruv).g*step(abs(ruv.x-.5),.49)*step(abs(ruv.y-.5),.49);
  if(apron>.01){
    float rk2=smoothstep(.30,.62,apron+(fbm(tp*.9+5.)-.5)*.8+(noise(tp*3.7)-.5)*.25);
    vec3 rc=mix(vec3(.40,.37,.31),vec3(.68,.64,.56),noise(tp*2.3))*(.66+.68*noise(tp*7.));
    rc=mix(rc,vec3(.76,.58,.60),smoothstep(.55,.72,noise(tp*1.1+9.))*.55);
    vec3 rpb=pebble(tp*4.3+2.,normalize(uSunDir.xz+1e-4),.6);
    rc=mix(rc,mix(vec3(.50,.48,.44),vec3(.88,.85,.78),rpb.z)*rpb.y,rpb.x*.8);
    diffuseColor.rgb=mix(diffuseColor.rgb,rc,rk2*.9);
  }
  float dw=max(dep-.2,0.);
  // under water: sand reads paler, red is absorbed with depth, and the water column adds its own blue-green glow
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.3,.5,.2)))*vec3(1.04,1.04,1.02),mix(.5,.28,lagK)*smoothstep(0.,.5,dw));   // (less so in the lagoon's glassy shallows)
  diffuseColor.rgb*=mix(1.,.87,smoothstep(0.,.7,dw))*exp(-dw*vec3(.36,.085,.045));   // (must start at exactly 1: a step here draws a dark line along the waterline)
  diffuseColor.rgb+=vec3(.0,.075,.13)*(1.-exp(-dw*.9))*uDay;
  // the net of light that ripples throw on the sea floor: the detail texture's lines, read twice and made to wander.
  // Ankle-deep water is too thin to bend the light into a net, so it fades in between 10 and 80 cm; and where the swell
  // breaks the surface is too broken and foamy to focus anything (the water shader also clouds the floor under foam).
  float surfz=smoothstep(33.,40.,so)*(1.-smoothstep(50.,58.,so))*openSea(tha);
  float ca=caus.x*caus.x;ca*=ca*caus.x;
  float ca2=caus.y*caus.y;ca2*=ca2;
  diffuseColor.rgb*=1.+(ca*1.7+ca2*1.3-.22)*smoothstep(.1,mix(.8,.45,lagK),dw)*(1.+.35*lagK*(1.-smoothstep(.5,2.5,dw)))*smoothstep(0.,.45,uWind)*exp(-dep*.28)*(1.-.7*surfz)*uDay*exp(-length(vWp)*.012);   // strongest in the middle of the lagoon, gentler towards the outer reef
}
