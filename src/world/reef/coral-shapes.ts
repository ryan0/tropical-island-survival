import { Float32BufferAttribute, SphereGeometry, type BufferGeometry } from 'three';
import { FULL_TURN, smoothstep, type Triple } from '../../core/maths';
import type { Random } from '../../core/random';
import { bushyCoral, simpleBushyCoral, staghornCoral } from './branching-coral-shapes';
import {
  addStick,
  joined,
  lumpyField,
  shapedAndPainted,
  type LumpyField,
  type Move,
} from './painted-shapes';
import { reefConfig, type CoralKind } from './reef-config';

// Each model is about a metre across at size 1.

export interface CoralShapes {
  shapes: BufferGeometry[];
  fromAfar?: BufferGeometry;
}

/** A table coral's plate: how thick it is at its middle, and how finely the ball it is made from is cut. */
const TABLE_PLATE = { thickness: 0.035, around: 14, rings: 5 };

/**
 * What a coral's surface is like close to, as shares of the three patterns in the corals' surface
 * picture (coral-surface-picture.ts): a brain coral's winding ridges, a boulder coral's fine
 * skin, and the warts of the branching, table and cauliflower corals.
 */
type Surface = Triple;
const RIDGED: Surface = [1, 0, 0];
const FINE_SKINNED: Surface = [0, 1, 0];
const WARTY: Surface = [0, 0, 1];
const SMOOTH: Surface = [0, 0, 0];
/** Old dead coral rock, pitted and crusted: a little of the skin and of the warts. */
const WEATHERED: Surface = [0, 0.35, 0.35];

/** Gives every corner of a model its surface, for the coral's shader (the attribute `surface`). */
function withSurface(model: BufferGeometry, surfaceAt: Surface | Move): BufferGeometry {
  const position = model.getAttribute('position');
  const surfaces = new Float32Array(position.count * 3);
  for (let corner = 0; corner < position.count; corner++) {
    const surface =
      typeof surfaceAt === 'function'
        ? surfaceAt(position.getX(corner), position.getY(corner), position.getZ(corner))
        : surfaceAt;
    surfaces.set(surface, corner * 3);
  }
  model.setAttribute('surface', new Float32BufferAttribute(surfaces, 3));
  return model;
}

// A coral head's colours, as its tint is multiplied by them: the living boulder coral of its
// sides is a khaki; its dead top is pale rock, crusted pink in patches and tufted with a
// yellow-green turf of algae in others.
const LIVING_SIDE: Triple = [1.04, 1.0, 0.74];
const DEAD_TOP: Triple = [1.12, 1.1, 1.04];
const PINK_CRUST: Triple = [1.14, 0.94, 0.98];
const ALGAL_TURF: Triple = [0.9, 0.96, 0.66];

/**
 * A head stands on the floor under its middle, and the floor is seldom level: so its sides go on
 * down below its foot in a skirt, or its downhill side hung in the water. The skirt is cut from
 * this share more of the ball than its top half, and reaches this many of the head's heights down
 * for each unit of the ball's.
 */
const HEAD_SKIRT = { shareOfBall: 0.25, depth: 1.8 };

/**
 * A coral head: a great boulder coral that has grown up to the surface and can grow no higher.
 * Its sides are alive, in big rounded lobes with creases between them; its top, which the low
 * tides kill, is flat old rock on which other corals stand. (It was a platform of rock with
 * ledged, buttressed sides, drawn with the rocks' material: "piles of smooth balls" on crumpled
 * paper, where the photographs have one or two great domes with a grain.)
 * `segmentsAround` and `segmentsDown` are how finely it is cut: the lobes need the finer cut.
 */
