/** A row of buttons of which one is lit: the first to begin with, then whichever was pressed. */
export interface ChoiceRow {
  label: string;
  choices: readonly (readonly [text: string, value: number | null])[];
  choose(value: number | null): void;
}

/** A row that holds a control made elsewhere. */
export interface ControlRow {
  label: string;
  control: HTMLElement;
}

export type MenuRow = ChoiceRow | ControlRow;

export interface Menu {
  toggle(): void;
}

function choiceButtons(row: ChoiceRow): HTMLButtonElement[] {
  const buttons = row.choices.map(([text, value]) => {
    const button = document.createElement('button');
    button.className = 'mopt';
    button.textContent = text;
    button.addEventListener('click', () => {
      row.choose(value);
      for (const other of buttons) other.classList.toggle('on', other === button);
    });
    return button;
  });
  buttons[0]?.classList.add('on');
  return buttons;
}

function rowElement(row: MenuRow): HTMLElement {
  const element = document.createElement('div');
  element.className = 'mrow';
  const label = document.createElement('span');
  label.textContent = row.label;
  element.append(label);

  if ('control' in row) {
    // The page keeps such a control out of sight until it has a place to go.
    row.control.style.display = '';
    element.append(row.control);
  } else {
    element.append(...choiceButtons(row));
  }
  return element;
}

export function createMenu(parent: HTMLElement, rows: MenuRow[]): Menu {
  const menu = document.createElement('div');
  menu.id = 'menu';
  menu.hidden = true;
  menu.append(...rows.map(rowElement));

  // A touch on the menu must not also turn the camera.
  for (const type of ['pointerdown', 'touchstart', 'mousedown']) {
    menu.addEventListener(type, (event) => {
      event.stopPropagation();
    });
  }
  parent.append(menu);

  return {
    toggle() {
      menu.hidden = !menu.hidden;
    },
  };
}
