# Roadmap

What comes after the refactor (`REFACTOR_PLAN.md`, finished). The order was agreed with Ryan on 15 November
2026; he decides when it changes.

## Next

1. **The breaking wave, pass 1: its timing, on a picture of the sea floor.** How often waves come, sets and
   lulls, speed from depth, the stand-up, the lip under gravity, the landing, and the break running along the
   crest; drawn with today's mesh and shapes. The section below has the design.
2. **A wider reef and a more varied lagoon.** Ryan, 15 November 2026: the waves breaking further from the shore,
   perhaps several breaks; a larger area between the shore and the deep ocean, with more varied depths, for
   exploring, foraging, spear fishing and diving; the lagoon with more varied depth, more interesting to explore,
   possibly larger. Agreed from a proposal, in three batches: the ocean floor (built, below), the lagoon's floor
   (built: its outline kept, so nothing on land moves), then the coral. Ryan, 16 November 2026: the coral is to
   be placed afresh and redesigned, from research into what a real reef holds in each region (`REEF.md`). What
   changes the reef's shape and depth comes first, so that the waves can go on; the rest of `REEF.md`'s order
   follows, with placeholders where they serve.
3. **The breaking wave, passes 2 to 4**: the breaker's own mesh and shapes (what cures the jaggedness); the white
   water and the light through the lip; the weather driving it. After the wider reef, because the mesh depends
   on how far out waves break.
4. **A first piece of the game.** The scene is far ahead of the game. Picking one thing up, with a count on the
   screen, settles the shape of `src/game/` against something real and tries touch on the phone. It may come
   before the wave is built if Ryan would rather have the game move sooner.
5. **Rain.** Light rain, then heavy rain, then storm with stronger wind than "high". It reuses the cloud, light
   and wind systems: overcast sky, darker light, rings on the lagoon, wet sand and leaves, streaks in the air.
   It is also the weather a survival game leans on most: shelter, staying dry, collecting water.
6. **Night.** Close to black today when there is no fire. Moonlight with a phase, stars, a glow on the water.
   The moon is also the reef's clock: most of its food comes on known nights (`REEF.md`).
7. **The ground close up.** Short plants, driftwood, coconuts, things to pick up. The first survival actions
   happen here.
8. **Survival systems.** To be designed with Ryan: needs (thirst, hunger, warmth, rest), gathering, crafting,
   fire, shelter. The castaway's camp behind `CAMP = false` is a starting point for things the player makes.

## The breaking wave, rebuilt

Ryan wants it rebuilt entirely, when other things allow: simpler if possible, and truly realistic. It passes
from afar. What is wrong with it, in his words: mainly its **timing**, and the wave itself is **very jagged and
unnatural**. What follows is the direction talked through on 14 November 2026, not yet a design.

- **Generated from inputs, by the maths real waves follow.** The inputs: the swell's height, period and
  direction, the depth of the seabed, the wind. From them come when and where a wave breaks, how fast it
  travels, and which kind of break it is. The weather then drives the waves with nothing tuned by hand. Today's
  model has these in name with hand-set numbers on top: its main swell arrives every 5.2 s, where ocean swell
  reaching a reef is more often 8 to 14 s apart.
- **The sea is a plain swell with no overhang**, short enough that the program's copy is trivial to keep in
  step. The wave mesh's vertex shader, the dearest code and the most fragile on the phone, gets much simpler.
- **Each breaking crest is drawn by its own mesh**: dense where it matters, with thickness. The jaggedness is
  thought to come mostly from pulling the lip out of the sea's coarse mesh; to be confirmed from close stills.
- **The lip and the white water come from a small family of shapes** chosen by the same inputs and made ahead
  of time, from a simulation or fitted to footage. They are fluid simulation, too dear to work out on a phone.
- **The program need not know the lip's shape**: only whether a wave is breaking at a spot, how big, and at
  what stage. With that, the wave model is one model (step 9 of the refactor plan).
- **Judged against footage.** Videos go in `reference-photos/waves/` and are cut into stills at known times
  (`ffmpeg`); the tests step the scene at exact times, so ours is cut the same way and the two set side by
  side. Timing can then be judged on the desktop. The footage wanted: real time, a still camera, uncut,
  several waves in a row, something for scale; one from the beach, one along the crest.

Realism close to the eye will rest on the white water and the light through the lip more than on the shape,
and that means many passes on the phone.

### A first look at ours (15 November 2026)

The wave as it is today, cut into stills at exact times and drawn in cross-section as the shader shapes it
(one wave on the south-east reef, wave clock 59 to 63 s). No footage yet: where this says what a real wave
does, it is plain physics or common knowledge, to be checked against the footage.

- **Waves come too often.** 14 crests a minute cross the reef's edge, one every 4.4 s, some 1.4 s apart. The
  three trains have periods of 5.2, 7.1 and 3.9 s. Ocean swell reaching a reef is more often 8 to 14 s apart.
- **The wave jumps up.** At the reef's edge its crest goes from 0.4 m to 1.1 m in 0.7 s, within 3 m. From the
  beach, the shore break goes from a thin line to a tall white wall within half a second.
- **The lip hangs, and never lands.** It is thrown, stays a hook for 1.5 s, and fades into the face. Gravity
  would land it in about half a second, and it would strike the water ahead: the white water has no cause.
- **Its speed is right**: 5.2 m/s, what that depth gives with the wave on top of it.
- **The shape has corners.** A notch at the crest where the lip starts; a small wave is a step with a flat top.
  Along the crest it is ruler-straight and one height for tens of metres, and the lip is a white ribbon with
  its facets showing. The white water is flat paint on the surface.

### The footing: the sea floor as a picture (agreed 15 November 2026)

Today the wave model has a sea floor of its own: a beach curve, and a line 40 m out where waves break. The
rebuilt waves read the real one from a picture, so that they break wherever the water gets shallow, whatever is
drawn later.

- **Two pictures.** One holds the depth of the sea floor. The other, worked out from it once, holds how long
  the swell takes to reach each spot; crests are where that time and the clock agree, so they bend round
  shallows and slow over the reef by themselves.
- **What comes of it by itself:** bigger waves break further out and smaller ones further in, so there are
  several breaks; an uneven reef edge makes the break run along the crest; the kind of break follows from how
  abruptly the water shallows.
- **One wave model.** The shader and the program read the same two pictures.
- **The phone can do it.** It reads a picture in the water's vertex shader, bytes or half floats, smoothly
  (`DEVICE_NOTES.md`).

### What the footage shows (15 November 2026)

Eight videos Ryan chose, in `reference-photos/waves/` and described in `LOOK.md`; sheets of stills cut from
them are in `reference-photos/waves/sheets/`.

- **A wave about every 10 s**: two breaks 10 s apart on a windy reef ledge; fronts 8 to 10 s apart in a cove.
- **Sets**: in the cove a big run-up every 25 to 50 s, smaller ones between.
- **The break runs along the crest.** One crest shows unbroken wall, a falling lip and white water at once. A
  crumbling break starts at a peak and spreads both ways. From above, waves break in patches where the reef is
  shallow and pass unbroken beside them. Ours breaks along a whole crest at nearly one moment.
- **Both kinds of break**, crumbling and plunging. Ryan: not every wave has a lip; often a wave crumbles at
  its peak and throws a lip where it abruptly meets a shallower stretch.
- **The lip is a thick falling curtain** that reaches the water ahead, pale and translucent, streaked as it
  falls. **The landing throws up a white mass higher than the wave** within about a second, which rolls on.
- **On the flat the white water is a thin lacy sheet** with a low tumbling front, several lines of it at once.

So pass 1 aims at a wave every 9 to 10 s, sets about every 45 s, a stand-up of about 2 s, and the lip in the
air for about half a second.

### Pass 1: what is built, and the design of the rest

**Built (first half): the two pictures** (`src/sea/sea-floor-pictures.ts`, made once at start-up, about a third
of a second on the desktop; the debug panel says how long on the phone).

- *The floor picture*, 512 dots across 640 m. The depth, averaged over 9 m so that the reef's spurs and grooves do
  not break a wave raggedly; and for each of two swells its delay: how far it has fallen behind a swell crossing
  open sea, from travelling at the speed its depth allows (`wave-timing/timing.glsl`, shared with the program).
  A crest lies wherever a swell's arrival time and the clock agree.
- *The breaks picture.* For four depths (0.7, 1.2, 1.7, 2.4 m), the seconds since the main swell first crossed
  water that shallow on its way to each dot; negative while that is still ahead of it.
- *A debug view* (`sea floor pictures` in the debug panel, best seen flying): depth as colour, each swell's crests
  as travelling lines, red where a middling wave has just broken.

**Built (second half): the wave model on these clocks**, drawn with today's mesh and shapes
(`src/sea/waves.glsl`, `wave-timing/timing.glsl`, `wave-model.ts`).

1. *Where the crests are.* A wave's phase at a spot is the clock less the swell's arrival there. The main swell
   brings a wave every 10 s, in sets of four or five: each wave has its share of the set by its number, and its own
   peaks along its crest. A second, smaller swell crosses it every 7.4 s and never throws a lip.
