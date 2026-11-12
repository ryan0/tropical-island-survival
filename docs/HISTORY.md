# How it got here

(File names in these notes are those of `legacy/`, the layout before the refactor.)

Notes written at the time of each build: what changed, why, and what was learnt. Newest last. For the current state of
things read ROADMAP.md first; come here for the reasoning behind a piece of code (the wave notes for builds 28 and 29
are still the best description of the wave model).

## Build 28 - how the reef break and the new water work

- Wave model (src/glsl/waves.glsl, copy in 36_waves.js). `s` is still metres off the beach, recovered from `shoreH()`.
  `sr = s - REEF_BREAK` (00_config.js, 40 m) is the coordinate the swell breaks in: the old beach maths runs on a
  pretend beach whose waterline is 40 m out, so small waves break ~3 m and the biggest ~8 m outside that line, on top
  of the real drop-off (island.glsl: flat to s=46, slope to s=64). After breaking the height falls to
  `0.05 + 0.12 x breaking height` and stays there to the real beach, where the real depth (`site.y`) limits it.
- Foam from the model thins with distance past the break (`fz`), comes back a little at the beach, and a faint steady
  patch sits on the break line. The fragment shader no longer limits foam by distance from the beach.
- Crest counts `m` are small on purpose (5, -7, 3) and each mesh square is split along the diagonal that matches
  them: a crest that crosses the mesh at a steep angle turns into a row of teeth. Keep `m/k` x column width (metres a
  crest moves per column) near one row (0.18 m) at the reef. The phase lead of bigger waves is 1.6 x (Aw-As) for
  the same reason, and each wave's size blends to a common value half way between crests (no step in the trough).
- The falling lip is now ~4 m per radian of phase at the reef (was ~1.6 at the beach), so a lip can pull a vertex up
  to ~9 m sideways when two trains break together; the hard limit in water.vert.glsl is +-12 m for that reason.
- Mesh rows (38_water.js): 0.18 m from REEF_BREAK-3 to +10.2, 0.5 m over the flat, 0.1 m at the waterline.
- Detail texture (22_detail.js, uniform `uDet`): 256 px, made at start-up. RG = slope of small waves, B = their
  height (soft blotches), A = a net of lines. The water reads it four times at different sizes and angles (ripples;
  A and B give foam), the terrain three times (the net of light on the sea floor). It replaced six sine waves and
  about ten noise calls per pixel. Fetch it OUTSIDE any `if` (mip level is undefined inside one on some GPUs).
- Underwater sand used to get the dark "wet sand" tint; that was why the shallows were dull. Reef flat coral closes
  up towards the edge and the seaward face is ribbed (spur and groove) - terrain_color.glsl, needs `shore` functions.
- Tools added: `tools/profile.js` (wave height along a line out to sea over time), `tools/sheet.py` (contact sheet),
  `tools/probe.js` (average screen colours, with or without the water drawn), `tools/wviews*.json` (wave views).
- Not done: no swell lines beyond the wave mesh (95 m); white water is still flat (no volume); close up and seen
  from below, the falling lip is a faceted sheet (columns are 1.5 m apart in the south, up to 4 m in the north).

## Build 29 - breaking waves that look like waves

- The bug behind the "mushy mounds": the breaking stage `q` was read at each point of the water, but a breaking
  wave's front is made from 6 m of water drawn up into the face and lip, and `q` changes by more than 1 across that.
  The lip's tip was already "collapsed" while its root had not started. Now `qc` = q at the wave's own crest
  (`q + xi/(k*wd)`) drives everything about breaking (`post`, `M`, `be`, `cr`), so the front keeps one shape.
- Stages: `M` rises over qc -0.6..-0.1 (the wave stands up into a steep hollow face, crest jacked from 0.62 H to
  1.05 H), `be` = qc 0..1 (the lip is thrown and falls), then it collapses into white water by qc 1.8.
- `ho` (0..1, from the breaking height) makes big waves hollow: lip thrown up to 0.98 wave heights ahead over a
  deeper face, and 45% more distance to do it in, which leaves a tube for about a second and a half.
- The lip grows from nothing (`lb`, `Xt`), so there is no step at the crest before it throws; the water ahead
  (xi -1.5..-1.2) is drawn in flat to the foot of the face; the back of the wave is 3.6 m long.
- Before breaking, crests narrow and troughs flatten (`kc`); white water has a back 2.5 m long, not a plateau.
- Foam left by one train is thinned where another train stands up (`f0..f2` in waveF); the face is shaded as a wall
  of water (`steep` in water.frag.glsl); the lip stays clear and whitens from its edge.
- `tools/xsec.js` draws true cross-sections of the surface as the shader shapes it (lip included) - the only honest
  way to judge the shape. `__lag.waveInfo(x,z,t)` gives each train's numbers at a spot.
- `tools/check.js` now compares shader and program with the lip switched off on both (uDbg=2 / noLip): they agree
  to a millimetre, so any drift shows at once. The program copy only lifts the crest of a breaking wave.
