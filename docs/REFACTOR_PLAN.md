# Refactor plan

Agreed with Ryan on 12 November 2026; its aim was widened on 14 November. Update the status list as steps land.

## The aim

Turn build 78 into a project that is pleasant to work in: a Vite and TypeScript pipeline, real modules, clear
names, no duplicate logic. New features wait until this is done.

Through step 6 **nothing that could be seen was allowed to change**, and every picture was held to build 78 to
the pixel. That bought a rebuild with nothing lost. From step 7 on, the build is a stepping stone: the aim is
to **simplify and improve on it**, keeping what has been gained without letting that care hold back what comes
next. A refactor still leaves every picture as it was. An improvement changes pictures on purpose, and is shown
before and after.

## Status

- [x] 0. Import build 78 and these notes
- [x] 1. Pipeline and publishing
- [x] 2. Picture comparison
- [x] 3. Lift and shift
- [x] 4. Clean, system by system
- [x] 5. Readable shaders
- [x] 6. Merge duplicates
- [x] 7. Compare with the last merged build
- [x] 8. Clear out what exactness cost
- [x] 9. One wave model: left for the breaking wave's rebuild
- [x] 10. Make room for the roadmap: the frame-rate readout
- [ ] 11. Remove `legacy/`

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
| How a system is cleaned | Its lifted file shrinks to a bridge that builds the cleaned system at the same point in start-up and passes the old names on; bridges go when `main.ts` takes over (step 4) |
| Performance | Through step 6, a win went in only if the pictures still matched. Now it is shown before and after like any other change |

## Target layout

```
index.html               page shell
src/
  main.ts                creates the systems, wires them together, runs the frame loop
  core/                  renderer, frame clock, shared uniforms, automatic quality, random streams, maths helpers
  world/                 the island's shape (one definition), terrain, rocks, reef, plants and flowers, beach finds
  sea/                   wave model, far sea, wave mesh, lagoon shore waves, whitecaps, spray, the view from under water
  sky/                   day cycle, sky dome, sun and moon, clouds, weather, wind
  life/                  gulls, lagoon fish, reef fish, crabs, turtle, butterflies, fireflies, dolphins
  player/                movement, swimming, camera, input, footprints
  ui/                    menu, captions, joystick, sound button, debug panel
  audio/                 surf and crickets
  game/                  survival systems (empty until the refactor is done)
  shaders/shared/        chunks used by several features: noise, sea tint, readings of the detail texture
tests/                   comparison with the last merged build (pictures, scene state, controls, sound), wave mirror, shader compile
tools/                   picture and measurement tools worth keeping
docs/
legacy/                  build 78; kept to look back at; removed in step 11
```

## Steps

Each step is one branch (step 4 is one branch per system). A step is done when its checks pass and Ryan has
reviewed it: the before and after on the desktop for each change, the phone for each batch of related work.

### 1. Pipeline and publishing

- `package.json` (Node 22, npm), Vite, TypeScript, ESLint, Prettier, a single-file plugin, a GLSL import plugin
  that resolves `#include`, Playwright.
- A workflow that runs the checks on every branch and publishes: `main` to the site's root, any other branch to
  `preview/<branch>/`, and `legacy/build78.html` to `legacy/` so old and new can be compared on the phone.
- The page shows its version and commit where the build number is shown today.
- Ryan: enable GitHub Pages for the repository with "GitHub Actions" as the source.
- Ryan: under Settings, Environments, `github-pages`, set "Deployment branches and tags" to "No restriction",
  so that branches other than `main` may publish their previews.

As built: a Pages deployment replaces the whole site, so every run rebuilds `main` and each unmerged branch
(`tools/assemble-site.ts`) and stores nothing; `preview/` lists the pages. Publishing does not wait for the
checks, so a branch can be seen on the phone while its checks are being put right. TypeScript is 6.0 until the
lint tooling supports 7.

*Done when:* an empty page builds to one HTML file and appears on the phone from Pages.

### 2. Picture comparison

- One command renders the reference views (below) from `legacy/build78.html` and from the new build, in the same
  renderer on the same machine, and reports where they differ. Nothing is stored in the repository: the legacy page
  is the reference. Its pictures are kept on the machine between runs, to save drawing them again.
