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
- Debug panel: hold the DAY button ~1.5 s. It shows build, WebGL version and GPU string, the frame rate and where
  the eye is, and has switches for flying, wireframe, hiding the wave mesh, hiding the far sea and freezing the
  waves. Flying: the stick moves the eye the way it looks (push forward while looking up to climb), faster the
  higher it is; it can go under water but not through the ground.
- The phone reads a picture in the water's vertex shader without trouble, bytes or half floats, smoothly
  filtered (tried on 15 November 2026 with a picture of mounds in place of the waves).
- `uDebugMode` (a shared uniform) can switch parts of the water off without recompiling: 1 = waves off, 2 = no falling lip,
  3 = plain water colour. Handy for narrowing down a bug from screenshots.
- Performance can only be judged on the phone. `90_main.js` lowers resolution, then shadows, if the frame rate is poor.
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
