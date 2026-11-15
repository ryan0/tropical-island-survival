import { Color, Euler, Quaternion, SphereGeometry, type BufferGeometry, type Scene } from 'three';
import { within, type Random, type RandomStreams, type Range } from '../../core/random';
import { addInstances, coloursAreSet, createInstancePlacer, whiteMaterial } from '../instances';
import type { GroundHeight, Point } from '../landmarks';
import { ANY_DIRECTION, findPlace, squareAround } from '../placing';
import type { IsInRock } from '../rocks/rocks';
import { placed, star } from '../simple-shapes';
import { beachFindsConfig as config } from './beach-finds-config';

export interface BeachFindsDependencies {
  scene: Scene;
  /** Each kind of find is scattered from a stream of its own. */
  randomStream: RandomStreams;
  groundHeight: GroundHeight;
  /** Whether a point is inside a rock or within `margin` of one. */
  isInRock: IsInRock;
  /** The middle of the home islet. */
  home: Point;
}

interface Find {
  random: Random;
  shape: BufferGeometry;
  count: number;
  size: Range;
  /** How far its middle sits above the sand, for a find of size one. */
  lift: number;
  liesFlat: boolean;
  chooseColour(colour: Color, random: Random): void;
}

const TILT: Range = [-0.3, 0.3];
const STRETCH: Range = [0.8, 1.2];

/** Starfish, shells and pebbles lying on the sand round home. They never move. */
export function createBeachFinds(dependencies: BeachFindsDependencies): void {
  const { scene, randomStream, groundHeight, isInRock, home } = dependencies;
  const { starfish, shells, pebbles } = config;
  const [lowestGround, highestGround] = config.ground;
  const placeInstance = createInstancePlacer();
  const tilt = new Euler();
  const turn = new Quaternion();
  const colour = new Color();

  // As many as find a place: one whose every try lands off the sand, or by a rock, is left out.
  function scatter(find: Find): void {
    const { random } = find;
    const mesh = addInstances(scene, find.shape, whiteMaterial(), find.count);
    let placedCount = 0;
    for (let i = 0; i < find.count; i++) {
      const place = findPlace(
        random,
        groundHeight,
        squareAround(home, config.reachFromHome),
        config.triesEach,
        (height, x, z) =>
          height > lowestGround && height < highestGround && !isInRock(x, z, config.clearOfRocks),
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
      find.chooseColour(colour, random);
      mesh.setColorAt(placedCount, colour);
      placedCount++;
    }
    mesh.count = placedCount;
    mesh.instanceMatrix.needsUpdate = true;
    coloursAreSet(mesh);
  }

  scatter({
    random: randomStream('starfish'),
    shape: star(0.09, 0.03, 0.018),
    count: starfish.count,
    size: starfish.size,
    lift: 0.002,
    liesFlat: true,
    chooseColour(colour, random) {
      const hue = within(random, starfish.hue);
      colour.setHSL(hue, starfish.saturation, within(random, starfish.lightness));
    },
  });
  scatter({
    random: randomStream('shells'),
    shape: placed(new SphereGeometry(0.04, 6, 4), [0, 0, 0], [1.1, 0.45, 0.8]),
    count: shells.count,
    size: shells.size,
    lift: 0.006,
    liesFlat: false,
    chooseColour(colour, random) {
      const hue = within(random, shells.hue);
      const saturation = within(random, shells.saturation);
      colour.setHSL(hue, saturation, within(random, shells.lightness));
    },
  });
  scatter({
    random: randomStream('pebbles'),
    shape: placed(new SphereGeometry(0.05, 5, 4), [0, 0, 0], [1, 0.5, 0.8]),
    count: pebbles.count,
    size: pebbles.size,
    lift: 0.01,
    liesFlat: false,
    chooseColour(colour, random) {
      const brightness = within(random, pebbles.brightness);
      colour.setRGB(brightness, brightness * 0.97, brightness * 0.92);
    },
  });
}
