// What the sea does to the colour of anything under it, as terrain_color.glsl does to the sand: paler and greyer, red
// lost with depth, the water's own blue-green glow, and the net of light the ripples throw (mostly on faces that look up).
// c = colour, wp = world position, up = 0..1 how much the face looks up, k = how much of the water's greying and
// loss of red to apply (1 for rock; less for living coral, whose colour is the point of it). Needs uLevel, uDay, uTime, uWind, uDet.
vec3 seaTint(vec3 c,vec3 wp,float up,float k){
  float dw=max(uLevel-wp.y-.2,0.),sub=step(.0001,dw);
  vec3 o=mix(c,vec3(dot(c,vec3(.3,.5,.2)))*vec3(1.04,1.04,1.02),.4*k*smoothstep(0.,.5,dw));
  o*=mix(1.,.87,smoothstep(0.,.7,dw))*exp(-dw*k*vec3(.36,.085,.045));
  o+=vec3(0.,.075,.13)*(1.-exp(-dw*.9))*uDay*(.4+.6*k);
  vec2 cq=wp.xz*.34+vec2(uTime*.010,uTime*.006);vec2 cw=(texture2D(uDet,cq*.31+vec2(uTime*.017,-uTime*.013)).rg-.5)*.16;
  float c1=texture2D(uDet,cq+cw).a,c2=texture2D(uDet,vec2(cq.x*.6+cq.y*.8,-cq.x*.8+cq.y*.6)*1.63-cw*1.4).a;
  float ca=c1*c1;ca*=ca*c1;float ca2=c2*c2;ca2*=ca2;
  o*=1.+(ca*1.7+ca2*1.3-.22)*smoothstep(.1,.8,dw)*exp(-(dw+.2)*.28)*uDay*(.35+.65*up)*smoothstep(0.,.45,uWind);   // (no ripples, no net of light)
  return mix(c,o,sub);
}
