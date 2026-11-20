# Roadmap

What comes after the refactor (`REFACTOR_PLAN.md`, finished). The order was agreed with Ryan on 15 November
2026; he decides when it changes.

## Next

**Where things stand (20 November 2026, evening; Ryan is away for the weekend and may go on from a laptop or
the phone with another agent).**

- *Branches.* `main` holds all of the look so far: Ryan merged the three stacked branches of 20 November
  (`look-3-ground`, `look-4-coral-and-sky`, `look-5-sea-floor`) that afternoon, at `2d4a18f`. Work goes on on
  `look-6-water-colours`, which begins there, committed and pushed at each stopping place, as he has agreed
  for this effort; `main` is his alone. (He merges in the same checkout the work is done in, and it may be
  left on `main`: look at which branch is checked out before every commit.)
- *The phone:* a steady 60 frames a second at `2d4a18f`, with rare dips, with the picture of what is under the
  sea drawn every frame. "Everywhere else is vastly improved"; one place was not, the lagoon islet's shore
  seen from the islet (1 below).
- *The work in hand* is "The water and its floor against matched photographs" (its plan is far below, with a
  section for each day's work after it). Done: the targets (eight pairs and a fly-round); the three faults
  first found; the picture of what is under the sea, now the one way the water is drawn, with every older rule
  it replaced deleted. In hand or next, in this order:
  1. *What is under the sea is seen where the bent ray shows it.* Done ("The islet's shore", far below): for
     Ryan to confirm on the phone, where a new rule in every material's vertex shader has not yet run.
  2. *Colours and clearness against the pairs* (the plan's stage D): shallow water over white sand is all but
     colourless for its first half metre, where ours is turquoise from the first step; far water at a low
     angle is the sky's mirror, where ours shows its floor; a lagoon at dusk is all mirror, where ours is blue
     with its floor showing. The numbers are in `src/shaders/shared/water-veil.glsl` (the water's colour, its
     glow, how soon it hides) and the mirror's in `src/sea/water.frag.glsl` ("What the surface mirrors").
     Real lagoon water is clearer than ours: sand shows at 10 to 20 m, where ours hides two thirds by 4.6 m
     (`HIDES_BY_METRES`); the research is `docs/research/water-hiding-its-floor.md`.
  3. *The floor against the pairs* (stage E): patches of reef that are soft and mottled, not cut out; the
     ripples' size and evenness from standing height; rubble painted for the reef (the bed of it is the land's
     gravel and reads as crazy paving); structure at the middle distance. The ground's shader reads 16
     pictures, all there are (`DEVICE_NOTES.md`): more would mean stacking them in one.
  4. *Checks, the phone, the docs* (stage F).
- *How a pass is judged*, since judging it otherwise cost a day: at the size Ryan sees the game, on the pairs
  and the fly-round (`tools/look/README.md`), with the thing in question drawn by itself and enlarged before
  a cause is named, and two frames a moment apart for anything that moves. The photographs are on his desktop
  only (`docs/reference-photos/README.md`): without them the pairs' sheets and the boards cannot be made, but
  our own views can be drawn and compared anywhere.
- *Waiting on Ryan:* the wording of the standard "One owner for each effect"
  (`CODE_STANDARDS.md`), which was added at his word but not read by him; whether the water should be as
  clear as a real lagoon's; the proposal "many more kinds at a flat cost" (below); six finished agents'
  worktrees on his desktop to clear away (`.claude/worktrees/`).

After the look comes the much greater variety of plants,
rocks, ground and props that the groundwork prepared for, by the proposal he has still to decide ("A proposal:
many more kinds at a flat cost"). The list that follows is the order agreed before that, and stands for what
comes after.

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
6. **Night.** A first moonlight is in (19 November 2026, "Groundwork for more life" below): the moon crosses
   the sky from moonrise at dusk to moonset at dawn and throws shadows. Still to come: its phases, which the
   light and the reef's clock both follow (most of the reef's food comes on known nights, `REEF.md`), the
   moon by day, a night with no moon.
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

## Groundwork for more life (19 November 2026)

Ryan, after merging the frame-rate work: the next main effort is to "refine, improve and simplify as a whole in
preparation for much greater biodiversity, vegetation, rock and ground structure, props" above the sea and below
it, and to "buy frames" ahead of them. Three to six hours, from a plan of eight parts agreed first. Branch
`groundwork`; at his asking it is committed and pushed at each milestone, for him to test from the Pages
preview, and not merged.

**What a frame draws** (the usual breeze, counted in the test renderer before anything was changed): from the
ocean beach looking out to sea 673 thousand triangles in 144 draws, of which the ground was 332 thousand in one
draw and the water 103 thousand; looking inland 1,135 thousand in 405 draws, some 600 thousand of them plants;
wading in the lagoon 831 thousand in 279, the coral 266 thousand; from the home clearing 1,049 thousand in 361.
The shadows are redrawn only when the sun or the player has moved, so they are in none of these.

**Done.**

- *Cost switches for the land* (the debug panel's second group): hide plants, hide rocks, hide coral, hide
  ground, plain ground, plain sky, no shadows. Each kind of instanced thing is named where it is split into map
  squares (`world/instance-cells.ts`).
- *The ground in tiles.* 77 of them, 80 m a side; three.js leaves out those out of view. The ground's triangles
  in a frame fall from 332 thousand to 93 thousand looking out to sea, 157 thousand looking inland, 128
  thousand in the lagoon, for 20 to 39 draws. The corners stay where they were: 62 views are the same dot for
  dot. Far tiles are not yet coarser: with the triangles in view already a third of what they were, that waits
  for the phone to say the ground's triangles still matter.
- *The ground's noise from a picture.* A 512-dot picture of smooth noise, made once and repeating every 64
  cells, read where `noise()` was worked out (43 calls and 16 of three octaves in the colouring). The patterns
  are the same to the eye and their patches lie elsewhere, which Ryan agreed to beforehand; nothing in the
  program goes by where they lie. The reef's dark and pale ground does not move: it follows the floor's shape,
  and the noise only breaks up its edges.
- *The shore and the reef's cover from pictures.* The shore's shape comes from the picture the water reads; the
  reef's high ground, pavement and ridge from a picture the graphics card draws at start-up from the island's
  formulas (1024 dots across, a metre each; at half a metre nothing looked different). No view differs to the
  eye: the largest difference in 62 is a few faint lines at the edges of patches.
- *The turf's broad patterns from a picture.* How lush the turf is, how dried out, where bare soil breaks
  through and how the layers' edges wander: a dozen sines for every dot of land, now one reading of a picture
  the graphics card draws at start-up from the same formulas the grass is placed by. No view differs to the
  eye.
- *The ground's single things placed from a picture.* A dimple, a pebble, a chip of shell, a fleck of litter and
  a vine's leaf each took five to nine random numbers, each number a sine. They are read, four at a time, from
  a small picture of random numbers. The things are the same to the eye and lie elsewhere.
- *A calmer loose sand.* Two layers of dimples where there were three, shaded two thirds as strongly. The beach
  looked pocked, which `LOOK.md` lists among the things rejected ("relief strong enough to read as dirt"); the
  dimples are still there where the sand is trodden.

- *The moon.* It was a disc fixed in the north-west with a weak lamp that threw no shadows, and the night was
  close to black. Now it has an arc of its own (`sky-config.ts`: `moonBehindSun`, of which a half is a full
  moon and of which its phases will come, how high it climbs, and how long it is up): it rises in the east as
  the sun sets, crosses the sky at an even pace, stands high over the sea from home at midnight and sets in
  the west at dawn; the sky, the water's glitter, the clouds and the lamp all go by the one direction. (On
  the sun's own path, tried first, it was already high in the south at dusk and hung there all night: the sun
  is up for two thirds of the day here.) Its disc has
  grey seas and a darker limb and hides the stars behind it. One lamp serves for sun and moon
  (`sky/lights.ts`): the sun's light has gone before the moon's comes in, so the lamp is dark when it changes
  sides, the moon throws the palms' shadows, and every lit shader lights by one lamp where it had two. The lamp
  is never switched off, so no shader is rebuilt at dusk. The sky's light at night is cold (it had kept the low
  sun's warm colours, and leaves glowed), and so is foam. By day nothing changes: 61 of 62 views are the same
  dot for dot, the other being the night.
- *Far plants as full as near ones.* A leaf picture is cut out where it is clear, and far off the graphics card
  reads smaller copies of it in which leaf and gap have run together, so thin leaves fell under the cutoff and
  far palms and shrubs looked sparse (a weak point since the refactor). The smaller copies are now made at
  start-up with their opacity raised until as much of each passes the cutoff as passes in the full picture
  (`world/plants/cut-out-mipmaps.ts`): the far groves are fuller, close up nothing changes, and a frame costs
  what it did.
- *The water's leftovers.* The beach foam's scallops read at the shoreline, so that no tongue's edge could curl
  into a hooked tail: tried and taken out, since the straight-sided tongues it gave break the foam into scraps,
  which is no better. The pale hairline under the horizon: not found in eight views from low down, at the
  phone's size and magnified; it stays on the list of weak points. The mirrored clouds' hard edges wait to be
  seen on the phone, as before.
- *Looked at and left.* The sky's own cost: a hundredth of a frame in the test renderer; `plain sky` is there
  for the phone to say otherwise. One haze for sky, sea and land: the land's fog and the sea's haze already
  agree to within a few parts in a hundred at every distance the atoll has, so making them one rule would
  move every far colour a little for nothing the eye would see.

**What the phone said** (Ryan, 19 November 2026): 60 frames a second with `more dots` on, whatever is switched
on or off; "you've done a great job getting our performance in check". So the panel can no longer tell one
cost from another on this phone, and `ground by arithmetic` shows neither a gain nor a loss. The switch and the
formulas it brings back are to go at the start of the next sitting, the pictures staying: fewer sines for a
dot, and room for what is to be added. The water's glitter, sparkle and white horses still work their noise
out (up to four evaluations for a dot of sea in a wind); the ground's picture of noise could serve them, and
there is no call for it while the phone holds 60. To read a cost again, `more dots` would have to draw more
than half as many dots again each way (`MORE_DOTS` in `core/automatic-quality.ts`).

### What a frame spends, and a budget (19 November 2026)

Thousands of triangles and draws, by the class of thing, as the scene stands after the work above (the usual
breeze, counted in the test renderer, where these counts are exact):

| | out to sea, from the ocean beach | inland, from the ocean beach | the home clearing | wading in the lagoon | from above |
|---|---|---|---|---|---|
| The ground | 93 in 20 | 157 in 39 | 148 in 37 | 128 in 33 | 233 in 55 |
| The water | 103 in 34 | 73 in 41 | 62 in 36 | 27 in 26 | 76 in 78 |
| Leaves from the leaf atlas (shrubs, trees) | 20 in 2 | 214 in 51 | 161 in 33 | 21 in 8 | 78 in 27 |
| Leaves of plain colour | 63 in 10 | 177 in 47 | 165 in 37 | 35 in 8 | 41 in 12 |
| Palm fronds and grass | 24 in 10 | 152 in 56 | 133 in 49 | 49 in 31 | 81 in 32 |
| Bark | 3 in 2 | 55 in 103 | 43 in 73 | 8 in 25 | 36 in 103 |
| Rocks | 37 in 20 | 65 in 57 | 54 in 53 | 66 in 50 | 62 in 66 |
| Coral | 67 in 50 | 41 in 29 | 73 in 59 | 266 in 110 | under 1 |
| Animals | 23 in 11 | 23 in 11 | 23 in 11 | 23 in 11 | 23 in 11 |
| **All** | **434 in 163** | **959 in 443** | **865 in 397** | **626 in 311** | **633 in 393** |

The whole scene holds 2,051 instanced meshes (one for each kind in each map square) of 97 shapes, in seven
materials; 5.8 million triangles if all of it were drawn at once, 3.3 million of them coral. The program's own
time for a frame looking inland is 4 ms on the desktop, 2.4 of it inside three.js's drawing.

**The budget.** One place has been read at 60 on the phone: the ocean beach looking out to sea, when it drew
673 thousand triangles in 144 draws. So until the phone has read the others, that is the budget for any
view: **700 thousand triangles and 150 draws**. Out to sea is inside it. Inland, the clearing and the lagoon
are over it, in draws by two to three times. The phone has since held 60 with `more dots` on (above), but
where Ryan stood is not recorded: if that was looking inland too, the scene as it stands is itself inside what
the phone can do, and the budget is to be set from it. To ask before the proposal below is decided, with the
panel's `program ... ms a frame` at the home clearing and wading in the lagoon. By class, to hold when kinds
are added:
ground 150 thousand, water 100, all plants 300, rocks 60, coral 60 (150 in the lagoon, where there is little
else), animals 30.

**Where the draws go.** Looking inland, of 355 draws of instanced things, 67 are of squares within 48 m, 102
of squares 48 to 96 m off, and 186 of squares beyond 96 m; the triangles are a third each. More than half
the draws are spent on what is a few dots high. Bark is the dearest class by the draw: 103 for 55 thousand
triangles. And every kind added today adds one draw for each of its parts in every square in view, near and
far: today's kinds come to seven draws each in that view, so a hundred more, spread as they are, would add
some seven hundred.

### A proposal: many more kinds at a flat cost (for Ryan to decide)

The aim is that a new kind of plant, coral or rock costs triangles where it stands near the eye and nothing
anywhere else. Three steps, each of use without the next, in the order I would take them:

1. **Far things as pictures of themselves.** Beyond a distance set by its size, a thing is drawn as a flat
   picture of itself: two triangles, turned to the eye, from an atlas of pictures that the graphics card
   draws at start-up from each kind's own model (so a new kind needs nothing made by hand). All kinds share
   the atlas and one material, so a far square is **one draw for everything in it**, whatever the number of
   kinds. Looking inland that is some 260 draws and 480 thousand triangles fewer if the change comes at 48 m,
   170 and 260 if at 96 m. What it costs: the atlas (a few megabytes), a lit look that is flatter than the
   model's (far things are in no shadow picture today either), and a change of shape at the distance, which
   must not be seen: to be judged on the phone before it is kept. This is the step that makes the cost flat.
2. **Near things of a class in one mesh a square, where they are few.** Bark is 570 instances and 138
   thousand triangles in the whole scene, drawn as 233 meshes. Baked into one mesh for each square (trunks do
   not sway), it is a few megabytes and a quarter of the draws, and a new kind of tree adds none. The same for
   rocks if their 650 thousand triangles are worth 25 MB.
3. **A cheaper draw.** three.js 0.128 sets up every attribute of an instanced mesh afresh at each draw. Our
   own instancing (a plain mesh whose shape carries the instances, which our patched shaders can read) would
   skip that. Worth doing only if the phone shows the program's time, and not the graphics card's, is what
   holds the frame.

Not proposed: a newer three.js for its batched meshes (its shadows lose the phone's graphics context); baking
every kind into one mesh a square (the plants sway, and it is some 200 MB).

Whatever is chosen, the rules for a new kind stay: it uses a material that exists (the leaf atlas, the plain
leaf, bark, the frond, rock or coral), it has a simpler shape and a distance beyond which it is not drawn,
and it is counted against its class's line of the budget before it is merged.

## The look, against references (agreed 19 November 2026)

Ryan, on the phone, of the groundwork: the frame rate is in check, and the look is now the matter. His words:

- "the ground textures/cover do not look great we should spend a good number of passes comparing to actual
  references and refining for a more realistic and aesthetic look"; and where the coral ground meets the beach
  there is a "weird/hard cutoff";
- "the coral and other under water textures need refining";
- "a lot of our colors feel a bit too busy? Or maybe over saturated? (including the water)": several passes
  against references "to get our colors more spot on";
- "the same could be said of our sky box/stars/moon";
- "one big thing we will want to improve is the under water appearance/rendering as well as how the surface
  looks from underwater. Essentially we want beautiful and realistic underwater scenes as the player will spend
  decent amount of time there. For example, currently the bubbles and light beams look tacky".

**What his two pictures show.** The hard edge: round a coral head the floor is painted as old reef rock (the
head's apron, from the reef's map), wherever the ground is under water, and that stops dead at the waterline
when a head stands near the beach. Under water: one flat blue fog that takes all the colour out of the coral
within a few metres; light rays that are stripes on an overlay fixed to the screen; 46 ring-shaped bubbles
that circle the eye for ever; and, looking up, a pale blob where the surface should be a round window of sky.

**There are no reference photos for any of this.** `reference-photos/` holds water and waves only; the photos
`LOOK.md` describes for the reef, the sand and the plants were sent in the days of the earlier builds and not
kept. So the work begins by gathering them, and for colour by measuring them.

**The plan**, about 22 hours of work, less by a quarter to a third with the help below:

| | Part | What is done | Hours |
|---|---|---|---|
| 1 | References and a colour board | Some 80 freely licensed photos (the ground, the shoreline, under water, coral, the night sky), with what each shows written into `LOOK.md`. A board of swatches (sand, the ground under palms, fronds, the lagoon from shallow to deep, the open sea, the sky) measured from the photos and from our pictures, side by side. | 1.5 |
| 2 | Colours | Three passes bringing each material to the board: plants, water, sand, sky, light. Fewer patterns competing where the photos show plain surfaces. | 2.5 |
| 3 | Under water | Water that takes colour away with distance, red first, and is brighter looking up and darker looking down, so that near coral keeps its colour. The surface from below as a round window of sky with the sun in it, bent by the waves. Shafts of light that hang in the water and slant from the sun. Fine drifting specks in place of the ring bubbles; bubbles only under breaking waves. | 6, perhaps 8 |
| 4 | Ground and cover | The hard edge at the waterline first. Then the ground against photos, its cover painted as real things (fallen leaves, gravel, shells, roots) in place of blotches of noise. Real ground under an atoll's palms is pale coral sand and gravel with brown litter, the green coming from low plants, where ours is lawn: one stretch is shown before and after for Ryan's yes before the island's character is changed. | 5 |
| 5 | Coral and the reef floor | Surface detail for each kind (a brain coral's grooves, polyps, branch tips), colours from photos, the heads' rock, ripples and rubble on the floor. The kinds there are now; new ones belong to the effort after. | 3.5 |
| 6 | Sky, stars, moon | Stars as points of varied brightness (they are squares of one size), fewer near a full moon; a Milky Way with structure; the moon's face laid out as the real one; the day sky's blue and the dusk against photos. The clouds stay as approved. | 2.5 |
| 7 | Checks, the phone's notes, the docs | | 1 |

**In four sittings, one at a time**, each ending with sheets of before and after and a look on the phone, and
Ryan's notes before the next: (1) parts 1 and 2 and the hard edge; (2) part 3; (3) part 4; (4) parts 5 to 7.

**Who does what** (agreed the same day, on the condition that the quality does not suffer). Opus agents gather
the references, an agent to a subject, and build what stands by itself to a written brief, each in a worktree
of its own: the drifting specks, the shafts of light, the painted ground tiles, the coral's surface textures,
the field of stars. No more than three draw pictures at once (the test renderer is slow, and the machine has
twelve cores). Claude chooses which photos are kept, does the colour passes and every pass at a look, makes
every change to the water's and the ground's shaders, keeps the phone's hard rules, merges, and judges every
picture Ryan is shown. The reason for the division: this work is one loop of drawing, comparing with the photo
and adjusting, and an agent handed that loop reports that it is closer whether it is or not; and what Ryan
finds wrong is that things do not sit together, which several agents each improving a part makes worse.

### The first sitting (19 November 2026)

Ryan's answers before it: his phone shows Adaptive colour, "though as well I would want this to look good on
most monitors/devices", so the colours are brought to what the photos measure, which is the same on every
screen; milestone commits pushed to the branch `look-1-colours`, not merged. He sent three pictures of what
looks most wrong: the ground and the palms from above, a lime green; the sea at sunset, violet under an orange
sky; the lagoon from above, a cobalt blue with pastel coral heads.

**The references.** Four Opus agents gathered 106 freely licensed photos from Wikimedia Commons in half an
hour, a subject each, into `reference-photos/` (ignored by git; each folder has a `SOURCES.md` of titles,
authors, licences and what each photo shows): 26 of the ground and shore, 21 under water, 28 of coral, 31 of the
sky and of plain midday beach scenes. Claude looked at every one kept. `LOOK.md` now says what each set shows.
This covers the later sittings too. Not found: a footpath through a grove, a grove from above, shafts of light
under water beyond one photo, white water from below, a moonlit palm beach at an ordinary exposure.

**The colour board.** Parts of the photos and the same parts of our pictures, measured and laid side by side
(`LOOK.md`, "Colour, measured", has the method and the table). Ours was one and a half to twice as saturated
as the photos in the sky, the sea, the lagoon and every plant; too blue in the lagoon; mauve and violet at
sunset where the photos are blue-grey and slate; pastel in the corals; and far too dark in the shade.

**What was changed,** each step measured before and after:

- *The hard edge at the waterline.* The old reef round a coral head now comes in with the depth: none where the
  water is under half a metre deep, all of it by 1.3 m, sooner here and later there so that its edge follows no
  line of equal depth. In six views of heads that stand near a beach the shallows are clean sand.
- *The day sky:* paler and less pure a blue (`sky-config.ts`), as light high up as the photos have it.
  Saturation 1.4 times the photos' before, 1.0 after.
- *The water's own colours* (over sand, turquoise, deep blue: `water.frag.glsl`): lightness and hue kept, a
  quarter of the saturation gone. The deep lagoon 1.7 times the photos' before, 1.2 after; the open sea 1.5,
  then 1.1.
- *The plants:* fronds a grey-green (they are glossy, and half of what they show is sky), the leaf atlas, the
  blade plants, the vine, the turf and the dune grass all olive greens with red at three quarters of the green
  where it was a half or less. Palm crowns 2.3 times the photos' before, 1.3 after; shrubs 1.6, then 1.2. A fallen
  frond's bleaching had to follow the frond picture's new colour (it turned violet).
- *The corals* (`reef-config.ts`): each kind's tints taken from the photos, tan, mustard, olive, brown and a
  grey-blue, half as light as sand, where they were lilac, pink and cream. The warmth once added on top of
  every tint is gone.
- *The sunset* (`sky-config.ts`, `sky-gradient.glsl`, `lights-config.ts`): gold low down and blue above where it
  was salmon under mauve; the fire and the pink band weaker; the low sun's light gold where it was red-orange;
  the evening's ambient light cool where it was mauve (sand at dusk was purple); the water under it tinted grey
  where it was tinted violet.
- *Shade on the ground* (`terrain-colour.glsl`): a shadow is filled in by the light the sunlit ground round it
  throws back, the more the paler the ground, as water already fills a shadow under it. Shade on sand measured 0.42
  in lightness against the photos' 0.63, and blue; it measures 0.58.
- *The footpath* is pale coral sand and gravel where it was an orange-brown soil; by moonlight it now shows.
- *Dry sand:* the shaded side of a hollow is a touch cooler and no more, where it was blue, and the low
  hummocks are gentler. This was the one material that measured busier than the photos.

**"Busy" was mostly saturation.** Measured as how far the dots of a patch stray from its average, our water,
palms and shrubs vary in lightness no more than the photos do. So no pattern of the water was taken out; if it
still reads as busy on the phone with the colours calmed, the next thing to try is fewer of the lagoon's dark
coral patches seen from above, and that is a change to the reef, for the fourth sitting.

**Left for the later sittings, seen in this one:** the ground under the palms is a lawn where the photos have
grey gravel, husks and litter (third sitting, with Ryan's yes first); coral heads are piles of smooth balls
where the photos have one or two great domes with a grain (fourth); under water nothing was touched (second).
The night's sky was not touched: the six night photos are for the fourth sitting.

**The tools.** The measuring was done with small scripts in the session's scratch folder. At Ryan's yes they
are now in the repository, rewritten in TypeScript like the other tools and reusing the tests' own page helper
and form of view: `tools/look/` (its `README.md` says how to run a pass). They draw the look's views from a
build, lay pictures under a lettered grid, measure named parts of photographs and of ours, and draw the board.
Run from the repository against the last merged build, they give the figures of `LOOK.md`'s table.

### The second sitting: under water (19 and 20 November 2026)

Ryan, on the phone, of the first sitting, which he merged: "a big improvement"; "if I had any complaint I would
say that perhaps slightly too pale". He merged the measuring tools too (`tools/look/`). Branch
`look-2-under-water`.

**Slightly less pale.** The board agreed for the sky and the water, which both measured a little lighter than
the photos. The day sky is at the photos' lightness (0.66 high up, where it was 0.71) at 1.1 times their
saturation, and the water's own colours a notch deeper and richer (the deep lagoon at 1.4 times the photos'
saturation, where the first sitting left it at 1.2 and found it at 1.7). Plants and sand, which measured as
light as the photos, are as they were.

**Under water, as it was:** one flat blue (a blue sheet laid over the whole screen, and a fog); stripes of
light fixed to the screen; 46 ring bubbles circling the eye; the surface a pale blob overhead. Measured against
the 21 photos, the water seen level was 0.14 too dark in lightness and too blue, the sand floor 0.13 too dark
at twice the photos' saturation, and near coral blue-green.

**What was done:**

- *One rule for the water between the eye and a thing* (`shaders/shared/through-water.glsl`): each metre takes
  a share of the light, red first, and puts the water's own light in its place, which is brighter looking up
  and darker and bluer looking down. Everything goes by it: the ground, rocks, coral, plants and animals
  through three.js's fog, which is given a second case (`sea/water-as-fog.ts`); the surface from below and the
  backdrop beyond everything through the same file. The blue sheet over the screen is gone.
- *The water's own colour* (`sea-config.ts`, `underWater`) is a bright turquoise over pale sand a few metres
  down and a darker, purer blue over the deep, by how deep the floor is under the eye; less with a low sun,
  under cloud and at night.
- *A thing's own colour under water.* The paling and the blue glow that the ground, the rocks and the coral
  take by their depth are the water over them as an eye above the sea sees it: to an eye under water they are
  not applied. And such an eye is used to the light there, as a camera's white balance is: the red lost on the
  way down counts for far less (`light-net.glsl`). So sand under water is pale sand under a net of light,
  where it was a saturated blue.
- *The surface from below* (`water.frag.glsl`, `seenFromUnderWater`): overhead, out to 49 degrees from straight
  up, a window with all the sky drawn into it, the sun, its glow and the clouds, bent by the same ripples the
  top side has; beyond it a mirror of the floor under it, pale in shallow water and dark in deep. (Snell's
  window.) The three ripple readings moved up the shader for it; no view from above the water changed.
- *Shafts of sunlight* (`sea/light-shafts.ts`): 256 soft ribbons that hang from the surface in a grid that
  wraps round the eye, slant the way the light travels in water, face the eye, swell and die on clocks of
  their own, and are brightest looking towards the sun. In place of the stripes.
- *Specks* (`sea/under-water-specks.ts`): 900 fine pale points that keep their places in the water, drifting a
  few centimetres a second, so that swimming forward makes them stream past. In place of the bubbles.

The shafts and the specks were each built by an Opus agent to a written brief, in a copy of the repository of
its own; Claude took their files, wired them in (`sea/under-water.ts` owns both), and tuned them.

**Measured after** (the under-water board, `tools/look/boards/under-water.json`; lightness is ours less the
photos'):

| | Photos (lightness, chroma, hue) | Before | After |
|---|---|---|---|
| Open water seen level, shallow sandy lagoon | 0.56, 0.082, 221 | -0.14, hue +16 | +0.03, hue -3 |
| Open water seen level, over a reef | 0.55, 0.110, 233 | -0.09 | -0.04, hue +11 |
| The sand floor, near | 0.64, 0.040, 161 | -0.13, chroma x2.0 | -0.03, chroma x1.3 |
| Coral ten metres off and more | 0.55, 0.087, 217 | -0.10 | -0.01, hue -14 |
| Coral within a few metres | 0.50, 0.030, 110 | hue +93 | hue +57 |
| The surface towards the sun | 0.82, 0.084, 226 | chroma x0.5 | chroma x0.8, +0.13 |

**Known, and left:**

- *Coral heads are still too green from a few metres.* The corals' and the heads' colours were taken in the
  first sitting from photos made under water, which already carry the water's cast; the water then adds it
  again. They want their colours as they are out of the water. That is the fourth sitting's.
- *The mirror beyond the window is plain*: the floor's colour, with none of its shapes.
- *No bubbles under a breaking wave*, and no white water from below: no photo of either was found.
- *Night under water* is about as dark as it was, and darker overhead, where the surface is now a mirror of a
  dark floor. Judged on one still, against no photo.
- *A pale wedge of floor* shows at the foot of the drop-off's view, as it did before this sitting: not looked
  into.
- *Things above the water are not seen through the window*: palms on the shore, a bird.

**Only the phone can say:** whether the shafts' flicker, the specks' drift and the window's wobble read well in
motion (stills cannot show any of the three); whether a dive costs frames (the surface's shader does more
under water than it did, and there are 256 ribbons and 900 points more).

### The second sitting, after Ryan's notes: the surface, the rays, waves from below (20 November 2026)

Ryan, of the second sitting: "This is great"; and "the surface from underwater could be a bit more metallic
maybe, and the light rays a bit more realistic please do a few more passes on this against references from
real life"; "we could improve the appearance of waves and waves breaking from underwater"; and a bug, with a
picture: "this mesh from the waves underwater", a pale band hanging in the water and running down to the floor.

**The band** was the breaker's own mesh. Where no wave stands its ribbon lies sunk 4 m under the sea, along the
line the waves break on, hidden from above by the sea's own surface; from below nothing hid it. It is not
drawn while the eye is under water (`breaker.ts`, `chooseDetail`). The sea's own mesh is the wave from below.

**More photographs**, gathered by an Opus agent from Wikimedia Commons: 23, in `reference-photos/under-surface/`
(8 of shafts of light, 8 of the surface as a mirror, 7 of waves from the water). `LOOK.md` says what they show.

**The surface from below** (`water.frag.glsl`, `seenFromUnderWater`). In the photographs the underside is like
liquid metal because dark mirror and bright glint lie side by side, crisp and fine; ours was soft washes.

- *The mirror shows what is under it*: the line of sight is turned down from the surface and followed to the
  floor, and there the floor's own picture says how deep it is and the reef's map whether a coral head stands:
  pale shallows and dark heads, bent by every ripple, and the water's own colour beyond. (It showed one flat
  colour.)
- *Finer facets.* The surface's slope from below takes a fourth reading of the detail texture, the foam's
  finest (1.3 m across), which was being read for every dot of water already.
- *Glints.* Outside the window the finest facets tip far enough, here and there, to show the low sky: crisp
  bright pieces on the dark mirror, thick at the window's edge and fewer further out, of all sizes and in
  drifts (three sizes of ripple together: by the finest alone they were polka dots).
- *The window's edge* comes in as Fresnel's law has it, where it was a soft band.
- *The sun* is no disc from below (it showed as ovals with a rim): the ripples smear it into a dazzle, and
  every facet that bends its light to the eye glints, thick about where it stands and thinning away, so that
  the window is a field of white pieces on blue, as in the photographs. (The rim was no fault of a disc's: a
  ripple that sweeps the eye's line across a small sun draws it as a ring. The dazzle is wide enough, 0.09
  radians, for the ring to close into a white piece.)

**The rays** (`light-shafts.ts`). In the photographs there are two things: looking up, a burst of very many
fine streaks about the sun; from the side, a few broad soft slanting bands that fade halfway down. Ours were
a few thin rods of even brightness. Now there are two kinds of shaft: 400 broad soft ones (0.2 to 1 m wide, 7
to 14 m long, dying away with depth), and 484 fine ones close round the line from the eye to the sun, which
do not show from the side. A shaft brightens as trains of ripples pass over the spot it hangs from, so
neighbours brighten together and the curtain of rays shifts; it is brighter looking back along the light,
and brighter the more nearly the eye looks along it, through more of it; and it leans a little as the ripple
over it tilts.

**Waves from below.** Foam is neither window nor mirror: a pale ceiling of bubbles with the daylight in it,
ragged at its edges, where the waves' own foam lies (the wave model's, as the top side draws it). So white
water running over the reef shows from below, and the back of a breaking wave.

**Bubbles under breaking water** (`bubble-plumes.ts`; built by an Opus agent to a brief, then fitted to the new
water and made denser). Where a lip lands, where one is falling and where white water runs, the spray's own
sampling of the wave model drives puffs of bubbles down while the eye is under water, where above it it throws
spray: a pool of 500 soft point sprites, each driven down, stopped by the water, then rising and thinning over
two to four seconds, so that a pale cloud hangs under the foam where the wave broke and is gone when it has
passed. A puff keeps its depth under the surface as the wave passes over it (the wave model is asked for the
surface over 48 of them a frame, in turn) and rests on the floor instead of sinking into it; the water between
takes it with distance as it takes everything (`through-water.glsl`). None is released further than 20 m from
the eye.

**Measured:** the under-water board is as the sitting left it (the water's colours did not move); no view from
above the water changed.

**Known, and left:** the foam from below is a flat pale sheet, and the bubble clouds under it are soft and
pale, not the dense white churn of the one photograph; a wave seen from below has no lip (the breaker's mesh
is hidden, and it is the sea's own swell that shows); the glints near the eye are large soft-edged pieces;
white horses in a wind do not show from below; the spray's random streams now move on while the eye is under
water, so a view that has been under throws its spray differently from one that has not.

**Only the phone can say:** how the glints, the rays, the foam and the bubbles move (the rays brighten and
lean in time, which no still shows); and what a dive costs: under water the surface reads two more pictures
for every dot and does more arithmetic than it did, 884 ribbons are drawn where there were 256, and beside a
break up to 500 large soft sprites are blended over the view.

**Settled:** textures are painted by the program at start-up, as everything is, not shipped as photographs; the
`ground by arithmetic` switch goes (gone, with the formulas it brought back, at the start of the first sitting:
the ground's shader now includes the shore's formulas alone, not the whole island's); the measuring tools live
in the repository. And what the look under water is to aim at, in Ryan's words (19 November 2026): "perhaps
subnautica but mostly we should draw inspiration from nature/real life". So the second sitting goes by the
photographs in `reference-photos/under-water/`; a game may be looked to for how it solves a thing the
photographs show (water that stays readable at a distance, say), and is not copied.

### The third and fourth sittings, in one night (20 and 21 November 2026)

Ryan, of the second sitting after its further passes: "Overall this look great but for now I'd say it is best
we move on". He was stepping away for the night and asked for both remaining sittings at once, to review in
the morning: the rule of one sitting at a time is his, and for a night he lifted it. Agreed before he left:

- Two branches, the second begun where the first ends, so that each sitting can be looked at and merged by
  itself: `look-3-ground` (part 4) and `look-4-coral-and-sky` (parts 5 to 7). Milestones committed and pushed
  to them ("yes you may"); `main` untouched.
- The floor of the grove may be changed from lawn to what the photographs show: "you may try this, judge both
  what looks best and as well fits a real island. Consider that as the player is trying to survive we may
  eventually need the island to be larger or perhaps the ability to travel between atolls and larger island or
  two but this is for later". So what makes this islet a small sandy one (how much gravel, litter and green
  lies where) is kept as named numbers and pictures that another island could set differently.
- Ten hours, "take the time you need to get a good quality".

### The third sitting: the ground and what lies on it (20 November 2026)

**What the photographs say** (26 of the ground, gathered for the first sitting; `LOOK.md`, "Sand and beach"):
an atoll islet has no soil to speak of and no lawn. Its ground is coral sand and gravel from shore to shore,
pale grey; under the palms lie dead leaflets bleached to straw and silver, brown leaves, husks and twigs,
thick under the crowns and thin in the open; the green comes from creepers that run out over the sand from the
foot of the shrubs, from seedlings and from tufts of grass. Ours was a lawn of noise with brown blotches.

**The ground, redrawn** (`terrain-colour.glsl`, "Dry land"; `DECISIONS.md` 20):

- *Sand from shore to shore.* Inland it is the beach's sand a shade greyer, and stained darker where the shade
  is deep. The lawn, its bare patches and its brown soil are gone; the turf's broad patterns stay, and now say
  where the ground is lush, where dried out and where a bank of gravel lies. The grass still grows by them.
- *Three pictures of real things* (`world/ground-tiles/`, painted once at start-up, 1024 dots for 3 m of
  ground, each built by an Opus agent to a brief and judged against the photographs): coral gravel (broken
  fingers of branching coral, lumps, shell); the trees' litter (dead leaflets, dry leaves with their veins,
  twigs, flakes of husk); and low plants (runners of beach morning glory, a small creeper, seedlings). In each,
  alpha is a thing's rank, and the ground shows the things above a threshold: so the one picture of gravel is a
  few stones on clean sand, a scatter, or a whole bank, and the litter is a leaf here and a mat there.
- *A map of what stands over the ground* (`world/tree-cover-map.ts`), drawn from where the palms, trees and
  shrubs were put: litter lies under a crown, creepers gather at a shrub's foot, and the sand is darker where
  several crowns stand over it. Before, litter lay where a pattern of noise put it.
- *Shadows.* A stone or a leaf throws a shadow behind it and catches the sun on its near edge, from a second
  reading of its picture a shadow's length towards the sun: longer as the sun gets low. Without it a painted
  stone is a stain (`LOOK.md`: "painted things read as flat").
- *Where the beach meets the plants:* runners reach out over white sand before the plants proper begin; the
  band of rubble at the back of the beach is the gravel's picture; and along the tide line the sea leaves a
  thin, broken line of dark wrack with the shells.
- *A footpath* is sand trodden smooth and pale, with few stones and clear of litter and of plants, so that
  it shows as a track through the gravel and the creepers (as gravel itself it could not be told from a bank).
- *A stone by itself is pale.* A lone stone on sand is bleached nearly as white as the sand; it is a bank of
  them that is grey. (As dark as the bank's, a scatter of stones on white sand was a leopard's coat.)
- *What falls from a palm lies under it.* The fallen fronds and the nuts, which are shapes, were scattered
  anywhere (the nuts on the beach by home alone): they now lie under the palms' crowns, 800 fronds and 360
  nuts where there were 240 and 70, and most of the nuts are weathered grey (`plants-config.ts`,
  `fallenFromPalms`). A nut is drawn within 45 m where it was within 90: further off it is a dot. The other
  things on the ground after them in the plants' stream (vine mats, lumps of coral, stumps) stand in new
  places for it.
- *The modelled vine mats* that stand among the painted creepers were a brighter, purer green than they are,
  with leaves of four straight edges: their leaves are now the creepers' olive and cut rounder
  (`things-on-the-ground.ts`).
- *How green the floor is* is one number (`terrain-colour.glsl`, `LOW_PLANTS`, its first part): where the
  ground is lush the creepers close into mats, and elsewhere it is bare gravel and litter. It was raised a
  step from the first try, which was greyer than most of the photographs' groves.

**Measured** (`tools/look/boards/ground.json`, a board of the ground's own; saturation as a multiple of the
photographs', then how much lighter or darker):

| Material | Photos | Before | Now |
|---|---|---|---|
| The floor of a grove in sun | lightness 0.54, saturation 0.019 | 3.9 times, -0.02 | 1.3 times, +0.09 |
| Coral gravel in sun | 0.65, 0.005 | 12.6 times, +0.01 | 3.2 times, +0.05 |
| Litter under the trees | 0.54, 0.050 | 1.5 times, -0.07 | 0.7 times, -0.04 |
| Low plants on sand | 0.47, 0.065 | 1.4 times, +0.10 | 1.2 times, +0.02 |

The floor is still lighter than the photographs' (theirs are dappled with shade, and three of the seven are
of grey gravel alone). Gravel has next to no colour in the photographs, and ours has what the sun's warm light
gives it. In lightness none of these is busier than the photographs: its dots stray from a patch's average
0.5 to 0.8 times as far as theirs do. ("Before" is the lawn, measured where the gravel and the litter now lie.)

**More photographs**, gathered by an Opus agent from Wikimedia Commons for this sitting and the next: 30, of
which 12 of the ground (five grove floors from standing height, two sand tracks through palms, two islets
from the air, three of nuts and dead fronds close to). `LOOK.md` says what they show. They agree with the
first 26: grey sand and gravel, litter, and green only from what grows low.

**What it costs.** Five readings of a picture for every dot of ground (the three pictures, and stones and
litter once more towards the sun), in place of some forty readings of the noise picture that the lawn, its
vines and its soil took. The pictures are 1024 dots a side with mipmaps, some 16 MB in all on the graphics
card, and are read with up to four-fold anisotropic filtering, since the ground is seen at a low angle.
Painting them takes about 0.1 s each on the desktop, where the page's start-up went from 5.1 s to 5.4 s
under the test renderer. The fronds, the nuts and the vines' rounder leaves are triangles: a frame in the
grove from the clearing, the heaviest view on land, draws 773 thousand where it drew 739 thousand.

**Known, and left:** nothing painted stands up, so from an arm's length the stones are flat chips with a
shadow, and a mat of creepers has none of the depth of real leaves standing off the sand; the leaves of the
litter are of a few shapes, and close to one sees it; a picture repeats every 3 m, which no view has shown
but a long straight look across bare gravel might; far off a picture blurs to its average, and from the air
the ground is plain grey and tan; the grass still takes its place and colour from the lawn's patterns, and
stands as tufts on the sand; there are no husks, no heaps of fronds and no fallen trunks, only single fronds
and nuts.

**Only the phone can say:** what the ground's five readings and their filtering cost (read the frame rate
with `more dots` on, then with `plain ground` on as well: if the ground costs frames, the first thing to
lower is the pictures' anisotropic filtering, `ground-tiles.ts`); how long the start-up now is (some four
times the desktop's 0.3 s more, by the usual ratio); whether the pictures shimmer as the eye moves.

### The fourth sitting: coral, the reef's floor, the night sky (20 November 2026)

On the branch `look-4-coral-and-sky`, which begins where `look-3-ground` ends.

**Coral** (`world/reef/`). The photographs (28, and nine more gathered for this sitting: four Porites heads
seen whole, a bommie on sand, patch reefs from above): a coral is known by its surface, a brain coral's winding
grooves, a boulder coral's fine velvet skin over lumps a hand across, the close warts of the branching kinds;
and a head is one great dome, not a rock with things on it. Ours were smooth lumps under one blotchy mottle,
on platforms of cracked rock.

- *Each kind has its surface.* A picture made at start-up (`coral-surface-picture.ts`, built by an Opus agent
  to a brief and judged on lit balls beside the photographs: 512 dots for half a metre) holds a brain coral's
  ridges, a boulder coral's skin and warts, a pattern to a channel; each model says which it has (an attribute
  on its corners), and the shader lays the picture on from three sides by the way the surface faces, darkening
  the hollows. Of the lobed mounds every other model is a brain coral. The old mottle, the water's net of
  lines read small, is gone: it smeared every kind with the same lace.
- *A head is a great boulder coral* grown up to the surface: its sides alive, in big lobes with creases
  between, khaki; its flat top dead rock, pale, crusted pink and tufted green, on which the others stand. It is
  drawn with the coral's material where it was drawn with the rocks' (and the rubble round its foot is dead
  coral, likewise). Its sides go on down in a skirt, so that a head on a slope does not hang in the water on
  its downhill side.
- *Shapes.* A table's plate is thin, dished and uneven in outline, with a pale growing rim (it was a disc of
  sixteen straight sides in one shade, a counter from above); a staghorn has four thin stems where it had
  three thick ones; a bush's stubs are cut with four sides where they had three; a cauliflower coral's knobs
  are lobed clumps where they were balls.
- *Round things look round.* Under water the light comes from all sides and a branch was a flat plank: a
  surface seen edge on is now darker than one seen square on. The net of light falls by the way a surface
  faces, where every coral was taken to face half up.
- *Colour.* The tints are what photographs taken under water measure, and since the second sitting the water
  between a coral and the eye takes red of its own; from above the water the corals measured 31 to 51 degrees
  too green. Each tint is now multiplied by what it is out of the water (`reef-config.ts`, `outOfWater`), a
  middle course: from above they are 11 to 32 degrees too green; and coral within three metres of an eye
  under water has hues of 62 to 101 degrees, where eight close photographs of coral have 58 to 102 (ours had
  75 to 131).
- *A correction to the second sitting's record.* It says coral within a few metres was 57 degrees too green.
  The board's parts for that row lay on heads five to fifteen metres off, where the water has most of the
  colour, and the photographs' on coral two to five metres off. The row now measures coral that is near
  (the `reef` views).

**The reef's floor** (`terrain-colour.glsl`, "The reef flat").

- *Ripples in the sand* of a shallow floor, where the water is between a quarter of a metre and some five
  deep: long low ridges a hand's length apart, across the way the waves come (east and west on the ocean's
  reef, north and south in the lagoon), wandering and fading out in patches, shaded against the sun. They are
  a picture of slopes (`sand-ripples.ts`) kept in two unused channels of the grit's picture.
