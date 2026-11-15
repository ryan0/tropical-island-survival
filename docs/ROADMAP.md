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
   possibly larger. To be designed with him. Because the waves read the sea floor from a picture, it does not
   touch them again.
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
  not break a wave raggedly. And for each of two swells its delay: how far it has fallen behind a swell crossing
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
- The wave mesh is 16 sectors at three levels of detail. Its vertex shader evaluates the wave model three times
  per vertex and is the dearest thing per vertex.
- The terrain's colouring is the dearest thing per pixel (about forty noise evaluations on land). It is drawn
  last so hidden pixels are skipped.
- Whitecaps cost up to four noise evaluations per water pixel, only above a medium wind. The lagoon's shore band
  (43,000 triangles) is drawn only in a high wind, in view and within 150 m.
- Automatic quality lowers resolution, then switches shadows off, below about 28 frames a second.
- Not done: a height picture to replace the terrain formula in the water shader; noise from a texture instead of
  arithmetic in the terrain shader (it would change every pattern on the ground, so weigh that first).