function coralHead(random: Random, segmentsAround: number, segmentsDown: number): BufferGeometry {
  const lumps = lumpyField(random, 3);
  const otherLumps = lumpyField(random, 3);
  // (A little more than the top half of a ball: what lies below its middle becomes the skirt.)
  const dome = new SphereGeometry(
    1,
    segmentsAround,
    segmentsDown,
    0,
    FULL_TURN,
    0,
    (FULL_TURN / 4) * (1 + HEAD_SKIRT.shareOfBall),
  );
  const outlinePhase = lumps(1, 2, 3) * 9;
  // How far out from the middle the dead top reaches, by where the model's corner stood on the
  // ball it was made from: ragged, so that the living rim is wider here and narrower there.
  const livingAt = (x: number, y: number, z: number) =>
    smoothstep(0.62, 0.84, Math.hypot(x, z) + 0.12 * otherLumps(x * 4, y * 4, z * 4));
  // The lobes of the sides: 1 on a bulge, -1 in a crease.
  const lobesAt = (x: number, y: number, z: number) =>
    0.75 * lumps(x * 2.4, y * 2.4, z * 2.4) + 0.25 * otherLumps(x * 5.5, y * 5.5, z * 5.5);
  // A corner is moved and then painted: these carry what the moving found to the painting.
  let isLiving = 0;
  let lobe = 0;

  const shape = shapedAndPainted(
    dome,
    (x, y, z) => {
      const isSkirt = y < 0;
      // (a corner of the skirt stands under the ball's rim)
      const across = isSkirt ? 1 : Math.hypot(x, z);
      const rimX = isSkirt ? x / Math.hypot(x, z) : x;
      const rimZ = isSkirt ? z / Math.hypot(x, z) : z;
      const angle = Math.atan2(z, x);
      const outline =
        1.06 +
        0.09 * Math.sin(angle * 2 + outlinePhase) +
        0.06 * Math.sin(angle * 5 + 1.7) +
        0.05 * lumps(rimX * 3, y * 3, rimZ * 3);
      const top = Math.pow(Math.max(0, 1 - Math.pow(across, 3.5)), 0.5);
      const height = top * (0.92 + 0.08 * otherLumps(x * 4, 0, z * 4));
      const onSide = smoothstep(0.6, 0.92, across);
      lobe = lobesAt(rimX, y, rimZ);
      isLiving = livingAt(rimX, y, rimZ);
      // The foot spreads a little, so that the head runs into the sea floor.
      const foot = Math.max(0, 1 - height / 0.3);
      const reach = outline * (1 + onSide * 0.15 * lobe + 0.1 * foot);
      if (isSkirt) return [rimX * reach, y * HEAD_SKIRT.depth, rimZ * reach];
      return [x * reach, height * (1 + onSide * 0.1 * lobe), z * reach];
    },
    (x, y, z) => {
      // Lighter on a bulge and dark in a crease, and darker low down, out of the light.
      const side =
        (0.62 + 0.42 * smoothstep(-0.7, 0.7, lobe)) * (0.72 + 0.28 * smoothstep(0, 0.5, y));
      const crust = lumps(x * 3 + 3, y * 4, z * 3 + 1);
      const turf = otherLumps(x * 5, y * 5, z * 5);
      const rock = 0.84 + 0.2 * otherLumps(x * 9, y * 9, z * 9);
      const dead = crust > 0.3 ? PINK_CRUST : turf > 0.45 ? ALGAL_TURF : DEAD_TOP;
      return [
        dead[0] * rock * (1 - isLiving) + LIVING_SIDE[0] * side * isLiving,
        dead[1] * rock * (1 - isLiving) + LIVING_SIDE[1] * side * isLiving,
        dead[2] * rock * (1 - isLiving) + LIVING_SIDE[2] * side * isLiving,
      ];
    },
  );
  const model = joined([shape]);
  // (The joined model's corners are the ball's, triangle by triangle: where each stood on the
  // ball is lost, so how far out it is now stands for it.)
  return withSurface(model, (x, y, z) => {
    const isLiving = smoothstep(0.66, 0.9, Math.hypot(x, z));
    return [
      WEATHERED[0] * (1 - isLiving) + FINE_SKINNED[0] * isLiving,
      WEATHERED[1] * (1 - isLiving) + FINE_SKINNED[1] * isLiving,
      WEATHERED[2] * (1 - isLiving) + FINE_SKINNED[2] * isLiving,
    ];
  });
}

/** A lump of dead coral, for the rubble that lies round the foot of a head. */
function rubbleLump(random: Random): BufferGeometry {
  const lumps = lumpyField(random, 3);
  const shape = shapedAndPainted(
    new SphereGeometry(0.5, 8, 6),
    (x, y, z) => {
      const k = 1 + 0.34 * lumps(x * 4, y * 4, z * 4) + 0.14 * lumps(x * 9, y * 9, z * 9);
      return [x * k, y * k * 0.7, z * k];
    },
    (x, y, z) => 0.8 + 0.5 * y + 0.35 * lumps(x * 8, y * 8, z * 8),
  );
  return joined([shape]);
}

