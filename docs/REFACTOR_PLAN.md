# Refactor plan

Agreed with Ryan on 12 November 2026. Update the status list as steps land.

## The aim

Turn build 78 into a project that is pleasant to work in: a Vite and TypeScript pipeline, real modules, clear
names, no duplicate logic. **Nothing that can be seen may change.** New features wait until this is done.

## Status

- [x] 0. Import build 78 and these notes
- [ ] 1. Pipeline and publishing
- [ ] 2. Picture comparison
- [ ] 3. Lift and shift
- [ ] 4. Clean, system by system
- [ ] 5. Readable shaders
- [ ] 6. Merge duplicates
- [ ] 7. One wave model
- [ ] 8. Remove `legacy/`

## Decisions already made

| Subject | Decision |
|---|---|
| Build | Vite, output one self-contained HTML page |
| Language | TypeScript, strict |
| three.js | From npm, pinned at 0.128 until the refactor is done |
| Structure | ES modules; one folder per subject; shaders beside their feature |
| Dependencies | Factories with injected dependencies; no global mutable state |
| Publishing | GitHub Actions to GitHub Pages; each branch gets its own preview folder |
| Where it runs | Claude Code cloud sessions against this repository, or Ryan's own sandboxed machine |
| Who merges | Ryan |
| Performance | A win found on the way goes in only if the pictures still match; otherwise note it for later |

## Target layout

```
index.html               page shell
src/
  main.ts                creates the systems, wires them together, runs the frame loop
  core/                  renderer, frame clock, shared uniforms, automatic quality, random streams, maths helpers
  world/                 the island's shape (one definition), terrain, rocks, reef, plants
  sea/                   wave model, far sea, wave mesh, lagoon shore waves, whitecaps, spray, the view from under water
  sky/                   day cycle, sky dome, sun and moon, clouds, weather, wind
  life/                  fish
  player/                movement, swimming, camera, input, footprints
  ui/                    menu, captions, joystick, debug panel
  audio/                 surf and crickets
  game/                  survival systems (empty until the refactor is done)
  shaders/shared/        chunks used by several features: noise, sea tint, readings of the detail texture
tests/                   picture comparison, wave mirror, shader compile
tools/                   picture and measurement tools worth keeping
docs/
legacy/                  build 78; removed in step 8
```

## Steps

Each step is one branch (step 4 is one branch per system). A step is done when its checks pass and Ryan has
looked at the preview on his phone.

### 1. Pipeline and publishing

- `package.json` (Node 22, npm), Vite, TypeScript, ESLint, Prettier, a single-file plugin, a GLSL import plugin
  that resolves `#include`, Playwright.
- A workflow that runs the checks on every branch and publishes: `main` to the site's root, any other branch to
  `preview/<branch>/`, and `legacy/build78.html` to `legacy/` so old and new can be compared on the phone.
- The page shows its version and commit where the build number is shown today.
- Ryan: enable GitHub Pages for the repository with "GitHub Actions" as the source.

*Done when:* an empty page builds to one HTML file and appears on the phone from Pages.

### 2. Picture comparison

- One command renders the reference views (below) from `legacy/build78.html` and from the new build, in the same
  renderer on the same machine, and reports where they differ. Nothing is stored: the legacy page is the reference.
- The new build keeps the debug hooks the views need (below), behind one debug module.
- The wave model's mirror test and a compile of every shader join the checks.

*Done when:* legacy compared with itself passes, and a deliberate one-line change to a shader fails.

### 3. Lift and shift

- Bring the legacy source into the new build with the fewest edits that make it modules. Each legacy file becomes
  one module with explicit imports and exports; no renaming, no tidying.
- `THREE` comes from the npm package instead of a global.
- The converter in `legacy/build.py` that turns `src/shared/*.glsl` into program code becomes a Vite plugin.
- Shader text substitution (`{{NAME}}`) keeps working for now.

*Done when:* the picture comparison shows no difference in any view and Ryan sees no change on the phone.
From here on `legacy/` is only the reference.

### 4. Clean, system by system

Suggested order, the least entangled first: ui, audio, life, sky (day cycle, weather, wind, clouds), world
(terrain, rocks, reef, plants), sea, player, then core and `main.ts`.

For each: move it to its folder, turn it into a factory with injected dependencies, give everything a clear name
and a type, collect its tuned numbers into a config, replace text substitution with defines or uniforms.

*Done when (each):* pictures unchanged; no module-level mutable state left in that system.

### 5. Readable shaders

One shader per branch, largest first: terrain colour, water, clouds, rocks, sky. One statement per line, named
intermediate values, named constants, comments that say why.

*Done when (each):* pictures unchanged.

