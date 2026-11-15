import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { projectRoot } from './pages';
import { comparePictures } from './picture-difference';

// A comparison with the reference build is reported, not failed: whether a change is wanted is
// for whoever made it, and Ryan, to say. Each test leaves a record of what it found, and when
// the run ends the records become the review page (review-reporter.ts).

/** Where a run's records and pictures gather until it ends. */
export const REVIEW_IN_PROGRESS = path.join(projectRoot, 'test-results', 'review');
export const PICTURES_FOLDER = 'pictures';
const RECORDS_FOLDER = 'records';

/** Against the reference build. New: the reference build has nothing to set beside it. */
export type Verdict = 'same' | 'changed' | 'new';

interface Entry {
  /** Where on the page it comes among those with the same verdict. */
  order: number;
  name: string;
  shows: string;
}

export interface PictureRecord extends Entry {
  kind: 'picture';
  verdict: Verdict;
  /** The moment, or what was done to the page before the picture was taken. */
  when: string;
  /** In the pictures folder. Changed: before, after and difference side by side. Otherwise the one picture. */
  file: string;
  /** Of one picture, in dots. */
  width: number;
  height: number;
  /**
   * Changed: the share of the pixels, 0 to 1, that differ clearly and that differ faintly
   * (picture-difference.ts says where the line is), and the most any differs by, of 255.
   */
  clearShare: number;
  faintShare: number;
  largestDifference: number;
}

/** Something compared that is not a picture: where everything in the scene is, the sound. */
export interface FindingRecord extends Entry {
  kind: 'finding';
  verdict: Verdict;
  /** What changed, a line for each thing. */
  details: string[];
}

export type ReviewRecord = PictureRecord | FindingRecord;

function fileName(...parts: string[]): string {
  return parts.join(' ').replace(/[^a-z0-9.]+/gi, '-');
}

function write(folder: string, name: string, contents: string | Buffer): void {
  mkdirSync(path.join(REVIEW_IN_PROGRESS, folder), { recursive: true });
  writeFileSync(path.join(REVIEW_IN_PROGRESS, folder, name), contents);
}

function writeRecord(name: string, record: ReviewRecord): void {
  write(RECORDS_FOLDER, `${name}.json`, JSON.stringify(record));
}

// A PNG starts with its width and height, at fixed places.
function sizeOf(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

export function recordPicture(
  entry: Entry & { when: string },
  before: Buffer | null,
  after: Buffer,
): void {
  const name = fileName(entry.name, entry.when);
  const file = `${name}.png`;
  const difference = before === null ? null : comparePictures(before, after);
  const hasChanged = difference !== null && difference.differingPixels > 0;

  write(PICTURES_FOLDER, file, hasChanged ? difference.sideBySide : after);
  writeRecord(name, {
    kind: 'picture',
    ...entry,
    verdict: difference === null ? 'new' : hasChanged ? 'changed' : 'same',
    file,
    ...sizeOf(after),
    clearShare: hasChanged ? difference.clearlyDifferingPixels / difference.comparedPixels : 0,
    faintShare: hasChanged
      ? (difference.differingPixels - difference.clearlyDifferingPixels) / difference.comparedPixels
      : 0,
    largestDifference: difference?.largestDifference ?? 0,
  });
}

/** `changes` lists what differs from the reference build: none for the same, null where it could not be asked. */
export function recordFinding(entry: Entry, changes: string[] | null): void {
  writeRecord(fileName(entry.name), {
    kind: 'finding',
    ...entry,
    verdict: changes === null ? 'new' : changes.length > 0 ? 'changed' : 'same',
    details: changes ?? [],
  });
}

export function readRecords(): ReviewRecord[] {
  const folder = path.join(REVIEW_IN_PROGRESS, RECORDS_FOLDER);
  let names: string[];
  try {
    names = readdirSync(folder);
  } catch {
    return [];
  }
  return names
    .map((name) => JSON.parse(readFileSync(path.join(folder, name), 'utf8')) as ReviewRecord)
    .sort((a, b) => a.order - b.order);
}