- Sea-floor light net fades out in water under ~30 cm and in the surf; water under foam is cloudy and hides it.
- Dolphins leap in the deep water outside the south reef (they were still at the old island's coordinates).

## Build 26 - first performance pass

`node tools/load.js dist/index.html` prints the triangles drawn per frame from five camera positions; build 25 drew
about 1.06 million everywhere, build 26 draws 285-460 thousand.
- Wave mesh: 16 sectors x 3 levels of detail, hidden when out of view (`updateWater`). Its vertex shader evaluates the
  wave model three times per vertex (position + two neighbours for the normal) - still the dearest thing per vertex.
- Plants and rocks: `splitInstances()` regroups each instanced mesh by 64 m map square so squares out of view or out of
  the shadow box are skipped; grass, sea plants, bushes and coconuts also have a maximum draw distance.
- Terrain colour skips the land work under water and the reverse; sky is drawn after solid things and skips night and
  cloud work when not needed; open sea beyond the wave mesh does not evaluate the sea floor; shadows use the plain
  PCF filter; automatic quality steps in below about 28 fps.
- Not done: the terrain is still one 135,000-triangle mesh drawn every frame; the water colour shader still evaluates
  the full terrain formula per pixel in the lagoon and on the wave mesh (a height texture would replace it);
  wave normals could come from one extra evaluation instead of two.

## Build 30 - first pass of the photo-matching loop (tools/g.sh renders the four comparison views)

- Done: darker striated wave face; churned (less clear) water in the break zone; a fifth, along-shore texture reading
  (`strk`) that streaks foam the way waves travel; foam lit by the sun, bubbly close up, a soft veil from far off;
  thin foam lingering behind white water; lumpy white water; more spindrift and a burst where the lip lands.
- Still short of the photos: white water has no real volume or mist cloud; spray is sparse dots (never judged in
  motion here - stills freeze it); no wet-sand mirror sheen; sea floor has no rocks/rubble relief; water away from
  the surf reads pastel next to the photos' darker, more reflective water.

## Build 31 - second pass of the photo loop

- Mist: particles that grow (spG > 0.5) fall slowly; white water carries a low cloud, the lip's landing throws a burst.
  Half the spray samples now look 30 m ahead of the camera. Big sprites fade out close to the camera.
- TEST TOOLS: spray used the live clock while the wave was frozen, so every earlier still showed spray in the wrong
  place. updateSpray now follows the frozen clock. A frozen wave emits continuously, so stills overstate the mist.
- White water is taller just after the break (0.66 Hb), rougher lit foam; wet-sand glaze band mirrors the sky at low
  angles; rubble patches on the sea floor (`stone`); water colour builds up sooner with depth.
- Still short: white water silhouette is a smooth ridge; mist and wet-sand glaze have only been judged in stills.

## Build 32
- User: mist "a bit much" -> mist alphas and rates roughly halved. Rubble patches (build 31 `stone`) removed: on the
  phone they read as flat dark polygons (the texture's cell interiors), not stones. Rocks need real geometry or a
  purpose-made texture, not the detail texture's net.

## Build 33
- Wet sand: the band was sized for the old 1 m beach surf (up to 1.15 m above the sea, 40% darker) and the build-31
  glaze sat on top of it as a pale blue stripe. Now only up to ~0.45 m, a shade darker, glaze faint and at the edge.

## Build 34
- The dark band with a hard edge along the waterline was NOT wet sand or water: the underwater brightness factor in
  terrain_color.glsl (x0.87, added in build 28 as x0.94) switched on as a step at the waterline. It now fades in over
  70 cm. Found with tools/probe.js (render with the water hidden). Wet-sand darkening is now barely there (x0.93),
  the thin swash sheet is drawn clear (no tint, no foam veil, not treated as "raised thick water").

## Build 35
- The pale teal band above the foam line had three parts: (1) the swash run-up (`ru` in WAVE_TRAINS) was still far
  bigger than the small waves now reaching the beach, so its sheet ran 1.5 m up the sand on its own clock - cut to
  ~0.6 m; (2) that thin sheet was tinted as cloudy water; (3) sand down to 20 cm below sea level, which the waves
  uncover, got the underwater tint and light net - the underwater look now starts at `dw` = depth - 0.2.
  Sky sheen/glaze on wet sand removed. Left: a faint static line up the beach (lighting on a kink in the terrain).

## Build 36
- The lace band on the beach was foam drawn on the swash sheet (water 0-3 cm deep lying on the sand above the
  waves). Removed at every source: the sheet's own foam in waveF, the standing "surf" lace along the beach, edge foam
  round still water, and finally a rule in water.frag.glsl: no foam on water under ~3 cm unless wfv > 0.2, and water
  under ~1 cm is not drawn at all. Wet-sand darkening is now x0.975 (anything more reads as a stripe).
- Debug trick that found it: temporarily output vec3(wfv*4, foam*2, depth*10+.5) for sg < 1.5.

## Build 37 - land (steps 1 and 2 of the "what next" list)
- Palms: 215 (was 150), closer together, each with its own height and lean (more lean near the beach), 17 fronds in
  three tiers (upright / crown / hanging and yellowing), longer drooping fronds, darker greens, per-frond tint,
  grey-brown trunks. Scrub: 620 bushes (was 260), bigger, darker, few flowers, from the back of the beach inland.
  Grass tinted deeper. Ground under the trees: leaf-litter patches. Back of beach: faint coral-rubble speckle.
- Cost: about 12-20% more triangles (337-518k per frame). The layout reshuffled (more rnd() calls).
- Not done from step 2: dark beach rock at the waterline (anything painted there has read as a stripe).

## Build 38 - palms rebuilt (40_palms.js rewritten)
- Frond: 512x128 texture of one feather leaf (separate tapered leaflets, pale at the midrib), on a broad strip that
  arches up and out; 20 per palm in four tiers (spear/young, crown, skirt, old or dead), tinted per frond.
- Four trunk shapes in KIND[] (ordinary, tall slender, leaning, young stout), each its own InstancedMesh; swollen
  base, ring-scar bark. Beach-edge palms mostly lean seaward. 200 palms. About 5% more triangles than build 37.
- Lessons from the loop: a frond strip folded steeply at the midrib reads as bare ribs; drooping the whole frond
  makes an umbrella, real crowns arch up first.

## Build 39 - more kinds of plant (new file 45_plants.js)
- Beach shrub mounds (480, hedge at 1.6-2.7 m up plus scattered inland), broadleaf trees (46), screw pines (70),
  ground rosettes (420). Shapes are built with the small Shape helper (blob / card / stem); plant(parts, ...) puts
  several meshes at the same places (solid leaves use a repeating texture, cut-out rosettes a second one).
  Old billboard bushes cut to 240.
- Cost: looking inland 601k triangles and 146 draw calls (build 38: 552k / 115). Watch the phone's frame rate.
- Weak points: shrubs are chunky close up; screw pines and trees have not been looked at closely; grass and the
  ground itself were not changed in this pass (reference shows dry patchy grass, vines, fallen fronds, dark rocks).

## Build 40 - shrubs and trees rebuilt from leaves (45_plants.js)
- User: the build-39 bushes were "circular", faceted balls wrapped in a leaf picture, with black cut-outs on top.
- Now: Shape.leaves() scatters small cards (a 2x2 sheet of paddle-leaf sprigs) over a ball, each knocked askew but
  lit with the ball's normal, shaded darker low down and inside (vertex colour), over a small dark core. The black
  cut-outs were three.js lighting the back faces of double-sided cards: patched in mR.onBeforeCompile.
- Trees: five such masses on visible limbs (trB, bark material). Not yet seen clearly in a render - ask the user.
- Cost: inland view 637k triangles / 152 draw calls.

## Build 41 - screw pines and ground rosettes rebuilt (45_plants.js)
- Were three crossed cards with a picture of tube-like blades: half of each tuft black (back faces lit from below),
  neon colour. Now Shape.blades(): every leaf a real tapered, folded strip, lit as part of one rounded crown and the
  same on both sides, dark base to lighter tip by vertex colour; no texture. Screw pines got stilt roots, bark
  stems and dead brown leaves under each crown.
- Cost: inland view now 760k triangles (build 40: 637k). First thing to cut if the phone slows: rosettes (420 x 300
  triangles) - fewer leaves or a shorter draw distance.

## Build 42 - ground and grass
- terrain_color.glsl land: sun-bleached yellow-green turf, straw where dry, vine-mat patches (dark, leaf speckle),
  bare sandy patches, tan leaf litter. Grass tufts 7000 (was 13000), four in five half height, tinted like the turf
  (tintAt in 44_grass.js mirrors the shader's tint - keep in step).
- 45_plants.js: fallen fronds (ff), vine mats of real leaves (vn), palm stumps (st).
- Not done: dappled palm shadows on the turf are only as good as the shadow map; ground is smooth close up.

## Build 43 - ten-loop vegetation pass
- New tool: `node tools/plants.js dist/index.html out.png [filter] [size] [cols] [variant]` photographs each kind of
  plant with the other kinds hidden (registry PLANT_REG / plantKind / plantSample in 05_core.js, `__lag.plants`).
- Loops: 1 grass (fine fanning tussocks, 256 px pictures; the fan-leaf herb retired), 2 old flower bushes replaced
  by 'scrub bush' (leaf masses on stems), 3 stump (root flare, uneven break), 4 vine mat (runners, round leaves,
  flowers; geometry, no texture), 5 fallen frond (the palm frond picture, bleached), 6 beach shrub (more, smaller,
  layered leaves), 7 palms (finer grey bark, crown boss, leaflets hang more), 8 broadleaf tree (7 masses on bending
  limbs), 9 rosette (fuller), 10 screw pine (5 mop heads, long drooping blades, stilt roots).
- COST: inland view 947k triangles (build 42: 754k). Leaf counts were already trimmed once from 1188k. If the phone
  slows: beach shrub leaf cards and scrub bush count are the biggest items.
- Weakest now: grass turf (still flat cards), vine leaves (angular), young palm.

## Build 44 - performance pass, clean-up, three finds

- Asked for after build 43 slowed the phone down. Measured with the new tools/perf.js (software frame time - only good
  for comparing) and tools/tris.js. Shadows were about half of all the work: every plant was drawn a second time into
  the shadow map on every frame, and every lit pixel read that map 17 times.
- Shadows: the map is redrawn only when the player has moved 8 m or the sun has moved (32_lights.js). Animals no
  longer cast shadows (theirs would freeze). 9 weighted reads per pixel instead of 17 (05_core.js).
- Plants: two levels of detail in 32 m squares (24_instances.js); the simpler shape comes out of the same Shape
  calls (39_foliage.js). Leaves, core and stems of a leafy plant share one atlas picture and are one mesh. Coconuts
  are part of the trunk mesh. Grass cards are drawn once (two-sided), not twice.
- Terrain: the flat deep-sea floor is one rectangle (was ~62,000 triangles of grid); drawn after everything solid.
- Result: inland view 947k -> about 500k triangles in the picture, shadow pass from every frame to almost never,
  software frame time 1.66 s -> about 0.95 s.
- Find 1: three.js does not set `cameraPosition` for Lambert materials. The terrain shader used it for "fade this
  detail out with distance", so every close-up ground detail ever written (grains, specks, grass streaks) had been
  invisible, faded as if the camera stood at the lagoon's middle. Now `uCam`. The sea-floor light net had been tuned
  by eye under the same mistake, so its fade is kept as it was, written out as distance from the middle.
- Find 2: the terrain's speckle map was read by three.js and then thrown away (the shader replaces the colour). It
  is now a sand-grain picture and is multiplied back in near the camera (`grit`).
- Find 3: fronds were black underneath. `leafLight(material, [r,g,b])` adds light coming through the leaf.
- Random numbers: every part that scatters things has its own stream (`rndStream('palms')`), so changing one no
  longer moves the others. (This build is the last general reshuffle.)

## Build 45 - sand pass (five loops), wind
- Wind bug: three.js shares one compiled shader between materials whose onBeforeCompile functions have the same
  source text. leafLight() wrappers all read the same, so fallen fronds ran the palms' wind shader and every grass
  kind the first one's sway. leafLight now gives each material its own customProgramCacheKey. Wind amplitudes cut
  to about 45%.
- Sand (terrain_color.glsl, tools/s.sh renders the four sand views): whiter coral sand (kept under 0.83 so sunlit
  sand does not clip to white); grain picture rebuilt (fine grain + clumps + round specks) and read at two scales;
  `relief` = dimples and hummocks from the detail texture's slope, shaded against the sun (needs uSunDir), only on
  dry beach (`loose`); shells and coral chips (one per 30 cm cell, drift line at ~0.85 m); damp sand is a wide
  gradient (x0.945 over 0.7 m of height) - the user rejected every narrower band.
- 45_plants.js: 'coral lump' (520) and 'coconut' (70) as real shapes on the beach.
- Relief amplitudes above ~0.6 read as dirt smudges. Standing within ~20 cm of the ground the grain blurs.

## Build 46 - sand, second pass (user: "cleaner", "more layers at the grass and at the water")
- Clean: grain picture has 260 faint specks (was 1500), grit at half strength on the beach, chips almost only on the
  drift line, coral lumps only at the drift line and the back of the beach.
- Sand albedo is ~0.72 and nearly neutral: the sun is warm (blue x0.82) and lighting multiplies by ~1.3, so a
  warm 0.84 came out yellow and too bright to show any relief.
- Relief: `dimples()` (terrain_pre.glsl) - oval hollows in a jittered grid, three layers, shaded against the sun;
  wind ripples where `trod` is low. Only where `loose` > 0.
- Water side: `soaked` (to ~0.3 m up), `damp` (to ~0.6 m, patchy), swash lines (`sl`), a little sky sheen on soaked
  sand. All fade out below the waterline (`shoreK`). The user had rejected hard dark bands; this one is graded and
  tied to the waterline - watch for a complaint.
- Grass side: `back` (greyer sand + `fleck()` litter), `patchy` turf edge (islands and tongues), dark stained rim.

## Build 47
- Blocky patch at the back of the beach = the coral-rubble colour, one flat colour per hash(floor()) square, which only
  became visible once the camera-distance bug was fixed. Now a round pebble per 8 cm cell. Rule: never colour by
  floor() cell alone - always shape the thing inside the cell.
- Swash lines halved in strength, unevenly spaced, each one fading in and out along the beach; damp band lighter and
  patchy. (On the phone the build-46 lines read as contour lines.)

## Build 48
- Rubble again: one same-sized round pebble per cell read as a sheet of polka dots on the phone. Now `pebble()`
  (terrain_pre.glsl): random place, size (chip to fist), oval/angular outline and angle per cell, many cells empty,
  three layers at three angles and scales. Rule: a cell pattern needs random size, shape, angle AND gaps, in more
  than one layer, or the grid shows.

## Build 49 - rocks replaced (39_rocks.js, was 42_rocks.js; rock_color.glsl rewritten)
- Five kinds x 2-3 shapes: boulder (noise ball cut by random planes = fracture faces, plus grooves), crag (ridged,
  then faceted - pure ridged noise looked like a spiky crystal), slab (flat-topped, stepped beds, straight broken
  edges), karst (ridges and pits), cobble. Tone per vertex (hollows dark) x per-rock tint.
- Surface: the detail texture laid on from three sides at two scales. Its net of lines used at full strength looks
  like dried mud / animal print: only the strongest lines, in patches, are cracks; pits come from the blotch channel.
  Bleached tops, barnacle band, wet band, underwater tint.
- Placement by rule, in groups (big, mid, cobbles spilling out): boulder/crag groups on the ocean waterline, small
  boulder groups on the lagoon beach, slab ledges along the waterline, karst ridges at the back of the beach, lone
  crags on the reef flat, a few landmark boulders. clear() keeps them off the pier, hut, paths, fire and home beach.
  inRock() keeps plants out. tools/rocks.js photographs the groups at eye level.
- PIER_X/Z0/LEN moved to 30_terrain.js (rocks are built before the pier).

## Build 50 - karst rebuilt (three passes; tools/karst.js)
- Was a noise ball: on the phone it read as crumpled dark paper floating over the sand. Now a height field over a
  lobed outline: low dome that slopes under the sand before its edge (ragged outline, no underside), pinnacles that
  point up (ridged noise in x,z), two sizes of pit, sand colour deep in some hollows; sits level and sunk (sit -0.10),
  15 subdivisions near / 5 far. Grey 0.33-0.43 with tone to near-black in pits; paler came out like marshmallow.

## Build 51
- Fewer rocks, unevenly spread: rocky(a) (39_rocks.js) marks rocky stretches by bearing; bearings() offers each
  direction to it (a clean stretch keeps ~1 in 10) and tries only n*7 times, so totals fall; group sizes scale with it.
  Home is on a clean stretch (one boulder group, one small crag, one ledge). About 250 rocks + 250 cobbles.

## Build 52
- Fewer rocky areas, same fullness inside them: rocky(a) is now three explicit reaches (REACH in 39_rocks.js: west,
  east point, a lesser one north-east); clean stretches keep 1 in 25. About 185 rocks (was ~255), three quarters of
  them on the west and east reaches.

## Build 53 - light and sky (tools/l.sh renders twelve views across day, golden hour, sunset)
- Shadows (32_lights.js): the box is 96 m on foot (4.7 cm a dot, was 150 m / 7.3 cm) and sits AHEAD of the camera;
  five sizes by camera height, up to the whole island from the air (the fly-in used to have no shadows); normalBias
  scales with the dot size. Still redrawn only on demand - turning the view now moves the box, so it redraws a few
  times per turn.
- Light: sun stronger and warm, sky fill blue (hemi sky colour) with warm bounce from the sand (hemi ground colour);
  shade is ~35% of sunlit and cool. A low sun is boosted (flat ground would go dark) and the evening sky adds fill.
- Time of day: day, golden (0.27), sunset, night. The sun's bearing swings from south-east at midday to south-west
  at sunset, so it sets over the sea in front of the home beach.
- Sky (sky.frag.glsl): deeper zenith, warm haze towards the sun, `gold` and `eve` colour terms, and trade-wind
  cumulus along the horizon: laid out by compass bearing x height, flat bases at one elevation, heaps of rounded
  lumps (`shape`), self-shaded by a second noise sample offset towards the sun. Bearing wraps due west: the clouds
  leave a gap there. First attempt (noise sheared by height) looked like snowy mountains.
- Cloud shadows: soft blotches (detail texture, blue channel) drift over terrain and water. Plants are not dimmed.
- Not done: shadows do not move with the wind (they are static between redraws).

## Build 54 - cumulus rebuilt, and lit properly at golden hour and sunset

Ryan: "the cumulus clouds need much improvement… the sun doesn't hit and color the clouds right at sunset and golden hour"
(six photos: white cauliflower towers with grey undersides and flat bases; a tower glowing peach on its sun side with
slate-blue shade; isolated cumulus lit orange-pink at dusk).

- New `src/js/23_clouds.js`: the horizon cumulus are modelled once at start-up as heaps of balls with buds on buds
  (wavering outlines, fine noise bumps) and drawn into a 4096 x 256 panorama `cloudTex` (`uCloud`). It holds no colour:
  RG = surface direction (blend of small lumps 0.5, big lumps 0.3 - the direction averaged over 7 dots - and the side
  of the whole heap 0.2), B = openness (crevices at two scales, low under the mass), A = distance from the outline
  (128 = outline, +-8 dots). About 0.4 s to build in node.
- `sky.frag.glsl`: the cumulus block reads the panorama and lights it from the real sun direction. `cloudSun` (white
  by day, gold, then orange-pink) and `cloudShade` (blue-grey by day, slate at dusk, a little moonlight at night) are
  shared with the overhead cloud layer. A sun behind the cloud counts for a third (tops and flanks still lit), low
  sunlight is redder on a cloud's lower parts, the base is in its own shadow, thin edges get an uneven lining when
  back-lit, and the outline is frayed with noise against the distance-to-outline alpha.
- Lessons: lumps of noise sheared by height looked like snowy mountains; perfect balls looked like bubbles (wavering
  outlines + bumps + slope-based directions fixed it); lighting each small lump separately looked like rock at sunset
  (blend in the big-lump direction); a uniform bright outline looks like a sticker.
- Tools: `tools/c.sh <tag>` (nine wide cloud views + night and dusk), `tools/cz.sh <tag>` (close-ups).
- Not done: clouds do not change shape, only drift round; the panorama is about one dot per screen dot on a phone, so
  it will look soft if zoomed. Generation adds to start-up time (phone to confirm).

## Build 55 - all clouds as real volumes: soft, drifting, boiling

Ryan on b54: the cumulus are "far too solid", "if they could be made more dynamic that'd be amazing", and "they now
contrast too much from the other clouds".

- The build-54 panorama of sculpted balls and the old noise layer overhead are both gone. `23_clouds.js` now holds a
  cloud *field*: `cloudNoise` (64^3 space-filling noise as an 8 x 8 atlas of 66-dot tiles, R = shapes, G = finer lumps),
  `cloudWeather` (256^2, 64 km: R cumulus cover, G towers, B height, A cirrus streaks), and three sky pictures
  (`cloudSky`, 4096 x 512 render targets: bearing x elevation, finer near the horizon).
- `cloudbake.frag.glsl` walks each direction out through the field (64 steps growing with distance, each walked in six
  where the weather map has cloud; six steps towards the sun for shadow; cirrus sheet at 9 km) and writes premultiplied
  sunlit / skylit / haze / cover. `updateClouds` redraws 1/128 of one picture per frame; the sky blends from the last
  finished picture to the newest and shifts each by the wind drift since it was made (`cloudAt` in sky.frag.glsl).
- Clouds drift (wind 6 m/s), their shapes rise and their fine lumps rise faster, so they re-form over a minute or so.
- `CLOUD_START` + the weather seed were chosen by a search (/tmp script, not kept) so that at the start towers stand
  opposite and beside the sunset, none across it and none overhead.
- Bugs met: slices of non-whole width left vertical lines; reading the weather once per coarse step drew rings on the
  clouds (read it at every point); fixed light-step lengths drew rings in shadows (vary them per dot); a regular
  dither pattern showed as stripes (use white noise, and average two reads half a dot apart in the sky shader).
- Test hooks: `window.__cloudW` (picture width; env LAGOON_CLOUDW in the tools), `__lag.cloudState`; under `__freeze`
  one whole picture is drawn at once. `tools/cq.sh <tag> [width]` renders the views in /tmp/cq.json.
- Not known: the cost on a phone (about 16 000 dots of a heavy shader per frame; the old per-dot sky noise is gone in
  exchange), and whether the walk shader compiles everywhere - if it does not, the sky simply has no clouds.
- Not done: clouds do not shade the island or dim the sun when they pass in front of it; the water does not reflect them.

## Build 56 - the clouds shade the island, dim the sun, show in the water; the sunset keeps a clear lane

Ryan on b55: "It's truly amazing, and the performance is good", then asked for the gaps I had listed.

- `cloudfield.glsl` (new chunk): the cloud field (n3 / weather / cloud), shared by `cloudbake.frag.glsl` and the new
  `cloudshade.frag.glsl`. `weather()` now has a **lane** along the sunset bearing (`CLOUD_LANE`, az -0.85): beyond 4-9 km,
  within about 13-26 degrees of it, towers vanish and cumulus thins to a quarter, so drifting cloud never walls off the sunset.
- **Shadow map** `cloudShade` (256^2, 24 km square, an eighth redrawn per frame): sunlight getting down through the
  clouds. Water: body x mix(.62,1,shade), sun glitter x shade^2. Terrain: brightness relative to the camera's spot.
  Fades out below about 9 degrees of sun (shadows would be longer than the map).
- **Sun dimming**: `cloudSunThrough` walks from the camera towards the sun through a JavaScript copy of the field
  (`cloudWeatherAt`, `cloudShapeAt`, `cloudAmountAt` - must be changed together with cloudfield.glsl; a grid test gave
  correlation 0.95 against the shadow map). It gives `F.sunThru` / `uSunThru`: sun lamp x (0.22+0.78 thru),
  hemisphere light x (0.84+0.16 thru), glare overlay x (0.15+0.85 thru). The sun's disc was already hidden by cloud.
- **Reflections**: water.frag.glsl looks the mirrored direction up in the two sky pictures (no drift shift) in place of
  its old noise clouds. `uCloudSun` / `uCloudShd` (cloud colours) are now worked out once in updateSky and shared.
- Wind turned to an easterly trade wind `[-0.0058,0.0012]` so the cumulus field east of the island crosses it; weather
  seed 1234567 and `CLOUD_START=[12,23]` from a search: first cloud shadows at about 8 minutes at midday, shade on and
  off until about 18 minutes, no long overcast at midday in the first hour; at golden hour a long overcast spell from
  about 45 minutes in.
- Not done: reflections are faint except near the horizon (the sea is rough); objects other than terrain and water
  dim all together with the camera rather than each where it stands; no shadows from clouds at night or at sunset.

## Build 57 - small performance pass; the reef, first pass against Ryan's reef photos

- Performance: terrain_color.glsl no longer works out dimples, wind ripples, litter and pebbles beyond the distance at
  which each has faded out (pictures identical to within 5/255). Software frame time unchanged within noise: the
  scene's cost is mostly triangles. Nothing else found that would not change the look.
- Ryan's reef references: wide flat platforms reaching nearly to the surface, tan from above with dark rims; packed
  with tables, lobed Porites mounds and fine-branched Acropora bushes in pastel tan / cream / lavender / pink; pale
  rock crusted pink with yellow-green turf; butterflyfish and blue chromis.
- New `47_reef.js` (replaces the kelp-and-coral block of 44_grass.js; the kelp became short sea-grass beds): about 70
  coral heads (platform profile (1-r^3.5)^0.5, uneven outline) in 1.3-7 m of water, tops 0.7-1 m under the surface,
  packed with five coral kinds (lobed mound, bush, table, knob, staghorn), smaller corals on the sand round them.
  One vertex-coloured Lambert material with the sand's caustics. Coral colour is dimmed by depth far less than sand
  and warmed x1.3 red (the underwater light and overlay are blue). Bushes and mounds have simple far shapes (13 m, 22 m).
- `uReef` (256^2 over 300 m about the home islet): height of the heads' tops; water.frag.glsl uses it so water over a
  head is drawn shallow and clear (before that the heads showed as dark blobs from above).
- Test: `window.__reefHeads`; camera yaw to look at a point is atan2(-dx,-dz).
- Falls short: lobed mounds are faceted and plain close up; bushes are stubby sticks, not fine branches; rock is plain;
  no clams, no reef fish about the heads; nothing on the outer reef slope; sea grass is still crossed cards.

## Build 58 - reef, second pass: closer look, clams, reef fish

Ryan on b57: "Maybe slightly too yellow".
- Colour: instance factors now red 1.24, green 0.93, blue 0.90 (0.87/1.0 went pink-purple; 0.94/0.92 with red 1.30 was yellow).
- Lobed mounds 26 x 13 close up; bushes: 62 three-sided stubs each ending in two fine tips; rock with more pink
  crust and green turf; a grain from the detail texture on all reef surfaces (reefMat).
- Giant clams (`clamGeo`, three lip colours baked in) set into the tops of the heads.
- Reef fish: `updateReef` frame step; 8 small blue fish and 2 yellow butterflyfish circling each of the 22 biggest
  heads within 120 m of home (two instanced meshes, matrices rewritten every frame).
- Still short: platform tops are sparsely covered in places; mounds lack the fine polyp texture; no outer-slope reef.

## Build 59 - reef fish fixed and redrawn

Ryan on b58: "a lot of the fish slide and or swim backwards", and make them more realistic.
- Cause: heading was taken from the orbit angle, but the sway term could outrun the steady speed (so they backed up),
  and the turn's sign was wrong for half of them. Now `fishAt(f,t)` gives the position and the heading comes from the
  position 0.1 s later; the sway is kept below the steady speed. Test (/tmp, not kept): cosine between nose and
  motion, mean 0.995, worst 0.987 over 220 fish.
- `fishGeo`: tapered body, forked tail, back and belly fins; `paintBlue` (chromis), `paintYellow` (butterflyfish:
  stripes, black eye bar). Body wags and pitches with climb. Fish now circle outside the head's rim, clear of the coral.
- `window.__reefFishMeshes` for tests.

## Build 60 - the band of pale water out to the horizon

Ryan (b58 screenshots): a strip of light turquoise water running out to sea on one side of the island.
- Cause: `uReef` is read with its edge clamped, and a coral head lay on the edge of its 300 m square, so that edge dot
  was repeated to the horizon as "shallow water". Fixed in water.frag.glsl (the map counts only inside its square) and
  in 47_reef.js (the outermost dots are never written). Lesson: a map read outside its square needs an explicit mask.

## Build 61 - the original fish schools get the new fish

Ryan: apply the fish fixes to the original schools (e.g. by the pier).
- 52_life.js schools now use `reefFishGeo` (exported from 47_reef.js) painted in greys under each fish's own tint. The
  old model had its tail at +x, the end the heading code points along the motion - so the schools had been swimming
  tail first all along. Wag reduced 0.3 -> 0.14 rad. Not rendered; start-up checks only.

## Build 62 - fish spread through the lagoon

Ryan: spread the fish out so the empty reefs and stretches have some passing through.
- 52_life.js: three home schools of 30 (were 45) plus ten parties of 8 that follow wide loops (up to about 40 m)
  through the lagoon; each loop is shrunk until it stays in 0.9-6 m of water all the way round.
- 47_reef.js: every coral head wider than 1.7 m has its own fish (2 + 1.1 x radius blue, up to 2 butterflyfish):
  375 reef fish in all (were 220, round the 22 biggest heads near home). Heading test still passes (worst cosine 0.989).
- The wandering parties were not rendered or measured; start-up checks only.

## Build 63 - reef close-up pass

- Bare platform tops: the corals had been placed with an older profile formula than the platform model's, and the
  model's outline bulged up to 1.4x beyond where anything was placed. Placement now uses the model's own profile
  ((1-u^3.5)^0.5) out to 1.04, and the outline wobble is halved. Plus a carpet of small corals (3.5 per m2 of r^2).
- `knobS` / `brainS`: the simple far shapes used as kinds of their own for the carpet and the slopes.
- Reef slopes: 1200 corals straight on the sea floor in 2.5-8 m, in broad patches, within 160 m of home.
- Polyp grain close up (reefMat: detail texture read at 11x and 23x, fading by 0.22/m from `uCam`); the grain's
  coordinates now mix height into x and z separately (adding it to both drew diagonal streaks on steep faces).
- Sea grass: 1500 very short wide tufts, paler.
- Triangles: the fish were the surprise - 590 fish x 230 triangles. Fish body now 10 x 6; reef fish beyond 70 m of
  the camera are not drawn (`count` set per frame). Views now 370-570k (b56: 246-512k).

## Build 64 - the lagoon shore

Ryan's references: glassy clear shallows with the light's ripple net on the sand, a thin lapping edge with a thread of
white and a narrow darker wet strip (ground views); from the air a white beach straight into pale water, no dark band.
- terrain_color.glsl: `lagK` (1 on the lagoon's side of the land; uses landW()'s formula inline - the terrain shader
  does not include it). On that side: no swash lines; soaked strip only to 7-14 cm above the water and paler; a tide
  line of shells low (0.34 m) and thin; `lap` = how high a film of water reaches now (3.5 cm +- 4, a few seconds'
  period, uneven along the shore); under the film the sand is cooler and glossy, with a faint broken white thread at
  its edge. The film is painted down to 20-30 cm below the still level, where the water plane starts to show -
  without that the first metre of water looked like dry sand with a white line drawn above it.
- Under water in the lagoon: half the desaturation, caustics in from 10-45 cm (ocean: 10-80 cm) and 35% stronger in
  the first metre.
- Not done: the water plane itself does not move at the lagoon's edge; no ripples lapping on it.

## Build 65 - swell lines on the open sea

- water.frag.glsl: beyond where the modelled waves fade out (62-95 m offshore) the same three wave trains are carried
  on as shading only: `{{SWELL}}` (filled in 38_water.js from WAVE_TRAINS) is each train's slope A*om/4.95 * cos(phase),
  with waves.glsl's phase (om*(t+tau)+m*th+ph, tau = 16.749+(s-40)/4.95 beyond 40 m; crest at phase pi/2). It tilts the
  normal along the radial direction (x1.4) and darkens faces / lightens backs by 13% (`swB`) - the tilt alone showed
  only at grazing angles, not from the air. Fades out 240-560 m offshore; 28% strength in the lee (north), full on
  the south; off with the WAVES OFF switch (uDbg=1); phases wobbled by the detail texture beyond 95 m.
- No change to the wave model or its JavaScript copy (the mirror check is unaffected). Cost: three sines and cosines a
  water pixel in that zone.
- Limits: the lines are rings round the atoll (the trains are defined by distance offshore), not straight swell from
  one direction; from the beach they resolve only out to about 200 m.

## Build 66 - water passes: wind patches, clearer shallows, larger swell

Ryan: swell "very slightly larger (greater period and amplitude, but with variances)"; then a few passes on the water
in general against the references.
- Seen in the b65 renders: from above, the lagoon's fine ripples showed as a regular hatching; mid-distance water was
  one flat cyan; the shallows carried too thick a veil of colour.
- water.frag.glsl: `slick` (detail texture read 250 m across + the 37 m one; stronger in the lagoon): slicks carry
  35% of the fine ripples, mirror more (Fresnel cap 0.14 instead of 0.40) and are 5% paler; ruffled water mirrors the
  sky from 0.12 higher (bluer). Fine ripples fade to 40% with distance (exp(-dist*.025)): the hatching is gone.
- Colours: shal (.15,.74,.72), mid (.03,.55,.70), lagoon deep (.015,.34,.53). Veil: a=mix(.07,1,smoothstep(.15,5.6,depth)).
- Swell: train slopes x1.25, uneven along each line (x(.8+.6*d1.b)), plus a far-only fourth component (om 0.70 =
  9 s, 44 m, in sets) that fades in 95-170 m offshore; band contrast now clamp(sl*4.5).
- Not done: the sea floor does not wobble through the ripples (no refraction); rocks and coral lumps under water are
  not tinted by depth; close up the surface shows only through the caustics and glints.

## Build 67 - the sea's tint on everything under water; rockier reefs that run into the floor

Ryan: tint rocks and coral by depth as the sand is; reefs "a bit more rocky", and the ground where they stand rockier
and blending into the reef models.
- New chunk `seatint.glsl`: `seaTint(c, wp, up, k)` - the sand's underwater treatment (greying, loss of red with
  depth, blue-green glow, caustics) for any material. Rocks (rock_color.glsl, k=1; wet darkening eased below the
  waterline) and all reef corals (reefMat, k=0.5 so living coral keeps colour). The reef's per-instance depth dimming
  is gone. ('in' is a reserved word in GLSL 3 - the first try failed to compile.)
- Coral heads are now rock: `reefRockMat` (rockMat exported from 39_rocks.js), cracked and pitted; the model has a
  spreading, buttressed foot and ledged sides; `rubble` lumps (5 + 5 x radius) half sunk round each foot.
- `uReef` green channel: 1 under a head, falling to 0 at 3.3 radii. terrain_color.glsl paints reef rock, pink crust
  and coral rubble (pebble()) there, breaking up into sand.
- Still: the heads' sides show streaks (vertex colours stretched by the flare); the floor rock is low in contrast once
  tinted; lobed corals read pale blue-white at 2 m+.

## Build 68 - props removed; a castaway's camp instead

Ryan: remove most of the props, anything left "very primitive"; the aim is eventually a survival game in the vein of
The Long Dark and Green Hell.
- Gone: the pier (46_pier.js deleted; its posts were spray OBSTACLES), hut, moored boat and ropes, the sailing boat,
  crates, deck chair, lantern and the rest of the old 50_props.js. The player no longer stands on a pier deck
  (60_player.js); the "Pier" caption is gone and "The Hut" is now "Shelter".
- New 50_props.js, one vertex-coloured mesh: a lean-to (two forked posts, ridge pole, seven rafters, three layers of
  palm fronds), a bed of dry fronds, a fishing spear, five coconuts, two driftwood logs by the fire, a firewood stack,
  nine driftwood logs along the beach. `pole()` and `frond()` build everything.
- Kept: the campfire and its stone ring, the footpaths, PIER_X/PIER_Z0/PIER_LEN (the first fish school and the reef's
  clear patch still use that spot).
- Speed: reef carpet 2.6 per m2 (was 3.5), 900 slope corals (1200), lobed mound 20 x 10 near, simpler shapes from
  15 / 10 / 11 m (mound / bush / knob). Inland view 508k triangles (521k).

## Build 69 - a ten-minute day, weather that changes, the camp taken out

Ryan: a ten-minute day/night cycle; weather cycling through clear (no clouds), slightly cloudy and cloudy (the look so
far) at a pace that looks natural but suits the day's speed (rain and storms later); take the props out of the scene
for now - the player will make or mend them.
- 34_sky.js: `dayPhase` 0..1 (0 midnight, 0.5 noon), `DAY_LENGTH` 600 s by the real clock (F.rawDt), sun height
  0.28+0.44*cos(2pi(phase-0.5)): up about 6.4 minutes. Mornings the sun is on the other side of its noon bearing
  (az 0.35 + 1.25(1-d) instead of minus) - so there is a sunrise. Starts at 0.40 (mid-morning). The corner button shows
  night / dawn / morning / day / golden / sunset and, pressed, hurries the day on to the next of dawn, day, golden,
  sunset, night. Tests: `__lag.sun(e)` fixes the sun's height (afternoon side); `__lag.phase(p)` sets the phase;
  `__lag.dayState()`, `__lag.nextTime()`.
- Weather (23_clouds.js): `weather.now` 0..1 = `uWeather` in cloudfield.glsl. It raises the thresholds on the weather
  map (cumulus .36->.78, towers .60->.95) and fades cumulus and cirrus out entirely near 0, so clouds thin away or
  gather. `WEATHER` list: cloudy 140 s, few 110, clear 100, few 90, cloudy 170, few 110 (12 minutes, against a
  ten-minute day), easing at 1/55 per second. The JavaScript copy of the field uses it too. Tests: `window.__weather`.
- A second clear lane for the sunrise (`CLOUD_LANE2`, az 1.5).
- `CAMP=false` (00_config.js): the lean-to and driftwood (50_props.js), the campfire, its logs, light and stone ring,
  and the Campfire / Shelter captions are all left out; set true to bring them back.
- Not looked at: the cycle running on a real device (the software renderer manages under one frame a second).

## Build 70 - variable wind

Ryan: wind speed should drive the water's surface texture (not the swell), the clouds' speed and the vegetation's
sway. None: no cloud movement, water entirely glass, flat and very reflective. Low: lightly textured, slight cloud
movement. Mid: as now, clouds a little faster. High: choppier, faster clouds. Storm speeds later.
- 23_clouds.js: `wind.now` 0 / 0.33 / 0.66 / 1 = `uWind` (shared). `WIND` list: moderate 120 s, light 90, calm 70,
  light 80, moderate 100, fresh 100, moderate 80 (10.7 minutes), easing at 1/60 per second. Tests: `window.__wind`.
- Clouds now run on two clocks (`cloudNow.d` drift, `.e` boil) advanced by `cloudSpeed(w)` = 1.25 (w/0.66)^1.4 (0 in a
  calm, 0.47 light, 1.25 moderate, 2.2 fresh) and `cloudBoil(w)` = 0.35..1.3 (clouds still change shape slowly in a
  calm; they do not travel). Pictures remember the drift clock they were made for; the JavaScript copy of the field
  reads the clocks instead of a time.
- water.frag.glsl: ripple slopes x (w/0.66)^1.4 below the usual breeze and x (1 + 1.5 (w/0.66 - 1)) above it; slicks
  cover everything in a calm and thin out in a fresh breeze; the Fresnel cap goes in a calm (a true mirror); glitter
  scales with wind and a calm mirrors the sun whole. The swell shading and the wave model are untouched.
- Caustics (terrain_color.glsl, seatint.glsl) x smoothstep(0, 0.45, uWind): no ripples, no net of light.
- Palms and grass sway x uWind x 1.5 (as before at 0.66).

## Build 71 - the corner button opens a menu

Ryan: make the top button an openable menu for quickly trying all the weather; move the wave-sound setting into it.
- New 75_menu.js + styles in index.html: `#menu` under the corner button with rows time (auto / dawn / day / golden /
  sunset / night), sky (auto / clear / few clouds / cloudy), wind (auto / none / light / moderate / fresh) and sound
  (the old `#snd` button, moved in). The corner button still shows the time's name; a tap opens or closes the menu
  (the long press for the debug panel is unchanged).
- A chosen time is hurried to and held (`dayHold`); `weather.fixed` / `wind.fixed` override their lists and are
  reached in about 8 s / 4 s. "auto" hands each back to its cycle.
- Checked in a 390 x 760 window by pressing sunset + clear + none: all three took effect.

## Build 72 - wind: "high", faster clouds, more chop

Ryan: rename fresh to high; high wind should roughen the water more and move clouds a little faster; moderate also a
little faster; wind should affect how fast clouds change shape.
- `cloudSpeed(w)` = 1.6 (w/0.66)^1.5: 0 / 0.57 / 1.6 / 3.0 (x 20 km/h). `cloudBoil(w)` = 0.25 + 0.75 (w/0.66)^1.6:
  0.25 / 0.5 / 1 / 1.7 - it already followed the wind, weakly; now plainly.
- water.frag.glsl: above the usual breeze the ripple slopes grow x (1 + 2.6 (w/0.66 - 1)) (2.3 at high, was 1.8);
  ruffled water mirrors still bluer sky; `wcap`: clustered flecks of foam on open water deeper than 1.2-3 m when
  uWind > 0.8 (a quarter as many in the lagoon).
- Menu: "fresh" is now "high".

## Build 73 - clouds faster again

Ryan: "Still faster cloud movement at low med and high".
- `cloudSpeed(w)` = 2.6 (w/0.66)^1.3: 0 / 1.06 / 2.6 / 4.5 (x 20 km/h; was 0 / 0.57 / 1.6 / 3.0).
- Above 3.5x the sky picture is redrawn two slices a frame, not one: each picture is shifted by the drift since it was
  made, exact only at 1.2 km up, so tall cloud tops overhead would otherwise slide and snap between redraws.
- Not seen in motion.

## Build 74 - clouds a little faster; high wind rougher, with whitecaps

- `cloudSpeed(w)` = 3.25 (w/0.66)^1.3: 0 / 1.3 / 3.25 / 5.6 (x 20 km/h). Sky redraw: 3 slices a frame above 4.6x, 2 above 3.6x.
- Water at high wind: ripple slopes x 2.85 (was 2.3); `wcap` starts at uWind 0.74, lower thresholds, opacity 0.85,
  40% as many in the lagoon (was 25%).

## Build 75 - white horses

Ryan: whitecaps at high wind "need to be larger, visible in deep ocean and possibly deeper part of lagoon though would
be smaller and less noticeable in the lagoon ... think cresting waves/chop with sea foam that is briefly there and then
fades" (+ a photo of a windy sea: white crest streaks out to the horizon, lacy foam behind the nearer crests).
- Build 74's `wcap` flecks are gone. water.frag.glsl `horse()`: one family of wind crests (lam apart, speed c). Two
  families, 28 degrees either side of the wind (14 m at 4 m/s, 10.5 m at 3.5 m/s), bent by the 14 m, 37 m and 250 m
  readings of the detail texture. A crest breaks only along stretches (noise over crest number + time x 0.6, and
  distance along the crest x 0.075; threshold `thr` 0.75 -> 0.59 as uWind goes 0.74 -> 1).
- Returns two things. x = foam lying on the water (`wD`): a white band under a metre deep at the crest, then foam whose
  density falls 0.56 -> 0.36 with age (time since the crest passed = q lam / c), gone before the next crest. It is
  looked up as the crest was when it stood at that spot, so the foam stays where it was laid while the crest runs on.
  Drawn through the existing foam code (density -> lace threshold), with a wind-stretched reading of the detail
  texture so that it thins in streaks; fades out where a pixel covers more than 1.5-5 m of sea.
- y = the crest standing up (`wS`): flat foam is invisible from a low eye beyond ~100 m (a pixel covers tens of metres
  of sea), a real whitecap shows because it stands 0.5 m proud. So: a crest of height 0.6 m (0.2 m lagoon) between the
  place and the eye hides `rise` = height x distance / eye height metres of water behind it; those pixels are white
  if the stretch of crest in the line of sight is breaking. Far off only every 2nd, 4th... crest is drawn (S, from
  the screen-space derivative of the crest count - dFdx/dFdy of vW.xz, material `extensions.derivatives`), odd ones
  fading out; sub-pixel crests are drawn a pixel thick and fainter.
- Lagoon: everything a third the size, deeper water only (1.6-3.6 m), fewer, 70% as much foam.
- Costs up to 4 noise readings + 1 texture reading per water pixel, only when uWind > 0.74.
- Checked in stills 0.6 s apart: crests advance, the foam behind stays and thins. Not seen in motion.
- Mistakes on the way: flat foam only (invisible from the beach); solid white shapes (density too high for the lace
  threshold); an edge softening that erased every sub-pixel crest (it was a pixel wide, as wide as the crest).

## Build 76 - chop on the reef flat; small waves breaking on the lagoon's beaches (high wind)

Ryan: "At high wind could there be chop in the area between the shore and crashing waves (lesser tho similar to as in
lagoon)" and "in the lagoon side could there be small waves/chop crashing on beach at high wind?"
- Reef flat: the white horses now have three zones (water.frag.glsl `shel`, `wcK`): open sea (sg > 50-66 m offshore,
  deeper than 1-2.6 m), lagoon (deeper than 1.6-3.6 m), and the reef flat inside the breakers (sg < 26-38 m, deeper
  than 0.5-1.1 m - the flat is 1.15-1.7 m deep). None among the breakers (sg 38-50), which also hides the jump in
  scale. Sheltered water: a third the size, crest 0.2 m (lagoon) / 0.15 m (flat), threshold +0.06 / +0.09, foam x0.7 /
  x0.6, crest band 2.5x deeper so the small ones are not hairlines.
- Lagoon shore break: new chunk lagwave.glsl, included by water.frag and terrain_pre, so the water and the sand agree:
  `WIND_DIR` (filled by 30_terrain.js), `lagExposure(p)` (0 below uWind 0.74; 0.2 in the lee .. 1 where the wind blows
  onshore; 0.6 round the sandbank), `lagWave(p,d,t)` -> seconds since a crest passed this depth, size of that wave and
  of the next (waves come every 2.1 s, in stretches a few metres long, at a slant from the wind's side; crests follow
  the depth and slow as it shallows, tau = 4.56 (sqrt(d+.04)-.2)), `lagFoam(u,size)`.
- water.frag.glsl: faint darker face and light back on each crest between 0.14 and 1.5 m of water; white from where it
  breaks (depth 0.1 + 0.26 size) - but nothing in the last 10-20 cm of depth.
- terrain_color.glsl: draws that last hand's depth and the sand: `lap` (the film's edge) becomes the sheet running up
  (up to 0.2 m x size x a static along-beach factor, peak at 0.3 of the cycle, then back, drawn down a little before
  the next), foam on it only as far as the sheet's edge has climbed (`reach`), foaming rim while it advances, milky
  sheet, wet sand as high as the waves reach.
