# Roadmap

What comes after the refactor (`REFACTOR_PLAN.md`). The order is a proposal; Ryan decides.

## Next

1. **Performance pass.** The debug panel (hold the corner button) reports the frame rate, the program's time
   for a frame, and the draws and triangles, so the phone can give numbers. Take them at the heavy moments
   (high wind near the water is the heaviest), then trim what they point at. Not the wave mesh's vertex shader:
   the breaking wave's rebuild replaces it.
2. **A trial of a newer three.js**, on a branch, judged from the before and after pictures. It is 0.128 today,
   from 2021. Sooner is cheaper: every new shader is one more to carry across. The materials that patch three's
   own shaders (six files) are where it is likeliest to bite.
3. **A first piece of the game.** The scene is far ahead of the game. Picking one thing up, with a count on the
   screen, settles the shape of `src/game/` against something real and tries touch on the phone.
4. **Rain.** Light rain, then heavy rain, then storm with stronger wind than "high". It reuses the cloud, light
   and wind systems: overcast sky, darker light, rings on the lagoon, wet sand and leaves, streaks in the air.
   It is also the weather a survival game leans on most: shelter, staying dry, collecting water.
5. **Night.** Close to black today when there is no fire. Moonlight with a phase, stars, a glow on the water.
6. **The ground close up.** Short plants, driftwood, coconuts, things to pick up. The first survival actions
   happen here.
7. **Survival systems.** To be designed with Ryan: needs (thirst, hunger, warmth, rest), gathering, crafting,
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