- The new build keeps the debug hooks the views need (below), behind one debug module.
- The wave model's mirror test and a compile of every shader join the checks.

*Done when:* legacy compared with itself passes, and a deliberate one-line change to a shader fails.

As built: `npm run pictures` (also part of `npm run check`). The tests replace the page's clock with one they
step, so both pages live through exactly the same frames and build 78 drawn twice is the same to the last
pixel; a picture passes only if no pixel differs. Each test also proves it can fail, on a copy of build 78
with one line changed. Until step 3 the page under test is build 78 itself (`tests/pages.ts`). The wave mirror's
limits are eight times tighter than build 78's own check, which let a changed shoaling curve through.

Step 7 replaced the comparison with build 78 by one with the last merged build.

### 3. Lift and shift

- Bring the legacy source into the new build with the fewest edits that make it modules. Each legacy file becomes
  one module with explicit imports and exports; no renaming, no tidying.
- `THREE` comes from the npm package instead of a global.
- The converter in `legacy/build.py` that turns `src/shared/*.glsl` into program code becomes a Vite plugin.
- Shader text substitution (`{{NAME}}`) keeps working for now.

*Done when:* the picture comparison shows no difference in any view and Ryan sees no change on the phone.
From here on `legacy/` is only the reference.

As built: build 78's 29 program files are in `src/lifted/js/` under their old names, with its shader chunks
beside them in `src/lifted/glsl/` and `src/lifted/shared/`. A script converted the files: imports at the top,
exports at the bottom, and nine assignments to another file's variable turned into calls to a setter in the file
that owns it. Each file imports the one before it first and `src/main.ts` imports the last, which runs them in
build 78's order whatever else they import. Four edits were made by hand: three.js comes from npm; the build
number gives way to the version and commit; a failed WebGL start throws where it used to return; and the
wildlife's random stream is named outright (it was named after a function, and the bundler shortens function
names). `tools/shader-chunks-plugin.ts` supplies the table of shader chunks and the island's shape functions,
character for character as `build.py` did.

The lifted files stay JavaScript, unformatted and outside the code standards, until step 4 cleans each one and
moves it to its folder. ESLint holds them to one rule: every name a file uses is defined.

### 4. Clean, system by system

Suggested order, the least entangled first: ui, audio, life, sky (day cycle, weather, wind, clouds), world
(terrain, rocks, reef, plants), sea, player, then core and `main.ts`.

For each: move it to its folder, turn it into a factory with injected dependencies, give everything a clear name
and a type, collect its tuned numbers into a config, replace text substitution with defines or uniforms.

*Done when (each):* pictures unchanged; no module-level mutable state left in that system.

How: the cleaned system is TypeScript in its folder. Its old file in `src/lifted/js/` shrinks to a bridge: a
few lines that build the system where build 78 built it, hand it what it needs from the files still lifted, and
pass on the names those files expect. Start-up order and frame order therefore do not change. The last branch
(core and `main.ts`) builds and wires every system in `main.ts` and deletes the bridges. Two other ways were
weighed and set aside: turning every lifted file into a function first, and a shared registry.

- [x] ui: `src/ui/` holds the menu, the corner button, the captions, the joystick and the debug panel.
  `tests/controls.spec.ts` uses each of them on build 78 and on the new build and compares the result. Left
  for their own branches: the time of day written on the button (sky), the sound button (audio), which named
  place the player is in, drag-to-look and the keyboard (player), the glare and underwater overlays (sky, sea),
  and the test hooks (core).
- [x] audio: `src/audio/` holds the surf and the crickets, and `src/ui/sound-button.ts` the button that switches
  them. `tests/sound.spec.ts` has build 78 and the new build render their sound into memory and compares the
  samples. The browser renders one sound a rounding step apart from itself, so the comparison allows that much.
- [x] life: `src/life/` has a file for each animal (gulls, fish, crabs, turtle, butterflies, fireflies, dolphins)
  and for the starfish, shells and pebbles on the beach and the flowers, which build 78 built along with them.
  They all draw from one random stream, so `life.ts` builds them in build 78's order. `src/core/` begins here
  with the two helpers they needed (`maths.ts`, `random.ts`). `tests/scene-state.spec.ts` compares where every
  object in the scene is, and every copy of everything drawn in copies, on build 78 and on the new build: most
  animals are not in the reference pictures at the moment those are taken. An error in the wildlife used to be
  swallowed without a word each frame; now it is reported and the wildlife dropped, as for any other module.