- *Rubble.* The reef's hard floor and the old reef round a head took their stones from arithmetic, a pebble to
  a square; they now take them from the gravel's picture, as the land does.

**The night sky** (`sky/`; built by an Opus agent to a brief, then tuned).

- *Stars are points* (`stars.ts`): 4200, of which 139 stand where the real ones do (Scorpius with Antares, the
  Teapot, the summer triangle, the Dipper, the Southern Cross and its Pointers, Orion and Sirius in their
  season), the rest scattered, three times as many at each magnitude fainter and more of them towards the
  Milky Way. The brightest are soft spots a few dots across and the faintest about one; most are near white,
  a few faintly blue or orange. They turn about a pole 7 degrees above the northern horizon once a day; they
  come out as the light goes; they are dimmer and warmer low down; the faint ones go near the moon; clouds,
  palms and the island hide them. (They were one sky-cube in 400 filled in: squares of one size.)
- *The Milky Way is a picture* made at start-up (`milky-way-picture.ts`), laid in the sky where the real one
  lies among those stars: bright and wide in Sagittarius, split by the Great Rift, knotted, all but gone on
  the far side. A full moon washes out nearly half of it. (It was a band of noise.)
- *The moon's face is the real one* (`moon-face-picture.ts`): the seas in their places, Tycho and its rays,
  Copernicus; its north to the sky's pole, so that it rises tipped over and stands upright in the south.
