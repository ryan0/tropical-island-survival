import {
  BufferAttribute,
  Group,
  Mesh,
  MeshLambertMaterial,
  ShaderChunk,
  type BufferGeometry,
  type IUniform,
  type Scene,
  type WebGLRenderer,
} from 'three';
import type { Random } from '../core/random';
import { CAUSTICS_BRIGHTEST } from '../shaders/caustics-texture';
import { glslFloat, glslVec2, glslVec3 } from '../shaders/defines';
import { withColouring } from '../shaders/sunlight-under-water';
import { createGroundGrit } from './ground-grit';
import { createGroundNoise, createGroundRandoms } from './ground-noise';
import type { GroundTiles } from './ground-tiles/ground-tiles';
import type { GroundHeight, Landmarks, Point } from './landmarks';
import { seaConfig } from '../sea/sea-config';
import { reefConfig } from './reef/reef-config';
import { createReefCoverPicture } from './reef-cover-picture';
import { createSandRippleSlopes } from './sand-ripples';
import type { SeaBedPicture } from './sea-bed/sea-bed-picture';
import colourShader from './terrain-colour.glsl';
import declarations from './terrain-declarations.glsl';
import { createTerrainShape, cutIntoTiles } from './terrain-shape';
import { createTurfPicture, turfPictureDefines } from './turf-picture';
import { worldConfig } from './world-config';

/** The shared uniforms the ground's colouring reads. */
const SHARED_UNIFORMS = [
  'uDebugMode',
  'uTime',
  'uSeaLevel',
  'uUnderWater',
  'uDaylight',
  'uSkyHorizon',
  'uDetail',
  'uCaustics',
  'uCloudShadeMap',
  'uReefMap',
  'uTreeCover',
  'uShoreRound',
  'uWind',
  'uLightNetShare',
  'uGroundSeenDotByDot',
  'uCameraPosition',
  'uSunDirection',
] as const;

export interface TerrainDependencies {
  scene: Scene;
  /** Draws the picture of the reef's cover, once. */
  renderer: WebGLRenderer;
  /** The terrain's own stream: it speckles the grit. */
  random: Random;
  /** A stream of its own for the ripples in the sea floor's sand. */
  randomOfRipples: Random;
  /** The pictures of what lies on the ground. */
  groundTiles: GroundTiles;
  /** The picture of the reef's hard floor and of lived-in sand. */
  seaBed: SeaBedPicture;
  groundHeight: GroundHeight;
  landmarks: Landmarks;
  /** The uniforms every shader shares. They are read when the ground is first drawn. */
  uniforms: Record<string, IUniform>;
  /** The way the wind blows, level and of unit length (x, z). */
  windDirection: readonly [number, number];
  /** The side of the square the map of cloud shadows covers, in metres. */
  cloudShadeSpan: number;
}

/** The colour of each corner of the ground: sand, darker where wet, grass higher up, rock at the top. */
function cornerColours(heights: BufferAttribute, shape: BufferGeometry): Float32Array {
  const position = shape.getAttribute('position');
  const colours = new Float32Array(heights.count * 3);
  for (let i = 0; i < heights.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const height = heights.getY(i);
    const patchiness = 0.5 + 0.5 * Math.sin(x * 1.7 + z * 0.9) * Math.sin(z * 1.3 - x * 0.6);
    let red = 0.97;
    let green = 0.89;
    let blue = 0.71;
    if (height < 0.25) {
      const wetness = Math.max(0, Math.min(1, (0.25 - height) / 0.5));
      red -= 0.2 * wetness;
      green -= 0.17 * wetness;
      blue -= 0.2 * wetness;
    }
    const grass = Math.max(0, Math.min(1, (height - 1.3 - patchiness * 0.5) / 0.9));
    let grassRed = 0.26 + 0.1 * patchiness;
    let grassGreen = 0.52 + 0.1 * patchiness;
    let grassBlue = 0.2;
    const rock = Math.max(0, Math.min(1, (height - 10.5) / 2.5));
    grassRed += (0.42 - grassRed) * rock;
    grassGreen += (0.44 - grassGreen) * rock;
    grassBlue += (0.36 - grassBlue) * rock;
    red += (grassRed - red) * grass;
    green += (grassGreen - green) * grass;
    blue += (grassBlue - blue) * grass;
    colours[i * 3] = red;
    colours[i * 3 + 1] = green;
    colours[i * 3 + 2] = blue;
  }
  return colours;
}

