import { uiConfig } from './ui-config';

export interface CornerButtonActions {
  onTap(): void;
  onLongPress(): void;
}

export function watchCornerButton(button: HTMLElement, actions: CornerButtonActions): void {
  let wasLongPress = false;
  let timer = 0;

  button.addEventListener('pointerdown', () => {
    wasLongPress = false;
    timer = window.setTimeout(() => {
      wasLongPress = true;
      actions.onLongPress();
    }, uiConfig.longPressMilliseconds);
  });
  button.addEventListener('pointerup', () => {
    window.clearTimeout(timer);
  });
  button.addEventListener('pointerleave', () => {
    window.clearTimeout(timer);
  });
  button.addEventListener('click', () => {
    // Lifting the finger after a long press also arrives as a click, which must not open the menu.
    if (wasLongPress) {
      wasLongPress = false;
      return;
    }
    actions.onTap();
  });
}
