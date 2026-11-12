# Roadmap

What comes after the refactor (`REFACTOR_PLAN.md`). The order is a proposal; Ryan decides.

## Next

1. **Performance pass.** A frame-rate readout in the debug panel so the phone can report numbers, then trim what
   the numbers point at. High wind near the water is the heaviest moment.
2. **Rain.** Light rain, then heavy rain, then storm with stronger wind than "high". It reuses the cloud, light
   and wind systems: overcast sky, darker light, rings on the lagoon, wet sand and leaves, streaks in the air.
   It is also the weather a survival game leans on most: shelter, staying dry, collecting water.
3. **Night.** Close to black today when there is no fire. Moonlight with a phase, stars, a glow on the water.
4. **The ground close up.** Short plants, driftwood, coconuts, things to pick up. The first survival actions
   happen here.
5. **Survival systems.** To be designed with Ryan: needs (thirst, hunger, warmth, rest), gathering, crafting,
   fire, shelter. The castaway's camp behind `CAMP = false` is a starting point for things the player makes.

## Later

- More passes on the reef.
- A decision on a newer three.js, and on WebGPU.
- Sound beyond surf and crickets: wind, rain, the shore break.
- Spray where the shore break lands.

## Weak points

- Night without a fire is nearly black.
- Short turf is sparse flat cut-outs; vine leaves are angular close to; the young palm sits low and wide.
- Far palms and shrubs look thinner than near ones (leaf cut-outs blur together with distance).
- The falling lip of a reef wave is a thin faceted sheet close to. Spray has only been tuned on stills.
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