### 6. Merge duplicates

Known today:

- Foam is drawn in four places with four copies of "density to lace": wave foam, whitecap foam and lagoon shore
  foam in the water shader, and the lagoon's swash foam in the terrain shader.
- Two builders of mesh strips: the wave mesh and the lagoon shore band.
- Weather and wind step through their cycles with the same easing code, written twice.
- The cloud field exists in the shader and again in the program (to dim the sun when a cloud passes).
- `landW` from the island's shape is typed out again inside the terrain shader.
- The day-and-night light factor is written inline in many places.
- A dozen one-off picture scripts in `legacy/tools` that differ only in their list of views.

### 7. One wave model

The model is written in the shader and again in the program, kept in step by a test. Generate one from the other
(or both from one source), so that a change is made once. Do this last: it is the most delicate code in the
project, and `docs/DEVICE_NOTES.md` constrains how the shader side may be written.

### 8. Remove `legacy/`

Keep `build78.html` in `tests/` if the comparison is still wanted, delete the rest, move the tools worth keeping,
bring the docs up to date.

## After the refactor

1. Performance pass with real profiling, starting with a frame-rate readout in the debug panel.
2. Decide whether to move to a newer three.js.
3. Then `docs/ROADMAP.md`.

## Reference views

A view is a camera pose, a time, a wind strength and a cloud cover. Pose is `x, y, z, yaw, pitch`; looking along
`(-sin yaw, -cos yaw)`. Every view is taken at midday (`phase 0.5`) with cloud cover 1 unless noted.
The legacy sets in `legacy/tools/views.json`, `gviews.json` and `abviews.json` belong here too.

| Name | Pose | Time (s) | Wind | Shows |
|---|---|---|---|---|
| high | 3, 14, 150, 3.1416, -0.12 | 20 | 1 | ocean beach, reef flat, breakers, open sea |
| deep | 0, 6, 300, 3.1416, -0.14 | 20, 20.6 | 1 | whitecaps close to and far off |
| west | 0, 5, 300, 1.5708, -0.10 | 20 | 1 | whitecaps looking downwind |
| lagoon | 30, 26, 120, 0.5, -0.42 (fov 65) | 20 | 1 | the whole lagoon |
| lagoon-low | 5, 3.5, 70, 0.3, -0.06 | 20 | 1 | lagoon whitecaps from low down |
| beach | 3, 2.3, 160, 3.1416, -0.02 | 20 | 1 | open sea from eye height on the beach |
| lagoon-shore | 5, 2.0, 94.85, 1.42, -0.20 (fov 66) | 20, 20.7, 21.4 | 0.66 and 1 | waves on the lagoon beach |
| lagoon-shore-low | 5, 1.25, 93.15, 1.45, -0.07 (fov 62) | 20.7 | 1 | their height |
| lagoon-shore-top | 5, 7, 95.15, 0.3, -0.95 | 20.7 | 1 | foam on the sand from above |
| ocean-shore | 5, eye 1.7 m above the sand, 163.8, 3.1416, -0.22 (fov 66) | 34.7, 35.0, 35.3, 35.9 | 0.66 | a wave breaking on the ocean beach |
| ocean-shore-along | 5, eye 1.7 m above the sand, 164.8, 1.85, -0.20 (fov 66) | same | 0.66 | the same wave along the beach |

Add views at dawn, golden hour, sunset and night, with cloud cover 0 and 0.45, and under water, before step 3.

Debug hooks the views use (legacy names):

| Hook | Does |
|---|---|
| `__lag.freeze(t)` | stops the clock at `t` seconds |
| `window.__fly = [x, y, z, yaw, pitch]` | places the camera |
| `window.__wind`, `window.__weather` | fix wind strength and cloud cover |
| `__lag.phase(p)` | time of day, 0 midnight, 0.5 noon |
| `__lag.hgt(x, z)`, `__lag.waveH(x, z, t)` | ground height; water height |
| `LAGOON_CLOUDW` (environment) | a smaller cloud picture, for speed in the software renderer |

After placing a view, wait about three seconds: the cloud pictures are drawn a slice at a time.

## Risks

- **The software renderer is not the phone.** A step can pass every check and still misbehave on the phone's GPU.
  Ryan looks at each preview. Water vertex shaders are the place to be most careful.
- **Bundling three.js** adds roughly half a megabyte to the page. Acceptable; say so if it turns out to matter.
- **Order of start-up.** Legacy files run top to bottom in one scope and some rely on that order. Step 3 keeps the
  order; step 4 removes the reliance.
- **Random streams.** The island's layout comes from seeded random streams consumed in a fixed order. Moving code
  can change the order and so the island. The picture comparison catches it.
