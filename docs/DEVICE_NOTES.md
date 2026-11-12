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
- Prefer plain arithmetic to clever control flow (the lip profile `lipC` is branch-free on purpose).
- If a calculation can divide by zero or take `pow` of something negative, guard it (`max(x, 1e-4)`).

## Working without the device

- The software renderer cannot confirm a fix for a phone-only bug. Say so, ship a build number, ask for a screenshot.
- The build number (bottom centre) tells you whether a screenshot is from the current build.
- Debug panel: hold the DAY button ~1.5 s. It shows build, WebGL version and GPU string and has switches for
  wireframe, hiding the wave mesh, hiding the far sea and freezing the waves.
- `uDbg` (a shared uniform) can switch parts of the water off without recompiling: 1 = waves off, 2 = no falling lip,
  3 = plain water colour. Handy for narrowing down a bug from screenshots.
- Performance can only be judged on the phone. `90_main.js` lowers resolution, then shadows, if the frame rate is poor.
- The phone in question takes 1080x2424 screenshots (shared scaled to 864x1939); its GPU model is not known.

## Things three.js (r128) does that are easy to trip over

- `cameraPosition` is only filled in for ShaderMaterial, Phong, Toon and Standard materials. In a patched LAMBERT
  material it stays at the origin and nothing warns you. Use the shared uniform `uCam`.
- A texture read inside an `if` may be taken at the wrong level of detail on some GPUs. Read the texture before the
  branch (the terrain shader does this for the detail texture) or use a texture without mipmaps.
- An instanced mesh is never culled unless `frustumCulled` is set, and opaque things are drawn in order of material
  first and distance second - so distance order only helps between meshes that share a material and have their own
  positions (24_instances.js gives every map square one).
- The back of a two-sided surface is lit as if it faced the other way. For leaves use `leafLight()` (39_foliage.js).