2. *When each wave breaks.* A wave's height gives the depth it breaks in (it grows as the water shallows and
   breaks at 0.78 of the depth). The four kept depths, read between, give its own seconds since breaking. Bigger
   waves so break further out; small ones cross the flat unbroken and break at the beach; and the break runs
   along a crest wherever the floor or the wave's size is uneven.
3. *The break runs on seconds, not metres* (`stageOf`). Steepening over the last 3 s; standing up over the last 2;
   the lip in the air for as long as gravity takes over its height (0.5 to 0.6 s); then the landing and the white
   water, a stage every 1.2 s. The face, the lip and the white water are sized in metres, whatever the swell's
   length.
4. *The kind of break.* A wave that takes under about 1.5 s over its last 0.6 m of shoaling throws a lip; one
   that takes over 4 s crumbles.
5. *Left as formulas for now:* the swash and its run-up on the beach, the fade up the sand and at the wave mesh's
   edge, how much swell reaches the lee.
6. *One model.* The program reads the same pictures, and the sizes and timing are written once for both
   (`timing.glsl`). The shapes are still written in each; the mirror test (now on WebGL 2, given the pictures)
   finds them 0.06 mm apart on average.
7. *The far sea's shaded swell lines:* the two swells by the same clock, so they run on into the mesh's waves, and
   the shorter lines the open sea had before, further out, for its variety.

Sizes: the swell is one metre (`seaConfig.swells`). A middling wave breaks about 1.2 m high at the reef's edge, a
wave of the biggest set about 1.7 m, with a face up to 2 m; a small one reaches the beach unbroken.

*Known, and left for the passes that follow:* the lip is still a thin hook, and nothing is thrown up where it
lands (pass 2 and 3); as a wave stands up, its face is put together from the water ahead of it, which shows as a
small shelf at its foot for a moment; the white water at the beach is broad when both swells arrive together.

### The wider reef, first batch: the ocean floor (15 November 2026)

The reef off the ocean beach was 45 m of flat and a drop to 9.5 m. It is now about 230 m wide due south and 0.55
of that round the north (`island-shape/shore.glsl` has where each zone begins, `island.glsl` its ground):

| Zone | Metres off the beach, due south | Depth |
|---|---|---|
| The beach's shallows | 0 to 12 | to 0.9 m |
| The shallows | 12 to 45 | about 1 m of sand |
| The gardens | 45 to 118 | 2.3 m, with pools to 4 m and mounds to under 1 m |
| The reef crest | 118 to 145 | 0.65 m: the shallowest, where the white water runs out |
| The fore reef | 145 to 200 | 1.25 m down to 10.5 m, in spurs and grooves |
| The drop-off | 200 to 232 | to the sea floor, now 30.5 m down |

The channel through the sandbar runs on out through the reef, 3.5 m deeper than the reef beside it.

- **The waves needed no change**: they read the new floor from the pictures. The swell stands up on the fore reef
  some 160 m out, throws its lip about 150 m out in two metres of water, and crosses the crest as white water.
  What reaches the ocean beach is small, a hand high: the beach is much calmer than it was.
- **Everything that went by metres off the beach now goes by distance along the reef** (`alongReef`), so that
  the zones lie the same all round though the reef is narrower in the north: the wave mesh's rows, the far sea's
  hole, the swell's fade at the mesh's edge, the spray's look-out, and the water's shading of the surf zone.
- **What grew:** the ground mesh (960 m square, still 2 m squares, so the land is as it was), the wave mesh (out
  to 262 m along the reef: 315 thousand points, from 161 thousand), the pictures (1024 m across, 2 m a dot).
  The phone's frame rate is to be measured again. If it has dropped, the wave mesh's rows are the first thing to
  thin (`waterConfig.waveMesh.rows`), and how near a sector must be to be drawn at its finest.
- **Known, and left for the batches that follow:** the old coral heads stand where they did, now in the
  shallows; the new ground is sand-coloured throughout (the crest and the fore reef want coral and rock, from
  Ryan's references); nothing lives out there yet.

### The wider reef: Ryan's notes on the first batch, and what was done (16 November 2026)

"Overall it is good." On the phone the frame rate fell to about 50 (43 to 60); the longer start-up is no concern.

- *The channel from the lagoon looked unnatural.* It was a wedge that widened to a hundred metres across the
  reef. Ryan then asked whether a channel is needed at all, and what a real crescent lagoon has. On a real reef
  water comes in over the side the swell breaks on and leaves on the sheltered side, so that side is the reef's
  open one; a lagoon's inlet is a channel through sand, and a pass through the reef is another thing. So now
  (`island.glsl`): the inlet through the sandbar stays and ends in a fan of sand outside it; there is no trough
  across the reef; round the north the crest is a sill 2.2 m down with patches of reef left on it; and there is
  one pass through the crest in the west-north-west, a funnel in the gardens narrowing to about 45 m at the
  crest, its sandy floor sinking to 9 m. The pass is the place for currents and big fish later.
- *The lagoon should be drawn as other water of its depth is; only the wind treats it differently.* It had a
  deep-water blue of its own. It now has the ocean's, and the water turns blue over 3 to 16 m of depth, not 3 to
  9.5, now that the sea is 30 m deep. It is sheltered a little less than it was.
- *The reef could be less regular in shape.* Its width now varies all round (`reefShare`), so its outer edge is
  no copy of the shoreline; the zones' edges wander a few metres; and the gardens' mounds are bent out of their
  rows.
- *The patterning on the floor did not look natural.* The fore reef's grooves were evenly spaced stripes. They
  are now narrow grooves between broad spurs, no two the same distance apart, some deep and some faint. And the
  dark coral was painted by a pattern that knew nothing of the floor's shape: it now covers the high ground (the
  mounds, the crest, the spurs) and leaves sand in the pools, the grooves and the channel
  (`reefHighGround`), with pale rock on the crest.
- *The frame rate.* The wave mesh's rows were thinned by about a sixth (from 315 to 274 thousand points).
  To be measured again on the phone; the next things to thin are in the first batch's notes above.

The swell used to be switched off for 15 to 23 degrees either side of the inlet's line, which was a few metres at
the sandbar and had become a broad wedge of the reef with no waves. It is now switched off only at the inlet
itself, and runs again from 25 to 60 m off the beach (`openSeaAt`).

*Deeper water beside shallower looks too different* (Ryan, with a screenshot of a garden mound): the water over a
mound is all but clear, so the mound shows as bare ground with the mesh's flat faces, and beside it the deeper
water is opaque and rippled. Not for now, he says: the water's rendering has much room to improve in general. For
that pass: one model of how water colours and hides what is under it, the same at every depth, and a surface whose
ripples and sheen do not stop where it is shallow.

### The wider reef, second batch: the lagoon's floor, and finding the lost frames (16 November 2026)

- **The lagoon keeps its outline; its floor is new** (`island.glsl`). The beach shelves down as before, so the
  lagoon's shore waves are untouched, then levels off into a shelf of sand 1.6 m down and about 22 m wide, its
  edge wandering. Beyond it the basin lies 3.8 m down (it was 6.5 m everywhere: a lagoon this small is shallow),
  with patch reefs of uneven size standing up to within 0.8 m of the surface, coral on their tops. There is one
  deep hole, 13 m down and 40 m across, north-east of the sandbank, and the floor is as deep as the basin all
  the way along the inlet's line to the sandbar. The coral heads placed themselves afresh on the new floor.
- **The frame rate** on the phone fell from 60 to about 50 with the wider reef, and thinning the wave mesh by a
  sixth brought little back. Two switches in the debug panel found where the time went. With the sea floor left
  without its coral painting nothing changed; with no sector of the wave mesh drawn at its finest the phone was
  back at 60. A sector was a strip from the beach to 262 m out, drawn at its finest whenever any of it was near:
  from the home beach, 123 thousand points. So each sector is now cut across where the reef's zones meet, into
  three tiles (the shallows, the gardens, the crest and outside), and each tile is drawn as finely as its own
  nearest point calls for (`waterConfig.waveMesh`). From the beach the break is drawn at every second point,
  which at 130 m and more cannot be told from the finest in stills; from the reef the waterline is. The same
  view is 45 thousand points, and none of the places tried is over 63 thousand; all at the second level is 28
  thousand, which the phone drew at 60. The `coarse wave mesh` switch stays, for the next time.

### The wider reef, third batch: the reef's shape, from research (16 November 2026)

Ryan asked what a real reef holds in each region before the coral is placed afresh; the answer is `REEF.md`. He
then asked for what changes the reef's shape and depth first, so that the waves can go on, and agreed six items,
which are built (`island.glsl`; `REEF.md` has the sizes and the choices):

- **Two values shared round the rim**, the sea's exposure and whether the reef bulges or curves away, which the
  rest reads.
- **The south crest is a ridge:** high off the reef's bulge, which is where home is, with a bare flat behind it;
  a low arch to east and west, with the gardens close behind. Surge channels cut the high ridge.
- **The fore reef** has flat-floored grooves between spurs, then a step down to a terrace, then the drop.
- **Three storm notches** break the south edge.
- **The pass** has a flat floor, a ridge of coral across it, and a lobe of sand outside.
- **The lee** falls in one wall below the sill, without spurs.