- [x] sky: `src/sky/` holds the day cycle, the light of day (sun, sky and cloud colours), the sky dome, the
  weather and the wind, the clouds (their two noise pictures, the sky pictures and the shadow map, and the
  program's copy of the cloud field), the lights with the shadow box, and the sun's glare. The sky's five shaders
  moved beside them and take their numbers as defines; `noise.glsl` is the first chunk in `src/shaders/shared/`,
  which the shaders still lifted read too. The sky's light and the clouds each own their uniforms; the bridge
  still gathers the shared set, which goes to `src/core/` last. Weather and wind now step through their spells
  with one piece of code (it was on the list for step 6). No new test: the pictures, the scene-state test and
  the menu test cover it, and a one-off comparison with the clock running matched build 78 in every uniform.
- [x] world, in parts:
  - [x] terrain: `src/world/` holds the landmarks (home, hut, pier, footpaths, and the searches for the
    shorelines), the ground and its grit picture. The island's shape moved to `src/world/island-shape/` (still
    the one definition, still turned into functions for the program by the build), and the terrain's shaders
    moved beside the terrain with their numbers as defines. The lagoon shore-wave chunk the terrain shares with
    the water is in `src/shaders/shared/`; the lifted water shaders get its one define written into the chunk.
  - [x] rocks: `src/world/rocks/` holds the five kinds' shapes, where they are placed, their material and its
    shader. `src/world/instance-cells.ts` is the regrouping of instanced meshes into map squares that the rocks
    and the plants share. The sea's tint chunk, which the reef also uses, is in `src/shaders/shared/`. Two
    hooks that only build 78's plant-viewing tool used did not come across for cleaned systems: the list of
    meshes by kind, and switching one mesh off.
  - [x] reef: `src/world/reef/` holds the coral models, the layout of heads and corals, the map of the heads for
    the water, the coral material and its shader, and the reef's fish with the fish model the lagoon's schools
    share. The fish stay with the reef for now because they draw from its random stream. Three hooks that only
    build 78's tools used did not come across (the list of heads, the fish meshes, drawing every fish at once).
  - [x] plants: `src/world/plants/` holds the palms, the grass and sea grass, and the island's other plants with
    the things lying under them, each with its models, pictures and config; the shape builder that makes a
    plant's full and simpler models at once; and the patch that lights leaves from both sides. Build 78's
    foliage tools file is gone from `src/lifted/`, and with it the plant-viewing tool's hooks.
  - [x] the camp and the fire: `src/world/camp/` holds the campfire and what the castaway has made. The camp is
    switched off at present, as in build 78, so its code runs in no test; its port was checked against build
    78's code outside the page. The detail texture every water and rock shader reads is
    `src/shaders/detail-texture.ts`.
- [x] sea: `src/sea/` holds the program's copy of the wave model, the water's three sheets (far sea, wave mesh,
  lagoon shore band) and their materials, the view from under water and the spray, with the water's and the
  spray's shaders beside them. The wave trains reach the shaders as defines: the shader keeps the lines of one
  train as a macro, and the define calls it once for each train with the config's numbers. With this nothing
  is left of build 78's shader chunk table or its text substitution: the build's plugin is now
  a small one that only turns the island's shape into functions for the program (it has since become
  `tools/glsl-for-program-plugin.ts`: step 6).
- [x] player: `src/player/` holds walking, swimming and diving with the camera, the opening fly-in, drag to look
  and the keyboard, the named places and the footprints.
- [x] core and `main.ts`: `src/core/` holds the stage (renderer, scene, camera), the random streams, the shared
  uniforms, the view's size, the automatic quality steps, the test hooks and the debug panel's contents.
  `src/main.ts` builds every system in build 78's order and runs the frame loop. `src/lifted/` and its bridges
  are gone. `src/core/test-hooks.ts` is now the only file that touches the names on `window` the tests drive
  the page by, and offers only what `tests/scene-hooks.d.ts` declares. An error in the wildlife is no longer
  caught and the wildlife dropped: like an error anywhere else it stops the frame and shows on the screen.

