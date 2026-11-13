export interface DebugSwitch {
  label: string;
  set(on: boolean): void;
}

export interface DebugPanel {
  toggle(): void;
}

function switchButton(debugSwitch: DebugSwitch): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'debug-switch';
  button.textContent = debugSwitch.label;
  button.addEventListener('click', () => {
    const on = button.classList.toggle('on');
    debugSwitch.set(on);
  });
  return button;
}

/**
 * @param describe The lines of text at the top of the panel. Asked for once, when the panel is
 *   first opened: what it reports (the GPU, the quality steps taken) is not known earlier.
 */
export function createDebugPanel(
  parent: HTMLElement,
  describe: () => string[],
  switches: DebugSwitch[],
): DebugPanel {
  let panel: HTMLElement | null = null;

  function build(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'debug-panel';
    for (const line of describe()) element.append(line, document.createElement('br'));
    element.append(...switches.map(switchButton));
    return element;
  }

  return {
    toggle() {
      if (panel === null) {
        panel = build();
        parent.append(panel);
      } else {
        panel.hidden = !panel.hidden;
      }
    },
  };
}
