// A board: materials, and for each the parts of reference photographs and of our own views that
// show it (boards/*.json). colour-board.ts and busyness.ts measure one.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Part } from './picture-parts.ts';

const repository = path.resolve(import.meta.dirname, '../..');
const REFERENCE_PHOTOS = path.join(repository, 'reference-photos');

/** A picture and the squares of its grid, as a board names them. */
type NamedPart = readonly [name: string, cells: string];

export interface Material {
  name: string;
  /** Photographs by their path under reference-photos/, which each machine keeps for itself. */
  photos: NamedPart[];
  /** Our views by name (look-views.ts): each is looked for in the folder of pictures given. */
  ours: NamedPart[];
}

export function readBoard(file: string): Material[] {
  const board = JSON.parse(readFileSync(file, 'utf8')) as { materials: Material[] };
  return board.materials;
}

export function photoParts(material: Material): Part[] {
  return material.photos.map(([photo, cells]) => [path.join(REFERENCE_PHOTOS, photo), cells]);
}

/** The material's parts of our views, as drawn into `folder` by draw-views.ts. */
export function ourParts(material: Material, folder: string): Part[] {
  return material.ours.map(([view, cells]) => [path.join(folder, `${view}.png`), cells]);
}
