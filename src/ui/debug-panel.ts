export interface DebugSwitch {
  label: string;
  set(on: boolean): void;
}

export interface DebugPanel {
  toggle: () => void;
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

// What the panel reports changes as the page runs (the frame rate, the quality steps taken), so
// it is asked for again this often while the panel is open.
const REPORTED_EVERY_MILLISECONDS = 500;

/** @param describe The lines of text at the top of the panel, asked for again and again while it is open. */
export function createDebugPanel(
  parent: HTMLElement,
  describe: () => string[],
  switches: DebugSwitch[],
): DebugPanel {
  const report = document.createElement('div');
  report.className = 'debug-report';
  let panel: HTMLElement | null = null;
  let reporting: number | undefined;

  function writeReport(): void {
    report.textContent = describe().join('\n');
  }

  function build(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'debug-panel';
    element.append(report, ...switches.map(switchButton));
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

      window.clearInterval(reporting);
      if (panel.hidden) return;
      writeReport();
      reporting = window.setInterval(writeReport, REPORTED_EVERY_MILLISECONDS);
    },
  };
}
