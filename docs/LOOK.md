# The look

What the island should look like, what Ryan has approved, and what was tried and rejected. The reference
photographs are not in the repository (most are other people's); each group is described here instead. If
`reference-photos/` exists on this machine, look there first.

## Standing rules

- **Match the reference.** When Ryan sends a photo, the scene is compared with it and worked on until it matches.
- **Nothing regular.** No grids, rows, rings or repeats. A pattern made of cells needs random size, shape, angle
  and gaps, in more than one layer. Never colour by a cell alone; shape the thing inside it.
- **No hard bands and no drawn lines**, above all at the water's edge. A line that follows a height reads as a
  contour line. Edges are broken along their length and in time.
- **Painted things read as flat.** Rocks, rubble, coral and bushes have to be real shapes.
- **Subtle before loud.** Mist was "a bit much". Wet-sand darkening beyond a few per cent reads as a stripe.
- **Smaller and quieter in sheltered water.** The lagoon and the reef flat get the open sea's effects at a third
  of the size and with less foam.
- **Colour is checked against the photos.** The reef went too green, then orange, then pink, then "slightly too
  yellow" before it was right. Ryan, 19 November 2026, of the whole scene: "a lot of our colors feel a bit too
  busy? Or maybe over saturated? (including the water)". So each material's colour is to be measured in the
  photos and in our pictures, side by side.
- **Things move the way they point.** Fish once slid sideways and swam backwards; heading now comes from motion.

## Colour, measured (photos)

Ryan, 19 November 2026: "a lot of our colors feel a bit too busy? Or maybe over saturated? (including the
water)". His phone shows Adaptive colour, and he wants the scene to look right on most screens. So colour is no
longer judged by eye alone: parts of the reference photos and the same parts of our pictures are measured and
laid side by side. A photo's numbers are the same on every screen, and a screen that deepens colours deepens
the photos as it does ours.

**How.** With the tools in `tools/look/` (their `README.md` says how to run a pass). A part of a picture holding
one material is averaged (its darkest and brightest fifths left out) and given in OKLCH, in which equal steps
look equal: lightness 0 to 1, saturation (chroma: 0 is grey, 0.1 a clear colour, 0.2 a loud one) and hue in
degrees (30 red, 70 orange, 110 yellow-green, 140 green, 200 turquoise, 250 blue, 300 violet). Several photos
from different cameras are averaged for each material, since any one photo's exposure and white balance are its
own.

**What the photos measure, and where ours stood** before and after the first sitting of "The look, against
references" (`ROADMAP.md`). The last two columns are our saturation as a multiple of the photos'. (The four
rows of the ground, from low plants to litter, are before and after the third sitting, when the ground was
redrawn: `tools/look/boards/ground.json`.)

