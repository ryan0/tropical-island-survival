import { SphereGeometry, type BufferGeometry } from 'three';
import { FULL_TURN, type Triple } from '../../core/maths';
import type { Random } from '../../core/random';
import { addStick, joined, lumpyField, shapedAndPainted, type Painter } from './painted-shapes';

const STUBS_ON_A_BUSH = 62;
/** How many sides a bush's stubs are cut with: with three or four, a stub close to was a splinter. */
const STUB_SIDES = 5;

function bushDome(radius: number, paint: Painter): BufferGeometry {
  const dome = new SphereGeometry(radius, 9, 5, 0, FULL_TURN, 0, 1.7);
  return shapedAndPainted(dome, (x, y, z) => [x, y * 0.75, z], paint);
}

/** Stubs all over the dome, pointing outward and up, each forking once. */
function addForkedStub(parts: BufferGeometry[], random: Random, index: number): void {
  const rise = Math.pow(random(), 0.7);
  const angle = index * 2.4 + random() * 0.5;
  const reach = Math.sqrt(1 - rise * rise);
  const length = 0.09 + 0.06 * random();
  const tip = addStick(
    parts,
    [Math.cos(angle) * reach * 0.31, rise * 0.24, Math.sin(angle) * reach * 0.31],
    [Math.cos(angle) * reach, rise + 0.55, Math.sin(angle) * reach],
    {
      length,
      footRadius: 0.02,
      tipRadius: 0.014,
      sides: STUB_SIDES,
      footBrightness: 0.6,
      tipBrightness: 0.95,
      capped: false,
    },
  );

  for (let i = 0; i < 2; i++) {
    const forkX = Math.cos(angle) * reach + (random() - 0.5) * 1.1;
    const forkZ = Math.sin(angle) * reach + (random() - 0.5) * 1.1;
    const forkLength = 0.06 + 0.04 * random();
    addStick(parts, tip, [forkX, rise + 0.7, forkZ], {
      length: forkLength,
      footRadius: 0.013,
      tipRadius: 0.006,
      sides: STUB_SIDES,
      footBrightness: 0.95,
      tipBrightness: 1.35,
      capped: false,
    });
  }
}

/** Bushy coral (Acropora): a dome of many short fine branches, paler at the tips. */
export function bushyCoral(random: Random): BufferGeometry {
  const parts = [bushDome(0.34, () => 0.5)];
  for (let i = 0; i < STUBS_ON_A_BUSH; i++) addForkedStub(parts, random, i);
  return joined(parts);
}

/** Bushy coral seen from far off: just the dome, a little larger and mottled pale as the tips make it. */
export function simpleBushyCoral(random: Random): BufferGeometry {
  const mottling = lumpyField(random, 2);
  return joined([
    bushDome(0.42, (x, y, z) => 0.8 + 0.5 * y + 0.3 * mottling(x * 14, y * 14, z * 14)),
  ]);
}

// A staghorn's branches: how many spring from its foot, how thick they are there, how many sides a
// branch is cut with (with four, a branch close to was a plank), and how many each forks into,
// twice over: a thicket, not a candelabrum.
const STAGHORN = { stems: 5, stemRadius: 0.034, sides: 6, tipSides: 5, forks: 3 };

/** Staghorn coral: a thicket of thin forking branches, pale at the tips. */
export function staghornCoral(random: Random): BufferGeometry {
  const parts: BufferGeometry[] = [];

  function addBranch(
    foot: Triple,
    direction: Triple,
    length: number,
    radius: number,
    forksLeft: number,
  ): void {
    const isTip = forksLeft === 0;
    const tip = addStick(parts, foot, direction, {
      length,
      footRadius: radius,
      tipRadius: radius * (isTip ? 0.5 : 0.72),
      sides: isTip ? STAGHORN.tipSides : STAGHORN.sides,
      footBrightness: 0.55 + 0.1 * (3 - forksLeft),
      tipBrightness: isTip ? 1.3 : 0.7 + 0.1 * (3 - forksLeft),
      capped: isTip,
    });
    if (isTip) return;

    const [dx, dy, dz] = direction;
    const directionLength = Math.hypot(dx, dy, dz);
    const forkCount = STAGHORN.forks;
    for (let i = 0; i < forkCount; i++) {
      const angle = (i * FULL_TURN) / forkCount + random() * 1.3;
      const spread = 0.5 + random() * 0.35;
      const forkLength = length * (0.62 + 0.2 * random());
      addBranch(
        tip,
        [
          dx / directionLength + Math.cos(angle) * spread,
          dy / directionLength + 0.35,
          dz / directionLength + Math.sin(angle) * spread,
        ],
        forkLength,
        radius * 0.7,
        forksLeft - 1,
      );
    }
  }

  for (let i = 0; i < STAGHORN.stems; i++) {
    const angle = (i * FULL_TURN) / STAGHORN.stems + random();
    const length = 0.24 + random() * 0.1;
    // (the middle ones stand up, the outer ones lean out)
    const lean = 0.25 + 0.5 * random();
    addBranch(
      [Math.cos(angle) * 0.1, -0.04, Math.sin(angle) * 0.1],
      [Math.cos(angle) * lean, 1, Math.sin(angle) * lean],
      length,
      STAGHORN.stemRadius,
      2,
    );
  }
  return joined(parts);
}
