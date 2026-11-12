/* Settings you are likely to want to change. (Files are joined in name order, so this one is read first.) */

var BUILD=78;        /* shown faintly at the bottom of the screen and in the debug panel - raise it with every publish */
var WORLD_SEED=1;    /* decides where rocks, plants and props end up; same seed = same island (see rnd() in 05_core.js) */
var WATER_LEVEL=0;   /* height of the still sea surface */

/* The swell: three wave trains wrapped around the island. For each train
     om  angular frequency in rad/s (period = 2*pi/om seconds)
     m   how many crests fit around the island; the sign is the way the pattern turns
     ph  phase offset
     A   amplitude in metres in deep water (the south side gets all of it, the sheltered north side about two thirds)
     g   how quickly the train swells and fades (this is what makes sets)
     c   offset that makes wave size differ from crest to crest and along a crest
     ru  how far its swash runs up the beach, relative to the others
     cu  1 = may plunge with a falling lip when steep enough, 0 = always spills
   The shader (src/glsl/waves.glsl) and its JavaScript copy (36_waves.js) both read this table. */
var WAVE_TRAINS=[
  {om:1.21,m:5,ph:0.0,A:0.46,g:0.090,c:0.0,ru:0.14,cu:1},
  {om:1.61,m:-7,ph:2.1,A:0.13,g:0.117,c:2.1,ru:0.10,cu:0},
  {om:0.885,m:3,ph:4.2,A:0.30,g:0.144,c:4.2,ru:0.12,cu:1}
];
/* The swell breaks on the outer edge of the reef flat. The flat is about 46 m wide (src/shared/island.glsl); the wave
   model treats a line REEF_BREAK metres off the beach as the place where the water runs out, so small waves break
   about 3 m outside it and the biggest about 8 m outside, right on top of the drop-off. */
var REEF_BREAK=40;
/* The castaway's camp (lean-to, driftwood seats, firewood, the campfire and its ring of stones): built but left out of
   the scene for now - the player is to make or mend such things. Set true to see it. */
var CAMP=false;
