# Tropical Island Survival

A coral atoll to explore in a phone browser, on its way to becoming a survival game. It runs as one HTML page:
three.js and hand-written shaders, no other assets.

**State:** the scene has been rebuilt as a Vite and TypeScript project (`src/`) that matched the last hand-built
page (`legacy/`, build 78) to the pixel, and is now being simplified and improved from there. See
`docs/REFACTOR_PLAN.md`.

## Try it

Open the published `main` build (below).

## Build it from source

Node 22:

```
npm ci
npm run build
```

The page is written to `dist/index.html`, one file with everything inside it.

Build 78, kept to look back at, loads three.js from a CDN, so it needs a connection:

```
cd legacy
python3 build.py
```

The page is written to `legacy/dist/index.html`. `legacy/README.md` describes the legacy layout and tools.

## Published builds

| Address | What |
|---|---|
| <https://ryan0.github.io/tropical-island-survival/> | `main` |
| <https://ryan0.github.io/tropical-island-survival/preview/> | a list of the branches being worked on, each with its own page |
| <https://ryan0.github.io/tropical-island-survival/legacy/> | build 78 |

## Read next

- `CLAUDE.md`: how the project is worked on
- `docs/DECISIONS.md`: why it is built the way it is
- `docs/LOOK.md`: what it should look like
- `docs/ROADMAP.md`: where it is going
