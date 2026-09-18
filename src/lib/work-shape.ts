import type { Breath, Scene, Work } from "./literature";
import { breathsFor } from "./literature";
import type { ShelfWork } from "./catalog/shelf";
import { isChapterHeading, isChapterOne, isFrontMatter, repairLines } from "./sentences";

export type { Breath, Scene, Work } from "./literature";
export { breathsFor } from "./literature";

export const OPENING_BREATHS = 96;

export type PackedChapter = Scene & { lines: string[] };

export type PackedWork = Omit<Work, "scenes" | "breaths"> & {
  complete: boolean;
  chapters: PackedChapter[];
};

export function doorWork(entry: ShelfWork): Work {
  const bound = Boolean(entry.gutenberg);
  const lines = [
    `${entry.title} came in ${entry.year}.`,
    `${entry.author} wrote it in ${entry.language}.`,
    `It is a ${entry.form} on this shelf of public-domain work.`,
    bound
      ? "The English text would not come just now. Sit with another, or try the title again."
      : "A public-domain English text has not yet been bound into this chamber.",
    "The title stays. The door is open.",
  ];
  return {
    id: entry.id,
    title: entry.title,
    author: entry.author,
    year: String(entry.year),
    note: entry.form,
    minutes: 8,
    cover: "",
    coverAlt: "",
    scenes: [
      {
        id: "chapter-1",
        title: "Chapter 1",
        place: "Chapter 1",
        reentry: lines[0] ?? "",
        prompt: "A word from the door.",
      },
    ],
    breaths: breathsFor("chapter-1", lines),
  };
}

export function sceneOf(work: Work, sceneId: string) {
  return work.scenes.find((scene) => scene.id === sceneId);
}

export function sceneStartIndex(work: Work, sceneId: string) {
  return work.breaths.findIndex((breath) => breath.sceneId === sceneId);
}

export function isLastBreathOfScene(work: Work, index: number) {
  const current = work.breaths[index];
  const next = work.breaths[index + 1];
  if (!current) return false;
  return !next || next.sceneId !== current.sceneId;
}

export function progressInScene(work: Work, index: number) {
  const current = work.breaths[index];
  if (!current) return 0;
  const indices: number[] = [];
  work.breaths.forEach((breath, i) => {
    if (breath.sceneId === current.sceneId) indices.push(i);
  });
  const at = indices.indexOf(index);
  if (at < 0) return 0;
  return at / Math.max(1, indices.length - 1);
}

export function chapterStartIndex(work: Work) {
  const skip = /contents|dedication|preface|foreword|epigraph|title|introduction|introducing/i;
  // Only honor "Chapter I" / "Part I" near the front. Late part-markers
  // (e.g. How I Found America → Part I) used to skip earlier stories.
  const numbered = work.scenes.find((scene, index) => {
    if (index > 2) return false;
    const label = `${scene.title} ${scene.place}`.trim();
    if (skip.test(label)) return false;
    return isChapterOne(scene.title) || isChapterOne(label);
  });
  if (numbered) {
    const at = sceneStartIndex(work, numbered.id);
    if (at >= 0) return at;
  }
  const body = work.scenes.find((scene) => !skip.test(`${scene.title} ${scene.place}`));
  if (body) {
    const at = sceneStartIndex(work, body.id);
    if (at >= 0) return at;
  }
  return 0;
}

export function repairWork(work: Work): Work {
  const scenes: Scene[] = [];
  const breaths: Breath[] = [];
  for (const scene of work.scenes) {
    const old = work.breaths.filter((item) => item.sceneId === scene.id).map((item) => item.text);
    const next = repairLines(old).filter((line) => {
      if (isFrontMatter(line)) return false;
      if (isChapterHeading(line) && line.length < 40) return false;
      return true;
    });
    if (!next.length) continue;
    const title = scene.title && !isFrontMatter(scene.title) ? scene.title : "Chapter 1";
    scenes.push({
      ...scene,
      title,
      place: /^the (first sitting|page|shelf)/i.test(scene.place) ? title : scene.place,
      reentry: next[0] ?? scene.reentry,
    });
    breaths.push(...breathsFor(scene.id, next));
  }
  if (!breaths.length) return work;
  return { ...work, scenes, breaths };
}

export function sliceOpening(work: Work): { work: Work; complete: boolean } {
  const at = chapterStartIndex(work);
  const end = Math.min(work.breaths.length, Math.max(at, 0) + OPENING_BREATHS);
  if (end >= work.breaths.length) return { work, complete: true };
  const breaths = work.breaths.slice(0, end);
  const ids = new Set(breaths.map((item) => item.sceneId));
  return {
    work: {
      ...work,
      scenes: work.scenes.filter((scene) => ids.has(scene.id)),
      breaths,
    },
    complete: false,
  };
}

export function packWork(work: Work, complete: boolean): PackedWork {
  const lines = new Map<string, string[]>();
  for (const breath of work.breaths) {
    const list = lines.get(breath.sceneId);
    if (list) list.push(breath.text);
    else lines.set(breath.sceneId, [breath.text]);
  }
  return {
    id: work.id,
    title: work.title,
    author: work.author,
    year: work.year,
    note: work.note,
    minutes: work.minutes,
    cover: work.cover,
    coverAlt: work.coverAlt,
    complete,
    chapters: work.scenes.map((scene) => ({
      ...scene,
      lines: lines.get(scene.id) ?? [],
    })),
  };
}

export function inflateWork(packed: PackedWork): Work {
  const scenes = packed.chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    place: chapter.place,
    reentry: chapter.reentry,
    prompt: chapter.prompt,
    wash: chapter.wash,
  }));
  const breaths = packed.chapters.flatMap((chapter) => breathsFor(chapter.id, chapter.lines));
  return {
    id: packed.id,
    title: packed.title,
    author: packed.author,
    year: packed.year,
    note: packed.note,
    minutes: packed.minutes,
    cover: packed.cover,
    coverAlt: packed.coverAlt,
    scenes,
    breaths,
  };
}