- *A moonlit sky is deep blue*, lighter towards the moon: the old band of noise had lit most of the sky by
  accident, and without it the sky was black.
- The season is a night of late July (`sky-config.ts`, `starrySky.dueSouthAtMidnight`): the Milky Way's
  bright middle stands in the south-west at midnight, clear of the moon.

The day's sky and the dusk were measured again and left: the sky high and at the horizon are at the
photographs' lightness and hue (saturation 1.1 times theirs); at sunset the sky low down is 10 degrees redder
and the sky high 32 degrees more violet than the photographs' average, which the six photographs differ among
themselves by more than.

**Measured** (`tools/look/boards/under-water.json` and `colours.json`; a group of views each for the reef and
the night sky in `look-views.ts`):

| Material | Photos | Before | Now |
|---|---|---|---|
| Coral within three metres, from under water | eight close photos: hue 58 to 102 | hue 75 to 131 | hue 62 to 101 |
| Lobed and massive corals, from above | 0.40, 114 | hue +31, lightness +0.15 | hue +11, lightness +0.11 |
| Table corals, from above | 0.58, 82 | hue +51, lightness +0.07 | hue +32, lightness +0.01 |

**What it costs.** For a dot of coral, three readings of the surface picture and two of the detail texture,
where there were three of the detail texture (and for a dot of a head, six fewer than the rocks' material
took). A head is some 2000 triangles within 32 m and 400 beyond, where it was 700. A first cut of the new
shapes drew a fifth more triangles beside a reef (staghorns of 1100 triangles where they had 400, bushes of
1900 where they had 1200): they were trimmed where it bought little, and a frame under water by two heads
now draws 682 thousand triangles where it drew 656 thousand, and one on a head 620 thousand where it drew 595. The ground's shader reads
no more pictures than after the third sitting: 13 of its own, the grit and the shadow map, 15 of the 16 that
WebGL 2 promises (`DEVICE_NOTES.md`). The sky's dome reads one picture for a dot of night sky where it worked
out two sky-cubes and five octaves of noise (`fbm5`, which nothing uses now, is gone from `noise.glsl`); the stars are 4200 points. The page's start-up is longer: 5.0 s
before the night, 5.7 s now under the test renderer, of which the ground's three pictures are 0.3 s, the
coral's 0.1 s and the sky's two 0.2 s.

