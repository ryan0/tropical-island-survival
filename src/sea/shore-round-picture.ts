import {
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RGBAFormat,
  RepeatWrapping,
} from 'three';
import { islandR, landW, reefShare } from 'virtual:island-shape';
import { FULL_TURN } from '../core/maths';
import { seaConfig } from './sea-config';

// The shore as it lies in each direction from the atoll's centre, as a picture one dot high: the
// water's shader reads it in place of working out the sines of the shore's formula for every dot
// it colours (water.frag.glsl, WATER_SHORE_FROM_PICTURE). On Ryan's phone arithmetic is dear and
// a texture reading costs next to nothing. It is made from the formula itself, so whatever the
// shore becomes, the picture follows.

const config = seaConfig.shoreRoundPicture;

/**
 * The picture: across it, the direction from the centre, from half a turn the one way to half a
 * turn the other (it wraps); in it, the ocean shoreline's distance from the centre less
 * `config.radiusKeptFrom` (kept small, so that a half float holds it to a few centimetres), the
 * reef's share of its full width, and the land's width. Half floats, smoothly filtered, without
 * mipmaps, so that it may be read anywhere (docs/DEVICE_NOTES.md).
 */
export function createShoreRoundPicture(): DataTexture {
  const halves = new Uint16Array(config.size * 4);
  for (let i = 0; i < config.size; i++) {
    const direction = ((i + 0.5) / config.size - 0.5) * FULL_TURN;
    halves[i * 4] = DataUtils.toHalfFloat(islandR(direction) - config.radiusKeptFrom);
    halves[i * 4 + 1] = DataUtils.toHalfFloat(reefShare(direction));
    halves[i * 4 + 2] = DataUtils.toHalfFloat(landW(direction));
    halves[i * 4 + 3] = DataUtils.toHalfFloat(1);
  }
  const picture = new DataTexture(halves, config.size, 1, RGBAFormat, HalfFloatType);
  picture.wrapS = RepeatWrapping;
  picture.wrapT = ClampToEdgeWrapping;
  picture.minFilter = picture.magFilter = LinearFilter;
  picture.needsUpdate = true;
  return picture;
}
