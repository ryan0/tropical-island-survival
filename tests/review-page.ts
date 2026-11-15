import {
  PICTURES_FOLDER,
  type FindingRecord,
  type PictureRecord,
  type ReviewRecord,
  type Verdict,
} from './review-records';

// The review page: what a run found, changed things first, each picture before and after.
// It is one HTML file beside its pictures, opened straight from the disk.

export interface ReviewHeading {
  /** The reference build, or why there is none. */
  before: string;
  /** The working files. */
  after: string;
  drawnAt: string;
}

/** A picture as the page's own script needs it. */
interface ViewedPicture {
  address: string;
  isChanged: boolean;
  /** Width over height. */
  ratio: string;
  caption: string;
}

export const VERDICT_WORDS: Record<Verdict, string> = {
  changed: 'changed',
  new: 'nothing to compare with',
  same: 'the same',
};

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function describeChange(picture: PictureRecord): string {
  const share = (100 * picture.differingShare).toFixed(2);
  return `${share}% of the pixels differ, by up to ${picture.largestDifference} of 255`;
}

function address(picture: PictureRecord): string {
  return `${PICTURES_FOLDER}/${encodeURIComponent(picture.file)}`;
}

function ratio(picture: PictureRecord): string {
  return (picture.width / picture.height).toFixed(4);
}

// A changed picture's file holds three side by side; `panel` picks which one the frame shows.
function frame(picture: PictureRecord, index: number, panel = ''): string {
  const kind = picture.verdict === 'changed' ? `of-three ${panel}` : '';
  const style = `--picture: url('${address(picture)}'); --ratio: ${ratio(picture)}`;
  return `<button class="frame ${kind}" data-index="${index}" style="${style}"></button>`;
}

function changedCard(picture: PictureRecord, index: number): string {
  const panels = ['before', 'after', 'difference']
    .map(
      (panel) =>
        `<figure>${frame(picture, index, panel)}<figcaption>${panel}</figcaption></figure>`,
    )
    .join('');
  return `<article>
      <h3>${escapeHtml(picture.name)} <small>${escapeHtml(picture.shows)}</small></h3>
      <p>${escapeHtml(picture.when)}<br /><b>${describeChange(picture)}</b></p>
      <div class="three">${panels}</div>
    </article>`;
}

function smallCard(picture: PictureRecord, index: number): string {
  const caption = `${escapeHtml(picture.name)}<br /><small>${escapeHtml(picture.when)}</small>`;
  return `<figure>${frame(picture, index)}<figcaption>${caption}</figcaption></figure>`;
}

function findingRow(finding: FindingRecord): string {
  const details =
    finding.details.length === 0
      ? ''
      : `<details><summary>${finding.details.length} lines</summary><pre>${escapeHtml(
          finding.details.join('\n'),
        )}</pre></details>`;
  return `<li><span class="verdict ${finding.verdict}">${VERDICT_WORDS[finding.verdict]}</span>
      <b>${escapeHtml(finding.name)}</b> <small>${escapeHtml(finding.shows)}</small>${details}</li>`;
}

// Runs in the page. One picture at a time, large; holding it down, or the space bar, shows the
// picture from before in its place, which shows a small shift far better than two side by side.
function runViewer(pictures: ViewedPicture[]): void {
  const BLINK_MILLISECONDS = 600;

  function element(selector: string): HTMLElement {
    const found = document.querySelector<HTMLElement>(selector);
    if (found === null) throw new Error(`the page has no ${selector}`);
    return found;
  }
  const viewer = element('#viewer');
  const large = element('#large');
  const showing = element('#showing');
  const caption = element('#caption');

  let open = -1;
  let panel = 'after';
  let blink: number | undefined;

  function show(wanted: string): void {
    const picture = pictures[open];
    panel = wanted;
    large.className = picture.isChanged ? `frame of-three ${panel}` : 'frame';
    showing.textContent = picture.isChanged ? panel : 'after';
  }

  function stopBlinking(): void {
    window.clearInterval(blink);
    blink = undefined;
  }

  function openAt(index: number): void {
    stopBlinking();
    open = (index + pictures.length) % pictures.length;
    large.style.setProperty('--picture', `url('${pictures[open].address}')`);
    large.style.setProperty('--ratio', pictures[open].ratio);
    caption.textContent = pictures[open].caption;
    viewer.hidden = false;
    show('after');
  }

  function close(): void {
    stopBlinking();
    viewer.hidden = true;
    open = -1;
  }

  function toggleBlinking(): void {
    if (blink !== undefined) {
      stopBlinking();
      show('after');
      return;
    }
    blink = window.setInterval(() => {
      show(panel === 'before' ? 'after' : 'before');
    }, BLINK_MILLISECONDS);
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const frame = event.target.closest<HTMLElement>('[data-index]');
    if (frame !== null) openAt(Number(frame.dataset.index));
    else if (event.target === viewer) close();
  });
  large.addEventListener('pointerdown', () => {
    stopBlinking();
    show('before');
  });
  window.addEventListener('pointerup', () => {
    if (open >= 0 && blink === undefined && panel === 'before') show('after');
  });
  document.addEventListener('keydown', (event) => {
    if (open < 0) return;
    if (event.key === ' ') {
      event.preventDefault();
      stopBlinking();
      show('before');
    } else if (event.key === 'd') {
      stopBlinking();
      show(panel === 'difference' ? 'after' : 'difference');
    } else if (event.key === 'b') toggleBlinking();
    else if (event.key === 'ArrowRight') openAt(open + 1);
    else if (event.key === 'ArrowLeft') openAt(open - 1);
    else if (event.key === 'Escape') close();
  });
  document.addEventListener('keyup', (event) => {
    if (open >= 0 && event.key === ' ') show('after');
  });
}

