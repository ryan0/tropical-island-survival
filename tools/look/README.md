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
grove, gravel, litter and low plants.

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

## What is here

| File | What it holds |
|---|---|
| `look-views.ts` | The views the look is measured through, in groups: `colour`, `evening`, `weather`, `underWater`, `ground` |
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