Step 4 is done: everything that runs is cleaned code.

### 5. Readable shaders

One shader per branch, largest first: terrain colour, water, clouds, rocks, sky. One statement per line, named
intermediate values, named constants, comments that say why.

*Done when (each):* pictures unchanged.

In two batches, at Ryan's request for larger ones: everything but the water first, then the water and the wave
shader on their own, since that is where phone-only bugs have appeared. Uniforms and varyings keep build 78's
short names (`uDet`, `vWp`) through both, because every shader shares them; they are renamed together in a
pass of their own at the end of the step.

- [x] everything but the water: the terrain's three shaders, the sky dome and the three cloud shaders, the
  rocks, the coral, the shared noise and sea-tint chunks, the flame and the spray. The coral's shader lost six
  values it worked out and never used (a second copy of the net of light, with three texture reads).
- [x] the water: `water.frag.glsl` (259 dense lines, now 704), `water.vert.glsl`, `waves.glsl`, the lagoon's
  shore band and its shared chunk, and the island's shape, whose tuned numbers are now named constants (the
  build's converter learned to carry `const float` across to the program). `waves.glsl` uses the names of
  `wave-model.ts` where that has them and lists, at `waveOfTrain`, which is which.
- [x] the uniforms and varyings renamed in one pass through every shader and the program: `uDet` is
  `uDetail`, `uHor` is `uSkyHorizon`, `vWp` is `vGroundPosition`, and so on.

Step 5 is done.

### 6. Merge duplicates

Done. Merged, each to one home, with every picture and every object unchanged:

- **Mesh strips.** The wave mesh's pieces and the lagoon shore band's strips are built by one builder
  (`src/sea/water-strip.ts`).
- **Numbers a config holds, written out again in a shader.** They now reach the shaders as defines written from
  the configs: the cloud noise picture's layout, the weather map's span, the cloud base, the shadow density, the
  boil rates and the moon's direction (sky and water); the reef map's span (terrain and water); the usual wind
  and the lagoon band's extent (water). The sandbank's radius and the sea floor's depth come from the island's
  shape, which the water's shader already includes.
- **`landW`.** The terrain's shader includes the island's shape and calls it.
- **The line-of-sight distance** to a height above the curved sea is one chunk (`src/sky/distance-up-to.glsl`)
  for the cloud bake and the sky.
- **Foam's density to lace.** The wave foam and the white horses in the water's shader share two functions.
- **The turf's patterns.** How lush and how dry the turf is, the soil patches and the wander of the turf's edge
  are written once, in `src/world/ground-patterns/turf.glsl`, for the terrain's shader, and the build turns them
  into functions for the grass, as it does the island's shape (`tools/glsl-for-program-plugin.ts`, which now
  serves both). The turf's colours are in `src/world/ground-patterns.ts` and reach the shader as defines.
- **In the program:** one helper that sets up a canvas to draw on (`src/core/canvas.ts`), used by six picture
  makers; `mix`, `wrap`, a full turn as build 78 wrote it, and the types for a colour, a triple and "is this
  inside a rock", each defined once where they had been defined up to nine times.

Looked at and left, because they are not the same idea or cannot be merged without changing a number:

- The cloud field in the shader and in the program. The shader's reads textures, which the generator that
  writes shader formulas out for the program cannot follow. (Step 8 made the two agree.)
- The terrain's swash foam. Its step to lace is built differently from the water's (a straight fall, a fixed
  width), and cannot be made to match bit for bit.
- The grass's turf edge and bare soil. The program uses simpler stand-ins for the shader's versions on purpose.
- `fbm` and `fbm5` in `noise.glsl`: one function would need a switch for the number of layers.
- The four helpers that join shapes into a model (`life`, `reef`, `palms`, `plants`): each carries different
  attributes and they are different ideas.
- The far sea's hole and the band's reach in the water's shader: margins just inside the mesh's own extent, not
  the mesh's numbers.
- The light of day and night: no two places work it out with the same numbers.
- Build 78's one-off picture scripts in `legacy/tools`: they go with `legacy/` in step 8.

What step 6 kept so that nothing moved, and what it found and left undecided, was settled in step 8.

### 7. Compare with the last merged build

