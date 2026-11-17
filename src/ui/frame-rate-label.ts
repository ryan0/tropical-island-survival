export interface FrameRateLabel {
  readonly isShown: boolean;
  show: (isShown: boolean) => void;
  /** Writes the frame rate, once there is one to write: the page is touched only when it changes. */
  update(framesPerSecond: number): void;
}

/**
 * The frame rate in the corner of the screen, so that the phone can report it without the debug
 * panel open over the picture. It is shown until the panel's switch hides it.
 */
export function createFrameRateLabel(parent: HTMLElement): FrameRateLabel {
  const label = document.createElement('div');
  label.className = 'frame-rate';
  parent.append(label);
  let written = 0;

  return {
    get isShown() {
      return !label.hidden;
    },

    show(isShown) {
      label.hidden = !isShown;
    },

    update(framesPerSecond) {
      const whole = Math.round(framesPerSecond);
      if (whole === written) return;

      written = whole;
      label.textContent = whole > 0 ? `${whole} fps` : '';
    },
  };
}