The swell breaks where it did: the spurs' tops slope as the old fore reef did near its top, so the wave mesh's
rows, the spray's look-out and `reefBreak` stand. A notch is a gap in the break. The barrel view is re-aimed 6 m
further out, 0.4 s earlier.

The ground's formula is longer: the program takes half as long again to work it out (the sea floor's pictures
take 650 ms on the desktop, from 520), and the water's shader works it out for every pixel of the wave mesh,
with about a twentieth more trigonometry than before. Ryan read the phone's frame rate again: no different.

Ryan wants a few rounds of refining this shape before the waves go on, and asked for better means of judging it.
Flying now has keys (Space and C for up and down, Shift for speed, the wheel for the pace; F switches it) and
buttons for the same on a phone; `drain the sea` (G) draws the floor without its water, with lines of equal
depth; the debug panel tells the depth under the eye and how far along the reef it is, and has buttons that fly
to the ridge, the notches, the pass and the rest.

The first round of refining (17 November 2026). With the sea drained Ryan found the grooves' outlines angular:
the ground's 2 m squares could not follow their walls. The ground's squares are now cut into four wherever the
shape bends sharply (`src/world/terrain-shape.ts`), which nearly doubles its triangles (332 thousand, from 173
thousand; one number in `world-config.ts` sets how readily). And the shape has more in it: spurs that end at
different places, chutes of sand across the terrace, coral heads on it, a drop-off whose lip wanders, rounded
masses on the walls, ledges on the lee's wall, a fan for the pass's lobe where there was a ramp, and rubble
below the notches (`REEF.md`). The swell breaks as it did.

Ryan, 17 November 2026: improved, and good enough to go on to the waves. The phone is slightly slower for the
triangles, which is no concern for now. The rounded masses on the walls stand as spires where the wall is steep:
interesting, but how they are drawn wants refining later. Two small things came with it: the frame rate now
shows in the corner of the screen without the debug panel, which had grown to cover most of the phone's screen
(a switch in the panel hides it); and the rock painted round a coral head was cut off in a straight line where
the heads' map ended, so the map now reaches past every head.

Still to do of the shape: a lower strip of flat-topped heads and pools behind the crest, and the lagoon's patch
reefs made steep-sided. Then the coral, in `REEF.md`'s order.

### The white water, first part (15 November 2026)

Brought forward from pass 3, because it reads the pictures and so survives the wider reef.

- *Foam left behind* (`foamLeftBehind` in `waves.glsl`). The clocks say when each swell's last three waves went
  by a spot and whether each had broken there, so their foam can lie on for some seconds and thin to lace: about
  8 s to fall to a third behind a big wave, 3 s behind a small one.
- *The landing.* A wave over 0.9 m also throws a brighter cloud well above itself where its lip lands
  (`spray-bursts.ts`). A simple version: the full one belongs with the new lip.

### Ryan's notes after pass 1 (15 November 2026)

"This is working very well and a big improvement." For later:

- There is some weirdness with the waves at the horns of the crescent. Found from his screenshot: sheets of
  water dragged out into long triangles off a horn's tip. The wave mesh can move its water only towards the
  atoll's centre, and round the horns the swell runs along the shore, so a lip there was thrown sideways to its
  wave. Cured by having a wave throw a lip only where the swell heads inshore to within some 25 degrees (the
  floor picture's fourth number): the island's southern two thirds. Elsewhere it crumbles. The breaker's own
  mesh must move along the swell's own heading, which the pictures will then have to hold as a direction.
- Varied swell directions and sizes, several swells from different headings, as part of the weather. The footing
  allows it: a swell's direction is a number, and its arrival picture is made again when it turns.
- The waves do not meet the reef's coral heads naturally: they read the ground only, not what stands on it. He
  means to improve and rearrange the reef; the heads can then be stamped into the depth picture.
- More foam left behind larger white heads and crashing waves: the white water's first part, above.

The order agreed: the white water's first part; then the wider reef, designed with Ryan from a proposal (a map
and a cross-section with sizes); then the breaker's own mesh.

### Pass 2: the breaker's own mesh (agreed 17 November 2026)

The design Ryan agreed, with the reef's shape settled:

1. **A ribbon round the reef, drawn only where a wave is breaking.** Its columns are directions round the atoll.
   Its rows run across the wave's front: the trough ahead, up the face, over the crest, out along the lip and
   back underneath it, so that the lip has thickness. It carries position and nothing else.
2. **It finds its wave from a picture, with no searching in the shader** (`src/sea/crest-picture.ts`): for each
   direction and each moment, how far out the main swell's crest lies, and the way the swell is heading there.
   It is made once at start-up from the swell's arrival times. Round the south, east and west the arrival only
   ever grows towards the shore along a line out from the centre, so there is one answer (two thirds of the
   directions); round the north there is none, and there waves already crumble without a lip.
3. **The lip is thrown along the swell's own heading**, which is the proper cure for the horns.
4. **The shapes are made ahead of time, in a small picture**: the front's cross-section at each stage (standing
   up, lip in the air, landing) for a few sizes. The program builds it from one rule, that the lip is water
   which leaves the crest at the wave's speed and falls under gravity, fitted by eye to the footage. No fluid
   simulation for now; if it is wanted later, a simple one or one worked out ahead of time can be talked over.
   The shader only reads the picture.
5. **The sea's own mesh becomes a plain surface**: swell and white water with no overhang. About a third of the
   wave shader goes, and its fine rows at the break can be thinned to pay for the ribbon.
6. **The program's copy drops the lip's shape**: it keeps where a wave is breaking, how big, and at what stage.

Timing, sets, where waves break, the foam and the spray stay as they are.

The order: the crest picture with a plain line drawn along the breaking crest, to prove on the phone that the
tracking works; then the ribbon with its shapes, the sea made plain and the program's copy; then tuning against
the footage, levels of detail, thinning the sea's rows, and the frame rate.

**Built, the first step:** the crest picture (2048 directions by 128 moments, seven seconds either side of the
swell's crossing of the line its waves break on) and the line (`crest-line.ts`; `breaking crests` in the debug
panel). On the desktop the line rides the wave all round the south, east and west, about a metre behind the
visible lip: it marks where the swell's arrival and the clock agree, and the breaking front leans ahead of that.
The ribbon will spread its rows across that span and take its shape from the wave model at each. The phone is to
say whether it shows and rides the wave there too: it reads three pictures in a vertex shader, one of them
wrapping round.

Ryan, 17 November 2026: the line looks right on the phone and the desktop, and there is little or none of it
round the lee, as the swell's direction would have it.

**Built, the second step's first part: the ribbon itself**, behind a switch (`breaker mesh` in the debug panel,
or B) while it is made good. Off, everything is as it was.

- *The shapes* (`breaker-shapes.ts`): the front's cross-section as a path, from the trough ahead up the face,
  out along the lip's underside, round its tip, back along its top and down the wave's back, at each stage from
  the swell's own crest through standing up, the lip falling and landing, to white water; for a plain wave and a
  hollow one, which the shader mixes. The lip is water that leaves the crest and falls freely.
  `window.__scene.breakerFrontPoint` gives a point of it, to draw beside footage.
- *The mesh* (`breaker.ts`, `breaker.vert.glsl`, `breaker-state.glsl`): 40 rows across the front, a column every
  1.2 m along the crest, round the arc where the crest picture finds a crest (from the north-east round through
  south to a little north of west): 38 thousand points in 20 pieces, a piece out of view not drawn. It finds the
  crest as the line does, asks the wave model how far the wave's breaking has gone and how high it stands there
  (the model's own sums, written again for the main swell alone: they must be kept the same until the two are
  made one), and reads its row's place from the shapes. It is coloured as all water is.
- *The sea under it* (`waves.glsl`, while `uBreakerDrawn` is 1): throws no lip of its own, sinks its crest out
  of the mesh's way as the wave stands up, and lets a wave throw a lip anywhere in the mesh's arc, whichever way
  the swell is heading, which the sea's own lip could not do.

On the desktop the face is smooth where the sea's own was faceted, the lip is a sheet with two sides that peels
along the crest, and it lands into white water. Still to do in this step: the look of the lip and the white
water against the footage; the mesh's edges where it meets the sea; the sea's own lip taken out for good, and
the program's copy with it; levels of detail. The phone is to say what 38 thousand more points cost, and whether
the ribbon tears or flickers.

Ryan, 17 November 2026, from the phone and the desktop: it looks good, with room to refine and no major fault in
how it is drawn, and the phone's frame rate is the same. The main fault: the change from flat sea to wave was
too sudden, as if the wave had an edge. It had: the sea sank its own crest under the mesh, so the mesh was the
whole wave, a tube lying on flat water, and it ended in a crease on both sides and at each end along the crest.

**The join, reworked.** The wave is now one surface drawn by two meshes that share it.

- *The sea keeps the wave's back*: a slope three front heights long, rising towards the crest (`waves.glsl`,
  while the mesh is drawn). The mesh's own back lies a hair over the first of it and then dips under, so there
  is no line where one ends.
- *Under the mesh the sea falls away smoothly* to the trough, with no step for its coarse rows to draw raggedly;
  ahead of the crest it is the trough, which the face's foot runs into level.