Done. Build 78 is out of the tests. What a change is held against is the **reference build**: the commit the
branch left `main` at, which is the last one Ryan merged. His merge is what accepts a change, so nothing about
the reference is kept in the repository.

- `npm run compare` (and every `npm run check`) draws each reference view from the working files and from the
  reference build, in the same renderer through the same frames, and writes `review/index.html`: changed views
  first and the most changed of them first, each before and after and with the differing pixels marked, pink
  where they differ clearly and blue where faintly; hold a picture to flip it to before. The terminal lists the
  pictures that differ. The same run compares where every object in the scene is, the page
  after its controls are used, and the sound.
- **A difference is reported, not failed.** The checks fail on what is broken: a view that cannot be drawn, a
  page error, a shader that does not compile, a control that changes nothing, a silent page, the wave model's
  copies apart.
- The reference build is built once from its commit and its pictures drawn once; both are kept in
  `node_modules/.cache/` until `main` moves. `REFERENCE=<commit or tag>` compares with another commit, such as
  a tagged milestone.
- Review goes in three steps. Claude looks at the before and after of every attempt and says which views
  changed. Ryan looks at the review page on the desktop. The phone signs off a batch, for what only it shows:
  motion, frame rate, its own GPU.
- GitHub's checks have no `main` to compare with, so they catch only what is broken.
- The tests drive the reference build through the same debug hooks as the working files. A hook that is
  renamed leaves one review without pictures from before, until the change is merged.

The tests that proved a check could fail by changing a line of build 78 went with it. The two checks that
still fail a run keep such a proof, made in the page: a shader given a line that cannot compile, and a wave
program asked for a moment a fiftieth of a second off the shader's.

### 8. Clear out what exactness cost

Done. Everything that was written oddly only so that a picture matched build 78 is written plainly, and things
moved once to pay for it. What moved:

- **A random stream for each kind of thing that is placed**, by name: each animal, the starfish, shells and
  pebbles, the flowers, and the reef's shapes, layout and tints. Changing how one kind is placed no longer moves
  another, and the order `main.ts` builds things in no longer decides where anything lies. The animals, the
  beach finds, the flowers, the reef and the spray were re-rolled; rocks, palms, grass and plants kept their
  streams and stand where they did.
- **The reef's layout is one of several rolls** (`reefConfig.layoutRoll`). The first re-roll left the lagoon
  seen from home with less coral than before; of eight rolls looked at, this one puts several pale heads off
  the home beach. The two under-water reference views were re-aimed at the new heads.
- **One full turn** (`FULL_TURN`, 2π) in the program and, by name, in the shaders (`shared/turns.glsl`); **one
  `mix`**; **numbers reach the shaders in full**, not rounded to four decimals, so the sky's shaders curve the
  earth as the program does; the cloud noise divides by 2^32, not a slip of the keys near it. Each turns or
  shifts what it touches by less than a pixel.
- **Deleted:** the turtle's dead search and the three coral draws made and not used.
- **Moved:** the beach finds to `src/world/beach/`, the flowers to `src/world/plants/`, the reef fish and the
  fish model to `src/life/`, the placing and instancing helpers both sides use to `src/world/`.
- **Two rules added while re-placing:** finds and flowers keep clear of rocks, and flowers keep off the
  footpaths as the grass and plants do.

Each oddity, decided:

| Oddity | Decision |
|---|---|
| The cloud shapes never rose as they boiled in the shader, only in the program | Fixed: the shader now runs the statement. Clouds are shaped a little differently at any moment |
| The sky's evening band squared a negative number with `pow` | Fixed: multiplied by itself |
| The coral read the detail texture inside a branch | Fixed: the reads are made outside it, and the branch is gone |
| A disc of glowing coals lay where the camp's fire would be, with no camp | Removed: without a camp `main.ts` builds no fire |
| The water mirrors the clouds without sliding the sky pictures by their drift | Kept: the mirrored clouds lag by a degree or two at most, less than the waves smear them, and the slide would cost every water pixel two more texture reads |
| An error in the wildlife stops the frame; build 78 swallowed it | Kept: an error should be seen |
| The debug hooks keep build 78's names (`__lag`, `__fly`) | Kept for now: the tests drive the last merged build through them, so a rename leaves one review without pictures from before. To rename when little else changes |
| The cloud field is written in the shader and again in the program | Kept as two: the shader's reads textures, which the generator for the program cannot follow. They now agree, but for the fine lumps the program leaves out on purpose |

