export interface FlyButtons {
  /** 1 while the up button is held, -1 while the down button is, otherwise 0. */
  readonly climb: number;
  /** Whether the `fast` button is on. */
  readonly isFast: boolean;
  show(isShown: boolean): void;
}

/** A button that counts as pressed for as long as a finger rests on it. */
function heldButton(label: string, onChange: (isHeld: boolean) => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'fly-button';
  button.textContent = label;
  button.addEventListener('pointerdown', (event) => {
    onChange(true);
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that has already lifted cannot be captured. The button works without it.
    }
    event.preventDefault();
  });
  const release = () => {
    onChange(false);
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  return button;
}

/**
 * The buttons that fly the eye up and down on a phone, and make it fly fast: a keyboard has
 * Space, C and Shift for these. They are shown only while flying.
 */
export function createFlyButtons(parent: HTMLElement): FlyButtons {
  let climb = 0;
  let isFast = false;
  const fast = document.createElement('button');
  fast.className = 'fly-button';
  fast.textContent = 'fast';
  fast.addEventListener('click', () => {
    isFast = fast.classList.toggle('on');
    fast.blur();
  });

  const pad = document.createElement('div');
  pad.className = 'fly-buttons';
  pad.hidden = true;
  pad.append(
    heldButton('\u25B2', (isHeld) => {
      climb = isHeld ? 1 : 0;
    }),
    fast,
    heldButton('\u25BC', (isHeld) => {
      climb = isHeld ? -1 : 0;
    }),
  );
  parent.append(pad);

  return {
    get climb() {
      return climb;
    },
    get isFast() {
      return isFast;
    },
    show(isShown) {
      pad.hidden = !isShown;
      if (!isShown) climb = 0;
    },
  };
}
