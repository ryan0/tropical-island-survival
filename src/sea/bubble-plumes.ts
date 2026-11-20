import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  type Scene,
  type Vector3,
} from 'three';
import { within, type Random, type Range } from '../core/random';
import fragmentShader from './bubble-plumes.frag.glsl';
import vertexShader from './bubble-plumes.vert.glsl';
import type { BreakingSpot, SprayBursts } from './spray-bursts';
import { sprayConfig } from './spray-config';
import type { WaveModel } from './wave-model';

// The bubbles breaking water drives under the surface are a pool of soft point sprites, puffs.
// Each is driven down, soon stopped by the water, and then rises and thins. A puff keeps its depth
// under the surface as a wave passes over it, as the water it is in rises and falls; so it is
// never drawn above the surface. Once all of them are in the water, each one released takes the
// place of the oldest.

/** Two of the uniforms every shader shares: where the eye is, and the water's own colour. */
export interface BubblePlumeUniforms {
  uCameraPosition: { value: Vector3 };
  uUnderWaterColour: { value: Color };
}

export interface BubblePlumeDependencies {
  scene: Scene;
  uniforms: BubblePlumeUniforms;
  random: Random;
  waves: WaveModel;
}

/** What breaking water does at a spot: throws spray into the air, or drives bubbles under. */
export type BreakingWaterBursts = Omit<SprayBursts, 'fromObstacle'>;

export interface BubblePlumes extends BreakingWaterBursts {
  /** Moves every puff in the water on by `dt` seconds; `time` is the clock the waves run by. */
  move(dt: number, time: number): void;
  /**
   * `focalLength` is in pixels: how many a metre spans at a metre away. `daylight` is 0 at night
   * and 1 in full day, `night` 0 by day and 1 at night.
   */
  show(focalLength: number, daylight: number, night: number): void;
}

/** How one kind of breaking water releases its puffs. */
interface Release {
  scatter: number;
  inwardSpeed: Range;
  downwardSpeed: Range;
  size: Range;
  seconds: Range;
  opacity: number;
}

const config = sprayConfig.bubblePlumes;

