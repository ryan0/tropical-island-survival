import { DoubleSide, IcosahedronGeometry, Mesh, MeshLambertMaterial, type Scene } from 'three';
import type { Random } from '../../core/random';
import type { GroundHeight, Landmarks, Point } from '../landmarks';
import { campConfig } from './camp-config';
import { createCampModel, shade, type CampModel, type Rgb, type Triple } from './camp-model';

// What a castaway has made, and nothing else: a lean-to of driftwood poles roofed with palm
// fronds, a bed of dry fronds under it, a fishing spear, a few coconuts, firewood by the fire,
// and driftwood logs along the beach (two of them pulled up to the fire to sit on). The campfire
// itself is fire.ts; its ring of stones is laid with the rocks.
// Every part draws its numbers from the camp's stream in a fixed order, so a change to what one
// part draws moves every part after it.

export interface CampDependencies {
  scene: Scene;
  /** The camp's own stream of random numbers. */
  random: Random;
  groundHeight: GroundHeight;
  landmarks: Landmarks;
}

const { colours } = campConfig;

/** The line the lean-to's ridge pole is laid along. */
interface Ridge {
  west: Triple;
  east: Triple;
}

interface Log {
  x: number;
  z: number;
  length: number;
  radius: number;
  /** The way it lies, in radians from x towards z. */
  heading: number;
  colour: Rgb;
  /** How much of its radius is down in the sand; below 0 for one lying on others. */
  sunk: number;
}

function ridgeOver(model: CampModel, hut: Point): Ridge {
  const { groundAt } = model;
  const { x, z } = hut;
  return {
    west: [x - 1.7, groundAt(x - 1.7, z + 0.7) + 1.45, z + 0.7],
    east: [x + 1.7, groundAt(x + 1.7, z + 0.7) + 1.55, z + 0.7],
  };
}

/** Two forked posts, the ridge pole, and rafters from it down to the ground behind. */
function addLeanToFrame(model: CampModel, hut: Point, { west, east }: Ridge): void {
  const { random, groundAt } = model;
  const { wood, bark } = colours;
  const { x, z } = hut;
  model.pole(
    [x - 1.55, groundAt(x - 1.55, z + 0.9) - 0.3, z + 0.9],
    [west[0] + 0.1, west[1] + 0.25, west[2] - 0.05],
    { startRadius: 0.065, endRadius: 0.045, colour: bark, crook: 0.03 },
  );
  model.pole(
    [x + 1.55, groundAt(x + 1.55, z + 0.9) - 0.3, z + 0.9],
    [east[0] - 0.1, east[1] + 0.25, east[2] - 0.05],
    { startRadius: 0.07, endRadius: 0.045, colour: bark, crook: 0.03 },
  );
  model.pole([west[0] - 0.25, west[1], west[2]], [east[0] + 0.3, east[1], east[2]], {
    startRadius: 0.05,
    endRadius: 0.04,
    colour: wood,
    crook: 0.012,
  });

  const { rafters } = campConfig.leanTo;
  for (let i = 0; i < rafters; i++) {
    const share = i / (rafters - 1);
    const topX = x - 1.6 + 3.2 * share + (random() - 0.5) * 0.12;
    const topY = west[1] + (east[1] - west[1]) * share;
    const footZ = z - 1.75 - random() * 0.25;
    const footX = topX + (random() - 0.5) * 0.2;
    model.pole([topX, topY + 0.06, z + 0.78], [footX, groundAt(topX, footZ) - 0.05, footZ], {
      startRadius: 0.032,
      endRadius: 0.024,
      colour: i % 2 === 1 ? wood : bark,
      crook: 0.02,
    });
  }
}

/**
 * Fronds laid over the rafters in layers, like thatch: each layer starts further down the roof
 * and lies on the one before.
 */
function addLeanToRoof(model: CampModel, hut: Point, { west, east }: Ridge): void {
  const { random, groundAt } = model;
  const { roofLayers, frondsInALayer, shareOfGreenFronds } = campConfig.leanTo;
  for (let layer = 0; layer < roofLayers; layer++) {
    for (let i = 0; i < frondsInALayer; i++) {
      const x = hut.x - 1.8 + (3.6 * (i + random() * 0.6)) / frondsInALayer;
      const ridgeY = west[1] + ((east[1] - west[1]) * (x - hut.x + 1.7)) / 3.4;
      const lift = 0.07 + layer * 0.05;
      const downTheRoof = layer * 0.3;
      const baseZ = hut.z + 0.85 - downTheRoof * 2.6;
      const baseY = ridgeY + lift + 0.08 - downTheRoof * ridgeY;
      const tipZ = hut.z - 2.05 - random() * 0.3;
      const tipX = x + (random() - 0.5) * 0.5;
      const leafletReach = 0.34 + random() * 0.12;
      const colour =
        random() < shareOfGreenFronds
          ? shade(colours.greenFrond, 0.8 + 0.3 * random())
          : shade(colours.dryFrond, 0.75 + 0.4 * random());
      model.frond(
        [x, baseY, baseZ],
        [tipX, groundAt(x, tipZ) + lift * 0.6, tipZ],
        leafletReach,
        colour,
      );
    }
  }
}

/** A bed of dry fronds on the ground under the roof. */
function addBed(model: CampModel, hut: Point): void {
  const { random, groundAt } = model;
  for (let i = 0; i < campConfig.leanTo.bedFronds; i++) {
    const x = hut.x - 0.9 + i * 0.36;
    const headZ = hut.z + 0.3;
    const footZ = headZ - 1.9;
    model.frond(
      [x, groundAt(x, headZ) + 0.1, headZ],
      [x + (random() - 0.5) * 0.3, groundAt(x, footZ) + 0.08, footZ],
      0.3,
      shade(colours.dryFrond, 0.9),
    );
  }
}

