# What the phone taught us

## The stretched-triangle bug (builds 17-21, fixed in 22)

**Symptom, on the phone only:** a few triangles of the wave mesh stretched across the whole scene - flat bands running
to the horizon, pillars going straight up. Never reproducible in the software renderer used for testing.

**What it was:** on that GPU some vertices of the wave mesh got an enormous displacement out of the vertex shader.
Injecting huge values by hand in the test renderer reproduces the screenshots exactly. A range check *inside* the
wave function did not stop it, so the bad value appeared between the function returning and the position being
assembled - i.e. the phone's shader compiler mishandled something about the shader's structure, not its maths.

**What had changed in the build where it started:**
1. the wave function gained `out` parameters (to hand back the lip's direction),
2. the wave mesh gained a second vertex attribute (`aTh`),
3. `main()` gained an `if` block after the position was computed.

Build 22 removed all three and the bug was gone. Which of them was the trigger was never isolated.

## Rules for `water.vert.glsl`, `waves.glsl` and the wave mesh

- No `out` / `inout` parameters. Functions return a value (`float`, `vec2`, `vec4`) and nothing else.
- The wave mesh carries `position` and nothing else. Anything per-vertex must be computed from the position.
- No branching in the vertex shader `main()` after the position is put together.
- Keep the **hard limit** at the end of `main()`: a vertex whose displacement is outside a small box
  (+-12 m sideways, -2.5..4 m vertically) is left at rest. It is written so that not-a-number and infinity fail it too.
  Normal waves stay inside about half of that box.
- The per-train code is generated *unrolled* (three copies of the same lines) - no loops, no uniform arrays.
- Prefer plain arithmetic to clever control flow (the breaking front's profile, `breakingFront` in `waves.glsl`, is branch-free on purpose).
- If a calculation can divide by zero or take `pow` of something negative, guard it (`max(x, 1e-4)`).

## Working without the device

- The software renderer cannot confirm a fix for a phone-only bug. Say so, ship a build number, ask for a screenshot.
- The build number (bottom centre) tells you whether a screenshot is from the current build.
- The frame rate shows at the top left of the screen (a switch in the debug panel hides it). The panel scrolls
  within the screen: it had grown taller than the phone held sideways, and its lowest buttons could not be reached.
- Debug panel: hold the DAY button ~1.5 s. It shows build, WebGL version and GPU string, the frame rate, where
  the eye is and how deep the floor is under it. Its switches are in three groups, and under them a row of
  buttons that fly the eye to places on the reef.
  - *For looking*: flying, draining the sea, the frame rate's label, wireframe, freezing the waves, the waves
    off, no falling lip, plain water colour, the sea floor's pictures drawn on the water, a line along the
    breaking crest.
  - *What a frame costs* (read the frame rate with one on): `more dots` draws half as many dots again each way,
    so that costs hidden by the screen's 60 frames a second can be read; hiding the plants, the rocks, the
    coral or the ground; the ground in the plain colour of its corners (`plain ground`), or with its noise,
    the shore and the reef's cover worked out by formula as they were until 19 November 2026 (`ground by
    arithmetic`); the sky in one colour; no shadows; hiding the wave mesh, the far sea, the
    breaker's own mesh or the spray along the breaking crest; the wave mesh drawn no finer than its second
    level (`coarse wave mesh`) or in one flat colour (`bare wave mesh`); the floor's height, or the shore,
    worked out by formula for every dot as they were until 19 November 2026 (`floor from the formula`, `shore
    from the formula`).
  - *End the water's colouring after* the depth, the ripples, the mirror, the colour, the white horses or the
    foam: what has been worked out so far is drawn, and nothing after it is worked out.

  Flying: the stick moves the eye the way it looks (push forward while looking up to climb), faster the higher
  it is; buttons at the right take it straight up and down, and
  `fast` hurries it (a keyboard has Space, C and Shift, and the wheel for the pace); it can go under water but
  not through the ground. With the sea drained no water is drawn, nothing is tinted by it, and the ground
  carries lines of equal depth a metre apart, every fifth bolder (they need WebGL 2).
- To find where a slow frame goes: switch `more dots` on if the frame rate is at 60, then read it with each of
  the cost switches and each of the colouring's stages on in turn. That is how the frames the water's new look
  cost were found in November 2026; no guess made from the software renderer's timings was right. A switch
  whose question has been answered is taken out again (the panel had grown to 34).
- The phone reads a picture in the water's vertex shader without trouble, bytes or half floats, smoothly
  filtered (tried on 15 November 2026 with a picture of mounds in place of the waves).
- `uDebugMode` (a shared uniform) can switch parts of the water off without recompiling: 1 = waves off, 2 = no falling lip,
  3 = plain water colour. Handy for narrowing down a bug from screenshots.
- The breaker's own mesh is drawn twice (`breaker.ts`): first into the depth picture alone (a material with
  `colorWrite` off, before the sea), then in colour after the sea, so that two see-through sheets of water are
  never drawn one over the other. Its two fragment shaders throw away the gaps in the white water's torn edges by
  a reading of the detail texture, made before the branch (`torn-edge.glsl`). The two drawings went to the phone
  on 17 November 2026: Ryan found that build better and named no fault in it. The torn edges have not been on
  the phone yet.
- A sheet of water is compiled with only what it can show: the readings of the detail texture that steep water
  needs are behind defines that only the wave mesh and the breaker's mesh are given (`water-materials.ts`).
- The water's fragment shader follows the eye's line on under the surface: one reading of the waves' picture of
  the floor for the depth round about, one more of it 16 m on along the line of sight, and near a coral head
  four of the reef's map, inside a branch (neither picture has mipmaps); and for a film of water with no floor
  beyond it, the ground's height once more, in a branch of its own. The ground's vertex shader tilts the normal
  of ground under water towards level before three.js lights it (`terrain.ts`). On the phone since 18 November
  2026; Ryan named no fault in either.
- New to the phone on 18 November 2026, and seen there since with no fault named. A second small repeating
  texture, the caustics texture (`caustics-texture.ts`), read twice by the ground, the rocks and the coral,
  outside any branch. The vertex shaders of those three move each vertex under the sea sideways by three sines
  (`sway-under-water.glsl`): they are three.js's own Lambert shaders, patched after `<project_vertex>`, and they
  use `uCameraPosition`. The line of three.js's Lambert fragment shader that works out the sun's light is
  replaced in those three materials (`sunlight-under-water.ts`), which names that line as three.js 0.128 writes
  it and stops with an error if it is not there. The water's ripples are read at places that move four times
  as fast, from a clock wrapped every 1000 s. Two branches in the water's fragment shader are taken on arithmetic
  alone, with noise inside and no texture: the sun's sparkle and the moon's glitter. The water's readings of
  the waves' picture of the floor, and its first reading of the reef's map, are inside branches now, so that the
  open sea can skip them (neither picture has mipmaps).
- The software renderer works out both sides of an `if` that differs from dot to dot (it shades four dots at a
  time and masks the results), so it shows no saving from work a branch skips; the phone's graphics card does
  skip it. Its timings are fair only for what every dot pays. (Found on 18 November 2026: skipping some forty
  noises for most dots of the ground changed its timings by nothing.)
- What the Pixel 10 said on 18 November 2026, from the ocean beach looking out to sea: 30 to 45 frames a second;
  with the sea drained 55 to 60; with the wave mesh hidden 55 to 60; with the far sea hidden 38 to 40. The wave
  mesh is what costs, and the rest of the scene is close to its own limit.
- Anisotropic filtering of a texture the water reads many times is dear in the software renderer (a fifth of a
  frame at anisotropy 4, for the detail texture, which the wave mesh reads ten times for each dot) and costs the
  Pixel 10 nothing that can be read: 41 to 46 frames a second filtered plainly, 43 to 46 at anisotropy 4 (19
  November 2026). Nor did skipping six of the wave mesh's sixteen readings gain anything: an experiment read
  them inside a branch with `textureGrad`, given derivatives taken before the branch, and the phone gave 41 to
  44. It was taken out again, and the rule about reading before a branch stands. Texture readings are not what
  this phone is short of.
- The wave mesh drawn in one flat colour (`bare wave mesh`) gave 60 frames a second, and drawn coarsely (`coarse
  wave mesh`) 44: its cost is the arithmetic of its fragment shader, not its points. The switches `water: depth
  only`, `to ripples`, `to mirror`, `to colour` and `no floor formula` are there to say which arithmetic.
- The stages of the wave mesh's colouring on the Pixel 10 (19 November 2026, ocean beach, out to sea): stopped
  after the depth, after the ripples or after the mirror, 60 frames a second; stopped after the colour, 50; all
  of it, 41 to 46; all of it without the island's formula, 50. The formula, worked out for every dot (and a
  second time inside a branch), is about 3 ms of a frame: on this phone arithmetic is dear and a texture
  reading is cheap, so a formula that every dot works out wants to be a picture.
- The water reads the ground's height from a picture the graphics card draws at start-up (a 2048-dot half-float
  picture with one channel, drawn into as a render target, no mipmaps: `floor-height-picture.ts`). On the Pixel
  10 that gave 55 frames a second where the formula gave 39 to 45 (19 November 2026), and Ryan named no fault in
  the picture. Drawing into a half-float picture was new to the phone, and worked.
- The profile of the wave mesh's colouring with `more dots` (19 November 2026) showed no one dear part: the
  cost builds from the mirror on. And the frame rate the phone shows is a mix of frames that made the next
  refresh and frames that missed it: 55 is mostly sixties with some thirties, not 18 ms a frame.
- With the floor and the shore read from pictures, and nothing worked out that cannot show, the Pixel 10 gave
  60 frames a second from the ocean beach again (19 November 2026).
- So the software renderer is a poor guide to this phone twice over: it overstates what texture filtering costs,
  and it cannot see what a branch saves. Add a switch and read the phone.
- Performance can only be judged on the phone. `90_main.js` lowers resolution, then shadows, if the frame rate is poor.
- What the Pixel 10 can afford (16 November 2026, by the debug panel's switches): the wave mesh's points are what
  it pays for. 123 thousand of them in view held it to about 50 frames a second; 31 thousand, and it drew 60.
  The coral painted on the sea floor, a pattern worked out for every pixel of it, cost nothing that could be
  measured. To find where a slow frame goes, add a switch that leaves the suspect out and read the frame rate.
- The phone in question takes 1080x2424 screenshots (shared scaled to 864x1939); its GPU model is not known. Since
  November 2026 Ryan's phone is a Pixel 10.
- If the browser refuses WebGL, the page says why: three.js's error, the browser's own reason, and which kinds of
  WebGL it offers. If the graphics context is lost while the page runs, it says so, with the frames drawn so far.
- After a page loses its context, Chrome blocks that address from WebGL: the page then reports "Web page caused the
  context loss and was blocked", with WebGL 2 and WebGL 1 both refused. It is not the phone lacking WebGL. The block
  lasts until Chrome is closed (swiped away from the recent apps) and opened again.

## three.js 0.187 loses the phone's graphics context (trial, 15 November 2026)

A trial of moving from three.js 0.128 to 0.187, on the branch `three-trial` (kept on Ryan's machine, not merged).

**On the desktop it is a cheap move.** Nine files: an option three.js no longer has; a line break ahead of
three.js's shader in the materials that patch it; two variables three.js renamed (`texelColor`, `vUv`), and `vColor`
now four numbers; colour management switched off so colours are drawn as written; light strengths multiplied by π;
the leaf lighting patch rewritten, because Lambert materials are now lit for each pixel and not each corner. All
tests passed, and no picture differed clearly in more than 2% of its pixels.

**On the phone the picture showed for a second, flickered, and the context was lost.** With shadows switched off it
held. With shadows it was lost after 84 to 188 frames whatever was tried: read plainly instead of through the
graphics card's comparison, a map of a quarter the size, the map drawn once and never again, the map drawn every
frame. The page creates no textures, framebuffers or programs after its first two frames, so nothing of ours piles
up: the fault is below the page, in the phone's driver.

**What is suspected, not proven:** reading a depth texture. three.js now draws shadows into a depth texture and
reads that; 0.128 packs the depth into an ordinary colour texture, which this phone is happy with. Even the map
drawn once and only read afterwards lost the context. Until shown otherwise, do not read a depth texture.

**So three.js stays at 0.128.** A way round would be to draw the shadows ourselves as 0.128 does, on top of the
newer three.js; that is a batch or two of work, to weigh if a newer three.js is ever needed for its own sake. Worth
another try when three.js or the phone's driver has moved on: the trial's branch has all it took.

## Things three.js (r128) does that are easy to trip over

- `cameraPosition` is only filled in for ShaderMaterial, Phong, Toon and Standard materials. In a patched LAMBERT
  material it stays at the origin and nothing warns you. Use the shared uniform `uCameraPosition`.
- A texture read inside an `if` may be taken at the wrong level of detail on some GPUs. Read the texture before the
  branch (the terrain shader does this for the detail texture) or use a texture without mipmaps.
- An instanced mesh is never culled unless `frustumCulled` is set, and opaque things are drawn in order of material
  first and distance second - so distance order only helps between meshes that share a material and have their own
  positions (24_instances.js gives every map square one).
- The back of a two-sided surface is lit as if it faced the other way. For leaves use `leafLight()` (39_foliage.js).
