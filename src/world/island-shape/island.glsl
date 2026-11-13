// The shape of the land. THIS FILE (with shore.glsl) IS THE ONLY DEFINITION.
// The build embeds it as the shader chunk "island" and also converts it to JavaScript functions of the
// same names, so the program and the shaders can never disagree about where the ground is.
//
// Keep to the subset the converter understands: float functions of float arguments, float locals,
// + - * / and  sin cos exp sqrt abs min max pow floor atan(y,x).
// Names must be legal in every GLSL version ("flat", "sample", "input", "output", "smooth" are reserved words).
//
// The atoll, from the outside in:   deep sea | drop-off | reef flat | ocean beach | land | lagoon beach | lagoon
// It is a crescent of land around the lagoon; the opening (north) is mostly closed by a sandbar with one channel.
#include "shore"

// Width of the band of land (or, across the pass, of sandbar) in direction th, measured in from the ocean shoreline.
// A crescent: thickest in the south ("home"), tapering along both horns and across the pass, where the same band
// is only a low sandbar (shore.glsl decides how high it stands). Never below 21 m: the wave mesh reaches 9 m up the ocean beach and must
// find the same ground under it that the wave model expects.
float landW(float th){
  return 26.+44.*pow(.5+.5*sin(th),1.6)+4.*sin(5.*th+1.);
}

// smooth minimum: like min(a,b) but rounds the corner where the two meet (k = how wide the rounding is)
float smin(float a,float b,float k){
  float h=max(k-abs(a-b),0.)/k;
  return min(a,b)-h*h*k*.25;
}

// the sandbank in the lagoon
float sandbankX(){return 4.;}
float sandbankZ(){return -8.;}

// terrain height at (x,z)
float hgt(float x,float z){
  float r=sqrt(x*x+z*z),th=atan(z,x);
  float s=r-islandR(th);                 // metres outside the ocean shoreline (negative = inland)
  float v=s+landW(th);                   // metres on the land side of the lagoon shoreline (negative = in the lagoon)
  float vm=min(v,0.);
  // lagoon: a beach that shelves down to a floor at about -6.5 m, with flat-topped patch reefs rising from it
  float mask=min(-vm/25.,1.);
  float reef=min(7.*max(sin(x*.09+1.3)*sin(z*.085+.4)-.4,0.),3.4)*mask;
  float hl=.2*max(v,0.)-6.5*(1.-exp(vm/24.))+reef;
  // land: the ocean beach rises to a low plateau (atolls are flat), which falls to the lagoon beach
  float cap=2.9+.5*sin(x*.13+1.)*sin(z*.11)+.35*sin(x*.31)*cos(z*.27);
  float land=smin(smin(shoreH(x,z),cap,.5),hl,.5);
  // ocean side: where the beach reaches about 1.1 m of water the reef flat begins; 46 m out it drops away.
  float t=min(max((s-46.)/18.,0.),1.);
  float shelf=-1.15-.012*max(s,0.)-9.*t*t*(3.-2.*t)+.1*sin(x*.6+z*.3)*sin(z*.7)-2.*max(-5.-s,0.)-3.*passChannel(th,r,0.);
  float dx=x-sandbankX(),dz=z-sandbankZ();
  float bank=2.2*(1.-(dx*dx+dz*dz)/400.);
  return max(max(max(land,shelf),bank),-9.5);
}
