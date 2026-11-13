// distance to the footpaths (TERRAIN_FOOTPATHS is a define: a statement for each stretch of path, written by terrain.ts)
#include "../shaders/shared/noise"

float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float pathD(vec2 p){float d=1e9;TERRAIN_FOOTPATHS return d;}