export function createBubblePlumes({
  scene,
  uniforms,
  random,
  waves,
}: BubblePlumeDependencies): BubblePlumes {
  const count = config.poolSize;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const lights = new Float32Array(count);
  const inwardX = new Float32Array(count);
  const inwardZ = new Float32Array(count);
  const depths = new Float32Array(count);
  const sinking = new Float32Array(count);
  const riseSpeeds = new Float32Array(count);
  const surfacesFound = new Float32Array(count);
  const surfaces = new Float32Array(count);
  const floors = new Float32Array(count);
  const secondsLeft = new Float32Array(count);
  const lifetimes = new Float32Array(count);
  const opacities = new Float32Array(count);
  const eye = uniforms.uCameraPosition.value;
  const lightFadesPerMetre = Math.LN2 / config.halfLightDepth;
  let next = 0;
  let nextSurfaceSampled = 0;

  const shape = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions, 3);
  shape.setAttribute('position', positionAttribute);
  const sizeAttribute = new BufferAttribute(sizes, 1);
  shape.setAttribute('aSize', sizeAttribute);
  const alphaAttribute = new BufferAttribute(alphas, 1);
  shape.setAttribute('aAlpha', alphaAttribute);
  const lightAttribute = new BufferAttribute(lights, 1);
  shape.setAttribute('aLight', lightAttribute);
  const plumeColour = new Color();
  const pixelsPerMetre = { value: 600 };
  const points = new Points(
    shape,
    new ShaderMaterial({
      uniforms: {
        uPixelsPerMetre: pixelsPerMetre,
        uPlumeColour: { value: plumeColour },
        uCameraPosition: uniforms.uCameraPosition,
        uUnderWaterColour: uniforms.uUnderWaterColour,
      },
      transparent: true,
      depthWrite: false,
      fog: false,
      vertexShader,
      fragmentShader,
    }),
  );
  // The shape's bounds are never measured again as the puffs move, so three.js must not use them.
  points.frustumCulled = false;
  // After the water: it is seen through it.
  points.renderOrder = 6;
  points.visible = false;
  scene.add(points);

  function isOutOfSight({ x, z, surface }: BreakingSpot): boolean {
    const dx = x - eye.x;
    const dy = surface - eye.y;
    const dz = z - eye.z;
    return dx * dx + dy * dy + dz * dz > config.releasedWithin * config.releasedWithin;
  }

  function release(spot: BreakingSpot, kind: Release): void {
    const i = next;
    next = (next + 1) % count;
    const inwardSpeed = within(random, kind.inwardSpeed);
    positions[i * 3] = spot.x + (random() - 0.5) * 2 * kind.scatter;
    positions[i * 3 + 2] = spot.z + (random() - 0.5) * 2 * kind.scatter;
    inwardX[i] = spot.inwardX * inwardSpeed;
    inwardZ[i] = spot.inwardZ * inwardSpeed;
    depths[i] = within(random, config.releasedBelow);
    sinking[i] = within(random, kind.downwardSpeed);
    riseSpeeds[i] = within(random, config.riseSpeed);
    surfacesFound[i] = spot.surface;
    surfaces[i] = spot.surface;
    // (until the floor under it is found, a puff is not kept off it)
    floors[i] = -Infinity;
    sizes[i] = within(random, kind.size);
    secondsLeft[i] = within(random, kind.seconds);
    lifetimes[i] = secondsLeft[i];
    opacities[i] = kind.opacity;
  }

  function fromLandingLip(spot: BreakingSpot): void {
    const lip = config.landingLip;
    if (isOutOfSight(spot) || random() >= lip.chance) return;
    const puffs = lip.fewestPuffs + Math.floor(random() * lip.puffsPerMetre * spot.breakerHeight);
    for (let i = 0; i < puffs; i++) release(spot, lip);
  }

  /** Asks for the surface over the next few puffs in the water, and the floor under them. */
  function findSurfaces(time: number): void {
    let sampled = 0;
    for (let looked = 0; looked < count && sampled < config.surfacesSampled; looked++) {
      const i = nextSurfaceSampled;
      nextSurfaceSampled = (nextSurfaceSampled + 1) % count;
      if (secondsLeft[i] <= 0) continue;
      surfacesFound[i] = waves.heightAt(positions[i * 3], positions[i * 3 + 2], time);
      floors[i] = waves.spot.groundHeight;
      sampled++;
    }
  }

  function moveOne(i: number, dt: number, settling: number, following: number): void {
    secondsLeft[i] -= dt;
    inwardX[i] -= inwardX[i] * settling;
    inwardZ[i] -= inwardZ[i] * settling;
    sinking[i] -= (sinking[i] + riseSpeeds[i]) * settling;
    const keptOff = sizes[i] * config.keptOffSurfaceAndFloor;
    depths[i] = Math.max(keptOff, depths[i] + sinking[i] * dt);
    surfaces[i] += (surfacesFound[i] - surfaces[i]) * following;
    // Driven down onto the floor, it rests on it until it has risen off it.
    const y = Math.max(floors[i] + keptOff, surfaces[i] - depths[i]);
    positions[i * 3] += inwardX[i] * dt;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] += inwardZ[i] * dt;
    sizes[i] += config.growth * dt;
    lights[i] = Math.exp((y - surfaces[i]) * lightFadesPerMetre);

    if (secondsLeft[i] <= 0) {
      alphas[i] = 0;
      sizes[i] = 0;
      return;
    }
    const fadingIn = Math.min(1, (lifetimes[i] - secondsLeft[i]) / config.fadeIn);
    const fadingOut = Math.min(1, secondsLeft[i] / (lifetimes[i] * config.fadeOutOver));
    alphas[i] = fadingIn * fadingOut * opacities[i];
  }

  return {
    // The white mass a landed lip throws up drives bubbles down as the lip itself does.
    fromBurstingCrest: fromLandingLip,
    fromLandingLip,

    fromFallingLip(spot) {
      if (isOutOfSight(spot)) return;
      release(spot, config.fallingLip);
    },

    fromBore(spot) {
      if (isOutOfSight(spot)) return;
      release(spot, config.bore);
    },

    move(dt, time) {
      findSurfaces(time);
      const settling = 1 - Math.exp(-config.drag * dt);
      const following = 1 - Math.exp(-config.surfaceFollowing * dt);
      let isAnyInWater = false;
      for (let i = 0; i < count; i++) {
        if (secondsLeft[i] <= 0) continue;
        moveOne(i, dt, settling, following);
        isAnyInWater = true;
      }
      points.visible = isAnyInWater;
      if (!isAnyInWater) return;
      positionAttribute.needsUpdate = true;
      sizeAttribute.needsUpdate = true;
      alphaAttribute.needsUpdate = true;
      lightAttribute.needsUpdate = true;
    },

    show(focalLength, daylight, night) {
      pixelsPerMetre.value = focalLength;
      // As bright as the light that comes down through the water, dim at night.
      const light = (1 - 0.8 * night) * (0.45 + 0.55 * daylight);
      const { colour } = config;
      plumeColour.setRGB(colour[0] * light, colour[1] * light, colour[2] * light);
    },
  };
}
