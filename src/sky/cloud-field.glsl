// The cloud field: how much cloud there is at any point of the air (see clouds.ts). Distances in km.
// Needs the defines EARTH_CURVE, and SUNSET_LANE and SUNRISE_LANE: the bearings (x, z) along which cloud is kept thin.
uniform sampler2D uN3,uWx;uniform vec4 uCT,uEvo;uniform float uWeather;   // uWeather: how cloudy it is, 0 clear .. 1 the full field
const float I2R=EARTH_CURVE,HB=.8,HT=7.2,SIG=11.,SIGL=5.;
// the noise that fills space: 64 slices laid out 8 x 8, each 66 dots square with its border copied from the far side
vec4 n3(vec3 p){
  p=fract(p);
  float z=p.z*64.,z0=floor(z),z1=mod(z0+1.,64.);
  vec2 xy=1.+p.xy*64.;
  return mix(texture2D(uN3,(vec2(mod(z0,8.),floor(z0/8.))*66.+xy)/528.),texture2D(uN3,(vec2(mod(z1,8.),floor(z1/8.))*66.+xy)/528.),z-z0);
}
// The weather over the spot under p: x = how much cloud grows there (0..1), y = how high its tops reach (km).
// (cloud-field.ts has the same sums for the program: change both together.)
vec2 weather(vec3 p){
  vec4 wx=texture2D(uWx,(p.xz-uCT.xy)/64.);   // (the whole field drifts with the wind)
  float far=length(p.xz);
  // the lane the sun sets down: cloud that drifts into it thins away, so the sunset is never walled off
  // (two lanes: the one it sets down, and the one it rises up)
  float lane=max(smoothstep(.90,.975,dot(p.xz,SUNSET_LANE)/max(far,.001)),smoothstep(.90,.975,dot(p.xz,SUNRISE_LANE)/max(far,.001)))*smoothstep(4.,9.,far);
  // the weather: as it clears, only the strongest parts of the map still grow cloud, then none
  float tall=smoothstep(mix(.95,.60,uWeather),mix(1.06,.74,uWeather),wx.g)*(1.-lane);
  // fair-weather cumulus thin out with distance (or the horizon would be one bank of cloud); the towers do not
  return vec2(max(smoothstep(mix(.78,.36,uWeather),mix(1.,.82,uWeather),wx.r)*smoothstep(0.,.12,uWeather)*.52*(1.-.8*smoothstep(20.,50.,far))*(1.-.75*lane),tall*.95),
              HB+mix(.6+1.5*wx.b,3.4+3.0*wx.b,smoothstep(0.,.3,tall)));   // (a tower's sides rise steeply: a column, not a tent)
}
// How much cloud there is at p (x: 0..1) and how far up its cloud that is (y: 0 at the base, 1 at the top), given the
// weather w there. fine = 0 leaves out the small lumps (enough for working out shadows; cloud-field.ts has
// the same for the program).
vec2 cloud(vec3 p,vec2 w,float fine){
  float h=p.y+dot(p.xz,p.xz)*I2R,hn=(h-HB)/(w.y-HB);   // (h: height above the curved sea)
  if(hn<=0.||hn>=1.)return vec2(0.);
  // flat base, fullest a fifth of the way up, thinning to the top: only the strongest lumps reach it
  float c=w.x*smoothstep(0.,.07,hn)*(1.-.9*smoothstep(mix(.2,.5,smoothstep(2.5,4.,w.y)),1.,hn));   // (towers stay full further up)
  vec3 sp=vec3(p.xz-uCT.xy+uEvo.xy,h*.7)/6.;   // (the shapes are stretched upward: columns that the flat base cuts across)sp.z-=uEvo.z;
  float d=(n3(sp).r-(1.-c))/max(c,.05);
  if(d<=0.)return vec2(0.);
  if(fine>.5){
    // nibble the edges: round lumps left standing higher up (cauliflower), wisps left low down
    vec3 dp=vec3(sp.xy,h/6.)*2.1;dp.z-=uEvo.w;
    float hf=n3(dp).g*.72+n3(dp*3.7).g*.28;
    float er=mix(hf,1.-hf,clamp(hn*5.,0.,1.))*.62;
    d=(d-er)/(1.-er);
  }
  return vec2(clamp(d*2.5,0.,1.),hn);
}