- Why the split: the ground is triangles, the water shader knows only the formula for the ground. Anything it drew
  within a hand's depth of the edge was cut off along straight triangle edges (pale wedges, ruler lines).
- Other mistakes on the way: foam density too low for the lace threshold (nothing showed); foam flashing across the
  whole film the moment a wave "arrived" (hard line across the beach) - fixed by `reach`; sqrt(d) made a crest stall
  at the edge.
- Checked in stills 0.35 s apart along the home lagoon beach (z = 93.65 at x = 5). Not seen in motion.

## Build 77 - lagoon shore waves: build 76's look moves to medium wind; in a high wind they have real height

Ryan: "what we have now at high wind could it actually be for medium speed and then at high we would want some actual
visible height to them and more varied/significant".
- lagwave.glsl: `lagExposure` = lagEx(p) x (smoothstep(.4,.66,uWind) + 1.3 lagHi()), lagHi = smoothstep(.7,1,uWind):
  nothing in a light air, build 76's waves at medium, 2.3 times the size at high. At high the waves also come in sets
  (size x 0.4..1.5 by wave number). Run-up on the sand (terrain_color.glsl) now approaches a ceiling of 0.42 m.
- Real height: a new mesh, the shore-wave band (38_water.js `bandPieces`: 29 pieces, 43k triangles; position is the
  only attribute): along the lagoon's own shore (698 m) and round the sandbank, from 2.5 m up the beach to 13.3 m out,
  rows 0.4 m apart inshore and 0.7 m further out, columns 1.3 m. Its own vertex shader, lagband.vert.glsl (so that
  water.vert.glsl is untouched; same DEVICE_NOTES rules, height limited to -0.5..1.2 m, x and z never moved): height =
  crest shape of lagWave's two waves x shoaling x exposure, crests 15-30 cm at the home beach, ceiling 0.5 m; zero at
  the band's edges and beyond 110-145 m from the eye.
