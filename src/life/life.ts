import type { Scene } from 'three';
import type { Random } from '../core/random';
import { createBeachFinds } from './beach-finds';
import { createButterflies } from './butterflies';
import { createCrabs } from './crabs';
import { createDolphins } from './dolphins';
import { createFireflies } from './fireflies';
import { createFish, type FishModel, type Pier } from './fish';
import { createFlowers } from './flowers';
import { createGulls } from './gulls';
import type { GroundHeight, Point } from './placing';
import { createTurtle } from './turtle';

export interface LifeDependencies {
  scene: Scene;
  /** One stream for everything here. */
  random: Random;
  groundHeight: GroundHeight;
  /** Distance from the atoll's centre to the outer shoreline, in a direction. */
  islandRadius: (direction: number) => number;
  /** The middle of the home islet. */
  home: Point;
  hut: Point;
  pier: Pier;
  fishModel: FishModel;
}

export interface LifeFrame {
  /** Seconds on the scene's clock. */
  time: number;
  dt: number;
  /** 0 at night to 1 in full day, and the other way about. */
  daylight: number;
  night: number;
  /** Height of the sea's surface where the turtle and the dolphins break it. */
  waterLevel: number;
  player: Point;
}

export interface Life {
  update(frame: LifeFrame): void;
}

/** The animals, and the small things that lie or grow on the home islet. */
export function createLife(dependencies: LifeDependencies): Life {
  const { scene, random, groundHeight, islandRadius, home, hut, pier, fishModel } = dependencies;

  // All of these draw from the one random stream, so where each thing lies depends on
  // everything built before it. This is build 78's order: change it and all that follows moves.
  const gulls = createGulls({ scene, random, home });
  const fish = createFish({ scene, random, groundHeight, home, pier, fishModel });
  const crabs = createCrabs({ scene, random, groundHeight, home });
  const turtle = createTurtle({ scene, random, groundHeight, home });
  createBeachFinds({ scene, random, groundHeight, home });
  createFlowers({ scene, random, groundHeight, home });
  const butterflies = createButterflies({ scene, random, groundHeight, home });
  const fireflies = createFireflies({ scene, random, groundHeight, home, hut });
  const dolphins = createDolphins({ scene, islandRadius });

  return {
    update({ time, dt, daylight, night, waterLevel, player }) {
      gulls.update(time, dt);
      fish.update(time);
      crabs.update(time, dt, player);
      turtle.update(time, waterLevel);
      butterflies.update(time, daylight);
      fireflies.update(time, night);
      dolphins.update(time, waterLevel);
    },
  };
}
