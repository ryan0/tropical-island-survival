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
  /**
   * The push upwards while flying, from -1 (down) to 1: Space climbs, C or Control sinks;
   * otherwise the buttons'. (Control with W closes the browser's tab, which no page can stop:
   * C is the safe key.)
   */
  climb(buttons: number): number;
  /** Whether Shift is held, to fly faster. */
  readonly isHurrying: boolean;
  /** How many times the usual speed to fly at, as the mouse wheel has set it. */
  readonly flyingPace: number;
}

const config = playerConfig.look;
const { pace } = playerConfig.flying;
// The keys that fly, which the browser would otherwise act on: Space presses whichever button was
// clicked last, and Control with S, D or A saves the page, bookmarks it or selects it all.
const KEYS_KEPT_FROM_THE_BROWSER = new Set([' ', 's', 'd', 'a']);

/** Dragging the picture looks round; W A S D or the arrows walk. Every press calls `onPress`. */
export function createLookAndKeys(canvas: HTMLCanvasElement, onPress: () => void): LookAndKeys {
  let yaw: number = playerConfig.start.yaw;
  let pitch: number = playerConfig.start.pitch;
  // Where each finger dragging the picture was when it last moved.
  const drags = new Map<number, { x: number; y: number }>();
  const held = new Set<string>();
  let flyingPace = 1;

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
    const key = event.key.toLowerCase();
    held.add(key);
    if (KEYS_KEPT_FROM_THE_BROWSER.has(key) && (key === ' ' || event.ctrlKey))
      event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.key.toLowerCase());
  });
  // A key let go while the page is not looking would otherwise stay held.
  window.addEventListener('blur', () => {
    held.clear();
  });
  canvas.addEventListener(
    'wheel',
    (event) => {
      const notches = -Math.sign(event.deltaY);
      flyingPace = Math.max(
        pace.slowest,
        Math.min(pace.fastest, flyingPace * pace.perWheelNotch ** notches),
      );
    },
    { passive: true },
  );

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

    climb(buttons) {
      if (held.has('c') || held.has('control')) return -1;
      if (held.has(' ')) return 1;
      return buttons;
    },

    get isHurrying() {
      return held.has('shift');
    },

    get flyingPace() {
      return flyingPace;
    },
  };
}
