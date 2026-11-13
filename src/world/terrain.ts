import {
  BufferAttribute,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  type BufferGeometry,
  type IUniform,
  type Scene,
} from 'three';
import type { Random } from '../core/random';
import { glslFloat, glslVec2 } from '../shaders/defines';
import { createGroundGrit } from './ground-grit';
import type { GroundHeight, Landmarks, Point } from './landmarks';
import colourShader from './terrain-colour.glsl';
import declarations from './terrain-declarations.glsl';
import { worldConfig } from './world-config';

/** The shared uniforms the ground's colouring reads. */
const SHARED_UNIFORMS = [
  'uTime',
  'uLevel',
  'uDay',
  'uHor',
  'uDet',
  'uCloudShade',
  'uReef',
  'uWind',
  'uCam',
  'uSunDir',
] as const;

export interface TerrainDependencies {
  scene: Scene;
  /** The terrain's own stream: it speckles the grit. */
  random: Random;
  groundHeight: GroundHeight;
  landmarks: Landmarks;
  /** The uniforms every shader shares. They are read when the ground is first drawn. */
  uniforms: Record<string, IUniform>;
  /** The way the wind blows, level and of unit length (x, z). */
  windDirection: readonly [number, number];
  /** The side of the square the map of cloud shadows covers, in metres. */
  cloudShadeSpan: number;
}

const config = worldConfig.terrain;

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

/**
 * Nearly half of the square is the flat sea floor beyond the reef. Those grid squares are left
 * out and the whole floor is drawn as one big rectangle instead: the same picture, about
 * 60,000 fewer triangles every frame.
 */
function cornerOrderWithoutSeaFloor(heights: BufferAttribute): number[] {
  const cornersAcross = config.squares + 1;
  const isAboveFloor = (corner: number) => heights.getY(corner) > config.seaFloor;
  const cornerOrder: number[] = [];
  for (let row = 0; row < config.squares; row++) {
    for (let column = 0; column < config.squares; column++) {
      const a = column + cornersAcross * row;
      const b = a + cornersAcross;
      if (isAboveFloor(a) || isAboveFloor(a + 1) || isAboveFloor(b) || isAboveFloor(b + 1)) {
        cornerOrder.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const lastRow = cornersAcross * (cornersAcross - 1);
  const lastCorner = cornersAcross * cornersAcross - 1;
  cornerOrder.push(0, lastRow, cornersAcross - 1, lastRow, lastCorner, cornersAcross - 1);
  return cornerOrder;
}

function createShape(groundHeight: GroundHeight): BufferGeometry {
  const shape = new PlaneGeometry(config.size, config.size, config.squares, config.squares);
  shape.rotateX(-Math.PI / 2);
  const position = shape.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    position.setY(i, groundHeight(position.getX(i), position.getZ(i)));
  }
  shape.setAttribute('color', new BufferAttribute(cornerColours(position, shape), 3));
  shape.setIndex(cornerOrderWithoutSeaFloor(position));
  shape.computeVertexNormals();
  return shape;
}

function asVec2({ x, z }: Point): string {
  return `vec2(${x.toFixed(2)},${z.toFixed(2)})`;
}

/** The same stretches of path are written into the shader, so that grass thins out along them there too. */
function footpathStatements(landmarks: Landmarks): string {
  return landmarks.paths
    .map(([from, to]) => `d=min(d,sdSeg(p,${asVec2(from)},${asVec2(to)}));`)
    .join('');
}

/** The ground and how it is coloured: sand, grass, rock, wet sand, the net of light on the sea floor. */
export function createTerrain(dependencies: TerrainDependencies): void {
  const { scene, random, groundHeight, landmarks, uniforms, windDirection } = dependencies;
  const shape = createShape(groundHeight);
  const grit = createGroundGrit(random);
  const material = new MeshLambertMaterial({ vertexColors: true, map: grit.texture });
  material.defines = {
    TERRAIN_FOOTPATHS: footpathStatements(landmarks),
    TERRAIN_HOME: glslVec2(landmarks.home.x, landmarks.home.z),
    LAGOON_WIND_DIRECTION: glslVec2(windDirection[0], windDirection[1]),
    CLOUD_SHADE_SPAN_M: glslFloat(dependencies.cloudShadeSpan),
  };
  // The colouring runs inside three.js's own Lambert shader, so its lighting and shadows still apply.
  material.onBeforeCompile = (shader) => {
    for (const name of SHARED_UNIFORMS) shader.uniforms[name] = uniforms[name];
    shader.uniforms.uGritMean = { value: grit.mean };
    shader.vertexShader =
      'varying vec3 vWp;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n vWp=(modelMatrix*vec4(transformed,1.)).xyz;',
      );
    shader.fragmentShader =
      declarations +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n{${colourShader}}`,
      );
  };

  const terrain = new Mesh(shape, material);
  terrain.receiveShadow = true;
  // Drawn after the plants, rocks and props: its costly colouring is then skipped wherever they hide the ground.
  terrain.renderOrder = 1;
  scene.add(terrain);
}
