import { CylinderGeometry, SphereGeometry, type BufferGeometry } from 'three';
import { smoothstep } from '../../core/maths';
import type { Random } from '../../core/random';
import { bushyCoral, simpleBushyCoral, staghornCoral } from './branching-coral-shapes';
import {
  addStick,
  joined,
  lumpyField,
  shapedAndPainted,
  type LumpyField,
  type Triple,
} from './painted-shapes';
import { reefConfig, type CoralKind } from './reef-config';

// Each model is about a metre across at size 1.

export interface CoralShapes {
  shapes: BufferGeometry[];
  fromAfar?: BufferGeometry;
}

/**
 * A coral head: a platform of old reef rock, steep-sided and nearly flat on top, with an uneven
 * outline; pale, crusted pink and tufted yellow-green in patches, dark low down and under its rim
 * (which is what outlines it from above).
 */
function coralHead(random: Random): BufferGeometry {
  const lumps = lumpyField(random, 3);
  const otherLumps = lumpyField(random, 3);
  const dome = new SphereGeometry(1, 26, 14, 0, 6.2832, 0, 1.5708);

  const shape = shapedAndPainted(
    dome,
    (x, y, z) => {
      const across = Math.hypot(x, z);
      const angle = Math.atan2(z, x);
      const outline =
        1.06 +
        0.09 * Math.sin(angle * 2 + lumps(1, 2, 3) * 9) +
        0.06 * Math.sin(angle * 5 + 1.7) +
        0.06 * lumps(x * 3, y * 3, z * 3) +
        0.04 * otherLumps(x * 8, y * 8, z * 8);
      const top = Math.pow(Math.max(0, 1 - Math.pow(across, 3.5)), 0.5);
      const height =
        top * (0.92 + 0.08 * otherLumps(x * 4, 0, z * 4)) + 0.05 * lumps(x * 6, 1, z * 6) * top;
      // The foot spreads out in irregular buttresses, so the rock runs into the sea floor rather
      // than standing on it; the sides are rough and ledged.
      const foot = Math.max(0, 1 - height / 0.45);
      const buttresses =
        foot * (0.12 + 0.26 * Math.abs(Math.sin(angle * 3.5 + lumps(3, 1, 2) * 6)));
      const roughness =
        0.07 * (1 - foot) * lumps(x * 7, height * 9, z * 7) * smoothstep(0.7, 1, across);
      const ledges = 0.05 * Math.sin(height * 21 + angle * 2) * smoothstep(0.75, 1, across);
      const reach = outline * (1 + buttresses + roughness + ledges);
      return [x * reach, height, z * reach];
    },
    (x, y, z) => {
      const crust = lumps(x * 3 + 3, y * 4, z * 3 + 1);
      const turf = otherLumps(x * 5, y * 5, z * 5);
      const brightness =
        (0.72 + 0.58 * smoothstep(0.2, 0.95, y)) *
        (0.86 + 0.3 * otherLumps(x * 9, y * 9, z * 9) + 0.2 * lumps(x * 4, y * 6, z * 4));
      if (crust > 0.3) return [brightness * 1.03, brightness * 0.84, brightness * 0.88];
      if (turf > 0.45) return [brightness * 0.86, brightness * 0.9, brightness * 0.6];
      return [brightness, brightness * 0.97, brightness * 0.9];
    },
  );
  return joined([shape]);
}

/** A lump of broken reef rock, for the rubble that lies round the foot of a head. */
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
    new SphereGeometry(0.5, segmentsAround, segmentsDown, 0, 6.2832, 0, 1.8),
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

/** The first plate is the wide one; any above it are smaller and stand off to one side. */
function tablePlate(lumps: LumpyField, tier: number): BufferGeometry {
  const isUpper = tier > 0;
  const radius = isUpper ? 0.3 : 0.5;
  const height = 0.3 + tier * 0.2;
  const offsetX = isUpper ? 0.12 : 0;
  return shapedAndPainted(
    new CylinderGeometry(radius, radius * 0.72, 0.06, 16, 1),
    (x, y, z) => {
      const fromMiddle = Math.hypot(x, z) / radius;
      const k = 1 + 0.1 * lumps(x * 4, 0, z * 4);
      return [
        x * k + offsetX,
        height + y + 0.07 * fromMiddle * fromMiddle + 0.03 * lumps(x * 5, 1, z * 5),
        z * k,
      ];
    },
    (x, y, z) => {
      const fromMiddle = Math.hypot(x - offsetX, z) / radius;
      const isUpperSide = y - height > 0.03 * fromMiddle;
      return (
        (isUpperSide ? 0.95 : 0.7) +
        0.3 * smoothstep(0.7, 1.05, fromMiddle) +
        0.08 * lumps(x * 9, 2, z * 9)
      );
    },
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

function knob(lumps: LumpyField, { angle, distance, radius, height }: Knob): BufferGeometry {
  return shapedAndPainted(
    new SphereGeometry(radius, 8, 5),
    (x, y, z) => {
      const k = 1 + 0.14 * lumps(x * 14, y * 14, z * 14);
      return [
        x * k + Math.cos(angle) * distance,
        y * k * 0.85 + height,
        z * k + Math.sin(angle) * distance,
      ];
    },
    (x, y, z) => 0.62 + 1.1 * y + 0.14 * lumps(x * 20, y * 20, z * 20),
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
  // An angle is drawn though the knob stands in the middle: the reef's stream of random numbers
  // must stay as build 78's.
  const angle = random();
  return joined([knob(lumps, { angle, distance: 0, radius: 0.36, height: 0.14 })]);
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

/** Every coral model, made in the order the reef's stream of random numbers expects. */
export function createCoralShapes(random: Random): Record<CoralKind, CoralShapes> {
  const { kinds, clamLips } = reefConfig;
  const models = (kind: CoralKind, make: (index: number) => BufferGeometry): BufferGeometry[] =>
    Array.from({ length: kinds[kind].shapes }, (_, index) => make(index));

  return {
    head: { shapes: models('head', () => coralHead(random)) },
    rubble: { shapes: models('rubble', () => rubbleLump(random)) },
    brain: {
      shapes: models('brain', () => lobedCoral(random)),
      fromAfar: simpleLobedCoral(random),
    },
    bush: {
      shapes: models('bush', () => bushyCoral(random)),
      fromAfar: simpleBushyCoral(random),
    },
    stag: { shapes: models('stag', () => staghornCoral(random)) },
    // The first has one plate, the second a smaller one above it too.
    table: { shapes: models('table', (index) => tableCoral(random, index + 1)) },
    knob: {
      shapes: models('knob', () => cauliflowerCoral(random)),
      fromAfar: simpleCauliflowerCoral(random),
    },
    smallKnob: { shapes: models('smallKnob', () => simpleCauliflowerCoral(random)) },
    smallBrain: { shapes: models('smallBrain', () => simpleLobedCoral(random)) },
    clam: { shapes: clamLips.map((lip) => giantClam(lip)) },
  };
}
