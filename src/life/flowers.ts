import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  MeshLambertMaterial,
  Quaternion,
  type Scene,
} from 'three';
import { within, type Random, type Range } from '../core/random';
import { addInstances, coloursAreSet, createInstancePlacer, whiteMaterial } from './instances';
import { lifeConfig } from './life-config';
import { ANY_DIRECTION, findPlace, squareAround, type GroundHeight, type Point } from './placing';
import { placed, star } from './shapes';

export interface FlowersDependencies {
  scene: Scene;
  random: Random;
  groundHeight: GroundHeight;
  /** The middle of the home islet. */
  home: Point;
}

const config = lifeConfig.flowers;
const TILT: Range = [-0.3, 0.3];

/** Small flowers on the high ground round home: a stem and a bloom each. They never move. */
export function createFlowers({ scene, random, groundHeight, home }: FlowersDependencies): void {
  const stemShape = placed(new CylinderGeometry(0.004, 0.006, config.stemHeight, 3), [
    0,
    config.stemHeight / 2,
    0,
  ]);
  const stems = addInstances(
    scene,
    stemShape,
    new MeshLambertMaterial({ color: config.stem }),
    config.count,
  );
  const blooms = addInstances(
    scene,
    star(0.05, 0.02, 0.015),
    whiteMaterial(DoubleSide),
    config.count,
  );
  const reachSquared = config.reachFromHome * config.reachFromHome;
  const placeInstance = createInstancePlacer();
  const tilt = new Euler();
  const turn = new Quaternion();
  const colour = new Color();

  // As many as find a place: a try that lands off the high ground is one flower fewer.
  let grown = 0;
  for (let i = 0; i < config.count; i++) {
    const place = findPlace(
      random,
      groundHeight,
      squareAround(home, config.reachFromHome),
      config.triesEach,
      (height, x, z) =>
        height > config.lowestGround &&
        (x - home.x) * (x - home.x) + (z - home.z) * (z - home.z) < reachSquared,
    );
    if (place === null) continue;

    const size = within(random, config.size);
    turn.setFromEuler(tilt.set(0, within(random, ANY_DIRECTION), 0));
    placeInstance(stems, grown, place.x, place.height, place.z, turn, size, size, size);

    tilt.set(within(random, TILT), within(random, ANY_DIRECTION), within(random, TILT));
    turn.setFromEuler(tilt);
    const top = place.height + config.stemHeight * size;
    placeInstance(blooms, grown, place.x, top, place.z, turn, size, size, size);
    colour.setHex(config.blooms[Math.floor(random() * config.blooms.length)]);
    blooms.setColorAt(grown, colour);
    grown++;
  }
  stems.count = grown;
  blooms.count = grown;
  stems.instanceMatrix.needsUpdate = true;
  blooms.instanceMatrix.needsUpdate = true;
  coloursAreSet(blooms);
}
