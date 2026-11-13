// hash, value/gradient noise and fractal noise (fbm) used by most fragment shaders
float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec2 hash2(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy)*2.-1.;}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  float a=dot(hash2(i),f),b=dot(hash2(i+vec2(1.,0.)),f-vec2(1.,0.)),c=dot(hash2(i+vec2(0.,1.)),f-vec2(0.,1.)),d=dot(hash2(i+vec2(1.,1.)),f-vec2(1.,1.));
  return clamp(mix(mix(a,b,u.x),mix(c,d,u.x),u.y)*.75+.5,0.,1.);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<3;i++){v+=a*noise(p);p=m*p+vec2(3.1,1.7);a*=.5;}return v/.875;}
float fbm5(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p+vec2(3.1,1.7);a*=.5;}return v/.96875;}
