import type { Captions } from '../ui/captions';
import type { IslandShape } from '../world/island-shape';
import type { Landmarks, Point } from '../world/landmarks';
import { playerConfig } from './player-config';

export interface PlaceNamesDependencies {
  captions: Captions;
  island: IslandShape;
  sandbank: Point;
  landmarks: Landmarks;
  /** Whether the camp is there: its fire and shelter are named places. */
  hasCamp: boolean;
  /** Nowhere is named during the fly-in. */
  intro: { readonly isRunning: boolean };
}

export interface PlaceNames {
  /** Shows a place's name as the player comes into it. */
  update(x: number, z: number, groundHeight: number): void;
}

interface Place {
  readonly title: string;
  readonly subtitle: string;
}

const places = playerConfig.placeNames;

export function createPlaceNames(dependencies: PlaceNamesDependencies): PlaceNames {
  const { captions, island, sandbank, landmarks, hasCamp, intro } = dependencies;
  const { fire, hut } = landmarks;
  let shown: Place | null = null;

  function placeAt(x: number, z: number, groundHeight: number): Place | null {
    if (hasCamp && Math.hypot(x - fire.x, z - fire.z) < places.campfire.within) {
      return places.campfire;
    }
    if (hasCamp && Math.hypot(x - hut.x, z - hut.z) < places.shelter.within) return places.shelter;
    if (
      Math.hypot(x - sandbank.x, z - sandbank.z) < places.sandbank.within &&
      groundHeight > places.sandbank.groundAbove
    ) {
      return places.sandbank;
    }
    const isSwimming = groundHeight < playerConfig.swimming.below;
    if (!isSwimming) return null;

    const fromCentre = Math.hypot(x, z);
    const direction = Math.atan2(z, x);
    const shore = island.radius(direction);
    const lagoonEdge = shore - island.landWidth(direction) - places.lagoon.insideTheLand;
    if (fromCentre < lagoonEdge) return places.lagoon;
    if (fromCentre > shore + places.openWater.beyondTheShore) return places.openWater;
    return null;
  }

  return {
    update(x, z, groundHeight) {
      const place = intro.isRunning ? null : placeAt(x, z, groundHeight);
      if (place === shown) return;

      shown = place;
      if (place !== null) captions.show(place.title, place.subtitle, places.seconds);
    },
  };
}