function asVec2({ x, z }: Point): string {
  return `vec2(${x.toFixed(2)},${z.toFixed(2)})`;
}

/** The same stretches of path are written into the shader, so that grass thins out along them there too. */
function footpathStatements(landmarks: Landmarks): string {
  return landmarks.paths
    .map(
      ([from, to]) =>
        `nearest = min(nearest, distanceToSegment(p, ${asVec2(from)}, ${asVec2(to)}));`,
    )
    .join('');
}

/** How far ground under water is lit as if level, and the depths between which that comes in. */
const scatteredLight = { most: 0.7, fromDepth: 0.3, byDepth: 2.5 };

/**
 * Under water the sun's light comes scattered by the surface and by the water itself, from all
 * round: a wall of the sea floor that faces away from the sun is not dark as it would be in air.
 * So ground more than a little under water is lit as if it lay more nearly level. (It runs after
 * three.js has the vertex's normal and before it lights it.)
 */
// three.js looks a dot's shadow up at the place its triangle has for it. In the picture of what
// is under the sea a dot of the ground shows another point (terrain-colour.glsl): the shadow is
// looked up there, by the shift the colouring works out.
const SHADOW_PLACE = 'vDirectionalShadowCoord[ i ]';
if (!ShaderChunk.shadowmask_pars_fragment.includes(SHADOW_PLACE)) {
  throw new Error("three.js no longer looks the sun's shadow up as expected");
}
const SHADOW_WHERE_SHOWN = ShaderChunk.shadowmask_pars_fragment.replace(
  SHADOW_PLACE,
  `( ${SHADOW_PLACE} + groundShadowShift )`,
);

const LIGHT_UNDER_WATER = `
  float lightScattered = ${glslFloat(scatteredLight.most)}
    * smoothstep(${glslFloat(scatteredLight.fromDepth)}, ${glslFloat(scatteredLight.byDepth)}, uSeaLevel - vGroundPosition.y);
  transformedNormal = normalize(mix(transformedNormal, (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz, lightScattered));
`;

export interface Terrain {
  /** Its tiles: each is left out by three.js when it is out of view. */
  tiles: Group;
  /**
   * Its material. With the define TERRAIN_BARE (a debug switch) none of the colouring is worked
   * out: the ground is drawn in the plain colour of its corners, to read what the colouring costs.
   */
  material: MeshLambertMaterial;
}

