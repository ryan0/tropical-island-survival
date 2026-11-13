import { Color, Euler, Quaternion, SphereGeometry, type BufferGeometry, type Scene } from 'three';
import { within, type Random, type Range } from '../core/random';
import { addInstances, coloursAreSet, createInstancePlacer, whiteMaterial } from './instances';
import { lifeConfig } from './life-config';
import { ANY_DIRECTION, findPlace, squareAround, type GroundHeight, type Point } from './placing';
import { placed, star } from './shapes';

export interface BeachFindsDependencies {
  scene: Scene;
  random: Random;
  groundHeight: GroundHeight;
  /** The middle of the home islet. */
  home: Point;
}

interface Find {
  shape: BufferGeometry;
  count: number;
  size: Range;
  /** How far its middle sits above the sand, for a find of size one. */
  lift: number;
  liesFlat: boolean;
  chooseColour(colour: Color): void;
}

const config = lifeConfig.beachFinds;
const TILT: Range = [-0.3, 0.3];
const STRETCH: Range = [0.8, 1.2];

/** Starfish, shells and pebbles lying on the sand round home. They never move. */
export function createBeachFinds(dependencies: BeachFindsDependencies): void {
  const { scene, random, groundHeight, home } = dependencies;
  const { starfish, shells, pebbles } = config;
  const [lowestGround, highestGround] = config.ground;
  const placeInstance = createInstancePlacer();
  const tilt = new Euler();
  const turn = new Quaternion();
  const colour = new Color();

  // As many as find a place: a try that lands off the sand is one find fewer.
  function scatter(find: Find): void {
    const mesh = addInstances(scene, find.shape, whiteMaterial(), find.count);
    let placedCount = 0;
    for (let i = 0; i < find.count; i++) {
      const place = findPlace(
        random,
        groundHeight,
        squareAround(home, config.reachFromHome),
        config.triesEach,
        (height) => height > lowestGround && height < highestGround,
      );
      if (place === null) continue;

      tilt.set(
        find.liesFlat ? 0 : within(random, TILT),
        within(random, ANY_DIRECTION),
        find.liesFlat ? 0 : within(random, TILT),
      );
      turn.setFromEuler(tilt);
      const size = within(random, find.size);
      placeInstance(
        mesh,
        placedCount,
        place.x,
        place.height + find.lift * size,
        place.z,
        turn,
        size,
        size * within(random, STRETCH),
        size * within(random, STRETCH),
      );
      find.chooseColour(colour);
      mesh.setColorAt(placedCount, colour);
      placedCount++;
    }
    mesh.count = placedCount;
    mesh.instanceMatrix.needsUpdate = true;
    coloursAreSet(mesh);
  }

  scatter({
    shape: star(0.09, 0.03, 0.018),
    count: starfish.count,
    size: starfish.size,
    lift: 0.002,
    liesFlat: true,
    chooseColour(colour) {
      const hue = within(random, starfish.hue);
      colour.setHSL(hue, starfish.saturation, within(random, starfish.lightness));
    },
  });
  scatter({
    shape: placed(new SphereGeometry(0.04, 6, 4), [0, 0, 0], [1.1, 0.45, 0.8]),
    count: shells.count,
    size: shells.size,
    lift: 0.006,
    liesFlat: false,
    chooseColour(colour) {
      const hue = within(random, shells.hue);
      const saturation = within(random, shells.saturation);
      colour.setHSL(hue, saturation, within(random, shells.lightness));
    },
  });
  scatter({
    shape: placed(new SphereGeometry(0.05, 5, 4), [0, 0, 0], [1, 0.5, 0.8]),
    count: pebbles.count,
    size: pebbles.size,
    lift: 0.01,
    liesFlat: false,
    chooseColour(colour) {
      const brightness = within(random, pebbles.brightness);
      colour.setRGB(brightness, brightness * 0.97, brightness * 0.92);
    },
  });
}
