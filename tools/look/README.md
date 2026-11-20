# Measuring the look

Tools for comparing our pictures with reference photographs by measurement, not by eye alone. `docs/LOOK.md`
("Colour, measured") says why, how a colour is measured and what the photographs measure; this says how to run
a pass. They were written for the first sitting of "The look, against references" (`docs/ROADMAP.md`).

They need the page built (`npm run build`), `ffmpeg` on the path (it reads the pictures), and the reference
photographs in `reference-photos/`, which each machine keeps for itself. They are run with `node`, as
`tools/assemble-site.ts` is. What they make goes wherever it is told: `node_modules/.cache/look/` is a good
place, since git ignores it and a run of the checks, which clears `review/`, leaves it alone.

## A pass

Draw our views from the working files, and once from the build the branch left `main` at, for a "before" (the
checks keep that build; its file is named for its commit):

```
node tools/look/draw-views.ts node_modules/.cache/look/now
```

```
node tools/look/draw-views.ts node_modules/.cache/look/before --page node_modules/.cache/reference-builds/<commit>.html
```

Measure the board, change a colour, build, draw and measure again:

```
node tools/look/colour-board.ts tools/look/boards/colours.json node_modules/.cache/look/colour-board.png --now node_modules/.cache/look/now --before node_modules/.cache/look/before
```

The views from under water are a group of their own, with a board of their own:

```
node tools/look/draw-views.ts node_modules/.cache/look/under-water --group underWater
```

```
node tools/look/colour-board.ts tools/look/boards/under-water.json node_modules/.cache/look/under-water-board.png --now node_modules/.cache/look/under-water
```

The ground has a group of views and a board too (`--group ground`, `boards/ground.json`): the floor of the
grove, gravel, litter and low plants. The corals and the reef's floor close to are the group `reef` (the
under-water board measures coral from them), and the night sky the group `nightSky`, which has no board: a
photograph of the night is never what the eye saw. The sea floor itself is the group `seaFloor`, from a
swimmer's eye in a dozen places of the lagoon and the ocean's reef and from straight above, with the board
`boards/sea-floor.json` (sand, rock under turf, coralline crust, rubble); it draws on the `reef` group and on
`under-down-at-sand` too. Two more groups have no board: `waterDepth`, how the water hides its floor with
depth (out over a pool, across the lagoon from a low eye, a coral head and the reef flat from above), and
`steepFloor`, the drop-off's face and the walls of the reef's pools.

## The pairs and the fly-round

Small pictures from poses chosen for them hid what Ryan found by flying about at full size. So a pass at the
water or at its floor ends with two sets drawn as large as he sees the game, and looked at so.

The pairs (`--group pairs`, `boards/pairs.json`): eight of our views, each beside the photograph it is matched
to, one sheet a pair:

```
node tools/look/draw-views.ts node_modules/.cache/look/pairs --group pairs --size 1600x900
```

```
node tools/look/pair-sheets.ts tools/look/boards/pairs.json node_modules/.cache/look/pairs node_modules/.cache/look/pair-sheets
```

The fly-round (`--group flyRound`): twelve spots from 5 to 40 m up, each at noon, at dusk and under cloud.
Look at them one at a time, with a part enlarged wherever something looks odd: a contact sheet of them is too
small to show a seam or a stepped edge.

```
node tools/look/draw-views.ts node_modules/.cache/look/fly-round --group flyRound --size 1600x900
```

A still cannot show one thing sliding over another: rocks once slid over the ground under the water, and no
picture here showed it. `--later 0.6` draws each view a second time, that many seconds on; lay the two side by
side, or take their difference (`ffmpeg ... blend=all_mode=difference`): what stands on the floor and the
floor's own markings must move together, and with the surface's bend set to nought for one build (`BENDS`,
`water.frag.glsl`) must not move at all.

The sand's ripples have a group of their own, `ripples`: straight down from 3 m in every quarter of the atoll,
and from 6 m at dusk. A fault in them shows only from above and enlarged, and best of all in their picture
drawn by itself, lit from one side and tiled, which is where to look first.

To move a colour of ours by a measured amount (here: seven tenths of its saturation, ten degrees towards green,
a little lighter), and get it back as the code writes it:

```
node tools/look/colour.ts move 0.07 0.36 0.84 0.05 0.7 -10
```

To see whether a material is busier than the photographs have it:

```
node tools/look/busyness.ts tools/look/boards/busyness.json --now node_modules/.cache/look/now
```

To add a material to a board, or a photograph to a material, lay the pictures under a grid and read off the
squares that hold the material and nothing else:

```
node tools/look/contact-sheet.ts node_modules/.cache/look/sheet.png reference-photos/coral/*.jpg --across 4 --cell 470
```

Two things to mind. A board's figure is only as good as its parts: before a figure is acted on, lay the views
it names under the grid and see that each part holds the material the row is called, at the distance it says
(for two sittings a row called "coral within a few metres" lay on heads ten metres off). And compare a run
with a run of the same views: one page draws them in turn, and a view drawn after other views can differ by a
hair from the same view drawn alone (the sky turns with the day, and the day is hurried on from the last view's).

## What is here

| File | What it holds |
|---|---|
| `look-views.ts` | The views the look is measured through, in groups: `colour`, `evening`, `weather`, `underWater`, `ground`, `reef`, `seaFloor`, `waterDepth`, `steepFloor`, `pairs`, `flyRound`, `ripples`, `nightSky` |
| `pair-sheets.ts` | Lays each of the pairs' views beside its photograph, one sheet a pair |
| `draw-views.ts` | Draws those views from a built page, one picture each |
| `contact-sheet.ts` | Pictures on one sheet under a lettered grid, for naming parts of them |
| `boards/*.json` | Materials, and the parts of photographs and of our views that show each |
| `colour-board.ts` | A board's colours measured, the photographs' beside ours, as a picture and as figures |
| `busyness.ts` | How far the dots of each material stray from its average, photographs against ours |
| `colour.ts` | A colour to OKLCH and back; a colour moved by a measured amount |
| `oklch.ts`, `picture-parts.ts`, `board.ts`, `page-picture.ts` | What the others share |

## To keep in mind

- **The figures are to steer by, not to hit.** A photograph's exposure and white balance are its own, and a
  part of ours is never quite the same thing as a part of theirs. Several photographs from different cameras
  for each material, and a look at the pictures themselves after every change.
- **A part is named by where it lies in its picture.** Move a view's pose, or what stands in front of it, and
  every board that names a part of that view must be looked over again on a contact sheet.
- **One material to a part.** A blade of grass across a patch of sand turns its colour and doubles its spread.
- **The pictures come from the software renderer**, as the tests' do: stills and colour can be trusted, motion
  and frame rate cannot. And the phone shows Adaptive colour, which deepens everything, photographs included.
- **Natural light under water.** A flash puts back the red that water takes away: `SOURCES.md` in each folder
  of photographs says which were lit by one.
