import { Matrix3, Vector3 } from 'three';
import { FULL_TURN } from '../core/maths';
import { skyConfig } from './sky-config';
import { GALACTIC_CENTRE, GALACTIC_NORTH_POLE, type SkyPlace } from './star-places';

// The stars and the Milky Way are laid out in the galaxy's own frame: x towards its centre, z
// towards its north pole, y towards Cygnus. The sky's turn takes that frame into the island's
// (x east, y up, z south) for the time of day: the whole sky turns about its pole once a day.

export interface SkyTurn {
  /** For the shaders: a direction in the galaxy's frame times this is the direction from the island. */
  uniform: { value: Matrix3 };
  /** Turns the sky to the time of day: 0 midnight, 0.5 noon. */
  update(dayPhase: number): void;
}

const { latitude, dueSouthAtMidnight } = skyConfig.starrySky;
const RADIANS_IN_AN_HOUR = FULL_TURN / 24;
const RADIANS_IN_A_DEGREE = Math.PI / 180;

/** A place among the stars as a direction in the frame of the sky's equator: x towards right ascension 0, z its pole. */
function directionAlongEquator({ rightAscension, declination }: SkyPlace): Vector3 {
  const across = rightAscension * RADIANS_IN_AN_HOUR;
  const up = declination * RADIANS_IN_A_DEGREE;
  return new Vector3(
    Math.cos(up) * Math.cos(across),
    Math.cos(up) * Math.sin(across),
    Math.sin(up),
  );
}

/** The turn from the galaxy's frame into the equator's: its columns are the galaxy's axes. */
function galaxyToEquator(): Matrix3 {
  const pole = directionAlongEquator(GALACTIC_NORTH_POLE);
  const centre = directionAlongEquator(GALACTIC_CENTRE);
  // (the two places are rounded, so the centre is made exactly square to the pole)
  centre.addScaledVector(pole, -centre.dot(pole)).normalize();
  const towardsCygnus = new Vector3().crossVectors(pole, centre);
  return new Matrix3().set(
    centre.x,
    towardsCygnus.x,
    pole.x,
    centre.y,
    towardsCygnus.y,
    pole.y,
    centre.z,
    towardsCygnus.z,
    pole.z,
  );
}

const GALAXY_TO_EQUATOR = galaxyToEquator();
const EQUATOR_TO_GALAXY = GALAXY_TO_EQUATOR.clone().transpose();

/** A place among the stars as a direction in the galaxy's frame. */
export function galacticDirection(place: SkyPlace): Vector3 {
  return directionAlongEquator(place).applyMatrix3(EQUATOR_TO_GALAXY);
}

export function createSkyTurn(): SkyTurn {
  const equatorToIsland = new Matrix3();
  const uniform = { value: new Matrix3() };
  const sinLatitude = Math.sin(latitude);
  const cosLatitude = Math.cos(latitude);

  return {
    uniform,
    update(dayPhase) {
      // The sidereal angle: the right ascension due south. As it grows the stars go west.
      const angle = (dueSouthAtMidnight / 24 + dayPhase) * FULL_TURN;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      // Its columns: where right ascension 0 and 6 hours on the equator, and the pole, stand.
      equatorToIsland.set(
        -sin,
        cos,
        0,
        cos * cosLatitude,
        sin * cosLatitude,
        sinLatitude,
        cos * sinLatitude,
        sin * sinLatitude,
        -cosLatitude,
      );
      uniform.value.multiplyMatrices(equatorToIsland, GALAXY_TO_EQUATOR);
    },
  };
}