| Material | Photos | Lightness | Saturation | Hue | Ours before | Ours after |
|---|---|---|---|---|---|---|
| Sky, high up, midday | 12 | 0.66 | 0.107 | 250 | 1.4 | 1.0 |
| Sky at the horizon | 6 | 0.74 | 0.094 | 247 | 1.0 | 1.0 |
| Sea over the reef, far | 4 | 0.68 | 0.083 | 247 | 1.5 | 1.1 |
| Deep ocean | 5 | 0.44 | 0.094 | 260 | 1.5 | 1.1 |
| Lagoon, deep | 5 | 0.57 | 0.081 | 231 | 1.7 | 1.2 |
| Shallow water over sand | 13 | 0.66 | 0.074 | 210 | 1.3 | 1.1 |
| Shallows from the air | 4 | 0.71 | 0.099 | 211 | 1.0 | 0.9 |
| Coral sand in sun | 6 | 0.86 | 0.008 | 116 | 2.0 | 1.6 |
| The same sand in a palm's shade | 5 | 0.63 | 0.009 | 194 | 3.0 | 1.8 |
| Palm crowns in sun | 8 | 0.45 | 0.047 | 146 | 2.3 | 1.3 |
| Shrubs and trees in sun | 6 | 0.42 | 0.076 | 127 | 1.6 | 1.2 |
| Low plants on sand (creepers, herbs) | 4 | 0.47 | 0.065 | 124 | 1.4 | 1.2 |
| The floor of a coconut grove in sun | 7 | 0.54 | 0.019 | 90 | 3.2 | 0.9 |
| Coral gravel in sun | 4 | 0.65 | 0.005 | 79 | 8.4 | 2.8 |
| Litter under the trees | 3 | 0.54 | 0.050 | 106 | 1.5 | 0.7 |
| Sunset: the sky low, towards the sun | 5 | 0.72 | 0.064 | 67 | 2.0 | 1.3 |
| Sunset: the sky high | 4 | 0.50 | 0.037 | 247 | 1.9 | 0.9 |
| Sunset: the water | 6 | 0.45 | 0.023 | 141 | 2.0 | 2.0 |
| Lobed and massive corals | 6 | 0.40 | 0.051 | 114 | 0.4 | 1.1 |
| Brain corals | 2 | 0.48 | 0.057 | 83 | | |
| Table corals | 3 | 0.58 | 0.056 | 82 | 1.0 | 1.0 |
| Old reef rock under turf algae | 4 | 0.58 | 0.037 | 81 | | |

Read with these in mind:

- **Ours was one and a half to twice as saturated as the photos** in the sky, the sea, the lagoon and every
  plant. That is what "over saturated" was, and it is what Adaptive colour then deepened again.
- **Hue was wrong in three places:** the lagoon and the shallows too blue by 13 to 16 degrees (cobalt for teal);
  the sunset's sky high up a mauve (355) where the photos have blue-grey (247), and its water violet (289); the
  sand's shade a blue.
- **Lightness was wrong in two:** the corals, pastels at 0.76 and 0.84 where the photos have earth colours at
  0.40 to 0.58 (they are at 0.55 and 0.66 now, seen through water); and shade on sand, 0.42 where the photos
  have 0.63, two thirds as light as the sand in the sun beside it (0.58 now).
- **Sand has next to no colour** (0.008): it is white, a touch warm. The sunset's water has little (0.023), and
  what it has is as often a grey or a dark teal as anything: in our last column it is a slate blue, which two of
  the six photos are.
- **"Busy", measured:** how far the dots of one patch stray from the patch's own average. In lightness ours
  strays no further than the photos do, for water near and far, palm crowns and shrubs. In colour it strayed
  further in one material: dry sand, whose hollows were shaded blue (clean sand in the photos is all of one
  colour: 0.002 to 0.003, against our 0.02).
- **After the first sitting Ryan found the whole "perhaps slightly too pale".** The sky and the water were the
  two that measured lighter than the photos: the sky is now at their lightness, and the water's own colours a
  notch deeper and richer (`ROADMAP.md`, "The second sitting"). The table's last column is as the first sitting
  left it.
- **The numbers are to steer by, not to hit.** A photo's exposure is its own (the same white sand measures 0.66
  to 0.92 in seven photos), and a patch of ours is never quite the same thing as a patch of theirs. A material
  within a fifth of the photos' saturation and ten degrees of their hue has been left alone.

## The atoll from the air

*References:* an oval ring of green land round a turquoise lagoon in deep blue sea; a long sand spit beside a reef
flat; a reef edge where pale shallows turn turquoise and then drop abruptly to deep blue.

*In the scene:* a horseshoe of land, thick in the south and tapering to two horns, open to the north through a
pass that is mostly closed by a low sandbar with one channel. A sandbank with palms sits in the lagoon. Water
colour goes by depth: pale aqua over sand, turquoise, then abrupt deep blue beyond the reef.

## The sea

*References:* surf breaking in lines on a reef; a hollow wave throwing its lip in front of palms; a windy deep-blue
sea covered in whitecaps to the horizon, with lacy foam trailing the nearer crests; clear shallows over rippled
white sand under a net of light.

