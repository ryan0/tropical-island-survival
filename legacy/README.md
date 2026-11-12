# Lagoon

An explorable coral atoll that runs as **one self-contained HTML page** (three.js r128 from cdnjs is the only
outside file). It is written as small source files and assembled by `build.py`.

    python3 build.py          # src/ -> dist/index.html
    node tools/check.js       # build + lint + boot test + wave mirror test   <- run after every change
    node tools/shots.js dist/index.html /tmp/shots     # pictures from the camera positions in tools/views.json
    python3 tools/ab.py old.html dist/index.html       # same pictures from two builds, with the differences shown
    node tools/series.js dist/index.html /tmp/w '{"fly":[3,3,160,3.14,-0.1]}' 20 1.3 8   # one view at 8 wave times
    node tools/load.js dist/index.html                 # triangles and draw calls per frame from five camera positions
    node tools/tris.js dist/index.html inland          # which things those triangles belong to
    node tools/perf.js dist/index.html                 # software frame time (for comparing two builds, not for speed)
    node tools/plants.js dist/index.html /tmp/p.png    # a portrait of every kind of plant on its own
    node tools/profile.js dist/index.html 90 50 0.8 12 # wave height along a line out to sea (south side), 12 moments
    python3 tools/sheet.py out.png 4 400 a.png b.png   # contact sheet of pictures
    node tools/xsec.js dist/index.html /tmp/x.png 75 59.8 0.3 6   # cross-sections of a breaking wave, as the shader shapes it

Publishing: `dist/index.html` is the artifact (title "Lagoon", slug `1481a1e1-85b4-478a-8545-c3a28f24e5c0`). Raise `BUILD` in `src/js/00_config.js` first; the number is shown
faintly at the bottom of the screen so a screenshot proves which build is on the phone.

## Layout

    src/index.html        page shell: CSS and the overlay elements (buttons, joystick, captions, glare, underwater tint)
    src/shared/*.glsl     formulas needed by BOTH shaders and program (the island's shape). Written once in a small
                          subset of GLSL; the build embeds them as shader chunks and converts them to JavaScript.
    src/glsl/*.glsl       shader chunks. `#include "name"` pulls in another chunk, `{{NAME}}` is filled in from JS.
    src/js/NN_name.js     the program. Files are joined in name order inside ONE function, so they share a scope.
    tools/                build checks and picture tools (headless Chromium with software GL)
    docs/SYMBOLS.md       generated: what each file defines and what it uses from other files
    docs/DEVICE_NOTES.md  what a real phone taught us about the water shader - read before touching it
    docs/ROADMAP.md       where this is heading, what is weak, what keeps it fast
    docs/HISTORY.md       notes from each build: what changed and why
    archive/              earlier single-file builds, kept for comparison

## How the program is organised

| file | what it owns | frame step |
|---|---|---|
| 00_config | build number, layout seed, sea level, the wave trains | |
| 05_core | error display, renderer (and its shadow filter), scene, camera, helpers (`rndStream`, `rnd`, `smoothstep`, `mix3`), `OBSTACLES` | |
| 20_glsl | `glsl(name)`, `glslFill(name, vars)` | |
| 22_detail | `detailTex`: the small repeating texture the water and sea floor read for ripples, foam and the light net | |
| 24_instances | `splitInstances`: instanced things in map squares, culled, with two levels of detail | `updateInstanceCells` |
| 30_terrain | footpaths, terrain mesh and colouring | |
| 32_lights | sun, moon, ambient; shadows redrawn only when needed | `updateLights` |
| 34_sky | sky dome, time of day, `sharedUniforms`, sun glare | `updateSky`, `updateGlare` |
| 36_waves | wave trains -> shader; JavaScript copy of the wave model (`waveH`) | |
| 38_water | water materials, far sea, wave mesh | `updateWater` |
| 39_foliage | `Shape` (builds a plant and its far-away version), `leafLight`, `joinGeometries` | |
| 39_rocks | five kinds of rock, placed in groups; `inRock()` for the plants | |
| 40_palms, 44_grass, 45_plants | palms, grass and sea plants, all the other plants | |
| 46_pier, 48_fire | pier; campfire | `updateFire` |
| 50_props, 52_life, 54_modules | hut/boat/props, wildlife, and the small module interface they use | `updateModules` |
| 60_player | movement, swimming, fly-in, captions, input | `updatePlayer`, `updateCaptions` |
| 62_footprints, 64_underwater, 66_spray | effects | `updateFootprints`, `updateUnderwater`, `updateSpray` |
| 70_audio | surf and crickets | `updateAudio` |
| 80_debug | test hooks, build number, hidden debug panel (hold the DAY button ~1.5 s) | |
| 90_main | the frame loop | `updateQuality`, `resize` |

**The frame loop** (`90_main.js`) fills `F` (time, then whatever each step adds) and calls the functions in
`FRAME_STEPS` in order. To add a system: create a file, give it an `updateSomething(F)`, add it to `FRAME_STEPS`.
A step may read what earlier steps put into `F`: `F.ground`, `F.swimming` (player), `F.day`, `F.night`, `F.vis`,
`F.sunEl`, `F.sunCol` (sky), `F.surfY`, `F.under` (underwater).

**Shared scope.** Top-level names are visible in every file. `tools/lint.js` fails the check when two files declare
the same name or a name is used that nothing declares, and `node tools/rename.js old=new` renames one everywhere
without touching locals or property names. Look a name up in `docs/SYMBOLS.md`.

**Shaders.** Every custom shader reads the same `sharedUniforms` (34_sky.js lists them). Chunks are plain `.glsl`
files; a chunk is included at most once per shader, so chunks can include what they need.

**One shape for the land.** `src/shared/shore.glsl` (outer shoreline `islandR(th)` and the ocean beach `shoreH(x,z)` that
the waves use) and `src/shared/island.glsl` (the whole atoll: `landW(th)`, `hgt(x,z)`, the sandbank) serve shaders and
JavaScript alike. Nothing else may hard-code the outline. Hand-placed things hang off the landmarks in `30_terrain.js`
(`HOME_SHORE`, `HOME_Z`, `HUT_X/Z`, `shoreZ()`, `lagoonZ()`); scattered things use `ringPoint()` and `nearHome()`.

**Waves exist twice** - `src/glsl/waves.glsl` (draws them) and `waveH()` in `36_waves.js` (swimming, spray,
footprints, boat). The check compares them on the GPU; keep them in step.

**Layout is seeded.** Rocks and plants are in the same place on every load (`WORLD_SEED`). Each file that scatters
things takes its own stream - `var rnd=rndStream('palms')` - so changing one kind of thing does not move the others.
Never `Math.random()` for placing things. Plant SHAPES use `leafRand()` (39_foliage.js), which no seed changes.

## Testing

There is no phone here. `tools/` runs the page in headless Chromium with a software renderer: reliable for "does it
compile and look right", useless for speed and blind to phone-GPU bugs (see docs/DEVICE_NOTES.md). Hooks the tools
use are listed at the top of `80_debug.js`. `tools/views.json` holds the standard camera positions
(`fly: [x, y, z, yaw, pitch]`, `sun` = sun elevation: 0.72 day, 0.07 sunset, -0.16 night).
