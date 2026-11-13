# Tropical Island Survival

An explorable coral atoll that runs in a phone browser as one HTML page (three.js, hand-written shaders).
It began as a scene called "Lagoon" and is becoming a survival game in the spirit of The Long Dark and Green Hell.
Ryan directs it and judges it on his phone; Claude writes it.

## Where things stand

- `legacy/` is build 78, the last build made before this repository existed. It is the reference: do not edit it.
- `src/lifted/` is build 78's program inside the new build: the same code as modules, not yet cleaned. The code
  standards apply to a file from the moment it is cleaned and leaves that folder (step 4 of the plan). A lifted
  file whose system has been cleaned is a bridge: a few lines that build the cleaned system and pass the old
  names on, until `main.ts` takes over.
- The project is being rebuilt around Vite and TypeScript **without changing anything that can be seen**.
  The steps and their status are in `docs/REFACTOR_PLAN.md`. Read it before starting work.
- New features (rain, night, things to gather, survival systems) wait until the refactor is done.

## How we work with Ryan

- **The phone is the judge.** The test renderer is software GL at under one frame a second. It can show a still
  picture and catch shader errors; it cannot show motion or frame rate. Say plainly what only the phone can confirm.
- **Match the references.** Ryan sends photos and phone screenshots. The look rules and what each reference showed
  are in `docs/LOOK.md`. He often asks for several passes in a row at one thing.
- **Discuss first.** Architecture, structure and style changes are agreed before they are made.
- **Ryan merges and deploys.** Edit freely and run safe commands. Leave commits to the main branch, merges and
  anything destructive to him; put each shell command you ask him to run in its own code block.
- **Reports are short and lead with the result.** One preview picture per visible change. He wants to understand
  what happened at a high level, not read a log.
- **Every build shows its number on screen**, so a screenshot proves which build is on the phone.

## Hard rules

These come from bugs that only appeared on Ryan's phone. Details: `docs/DEVICE_NOTES.md`.

- Vertex shaders that move water: no `out`/`inout` parameters, no loops, no arrays, no branching after the
  position is assembled, guarded `pow` and divisions, and a hard limit on how far a vertex may move.
- Water meshes carry `position` and nothing else.
- Read a mipmapped texture before a branch, never inside it.
- In a patched built-in material, use the shared camera uniform, not `cameraPosition`.
- The shape of the island is defined once and shared by shaders and program. So is anything else both need.
- The water shader knows the ground only as a formula; the ground is drawn as triangles. Within a hand's depth of
  the water's edge the two disagree, so the sand shader draws everything there.

## Code standards (full text: `docs/CODE_STANDARDS.md`)

- Simple, clear, very readable; concise where that costs no clarity.
- Self-documenting names. Comments say why, never what. Shader maths tuned by eye keeps short "why" comments.
- No global mutable state. Each system is a factory that receives what it uses and returns its `update`.
- Functions and plain data before classes. Strict TypeScript, no `any`.
- Files in kebab-case named for what they hold; shaders live beside the feature that uses them.
- Numbers a person might retune have names and live in that system's config.
- Per-frame code allocates nothing.

## Commands

New pipeline (Node 22, npm; once per machine: `npm ci` and `npx playwright install --only-shell chromium`):

```
npm run dev        # dev server; add `-- --host` to open it from the phone on the home network
npm run check      # types, lint, build, tests: what GitHub runs on every branch (about two minutes; three and a half when build 78's pictures must be drawn)
npm run check:quick   # the same with a handful of the tests, for use while working (half a minute)
npm run pictures   # only the picture comparison with build 78; `-- -g lagoon` for the views so named
npm run format     # let Prettier rewrite the files
npm run site       # the whole Pages site into site/, as GitHub publishes it
```

The tests draw every view in `tests/reference-views.ts` from `legacy/build78.html` and from the page under test
and fail on any pixel that differs; the pictures of a failure (reference, page under test, difference) are in
`test-results/`. Build 78's pictures are drawn once and kept in `node_modules/.cache/build78-pictures/`; they are
drawn again by themselves when the tests, the browser or the packages change, or when that folder is deleted. They also use the menu, joystick, captions and debug panel on both pages, compile every shader
and compare the wave model's two copies.

GitHub publishes `main` to <https://ryan0.github.io/tropical-island-survival/>, every unmerged branch to
`preview/<branch>/` below it (`preview/` lists them), and build 78 to `legacy/`.

Legacy build (Python 3, Node, Playwright with Chromium):

```
cd legacy
python3 build.py
node tools/check.js
```

## Conventions

- Metres, seconds, radians. Y is up. Still sea level is y = 0. The atoll's centre is the origin.
- `th = atan(z, x)` is the direction from the centre. Home is in the south (+z), on the ocean side.
- The swell comes from the south. The wind blows towards -x (it comes from the east).
- Wind strength is 0 (none), 0.33 (low), 0.66 (medium), 1 (high). Cloud cover is 0 (clear) to 1 (cloudy).

## Where to read more

| File | What it holds |
|---|---|
| `docs/REFACTOR_PLAN.md` | The agreed plan, the target layout, the steps, what is done |
| `docs/CODE_STANDARDS.md` | The agreed code standards with examples |
| `docs/DECISIONS.md` | Why the project is built the way it is |
| `docs/LOOK.md` | What it should look like, what was rejected and why |
| `docs/ROADMAP.md` | What comes after the refactor; known weak points |
| `docs/DEVICE_NOTES.md` | What the phone taught us about shaders |
| `docs/HISTORY.md` | Notes from builds 26-78: what changed and why |
| `legacy/README.md` | How the legacy build and its tools work |