*Approved:*
- Swell lines beyond the reef, with variation in period and height ("Beautiful").
- Wind patches: gusts roughen and darken the water, slicks between them are glassy.
- Whitecaps in a high wind: a crest turns white, runs, and leaves foam that breaks into lace and is gone in about
  three seconds. Bright streaks and lacy patches close to, white dashes out to the horizon.
- The ocean beach's shore break stands up shin to knee high and breaks on the sand (build 78).

*Rejected:* whitecaps as small flecks; foam as solid white shapes; anything pale and translucent lying on the
water like a decal; hairline crests.

## Water at real atolls (photos)

*References,* in `reference-photos/atoll-water/`: eleven photos from Wikimedia Commons (`SOURCES.md` there lists
them and their licences), gathered on 17 November 2026 for the water's colour. What they show:

- **From the air** (`aitutaki-from-top`, `maina-island`): the lagoon is pale aqua over sand flats, a saturated
  turquoise where it deepens to a few metres, and deep blue at once beyond the reef's white line of surf. The
  edges between sand flat and deeper basin are sharp.
- **From the water's level** (`aitutaki-lagune`, `rangiroa-lagoon`, `fakarava-blue-lagoon`,
  `fakarava-lagon-vert`): close by, the floor shows through nearly clear water, coral as dark patches; further
  off the water keeps its aqua for a long way over bright sand; furthest it mirrors the sky. Over dark coral the
  same water is deep blue.
- **At the beach** (`lagoon-swim`): a few centimetres of water has no colour of its own.
- **The reef from outside** (`reef-outside-aitutaki`): the reef flat is red-brown under thin water, the surf is
  white lines with pale milky water between, and outside it a narrow turquoise band goes quickly to deep blue.
- **A wave's face** (`teahupoo1`, `vague-de-teahupoo`): there is no edge between the flat water ahead and the
  face. The flat water is pale, mirroring the sky; as the surface tilts up towards the eye it mirrors less and
  shows more of the water, a deep clear blue low on the face; towards the top, where the wave is thin and the
  light comes through it, it brightens to cyan. Fine lines run up the face along its curve. The lip is a
  translucent sheet that whitens as it falls.

## The water's surface (photos)

*References,* in `reference-photos/water-surface/`: five photos Ryan sent on 17 November 2026, with two
screenshots of ours. He asked that the water feel "real", and less like "a thin pane of glass/ice", while still
being seen through. What they show:

- **Calm water over reef rock** (`calm-water-over-reef-rock`; "best ref for calmer water"): near the eye the
  floor shows clear, under a bold net of light whose lines are bright and broad in some places and faint in
  others. A few metres out the surface begins to show: streaks of the sky's blue lie on it, more and more of
  them with distance, drawn out level by the view. Far off it is all a deep blue, deeper than the sky above the
  horizon, and never the pale of the sky's foot.
- **Clear shallows under palms** (`clear-shallows-under-palms`): the same, with the wind on it: where the water
  is ruffled it is a band of dark blue, and between the bands it is clear to the sand.
- **A shore break from above** (`shore-break-from-above`): foam is lace, with the water showing through it
  everywhere but along the breaking line; its edge on the sand is scalloped; the water behind it is clouded.
- **A shore break's face** (`shore-break-green-face`): a wave that stands in shallow water is green and cannot
  be seen through; sand is stirred into its foot.
- **A reef flat and its drop-off from above** (`reef-flat-to-drop-off-from-above`): pale over the flat, a
  glowing turquoise where it deepens, deep blue beyond, the one running into the next over some metres.

*Rejected:* a coral head showing through the water beside where it stands; the sky showing through clear water;
a sheet of foam with pools of blue-grey in it, which reads as snow.

## Water in weather (photos)

*References,* in `reference-photos/water-weather/`: 27 photos from Wikimedia Commons (`SOURCES.md` there lists
them and their licences), gathered on 18 November 2026 for how clear tropical water looks from a person's
height in different wind and light. What they show:

- **Calm and clear, near the eye** (`kaimbu-lagoon-calm-turquoise`, `bahamas-clear-shallows-ripples`,
  `heron-island-clear-ripples-floor`): the net of light is long flowing lines that branch and join, bright in
  places and faint in others, never a net of even cells; the floor between them is a little darker. Small
  ripples each carry a streak of sky.
- **A breeze on it** (`heron-island-ruffled-turquoise-glint`, `lagoon-ruffled-blue-motu`,
  `miyako-reef-flat-from-cliff`): ruffled all over, from the eye to the horizon: near, the floor shows green
  through crossing ripples; at mid distance blue streaks of sky and windows of green lie mixed; far off it is a
  dark, finely ruffled blue. Over deep water it is dark blue chop in rows.
- **Under cloud** (`mayotte-overcast-turquoise-bay`, `tarawa-lagoon-overcast-shallows`,
  `gili-meno-storm-over-turquoise`, `cocos-keeling-stormy-sky-turquoise`): the shallows keep their turquoise
  under a dark sky, duller; the surface mirrors grey cloud as pale streaks; no net of light, no sparkle.
- **Low sun** (`maldives-sunset-lagoon-glitter`, `heron-island-sunset-sun-glitter`,
  `maldives-dusk-jetty-calm-lagoon`, `cocos-keeling-morning-calm-reflection`): calm water is a pale mirror of
  the sky with a bright path of glitter under the sun; ruffled sea at sunset is dark navy under an orange sky,
  with faint lighter flecks; at dusk a calm lagoon is pale teal and glassy.
- **The water's edge** (`heron-island-foam-lace-sand`, `heron-island-thin-sheet-wet-sand`,
  `seychelles-beach-lapping-waves`): a thin clear sheet slides over the sand with a lace edge; the foam lines of
  small waves are thin and broken; the sand under the sheet shows its own ripple marks.

No photo was found of cloud shadows lying on a lagoon, nor of rain on the water.

## Waves breaking (videos)

*References,* in `reference-photos/waves/`, each named by its YouTube id; Ryan's words on what each is for.
`docs/ROADMAP.md` has what was measured from them.

- `3jOXW2jrrn0` A drone over Pipeline's reef (96 s). Top-down views, at a slight angle, of waves breaking over a
  real reef in a little wind; also how a reef looks from above, through the water.
- `I0jNG4Ihk8o` A surf film (23 min). Many front-on and angled shots of waves breaking, with surfers for scale.
- `rFgV7EpyxAw` Under water (16 s). How a reef looks under water, and a wave from below.
- `652zUeqI7_E` Waves breaking towards a beach, with surfers and waders for scale (3 min); 0:52 to 1:02 is a good
  stretch: white water spreading over a shallow flat, several lines of break behind.
- `Gd1ZKedLwKE` A cove from the shore on a very windy night (12 hours, a still camera).
- `7bHltyWh_Qc` A reef in Australia from a still vantage point (2 hours). How many breaks there often are, and
  how far a reef can reach.
- `irBF_I8g7y8` Softer, crumbling waves head on (0:10 to 0:40). Not every wave has a lip and crashes: we want
  some of both.
- `y9MEmtDdhB4` A wave breaking on a beach, head on, in a very high wind (19 s).

## The lagoon shore

*References:* a lagoon with sand islets from the air; a gentle shore where clear water thins to nothing over
white sand; a leaning palm over the water's edge.

*Approved:* no surf. A film of water laps a hand's breadth up the sand and slides back. From a medium wind small
waves come in every couple of seconds, in stretches a few metres long and at a slant, break a step or two out and
run up as a foamy sheet with an uneven edge. In a high wind they have real height and come in sets.

*Rejected:* a white edge line that looked detached from the water; any straight or hard-edged shape at the
waterline.

## Reef and sea floor

*References:* coral gardens under water (branching, brain and table corals in tan, purple and pink); a reef flat
seen through clear water as brown and olive patches; coral heads rising from sand.

