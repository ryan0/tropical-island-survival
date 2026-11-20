import type { Scene } from 'three';
import type { RandomStreams } from '../core/random';
import type { GroundHeight, IslandRadius, Landmarks, Point } from '../world/landmarks';
import type { CoralHead } from '../world/reef/reef-layout';
import { createButterflies } from './butterflies';
import { createCrabs } from './crabs';
import { createDolphins } from './dolphins';
import { createFireflies } from './fireflies';
import { createFish } from './fish';
import { createGulls } from './gulls';
import { lifeConfig } from './life-config';
import { createReefFish } from './reef-fish';
import { createTurtle } from './turtle';

export interface LifeDependencies {
  scene: Scene;
  /** Each kind of animal draws from a stream of its own, named for it. */
  randomStream: RandomStreams;
  groundHeight: GroundHeight;
  islandRadius: IslandRadius;
  /** The middle of the home islet. */
  home: Point;
  hut: Point;
  pier: Landmarks['pier'];
  /** The reef fish school round them. */
  coralHeads: readonly CoralHead[];
}

export interface LifeFrame {
  /** Seconds on the scene's clock. */
  time: number;
  /** Seconds on the clock the waves run by, which stands still while the tests take a picture. */
  waveTime: number;
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

/** The animals: in the air, in the water and on the home islet. */
export function createLife(dependencies: LifeDependencies): Life {
  const { scene, randomStream, groundHeight, islandRadius, home, hut, pier, coralHeads } =
    dependencies;

  const gulls = createGulls({ scene, random: randomStream('gulls'), home });
  const fish = createFish({ scene, random: randomStream('fish'), groundHeight, home, pier });
  const reefFish = createReefFish({ scene, random: randomStream('reef fish'), heads: coralHeads });
  const crabs = createCrabs({ scene, random: randomStream('crabs'), groundHeight, home });
  const turtle = createTurtle({ scene, groundHeight });
  const butterflies = createButterflies({
    scene,
    random: randomStream('butterflies'),
    groundHeight,
    home,
  });
  const fireflies = createFireflies({
    scene,
    random: randomStream('fireflies'),
    groundHeight,
    home,
    hut,
  });
  const dolphins = lifeConfig.dolphins.areOut ? createDolphins({ scene, islandRadius }) : null;

  return {
    update({ time, waveTime, dt, daylight, night, waterLevel, player }) {
      gulls.update(time, dt);
      fish.update(time);
      // By the waves' clock, so that they hold still with the waves while a picture is taken.
      reefFish.update(waveTime, player);
      crabs.update(time, dt, player);
      turtle.update(time, waterLevel);
      butterflies.update(time, daylight);
      fireflies.update(time, night);
      dolphins?.update(time, waterLevel);
    },
  };
}