- *A wave that throws no lip leaves the mesh hidden in the sea*: its face flat under the trough, its lip folded
  away at the crest. As the wave stands up the mesh comes out by the same share as the sea's back rises, so the
  face grows out of the swell, and tapers away along the crest where the lip does. A lip that has landed sinks
  into the trough where it fell and does not draw back up. Nothing is sunk out of sight any more except where
  there is no crest to follow.
- *The mesh stands on the second swell too*, as the sea's wave does; without that its crest stood a hand above
  or below the sea's back.

Ryan, 17 November 2026, on the reworked join: better; the join could still be improved, but the plan comes
first.

**Built, the second step's second part: the sea made plain, and the front fitted to the footage.** The mesh is
now the only breaking front there is.

- *The sea's own lip is gone* (`waves.glsl`): its hollow face, its lip, their push towards the shore and their
  foam, some sixty lines of the shader. The sea draws swell, the back of a standing wave, the trough drawn down
  to the face's foot, and white water. A wave throws a lip anywhere in the mesh's arc; the rule that it must be
  heading inshore, and the floor picture's fourth number that it read, are gone with the lip that needed them.
  `breaker mesh` in the debug panel (B) now hides the mesh, to see what the sea does under it.
- *The program's copy* (`wave-model.ts`) knows the standing front from above: the back's slope up to the crest
  and a plain face down to the trough. It is told the mesh's arc. The test that compares the two copies still
  does so with the standing up switched off in both.
- *The landing* (`burst` in `breaker-shapes.ts`): where the lip comes down it throws up a white mass, higher
  than the wave within a second (1.05 to 1.3 front heights, the more for a hollow wave), which runs on ahead of
  the crest, settles over the next second and a half and sinks into the sea's white water. The mesh's shader
  makes it billow: its height and reach vary along the crest in lumps a few metres long that keep changing. It
  is shape only, drawn by eye from the footage; there is no rule of falling water for it.
- *The front stands as high as the wave was when it broke* until it has collapsed. It used to take the white
  water's falling height from the moment of landing, which shrank the mass as it rose.
- *Where mesh and sea cross, they cross at a clear angle.* The face now starts under the sea ahead of its foot
  and comes up through the trough; the mesh's back runs a little over the sea's and then dives under it. Two
  surfaces meeting at a shallow angle met in a ragged line, which the sea's coarser rows would have made worse.
  The trough is drawn down to the foot over eight metres, not five.
- *Levels of detail* (`breaker.ts`): each of the 20 pieces has three shapes, 40 rows by every column within 70 m
  of the eye, 28 by every second within 200 m, 18 by every fourth beyond.
- *The sea's rows at the break are thinned*, from 0.24 m apart to 0.57 m: 72 rows fewer of 427, which is 46
  thousand points at the finest level, more than the whole ribbon adds. The rows further in lie where they did.

On the desktop: from above, a green wall with a line of white bursting along it as the break runs down the
crest, close to the drone footage; from the reef flat, the wall with white heaps rising over it. The white mass
is still a smooth white shape close to, like a snow bank: its look, the light through the lip and the streaks on
the face belong to pass 3. The phone is to say what the frame rate is now, and whether the mass reads as water
in motion.

Still to do in this pass, as it stood then: the model's sums for the main swell written twice in the shaders,
the join, and the ends of the mesh's arc. (The sums were made one and the join worked on in the passes at the
water's look, below.)

Ryan, 17 November 2026, from the phone: the frame rate is slightly better or the same, and the breaker mesh
looks good. The most obvious fault is still the join between sea and wave, seen from above at a wave's shoulder,
where the front stands out of pale flat water as a dark blade. The rest can be refined, and the water's shading
as a whole could be much better, which would carry over to the wave.

What makes the blade (tried on the desktop): `water.frag.glsl` colours water by its depth, and then by rules of
its own for a wave: a glow by how high the water is lifted, and a dark wall wherever the surface is steeper than
some seven degrees. The mesh's face falls under the wall rule and the sea beside it does not, so the colour
jumps where the shape does not. With that one rule switched off the blade is gone; fainter bands remain from the
rules that go by height, and creases from the shape itself.


### The water's look: the order agreed (17 November 2026)

Ryan wants the wave, the ocean and the water's look as a whole improved, and agreed this order:

1. **One rule for the colour of water.** Colour and clearness by how much water the eye looks through, in place
   of the separate rules for a wave. Behind a debug switch while it is judged.
2. **The surface.** Ripples laid along a steep face, not smeared down it; the sky's mirror and the sun's sheen
   showing the swell's hump.
3. **The join's shape, judged again** once colour no longer exaggerates it; the wave model's sums, written twice
   in the shaders, made one.
4. **White water**: the burst, the white water running in and the lace as one treatment; spray off the burst and
   the lip.
5. **Light through the lip**, most of which should fall out of step 1. Then the weather pass.

He asked that the references be used: the footage, and photos of water at real atolls (`LOOK.md`, "Water at real
atolls").

**Step 1, first pass** (`water.frag.glsl`, "How much water the eye looks through"; behind a switch in the debug
panel until Ryan had judged it).

- *The rule.* The ray from the eye bends as it enters the water and runs on to the floor. How far it runs
  through water is turned into a depth: the depth of flat water that would show as much. On flat water that is
  the depth itself, whichever way the eye looks, so the lagoon and the flat sea are coloured exactly as before.
  Where a wave tilts the surface towards the eye the ray runs more nearly level, through more water: deeper
  colour, less of the floor. Where the water has a far side, which the mesh's shader says for the front of a
  breaking wave and its lip (`vWaterBehind`), a ray running level comes out of it again, and the eye sees the
  light behind the wave through that much water: pale through a sheet, cyan through a metre or two, nothing
  through seven.
- *What it replaces*: the green glow by how high the water is lifted, the dark wall wherever the surface is
  steeper than seven degrees, and the opacity that went with each.
- *On the desktop*: a wave's face goes from deep blue at its foot through turquoise to bright aqua at the top,
  as in the photos of Teahupo'o, where the old rules gave a flat green wall; seen from above and behind, the
  wave is a hump of the same water as the sea, with no dark blade.

**What the join turned out to be, and what was done about it.** The colour rule alone did not remove the edge on
the wave's back. Measuring showed three more causes, each now dealt with, and each of which holds for the old
rules too:

- *The water was drawn twice.* The sea and the mesh are both see-through, and where the mesh lay over the sea
  the water came out twice as deep in colour. The mesh is now drawn first into the depth picture alone
  (`breaker-depth.frag.glsl`), which keeps the sea from being drawn under it; then the sea; then the mesh in
  colour.
- *The mesh's back and the sea's back were different shapes while the wave stood up.* Each mixed its own resting
  shape with the same standing shape, and the resting shapes differ, so for the two seconds of standing up the
  mesh met the sea as a steeper facet. The mesh's back now rides on the sea's own surface: its shader asks the
  wave model for the sea as it would be if it did not sink out of the mesh's way (`mainSwellNotSunk`,
  `SEA_NOT_SUNK_UNDER_MESH`), and the shapes picture says only how far over that the back lies. It is shaded
  with the sea's slope, not its own dive under the sea.
- *The mesh had no foam but its own.* It now wears the foam the sea has where it stands: the patchy foam of the
  break and what waves gone by have left.

Ryan, 17 November 2026, from the phone: definitely better than before. He merged it, agreed that the new rule
become the only one, and asked for the next steps and for more passes against the references while he was away
for five hours.

**A pass at each of the five steps** (branch `water-look`, 17 November 2026). Judged on stills from a fixed set
of views beside the references, and towards the end on films: the waves' clock stepped a thirtieth of a second a
frame, each frame drawn by the software renderer and the frames put together at thirty a second. A film shows
motion as it would be at a steady frame rate, which stills cannot; it says nothing of the frame rate the phone
reaches. (The script that makes them is not in the repository yet.)

*Step 1, finished.*

- The rule is the only one. The old rules for a wave, the lagoon's shore band's own greens and the switch are
  gone; the band is coloured as all water is.
- Light comes through the upper part of a wave, where it is thin: freely through 0.9 m of water, not at all
  through 3.4 m (`LIGHT_COMES_THROUGH`), which on a wave a metre and a half high is the top half glowing and the
  lower third a wall, as deep in colour as the water it stands in. (In the first pass most of the face glowed
  alike, with an edge where it stopped; a narrower band was tried too, and made the wave a dark wall with a
  bright rim.) Looked at towards the sun the light is brighter, with the sun behind the eye dimmer. A wave over
  the shallow reef is never as dark as the open sea (`LEAST_WAY_DOWN`).
- The sea's own waves let the light through their tops too: the shore break, the white water's front, a swell
  standing up. The sea's mesh does not know a wave's thickness, so it goes by a rough rule: the higher the water
  stands, the thinner the wave (`waterBehindWave` in `waves.glsl`).
- A ray mirrored well down, under a lip or off a face seen from above, meets the sea: there the surface mirrors
  water like itself, not the sky. The underside of the lip had been streaked with sky.