- water.frag.glsl: `uBand` (1 for the band's material), `uBandOn` (shared; 1 in a high wind above water). The flat far
  sea discards the band's area within 150 m of the eye when uBandOn, the band discards everything else. `eta` = the
  band's height: thick water there (alpha up to 0.28 + 0.5 on steep faces, which are green; backs mirror the sky).
  `sandD` is now the still-water depth, so the phase agrees with the vertex shader.
- terrain_color.glsl: `lwLight` - at high, bright bands on the sand under crests and dim ones under faces, to 1.4 m deep.
- The white horses' wind-stretched texture reading (dW) is now taken outside its branch (DEVICE_NOTES: a texture read
  inside an `if` can come from the wrong level of detail on some GPUs).
- Pieces are shown only in a high wind, in view, within 150 m (updateWater).
- Checked in stills. Not seen in motion, and the new vertex shader has never run on the phone.

## Build 78 - the ocean beach's shore break stands up

Ryan: "could the shore breaking waves (breaking on the sand) on the ocean side get a bit more height and structure in
general (at all wind speeds)".
- Before: what was left of a wave after the reef crossed the flat as a bore 0.1-0.17 m high (Hp = .05 + .12 Hb) and
  was capped at .55 x depth + .03 near the beach, so it reached the sand as a low hump.
