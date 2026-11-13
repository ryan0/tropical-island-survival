// Coral colour: plain matt colour, mottled, with the sea's tint and the net of light the ripples throw (seaTint,
// as terrain-colour.glsl draws it on the sand). Runs inside three.js's Lambert shader.
vec2 cq=vRp.xz*.34+vec2(uTime*.010,uTime*.006);vec2 cw=(texture2D(uDet,cq*.31+vec2(uTime*.017,-uTime*.013)).rg-.5)*.16;
float c1=texture2D(uDet,cq+cw).a,c2=texture2D(uDet,vec2(cq.x*.6+cq.y*.8,-cq.x*.8+cq.y*.6)*1.63-cw*1.4).a;float ca=c1*c1;ca*=ca*c1;float ca2=c2*c2;ca2*=ca2;
vec2 gq=vec2(vRp.x+vRp.y*.8,vRp.z-vRp.y*.6);vec4 dt=texture2D(uDet,gq*1.9);diffuseColor.rgb*=.86+.28*dt.b+.10*(dt.a-.3);
// close up, the polyps: a fine pitted grain (the detail texture read very small, twice)
float pn=exp(-length(uCam-vRp)*.22);if(pn>.03){vec4 d2=texture2D(uDet,gq*11.),d3=texture2D(uDet,gq.yx*23.);diffuseColor.rgb*=1.+pn*(.42*(d2.a-.35)+.30*(d3.b-.5));}
diffuseColor.rgb=seaTint(diffuseColor.rgb,vRp,.6,.5);
