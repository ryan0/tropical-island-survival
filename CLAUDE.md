# Tropical Island Survival

An explorable coral atoll that runs in a phone browser as one HTML page (three.js, hand-written shaders).
It began as a scene called "Lagoon" and is becoming a survival game in the spirit of The Long Dark and Green Hell.
Ryan directs it and judges it on his phone; Claude writes it.

## Where things stand

- `src/` is the build, all of it TypeScript under the code standards, one folder for each subject. `main.ts`
  builds every system and runs the frame loop. Each kind of thing that is placed draws from a random stream of
  its own, by name, so changing one never moves another and the order they are built in moves nothing. (That
  order still decides which of two things three.js draws first where nothing else does.)
- The rebuild around Vite and TypeScript matched build 78 to the pixel. **That build is now a stepping stone:
  the aim is to simplify and improve on it.** A refactor leaves every picture as it was; an improvement changes
  pictures on purpose and is shown before and after. Take care not to lose what has been gained, and do not let
  that care hold back what comes next.
- The waves are being rebuilt in passes (`docs/ROADMAP.md`). They read the sea floor from two pictures made at
  start-up (`src/sea/sea-floor-pictures.ts`), not from a formula of their own, and their sizes and timing are
  written once for shader and program (`src/sea/wave-timing/timing.glsl`). The front of a breaking wave, with its
  lip and the white water it throws up, is a mesh of its own that keeps to the crest (`src/sea/breaker.ts`); the
  sea's mesh draws the rest. All water is coloured by one rule, how much of it the eye looks through
  (`src/sea/water.frag.glsl`). To an eye above the sea, each thing under it is veiled by the water its own
  light comes up through, drawn on the thing itself; the surface draws only a share
  (`src/shaders/shared/water-veil.glsl`).
- The ground is drawn in tiles, and its colouring reads pictures made at start-up wherever it once worked a
  formula out for every dot: its noise and random numbers, the shore, the reef's cover, the turf's patterns
  (`src/world/terrain-declarations.glsl`). The islet's ground is coral sand from shore to shore; stones, the
  trees' litter and creepers are pictures of the real things laid over it (`src/world/ground-tiles/`), by the
  land's broad patterns and a map of what stands over each spot (`src/world/tree-cover-map.ts`). The sea's
  floor is sand, rubble and rock by how much of each belongs in a place; the rock is a picture of reef
  pavement that the sand floods to a level (`src/world/sea-bed/`), and ground too steep for sand to lie on is
  bare rock. One
  lamp lights the scene, the sun's by day and the moon's by night (`src/sky/lights.ts`); a full moon rises as
  the sun sets and crosses the sky through the night, among stars that are points, the bright ones in their
  real places, turning about the pole (`src/sky/stars.ts`).
- A coral is known by its surface: a picture of real ones (`src/world/reef/coral-surface-picture.ts`) is read
  by the coral's shader, and each model says which surface it has. A coral head is one great boulder coral.
- To an eye under water, the water between it and a thing takes the thing's colour with distance, red first
  (`src/shaders/shared/through-water.glsl`). Every material gets that from three.js's fog, which has a second
  case for it (`src/sea/water-as-fog.ts`); the surface from below is a window of sky and a mirror beyond it
  (`seenFromUnderWater` in `src/sea/water.frag.glsl`); `src/sea/under-water.ts` owns what hangs in the water,
  but for the bubbles a breaking wave drives down, which are the spray's (`src/sea/bubble-plumes.ts`).
- The refactor is finished (`docs/REFACTOR_PLAN.md` is its record). What comes next, in the order agreed, is in
  `docs/ROADMAP.md`. Read it before starting work. The work in hand is the look, against reference photos, in
  four sittings with Ryan's review after each.
- Build 78, the last build made before this repository existed, is at the git tag `build-78`, in the folder
  `legacy/` there. Nothing in the repository uses it.

## How we work with Ryan