/** A fishing spear propped against the ridge. */
function addSpear(model: CampModel, hut: Point, { east }: Ridge): void {
  const { x, z } = hut;
  model.pole(
    [x + 2.15, model.groundAt(x + 2.15, z + 1.5) - 0.05, z + 1.5],
    [east[0] + 0.2, east[1] + 0.5, east[2] + 0.05],
    { startRadius: 0.016, endRadius: 0.006, colour: shade(colours.bark, 1.25), crook: 0.004 },
  );
}

/** A few coconuts by the lean-to, in a row with the rest behind it. */
function addCoconuts(model: CampModel, hut: Point): void {
  const { random, groundAt } = model;
  const IN_A_ROW = 3;
  for (let i = 0; i < campConfig.coconuts; i++) {
    const row = Math.floor(i / IN_A_ROW);
    const x = hut.x - 2.2 + (i % IN_A_ROW) * 0.24 + random() * 0.05;
    const z = hut.z + 1.1 + row * 0.22;
    const y = groundAt(x, z) + 0.1 + (row > 0 ? 0.02 : 0);
    const corners = new IcosahedronGeometry(0.115, 1).toNonIndexed().getAttribute('position').array;
    const colour = shade(colours.coconut, 0.8 + 0.4 * random());
    for (let v = 0; v < corners.length; v += 9) {
      model.triangle(
        [x + corners[v], y + corners[v + 1] * 1.15, z + corners[v + 2]],
        [x + corners[v + 3], y + corners[v + 4] * 1.15, z + corners[v + 5]],
        [x + corners[v + 6], y + corners[v + 7] * 1.15, z + corners[v + 8]],
        shade(colour, 0.85 + 0.3 * random()),
      );
    }
  }
}

function addLog(model: CampModel, { x, z, length, radius, heading, colour, sunk }: Log): void {
  const { groundAt } = model;
  const dx = (Math.cos(heading) * length) / 2;
  const dz = (Math.sin(heading) * length) / 2;
  model.pole(
    [x - dx, groundAt(x - dx, z - dz) + radius * (1 - sunk), z - dz],
    [x + dx, groundAt(x + dx, z + dz) + radius * 0.8 * (1 - sunk), z + dz],
    { startRadius: radius, endRadius: radius * 0.75, colour, crook: 0.02 },
  );
}

/** Two logs to sit on by the fire, and a stack of firewood. */
function addFireside(model: CampModel, fire: Point): void {
  const { random } = model;
  const { wood, bark } = colours;
  addLog(model, {
    x: fire.x - 1.5,
    z: fire.z - 0.5,
    length: 1.9,
    radius: 0.14,
    heading: 1.3,
    colour: wood,
    sunk: 0.25,
  });
  addLog(model, {
    x: fire.x + 0.9,
    z: fire.z + 1.4,
    length: 1.6,
    radius: 0.12,
    heading: 0.2,
    colour: shade(wood, 0.9),
    sunk: 0.25,
  });

  // Four sticks on the ground, and the rest laid on them at an angle.
  const ON_THE_GROUND = 4;
  for (let i = 0; i < campConfig.firewood; i++) {
    const isOnTop = i >= ON_THE_GROUND;
    const x = fire.x + 2.0 + (i % ON_THE_GROUND) * 0.12 + random() * 0.05;
    const z = fire.z - 0.9 + random() * 0.1;
    const length = 0.7 + random() * 0.2;
    const radius = 0.035 + random() * 0.015;
    const heading = 1.5 + (random() - 0.5) * 0.3 + (isOnTop ? 0.4 : 0);
    const colour = i % 2 === 1 ? bark : wood;
    addLog(model, { x, z, length, radius, heading, colour, sunk: isOnTop ? -1.6 : 0.1 });
  }
}

/** Driftwood left by the sea high on the ocean beach. */
function addBeachLogs(model: CampModel, landmarks: Landmarks): void {
  const { random } = model;
  for (let i = 0; i < campConfig.beachLogs; i++) {
    const x = (random() * 2 - 1) * 60;
    const beachHeight = 0.75 + random() * 0.5;
    const z = landmarks.shoreZ(x, beachHeight);
    if (!Number.isFinite(z)) continue;
    const length = 1.2 + random() * 2.6;
    const radius = 0.07 + random() * 0.1;
    const heading = random() * 3.14;
    const colour = shade(colours.wood, 0.9 + random() * 0.2);
    const sunk = 0.3 + random() * 0.25;
    addLog(model, { x, z, length, radius, heading, colour, sunk });
  }
}

/** Builds what the castaway has made, as one model with colours painted on its corners. */
export function createCamp(dependencies: CampDependencies): void {
  const { scene, random, groundHeight, landmarks } = dependencies;
  const { hut, fire } = landmarks;
  const model = createCampModel(random, groundHeight);

  const ridge = ridgeOver(model, hut);
  addLeanToFrame(model, hut, ridge);
  addLeanToRoof(model, hut, ridge);
  addBed(model, hut);
  addSpear(model, hut, ridge);
  addCoconuts(model, hut);
  addFireside(model, fire);
  addBeachLogs(model, landmarks);

  const shape = model.shape();
  const mesh = new Mesh(shape, new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