**Known, and left:** where two of the three sides a coral's surface is laid on from meet, the pattern has a
seam (it is taken from the side faced most squarely, nearly alone: blended evenly, a brain coral's ridges
were a blur there); warts on a smooth knob can read as pebbled leather; the corals on a head are scattered as they were, with no kind keeping to its own depth or
side; a head's dead top is plain; far heads are a green-blue 30 degrees greener than the photographs' (the
water's own colour, which the second sitting set); the sea at sunset is a brighter, bluer slate than most of
the photographs (the water was not to be touched in this sitting); the moon is full every night and its path
is not a real moon's; the Milky Way is plainer than a long exposure shows it, as the eye has it.

**Only the phone can say:** the stars' twinkle and the sky's turning (some 0.6 degrees a second, a ten-minute
day); how the faintest stars read at the phone's dot size; whether the corals' surfaces shimmer as the eye
swims; what the coral's shader and the heads' triangles cost beside a reef (read the frame rate under water
by a head, with `more dots` on, then with the coral hidden); and how much longer the start-up is (on the
desktop the pictures take some 0.7 s to paint in all: on the phone perhaps two or three seconds. If that is
too long, the first to make smaller are the ground's three, `ground-tiles/*-config.ts`).

### After the night: soil, and the sea floor again (20 November 2026)

Ryan's notes on the two sittings, the morning after: "the ground cover on the island is much better. The only
thing I would recommend is some smaller patches of dirt as eventually the piling up decaying vegetation and
such would become dirt"; and "the under water grounds textures and patterns have a lot more room to be
improved. Much more variance is needed and as well the patterns we have now do not look natural. Could you do
passes against actual references until this is looking better? 2-3hrs". And while it was in hand: "the
appearance from far up is important as well but consider the most important is from the players perspective";
"make sure there is not a hard edge between the shore/sand and rubbly for island in lagoon"; "make sure the
ripples in sand are in a sensible direction, generally towards the shore". On the branch `look-5-sea-floor`,
which begins where `look-4-coral-and-sky` ends, and left uncommitted for him.

**Soil** (`terrain-colour.glsl`, "Dry land"). Where litter has lain and rotted longest, the sand is a dark
crumb of humus: under a crown, in deep shade, on lush ground, in patches a few steps across, and on most of
the islet not at all. Its colour is measured on the humus-stained sand at the top of a beach at Fakarava (a
fifth to two fifths as light as the clean sand beside it, and nearly grey); its edge is a crumb's, dark over
pale in specks; a stone that lies in it is stained, and more litter lies on it. How much of it there is, is
two numbers (`SOIL_GATHERS`, `SOIL_BETWEEN`).

**What was wrong with the floor.** It was one sheet of pale sand with ripples in combed bunches, laid north
and south in the lagoon and east and west on the reef whichever way the shore ran; soft dark blots where reef
was meant; a fuzz of pink and grey on the crest; the land's gravel on the fore reef. Every pattern was a
noise and every edge a blur. Round the islet in the lagoon the dark ground came up to the waterline and
stopped at a line.

**The photographs**: 23 of the floor, gathered by an Opus agent from Wikimedia Commons into
`reference-photos/sea-floor/` (`LOOK.md`, "Reef and sea floor", says what they show). None shows the mounds
and pits of a lived-in lagoon floor, which are painted from what is known of them.

**The floor, redrawn** (`terrain-colour.glsl`, "The sea floor"):

- *Sand, rubble and rock by amounts.* For each spot the shader works out how much of the floor is rock, how
  near a reef is, how thickly rubble lies and how lived in the sand is, from the depth, the reef's pictures
  and single readings of the ground's noise; then it lays pictures of the real things by those amounts, as
  the land's ground does.
- *The sea bed's picture* (`world/sea-bed/`, painted once at start-up, 1024 dots for 4 m of floor, by an Opus
  agent to a brief, in two rounds, and judged against the photographs). Three of its channels are the reef's
  hard floor: its height as a rank, its fine light and dark, and what covers it as a place on a ramp of
  colours the shader owns (thick turf, what lives on it, old rock, pink crust, clean and pale). The fourth is
  the relief of lived-in sand: mounds, funnel pits, trails. (It is named the sea bed's to keep it apart from
  the waves' pictures of the floor's shape, `sea/sea-floor-pictures.ts`.)
- *The sand floods the rock to a level.* The more of the floor is rock, the lower the sand lies in it: so a
  reef's edge is knobs of rock standing out of sand, then gutters of sand running into rock, then pavement
  with sand in its holes, and never a line. Read a little towards the sun as well, the same height shades
  the rock's slopes.
- *Rubble* is the stones' picture laid finer, as a fringe where the rock begins to stand out of the sand, in
  banks behind the crest, and as a thin scatter of pale pieces on open sand in stretches.
- *Sand.* Shallow, it is a net of ripples: their picture is now the sum of forty plain waves of nearly one
  length and direction, which fork and join as real ripples do, and it is laid round the atoll so that the
  ridges follow the shore everywhere: the ocean's shore on the reef, the lagoon's in the lagoon, circles
  round the islet in its middle. Deeper, it is humped and pitted, more in one stretch and less in the next,
  and blotched with a film of algae that the fresh heaps stand out of.
- *One place differs from another.* The lagoon's rock lies under turf and silt; the ocean reef's is crusted
  pink, most on the crest; in the shallows inside the gardens the pavement shows through the sand in knobs;
  the cover's colours wander from stretch to stretch.
- *The islet in the lagoon.* Its beach runs down into sand, and the reef round it begins further out, sooner
  here and later there and in stretches not at all.
- *From far off* the picture fades to its averages (its repeat showed as a lattice over the whole reef from
  the air), and a reef's edge is cut by the noise at a few metres, as lace: from the air the atoll is as it
  was, with crisper patches.

**Measured** (`tools/look/boards/sea-floor.json`; the hue as degrees from the photographs', the lightness as
a difference, to an eye under water):

| Material | Photos | Before | Now |
|---|---|---|---|
| Reef rock under turf | lightness 0.45, hue 151 | hue +34, lightness +0.10 | hue -12, lightness -0.02 |
| Coral rubble | 0.68, hue 207 | hue 0, 0.00 | hue -25, -0.05 |
| Sand a metre or two under | 0.74, hue 180 | hue +28, -0.04 | hue +27, -0.04 |

The sand is as it was (its blue-green is the water's, which the second sitting set). The crust is not in the
table: the photographs of it disagree (salmon pink at Rose Atoll, grey in the Bahamas, mauve at Midway), and
a part of ours always holds turf and holes with the pink; ours lies between them. Soil with its litter is
0.18 darker than the sand beside it, where Fakarava's is 0.17 to 0.27.

**What it costs.** Three more readings of a picture for every dot of ground (the sea bed's: here, a little
towards the sun, and once much finer for the rock's grain), and about as many readings of the noise on the
sea floor as before. The ground's shader now reads 16 pictures, all that WebGL 2 promises
(`DEVICE_NOTES.md`): the next must share one. Painting the picture takes 0.2 to 0.3 s on the desktop, where
the page's start-up went from 5.7 s to 6.0 s under the test renderer. No triangles are added.

**Known, and left:** nothing painted stands up, so from a hand's distance the rock is a flat picture of
knobs and the rubble a flat bed; the bed of rubble is the land's gravel, lumps without the sticks and plates
of broken branching coral; the picture repeats every 4 m, hidden near to by the amounts' wandering and far
off by fading; the rock's small pale knobs can read as bubbles; a trail in the sand can loop into a neat
ring; the film of algae is tufts of one grain; nothing lies on the floor that could be picked up (sea
cucumbers, shells, clams off the heads); the fore reef's floor has only one photograph behind it.

**Only the phone can say:** what the three new readings cost (read the frame rate under water over a reef
with `more dots` on; the first thing to lower is the picture's anisotropic filtering, `mostAnisotropy` in
`sea-bed-config.ts`, then the grain's reading, `ROCK_GRAIN`); how much longer the start-up is (perhaps a
second; the lever is the picture's size); whether the rock and the ripples shimmer as the eye swims; and
whether 16 pictures is within the phone's own limit (if it were not, some ground would come out black).

### The same day, his second notes: how the water hides its floor, the drop-off, the ripples

Ryan, of the sea floor: "all of the new changes are great", and four things, with pictures. The ripples "look
banded and unnatural" in places. "The face of the cliff/dropoff should be less sandy probably more rocky
though check what actually makes sense." And the water: "you can almost see under the top opaqueness"; "how
stark the shallower areas are to the opaqueness"; "how the waves get coloured differently because of this";
"the level of opaqueness based on depth is a bit too stark and has some oddities we should refine". The first
part of the branch was committed at his word, and this part, with its faults named below, when he had seen it
("yes please commit and push").

**What was wrong with the water** (`sea/water.frag.glsl`, "How much the water hides what is under it"). It
hid its floor by a step: next to clear at a metre, solid at five and a half, steepest between two and four.
So the rim of every pool and the foot of every coral head was the edge of a lid. And for a low eye there was
a second, harder edge: where the line of sight, followed 16 m on, was still above the floor, the water was
solid at once, in a colour far darker than the pale floor seen through the clear water just before it. On a
level shelf that is true of every spot more than a few strides off, and it drew a line across the lagoon. And
in the surf zone a third veil came in with the first metre of depth, so that a swell crossing the crest
turned from clear to turquoise as it passed.

**A first answer** kept the veil on the surface and made it gradual: by depth on a curve with no step, and
for a low eye by how far the line of sight runs on under the surface. Ryan, on hearing of it: "distance from
the observer is what would determine opaqueness looking at something through water. Not strictly the depth.
If this is too intensive to calculate we still would want to get as close to this as possible. Do some
research on how this could be and what other people have done for rendering realistic water."

**What the research found** (an Opus agent, an hour of reading; its notes with every formula, number and
source are `docs/research/water-hiding-its-floor.md`):

- *The engines go by the length of the eye's line inside the water*, got from the scene's depth behind each
  dot of the surface (Unity's HDRP and URP water, Crest, Catlike Coding's "Looking Through Water"): what is
  behind is multiplied by exp(-absorption x length) for each colour, and the water's own scattered light put
  in its place. They use the depth straight down as well, for other things: the shallows' tint, foam, the
  damping of waves. We may not read the scene's depth (`DEVICE_NOTES.md`).
- *Without it, Half-Life 2's engine fogged every thing under water in the thing's own shader*, by the part
  of the line from the eye to it that lies under the water's plane (`CalcWaterFogAlpha` in Valve's published
  shader code). The surface then has only its reflection to add, over a floor that is veiled already. That
  is what our materials can do, and it is what cures the lid: a thing is hidden by the water it is under,
  not by the depth of whatever lies beside it.
- *For an eye above the sea the length that counts is the bent one.* Light leaving water bends at the
  surface, so it comes up through the water at no more than 49 degrees from straight up, through at most one
  and a half times the thing's depth, however far off and low the eye is. None of the engines read bends the
  line, and with the straight line a flat 2 m deep and 100 m off would be seen through 54 m of water and be
  the colour of the open sea; with the bent one it is seen through 3 m and is the colour of its depth to the
  horizon, as in every photograph of a lagoon. What makes far water hide its floor in life is the sky's
  reflection, which is half to four fifths of the light beyond 83 degrees.
- *Real lagoon water is clearer than ours.* Sand is still most of the light that comes back from 10 m, and a
  good part at 20 m; red is gone by 5 to 10 m. Ours hides two thirds by 4.6 m, which is the palette Ryan
  approved in the first sitting: it is one number (`HIDES_BY_METRES`) if he wants it clearer.

**Now** (`shaders/shared/water-veil.glsl`; `DECISIONS.md` 16):

- *Each thing under the sea draws most of the veil on itself, by its own depth*: the ground, the rocks, the
  coral, the plants and the animals alike, through three.js's fog, which already veiled them by the distance
  for an eye under water (`sea/water-as-fog.ts`). The water its light passes through is its depth, times up
  to one and a half as the eye looks lower (the bent path). Under water it is the plain distance, as it was.
- *The surface draws the rest* (35 parts in a hundred of the veil's strength), by the depth of the floor
  under each spot of it, because only the surface knows the swell's shading, the clouds' shadows and the
  foam's cloudiness. Looking straight down the two together hide exactly what the surface alone did.
- *The veil has no step*: the share hidden is 1 - exp(-(metres / 4.6) squared), a twentieth at a metre, a
  fifth at two, two thirds at 4.6, nearly all by nine.
- *For a low eye, far water loses its floor by degrees*, by how far the line of sight runs on under the
  surface before it meets the floor (two thirds by 34 m), into the colour of its own depth: there is no line
  where it turns solid. Beyond a reef's edge the line meets nothing and the water hides all.
- *In the surf zone* the water is cloudier by the same rule, not by a veil of its own.

So the rim of a pool is no lid: its walls and floor fade as they go down. A coral head's flanks fade into
the blue. A swell crossing the reef flat adds three parts in a hundred to the veil where it added fourteen,
and thirty over the crest.

The water's colours are as they were: measured against the photographs before and after, deep lagoon, far
sea and shallows differ by a degree of hue and 0.01 of lightness (`boards/colours.json`). Dusk, night, cloud
and high wind were looked at side by side and are unchanged.

**Shadows under water at a low sun** (Ryan, the same hour: "the shadows of the palms and such can be
disembodied at twilight hours being rendered even on the deep ocean floor"). The shadows are worked out as
in air, straight: with the sun five degrees up, a palm's shadow reached the floor 5 m down some 57 m further
on than a real one, which light bent steeply down at the surface would put within 6 m. And at such a sun
little of its light goes into the sea at all. So a shadow on anything under water now fades out between
3.5 and 9 m of depth at any hour, and in any water deeper than a wade as daylight falls
(`shaders/shared/light-net.glsl`). No view drawn here showed the fault or its cure: it is by rule, for Ryan
to confirm.

**The drop-off, and every steep face.** What makes sense: loose sand rests at some 30 degrees and no
steeper, and a fore reef's slope is reef framework with sand only on its terraces and in its grooves. So the
ground now tells its shader how nearly level it is (the upward part of its normal, from the corners of its
triangles), and ground steeper than about 30 to 40 degrees is bare reef rock at any depth: the walls of the
grooves and pools, a patch reef's flanks, the drop-off's face, which had sand in patches all the way down. On
the ocean reef's seaward slope the limit is 10 to 20 degrees. The rubble's fringe follows, at the top and
the foot of a wall.

**The ripples.** They were the sum of forty plain waves, and where such waves cancel there were none: bands
of ripples and bands of bare sand, the same bands again every 2.4 m. Now the waves are added as turning
arrows and only the sum's direction is kept: ridges of one height everywhere, which fork just where the sum
comes to nothing (`world/sand-ripples.ts`).

**And the reef's rock from above** (seen while looking at the waves, and in one of his pictures): solid
reef was a lattice of the sea bed picture's own dark patches, every 4 m. The ground's noise at a few metres
now moves both the level the sand lies at and the cover's place on its ramp, so that each repeat bares
different knobs and is darker or paler than the last; and the picture fades to its averages from 14 m, not
22.

**Known, and left:** on a steep face the rock's picture, laid from above, is drawn out down the slope (by a
half at 45 degrees, more on a groove's wall); from a low eye, stones and heads some way off show dimly
through the surface, where before the solid water hid them, which is true to life but new; with the floor
showing deeper, the straight edges of the fore reef's spurs can be seen from above, where the ground's
triangles are large; the floor seen through the surface is still not bent, so things under water stand
where they would with no water there; the veil goes by the still sea's level, not the wave over a thing;
the surf zone's cloudiness is a fixed band along the reef, not the wake of the waves that break there.

**Only the phone can say:** whether the water reads as water in motion now that it is clearer (the net of
light and the floor show deeper); whether every material has taken the new uniform (a thing that had not
would stand unveiled in deep water, as nothing did here); and the frame rate, which should not have moved
(no picture more is read; each dot of a thing under the sea does a little more arithmetic).

Two groups of views were added for this: `waterDepth` (out over a pool, the lagoon from a low eye, a head
and the reef flat from above) and `steepFloor` (the drop-off's face and foot, a pool's wall).

### The water and its floor against matched photographs: the plan (20 November 2026)

Ryan, of the passes above: "this is better but still there are issues. In a lot of places it feels we have
'spray painted' the surface"; "still seeing a lot of oddities in how we do the sand texturing"; "I think we
should try to better match the real lagoon. Lets plan what would be needed to actually resolve this so we are
not just spinning."

**What his two pictures showed, and why.** A flat sea at dusk with the reef as stains on it: the passes above
had moved most of the water's veil onto the things under it, and the surface's own ripple shading went with
it; from afar the floor's detail is faded to flat averages, so a patch of reef is one colour with a soft edge;
and nothing under water is bent or blurred, which was named on 17 November as the largest step left. A
stepped edge along the drop-off: the rule that steep ground is rock went by the ground mesh's own normals,
and had its 2 m triangles' edges. Kinked ripples: they were laid by the distance from the shore, read from a
picture that holds it to 3 to 6 cm in steps a forearm apart, and ripples 9 cm apart kinked at every step.

**Why the passes went round in circles.** (1) They were judged on small pictures, from poses chosen for
them, at noon in a light breeze; he flies anywhere, at full size, at any hour. (2) There was no agreed
target: the boards measure a patch's average colour, not how a reef's edge or rippled sand looks through
water. (3) The water was three rules laid over one another (a tint on each thing by its depth, the new veil
on each thing, the surface's own colour and opacity), mended in turn, so that each mend moved something else.

**The plan he agreed** ("this all sounds good... take as much time as you need to get a high quality"), in
three sittings with his review after each:

| | Stage | What is done |
|---|---|---|
| A | Targets | Eight pairs: a photograph beside our view from the same height, way of looking and light, as large as they come (`tools/look/pair-sheets.ts`). And a fly-round: twelve spots from 5 to 40 m up, each at noon, at dusk and under cloud, looked over at full size before a pass is called done. |
| B | The known faults, at their causes | Ripples laid without the shore's picture; steepness from the island's formula; painted edges for rubble and for the film of algae. |
| C | A trial: bend what is under water | Everything the water veils drawn first to a picture half the screen's size; the surface reads it a little to one side, by its slope. Behind a switch, for the phone to say what it costs. |
| D | One rule for the water | Colour and clearness from real lagoon water, by the true distance through it, with the sky's mirror weighed against the light from below, in place of the three rules. |
| E | The floor against the pairs | The ripples' size and shape from standing height; rubble painted for the reef; structure at the middle distance, so that a patch is not flat from the air. (The ground's shader is at its limit of 16 pictures: its pictures would be stacked in one.) |
| F | Checks, the phone, the docs | |

Not to be touched: the surface's look that he approved (ripples, glints, foam, waves) and the colours
measured in the first sitting.

### That plan's first sitting: the targets, the three faults, the trial (20 November 2026)

**The pairs** (`tools/look/boards/pairs.json`; three of the photographs are Ryan's own references): rippled
sand from standing in the shallows; rock through knee-deep calm water; a lagoon's shallows from its beach; a
reef flat from a jetty; a patch of reef from a boat; a reef flat running to its drop-off, from the air; a
lagoon's patch reefs, from the air; a calm lagoon at dusk. They are for him to approve or change. What they
show at once, before anything is mended: our shallow water is coloured turquoise from the first step, where
half a metre of real water over white sand is all but colourless; our patches of reef are cut out crisply,
where real ones are soft and broken by the ripples; from a low eye our far heads and stones show through the
water, where real water at that angle is the sky's mirror; at dusk our floor shows, where a real lagoon is
all mirror. The first is stage D's, the second C's and E's, the last two D's.

**The three faults:**

- *Ripples* are laid in circles about the atoll's centre, by the distance from it, which is exact: every
  shore here follows a circle nearly enough. (The picture is read twice, by two directions that each jump a
  whole turn along a different line, so that no hairline shows where one jumps.)
- *Steepness* is the island's own formula, worked out a metre to each side for every dot of the reef's cover
  picture (its fourth channel, which was spare), not the mesh's normals.
- *Rubble* lies as an apron at the foot of each rock, by the sea bed picture's own heights: the floor next
  under the level the sand lies at, wider the more rock there is. So it has the rock's painted outline. The
  soft fringe that fell away over metres from a reef is gone, and so is the scatter on open sand (thinned
  out, the stones' picture shows its largest pieces alone: grey slabs on clean ripples). *The film of algae*
  is the sea bed picture's painted patchwork, as sparse dark blotches, and ripples run on under it.

**The trial** (`src/sea/under-water-picture.ts`; the debug panel's `bend what is under water`, off unless
switched on). Everything that takes the scene's fog is drawn before the frame into a picture half the
screen's size, each thing as it is and with its depth under the sea beside its colour; the surface reads the
picture where it would have shown the frame through itself, shifted by 0.3 of its slope over the depth, and
draws the whole of the water's veil over what it reads, by that thing's own depth. On the desktop it does
what was hoped: heads, stones and the edges of reef break up and shimmer under the ripples, the surface's own
shading is back over the lagoon at dusk, and where there is nothing behind the water the picture says so (no
sky through a wave). It reads no depth texture: the depth is a number each thing writes beside its colour.
What it costs is the scene's triangles drawn twice and a quarter of the screen's dots coloured twice.

**Left for the later stages:** with the trial on, the floor in the shallows is the picture's and half as
sharp (the net of light most of all); a thing that stands out of the sea in front of water can leave a dot's
fringe; the coral heads' own search along the line of sight is still made, though the picture now answers it;
the rubble's bed still reads as crazy paving close to; the film's blotches have crisp edges.

**Only the phone can say:** what the trial costs. Read the frame rate with `more dots` on, then with `bend
what is under water` on as well, on the beach, over the lagoon and over the reef. If it holds, stage D is
built on the picture; if not, D goes on each thing as now, and the painted look can be lessened but not
ended.

**Ryan's notes on it, the same day.** The phone, with `more dots` and the trial both on: 39 to 42 frames a
second (what it makes with `more dots` alone, and with the trial alone, is still to be read: the first was 60
on 19 November). The pairs "are good, we could also use them to help with colours if there is time": that is
stage D's first step. And "still seeing issues in the ripples when I search", with a picture of ridges
kinked along dotted lines down the screen.

*The ripples, a third time.* The cause named above (the shore's picture) was not it, or not all of it: the
fault was in the ripples' own picture, and showed as soon as the picture was drawn by itself, which had not
been done. A sum of plain waves of nearly one length and direction comes to nothing along lines that run
across the ridges, and on either side of such a line the ridges are out of step: as heights that had been
bands of ripples and bands of none, and as ridges of one height it was a seam down the picture at which every
ridge kinked. The picture is now made as real ripples are built: even ridges, a slow wander laid over them,
and eighteen extra lengths of ridge let in, each ending in a fork at both ends (`world/sand-ripples.ts`).
Drawn by itself and tiled, it has no seam; in the game, from 3 and 6 m up in every quarter of the atoll, at
noon and at dusk, with the trial off and on, the ridges run whole (`tools/look`, the group `ripples`).

*The dolphins* are left out of the scene for now, at his word (`life-config.ts`, `dolphins.areOut`).

*Rocks sliding on the ground under the trial* (Ryan, the same day: "it can seem as if the coral/rocks are
sliding on the ground"; and "we need to be comprehensive when we make changes like this, not just consider
the code in isolation. As well we should write and structure our code so things like this are avoided"). The
trial gave the surface a way to bend what is under it, and two older rules that stood for the same bending
were left running, neither of them in the file the trial was written in: the ground, rocks and coral swayed
(`sway-under-water.glsl`, in their vertex shaders), and the ground's markings alone swam
(`terrain-colour.glsl`). So the markings were moved three times and the rocks twice. And the surface moved
all behind a spot of itself alike, by the floor's depth, where a head's top should hardly move and the sand at
its foot should.

What was done, and how it is kept from happening again:

- *Every rule that draws what the water does to the view from above was listed*, across all the shaders:

  | Effect | Rule | Where | With the picture drawn |
  |---|---|---|---|
  | Bending | sway of ground, rocks, coral | `shared/sway-under-water.glsl` | off (was on) |
  | Bending | the ground's markings swim | `terrain-colour.glsl` | off (was on) |
  | Bending | the surface reads the picture to one side | `water.frag.glsl` | on, each thing by its own depth (was by the floor's) |
  | Veil | each thing veiled by its own depth | `sea/water-as-fog.ts` | off in the picture |
  | Veil | the surface's opacity | `water.frag.glsl` | all of the veil, by the depth of what is behind |
  | Veil | a coral head sought along the line of sight | `water.frag.glsl` | off |
  | Veil | far water hides its floor for a low eye | `water.frag.glsl` | off |
  | Veil | each thing greyed and tinted by its depth | `shared/seatint.glsl`, `terrain-colour.glsl` | on, as without the picture |
  | Light on a thing | red lost with depth, the net of light, shadows filled | the things' own shaders | on: it is the thing's own |

- *The bending has one owner.* `shaders/shared/seen-through-surface.glsl` says whether the things under the
  sea must be drawn moved or the surface bends them, and the sway and the swim ask it and nothing else; a new
  rule of either kind is told of there. The standard is written down (`CODE_STANDARDS.md`, "One owner for
  each effect").
- *Checked by motion, not by reading:* with the surface's bend set to nought for one build and the picture
  drawn, two frames 0.6 s apart show the stones and the floor's markings standing still, where before the
  markings moved. `draw-views.ts --later` draws such pairs for any view.

Known, and left: with the trial off the older fault is as it has been since 18 November, at a smaller size:
the ground's markings swim and the rocks do not, and the fish and the weed do neither. And the veil still
has several owners, kept in step by hand: the table's five rows. Both end if the picture becomes the only
way the water is drawn, since the older rules are then taken out and not switched off, which is the first
thing stage D would do.

*The picture made the one way the water is drawn, and the older rules deleted* (Ryan, of the trial after
that: "definitely with the trial on is much better. We should make the trial the default and delete the old
rules and then perhaps refine a bit before moving on to the next sittings"). Done the same day, by the table
above:

- *Deleted:* the sway of ground, rocks and coral, and its file; the ground's markings swimming; the greying
  and the glow painted on the ground, the rocks and the coral for an eye above; the veil in every material's
  fog; the surface's search for a coral head along the line of sight; its rule for far water and a low eye;
  the shares that split the veil between the surface and the things; the debug switch, the test hook and the
  tool's flag that turned the picture on.
- *What a thing under the sea draws on itself now:* the light that reaches it, dimmer and with its red lost
  by depth, and nothing of the water between it and the eye (`shaders/shared/light-under-sea.glsl`: one
  definition, where the ground and the rocks each had their own copy of the numbers).
- *What the surface draws:* all the rest, by the depth of the very thing behind each spot of it
  (`shaders/shared/water-veil.glsl`). The greying and the glow are the same formulas as before, moved.
- *A thing in next to no water* (the wet sand at the water's edge, a rock awash, the top of a coral head) is
  seen in the frame's own drawing of it, which is sharper than the picture; by the thing's own depth, not by
  the floor's under that spot of the surface, by which a pool's deep wall would show through the thin water
  over its rim.

Checked against the trial as he saw it, view by view (a count of dots that differ by more than 8 in 255, and
the average shift): every view from under the water and every view of the land is the same to the dot; the
pairs differ in 0 to 6 dots in a hundred, by an average of one or two in 255; a coral head seen from close
above is some 6 in 255 bluer and a little greyer, because coral was spared part of the tint when it was
painted on each thing, and the surface greys all things alike. That is left for the colours, next. The frame
pairs still show the stones and the floor's markings moving as one.

*Still to do if the phone asks for it:* what lies under the sea is drawn twice, into the picture and onto the
screen, and the surface then covers all of the second but what lies in a hand's depth of water. Leaving the
deep ground and coral out of the screen's drawing would save that, but a thing left out of a drawing casts no
shadow in it, so the shadows must be drawn apart first.

*The trial, cheaper:* nothing that stands still and wholly above the sea is drawn into the picture (the
palms, the land's plants, the inland ground), and the surface no longer searches along the line of sight for
a coral head where the picture answers that. Still to do if the picture stays: the ground under the sea is
coloured twice, once in the picture and once on the screen, where the surface then covers it.

### The islet's shore: what is under the sea drawn where it seems to be (20 November 2026, evening)

Ryan, of the build with the picture as the one way: a steady 60 frames a second on the phone; "everywhere
else is vastly improved"; but "from the island in lagoon the water still looks a bit off": a flat band of
cyan off the islet's beach, with a dark stepped line along the waterline.

**The cause** (found by drawing what the surface was working from: the raw picture, the depths it read, how
opaque it came out): nothing bent the eye's line *down* at the surface. The picture was drawn by straight
lines, and from the islet's top a straight line skims the islet's submerged slope, which falls away at about
the angle the eye looks down at: the whole slope from the waterline to 2 m down fills 27 dots of the screen's
height, edge-on, and past it the line lands in the basin, 8 m down. So the surface over the shallows found
the deep basin behind it and hid it in the water's own colour: a flat band. In life the line is bent steeply
down as it enters the water, and what is seen through a spot of the surface lies nearly under that spot: the
sand of the slope. (The dark line was a second thing: the water's colour went partly by the depth 16 m on
along the line of sight, an older guess of the same kind, which made the shallows of a steep shore the colour
of the deep beyond. That rule is deleted.)

**What was tried and thrown out:** reading the picture where the bent line would land. What should be seen
there is edge-on or hidden in a picture drawn by straight lines, and cannot be read out of it: it gave
streaks, and a ragged edge where the reading ran off the slope.

**What was done** (`shaders/shared/raised-through-surface.glsl`): into the picture, everything under the sea
is drawn raised to where it seems to be through a flat surface. A thing at depth d, seen at an angle, seems
to lie at d x cos(angle in air) / (1.33 x cos(angle in water)) under the surface on the same upright: three
quarters of its depth looking straight down, a third at twenty degrees, less the lower the eye. It is worked
out for every corner of every thing, in the one place every material's vertex shader passes through
(`sea/water-as-fog.ts`), so nothing can move against anything else; twice over, with no loop; and it fades
out between 6 and 10 m of depth, where the water hides all (and where the open sea's floor, one great
rectangle, would be lifted whole by its far corners). The surface reads the picture straight behind itself,
as before, and adds only its ripples' bending.

*Into the picture only.* For some minutes it was done on the screen as well, and the far floor of the reef,
which seems to lie a hand's depth under the sea, stood up out of the troughs of the waves as brown discs:
Ryan saw it in his dev server, which shows the working files as they are saved.

So that the frame's own drawing (by straight lines) is not mistaken for what the picture holds, it now shows
through only where a thing lies in under 12 cm of water (it was 30).

**Checked:** every view from under the water and every view of the land is the same to the dot as before;
the islet's shore from its top, from four sides and in a breeze, shows its sand running down under the water
and no line; the pairs and the fly-round were looked over at full size. From the fly camera things under
water sit a little flatter, as they do in life.

**Known, and left:** a thing is raised by its depth under the still sea, not under the wave over it; where a
tall thing stands close before a deep one, the raising is right for each but the picture's silhouettes are
its own; a thing under water at the very edge of the screen can be left out of a frame's drawing when only
its raised place is in view.

**Only the phone can say:** whether the new rule in every vertex shader draws rightly there (it is plain
arithmetic, with no loop and nothing divided by what could be nought, but this phone has disagreed with the
desktop about vertex shaders before: `DEVICE_NOTES.md`); and the frame rate, which should not have moved.
If anything under water or on land looks torn or stretched on the phone, this rule is the first suspect:
setting `raisedThroughSurface`'s result to nought in `sea/water-as-fog.ts` switches it off.

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

- The moonlit night has been judged on stills from the desktop only, and the moon's crossing of the sky and
  the stars' turning not in motion at all.
- "The look, against references" (above) has had its four sittings: each one's "Known, and left" says what
  it did not cure in its own subject.
- Short turf is sparse flat cut-outs; the young palm sits low and wide.
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
  time in a high wind at the ocean's edge. After the frame-rate and groundwork passes it holds 60 with `more
  dots` on, whatever is switched (19 November 2026).
- Shadows are redrawn on demand, not every frame. Anything that should cast a moving shadow needs thought first.
- Plants and rocks are instanced in map squares that are skipped when out of view, hidden beyond a distance and
  drawn with a simpler shape beyond a nearer one.
- The wave mesh is 16 sectors, each cut across into three tiles, at three levels of detail. Its vertex shader
  evaluates the wave model three times per vertex and is the dearest thing per vertex. The breaker's ribbon is 20
  pieces at three levels of detail.
- The ground is 77 tiles of 80 m (`world/terrain-shape.ts`): three.js leaves out the ones out of view, which is
  half to three quarters of its 332 thousand triangles from any place a player stands.
- The ground's colouring is still the dearest thing per pixel, and is drawn last so that hidden pixels are
  skipped. What it once worked out by arithmetic for every dot it now reads from pictures made at start-up: its
  noise (`world/ground-noise.ts`: some fifty readings for a dot of turf), the shore's shape in its direction (the
  water's own picture), what covers the reef (`world/reef-cover-picture.ts`), the turf's broad patterns
  (`world/turf-picture.ts`) and the random numbers its single things are placed by (dimples, pebbles, chips,
  flecks). What is left of its arithmetic is one arc tangent for every dot, and the lagoon's small waves at the
  water's edge, which the water's shader shares.
- Whitecaps cost up to four noise evaluations per water pixel, only above a medium wind. The lagoon's shore band
  (43,000 triangles) is drawn only in a high wind, in view and within 150 m.
- Automatic quality lowers resolution, then switches shadows off, below about 28 frames a second.
- The water's shader reads the ground's height from a picture made from the island's formula at start-up
  (`sea/floor-height-picture.ts`): on the phone that gave back ten frames a second of sixty. On this phone
  arithmetic is dear and a texture reading costs next to nothing.
