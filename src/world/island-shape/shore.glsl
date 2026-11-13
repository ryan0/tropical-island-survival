// The ocean-side shoreline and beach - the part of the land's shape that the WAVE MODEL depends on.
// (Shared with JavaScript like everything in this folder; see island.glsl for the subset allowed here.)
// This file is included by the water vertex shader: keep it small and plain (docs/DEVICE_NOTES.md).

// distance from the centre of the atoll to its outer (ocean) still-water shoreline, in direction th (radians)
// The atoll is a horseshoe: long north-south, open to the north (th = 270 degrees, -z), swell arriving from the south.
float islandR(float th){
  return 150.-18.*cos(2.*th)+9.*sin(3.*th+1.)+5.*sin(5.*th);
}

// The pass - the opening in the ring on the sheltered north side.
// passGap: 0 around most of the atoll, rising to 1 across the opening (the land sinks below the surface as it rises).
// (bias > 0 makes the land give way a little earlier; shoreH uses it to round off the horn tips)
float passGapAt(float th,float bias){
  float t=min(max((.5-.5*sin(th)+bias-.875)/.075,0.),1.);
  return t*t*(3.-2.*t);
}
float passGap(float th){
  return passGapAt(th,0.);
}
// passChannel: 1 along the deeper channel that winds through the sandbar (a little west of due north), 0 elsewhere.
// r is the distance from the centre; it makes the channel meander instead of running dead straight.
// bias > 0 widens it; shoreH uses that to round off the two ends of the sandbar where the channel cuts through.
float passChannel(float th,float r,float bias){
  float t=min(max((.5+.5*cos(th-4.45-.05*sin(r*.05))+bias-.99314)/.00564,0.),1.);
  return t*t*(3.-2.*t);
}
// openSea: 1 where swell reaches the shore. It fades to 0 only around the channel (gone within 15 degrees of it, full beyond 23):
// there is nothing for waves to break on in the channel, and the wave mesh must be level with the still lagoon
// water where the two meet. Everywhere else, the pass included, the swell runs in and breaks on the beach or sandbar.
float openSea(float th){
  float t=min(max((.5+.5*cos(th-4.45)-.96025)/.02271,0.),1.);
  return 1.-t*t*(3.-2.*t);
}

// The ocean beach as the waves see it: a slope that deepens steadily offshore (s = metres outside the shoreline)
// and levels off inland. The real terrain (island.glsl) follows it exactly from 9.5 m up the beach down to about
// 1 m of water; further out the real sea floor differs (reef flat, drop-off) and the waves do not know yet.
// Across the pass the beach only climbs a few decimetres: it is a low sandbar that the swell breaks on and sometimes
// washes over. The channel cuts through it.
float shoreH(float x,float z){
  float r=sqrt(x*x+z*z),th=atan(z,x);
  float s=r-islandR(th);
  float u=max(1.+s/55.,.2);
  // Rounding the horn tips: the edges of the band of land give way to the sandbar sooner than its middle does
  // (e = -1 at the ocean edge, 0 along the middle, +1 at the lagoon edge), with a slight wobble so the end is not regular.
  float e=2.*min(max(-s/26.,0.),1.)-1.;
  float g=passGapAt(th,.075*e*e+.014*sin(x*.19+z*.23));
  float top=4.8-g*(4.25+.22*sin(th*23.+2.));     // how high the beach climbs before it levels off: 4.8 m, or 0.3-0.8 m on the sandbar
  return min(5.*(1.-u*u),top)+.35*sin(x*.31)*cos(z*.27)*(1.-.65*g)-3.9*passChannel(th,r,.009*e*e+.0015*sin(x*.23-z*.19));
}
