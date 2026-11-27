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

/** A level set by sliding: for what only an eye can find the right amount of. */
export interface DebugSlider {
  label: string;
  lowest: number;
  highest: number;
  step: number;
  get: () => number;
  set: (value: number) => void;
}

/**
 * A group of the panel's controls under a heading: switches, buttons that each do one thing,
 * sliders, or any of them.
 */
export interface DebugSection {
  /** Left out for the first group, which needs none. */
  heading?: string;
  /**
   * Folded away, heading and all, until a switch of this name is on: the panel makes the switch
   * and puts it at the end of its first group. For controls that are seldom wanted and take room.
   */
  shownBy?: string;
  switches?: DebugSwitch[];
  actions?: DebugAction[];
  sliders?: DebugSlider[];
}

export interface DebugPanel {
  toggle: () => void;
}

// What the panel reports changes as the page runs (the frame rate, the quality steps taken), so
// it is asked for again this often while the panel is open.
const REPORTED_EVERY_MILLISECONDS = 500;

function slider({ label, lowest, highest, step, get, set }: DebugSlider): HTMLElement {
  const element = document.createElement('label');
  element.className = 'debug-slider';
  const name = document.createElement('span');
  const says = () => {
    name.textContent = `${label} ${get().toFixed(2)}`;
  };
  const range = document.createElement('input');
  range.type = 'range';
  range.min = String(lowest);
  range.max = String(highest);
  range.step = String(step);
  range.value = String(get());
  range.addEventListener('input', () => {
    set(Number(range.value));
    says();
  });
  says();
  element.append(name, range);
  return element;
}

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
 * @param sections The panel's buttons, group by group.
 */
export function createDebugPanel(
  parent: HTMLElement,
  describe: () => string[],
  sections: DebugSection[],
): DebugPanel {
  // (A folded section's own element is made when the panel is first opened: till then there is
  // nothing to show or hide.)
  const folded = sections.filter((section) => section.shownBy !== undefined);
  const elementOfFolded = new Map<DebugSection, HTMLElement>();
  const unfolding: DebugSwitch[] = folded.map((section) => ({
    label: section.shownBy ?? '',
    set(on) {
      const element = elementOfFolded.get(section);
      if (element !== undefined) element.hidden = !on;
    },
  }));
  const switches = [...sections.flatMap((section) => section.switches ?? []), ...unfolding];
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
    element.append(report);
    sections.forEach((section, place) => {
      // (a folded section is a block of its own, which its switch shows and hides)
      const into = section.shownBy === undefined ? element : document.createElement('div');
      if (into !== element) {
        into.hidden = !isOn(switches.indexOf(unfolding[folded.indexOf(section)]));
        elementOfFolded.set(section, into);
        element.append(into);
      }
      if (section.heading !== undefined) {
        const heading = document.createElement('div');
        heading.className = 'debug-heading';
        heading.textContent = section.heading;
        into.append(heading);
      }
      for (const one of section.switches ?? []) into.append(switchButtons[switches.indexOf(one)]);
      for (const { label, run } of section.actions ?? []) {
        into.append(button('debug-switch', label, run));
      }
      for (const one of section.sliders ?? []) into.append(slider(one));
      if (place === 0) {
        for (const one of unfolding) element.append(switchButtons[switches.indexOf(one)]);
      }
    });
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
