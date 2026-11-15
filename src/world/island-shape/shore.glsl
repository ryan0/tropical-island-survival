// The ocean shoreline and beach: the part of the land's shape that the WAVE MODEL depends on.
// It is shared with the program like everything in this folder; island.glsl says what may be written here.
// The water's vertex shader includes it, so it stays small and plain (docs/DEVICE_NOTES.md).
//
// A direction is the angle from the atoll's centre, atan(z, x): 0 east, 90 degrees south (+z), 270 north (-z).

// The ocean shoreline lies ATOLL_RADIUS from the centre on average: ATOLL_STRETCH further out to the north and
// south, as much nearer to the east and west.
const float ATOLL_RADIUS = 150.0;
const float ATOLL_STRETCH = 18.0;

// The pass, measured by how far a direction faces north (0 due south, 1 due north): passGap starts to rise at
// PASS_EDGE (41 degrees either side of north) and reaches 1 PASS_EDGE_WIDTH further on (26 degrees either side).
const float PASS_EDGE = 0.875;
const float PASS_EDGE_WIDTH = 0.075;

// The channel through the sandbar lies in this direction (radians): 255 degrees, a little west of due north.
const float CHANNEL_DIRECTION = 4.45;
// Measured by how closely a direction lines up with the channel (1 straight along it, 0 facing away): its bed starts
// to sink at CHANNEL_EDGE (9.5 degrees off its line) and is at full depth CHANNEL_EDGE_WIDTH further in (within 4
// degrees); the swell starts to fade at SHELTER_EDGE (23 degrees off) and is gone SHELTER_EDGE_WIDTH further in.
const float CHANNEL_EDGE = 0.99314;
const float CHANNEL_EDGE_WIDTH = 0.00564;
const float SHELTER_EDGE = 0.96025;
const float SHELTER_EDGE_WIDTH = 0.02271;

// The distance from the centre of the atoll to its ocean shoreline at still water, in a direction.
// The atoll is a horseshoe: long north-south, open to the north (270 degrees, -z), the swell arriving from the south.
float islandR(float direction) {
  float oval = ATOLL_RADIUS - ATOLL_STRETCH * cos(2.0 * direction);
  // Bays and headlands, so that the shore is not a plain oval.
  return oval + 9.0 * sin(3.0 * direction + 1.0) + 5.0 * sin(5.0 * direction);
}

// The pass: the opening in the ring on the sheltered north side.
// passGap is 0 around most of the atoll, rising to 1 across the opening; the land sinks below the surface as it rises.
// A bias above 0 makes the land give way a little earlier: shoreH uses it to round off the horn tips.
float passGapAt(float direction, float bias) {
  float northness = 0.5 - 0.5 * sin(direction);
  // A smoothstep, written out: when this was written the converter knew neither smoothstep nor clamp.
  float t = min(max((northness + bias - PASS_EDGE) / PASS_EDGE_WIDTH, 0.0), 1.0);
  return t * t * (3.0 - 2.0 * t);
}

float passGap(float direction) {
  return passGapAt(direction, 0.0);
}

// passChannel: 1 along the deeper channel that winds through the sandbar (a little west of due north), 0 elsewhere.
// The distance from the centre makes the channel meander instead of running dead straight.
// A bias above 0 widens it: shoreH uses that to round off the two ends of the sandbar where the channel cuts through.
float passChannel(float direction, float distanceFromCentre, float bias) {
  float meander = 0.05 * sin(distanceFromCentre * 0.05);
  float alongChannel = 0.5 + 0.5 * cos(direction - CHANNEL_DIRECTION - meander);
  float t = min(max((alongChannel + bias - CHANNEL_EDGE) / CHANNEL_EDGE_WIDTH, 0.0), 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// openSea: 1 where the swell reaches the shore. It fades to 0 only around the channel (gone within 15 degrees of it,
// full beyond 23): there is nothing for waves to break on in the channel, and the wave mesh must be level with the
// still lagoon water where the two meet. Everywhere else, the pass included, the swell runs in and breaks on the beach
// or the sandbar.
float openSea(float direction) {
  float alongChannel = 0.5 + 0.5 * cos(direction - CHANNEL_DIRECTION);
  float t = min(max((alongChannel - SHELTER_EDGE) / SHELTER_EDGE_WIDTH, 0.0), 1.0);
  return 1.0 - t * t * (3.0 - 2.0 * t);
}

// The ocean beach as the waves see it: a slope that deepens steadily offshore and levels off inland. The real ground
// (hgt in island.glsl) follows it exactly from 9.5 m up the beach down to about 1 m of water; further out the real
// sea floor differs (reef flat, drop-off) and the waves do not know yet.
// Across the pass the beach only climbs a few decimetres: it is a low sandbar that the swell breaks on and sometimes
// washes over. The channel cuts through it.
float shoreH(float x, float z) {
  float distanceFromCentre = sqrt(x * x + z * z);
  float direction = atan(z, x);
  // metres out from the ocean shoreline (negative inland)
  float offshore = distanceFromCentre - islandR(direction);

  // A parabola through the waterline: u is 1 there and 2 at 55 m out; inland u stops at 0.2, where the beach has
  // climbed to 4.8 m.
  float u = max(1.0 + offshore / 55.0, 0.2);
  float slope = 5.0 * (1.0 - u * u);

  // Rounding the horn tips: the edges of the band of land give way to the sandbar sooner than its middle does
  // (acrossLand is -1 at the ocean edge, 0 along the middle, +1 at the lagoon edge), with a slight wobble so that the
  // end is not regular.
  float acrossLand = 2.0 * min(max(-offshore / 26.0, 0.0), 1.0) - 1.0;
  float tipRounding = 0.075 * acrossLand * acrossLand + 0.014 * sin(x * 0.19 + z * 0.23);
  float gap = passGapAt(direction, tipRounding);

  // How high the beach climbs before it levels off: 4.8 m, or 0.3-0.8 m on the sandbar.
  float top = 4.8 - gap * (4.25 + 0.22 * sin(direction * 23.0 + 2.0));
  float bumps = 0.35 * sin(x * 0.31) * cos(z * 0.27);
  // The channel cuts 3.9 m down. It is a little wider at the edges of the band, which rounds off the ends of the
  // sandbar, with a wobble of its own.
  float channelWidening = 0.009 * acrossLand * acrossLand + 0.0015 * sin(x * 0.23 - z * 0.19);
  float channel = 3.9 * passChannel(direction, distanceFromCentre, channelWidening);

  // (the bumps are flatter on the sandbar)
  return min(slope, top) + bumps * (1.0 - 0.65 * gap) - channel;
}