- **The phone is the judge.** The test renderer is software GL at under one frame a second. It can show a still
  picture and catch shader errors; it cannot show motion or frame rate. Say plainly what only the phone can confirm.
  The frame rate shows in the corner of the screen. The debug panel (hold the corner button) reports it too, with
  the program's time for a frame, the draws and triangles, where the eye is and how deep the floor is under it. Its `fly` switch (or F) lets the stick move the
  eye the way it looks, over land and sea, to look at anything from anywhere: Space and C go up and down, Shift
  goes fast, the wheel sets the pace, and a phone gets buttons for the same. Switched off, the player comes down
  where the eye was. `drain the sea` (or G) draws no water and marks the floor with lines of equal depth, a metre
  apart. A row of buttons flies the eye to the reef's places. To find where a slow frame goes, have Ryan read
  the frame rate with the panel's cost switches on, one at a time (`docs/DEVICE_NOTES.md`): the test renderer's
  timings have misled every time they were trusted.
- **Review goes in three steps.** Claude compares every change with the last merged build (`npm run compare`),
  looks at the pictures itself, and says which views changed, wanted or not; for a small change, and between
  passes at one thing, that is the whole review. Ryan looks at the before and after on the desktop
  (`review/index.html`). The phone signs off a batch of related work.
- **Match the references.** Ryan sends photos, phone screenshots and videos; they are kept in `reference-photos/`,
  which git ignores (videos of waves in `reference-photos/waves/`). The look rules and what each reference showed
  are in `docs/LOOK.md`. Colour is measured against the photos, not judged by eye alone (`docs/LOOK.md`,
  "Colour, measured"; the tools are in `tools/look/`). He often asks for several passes in a row at one thing.
- **Discuss first.** Architecture, structure and style changes are agreed before they are made.
- **Ryan commits, merges and deploys.** Edit freely and run safe commands. Leave the work uncommitted on a branch
  for him to review; commits, merges, pushes and anything destructive are his. Put each shell command you ask
  him to run in its own code block.
- **Tests must earn their time.** The project is young and how fast we can iterate matters more than coverage.
  Add a test only where it catches what the existing ones cannot; do not add one for each piece of work.
- **Delegate when it pays.** Hand a piece of work to a smaller model (Opus, Sonnet) when the saving in time or
  usage is appreciable and there is no concern that quality would suffer. Otherwise do it yourself. For work on
  the look (agreed 19 November 2026): agents gather references and build what stands by itself to a written
  brief; Claude does every pass at a look, every change to the water's and the ground's shaders, the merging,
  and judges every picture Ryan is shown (`docs/ROADMAP.md`, "Who does what").
- **Reports are short and lead with the result.** One preview picture per visible change. He wants to understand
  what happened at a high level, not read a log.
- **Every build shows its number on screen**, so a screenshot proves which build is on the phone.

## Hard rules

These come from bugs that only appeared on Ryan's phone. Details: `docs/DEVICE_NOTES.md`.

- Vertex shaders that move water: no `out`/`inout` parameters, no loops, no arrays, no branching after the
  position is assembled, guarded `pow` and divisions, and a hard limit on how far a vertex may move.
- Water meshes carry `position` and nothing else.
- Read a mipmapped texture before a branch, never inside it.
- Do not read a depth texture. three.js 0.187's shadows do, and they lose the phone's graphics context; that is why
  three.js stays at 0.128. (Suspected, not proven.)
- In a patched built-in material, use the shared camera uniform, not `cameraPosition`.
- The shape of the island is defined once and shared by shaders and program. So is anything else both need.
- The water shader knows the ground only as a formula, or a picture made from it (`src/sea/floor-height-picture.ts`);
  the ground is drawn as triangles. Within a hand's depth of the water's edge the two disagree, so the sand shader
  draws everything there.

## Code standards (full text: `docs/CODE_STANDARDS.md`)

