import type { PerspectiveCamera, WebGLRenderer } from 'three';

export interface View {
  /** The size of the window, in CSS pixels, as of the last update. */
  readonly width: number;
  readonly height: number;
  /** Fits the picture and the camera to the window if its size has changed. */
  update(): void;
}

// Degrees, top to bottom: wider on an upright phone, where the picture is narrow.
const FIELD_OF_VIEW_UPRIGHT = 72;
const FIELD_OF_VIEW_ON_ITS_SIDE = 60;

export function createView(renderer: WebGLRenderer, camera: PerspectiveCamera): View {
  let width = 0;
  let height = 0;

  return {
    get width() {
      return width;
    },
    get height() {
      return height;
    },

    update() {
      if (window.innerWidth === width && window.innerHeight === height) return;

      width = window.innerWidth;
      height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.fov = width < height ? FIELD_OF_VIEW_UPRIGHT : FIELD_OF_VIEW_ON_ITS_SIDE;
      camera.updateProjectionMatrix();
    },
  };
}
