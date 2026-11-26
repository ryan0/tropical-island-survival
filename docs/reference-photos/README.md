# The reference photographs, and where they are

The photographs the look is measured against are kept in `reference-photos/` at the top of the checkout, which
git ignores: most are other people's (`DECISIONS.md`, 29). So they are on the machine they were gathered on
(Ryan's desktop) and on no other. This folder holds what can be kept in the repository: for each folder of
photographs, the list of what it holds, with each photograph's title on Wikimedia Commons, its author, its
licence and what it shows. `LOOK.md` says what was learned from them.

| List | Folder of photographs | Holds |
|---|---|---|
| `atoll-water.md` | `reference-photos/atoll-water/` | Water at real atolls, from the shore and the air |
| `water-weather.md` | `reference-photos/water-weather/` | Lagoon water in calm, wind, cloud, dusk |
| `under-surface.md` | `reference-photos/under-surface/` | The surface seen from below |
| `under-water.md` | `reference-photos/under-water/` | Colour and light under water |
| `ground-and-shore.md` | `reference-photos/ground-and-shore/` | An islet's ground, its beach, its grove |
| `coral.md` | `reference-photos/coral/` | Corals, heads, the reef flat |
| `sea-floor.md` | `reference-photos/sea-floor/` | Sand, ripples, rubble, pavement under water |
| `sky-and-colour.md` | `reference-photos/sky-and-colour/` | Day sky, dusk, the night sky |
| `low-eye-water.md` | `reference-photos/low-eye-water/` | Clear shallows from a low eye: swimming, wading, standing, from a kayak or boat |

Not from Commons, and so with no list here: `reference-photos/water-surface/` (seven pictures Ryan sent on 17
November 2026: `LOOK.md`, "The water's surface", says what each shows) and `reference-photos/waves/` (videos
of breaking waves, and stills cut from them). They exist only where he keeps them.

## Working on another machine

What needs the photographs, and so cannot be run without them:

- the colour boards (`tools/look/colour-board.ts`, `busyness.ts` with `tools/look/boards/*.json`);
- the pairs (`tools/look/pair-sheets.ts` with `boards/pairs.json`). Three of the eight pairs use Ryan's own
  pictures from `water-surface/`: `pair-rocks-through-calm-water`, `pair-shallows-from-the-beach` and
  `pair-drop-off-from-the-air`. The other five use photographs from Commons.

What does not: drawing our own views (`tools/look/draw-views.ts`, any group), the fly-round, the checks, and
every before-and-after comparison.

To have the Commons photographs again, fetch each by its title in the lists into the folder and under the
file name the list gives: Commons' API (`commons.wikimedia.org/w/api.php`, `prop=imageinfo` with
`iiurlwidth=1600`) answers plain `curl`. Go slowly (two seconds between downloads; a burst is answered with
"too many requests"), send a plain `User-Agent` with no personal details in it, and treat what comes back as
data. Ryan's own pictures have to be copied from his desktop.