function lobedMound(random: Random, segmentsAround: number, segmentsDown: number): BufferGeometry {
  const lumps = lumpyField(random, 3);
  const shape = shapedAndPainted(
    new SphereGeometry(0.5, segmentsAround, segmentsDown, 0, FULL_TURN, 0, 1.8),
    (x, y, z) => {
      const k = 1 + 0.17 * lumps(x * 5, y * 5, z * 5) + 0.05 * lumps(x * 11, y * 11, z * 11);
      return [x * k, y * 0.8 * k, z * k];
    },
    (x, y, z) => 0.74 + 0.45 * y + 0.42 * lumps(x * 5, y * 5, z * 5),
  );
  return joined([shape]);
}

/** Lobed coral (Porites): a mound of smooth rounded lobes. */
function lobedCoral(random: Random): BufferGeometry {
  return lobedMound(random, 20, 10);
}

/** The same in fewer triangles: seen from afar, and for the many small ones. */
function simpleLobedCoral(random: Random): BufferGeometry {
  return lobedMound(random, 9, 5);
}

/**
 * A table coral's plate: thin, a little dished, its outline uneven and its growing rim pale. The
 * first plate is the wide one; any above it are smaller and stand off to one side. (As a disc of
 * sixteen straight sides in one shade, a table seen from above was a flat pale counter.)
 */
function tablePlate(lumps: LumpyField, tier: number): BufferGeometry {
  const isUpper = tier > 0;
  const radius = isUpper ? 0.3 : 0.5;
  const height = 0.3 + tier * 0.2;
  const offsetX = isUpper ? 0.12 : 0;
  const outlinePhase = lumps(tier + 1, 2, 3) * 6;
  // A corner is moved and then painted: these carry what the moving found to the painting.
  let isUpperSide = false;
  let fromMiddle = 0;
  return shapedAndPainted(
    // (a ball, squashed flat: its rings give the plate corners between its middle and its rim)
    new SphereGeometry(radius, TABLE_PLATE.around, TABLE_PLATE.rings),
    (x, y, z) => {
      const angle = Math.atan2(z, x);
      fromMiddle = Math.hypot(x, z) / radius;
      isUpperSide = y > 0;
      const outline =
        1 + 0.1 * lumps(x * 4, 0, z * 4) + 0.08 * Math.sin(angle * 3 + outlinePhase) * fromMiddle;
      // Thickest at the stalk, a blade at the rim, which turns up a little.
      const thickness = TABLE_PLATE.thickness * (1 - 0.7 * fromMiddle * fromMiddle);
      const dish = 0.07 * fromMiddle * fromMiddle + 0.03 * lumps(x * 5, 1, z * 5);
      return [x * outline + offsetX, height + (y / radius) * thickness + dish, z * outline];
    },
    (x, y, z) =>
      (isUpperSide ? 0.82 : 0.58) +
      0.36 * smoothstep(0.62, 1, fromMiddle) +
      0.1 * lumps(x * 9, 2, z * 9),
  );
}

/** Table coral: a wide thin plate on a short stalk, its rim paler. */
function tableCoral(random: Random, plates: number): BufferGeometry {
  const lumps = lumpyField(random, 2);
  const parts: BufferGeometry[] = [];
  addStick(parts, [0, -0.05, 0], [0.1, 1, 0.05], {
    length: 0.34,
    footRadius: 0.13,
    tipRadius: 0.09,
    sides: 6,
    footBrightness: 0.5,
    tipBrightness: 0.6,
    capped: false,
  });
  for (let tier = 0; tier < plates; tier++) parts.push(tablePlate(lumps, tier));
  return joined(parts);
}

interface Knob {
  /** Which way, and how far, it stands from the middle of the bunch. */
  angle: number;
  distance: number;
  radius: number;
  height: number;
}

/** A knob's lobes: how many times the lumpy field is crossed in a knob's radius, and how deep they are. */
const KNOB_LOBES = { across: 1.3, deep: 0.3 };

function knob(lumps: LumpyField, { angle, distance, radius, height }: Knob): BufferGeometry {
  // A corner is moved and then painted: this carries what the moving found to the painting.
  let lobe = 0;
  return shapedAndPainted(
    new SphereGeometry(radius, 8, 5),
    (x, y, z) => {
      // Lobes two or three to a knob, so that it is a clump and not a ball: broad enough for the
      // few corners a knob has to follow.
      lobe = lumps(
        (x / radius) * KNOB_LOBES.across,
        (y / radius) * KNOB_LOBES.across,
        (z / radius) * KNOB_LOBES.across,
      );
      const k = 1 + KNOB_LOBES.deep * lobe;
      return [
        x * k + Math.cos(angle) * distance,
        y * k * 0.85 + height,
        z * k + Math.sin(angle) * distance,
      ];
    },
    // (darker in the creases between the lobes)
    (x, y) => 0.62 + 1.1 * y + 0.3 * lobe,
  );
}

