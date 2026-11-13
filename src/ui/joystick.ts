import { uiConfig } from './ui-config';

export interface Joystick {
  /** How far the stick is pushed to the right, from -1 to 1. */
  readonly x: number;
  /** How far the stick is pushed towards the bottom of the screen, from -1 to 1. */
  readonly y: number;
}

export function createJoystick(pad: HTMLElement, knob: HTMLElement, onPress: () => void): Joystick {
  const travel = uiConfig.joystickTravel;
  let heldBy: number | null = null;
  let x = 0;
  let y = 0;

  function follow(event: PointerEvent): void {
    const bounds = pad.getBoundingClientRect();
    let dx = event.clientX - (bounds.left + bounds.width / 2);
    let dy = event.clientY - (bounds.top + bounds.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance > travel) {
      dx *= travel / distance;
      dy *= travel / distance;
    }
    x = dx / travel;
    y = dy / travel;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  }

  function release(event: PointerEvent): void {
    if (event.pointerId !== heldBy) return;

    heldBy = null;
    x = 0;
    y = 0;
    knob.style.transform = '';
  }

  pad.addEventListener('pointerdown', (event) => {
    onPress();
    heldBy = event.pointerId;
    try {
      pad.setPointerCapture(heldBy);
    } catch {
      // A pointer that has already lifted cannot be captured. The stick works without it.
    }
    follow(event);
    event.preventDefault();
  });
  pad.addEventListener('pointermove', (event) => {
    if (event.pointerId === heldBy) follow(event);
  });
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);

  return {
    get x() {
      return x;
    },
    get y() {
      return y;
    },
  };
}