- Simple, clear, very readable; concise where that costs no clarity.
- Self-documenting names. Comments say why, never what. Shader maths tuned by eye keeps short "why" comments.
- No global mutable state. Each system is a factory that receives what it uses and returns its `update`.
- Functions and plain data before classes. Strict TypeScript, no `any`.
- Files in kebab-case named for what they hold; shaders live beside the feature that uses them.
- Numbers a person might retune have names and live in that system's config.
- Per-frame code allocates nothing.

## Commands

Node 22, npm; once per machine: `npm ci` and `npx playwright install --only-shell chromium`. Cutting a video
into stills needs `ffmpeg`.

```
npm run dev        # dev server
npm run dev:phone  # the same, open to the phone on the home network: it prints a QR code to scan
npm run check      # types, lint, build, tests: what GitHub runs on every branch (about three minutes; four
                   # on the first run after a merge, which draws the reference build's pictures)
npm run check:quick   # the same with a handful of the tests, for use while working (under a minute)
npm run compare    # builds, draws every view and writes review/index.html; `-- -g lagoon` for the views so named
npm run format     # let Prettier rewrite the files
npm run site       # the whole Pages site into site/, as GitHub publishes it
```

On Android 17 the phone's Chrome reaches the dev server only once it is allowed **Nearby devices** (Settings →
Apps → Chrome → Permissions; some builds call it Local network). Until then it shows `ERR_TOO_MANY_RETRIES`, and
nothing reaches the computer.

The tests fail on what is broken: a view that cannot be drawn, a page error, a shader that does not compile, a
control that changes nothing, a silent page, the wave model's two copies drifting apart.

What has changed is reported, not failed. Every view in `tests/reference-views.ts` is drawn from the working
files and from the reference build: the commit the branch left `main` at, which is the last one Ryan merged. It
is built once and its pictures drawn once, and both are kept in `node_modules/.cache/`. The run ends by listing
the pictures that differ and writing `review/index.html`: changed views first, each before and after and with
the differing pixels marked, pink where they differ clearly and blue where faintly (a shift of under a pixel
leaves many faint ones and nothing to see). The same run compares where every object in the scene is (animals are mostly out
of the pictures), the page after its controls are used, and the sound. `REFERENCE=<commit or tag> npm run
compare` compares with another commit. Run one check at a time: each run replaces `review/`. The reference build
is built with the working files' packages, so a run cannot compare across a change of packages.

GitHub publishes `main` to <https://ryan0.github.io/tropical-island-survival/>, every unmerged branch to
`preview/<branch>/` below it (`preview/` lists them). Its checks have no reference build to compare with, so
they catch only what is broken.

## Conventions

- Metres, seconds, radians. Y is up. Still sea level is y = 0. The atoll's centre is the origin.
- `th = atan(z, x)` is the direction from the centre. Home is in the south (+z), on the ocean side.
- The swell comes from the south. The wind blows towards -x (it comes from the east).
- Wind strength is 0 (none), 0.33 (low), 0.66 (medium), 1 (high). Cloud cover is 0 (clear) to 1 (cloudy).

## Where to read more

| File | What it holds |
|---|---|
| `docs/REFACTOR_PLAN.md` | The refactor, finished: the layout, what each step did, the reference views |
| `docs/CODE_STANDARDS.md` | The agreed code standards with examples |
| `docs/DECISIONS.md` | Why the project is built the way it is |
| `docs/LOOK.md` | What it should look like, what was rejected and why; what the reference photos measure |
| `tools/look/README.md` | How to measure our pictures against the reference photos |
| `docs/ROADMAP.md` | What comes next, in order; the breaking wave's rebuild; known weak points |
| `docs/REEF.md` | What belongs in each region of the reef and lagoon, from research; the order of the reef's redesign; what a tide would take |
| `docs/DEVICE_NOTES.md` | What the phone taught us about shaders |
| `docs/HISTORY.md` | Notes from builds 26-78: what changed and why |
