// Vertex shader of the lagoon's shore-wave band (lagoon-shore-band.ts): in a high wind the small waves that come ashore on the
// lagoon's beaches have real height. The band is a strip of water mesh along the lagoon's edge (and round the
// sandbank); this lifts it. The colouring is water.frag.glsl, as for all water.
// Same rules as water.vert.glsl (docs/DEVICE_NOTES.md): position is the only attribute, no out parameters, no
// branching, guarded pow, and the hard limit at the end.
uniform float uTime,uLevel,uWind;varying vec3 vW;varying vec3 vN;varying vec3 vWave;

#include "../shaders/shared/noise"

#include "../world/island-shape/island"

#include "../shaders/shared/lagwave"

// height of the water above its still level at p
float bandH(vec2 p){
  float r=length(p),th=atan(p.y,p.x);
  // metres on the land side of the water's edge: of the lagoon's own shore, or of the sandbank's, whichever is nearer
  float v=max(r-islandR(th)+landW(th),20.-length(p-vec2(sandbankX(),sandbankZ())));
  float d=max(uLevel-hgt(p.x,p.y),0.);
  vec3 lw=lagWave(p,d,uTime);float s=lw.x/LW_T;
  // each wave: a steep face ahead of its crest, a long back behind it, a shallow trough between two
  float crest=lw.y*pow(max(1.-smoothstep(0.,.5,s),1e-4),1.6)+lw.z*pow(max(smoothstep(.62,1.,s),1e-4),2.2);
  float trough=-.11*(lw.y+lw.z)*sin(3.1416*s);
  // it grows as the water shallows, breaks at about a foot of depth and comes on as a low wall of white water;
  // nothing at the band's edges (where it joins the flat lagoon), nor far from the eye (where the band is not drawn)
  float shoal=(1.+.45*(1.-smoothstep(.25,1.1,d)))*mix(.3,1.,smoothstep(0.,.3,d));
  float edge=smoothstep(-13.,-8.5,v)*(1.-smoothstep(.3,2.3,v))*(1.-smoothstep(110.,145.,length(cameraPosition-vec3(p.x,uLevel,p.y))));
  // (crests a hand to a foot above still water, the biggest of a set and on the windward beaches up to 40 cm: the
  // last is a ceiling that the size approaches and never passes)
  float amp=.52*lagEx(p)*lagHi()*shoal;
  return edge*(.5*(1.-exp(-amp*.7*crest/.5))+amp*trough);
}
void main(){vec4 wp=modelMatrix*vec4(position,1.);vec2 p=wp.xz;
  float h0=bandH(p),hx=bandH(p+vec2(.15,0.)),hz=bandH(p+vec2(0.,.15));
/* hard limit: the surface stays within a small range of its still level. If the GPU returns anything outside it (huge, infinite or not-a-number), the vertex is left at rest. */
  float c=clamp(h0,-.5,1.2),ok=(abs(c-h0)<1e-5)?1.:0.;
  vec3 n=vec3(-(hx-h0)/.15,1.,-(hz-h0)/.15);float nok=(abs(n.x)+abs(n.z)<20.)?ok:0.;
  wp.y=uLevel+c*ok;
  vN=normalize(vec3(n.x*nok,1.,n.z*nok));
  vWave=vec3(0.,200.,0.);
  vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}
