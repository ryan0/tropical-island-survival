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
16. **What the water does to the look of a thing under it has one owner for each eye.** A thing's own shader
    draws only the light that reaches it, dimmer and with its red lost by depth: sand, rock and coral alike
    (`light-under-sea.glsl`).
    **To an eye under water it is the water between the two that counts**, by the distance, red first, with
    the water's own light put in its place (`through-water.glsl`). Everything takes that from three.js's fog,
    which is given a second case (`sea/water-as-fog.ts`), so that no material needs telling. three.js hands a
    material the fog's colour, its near and its far and nothing more, so being under water is said by a fog
    that begins behind the eye; another kind of fog would say it plainly, but three.js compiles every shader
    again when the kind of fog changes. (20 November 2026.)
    **To an eye above the sea it is the sea's surface that draws all of it**, over a picture of what is
    under the sea that is drawn before each frame (`sea/under-water-picture.ts`): the surface reads the
    picture a little to one side, as its ripples bend the eye's line, and greys each thing, puts the water's
    glow before it and hides it in the water's colour, by that thing's own depth
    (`shaders/shared/water-veil.glsl`). Into that picture every thing under the sea is drawn on the line it
    seems to lie on through a flat surface (`shaders/shared/raised-through-surface.glsl`), since the picture
    is drawn by straight lines and the eye's line is bent down at the surface: without that, an eye looking
    down a slope that falls away saw past it to the deep. (On that line, further off, at its own depth: not
    raised where it stands, as it was until 26 November 2026. Only corners are moved, and raised each by
    its own amount a level floor was no longer level between them.) What lies so deep that the surface
    always covers it is drawn into that picture and not onto the screen. (And what stands a little out of the sea is drawn
    lower by the same rule, so that the sand at a waterline, between a corner that is moved and one that is
    not, stays where it is; the surface allows for it where a wave has run up a beach.) Other engines measure the water in front of a thing from the scene's
    depth behind the surface, which may not be read here (`DEVICE_NOTES.md`): so each thing writes its depth
    under the sea beside its colour, through the same place in every material that fogs it
    (`sea/water-as-fog.ts`), which needs two numbers three.js does not hand a material: they are one uniform
    whose value is a typed array that every material shares.
    It was arrived at the long way, in one day. First the surface alone hid things, by the depth under each
    spot of itself: a coral head was hidden by the depth of the sand beside it, and a pool's rim was the edge
    of a lid. Then each thing drew most of a veil on itself, as Half-Life 2's engine did
    (`docs/research/water-hiding-its-floor.md`), which cured the lid and left the sea flat, with five rules
    in five files to keep in step. Then the picture was tried beside all that, and two older rules that moved
    the things themselves were left running: rocks slid over the ground. Ryan found the picture "much better"
    and had the older rules deleted, not switched off: the sway of ground, rocks and coral; the ground's
    markings swimming; the tint painted on each thing for an eye above; the veil in the fog; the surface's
    search for a coral head and its rule for a low eye. (20 November 2026.)

## The sky

17. **Clouds are real volumes, drawn slowly** [23_clouds.js]. The sky is ray-marched into three wide pictures, one
    slice per frame, and the sky blends between them as the clouds drift. The same cloud field shades the island,
    dims the sun and shows in the water.
    The stars are points, the real bright ones in their places, and the Milky Way and the moon's face are
    pictures made at start-up (20 November 2026, `ROADMAP.md`, "The fourth sitting"): arithmetic for every dot
    of sky gave stars that were squares and a galaxy of noise. The whole field turns about the pole with the
    day, for an island taken to lie 7 degrees north.
18. **The sunset is kept clear.** The cloud field leaves lanes towards sunset and sunrise so cloud never walls
    them off.

## The land

19. **The island's shape is one formula**, shared by shaders and program [src/shared]. Nothing may disagree about
    where the ground is.
20. **Things need real shapes.** Painted rocks, painted rubble and bushes made of leaf pictures on balls were all
    rejected on the phone. Rocks, coral and plants are built as geometry.
    What is small enough to be flat to an eye at standing height is painted all the same, and since 20
    November 2026 as pictures of the real things, not as patterns of noise: the islet's ground is coral sand
    from shore to shore, and stones, the trees' litter and creeping plants are each a picture painted once at
    start-up and laid over it (`world/ground-tiles/`). In each picture a thing carries a rank, and the ground
    shows only the things above a threshold it chooses for the spot, so one picture is a few stones on clean
    sand here and a bank of rubble there. How thickly each lies comes from the turf's broad patterns and from
    a map of what stands over the ground (`world/tree-cover-map.ts`): litter under a crown, creepers at a
    shrub's foot. Nothing painted is bigger than a hand: a husk, a cobble or a fallen frond is a shape. A
    painted stone throws a shadow behind it and catches the sun on its near edge, read from the same picture
    a shadow's length towards the sun, or it is a stain. Those amounts are named numbers, so that another
    island, larger and older, could have soil and a greener floor (Ryan expects the game to need one).
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
