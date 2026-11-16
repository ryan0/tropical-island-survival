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
   (its outline kept, so nothing on land moves), then coral heads over the gardens, which Ryan means to rearrange.
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
  not break a wave raggedly; how nearly the main swell heads for the atoll's centre; and for each of two swells
  its delay: how far it has fallen behind a swell crossing
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

## Later

- More passes on the reef.
- A newer three.js. A trial of 0.187 was shelved on 15 November 2026: cheap on the desktop, but its shadows lose
  the graphics context on Ryan's phone (`DEVICE_NOTES.md`). And a decision on WebGPU.
- Sound beyond surf and crickets: wind, rain, the shore break.
- Spray where the shore break lands.

## Weak points

- Night without a fire is nearly black.
- Short turf is sparse flat cut-outs; vine leaves are angular close to; the young palm sits low and wide.
- Far palms and shrubs look thinner than near ones (leaf cut-outs blur together with distance).
- The breaking wave: its timing is off, and it is jagged and unnatural close to (the falling lip is a thin
  faceted sheet). To be rebuilt, above. Spray has only been tuned on stills.
- A whitecap's leading edge can look like a clean white blade close to the eye.
- The lagoon's raised waves and the ocean's shore break are slightly stepped where the mesh is coarse.
- Nothing can be picked up or moved yet.

## Performance: what is in place

- On Ryan's phone (a Pixel 10) the scene holds 60 frames a second, 57 at the lowest: what its screen shows. So
  no performance pass is planned. The debug panel (hold the corner button) reports the frame rate, the
  program's time for a frame, and the draws and triangles: read them again when something heavy is added.
  Still to read: the pixel ratio and the program's time in a high wind at the ocean's edge.
- Shadows are redrawn on demand, not every frame. Anything that should cast a moving shadow needs thought first.
- Plants and rocks are instanced in map squares that are skipped when out of view, hidden beyond a distance and
  drawn with a simpler shape beyond a nearer one.
- The wave mesh is 16 sectors, each cut across into three tiles, at three levels of detail. Its vertex shader
  evaluates the wave model three times per vertex and is the dearest thing per vertex.
- The terrain's colouring is the dearest thing per pixel (about forty noise evaluations on land). It is drawn
  last so hidden pixels are skipped.
- Whitecaps cost up to four noise evaluations per water pixel, only above a medium wind. The lagoon's shore band
  (43,000 triangles) is drawn only in a high wind, in view and within 150 m.
- Automatic quality lowers resolution, then switches shadows off, below about 28 frames a second.
- Not done: a height picture to replace the terrain formula in the water shader; noise from a texture instead of
  arithmetic in the terrain shader (it would change every pattern on the ground, so weigh that first).
