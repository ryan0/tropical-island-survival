# Code standards

Agreed with Ryan before the refactor began. They apply to everything outside `legacy/`.

## What we are after

1. Simple, clear and very readable.
2. Brief, where that does not cost clarity.
3. Self-documenting. Comments only where they earn their place.
4. No global variables. Dependencies are passed in.
5. Directories, files and names that are easy to follow.

## Structure

- One folder per subject (`sea`, `sky`, `world`, ...). One idea per file. A file that passes about 300 lines is
  probably two ideas.
- Files are kebab-case and named for what they hold: `lagoon-shore-waves.ts`, not `band.ts` or `38_water.js`.
  No number prefixes: order comes from imports.
- A shader lives beside the feature that uses it. Chunks used by several features live in `src/shaders/shared/`.
- Tests and tools live in `tests/` and `tools/`, never beside source.

## Dependencies

Each system is a factory. It receives exactly what it uses and returns what the rest of the program may call.
`main.ts` creates the systems and wires them together. There is no injection framework.

```ts
export function createSea({ scene, uniforms, island }: SeaDependencies): Sea {
  const farSea = createFarSea(uniforms);
  const waveMesh = createWaveMesh(uniforms, island);
  scene.add(farSea, waveMesh.group);

  return {
    update(frame) {
      farSea.position.set(frame.player.x, SEA_LEVEL, frame.player.z);
      waveMesh.showSectorsInView(frame.camera);
    },
  };
}
```

- No module-level mutable state. Two calls to a factory give two independent systems.
- Fixed configuration may be an imported constant. Anything that changes at run time is passed in.
- A system asks for the narrowest thing it needs: the wind's strength, not the whole weather system.
- Debug hooks are one module that receives the systems. Nothing reaches for `window`.

## Names

- Say what the thing is: `whitecapFoam`, `stillWaterDepth`, `secondsSinceCrest`. Not `wD`, `sandD`, `lw.x`.
- Short names are fine for local maths over a few lines: `x`, `z`, `t`, `i`.
- Units are metres, seconds and radians. A name carries a unit only when it differs: `windKmPerHour`.
- `camelCase` for values and functions, `PascalCase` for types, `UPPER_SNAKE_CASE` for true constants.
- In shaders: uniforms start with `u`, varyings with `v`; everything else follows the rules above.

## Functions and data

- Functions and plain objects first. A class only where state and behaviour truly belong together.
- Small functions, early returns, no flags that switch a function between two jobs.
- Merge two pieces of code only when they are the same idea. Three similar lines beat a helper that needs options.
- Strict TypeScript. No `any`, no non-null `!` without a reason on the same line.
- Fail loudly at start-up (a missing shader chunk, a bad config). No silent fallbacks.

## Numbers

The scene holds hundreds of numbers tuned by eye. One a person might want to retune gets a name and lives in its
system's config. Pure maths constants stay inline.

```ts
export const whitecapConfig = {
  windAtOnset: 0.74,
  crestSpacing: [14, 10.5],
  crestHeight: { openSea: 0.6, lagoon: 0.2, reefFlat: 0.15 },
};
```

In a shader the same numbers are named `const` values at the top of the chunk, or come in as uniforms or defines
written from the config. Text substitution into shader source (`{{NAME}}`) is not carried over.

## Comments

- Write the code so that it needs none. Then add the ones that say **why**: a lesson from the phone, a number that
  looks arbitrary and is not, a constraint that is not visible from here.
- Never a comment that restates the code, records who asked for a change, or tells the story of how the code got
  this way. That belongs in the commit message or `docs/HISTORY.md`.

## Agreed exceptions

- **Shader maths tuned by eye keeps short "why" comments.** The code cannot say why foam starts at 0.85 m of depth.
- **The phone's rules beat tidiness.** Water vertex shaders stay branch-free with no `out` parameters
  (`docs/DEVICE_NOTES.md`). A lint check enforces this; it does not rest on comments.
- **Per-frame code allocates nothing.** It reuses vectors and arrays even where that reads a little worse.

## Shaders

- One statement per line. Name intermediate values instead of nesting.
- A chunk states at its top what it needs from outside (uniforms, other chunks).
- A formula needed by both shader and program is written once and generated for the other side.

## Tooling

- Prettier formats; ESLint with the strict TypeScript rules lints. Neither is argued with in review.
- Checks run in GitHub Actions on every branch: types, lint, build, shader compile, the wave model's mirror test,
  and the picture comparison against `legacy/build78.html`. A branch is ready when they pass.

## Commits and branches

- One step of the plan per branch. Small commits that each leave the picture unchanged.
- The message says what changed and why in plain words.
- Ryan merges.