- waves.glsl `trn` (and waveH in 36_waves.js): `sho` = 1 - smoothstep(.35,1.3, depth at this spot of the beach).
  Hp x (1 + 2.2 sho), cap .66 x depth + .04: the wave stands up to 0.25-0.45 m between 1.3 and about 0.6 m of water
  (3-7 m from the edge) and then the cap brings it down - it breaks on the sand. HpS (which sets the draw-down between
  crests) only x (1 + .8 sho): with the full factor the sea stood 0.2 m low all along the beach.
- Shape there: front 0.5 m deep instead of 1.4 m (fw x (1 - .6 sho)), back falls away twice as fast, and the crest
  leans shorewards (push + .9 H Cb sho, switched off below 0.5-0.75 m of depth so that `act` stays 0 where waveF lays
  the swash sheet - the JavaScript copy knows nothing of the push). Foam returns from 0.85 m of depth in (was 0.6).
- water.frag.glsl: the steep-face colour is lighter where the water is under about 1.9 m deep (the dark wall colour
  is for the reef's breakers).
- Run-up (`runup`) is unchanged. Wave mirror check: worst 0.002 m.
- Compared in stills with build 77 at the same moments (t = 33.8-36.3 at x = 5, ocean shore z = 167.8). Not seen in
  motion.