const STYLE = `
  :root { color-scheme: dark; }
  body { margin: 0; padding: 24px 28px 80px; background: #15171a; color: #e8eaed;
    font: 15px/1.45 system-ui, sans-serif; }
  h1 { margin: 0 0 8px; font-size: 22px; }
  h2 { margin: 36px 0 12px; font-size: 17px; }
  h3 { margin: 0; font-size: 16px; }
  small { color: #9aa0a8; font-weight: normal; }
  p { margin: 4px 0 12px; }
  header p { color: #c3c8cf; }
  header code { color: #fff; font-size: 14px; }
  kbd { padding: 1px 6px; border: 1px solid #4a4f57; border-radius: 4px; font: 12px monospace; }
  ul { margin: 0; padding: 0; list-style: none; }
  li { padding: 6px 0; }
  pre { overflow: auto; max-height: 320px; padding: 10px; background: #0e1012; font-size: 12px; }
  article { max-width: 1320px; margin-bottom: 18px; padding: 16px; border-radius: 8px;
    background: #1f2226; }
  figure { margin: 0; }
  figcaption { padding-top: 4px; color: #9aa0a8; font-size: 13px; }
  .tally { display: flex; gap: 8px; }
  .verdict { padding: 2px 10px; border-radius: 99px; background: #2c3036; font-size: 13px; }
  .verdict.changed { background: #6b4a12; color: #ffd591; }
  .verdict.same { background: #1d4a2a; color: #a6e8b4; }
  .verdict.new { background: #1c3f66; color: #a9d2ff; }
  .three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .small { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
  .frame { display: block; width: 100%; aspect-ratio: var(--ratio); padding: 0; border: 0;
    border-radius: 4px; background: var(--picture) no-repeat 0 0 / 100% 100%; cursor: zoom-in; }
  .frame.of-three { background-size: 300% 100%; }
  .frame.after { background-position: 50% 0; }
  .frame.difference { background-position: 100% 0; }
  #viewer { position: fixed; inset: 0; display: grid; place-content: center; place-items: center;
    gap: 10px;
    background: rgba(8, 9, 10, 0.94); }
  #viewer[hidden] { display: none; }
  #large { width: min(94vw, calc(84vh * var(--ratio))); cursor: pointer; }
  #viewer p { margin: 0; text-align: center; }
  #showing { display: inline-block; min-width: 96px; margin-right: 10px; padding: 2px 10px;
    border-radius: 99px; background: #e8eaed; color: #15171a; font-weight: 600; }
`;

function section(title: string, cards: string[], className: string): string {
  if (cards.length === 0) return '';
  return `<h2>${title}</h2><div class="${className}">${cards.join('\n')}</div>`;
}

export function reviewPage(records: ReviewRecord[], heading: ReviewHeading): string {
  const findings = records.filter((record) => record.kind === 'finding');
  const pictures = records.filter((record) => record.kind === 'picture');
  // Changed first: the order the large view steps through as well.
  const inOrder = (['changed', 'new', 'same'] as const).flatMap((verdict) =>
    pictures.filter((picture) => picture.verdict === verdict),
  );
  const cardsOf = (verdict: Verdict, card: typeof smallCard): string[] =>
    inOrder.flatMap((picture, index) =>
      picture.verdict === verdict ? [card(picture, index)] : [],
    );
  const count = (verdict: Verdict): number => cardsOf(verdict, smallCard).length;

  const viewed: ViewedPicture[] = inOrder.map((picture) => ({
    address: address(picture),
    isChanged: picture.verdict === 'changed',
    ratio: ratio(picture),
    caption:
      `${picture.name}: ${picture.shows}. ${picture.when}.` +
      (picture.verdict === 'changed' ? ` ${describeChange(picture)}.` : '') +
      (picture.verdict === 'same' ? ' The same before and after.' : '') +
      (picture.verdict === 'new' ? ' Nothing to compare it with.' : ''),
  }));
  const same = cardsOf('same', smallCard);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Review: before and after</title>
    <style>${STYLE}</style>
  </head>
  <body>
    <header>
      <h1>Before and after</h1>
      <p>
        Before: <code>${escapeHtml(heading.before)}</code><br />
        After: <code>${escapeHtml(heading.after)}</code><br />
        Drawn ${escapeHtml(heading.drawnAt)} by the software renderer: stills only. Motion, frame
        rate and the phone's own graphics are for the phone.
      </p>
      <p class="tally">
        <span class="verdict changed">${count('changed')} changed</span>
        <span class="verdict same">${count('same')} the same</span>
        <span class="verdict new">${count('new')} with nothing to compare with</span>
      </p>
      <p>
        Click a picture to see it large. There, hold the picture or <kbd>Space</kbd> to see
        before; <kbd>B</kbd> flips between the two by itself; <kbd>D</kbd> marks what differs;
        <kbd>&larr;</kbd> <kbd>&rarr;</kbd> step through; <kbd>Esc</kbd> closes.
      </p>
    </header>

    ${findings.length === 0 ? '' : `<h2>Besides the pictures</h2><ul>${findings.map(findingRow).join('\n')}</ul>`}
    ${section('Changed', cardsOf('changed', changedCard), '')}
    ${section('Nothing to compare with', cardsOf('new', smallCard), 'small')}
    ${
      same.length === 0
        ? ''
        : `<details><summary><h2 style="display: inline-block">The same (${same.length})</h2></summary>
           <div class="small">${same.join('\n')}</div></details>`
    }

    <div id="viewer" hidden>
      <div id="large" class="frame"></div>
      <p><span id="showing"></span><span id="caption"></span></p>
    </div>
    <script>
      (${runViewer.toString()})(${JSON.stringify(viewed).replaceAll('<', '\\u003c')});
    </script>
  </body>
</html>
`;
}