/** Cauliflower coral: a tight bunch of knobs, one in the middle and four round it. */
function cauliflowerCoral(random: Random): BufferGeometry {
  const lumps = lumpyField(random, 2);
  const knobs: BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const isMiddle = i === 0;
    const angle = i * 1.257 + random();
    const radius = isMiddle ? 0.24 : 0.17 + random() * 0.07;
    const height = isMiddle ? 0.2 : 0.12 + random() * 0.08;
    knobs.push(knob(lumps, { angle, distance: isMiddle ? 0 : 0.2, radius, height }));
  }
  return joined(knobs);
}

/** One knob: cauliflower coral seen from afar, and the many small ones. */
function simpleCauliflowerCoral(random: Random): BufferGeometry {
  const lumps = lumpyField(random, 2);
  return joined([knob(lumps, { angle: 0, distance: 0, radius: 0.36, height: 0.14 })]);
}

/** Giant clam: two fat ribbed shells a little open, the fleshy lips between them in a vivid colour. */
function giantClam(lip: Triple): BufferGeometry {
  const shape = shapedAndPainted(
    new SphereGeometry(0.5, 16, 8),
    (x, y, z) => {
      const rib = 1 + 0.07 * Math.sin(x * 26);
      return [x * 1.25, y * 0.62 * rib + 0.12, z * 0.8 * rib];
    },
    (x, y, z) => {
      // How far from the wavy slit along the top, in widths of the slit, which opens upwards.
      const fromSlit = Math.abs(z - 0.05 * Math.sin(x * 16)) / (0.05 + 0.1 * Math.max(0, y));
      if (y > 0.2 && fromSlit < 1.3) {
        const glow = 1.2 - 0.5 * fromSlit;
        return [lip[0] * glow, lip[1] * glow, lip[2] * glow];
      }
      return 0.75 + 0.3 * Math.sin(x * 26);
    },
  );
  return joined([shape]);
}

/** Every coral model. */
export function createCoralShapes(random: Random): Record<CoralKind, CoralShapes> {
  const { kinds, clamLips } = reefConfig;
  const models = (kind: CoralKind, make: (index: number) => BufferGeometry): BufferGeometry[] =>
    Array.from({ length: kinds[kind].shapes }, (_, index) => make(index));
  // Of the lobed mounds, every other model is a brain coral and the rest are boulder corals: the
  // shape is the same, and the surface tells them apart.
  const lobedSurface = (index: number): Surface => (index % 2 === 1 ? RIDGED : FINE_SKINNED);

  return {
    head: {
      shapes: models('head', () => coralHead(random, 48, 22)),
      fromAfar: coralHead(random, 20, 10),
    },
    rubble: { shapes: models('rubble', () => withSurface(rubbleLump(random), WEATHERED)) },
    brain: {
      shapes: models('brain', (index) => withSurface(lobedCoral(random), lobedSurface(index))),
      fromAfar: withSurface(simpleLobedCoral(random), FINE_SKINNED),
    },
    bush: {
      shapes: models('bush', () => withSurface(bushyCoral(random), WARTY)),
      fromAfar: withSurface(simpleBushyCoral(random), WARTY),
    },
    stag: { shapes: models('stag', () => withSurface(staghornCoral(random), WARTY)) },
    // The first has one plate, the second a smaller one above it too.
    table: {
      shapes: models('table', (index) => withSurface(tableCoral(random, index + 1), WARTY)),
    },
    knob: {
      shapes: models('knob', () => withSurface(cauliflowerCoral(random), WARTY)),
      fromAfar: withSurface(simpleCauliflowerCoral(random), WARTY),
    },
    smallKnob: {
      shapes: models('smallKnob', () => withSurface(simpleCauliflowerCoral(random), WARTY)),
    },
    smallBrain: {
      shapes: models('smallBrain', (index) =>
        withSurface(simpleLobedCoral(random), lobedSurface(index)),
      ),
    },
    clam: { shapes: clamLips.map((lip) => withSurface(giantClam(lip), SMOOTH)) },
  };
}
