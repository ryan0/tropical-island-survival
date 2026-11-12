// distance to the footpaths ({{PATH_SEGMENTS}} is written in by 30_terrain.js)
#include "noise"

float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float pathD(vec2 p){float d=1e9;{{PATH_SEGMENTS}}return d;}