- *The mirror and the floor.* Looked along from far off, the mirrored sky now hides the floor: from some 7 to 30
  times the eye's height away (`MIRROR_HIDES_FROM`). Nearer, it only tints the water, as it always did, and
  clear shallows stay clear. It was tried everywhere first, which is the physics; it turned the reef flat and
  the water's edge, both matched to Ryan's photos, busy and blue, so it was drawn back to the distance, where
  the photos taken at water level show it.

*Step 2, the surface.*

- Fine lines run up a wave's face, tilting it and shading it, where the ripples laid on from above were smeared
  down it in bands (`faceLine`).
- The sun lights a slope turned towards it more than flat water and one turned away less, which shows a swell's
  shape from above (`SUN_ON_SLOPES`); not a breaking wave's face, which is lit through its back.

*Step 3, the join's shape.*

- *The front grows out of the swell.* The shapes picture now holds only the front of a wave that has stood up. A
  wave that has not, or that throws no lip, has no front: there the mesh lies just under the sea's own surface,
  which its shader asks the wave model for, and each row goes from there to its place on the front as the wave
  stands up (`standsUpBy`, shared with the sea's own standing up). Before, the mesh had a resting shape of its
  own, which came out of the swell as a facet.
- *The standing wave's back is longer and runs out level at its foot*: 5.5 front heights, where it was a ramp of
  3 that began abruptly (`BACK_LENGTH`; the program's copy has the same).
- *The sums are written once.* The mesh's shader asks the sea's own `waveOfTrain` for the front's timing and
  heights (`part`), and `breaker-state.glsl` holds no sums of its own. No picture changed.
- *The face has no edge at its foot.* It came up through the sea at an angle, which made a crease where the pale
  trough ended and the face began. The path now runs in along the trough for a front height ahead of the foot
  and curves up from there (`RUN_IN` in `breaker-shapes.ts`), and the mesh's low rows lie on the sea's own
  surface, a little over it, as its back does (`frontOnTheSea` in `breaker.vert.glsl`): the trough curves up
  into the face. The mesh measures its distance off the beach as the sea does and slopes its low rows as the sea
  slopes, so its leading edge on the trough does not show. (The mesh had been asking for the sea as it would be
  if it did not sink under the mesh, which ahead of the crest was a plateau as high as the crest; it is now
  given the trough there.)
- What is left of the join: nothing found on stills or films from the desktop. The phone is to say.

*Step 4, white water.*

- *The landing.* The landed lip becomes the white mass within a tenth of a stage (it was a third: on the way the
  mesh folds through itself, which showed as a slab). The mass is thrown up, fast at first and slowing to its
  highest, and whitens from where the lip landed back to the crest. As the lip lands it is torn a little, all of
  it.
- The billows of the mass are 7 m and 15 m long (they were 3 m and 1.5 m, which the mesh's columns drew as a row
  of peaks), and it settles sooner.
- Foam on steep water has a pattern of its own, laid along the shore and up the water's height and drawn out
  into streaks the way the water falls; the patterns laid on from above were smeared down it. Piled-up white
  water is lit as a heap of lumps, with the hollows between them in shade.
- The top of the mass is torn into tufts, and its foot into lace where it runs out over the sea
  (`torn-edge.glsl`): both of the mesh's drawings leave the gaps out. The top is torn only for an eye that sees
  it from the side, against the sky; nothing is torn beyond 110 m, where the tufts would be smaller than a dot
  of the screen and only glitter; nor from under water, where the gaps showed as a net of dark threads.
- *At the last the mass breaks up* into tufts and lace and is gone, and only then sinks back under the sea.
  Sinking while it still showed, it crossed the sea's surface at so shallow an angle that the two showed through
  each other.
- *The mass is lit as a cloud is* (`vWhiteMass`, and "The white mass" in `water.frag.glsl`). It had been lit as
  foam on water is: the ripples laid on from above were smeared down it in streaks, water showed through it in
  specks, and its shade was the blue-grey of thin foam, which together read as ice. It now has round lumps of
  its own, a metre across with smaller ones on them, laid along the shore and along the mesh's own
  cross-section; it is bright where they face the sun and a pale shade where they turn away and in the hollows
  between; and no water shows through. The same smearing is gone from the sea's own steep foam.
- The mass's foam thins from its highest place back to the wave's crest and back, where it is foam left lying
  and not white water thrown up: seen from behind and above the mass ends in lace, not in an edge.
- *Spray along the crest* (`spray.ts`, `throwFromTheCrest`). The spray looked for breaking water at 170 spots
  scattered over the reef, few of which fell on the narrow line where a lip lands. It now also looks at 48 spots
  along the crest itself, which the crest picture gives the program as it gives the mesh (`crestOutsideLine`),
  and throws droplets and small clouds of mist from the top of the white mass, on with the wave. They draw from
  a random stream of their own, so the spray there was, and the surf's sound, are as they were. `crest spray` in
  the debug panel switches it off, to read what it costs: some hundreds of small sprites of mist beside a
  breaking wave.

*Step 5, the lip.* It whitens from its tip back towards the crest, where it stays a clear sheet until it lands;
its edge frays as it falls, more the further it has fallen; its underside is glassy.

*What it costs.* The three readings of the detail texture that steep water needs are compiled only into the wave
mesh and the breaker's mesh (`WATER_STANDS_STEEP`, `WATER_HAS_TORN_EDGE`): the far sea and the lagoon, which
fill most of the screen, read nothing more than before. The breaker's shader now runs `waveOfTrain` five times
for each point (it was three, and two shorter sums). New to the phone: a fragment discarded by a texture, in the
mesh's two drawings.

For the phone: the frame rate at the reef's edge; if it has dropped, which of three switches in the debug panel
brings it back (`crest spray` off, `plain steep water` on, `breaker mesh` off); whether the white mass reads as
water in motion, and whether its torn edges shimmer; whether the fine lines on the face crawl; the join from the
angle of Ryan's screenshots.

Seen and left: close to, the white mass is a soft heap, more a cloud bank than tumbling water; from under water
the mesh's foot shows as a ledge on the surface (as it did before these passes); the lip's underside, seen from
inside the tube, is a flat bright sheet; where a trough bares the tops of the reef's spurs, foam and ground show
through each other in stripes (the water's edge, where the water's formula and the ground's triangles disagree:
a hard rule's own ground). At night the white mass is a dim warm brown, as all foam is at night: more of it
shows now.

### The water's surface (17 November 2026)

Ryan's verdict on the five steps, on the phone: "This is much better." What he asked for next, with five
reference photos (`docs/LOOK.md`, "The water's surface"): the gaps above the reef's props; the skybox showing
through the water; the surface looking wrong where the floor goes quickly from shallow to deep; water that
feels real and less like "a thin pane of glass/ice", though still seen through; and more shared between the
lagoon and the ocean, the lagoon's way of breaking carried over to the ocean's shore where it fits. Done in one
sitting of two hours, on the branch `water-surface`, judged on stills beside the references and on three short
films.

**Three faults.**

- *Gaps above coral heads.* The water turned clear in a patch straight above a head, from the reef's map. A
  head is under the water, not on it: seen at a slant the patch lay beside the head, on the eye's far side of
  it. The head is now looked for along the line of sight, at four depths, and the water is as deep as where the
  line meets it (`water.frag.glsl`). The looks are never further apart along the line than a dot of the map,
  so at a low angle they reach only the head's top, which is all of it that shows from there.
- *The sky through the water.* It did show: drawing the sky magenta showed where. Everything under the water is
  drawn straight on behind the surface, not bent down as water bends the eye's line. So where the eye looked
  level over the reef's edge, or through a wave standing in the shallows, clear water had no floor behind it:
  only the sky. Water now hides what is behind it wherever the line of sight, followed on 16 m, is still above
  the floor the waves know. A film of water over a bared reef top still shows that top, except within a couple
  of metres of the top's far edge, where the film was a window too.
- *Shallow to deep.* The plan guessed that the surface itself stepped where the floor drops. It does not: the
  waves already feel a floor averaged over 10 m. What Ryan's screenshot shows is the groove between two reef
  tops that a trough has bared: clear water over the tops, and between them a pit with hard-edged walls. Three
  things were wrong there. Ground under water was lit as ground in air is, so a wall that faced away from the
  sun was a dark seam and one that faced it a bright facet; it is now lit as if it lay more nearly level, since
  under water the light comes from all round (`terrain.ts`). Water was coloured by the depth straight under each
  dot of it; it is now coloured by its depth averaged over some metres round, and, where the eye looks low, by
  the depth further on along its line: so the deep water beside a bank is lit by the bank, and the shallow water
  before a drop darkens towards it. And the clear water at a groove's edge had the sky behind it (above). The
  same goes for the edges of the pass, the notches and the lagoon's hole. Tried close to the place of Ryan's
  screenshot at three times of day: the pit showed in the merged build, and is a level band of water now. The
  bright facet of his screenshot did not show in mine, where the same wall was dark, so the phone must confirm
  it.

**Water that reads as water.**

- *The net of light* on the floor is half as bright again, its meshes half as large again, and uneven: bright
  where the small waves gather the light, faint where they spread it. It was one even mesh of thin lines, a
  crackle glaze, where the calm-water reference has a few bold ones. The small waves that move it cross the
  floor at half a metre a second, three times as fast: slower, the net sat on the floor like a print. It is
  fainter in a calm, not gone, and stronger than it was on the ocean's reef flat. It is written once now, for
  the sand and for the rocks and coral (`shaders/shared/light-net.glsl`).
- *The floor swims.* The sand's markings shift under the small waves, up to a hand's breadth in water over a
  metre deep. It stands in for the bending of the eye's line by the ripples, for the floor only: props, the
  ground's shape and shadows stay where they are.
- *The mirror* begins nearer the eye, at 73 degrees from straight down where it was 81 (at 60 it hid the aqua of
  the shallows from the beach, which the atoll photos keep for a long way out), and ruffled water mirrors more
  than smooth at a middling angle: a gust is a patch of the sky's deeper blue lying on clear water, a slick a
  window to the floor. Close to the eye, and far off, it goes by every ripple; between, by the broad ripples
  alone, so the sky and its clouds lie on the water in soft shapes: going by every ripple there, it was a
  speckle of sky and floor in a breeze. It mirrors the sky from a little higher than a true mirror would, so the
  sea far off is a deeper blue than the sky's foot and not a pale sheet.
- *Foam.* Where a sheet of foam is thin the water under it shows through; it was painted solid in thin foam's
  colour. A sheet lying on the water is shaded as nearly flat; tilted by its pattern, half of it stood in its
  own blue-grey shade. The two together read as snow with pools in it.

**Lagoon and ocean.** One shader colours both, by one rule; ripples, mirror, foam and now the net of light are
each written once. What is still written twice is how small waves come ashore: the lagoon's wind waves
(`lagwave.glsl`: drawn by the sand, the water and the shore band) and the swell's swash on the ocean beach
(`waves.glsl`, `timing.glsl`: drawn by the wave mesh). **Proposed, not begun:** where the swell does not reach,
the ocean's shore takes the lagoon's small waves. That needs two things agreed first. There is no such place
yet: the swell is never under two thirds of its size, even in the atoll's lee, and no day is flat (the weather
pass). And `lagwave.glsl` takes every beach to face the lagoon.

*What it costs.* Every dot of water reads the waves' picture of the floor twice more, and near a coral head the
reef's map four times, and works out a second normal for the mirror; a film of water with no floor beyond it
works out the island's formula once more; the ground reads nothing more. `plain water depth` in the debug panel
compiles the sea and the lagoon without all of that. `quicker ripples` runs the surface's ripples nearly twice
as fast: they drift at a tenth to a quarter of a metre a second, which may be part of what feels still, and only
the phone can say.

For the phone: whether the coral heads' gaps are gone from where Ryan saw them; the sky through the water, from
his screenshot's place; the frame rate in the lagoon and at the reef's edge, with `plain water depth` on and
off; whether the net of light and the swimming floor read as water moving or as a jitter; `quicker ripples`,
on and off; whether a sheet of foam still reads as ice.

To judge first: the net of light. It is much bolder than it was, in the lagoon above all, and the lace of the
foam on the lagoon's sand shares its pattern, so that is coarser too. Its brightness and the size of its meshes
are `NET_OF_LIGHT` and `NET_ROUNDS_A_METRE` in `light-net.glsl`. Coral heads' tops are paler: the water over
them is now clear down to them.

Seen and left: a table coral that reaches out past its head's top is still tinted as deep there, since the map
knows only the head; a rock or a small coral standing up from the sand is tinted by the depth of the sand beside
it, not its own, since the water cannot tell what lies behind it; from wading height a head some way off is a
pale patch, the sky's mirror over its pale corals; the foam's shade is still blue-grey where white water is
piled up; from an eye a metre above the sea, a hairline of sky can still show along the far edge of one
bared reef top (found with the sky drawn magenta: against the real sky it is the water's own pale colour by
day).

**Left out, to agree:** bending what is seen through the surface. It is the largest step left towards the
calm-water reference. It means drawing everything under the water to a picture first and having the water read
that picture a little to one side, which changes how a frame is drawn: a second pass over the scene's pixels,
and no smoothing of edges in that pass on the phone. It would also end the sky showing through, at its cause.

### The water's surface, second sitting (18 November 2026)

Ryan, on the phone, of the first sitting: "much better but still I think could use much improvement". He asked
for many passes against his references and new ones, checks in different weather, and performance passes as
needed (a simplification only where it improves the look), over eight hours away. Done on the same branch,
`water-surface`, in some three and a half hours of work: the sitting stood still for four and a half hours in
the middle, for a reason not known. Judged on stills at the phone's own size (1370 by 620 dots), on a board of eleven views
in eight kinds of weather drawn again after each batch, on short films, and beside the photos: Ryan's five and
27 more gathered from Wikimedia Commons for water in weather (`docs/LOOK.md`, "Water in weather").

**The net of light is the real thing now.** It was the detail texture's net of lines, which is a pattern of
cells: every line as bright as the next, every cell closed. It is now worked out once at start-up by following
the sun's light down through a field of small waves to the floor (`shaders/caustics-texture.ts`): where the
waves crowd the light together the floor is bright. The lines are long and flowing, since most of the waves run
one way, as ripples do; they branch and join, swell and fade; and between them the floor is a little darker.
The picture holds the light at three depths. In ankle-deep water the net is a soft dapple; from knee to waist
deep it is thin bright lines; deeper, the lines double and broaden. In the shallows it is fine and in deeper
water broad. A second reading, turned and finer, makes the first uneven without crossing it.

- It is the sun's light, so it brightens only what the sun lights: there is none inside a shadow, and none under
  a cloud. It was multiplied into the colour of the ground, and lay across the shadow of a palm
  (`shaders/sunlight-under-water.ts`).
- A shadow under water is a third lighter than one in air, since water scatters the light into it.

**The mirror goes by every ripple.** A ripple's far side, turned from the eye, is a streak of sky; its near
side, turned to the eye, is a window to the floor. The mirror used to begin at one angle of the eye's line to
the flat sea, so clear water ended at a line across the lagoon, with blue beyond it. Now the streaks of sky
begin a few metres out, few and thin, and crowd together with distance, as in the calm-water photo. Over bright
sand a metre deep the floor's light still drowns the mirror for a long way out, as the atoll photos show; over
a floor four metres down the mirror wins much sooner, and the lagoon's basin is a deep blue. Three things went
with it:

- The mirrored clouds go by the broad ripples alone. Each small ripple mirrors its own bit of sky, and where
  that was now a white cloud and now blue, a breeze was a speckle of white dashes.
- Ruffled water mirrors the sky from higher up, where it is deep blue: so a gust is a band of dark blue on clear
  water, as in the photo of the shallows under palms. Mirroring the sky's pale foot, the streaks were there but
  could not be told from the sunlit shallows they lay on. (Not on a wave's face, where a gust's patch of sky
  read as a smear of cloud across the wave.)
- The sea mirrors the sky's own colours at golden hour and in the evening: its warmth, its fire towards the sun
  and its mauve away from it, and the sun's broad glow as a wide pale path. The sky's gradient is written once
  for the sky and the sea (`sky/sky-gradient.glsl`); the sky is drawn dot for dot as it was.

**The ripples run at the speed real ones do.** They drifted at a tenth to a quarter of a metre a second: over
two seconds of film the surface hardly changed, which is a pane of glass. They now run at 0.4 to 1.1 metres a
second, the longer the faster. Foam left lying by a wave keeps a slow pattern of its own, on the two meshes the
waves move. A light air ruffles the water nearly as steeply as a breeze, in the same ripples (it left the lagoon
a smooth sheet); a calm keeps a slow low swell of the broad ripples, so that the sky lies in it in long shapes;
sheltered water keeps the stride-long ripples, which are what show ten metres out and beyond.

**What lies under water sways.** Each broad ripple that passes bends the eye's line, so things on the floor
shift a little: three centimetres for each metre of depth in the usual breeze, less in a calm. The scene is not
drawn through the water, so the sway is given to the things themselves: the ground, the rocks and the coral
move together in their vertex shaders (`shaders/shared/sway-under-water.glsl`). It replaces nothing: the
floor's markings still swim as well.

**The sun sparkles on it.** On the ripples that are drawn ride finer ones, and now and then one is tilted just
so and flashes the sun: thick under the sun, thinning to a few points far to either side. Those few points are
what show that clear water has a surface. A sparkle is a few dots of the picture across at any distance (at one
size for all, the near ones were blots and the far ones a snow of specks). The sun's and the moon's glints are
drawn at full strength over clear water; they were drawn as faintly as the water they lay on. On glassy water
the sun's whole image is small and bright, where it was a white blot a pace across.

**In weather.**

- *Night.* The moon on the water was one broad patch of white, a floodlight on ice. It is glitter round the
  moon's own small image now, with a faint sheen about it.
- *A high wind on sheltered water.* The white horses of the lagoon and the reef flat were long white ribbons
  lying on the water. The stretches of a crest that break are a third as long there, and their foam is lace.
- *Low sun.* Above. In a breeze at sunset the sea is dark blue under an orange sky, as in the photo of Heron
  Island's; in a calm it is a pale mirror.
- *Cloud.* The game's fullest cloud is broken cloud with blue between, not a grey sky: a grey day, and rain, are
  the weather pass's. Under a cloud's shadow the net of light and the sparkle go, and the mirror hides more.

**Foam on the sand.** On the thin sheet of water that runs up the ocean beach foam was a white sheet with a few
pools in it. It is lace there until it is thick, with the wet sand showing in every mesh of it, and its edge
towards the beach is scalloped: it reaches the sand in tongues a stride or two across. (The shore-break photo
from above.) Out on the reef, where white water lies on deep water, it is as it was.

**What it costs.** Measured in the software renderer, as the time it takes over a frame; it says which way a
change goes, not what the phone will do, and cannot tell two or three in a hundred apart. Against the merged
build, after the first sitting and now:

| The view | First sitting | Now |
|---|---|---|
| The open sea alone, from above | 6% longer | 8% |
| The lagoon alone, from above | 3% | 5% |
| The wave mesh alone, from above | 7% | 10% |
| From the ocean beach, out to sea, towards the sun | 8% | 16% |
| The open sea from the reef's edge, towards the sun | 9% | 16% |

So looking down, or away from the sun, this sitting added little; looking out over the water towards the sun it
added as much again as the first sitting did. Where that goes, by building with one thing left out at a time:

- *The sparkle*, 2 to 4 in a hundred towards the sun (arithmetic, and two noises where a sparkle may be), and
  nothing away from it or beyond 200 m. `no sparkle` in the debug panel compiles the sea without it.
- *Foam's own two readings* on the wave mesh, some 4 in a hundred of a view the mesh fills. The open sea and the
  lagoon are spared them, and the reading laid along the shore: they read the detail texture six times, where
  they read it seven.
- *The sky's evening colours* in the mirror, about 1 in a hundred, and only at low sun; a second mirrored
  direction for the clouds.
- Saved: the open sea no longer reads the waves' picture of the floor for its depth (it has no floor to ask
  after), nor the reef's map outside the map's square: three readings fewer for every dot.
- The ground under water reads as many textures as it did: two of the three are the new picture. New for each
  vertex of the ground, the rocks and the coral: three sines, which could not be measured.
- What would save most is the old item below: the island's formula, worked out for every dot of the lagoon and
  of the wave mesh, is some 4 in a hundred of a frame here. A picture of the floor's height in its place changes
  how the water knows the ground: to agree.

If the phone has lost frames, the order to try is `no sparkle`, then `plain water depth`, then `plain steep
water`.

**Switches in the debug panel:** `slower ripples` (it was `quicker ripples`) runs them at a quarter of their
pace, as they were; `still under water` holds what is under water still; `no sparkle` is above. `plain water
depth` is as it was.

For the phone: the frame rate in the lagoon and at the reef's edge; whether the ripples' pace reads as water
(`slower ripples` on and off) and whether anything shimmers at that pace; whether the sway reads as water or as
a wobble (`still under water`); whether the sparkle twinkles or flickers, in a high wind above all; the net of
light, which is bolder again in the sun and gone in shade; the white horses on the lagoon in a high wind; the
foam's lace and scallops on the ocean beach.

Tried and taken back: the net worked out for each dot from the curvature of two wave fields (grainy, and no
cheaper); the mirror with no limit by angle at all (the shallows lost their aqua from the beach); foam as thin
lace everywhere (the white water on the reef lost its body); scallops cut by the water's depth (square
notches); the water's own colour dimmer at low sun (no difference: what shows there is the floor); the detail
texture read sharper at a low angle (no difference).

