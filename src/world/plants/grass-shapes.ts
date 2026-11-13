import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  MeshLambertMaterial,
  type IUniform,
} from 'three';
import type { CrossedCards } from './grass-config';
import { lightLeavesFromBothSides } from './leaf-light';

/** Upright cards crossed at the middle, standing on y = 0. */
export function createCrossedCards({ count, width, height }: CrossedCards): BufferGeometry {
  const shape = new BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const corners: number[] = [];
  for (let card = 0; card < count; card++) {
    const direction = (card * Math.PI) / count + 0.3;
    const x = (Math.cos(direction) * width) / 2;
    const z = (Math.sin(direction) * width) / 2;
    const first = card * 4;
    positions.push(-x, 0, -z, x, 0, z, x, height, z, -x, height, -z);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    // Pointing up, not out of the card: a tuft takes the light as the ground it grows from does.
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    // Each card is one face, seen from both sides: the material is two-sided and lit the same on each.
    corners.push(first, first + 1, first + 2, first, first + 2, first + 3);
  }
  shape.setAttribute('position', new Float32BufferAttribute(positions, 3));
  shape.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  shape.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  shape.setIndex(corners);
  return shape;
}

/**
 * Each tuft sways on its own beat, set by where it stands. The bend grows with the square of the
 * height, so the foot stays put and the tips move most.
 */
function swayInTheWind(sway: number): string {
  return [
    '#include <begin_vertex>',
    '#ifdef USE_INSTANCING',
    ' float gph=instanceMatrix[3].x*.35+instanceMatrix[3].z*.27;float gw=sin(uTime*1.7+gph)+.5*sin(uTime*3.1+gph*1.7);',
    ` float gk=position.y*position.y*uWind*1.5*${sway.toFixed(3)};transformed.x+=gw*gk;transformed.z+=gw*gk*.6;`,
    '#endif',
  ].join('\n');
}

/**
 * The material of one kind of tuft: its picture, cut out where the picture is clear, lit the same
 * from both sides and bent by the wind. `name` must differ for each kind (leaf-light.ts says
 * why). `uniforms` are the ones every shader shares, read when the tuft is first drawn.
 */
export function createSwayingMaterial(
  picture: HTMLCanvasElement,
  sway: number,
  name: string,
  uniforms: Record<string, IUniform>,
): MeshLambertMaterial {
  const material = lightLeavesFromBothSides(
    new MeshLambertMaterial({ map: new CanvasTexture(picture), alphaTest: 0.45, side: DoubleSide }),
    name,
  );
  const lightLeaves = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    lightLeaves(shader, renderer);
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWind = uniforms.uWind;
    shader.vertexShader =
      'uniform float uTime,uWind;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', swayInTheWind(sway));
  };
  return material;
}
