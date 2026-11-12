# Tropical Island Survival

A coral atoll to explore in a phone browser, on its way to becoming a survival game. It runs as one HTML page:
three.js and hand-written shaders, no other assets.

**State:** the scene works (`legacy/`, build 78) and is being rebuilt as a Vite and TypeScript project without
changing how it looks. See `docs/REFACTOR_PLAN.md`.

## Try the current build

Open `legacy/build78.html` in a browser. It loads three.js from a CDN, so it needs a connection.

## Build it from source

The scene, as build 78:

```
cd legacy
python3 build.py
```

The page is written to `legacy/dist/index.html`. `legacy/README.md` describes the legacy layout and tools.

The new project (Node 22), an empty page until the scene is brought across:

```
npm ci
npm run build
```

The page is written to `dist/index.html`, one file with everything inside it.

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
