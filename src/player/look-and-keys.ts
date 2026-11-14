import { playerConfig } from './player-config';

export interface LookAndKeys {
  /** Which way the player looks: turned about the vertical, and tipped up or down. */
  readonly yaw: number;
  readonly pitch: number;
  face(yaw: number, pitch: number): void;
  /** The push forward, from -1 (back) to 1: the keys' while one is held, otherwise the stick's. */
  forward(stick: number): number;
  /** The push to the right, from -1 (left) to 1: likewise. */
  sideways(stick: number): number;
  /** The left and right arrow keys turn the view while they are held. */
  turn(dt: number): void;
}

const config = playerConfig.look;

/** Dragging the picture looks round; W A S D or the arrows walk. Every press calls `onPress`. */
export function createLookAndKeys(canvas: HTMLCanvasElement, onPress: () => void): LookAndKeys {
  let yaw: number = playerConfig.start.yaw;
  let pitch: number = playerConfig.start.pitch;
  // Where each finger dragging the picture was when it last moved.
  const drags = new Map<number, { x: number; y: number }>();
  const held = new Set<string>();

  canvas.addEventListener('pointerdown', (event) => {
    onPress();
    drags.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that has already lifted cannot be captured. Looking works without it.
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    const drag = drags.get(event.pointerId);
    if (drag === undefined) return;

    yaw -= (event.clientX - drag.x) * config.perPixel;
    pitch -= (event.clientY - drag.y) * config.perPixel;
    pitch = Math.max(-config.steepest, Math.min(config.steepest, pitch));
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  const endDrag = (event: PointerEvent) => {
    drags.delete(event.pointerId);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  window.addEventListener('keydown', (event) => {
    onPress();
    held.add(event.key.toLowerCase());
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.key.toLowerCase());
  });

  return {
    get yaw() {
      return yaw;
    },
    get pitch() {
      return pitch;
    },

    face(newYaw, newPitch) {
      yaw = newYaw;
      pitch = newPitch;
    },

    forward(stick) {
      if (held.has('s') || held.has('arrowdown')) return -1;
      if (held.has('w') || held.has('arrowup')) return 1;
      return stick;
    },

    sideways(stick) {
      if (held.has('d')) return 1;
      if (held.has('a')) return -1;
      return stick;
    },

    turn(dt) {
      if (held.has('arrowleft')) yaw += dt * config.arrowTurnRate;
      if (held.has('arrowright')) yaw -= dt * config.arrowTurnRate;
    },
  };
}
