import {
  FrontSide,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Vector3,
  type BufferGeometry,
  type Material,
  type Quaternion,
  type Scene,
  type Side,
} from 'three';

/**
 * Many copies of one shape, drawn together. They cast no shadow: the shadow map is redrawn only
 * when the player moves on, so the shadow of anything that moves would be left behind.
 */
export function addInstances(
  scene: Scene,
  shape: BufferGeometry,
  material: Material,
  count: number,
): InstancedMesh {
  const mesh = new InstancedMesh(shape, material, count);
  // three.js would hide them all whenever the one shape at the origin is out of view.
  mesh.frustumCulled = false;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
}

/** White, for each copy's own colour to tint. */
export function whiteMaterial(side: Side = FrontSide): MeshLambertMaterial {
  return new MeshLambertMaterial({ color: 0xffffff, side });
}

/** For when every copy has its colour: three.js sends them on only when told. */
export function coloursAreSet(mesh: InstancedMesh): void {
  if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
}

export type PlaceInstance = (
  mesh: InstancedMesh,
  index: number,
  x: number,
  y: number,
  z: number,
  turn: Quaternion,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
) => void;

/** The returned function is safe to call every frame: it reuses its own working values. */
export function createInstancePlacer(): PlaceInstance {
  const position = new Vector3();
  const scale = new Vector3();
  const matrix = new Matrix4();

  return (mesh, index, x, y, z, turn, scaleX, scaleY, scaleZ) => {
    matrix.compose(position.set(x, y, z), turn, scale.set(scaleX, scaleY, scaleZ));
    mesh.setMatrixAt(index, matrix);
  };
}
