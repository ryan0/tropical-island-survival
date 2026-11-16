# Decisions and why

The choices that shaped the project, each with its reason. `HISTORY.md` has the detail build by build; this is the
short version to read first. File names in brackets are build 78's, in `legacy/src` at
the git tag `build-78`.

## The product

1. **A survival game on a coral atoll**, in the spirit of The Long Dark and Green Hell. Until build 78 it was a
   scene to walk, swim and dive in. The scene is the foundation, not a throwaway.
2. **Phone first, one HTML page.** Ryan plays and reviews on his phone by opening a link. Everything is judged
   there: look, motion, frame rate.
3. **Photo-real, matched to references.** Ryan supplies photographs; passes continue until the scene matches.
4. **The player builds what stands on the island.** The hut, boat and props were removed in build 69. A castaway's
   camp (lean-to, fire, stone ring) exists in code behind `CAMP = false` [00_config.js, 50_props.js, 48_fire.js]
   as a starting point for things the player will make or repair.

## Time, weather, wind

5. **A day lasts ten minutes** [34_sky.js]. It advances by real elapsed time, so a slow phone still gets a
   ten-minute day.
6. **Weather cycles on its own**, at a pace that suits the day: clear, slightly cloudy, cloudy. Light rain, heavy
   rain and storm are planned.
7. **Wind has four strengths**, cycling on its own, and drives three things. It never changes the swell.

   | Wind | Water surface | Clouds | Lagoon shore |
   |---|---|---|---|
   | none | glass: a flat mirror | still | quiet lapping film |
   | low | lightly textured | slow drift | quiet lapping film |
   | medium | the usual ripple | faster | small flat waves breaking |
   | high | choppy, whitecaps | fastest, and they change shape faster | waves with real height |

   Vegetation sways with the wind as well. Storm strengths come later.
8. **A menu on the corner button** sets time of day, cloud cover, wind and sound directly, for testing.

## The sea

9. **The swell is a model, not a simulation**, driven by the sea floor. Two swells come from the south. Where
   and when each wave breaks is read from pictures of the real sea floor's depth and of the swell's arrival times
   (`sea-floor-pictures.ts`), so the waves follow whatever the ground becomes. Each wave has its own size; it
   breaks where it is 0.78 of the depth high, with a falling lip where the floor rises abruptly and a crumbling
   crest where it rises gently; its breaking runs on seconds (the lip falls as gravity has it); then it crosses
   the reef flat as white water and breaks again on the sand. `ROADMAP.md` has the design; the notes for builds
   28, 29 and 78 describe the model it replaced.
10. **The wave model exists twice**, in the shader that moves the mesh and in the program for everything else
    (swimming height, spray, footprints). Both read the same pictures, and the sizes and timing are written once
    for both (`wave-timing/timing.glsl`); the shapes are written in each, and a test compares them on the GPU.
11. **Water is three meshes sharing one shader.** A flat far sea with holes cut in the shader; a ring of wave mesh
    round the atoll in 16 sectors of three tiles with three levels of detail; a strip along the lagoon shore that is lifted only
    in a high wind [38_water.js].
12. **Shade it if it is flat, model it if it has height.** Ripples, swell lines far out, whitecaps and the lagoon's
    medium-wind waves are shading. Anything that must occlude or show a silhouette is mesh.
13. **Whitecaps are drawn as crests that stand up**, not as flat foam. Flat foam is invisible from a beach beyond
    about 100 m; a real whitecap shows because it stands half a metre proud. (Build 75.)
14. **The sand shader owns the water's edge.** See the hard rule in `CLAUDE.md`. (Build 76.)
15. **One small repeating texture, read several times** at different sizes and angles, gives ripples, foam lace and
    the net of light on the sea floor without a visible repeat [22_detail.js].
16. **Everything under water takes the sea's tint by depth**: sand, rock and coral alike [seatint.glsl].

## The sky

17. **Clouds are real volumes, drawn slowly** [23_clouds.js]. The sky is ray-marched into three wide pictures, one
    slice per frame, and the sky blends between them as the clouds drift. The same cloud field shades the island,
    dims the sun and shows in the water.
18. **The sunset is kept clear.** The cloud field leaves lanes towards sunset and sunrise so cloud never walls
    them off.

## The land

19. **The island's shape is one formula**, shared by shaders and program [src/shared]. Nothing may disagree about
    where the ground is.
20. **Things need real shapes.** Painted rocks, painted rubble and bushes made of leaf pictures on balls were all
    rejected on the phone. Rocks, coral and plants are built as geometry.
21. **Plants and rocks are instanced in map squares**, culled when out of view and swapped for simpler shapes with
    distance [24_instances.js].

## Performance

22. **Only the phone measures speed.** Tools count triangles and compare builds; they do not predict frame rate.
23. **In place:** shadows redrawn only when needed; wave mesh sectors and levels of detail; instanced squares;
    automatic quality (resolution first, then shadows) below about 28 fps; expensive features gated by wind.
24. **A proper pass is due** after the refactor, with real profiling tools.

## How the project is run from here

25. **Vite and TypeScript, built to one HTML page.** TypeScript because nearly all frame time is in shaders, which
    stay GLSL in any language, and because types catch broken references while one shared scope becomes modules.
    A CPU-heavy system could later be Rust compiled to WebAssembly without changing the rest.
26. **three.js stays at r128.** It stayed through the refactor because a newer version changes lighting and colour.
    A trial of 0.187 on 15 November 2026 found the move cheap on the desktop, but its shadows lose the graphics
    context on Ryan's phone (`DEVICE_NOTES.md`). To try again when three.js or the phone's driver has moved on.
27. **Exactness is a tool, not the aim.** Through the first six steps of the refactor nothing visible changed,
    checked to the pixel against build 78's page. Since 14 November 2026 that build is a stepping stone:
    the aim is to simplify and improve on it. Every change is compared with the last merged build and shown
    before and after; a refactor is expected to show no difference, an improvement the difference it meant.
    The checks fail only on what is broken, and Ryan's merge is what accepts a change. Nothing about the
    reference is kept in the repository.
28. **GitHub: public repository, no licence for now.** GitHub Actions builds and publishes to GitHub Pages so any
    build opens on the phone; a dev server on the home network is the faster loop at home.
29. **Reference photos stay out of the repository.** Most are other people's. `reference-photos/` is ignored by
    git so they can be dropped in locally; `LOOK.md` describes them in words.
30. **Claude Code does the work**, in cloud sessions against this repository or on Ryan's own sandboxed machine.
    Ryan reviews and merges.
