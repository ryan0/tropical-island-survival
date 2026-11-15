# Tropical Island Survival

An explorable coral atoll that runs in a phone browser as one HTML page (three.js, hand-written shaders).
It began as a scene called "Lagoon" and is becoming a survival game in the spirit of The Long Dark and Green Hell.
Ryan directs it and judges it on his phone; Claude writes it.

## Where things stand

- `src/` is the build, all of it TypeScript under the code standards, one folder for each subject. `main.ts`
  builds every system and runs the frame loop. It still builds them in build 78's order: three.js numbers
  objects as they are made, and each random stream is moved on by whatever drew from it before, so a change of
  order moves things. The clearing-out step ends that.
- The rebuild around Vite and TypeScript matched build 78 to the pixel. **That build is now a stepping stone:
  the aim is to simplify and improve on it.** A refactor leaves every picture as it was; an improvement changes
  pictures on purpose and is shown before and after. Take care not to lose what has been gained, and do not let
  that care hold back what comes next. The steps and their status are in `docs/REFACTOR_PLAN.md`. Read it
  before starting work.
- `legacy/` is build 78, the last build made before this repository existed. It is kept to look back at and is
  not edited; no test uses it.
- New features (rain, night, things to gather, survival systems) wait until the refactor is done.

## How we work with Ryan

- **The phone is the judge.** The test renderer is software GL at under one frame a second. It can show a still
  picture and catch shader errors; it cannot show motion or frame rate. Say plainly what only the phone can confirm.
- **Review goes in three steps.** Claude compares every change with the last merged build (`npm run compare`),
  looks at the pictures itself, and says which views changed, wanted or not; for a small change, and between
  passes at one thing, that is the whole review. Ryan looks at the before and after on the desktop
  (`review/index.html`). The phone signs off a batch of related work.
- **Match the references.** Ryan sends photos and phone screenshots. The look rules and what each reference showed
  are in `docs/LOOK.md`. He often asks for several passes in a row at one thing.
- **Discuss first.** Architecture, structure and style changes are agreed before they are made.
- **Ryan commits, merges and deploys.** Edit freely and run safe commands. Leave the work uncommitted on a branch
  for him to review; commits, merges, pushes and anything destructive are his. Put each shell command you ask
  him to run in its own code block.
- **Tests must earn their time.** The project is young and how fast we can iterate matters more than coverage.
  Add a test only where it catches what the existing ones cannot; do not add one for each piece of work.
- **Delegate when it pays.** Hand a piece of work to a smaller model (Opus, Sonnet) when the saving in time or
  usage is appreciable and there is no concern that quality would suffer. Otherwise do it yourself.
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
the differing pixels marked. The same run compares where every object in the scene is (animals are mostly out
of the pictures), the page after its controls are used, and the sound. `REFERENCE=<commit or tag> npm run
compare` compares with another commit. Run one check at a time: each run replaces `review/`.

GitHub publishes `main` to <https://ryan0.github.io/tropical-island-survival/>, every unmerged branch to
`preview/<branch>/` below it (`preview/` lists them), and build 78 to `legacy/`. Its checks have no reference
build to compare with, so they catch only what is broken.

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
