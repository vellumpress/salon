import { existsSync, readFileSync } from "node:fs";
import { isSectionBreak } from "../emphasized-text.ts";
import type { Breath, Work } from "../literature.ts";
import { openingBreathIndex, storyIntroductionStartIndex, storyPrefaceStartIndex } from "../opening-scene.ts";
import { isChapterOne } from "../sentences.ts";
import { RITUAL_LANES, ritualStartAt, worksForRitualLane } from "./rituals.ts";

/**
 * Words in one breath of a sit.
 * Section ornaments are not words. A line slash standing alone (the White
 * Horse ballad breaks lines that way) is not a word either.
 */
export function sitWordCount(text: string): number {
  if (isSectionBreak(text)) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0 && word !== "/").length;
}

export function wordsInBreaths(breaths: readonly { text: string }[]): number {
  let total = 0;
  for (const breath of breaths) total += sitWordCount(breath.text);
  return total;
}

/** Calm pace Mira used for Easter, Trafalgar, and The Ballad of the White Horse. */
export function minutesFromWords(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

function sceneStartIndex(work: Work, sceneId: string) {
  return work.breaths.findIndex((breath) => breath.sceneId === sceneId);
}

/** Same start a fresh Sit uses: chapter / book / act I, skipping front matter. */
export function ritualChapterStart(work: Work): number {
  const storyIntro = storyIntroductionStartIndex(work);
  if (storyIntro !== null) return storyIntro;
  const storyPreface = storyPrefaceStartIndex(work);
  if (storyPreface !== null) return storyPreface;
  const skip = /contents|dedication|preface|foreword|epigraph|title|introduction|introducing/i;
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

function sceneSlice(work: Work, start: number): Breath[] {
  const breath = work.breaths[start];
  if (!breath) return [];
  const slice: Breath[] = [];
  for (let i = start; i < work.breaths.length; i += 1) {
    const next = work.breaths[i];
    if (!next || next.sceneId !== breath.sceneId) break;
    slice.push(next);
  }
  return slice;
}

export type MeasuredSit = {
  minutes: number;
  words: number;
  source: "opening" | "scene" | "at-scene";
  scene: string;
};

function readWork(kind: "texts" | "openings", id: string): Work | null {
  const url = new URL(`./${kind}/${id}.json`, import.meta.url);
  if (!existsSync(url)) return null;
  return JSON.parse(readFileSync(url, "utf8")) as Work;
}

/**
 * The sitting a Ritual card actually opens.
 * A hosted opening is that sit when it is a real excerpt, shorter than the book.
 * A reading that starts mid-book (Tales from the Fjeld, Tales by Polish Authors)
 * is the scene at that breath. Otherwise it is the scene a fresh Sit opens:
 * Act I, Chapter I, Book I, after front matter.
 */
export function measureRitualSit(id: string): MeasuredSit {
  const full = readWork("texts", id);
  if (!full) throw new Error(`no bound text for ${id}`);
  const at = ritualStartAt(id);
  if (at !== undefined) {
    const slice = sceneSlice(full, at);
    const words = wordsInBreaths(slice);
    const scene = full.scenes.find((item) => item.id === full.breaths[at]?.sceneId);
    return { minutes: minutesFromWords(words), words, source: "at-scene", scene: scene?.title ?? "" };
  }
  const opening = readWork("openings", id);
  if (opening && opening.breaths.length > 0 && opening.breaths.length < full.breaths.length) {
    const words = wordsInBreaths(opening.breaths);
    return {
      minutes: minutesFromWords(words),
      words,
      source: "opening",
      scene: opening.scenes[0]?.title ?? "",
    };
  }
  const start = Math.max(ritualChapterStart(full), openingBreathIndex(full));
  const slice = sceneSlice(full, start);
  const words = wordsInBreaths(slice);
  const scene = full.scenes.find((item) => item.id === full.breaths[start]?.sceneId);
  return { minutes: minutesFromWords(words), words, source: "scene", scene: scene?.title ?? "" };
}

/** Book cards on Ritual lanes. Serialize plans are not book sits. */
export function ritualBookCards() {
  const seen = new Set<string>();
  const out: ReturnType<typeof worksForRitualLane> = [];
  for (const lane of RITUAL_LANES) {
    if (lane.id === "serialize") continue;
    for (const work of worksForRitualLane(lane)) {
      if (seen.has(work.id)) continue;
      seen.add(work.id);
      out.push(work);
    }
  }
  return out;
}