Seen and left:

- On the ocean beach the foam's scallops stand still on the sand while the foam comes and goes, and one can end
  in a hooked tail of foam.
- Thirty to a hundred metres out in a light wind our water is still smoother than the photos: its brightness
  varies by 3 in a hundred where the photo of Heron Island's reef flat varies by 12. The ripples that would show
  there are smaller than a dot of the picture, and blur. What would close it is longer waves with real shape,
  on the lagoon as on the sea.
- Mirrored clouds lie on a windy lagoon as pale shapes with hard edges (the test builds' cloud pictures are
  coarse: the phone's are finer).
- The floor's shadows and the lagoon's shelf edge show as hard shapes through a calm.
- A rock or a small coral is still tinted by the depth of the sand beside it; bending what is seen through the
  surface is still the largest step left (the first sitting's note).

### The frame rate, and a calmer sea (18 November 2026)

Ryan, on the phone, of the second sitting: "another big improvement", but 30 to 45 frames a second looking at the
ocean, and the water "almost feels too busy". He asked for the frame rate back towards 60 by simplifying only
where that is itself an improvement, for changes that alter no picture wherever they can be found, and for free
gains towards the references. Branch `water-frame-rate`; at his asking it is committed and pushed at each
milestone, for him to test from the Pages preview, and not merged.

**What the phone said first** (the ocean beach, looking out to sea): with the sea drained, 55 to 60; with only the
wave mesh hidden, 55 to 60; with only the far sea hidden, 38 to 40. So nearly all of the lost frames are the wave
mesh, and the rest of the scene is itself close to its limit. Of the last sitting's switches `plain water depth`
did most, and none did much: the cost is the sum of everything.

**What the software renderer can and cannot say.** It times a frame, steadily enough when builds are timed in
turns. But it works out both sides of an `if` that differs from dot to dot, so it cannot see the saving from
work that is skipped: a phone's graphics card does skip it. Its timings are fair for what every dot pays
(texture readings, filtering, the island's formula) and blind to the rest.

**Done, in the order of what it is thought to save.**

- *Plain texture filtering.* The detail and caustics textures were filtered to stay sharp across the view at a
  low angle (anisotropy 4), and the water reads them eleven times for each dot, nearly always at a low angle.
  That was the largest single cost found: 19 in a hundred of a frame from the beach, in the software renderer.
  Filtered plainly, far water is a calmer blue with softer streaks, and the net of light fades with distance, as
  it does in the photos; close to, nothing changes. `sharper filtering` in the debug panel brings the old
  filtering back, to compare both the look and the frame rate.
- *The ground skips what comes to nothing* (`terrain-colour.glsl`). Away from the water's edge the wet-sand band
  (wet sand, the swash's lines, the lagoon's film and foam: some ten noises) multiplied out to exactly nothing,
  for the sea floor and the land alike; so did the turf's colour where there is no turf (37 noises, on every dot
  of beach), the beach's fringe under whole turf, the ocean reef's coral in the lagoon, and the coral's colour
  over bare sand. None of it is worked out there now. The pictures are the same dot for dot (38 views).
- *The water skips what comes to nothing* (`water.frag.glsl`): the foam's shading where there is no foam, and
  from under water everything but the surface's underside. The same dot for dot (45 views).
- *Three sizes of ripple, not four.* The finest, 1.3 m across, could hardly be told in the picture and made the
  water busy close to. The wave mesh reads the detail texture ten times for each dot, where it read it eleven.
- *Gusts in broad patches.* The patches of sky-blue that gusts lay on clear water were broken up into blotches a
  few strides across; they are the size of the gusts themselves now.
- *Sparser sparkle.* About two thirds as many points, kept nearer the sun's side. And the sun's whole image
  on glassy water is half as wide again as the sun, where it was five times: beside the calm-water photo it
  showed as white blots on the water near the eye.

In the software renderer, against the build of two sittings ago (`4d4f145`, the last that held the phone near
its old frame rate), a frame took this morning and takes now:

| The view | This morning | Now |
|---|---|---|
| From the ocean beach, out to sea | 17% longer | 4% less |
| The reef's edge | 16% longer | 1% less |
| The wave mesh from straight above | 10% longer | 6% longer |
| Wading in the lagoon | 11% longer | 6% less |
| The reef flat | 16% longer | 5% less |
| Under water, looking up | 15% longer | 8% less |

What the skipped work saves comes on top of that, and only the phone can say how much.

**What the phone said afterwards** (19 November 2026, the same place): 41 to 46 frames a second as it is, where it
was 30 to 45. With `sharper filtering` 43 to 46: the plain filtering saves the phone nothing, and the software
renderer was wrong about the largest thing it found. With `skip unused readings` 41 to 44: no gain either. With
`coarse wave mesh` 44. With `bare wave mesh` 60. So the wave mesh's cost is all in the colouring of its dots,
and none of it is texture readings, their filtering, or the mesh's points: it is arithmetic. Which arithmetic
is what the switches below are for: `water: depth only`, `water: to ripples`, `water: to mirror` and `water: to
colour` end the colouring at those places and draw what there is so far, and `no floor formula` colours the
water as if its floor lay level. Plain or sharper filtering is now a choice of look alone, and Ryan's.

**And of the stages** (the same day): `water: depth only`, `to ripples` and `to mirror` each 60; `to colour` 50;
the whole colouring 41 to 46; the whole colouring with `no floor formula` 50. A frame has 16.7 ms and the whole
view takes some 23. So the island's formula costs about 3 ms, half of what is missing; the step from the
mirror to the finished colour costs 3 ms or more, which is far more than its own arithmetic, and holds the
formula's second working-out (the check for clear water with no floor behind it); and what follows the colour
(white horses, the foam, the haze) costs about 3 ms more. Done since, changing no picture (54 views): the
rocks in the surf, which every dot of water within 24 m of the beach asked after one by one, all sixteen, are
handed to the shader in four groups of neighbours with a circle round each, and a dot asks only after the
groups whose circle it is in (`sea/surf-obstacles.ts`); and the lagoon's shore waves and the far sea's hole
are compiled out of the two meshes the waves move, which are never in the lagoon.

**After that** (the same day): 39 to 45 as it is, so the rocks were not what the last part of the colouring
costs; and `water: to colour` with `no floor formula` together, 60, so the formula is the whole cost of that
step. Two more stop-switches split the last part: `water: to white horses` and `water: to foam`.

**The floor's height as a picture.** The graphics card works the island's formula out once, at start-up, for
every dot of a picture 2048 dots across, half a metre to a dot, and the water reads that in place of both
workings-out of the formula (`sea/floor-height-picture.ts`; `WATER_FLOOR_FROM_PICTURE`). It is made from the
formula itself, so whatever the island's shape becomes, the picture follows. Built first as a switch, and read
on the phone: 55 frames a second, where the formula gave 39 to 45. Ryan had said of it "not sure floor as a
picture makes sense yet as we will be changing it, fine if quick"; it is the rule now, on this branch, for him
to confirm. Where the graphics card cannot draw into a half-float picture the water works the formula out as
it did, and `floor from the formula` in the debug panel does the same, to compare. The software renderer's
pictures differ from the formula's by less than the eye can tell (54 views, and the thin water over a bared
reef top looked at closely).

**What is left** (the same day, with the picture): stopped after the white horses, 58 to 60; stopped after the
foam, 50 to 60; all of it, 55. So the foam is about a millisecond and the haze nothing, and everything before
the foam now fits a frame with little to spare. The screen shows no more than 60, which hides what each of the
earlier parts costs: `more dots` in the debug panel draws half as many dots again each way, so that every
dot's work counts two and a quarter times over and the frame rate falls to where the stop-switches can be told
apart.

**The profile, with `more dots`** (the same day): the whole colouring 43; the mesh bare 60; stopped after the
depth 60, after the ripples 57 to 60, after the mirror 49 to 60, after the colour 44 to 50, after the white
horses 43 to 45, after the foam 38 to 42. No one part costs the frames: each from the mirror on adds a little,
and all before the mirror fits a frame even at two and a quarter times the dots. (The frame rate is a mix of
frames that made the screen's next refresh and frames that missed it, so it does not turn into milliseconds
by plain division.) The program's own time for a frame is 2.5 ms on the desktop from the same place: not
what holds the phone back.

**So, arithmetic taken out all along the colouring, changing no picture** (62 views, the worst the same to
within a step in 255 here and there):

- *The shore from a picture.* Every dot of water worked out eight sines for the shore in its direction: how
  far out the shoreline lies, the reef's share of its width, the land's width. They are read from a picture
  one dot high and 4096 across, made from the same formulas at start-up (`sea/shore-round-picture.ts`;
  `WATER_SHORE_FROM_PICTURE`; `shore from the formula` in the debug panel works them out as before).
- *What is not in the sky is not worked out*: the moon's sheen by day, the sun's glints at night, the sun's
  whole image from the wind at which it is all glitter. Nor the white horses below the wind that raises them,
  nor the lagoon's shore waves below theirs. Each test is on a uniform.
- *No foam, no foam's sums.* The lace pattern, the waves' foam and its shading are worked out only where
  the wave model puts foam, at the water's edge, or near the beach where foam lies round the rocks.
- The fifth power in the mirror's strength is five multiplications, not a `pow`.

**And the phone, after that** (the same day, the same place): 60 frames a second, where the day began at 39 to
45 and the day before at 30 to 45. With `more dots`, 43 to 50, and with `shore from the formula` as well, 41 to
43: the shore's picture is part of it. Still to read: the lagoon, the reef's edge, a high wind (the white
horses are worked out again from it) and low sun.

**The debug panel, tidied at the end.** Its switches are in three groups under headings: for looking; what a
frame costs (`more dots`, the hides, `coarse wave mesh`, `bare wave mesh`, `floor from the formula`, `shore from
the formula`); and the six places the water's colouring can be ended at. Taken out, each with the code that
only it used, because its question is answered: `sharper filtering` (Ryan saw no difference, and plain is the
cheaper in theory), `no floor formula`, `slower ripples`, `still under water`, `no sparkle`, `plain water depth`
and `plain steep water`. The panel has 25 switches, where it had grown to 34.

**Not done, and why.**

- *The island's formula in the water's shader*: done after all, as a picture ("The floor's height as a
  picture", above).
- *Reading textures inside branches*: tried and taken out. Of the wave mesh's sixteen readings for each dot,
  six are wanted only where there may be foam or steep water, and they are all made everywhere because of a
  hard rule (`DEVICE_NOTES.md`). A debug switch, `skip unused readings`, compiled the sea to make them inside a
  branch with `textureGrad`, given derivatives taken before the branch; the software renderer drew the same
  picture. On the phone it gained nothing (41 to 44, against 41 to 46 without): texture readings are not what
  that phone is short of. So the rule stands as written, and the switch and its code are gone.
- *Mirrored clouds as soft shapes.* The hard-edged pale shapes on a windy lagoon come from the test builds'
  coarse cloud pictures; the phone's are finer. Left as it is until seen there.
- *The wave mesh's points.* Its levels of detail are as they were, until `coarse wave mesh` has been read on
  the phone.

For the phone: the frame rate in the lagoon, at the reef's edge, in a high wind and at low sun; whether the
water looks right read from the floor's picture (the waterline, the colour's bands); and whether the calmer
far water and the softer net of light far off (`sharper filtering` brings the old back, at no cost in frames)
read better or have lost too much.

## Later

- More passes on the reef.
- Overhangs, caves and roofed surge channels on the reef. Ryan wants them in time, perhaps as things of their own
  set on the ground (`REEF.md`).
- The tide. Interesting to Ryan (16 November 2026) but after the moon. What it would take, and what to keep to
  meanwhile so that it stays possible, is the last section of `REEF.md`.
- A newer three.js. A trial of 0.187 was shelved on 15 November 2026: cheap on the desktop, but its shadows lose
  the graphics context on Ryan's phone (`DEVICE_NOTES.md`). And a decision on WebGPU.
- Sound beyond surf and crickets: wind, rain, the shore break.
- Spray where the shore break lands.

## Weak points

- Night without a fire is nearly black.
- Short turf is sparse flat cut-outs; vine leaves are angular close to; the young palm sits low and wide.
- Far palms and shrubs look thinner than near ones (leaf cut-outs blur together with distance).
- The breaking wave: close to, the white mass a landed lip throws up is a soft heap, more a cloud bank than
  tumbling water; the lip's underside, seen from inside the tube, is a flat sheet. Its motion has been judged on
  films from the desktop only. Spray has only been tuned on stills.
- From low down inside the reef a pale hairline can show just under the horizon, where the wave mesh's outer
  edge and the far sea overlap (seen on the desktop in a small picture, and in the build before these passes
  too).
- Close to the eye the ripples show as blotches a metre or so across, where the photos show fine ripples drawn
  out level by the view. They are the wind's gusts and slicks, an approved look: to change with Ryan.
- A whitecap's leading edge can look like a clean white blade close to the eye.
- The lagoon's raised waves and the ocean's shore break are slightly stepped where the mesh is coarse.
- Nothing can be picked up or moved yet.

## Performance: what is in place

- On Ryan's phone (a Pixel 10) the scene held 60 frames a second, 57 at the lowest, before the water's look was
  reworked; after it, 30 to 45 looking at the ocean, nearly all of it the wave mesh ("The frame rate, and a
  calmer sea", above, has what was done and what is left). So no performance pass was planned then. The debug
  panel (hold the corner button) reports the frame rate, the program's time for a frame, and the draws and
  triangles: read them again when something heavy is added. Still to read: the pixel ratio and the program's
  time in a high wind at the ocean's edge.
- Shadows are redrawn on demand, not every frame. Anything that should cast a moving shadow needs thought first.
- Plants and rocks are instanced in map squares that are skipped when out of view, hidden beyond a distance and
  drawn with a simpler shape beyond a nearer one.
- The wave mesh is 16 sectors, each cut across into three tiles, at three levels of detail. Its vertex shader
  evaluates the wave model three times per vertex and is the dearest thing per vertex. The breaker's ribbon is 20
  pieces at three levels of detail.
- The terrain's colouring is the dearest thing per pixel (about forty noise evaluations on land). It is drawn
  last so hidden pixels are skipped.
- Whitecaps cost up to four noise evaluations per water pixel, only above a medium wind. The lagoon's shore band
  (43,000 triangles) is drawn only in a high wind, in view and within 150 m.
- Automatic quality lowers resolution, then switches shadows off, below about 28 frames a second.
- The water's shader reads the ground's height from a picture made from the island's formula at start-up
  (`sea/floor-height-picture.ts`): on the phone that gave back ten frames a second of sixty. On this phone
  arithmetic is dear and a texture reading costs next to nothing.
- Not done: noise from a texture instead of arithmetic in the terrain shader (it would change every pattern on
  the ground, so weigh that first).
