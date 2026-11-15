# Roadmap

What comes after the refactor (`REFACTOR_PLAN.md`, finished). The order was agreed with Ryan on 15 November
2026; he decides when it changes.

## Next

1. **A trial of a newer three.js**, on a branch, judged from the before and after pictures. It is 0.128 today,
   from 2021; the latest is 0.187. Sooner is cheaper: every new shader is one more to carry across. The
   materials that patch three's own shaders (six files) are where it is likeliest to bite. Ryan decides from
   the trial whether to move.
2. **The breaking wave: a study, then a design.** Ours cut into stills at exact times and measured, set beside
   what the maths gives and beside footage. Then a design for Ryan to agree before any wave code changes (the
   section below).
3. **The breaking wave, built**, in passes against the footage.
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

## Later

- More passes on the reef.
- A decision on a newer three.js, and on WebGPU.
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