Still as build 78 wrote it: the wave model's short names and its 6.2832 in program and shader. They stay
until the breaking wave is rebuilt (step 9).

### 9. One wave model

Not done, on purpose. The plan was to make the shader the one source and generate the program's copy from it.
Two things changed that:

- **The two copies are not the same model.** A breaking wave overhangs, and the shader makes its lip by moving
  water sideways. The program needs one height for each spot, so it has a simpler stand-up of its own, and it
  gathers what the spray needs (a lip falling, a lip landing, a bore), which the shader never works out in that
  form. A generator would need a translator for GLSL and would still leave those parts written by hand.
- **Ryan wants the breaking wave rebuilt** (`docs/ROADMAP.md`). About half of what the two copies share is the
  break itself, which the rebuild replaces.

So the wave model stays as it is, two copies kept in step by the mirror test, the program's still under build
78's short names. The rebuild is to end with one model by design: a plain swell short enough for its two
copies to be trivial, and a breaker the program need not know the shape of.

### 10. Make room for the roadmap

Done, in the one part that was needed now:

- **The frame-rate readout.** The debug panel (hold the corner button) reports, twice a second, the frames a
  second, the slowest frame, the program's own time for a frame, and how many draws and triangles the last
  frame took (`src/core/frame-meter.ts`). A phone draws no faster than its screen refreshes, so at full speed
  it is the program's time that says what is to spare. The lines above it (quality stage, pixel ratio) are now
  live as well: they were written once, when the panel first opened.
- **Retuning without a rebuild** waits for the first feature that needs a tuning pass. `npm run dev:phone`
  covers most of it: a saved change reloads the page on the phone.
- **The shape of `src/game/`** is to be agreed against the first real piece of the game, not in the abstract.

### 11. Remove `legacy/`

No test uses it. It goes when Ryan no longer wants build 78 to look back at: delete the folder and its page on
the site, move the tools worth keeping, bring the docs up to date.

## After the refactor

`docs/ROADMAP.md`, which starts with a performance pass from the phone's numbers and a trial of a newer
three.js.

## Reference views

A view is a camera pose, a time, a wind strength and a cloud cover. Pose is `x, y, z, yaw, pitch`; looking along
`(-sin yaw, -cos yaw)`.

The views are defined once, in `tests/reference-views.ts`. They are the eleven sea views below, the legacy sets
from `legacy/tools/views.json`, `gviews.json` and `abviews.json`, and views at dawn, golden hour, sunset and
night under clear and partly cloudy skies, under water, in a calm, and of the controls. The table records where
the first eleven came from; the file is what the tests use.

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

Debug hooks the views use (legacy names; typed in `tests/scene-hooks.d.ts`, used only by `tests/scene-page.ts`):

| Hook | Does |
|---|---|
| `__lag.freeze(t)` | stops the clock at `t` seconds |
| `window.__fly = [x, y, z, yaw, pitch]` | places the camera |
| `window.__wind`, `window.__weather` | fix wind strength and cloud cover |
| `__lag.phase(p)` | time of day, 0 midnight, 0.5 noon |
| `__lag.hgt(x, z)`, `__lag.waveH(x, z, t)` | ground height; water height |
| `window.__cloudW`, `window.__noq` (before load) | a smaller cloud picture, for speed in the software renderer; no automatic quality |

The page must take the time only from `requestAnimationFrame` and `performance.now`: those are what the tests
replace to step the clock.

## Risks

- **The software renderer is not the phone.** A step can pass every check and still misbehave on the phone's GPU.
  Ryan looks at each preview. Water vertex shaders are the place to be most careful.
- **Bundling three.js** adds roughly half a megabyte to the page. Acceptable; say so if it turns out to matter.
- **Order of start-up.** Legacy files run top to bottom in one scope and some rely on that order. Step 3 keeps the
  order; step 4 removes the reliance.
- **Random streams.** The island's layout comes from seeded random streams consumed in a fixed order. Moving code
  can change the order and so the island. The comparison with the last merged build reports it.
