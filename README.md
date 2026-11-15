# Tropical Island Survival

A coral atoll to explore in a phone browser, on its way to becoming a survival game. It runs as one HTML page:
three.js and hand-written shaders, no other assets.

**State:** the scene has been rebuilt as a Vite and TypeScript project (`src/`) that matched the last hand-built
page (build 78) to the pixel, and is now being simplified and improved from there. See `docs/ROADMAP.md`.

## Try it

Open the published `main` build (below).

## Build it from source

Node 22:

```
npm ci
npm run build
```

The page is written to `dist/index.html`, one file with everything inside it.

Build 78, the last page built by hand, is kept at the git tag `build-78`, in the folder `legacy/`: its page is
`legacy/build78.html`, and `legacy/README.md` describes its layout and tools. To look at it:

```
git worktree add ../build-78 build-78
```

## Published builds

| Address | What |
|---|---|
| <https://ryan0.github.io/tropical-island-survival/> | `main` |
| <https://ryan0.github.io/tropical-island-survival/preview/> | a list of the branches being worked on, each with its own page |

## Read next

- `CLAUDE.md`: how the project is worked on
- `docs/DECISIONS.md`: why it is built the way it is
- `docs/LOOK.md`: what it should look like
- `docs/ROADMAP.md`: where it is going