/** The ground and how it is coloured: sand, grass, rock, wet sand, the net of light on the sea floor. */
export function createTerrain(dependencies: TerrainDependencies): Terrain {
  const { scene, renderer, random, groundHeight, landmarks, uniforms, windDirection } =
    dependencies;
  const { groundTiles, seaBed } = dependencies;
  const shape = createTerrainShape(groundHeight);
  const corners = shape.getAttribute('position') as BufferAttribute;
  shape.setAttribute('color', new BufferAttribute(cornerColours(corners, shape), 3));
  shape.computeVertexNormals();
  const grit = createGroundGrit(
    random,
    createSandRippleSlopes(dependencies.randomOfRipples, worldConfig.terrain.gritSize),
  );
  const groundNoise = createGroundNoise();
  const groundRandoms = createGroundRandoms();
  const reefCover = createReefCoverPicture(renderer);
  const turfPatterns = createTurfPicture(renderer);
  const material = new MeshLambertMaterial({ vertexColors: true, map: grit.texture });
  material.defines = {
    TERRAIN_FOOTPATHS: footpathStatements(landmarks),

    REEF_MAP_SPAN: glslFloat(reefConfig.mapSpan),
    LAGOON_WIND_DIRECTION: glslVec2(windDirection[0], windDirection[1]),
    CLOUD_SHADE_SPAN_M: glslFloat(dependencies.cloudShadeSpan),
    CAUSTICS_BRIGHTEST: glslFloat(CAUSTICS_BRIGHTEST),
    GROUND_NOISE_PERIOD: glslFloat(worldConfig.groundNoise.period),
    GROUND_RANDOMS_SIZE: glslFloat(worldConfig.groundNoise.randomsSize),
    REEF_COVER_SPAN: glslFloat(worldConfig.reefCoverPicture.span),
    ...turfPictureDefines,
    SHORE_ROUND_FROM: glslFloat(seaConfig.shoreRoundPicture.radiusKeptFrom),
    TREE_COVER_SPAN: glslFloat(worldConfig.treeCoverMap.span),
    GRAVEL_TILE_SPAN: glslFloat(groundTiles.gravel.span),
    LITTER_TILE_SPAN: glslFloat(groundTiles.litter.span),
    LOW_PLANTS_TILE_SPAN: glslFloat(groundTiles.lowPlants.span),
    GRAVEL_FULL_COVER: glslFloat(worldConfig.groundTiles.fullCover.gravel),
    LITTER_FULL_COVER: glslFloat(worldConfig.groundTiles.fullCover.litter),
    LOW_PLANTS_FULL_COVER: glslFloat(worldConfig.groundTiles.fullCover.lowPlants),
    SAND_RIPPLES_SPAN: glslFloat(worldConfig.sandRipples.span),
    SEA_BED_SPAN: glslFloat(seaBed.span),
    SEA_BED_AVERAGES: `vec4(${seaBed.averages.map(glslFloat).join(',')})`,
    GRAVEL_AVERAGE_COLOUR: glslVec3(...groundTiles.gravel.averageColour),
  };
  // The colouring runs inside three.js's own Lambert shader, so its lighting and shadows still apply.
  material.onBeforeCompile = (shader, renderer) => {
    for (const name of SHARED_UNIFORMS) shader.uniforms[name] = uniforms[name];
    shader.uniforms.uGritAverage = { value: grit.mean };
    shader.uniforms.uGroundNoise = { value: groundNoise };
    shader.uniforms.uGroundRandoms = { value: groundRandoms };
    shader.uniforms.uReefCover = { value: reefCover };
    shader.uniforms.uTurfPatterns = { value: turfPatterns };
    shader.uniforms.uGravelTile = { value: groundTiles.gravel.texture };
    shader.uniforms.uLitterTile = { value: groundTiles.litter.texture };
    shader.uniforms.uLowPlantsTile = { value: groundTiles.lowPlants.texture };
    shader.uniforms.uSeaBed = { value: seaBed.texture };
    // The lines of equal depth, drawn when the sea is drained, need to know how much the depth
    // changes across a pixel, which only WebGL 2 tells without asking.
    const canMeasureAcrossPixel = renderer.capabilities.isWebGL2
      ? '#define CAN_MEASURE_ACROSS_A_PIXEL\n'
      : '';
    shader.vertexShader =
      'uniform float uSeaLevel;\nvarying vec3 vGroundPosition;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>\n vGroundPosition=(modelMatrix*vec4(transformed,1.)).xyz;\n${LIGHT_UNDER_WATER}`,
      );
    shader.fragmentShader =
      canMeasureAcrossPixel +
      declarations +
      withColouring(
        shader.fragmentShader.replace('#include <shadowmask_pars_fragment>', SHADOW_WHERE_SHOWN),
        // (Bare, the ground is its corners' colour with the grit: only the green of the grit's
        // picture is grit, ground-grit.ts.)
        `\n#ifndef TERRAIN_BARE\n${colourShader}\n#else\ndiffuseColor.rgb = diffuse * vColor * texelColor.g;\n#endif\n`,
      );
  };

  const tiles = new Group();
  for (const tileShape of cutIntoTiles(shape)) {
    const tile = new Mesh(tileShape, material);
    tile.matrixAutoUpdate = false;
    tile.receiveShadow = true;
    // Drawn after the plants, rocks and props: its costly colouring is then skipped wherever they hide
    // the ground.
    tile.renderOrder = 1;
    tiles.add(tile);
  }
  scene.add(tiles);
  return { tiles, material };
}
