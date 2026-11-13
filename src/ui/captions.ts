export interface Captions {
  show(title: string, subtitle: string, seconds: number): void;
  update(dt: number): void;
}

export function createCaptions(element: HTMLElement): Captions {
  let secondsLeft = 0;

  return {
    show(title, subtitle, seconds) {
      const heading = document.createElement('b');
      heading.textContent = title;
      const line = document.createElement('span');
      line.textContent = subtitle;
      element.replaceChildren(heading, line);
      element.style.opacity = '1';
      secondsLeft = seconds;
    },

    update(dt) {
      if (secondsLeft <= 0) return;

      secondsLeft -= dt;
      if (secondsLeft <= 0) element.style.opacity = '0';
    },
  };
}
