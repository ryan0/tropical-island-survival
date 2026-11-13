import type { Random } from '../core/random';
import type { SurfObstacle } from './spray';
import { sprayConfig } from './spray-config';
import type { SprayDroplets } from './spray-droplets';

// What breaking water throws: droplets, small and bright, and mist, which starts larger and
// fainter and grows.

/** A spot on the reef where a wave is breaking. */
export interface BreakingSpot {
  x: number;
  z: number;
  /** The water's height there. */
  surface: number;
  /** A step of length one towards the atoll's centre: the way the wave is going. */
  inwardX: number;
  inwardZ: number;
  breakerHeight: number;
}

export interface SprayBursts {
  fromLandingLip(spot: BreakingSpot): void;
  fromFallingLip(spot: BreakingSpot): void;
  fromBore(spot: BreakingSpot): void;
  /** `force` is how hard the water hits it. */
  fromObstacle(obstacle: SurfObstacle, surface: number, force: number): void;
}

const config = sprayConfig;
// Rounded, not 2π: where every droplet flies depends on the exact number.
const FULL_TURN = 6.283;

export function createSprayBursts(random: Random, droplets: SprayDroplets): SprayBursts {
  return {
    fromLandingLip({ x, z, surface, inwardX, inwardZ, breakerHeight }) {
      // Bigger waves throw higher, though not in proportion.
      const lift = Math.sqrt(breakerHeight + 0.08);
      const count =
        config.landingLip.fewestDroplets +
        Math.floor(random() * config.landingLip.dropletsPerMetre * breakerHeight);
      for (let i = 0; i < count; i++) {
        droplets.launch(
          x + inwardX * 0.3 + (random() - 0.5) * 0.9,
          surface + 0.1 + random() * 0.3 * breakerHeight,
          z + inwardZ * 0.3 + (random() - 0.5) * 0.9,
          inwardX * (1 + random() * 2.4) + (random() - 0.5) * 1.4,
          (1.6 + random() * 3.4) * lift,
          inwardZ * (1 + random() * 2.4) + (random() - 0.5) * 1.4,
          0.6 + random() * 0.7,
          0.035 + random() * 0.055,
          0.05,
          0.85,
        );
      }
      if (random() < config.landingLip.puffChance) {
        droplets.launch(
          x,
          surface + 0.25,
          z,
          inwardX * 0.9,
          0.9 + random(),
          inwardZ * 0.9,
          1.2 + random() * 0.9,
          0.45 + random() * 0.5,
          1.1,
          0.15,
        );
      }
      // The burst where the lip lands: clouds of mist thrown up and forward.
      droplets.launch(
        x,
        surface + 0.3,
        z,
        inwardX * (0.6 + random() * 1.6),
        (1.1 + random() * 1.5) * lift,
        inwardZ * (0.6 + random() * 1.6),
        1.6 + random() * 1.2,
        1.0 + random() * 1.2,
        2.4,
        0.1,
      );
      droplets.launch(
        x + (random() - 0.5) * 2,
        surface + 0.2,
        z + (random() - 0.5) * 2,
        inwardX * (0.4 + random()),
        (0.7 + random() * 1.0) * lift,
        inwardZ * (0.4 + random()),
        1.8 + random() * 1.2,
        1.2 + random() * 1.2,
        2.0,
        0.08,
      );
    },

    // Droplets off the top of a lip as it falls fly back, out to sea.
    fromFallingLip({ x, z, surface, inwardX, inwardZ, breakerHeight }) {
      droplets.launch(
        x,
        surface + 0.25 * breakerHeight + 0.1,
        z,
        -inwardX * (0.4 + random()) + (random() - 0.5) * 0.5,
        0.8 + random() * 1.3,
        -inwardZ * (0.4 + random()) + (random() - 0.5) * 0.5,
        0.45 + random() * 0.5,
        0.03 + random() * 0.04,
        0.04,
        0.8,
      );
      // Spindrift: mist torn off the top of the lip and carried back over the wave.
      if (random() < config.fallingLip.spindriftChance) {
        droplets.launch(
          x,
          surface + 0.45 * breakerHeight + 0.15,
          z,
          -inwardX * (1.2 + random() * 1.8),
          0.9 + random() * 1.4,
          -inwardZ * (1.2 + random() * 1.8),
          1.3 + random() * 0.9,
          0.4 + random() * 0.5,
          1.5,
          0.11,
        );
      }
    },

    fromBore({ x, z, surface, inwardX, inwardZ, breakerHeight }) {
      droplets.launch(
        x,
        surface + 0.05,
        z,
        inwardX * (0.5 + random() * 1.2),
        0.7 + random() * 1.5,
        inwardZ * (0.5 + random() * 1.2),
        0.4 + random() * 0.45,
        0.03 + random() * 0.045,
        0.04,
        0.8,
      );
      // White water carries a low cloud of mist along with it.
      droplets.launch(
        x + (random() - 0.5) * 1.5,
        surface + 0.1 + 0.3 * breakerHeight,
        z + (random() - 0.5) * 1.5,
        inwardX * (1.4 + random()),
        0.3 + random() * 0.6,
        inwardZ * (1.4 + random()),
        1.0 + random() * 0.8,
        0.6 + random() * 0.8 + breakerHeight,
        1.3,
        0.09,
      );
      if (random() < config.bore.secondCloudChance) {
        droplets.launch(
          x + (random() - 0.5) * 1.5,
          surface + 0.2 + 0.4 * breakerHeight,
          z + (random() - 0.5) * 1.5,
          inwardX * (1.2 + random()),
          0.5 + random() * 0.9,
          inwardZ * (1.2 + random()),
          1.4 + random() * 1.1,
          0.8 + random() * 1.0 + breakerHeight,
          1.5,
          0.08,
        );
      }
    },

    // Droplets thrown out all round it from its edge, the harder it is hit the higher, and now
    // and then a puff of mist over it.
    fromObstacle({ x, z, radius }, surface, force) {
      const count =
        config.obstacles.fewestDroplets +
        Math.floor(force * config.obstacles.dropletsPerForce * random());
      for (let i = 0; i < count; i++) {
        const angle = random() * FULL_TURN;
        droplets.launch(
          x + Math.cos(angle) * radius * 0.9,
          surface + 0.05,
          z + Math.sin(angle) * radius * 0.9,
          Math.cos(angle) * (0.4 + random() * 1.2),
          (1.1 + random() * 2.1) * Math.min(1.5, 0.5 + force),
          Math.sin(angle) * (0.4 + random() * 1.2),
          0.45 + random() * 0.5,
          0.03 + random() * 0.05,
          0.04,
          0.85,
        );
      }
      if (random() < config.obstacles.puffChance) {
        droplets.launch(
          x,
          surface + 0.15,
          z,
          0,
          0.5 + random() * 0.5,
          0,
          0.9 + random() * 0.5,
          0.3 + random() * 0.3 + radius * 0.3,
          0.8,
          0.12,
        );
      }
    },
  };
}
