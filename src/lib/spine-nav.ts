import type { Scene, Work } from "./literature";

function sceneStart(work: Work, sceneId: string) {
  return work.breaths.findIndex((breath) => breath.sceneId === sceneId);
}

export type SpineChapter = {
  id: string;
  place: string;
  start: number;
  /** Tappable. Full binds are open; a short sit stays progressive. */
  open: boolean;
  current: boolean;
  visited: boolean;
};

const GUTENBERG_END = /project gutenberg|\*\*\*\s*end of the/i;
const TRANSCRIBER = /transcriber/i;

/** Gutenberg footers and transcriber notes are not chapters. */
export function isSpineEndMatter(scene: Pick<Scene, "title" | "place" | "reentry">) {
  const label = `${scene.title}\n${scene.place}`;
  if (GUTENBERG_END.test(label)) return true;
  if (TRANSCRIBER.test(label) || TRANSCRIBER.test(scene.reentry ?? "")) return true;
  return false;
}

/**
 * House of Mirth is two books. The bind labeled both "Chapter 1", so Book II
 * looked like a duplicate of the opening.
 */
export function chapterPlace(workId: string, scene: Pick<Scene, "id" | "title" | "place"> | undefined) {
  if (!scene) return "";
  if (workId !== "the-house-of-mirth") return scene.place;
  const n = /^s(\d+)$/.exec(scene.id);
  if (!n) return scene.place;
  const i = Number(n[1]);
  if (i >= 0 && i <= 14) return `Book I · Chapter ${i + 1}`;
  if (i >= 15 && i <= 28) return `Book II · Chapter ${i - 14}`;
  return scene.place;
}

/**
 * A loaded novel (`complete`) can be opened at any chapter. A sit that has
 * not hydrated the rest of the book still unlocks only as far as you've read.
 */
export function spineChapters(work: Work, index: number, complete: boolean): SpineChapter[] {
  const here = work.breaths[index]?.sceneId;
  const chapters: SpineChapter[] = [];
  for (const scene of work.scenes) {
    if (isSpineEndMatter(scene)) continue;
    const start = sceneStart(work, scene.id);
    if (start < 0) continue;
    const visited = start <= index;
    chapters.push({
      id: scene.id,
      place: chapterPlace(work.id, scene),
      start,
      open: complete || visited,
      current: scene.id === here,
      visited,
    });
  }
  return chapters;
}

/** A short opening must not replace a longer bind already in hand. */
export function preferLoadedWork(prior: Work | undefined, incoming: Work | undefined): Work | undefined {
  if (!incoming) return prior;
  if (!prior) return incoming;
  if (prior.breaths.length > incoming.breaths.length) return prior;
  return incoming;
}
