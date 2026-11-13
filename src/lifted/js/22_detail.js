/* A bridge. Build 78's 22_detail.js is now src/shaders/detail-texture.ts; this makes the detail texture at the same point
   in start-up. */
import './05_core.js';   /* first, so that the files still run in build 78's order */
import {createDetailTexture} from '../../shaders/detail-texture.ts';
import {renderer} from './05_core.js';

var detailTex=createDetailTexture(renderer.capabilities.getMaxAnisotropy());

export {detailTex};
