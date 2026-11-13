// Water vertex shader: moves the wave mesh (uFar=0) and passes the far sea through untouched (uFar=1).
// Read docs/DEVICE_NOTES.md first. The block at the end is the hard limit that keeps a bad vertex from being flung away.
uniform float uTime,uLevel,uFar,uDbg;varying vec3 vW;varying vec3 vN;varying vec3 vWave;

#include "waves"

vec3 dispP(vec2 p){vec4 w=waveF(p,uTime);vec2 iw=-normalize(p);return vec3(p.x+iw.x*w.y,uLevel+w.x,p.y+iw.y*w.y);}
void main(){vec4 wp=modelMatrix*vec4(position,1.);vN=vec3(0.,1.,0.);vWave=vec3(0.,200.,0.);
  if(uFar<.5){vec2 p=wp.xz;vec4 w=waveF(p,uTime);vec2 iw=-normalize(p);
    vec3 P0=vec3(p.x+iw.x*w.y,uLevel+w.x,p.y+iw.y*w.y);
    vec3 Px=dispP(p+vec2(.10,0.)),Pz=dispP(p+vec2(0.,.10));
/* hard limit: a water vertex stays inside a small box around its rest position. If the GPU returns anything outside it (huge, infinite or not-a-number), the vertex is simply left at rest, so no triangle can ever be stretched across the scene. */
    vec3 B=vec3(p.x,uLevel,p.y),d=P0-B,c=clamp(d,vec3(-12.,-2.5,-12.),vec3(12.,4.,12.)),e=abs(c-d);
    float okf=(e.x+e.y+e.z<1e-5)?1.:0.;
    wp.xyz=okf>.5?B+c:B;
    vN=okf>.5?normalize(cross(Pz-P0,Px-P0)):vec3(0.,1.,0.);
    vWave=okf>.5?vec3(w.z,w.w,w.x):vec3(0.,60.,0.);}
  vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}
