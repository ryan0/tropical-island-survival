export interface DebugSwitch {
  label: string;
  set(on: boolean): void;
  /** Whether it is on, where something other than its button can change that. */
  isOn?: () => boolean;
  /** A key that switches it too, whether or not the panel is open. */
  key?: string;
}

/** A button that does one thing each time it is pressed. */
export interface DebugAction {
  label: string;
  run: () => void;
}

export interface DebugPanel {
  toggle: () => void;
}

// What the panel reports changes as the page runs (the frame rate, the quality steps taken), so
// it is asked for again this often while the panel is open.
const REPORTED_EVERY_MILLISECONDS = 500;

function button(className: string, label: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement('button');
  element.className = className;
  element.textContent = label;
  element.addEventListener('click', () => {
    onClick();
    // Or the next press of Space, which flies upwards, would press this button again.
    element.blur();
  });
  return element;
}

/**
 * @param describe The lines of text at the top of the panel, asked for again and again while it is open.
 * @param actions A second row of buttons, under the heading `actionsHeading`.
 */
export function createDebugPanel(
  parent: HTMLElement,
  describe: () => string[],
  switches: DebugSwitch[],
  actionsHeading: string,
  actions: DebugAction[],
): DebugPanel {
  const report = document.createElement('div');
  report.className = 'debug-report';
  // Whether each switch is on, for those that do not say so themselves.
  const switchedOn = switches.map(() => false);
  let switchButtons: HTMLButtonElement[] = [];
  let panel: HTMLElement | null = null;
  let reporting: number | undefined;

  function isOn(index: number): boolean {
    return switches[index].isOn?.() ?? switchedOn[index];
  }

  function showWhichAreOn(): void {
    switchButtons.forEach((element, index) => element.classList.toggle('on', isOn(index)));
  }

  function flip(index: number): void {
    const on = !isOn(index);
    switchedOn[index] = on;
    switches[index].set(on);
    showWhichAreOn();
  }

  function writeReport(): void {
    report.textContent = describe().join('\n');
    showWhichAreOn();
  }

  function build(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'debug-panel';
    switchButtons = switches.map(({ label, key }, index) =>
      button('debug-switch', key === undefined ? label : `${label} (${key.toUpperCase()})`, () => {
        flip(index);
      }),
    );
    const heading = document.createElement('div');
    heading.className = 'debug-heading';
    heading.textContent = actionsHeading;
    element.append(
      report,
      ...switchButtons,
      heading,
      ...actions.map(({ label, run }) => button('debug-switch', label, run)),
    );
    return element;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const index = switches.findIndex(({ key }) => key === event.key.toLowerCase());
    if (index >= 0) flip(index);
  });

  return {
    toggle() {
      if (panel === null) {
        panel = build();
        parent.append(panel);
      } else {
        panel.hidden = !panel.hidden;
      }

      window.clearInterval(reporting);
      if (panel.hidden) return;
      writeReport();
      reporting = window.setInterval(writeReport, REPORTED_EVERY_MILLISECONDS);
    },
  };
}
