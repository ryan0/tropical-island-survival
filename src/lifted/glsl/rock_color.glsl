// Rock colour. The mesh brings the rock's own tone and how deep in a hollow each point is (vColor); this adds the
// surface: the detail texture laid on from three sides (so it never stretches) at two sizes gives mottling, grain,
// cracks and pits; tops are bleached by the sun; and the sea leaves its marks - a pale band of barnacles above a
// dark wet band at the waterline, and the water's own tint below it.
vec3 rp=vRp,rn=normalize(vRn),tw=rn*rn;
vec4 dA=texture2D(uDet,rp.zy*{{SCALE}})*tw.x+texture2D(uDet,rp.xz*{{SCALE}})*tw.y+texture2D(uDet,rp.xy*{{SCALE}})*tw.z;
vec2 fq=vec2({{SCALE}}*3.7,.31);
vec4 dB=texture2D(uDet,rp.zy*fq.x+fq.y)*tw.x+texture2D(uDet,rp.xz*fq.x+fq.y)*tw.y+texture2D(uDet,rp.xy*fq.x+fq.y)*tw.z;
vec3 base=vColor*(.66+.68*dA.b);
base*=1.+(dB.r-.5)*{{BUMP}}+(dB.b-.5)*.30;
// cracks: only the strongest lines of the texture's net, and only in patches - a whole net reads as dried mud
base*=1.-{{CRACK}}*smoothstep(.86,.98,dA.a)*smoothstep(.42,.62,dA.b);
// pits: small dark hollows
base*=1.-{{PIT}}*smoothstep(.34,.16,dB.b)*(.4+.6*dA.b);
float hsea=rp.y-uLevel;
base=mix(base,vec3(.72,.70,.66)*(.75+.5*dB.b),{{BLEACH}}*smoothstep(.2,.85,rn.y)*smoothstep(.25,1.1,hsea)*smoothstep(.3,.75,dA.b));
float band=smoothstep(.80,.45,hsea)*smoothstep(-.35,.1,hsea);
// barnacles and oysters: pale crusty specks in clusters (the fine blotches, where the coarse ones allow)
base=mix(base,vec3(.80,.78,.72),band*smoothstep(.58,.72,dB.b)*smoothstep(.35,.6,dA.b)*{{BARNACLE}});
// (wet rock is dark at the waterline; well under water it is not seen as wet, only through the water)
base=mix(base,base*vec3(.62,.66,.58),smoothstep(.30,.02,hsea)*(.4+.6*smoothstep(-.9,-.2,hsea)));
diffuseColor.rgb=seaTint(base,rp,clamp(rn.y,0.,1.),1.);