*Approved:* flat-topped coral heads with rocky, buttressed feet that run into a rocky apron on the floor; corals of
several kinds on top; clams; reef fish in small parties that spread through the lagoon; short sea-grass beds.
Ryan plans more reef passes later.

*Rejected:* kelp (replaced by short sea grass); bare platform tops; heads that sat on the sand without blending in;
heads as platforms of cracked rock; one lacy mottle on every kind of coral; a table coral as a flat many-sided
disc; coral 56 degrees too green from under water;
the old-reef ground round a head ending in a straight line at the waterline where the head stands near the beach
("weird/hard cutoff", 19 November 2026).

*Still weak (Ryan, 19 November 2026):* "the coral and other under water textures need refining".

*Now (20 November 2026, for Ryan to judge):* a head is one great boulder coral, its sides alive and lobed and
its flat top dead rock; each kind of coral has its own surface close to (a brain coral's grooves, a boulder
coral's skin, warts); tables are thin uneven plates with pale rims; the sand of a shallow floor is rippled;
rubble is the gravel's picture (`ROADMAP.md`, "The fourth sitting").

*References for it,* in `reference-photos/coral/`: 28 photos from Wikimedia Commons, gathered the same day
(`SOURCES.md` there), all but one in natural light, most from Rose Atoll, Kingman Reef, French Frigate Shoals,
American Samoa, the Maldives, Réunion and the Torres Strait. What they show:

- *Colour.* Corals in daylight are earth colours: mustard, khaki, olive, tan, brown, a dusty pink, a grey-blue
  staghorn. None is a pastel, and none is as light as sand (the table above). Tips of branches and rims of
  tables are paler. The colours first given from these are in `world/reef/reef-config.ts`.
- *Surface.* A lobed coral (`porites-lobata-surface-close-hawaii`) is lumps a hand across under a fine even
  grain of polyps; a brain coral (`leptoria-brain-coral-grooves-reunion`) is close winding grooves, pale ridge
  and dark valley; a table (`table-acropora-hyacinthus-surface-maldives`) is a carpet of short upright twigs.
  Ours are smooth.
- *Whole heads* (`porites-lutea-head-on-sand-reunion`, `massive-coral-heads-on-sand-tau-american-samoa`,
  `lagoon-coral-head-porites-pocillopora-french-frigate-shoals`): a head is one or two great domes, or a rock
  crowded with a few kinds, standing straight out of clean sand. Ours are piles of balls.
- *The floor.* Old reef and rubble are grey-brown under a fuzz of turf algae
  (`pocillopora-verrucosa-on-rubble-maldives`); crusting pink algae is a dusty salmon
  (`coralline-algae-encrusted-coral-rose-atoll`); sea grass is sparse green blades on grey-white sand
  (`seagrass-thalassia-sand-floor-vanuatu`).

*More,* gathered 20 November 2026 (nine, in the same folder): four boulder corals seen whole from the side,
khaki domes of close-packed lumps standing on sand or rubble, one with a diver for scale, two to three metres
high (`porites-lobata-dome-on-sand-side-reunion`, `porites-lobata-big-round-head-with-diver-guam`,
`porites-domes-field-american-samoa`); a mushroom-shaped bommie on white sand; patch reefs from the air and
from a boat, round and dark in a pale lagoon (`fakarava-lagoon-patch-reefs-from-air`); ripples in lagoon sand
seen from a drone (`maldives-meeru-rippled-lagoon-sand-from-drone`). Not found: coral rubble under water;
sand ripples from under water.

Not found: ripple marks on a sand floor; a microatoll at a useful size.

## Under water

*References,* in `reference-photos/under-water/`: 21 photos from Wikimedia Commons, gathered 19 November 2026 for
the second sitting (`SOURCES.md` there lists each with its licence, depth, light and colours). All but three are
in plain natural light, which matters: a flash puts back the red that water takes away. What they are for:

- *How colour goes with distance* (`palmyra-snorkeler-over-table-coral-shallows`,
  `palmyra-coral-field-fading-to-blue-green`, `kingman-reef-natural-light-red-gone`): at 2 to 4 m, tan coral is
  cyan-green by 10 m and plain turquoise by 20; deeper, khaki goes to blue-green with no red anywhere.
- *The surface from below* (`moorea-shark-mirrored-in-surface-from-below`, `red-sea-reef-looking-up-at-surface`,
  `bahamas-sun-through-surface-from-depth-bubble-ring`, `eilat-sun-through-surface-blue-gradient`): a window of
  bright sky overhead, and outside it a dark mirror of the floor; the sun a blurred white spot in a pale glow.
- *Shafts of light* (`red-sea-sun-rays-in-open-blue-water`, the only clear one): slanting, soft-edged, fading
  downwards.
- *The net of light* (three from Kona): coarse and bright on sand, lying across rubble, coral and fish alike.
- *Half above, half below* (two from Moorea), one of them under heavy cloud.

Not found: white water under a breaking wave from below; dusk; a level view across bare lagoon sand.

*More,* in `reference-photos/under-surface/`: 23 photos from Wikimedia Commons, gathered 20 November 2026 after
Ryan's notes on the second sitting (`SOURCES.md` there), for three things:

- *Shafts of light* (8). Looking up towards the sun there is a burst of very many fine streaks all round it
  (`rays-sun-through-ripples-looking-up-bondi`, `rays-fine-fan-all-round-sun-brittany`,
  `rays-sun-starburst-open-blue-mediterranean`), only a little brighter than the water, and the sun itself a
  white dazzle. With the sun to one side there are a few broad, soft, slanting bands that fade halfway to the
  floor (`rays-slanting-shafts-sun-to-side-over-reef`). Over white sand they fade well above the floor
  (`rays-faint-shafts-over-white-sand-bahamas`).
- *The surface as a mirror* (8). Calm, it doubles the reef almost perfectly, with a band of far blue water
  between the thing and its image (`mirror-calm-surface-over-reef-flat-red-sea`). Ruffled, the image breaks into
  long fine streaks, dark and bright side by side (`mirror-rippled-surface-reflecting-reef-red-sea`,
  `mirror-ruffled-surface-green-reflection-red-sea`): that is what looks like metal. Over shallow sand it
  mirrors the sand (`mirror-surface-reflecting-sand-shallows-aqaba`). Straight up, the window of sky has a sharp
  edge made wavy by the ripples, and outside it the surface is dark
  (`mirror-snells-window-edge-from-below-barbados`).
- *Waves from the water* (7, all toned as surf photographs are). Only one is from wholly under water
  (`wave-breaking-crest-from-below-bubbles`): the curl's underside a bright cyan sheet, a sharp white line at
  the lip, a ceiling of fine bubbles above and dark green water below. The others are from inside a barrel at
  the waterline: the wall goes from teal to a clear cyan at the lip, and white water is white.

Not found: a swell passing overhead; a plain cloud of white water driven down; rays reaching a sand floor.

Ryan, 19 November 2026: "we want beautiful and realistic underwater scenes as the player will spend decent amount
of time there", and that includes "how the surface looks from underwater".

*Rejected:* bubbles as rings circling the eye, and rays of light as stripes fixed to the screen ("tacky"); the
sun from below as ovals with a rim; glints all of one size in rows ("polka dots" again); rays as thin rods of
even brightness.

*Now (20 November 2026):* the water a bright turquoise over sand and a deeper blue over the reef, as the photos
measure it; things losing their colour with distance, red first, until at twenty-five metres there is only the
water; sand under water pale under its net of light; fine specks hanging in the water. Ryan, of that: "This is
great", with the surface to be "a bit more metallic maybe" and the rays "a bit more realistic". Since then: the
surface a window of sky broken into white pieces by the sun, with a crisp edge, and beyond it a dark mirror of
the floor with bright glints on it; a burst of fine rays about the sun and broad soft shafts from the side; foam
a pale ceiling from below, and a cloud of bubbles driven down where a wave breaks (`ROADMAP.md`, "The second
sitting" and "after Ryan's notes", has the figures and what is left).

## Sand and beach

*References:* white coral sand with rubble, shells and a line of wrack; footprints and hollows; palm shade on
sand; dark boulders and pale jagged limestone at the water's edge; a beach hut under palms.

*Approved:* clean, near-white sand in zones by height, each boundary wandering; dimples and wind ripples in dry
sand; a narrow wet strip; scattered shells and pebbles; real rocks of five kinds placed in groups.

*References (photos),* in `reference-photos/ground-and-shore/`: 26 photos from Wikimedia Commons, gathered 19
November 2026 (`SOURCES.md` there), nine of them from one islet of Majuro Atoll, the rest from Rangiroa, Midway,
Palmyra, Fakarava, Aitutaki, Diego Garcia, the Maldives and Heron Island. What they show:

- *Sand.* White, of one colour, marked by footprints in light and shade alone
  (`heron-island-coral-sand-beach-footprints`). A palm's shade on it is a soft grey two thirds as light as the
  sand beside it, never dark and never blue (`rangiroa-motu-palm-shade-on-white-sand`).
- *The ground under coconut palms* (`majuro-bikrin-coconut-sprout-on-gravel-floor`,
  `majuro-bikrin-coconut-grove-interior`, `rangiroa-coconut-grove-on-white-sand`): pale grey coral gravel and
  sand, strewn with brown husks, grey dead fronds and dry leaves; green comes from scattered herbs, seedlings
  and vines, not from a lawn. (Ours was turf until the third sitting.)
- *Where plants begin* (`midway-beach-morning-glory-runners-over-sand`, `midway-beach-top-plant-edge-midday`):
  creepers run out over white sand in loose patches from a wall of shrub; the sand between stays clean.
- *Rubble and reef flat* (`majuro-bikrin-reef-flat-low-tide-meets-beach`,
  `majuro-bikrin-coral-rubble-and-sand-close`): sand, then a band of grey rubble and cemented slabs, then the
  flat.

*More,* gathered 20 November 2026 for the third sitting (12, in the same folder and its `SOURCES.md`):

- *Grove floors from standing height* (five, from Kiribati, Fakarava and Cocos Keeling). Three kinds, all
  grey: pale coral gravel with a few nuts and a dead frond (`kiribati-coconut-grove-gravel-floor-fallen-nuts`);
  bare grey-white sand under leaning trunks (`fakarava-farakau-open-coconut-grove-on-sand`); and, where the
  palms stand thick and nobody clears it, a floor buried in grey-brown fronds
  (`cocos-keeling-direction-island-coconut-grove-floor`). Litter is grey-brown, not orange.
- *A track through palms* (`kiribati-sand-track-through-coconut-palms`,
  `cocos-keeling-west-island-sand-road-through-palms`): smooth pale sand, low green creepers along its edges.
- *From the air* (`diego-garcia-east-point-coconut-plantation-from-air`,
  `diego-garcia-west-island-islet-from-air`): canopy from beach to beach, the ground between the crowns a pale
  grey; a ring of rubble round a small islet.
- *Nuts and fronds close to* (three): weathered nuts are grey; dead leaflets are grey strips.

*Now (20 November 2026, for Ryan to judge):* the islet's ground is coral sand from shore to shore, with banks
of grey gravel, the trees' litter under their crowns and creepers running out from the shrubs, each a picture
of the real thing (`ROADMAP.md`, "The third sitting"; `DECISIONS.md` 20). The lawn is gone. Ryan, before it
was tried: "judge both what looks best and as well fits a real island".

*Rejected:* tide lines that read as contour lines; one pebble per cell ("polka dots"); rocks made of noise
("crumpled dark paper"); relief strong enough to read as dirt; ground cover as blotches of noise, and as lawn;
a scatter of grey stones on white sand (a leopard's coat: a lone stone is bleached pale).

## Plants

*References:* groves of tall coconut palms with leaning trunks; a dense belt of beach shrub under the palms;
broadleaf trees; patchy sun-bleached turf.

*Approved:* palms in four trunk shapes, a shrub hedge, scrub, broadleaf trees, screw pines, ground rosettes,
vines, fallen fronds and stumps. All sway with the wind.

*Rejected:* lawn-like grass; bushes that were faceted balls wrapped in a leaf picture ("circular"); fronds folded
so steeply that they read as bare ribs.

*Still weak:* short turf is sparse flat cut-outs; vine leaves are angular close to. (Far palms looked thinner
than near ones until 19 November 2026.) Ryan, the same day: "the ground textures/cover do not look great", to be
refined over a good number of passes against real references "for a more realistic and aesthetic look".

## Sky and light

*References:* towering white cumulus over the sea by day; a single cumulus lit orange and pink at dusk against
grey-blue; a pink band of sunset over a dark sea.

*Approved:* volumetric clouds that are soft, drift and change shape ("truly amazing"); cloud shadows crossing the
island and the water; clouds mirrored in the sea; golden hour and sunset light on the clouds.

*Rejected:* clouds that looked "far too solid"; cumulus that contrasted with the other clouds; noise lumps that
read as snowy mountains; perfect balls that read as bubbles.

*References (photos),* in `reference-photos/sky-and-colour/`: 31 photos from Wikimedia Commons, gathered 19
November 2026 (`SOURCES.md` there): eight plain midday scenes with sand, palms, sea and sky in one frame, from
seven cameras, which are what the table of colours rests on; palms and shrubs; lagoons from the air; the open
ocean; six sunsets; and six of the night (a full moon's disc, the moon rising at dusk, its path on the sea, the
Milky Way), most of them long exposures, which show the night brighter and more coloured than the eye has it.
What the sunsets show: gold and peach low down towards the sun, a grey-blue above, clouds the only thing that
goes pink or red; the sea a dark slate or grey with a narrow path of orange glitter. Not found: a coconut grove
from above; the clear sky from overhead down to the horizon in one frame; a moonlit palm beach at an ordinary
exposure.

*Still weak (Ryan, 19 November 2026):* the "sky box/stars/moon ... could use refinement for realism and
aesthetics".

*Night (19 November 2026):* a full moon that rises out of the sea in the east as the sun
sets, pale in the dusk with a path of glitter under it, crosses the sky at an even pace, stands high over the
sea from home at midnight and sets in the west at dawn; its disc as wide as the sun's, with grey seas and a
darker limb; its light cold and strong enough to walk by, with the palms' shadows on pale sand, long while it
is low; the sky's own light cold too, where the low sun's warm colours had been kept on through the night;
foam cold, not tan. Phases are to come (`sky-config.ts`, `moonBehindSun`).

*The night sky (20 November 2026, for Ryan to judge):* stars as points of every brightness, the brightest of
them the real ones in their places, turning about the pole through the night; the Milky Way a pale knotted
band split by its rift, bright towards Scorpius; the moon's face the real one's; the moonlit sky a deep blue
(`ROADMAP.md`, "The fourth sitting"). Nine more photographs were gathered for it, into the same folder: four
of the Milky Way (`faint-milky-way-and-stars-in-sky-glow` is the nearest to what the eye sees: a faint haze),
two star fields (`queenstown-southern-cross-star-field`: sparse, as the eye has them under a moon), the moon's
path on a dark sea twice (`andaman-moon-and-moon-path-on-dark-sea`: a slate sky, a small moon, a silver
path), and the full moon small and high over a dark sea. None is quite what the eye sees: a camera shows more
stars and more colour.

*Rejected:* stars as squares of one size; the Milky Way as a broad band of blue noise over half the sky; a
moon whose seas were noise; a moonlit sky that was black.

## Props

Removed for now. Anything that returns should look primitive: made by a castaway from what the island offers.
