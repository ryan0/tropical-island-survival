import {
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
  type Scene,
} from 'three';
import { smoothstep } from '../../core/maths';
import type { Random } from '../../core/random';
import { createFishModel } from './fish-model';
import { reefConfig } from './reef-config';
import type { CoralHead } from './reef-layout';

// Reef fish: small blue ones in loose clouds over the bigger heads, yellow butterflyfish in
// ones and twos. Every head of any size has its fish, and the bigger heads have more.

export interface ReefFish {
  /** `time` is the clock the waves run by. */
  update(time: number, cameraPosition: Vector3): void;
}

interface OneFish {
  isBlue: boolean;
  head: CoralHead;
  /** Where round its head it starts, and how far out it circles. */
  startsAt: number;
  circle: number;
  height: number;
  /** Radians a second round the head; the sign is which way. */
  pace: number;
  phase: number;
  length: number;
}

type Rgb = readonly [number, number, number];

const BIG_ENOUGH_FOR_FISH = 1.7;
// A fish is drawn pointing at where it will be this much later.
const SECONDS_AHEAD = 0.1;
const HIGHEST = -0.15;

/** The small blue-green ones (chromis): dark back, bright side, pale belly, a dark eye. */
function paintBlue(x: number, y: number, part: number): Rgb {
  if (part !== 0) return [0.25, 0.75, 1.0];
  if (Math.hypot(x - 0.36, y - 0.03) < 0.035) return [0.05, 0.05, 0.08];
  const upTheSide = smoothstep(-0.12, 0.1, y);
  return [0.55 - 0.4 * upTheSide, 0.95 - 0.25 * upTheSide, 1.0 + 0.15 * upTheSide];
}

/** Butterflyfish: pale yellow-white with fine slanting stripes, a black bar through the eye, yellow fins and tail. */
function paintYellow(x: number, y: number, part: number): Rgb {
  if (part !== 0) return part === 1 ? [1.1, 0.8, 0.2] : [1.15, 0.9, 0.25];
  if (x > 0.27 && x < 0.36) return [0.08, 0.08, 0.08];
  if (x > 0.36) return [1.0, 0.95, 0.8];
  const stripe = 0.5 + 0.5 * Math.sin((x + y * 0.8) * 46);
  return x < -0.3
    ? [1.1, 0.75, 0.2]
    : [1.1 - 0.12 * stripe, 1.0 - 0.2 * stripe, 0.7 - 0.3 * stripe];
}

export function createReefFish(
  scene: Scene,
  random: Random,
  heads: readonly CoralHead[],
): ReefFish {
  const fish: OneFish[] = [];
  let blueCount = 0;
  let yellowCount = 0;
  for (const head of heads) {
    if (head.radius <= BIG_ENOUGH_FOR_FISH) continue;

    const blues = Math.round(2 + head.radius * 1.1);
    const yellows = head.radius > 3.2 ? 2 : random() < 0.5 ? 1 : 0;
    for (let i = 0; i < blues + yellows; i++) {
      const isBlue = i < blues;
      // Round the outside of the head, clear of the coral on top.
      const startsAt = random() * 6.283;
      const circle = (isBlue ? 1.08 + random() * 0.45 : 1.15 + random() * 0.3) * head.radius;
      const height =
        head.floor + head.height * (isBlue ? 0.55 + random() * 0.6 : 0.3 + random() * 0.5);
      const pace =
        ((0.16 + random() * 0.2) * (random() < 0.5 ? 1 : -1)) / Math.max(1, head.radius * 0.3);
      const phase = random() * 6.283;
      const length = isBlue ? 0.08 + random() * 0.04 : 0.13 + random() * 0.04;
      fish.push({ isBlue, head, startsAt, circle, height, pace, phase, length });
      if (isBlue) blueCount++;
      else yellowCount++;
    }
  }

  const blue = new InstancedMesh(
    createFishModel(0.42, paintBlue),
    new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }),
    Math.max(1, blueCount),
  );
  const yellow = new InstancedMesh(
    createFishModel(0.82, paintYellow),
    blue.material,
    Math.max(1, yellowCount),
  );
  for (const mesh of [blue, yellow]) {
    // Only the first `count` places of each are drawn, and those are wherever the fish are.
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  const matrix = new Matrix4();
  const facing = new Quaternion();
  const scale = new Vector3();
  const position = new Vector3();
  const ahead = new Vector3();
  const heading = new Euler(0, 0, 0, 'YZX');

  // Circling its coral head, now faster now slower (never backwards: the sway is kept smaller
  // than its steady speed), drifting in and out and up and down.
  function findPlace(one: OneFish, time: number, place: Vector3): void {
    const angle =
      one.startsAt + one.pace * (time + (0.55 / 0.7) * Math.sin(time * 0.7 + one.phase));
    const circle = one.circle * (1 + 0.08 * Math.sin(time * 0.37 + one.phase * 2));
    place.set(
      one.head.x + Math.cos(angle) * circle,
      Math.min(HIGHEST, one.height + 0.1 * Math.sin(time * 0.9 + one.phase)),
      one.head.z + Math.sin(angle) * circle,
    );
  }

  return {
    update(time, cameraPosition) {
      // Each mesh's first places are filled afresh with the fish near enough to be drawn.
      let bluesShown = 0;
      let yellowsShown = 0;
      for (const one of fish) {
        const fromCamera = Math.hypot(one.head.x - cameraPosition.x, one.head.z - cameraPosition.z);
        if (fromCamera > reefConfig.fishShownWithin) continue;

        findPlace(one, time, position);
        findPlace(one, time + SECONDS_AHEAD, ahead);
        const dx = ahead.x - position.x;
        const dy = ahead.y - position.y;
        const dz = ahead.z - position.z;
        const alongTheFloor = Math.hypot(dx, dz);
        // Its nose along the way it is actually moving, its body wagging as it swims.
        // (A turn about the upright axis carries the nose, +x, to (cos, 0, -sin).)
        heading.set(
          0,
          Math.atan2(-dz, dx) + 0.14 * Math.sin(time * (7 + one.phase) + one.phase),
          Math.atan2(dy, Math.max(alongTheFloor, 1e-4)) * 0.8,
        );
        facing.setFromEuler(heading);
        matrix.compose(position, facing, scale.set(one.length, one.length, one.length));
        if (one.isBlue) blue.setMatrixAt(bluesShown++, matrix);
        else yellow.setMatrixAt(yellowsShown++, matrix);
      }
      blue.count = bluesShown;
      yellow.count = yellowsShown;
      blue.instanceMatrix.needsUpdate = true;
      yellow.instanceMatrix.needsUpdate = true;
    },
  };
}
