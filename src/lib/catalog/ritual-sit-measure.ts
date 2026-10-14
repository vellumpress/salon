import { existsSync, readFileSync } from "node:fs";
import { tapSpans } from "../display-blocks.ts";
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

export type RitualSitBounds = {
  /** Inclusive first breath of the sitting. */
  start: number;
  /** Inclusive last breath of the sitting. */
  end: number;
  source: MeasuredSit["source"];
  breaths: Breath[];
};

function breathKey(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[\s"'“”‘’]+/u, "")
    .replace(/[\s"'“”‘’]+$/u, "")
    .trim();
}

function isSectionMark(text: string) {
  return /^(?:[IVXLCDM]+|\d+)\.?$/u.test(text.trim());
}

function exactStarts(full: Work, texts: readonly string[]) {
  const starts: number[] = [];
  const first = texts[0];
  if (!first) return starts;
  for (let start = 0; start + texts.length <= full.breaths.length; start += 1) {
    if (full.breaths[start]?.text !== first) continue;
    let same = true;
    for (let i = 1; i < texts.length; i += 1) {
      if (full.breaths[start + i]?.text !== texts[i]) {
        same = false;
        break;
      }
    }
    if (same) starts.push(start);
    if (starts.length > 1) break;
  }
  return starts;
}

/** The last opening breath is several book breaths joined by spaces. */
function joinedEnd(full: Work, target: string) {
  const hits: { start: number; stop: number }[] = [];
  if (target.length < 12) return hits;
  for (let start = 0; start < full.breaths.length; start += 1) {
    const head = full.breaths[start]?.text ?? "";
    if (!head || !target.startsWith(head)) continue;
    let acc = head;
    for (let i = start + 1; i < full.breaths.length && i < start + 80; i += 1) {
      const withSpace = `${acc} ${full.breaths[i]?.text ?? ""}`;
      if (withSpace === target) {
        hits.push({ start, stop: i });
        break;
      }
      if (!target.startsWith(withSpace)) break;
      acc = withSpace;
    }
    if (hits.length > 1) break;
  }
  return hits;
}

export type OpeningPlace = { start: number; stop: number; cut?: number } | { problem: string };

/**
 * The opening's last breath is the start of a longer book breath.
 * The sit ends at the sentence that finishes that excerpt. The rest of the
 * breath is the next passage.
 */
function prefixCut(full: Work, last: string): { stop: number; cut: number } | null {
  if (last.length < 40) return null;
  const hits: number[] = [];
  for (let i = 0; i < full.breaths.length; i += 1) {
    const text = full.breaths[i]?.text ?? "";
    if (text.startsWith(last) && text.length > last.length) hits.push(i);
    if (hits.length > 1) return null;
  }
  if (hits.length !== 1) return null;
  const stop = hits[0]!;
  const text = full.breaths[stop]?.text ?? "";
  const span = tapSpans(text).find((item) => item.start < last.length && item.end >= last.length);
  if (!span || span.end >= text.length) return null;
  if (text.slice(last.length, span.end).trim() !== "") return null;
  return { stop, cut: span.end };
}

/**
 * Where the hosted opening ends in the bound book.
 * The excerpt is a contiguous run of breaths. A copied line may differ by
 * wrapping quotes, and a verse line may have been packed into one opening
 * breath. A trailing canto number the book does not print is not the sit.
 */
export function locateOpeningStop(full: Work, opening: Work, depth = 0): OpeningPlace {
  const texts = opening.breaths.map((breath) => breath.text);
  if (texts.length === 0) return { problem: "opening has no breaths" };
  const exact = exactStarts(full, texts);
  if (exact.length > 1) return { problem: "opening sits in the book more than once" };
  if (exact.length === 1) return { start: exact[0]!, stop: exact[0]! + texts.length - 1 };
  const content = texts.filter((text) => !isSectionMark(text));
  if (content.length > 0 && content.length < texts.length) {
    const stripped = exactStarts(full, content);
    if (stripped.length === 1) return { start: stripped[0]!, stop: stripped[0]! + content.length - 1 };
  }

  const first = texts[0]!;
  const last = texts[texts.length - 1]!;
  const aligned: number[] = [];
  for (let start = 0; start + texts.length <= full.breaths.length; start += 1) {
    if (full.breaths[start]?.text !== first) continue;
    if (full.breaths[start + texts.length - 1]?.text !== last) continue;
    aligned.push(start);
    if (aligned.length > 1) break;
  }
  if (aligned.length === 1) return { start: aligned[0]!, stop: aligned[0]! + texts.length - 1 };

  const lastHits: number[] = [];
  for (let i = 0; i < full.breaths.length; i += 1) {
    if (full.breaths[i]?.text === last) lastHits.push(i);
    if (lastHits.length > 1) break;
  }
  if (lastHits.length === 1) return { start: lastHits[0]!, stop: lastHits[0]! };

  const key = breathKey(last);
  if (key) {
    const soft: number[] = [];
    for (let i = 0; i < full.breaths.length; i += 1) {
      if (breathKey(full.breaths[i]?.text ?? "") === key) soft.push(i);
      if (soft.length > 1) break;
    }
    if (soft.length === 1) return { start: soft[0]!, stop: soft[0]! };
  }

  const joined = joinedEnd(full, last);
  if (joined.length === 1) return joined[0]!;

  const inside = prefixCut(full, last);
  if (inside) {
    let start = inside.stop;
    for (let i = inside.stop; i >= 0; i -= 1) {
      if (full.breaths[i]?.text === first) {
        start = i;
        break;
      }
    }
    return { start, stop: inside.stop, cut: inside.cut };
  }

  if (depth === 0 && texts.length > 1 && isSectionMark(last) && lastHits.length === 0) {
    return locateOpeningStop(full, { ...opening, breaths: opening.breaths.slice(0, -1) }, 1);
  }
  return { problem: "opening's last breath is not a breath of the book" };
}

/**
 * Where the ritual sitting starts and stops.
 * `opening` is the hosted excerpt when the shelf has one, otherwise null.
 * A mid-book ritual is the scene at that breath. A shorter opening is the
 * excerpt. Otherwise it is the scene a fresh Sit opens.
 */
export function ritualSitBounds(full: Work, opening: Work | null): RitualSitBounds {
  const at = ritualStartAt(full.id);
  if (at !== undefined) {
    const breaths = sceneSlice(full, at);
    return {
      start: at,
      end: breaths.length > 0 ? at + breaths.length - 1 : at,
      source: "at-scene",
      breaths,
    };
  }
  if (opening && opening.breaths.length > 0 && opening.breaths.length < full.breaths.length) {
    const located = locateOpeningStop(full, opening);
    if (!("problem" in located)) {
      return { start: located.start, end: located.stop, source: "opening", breaths: opening.breaths };
    }
    return { start: 0, end: opening.breaths.length - 1, source: "opening", breaths: opening.breaths };
  }
  const start = Math.max(ritualChapterStart(full), openingBreathIndex(full));
  const breaths = sceneSlice(full, start);
  return {
    start,
    end: breaths.length > 0 ? start + breaths.length - 1 : start,
    source: "scene",
    breaths,
  };
}

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
  const opening = readWork("openings", id);
  const bounds = ritualSitBounds(full, opening);
  const words = wordsInBreaths(bounds.breaths);
  const scene =
    bounds.source === "opening"
      ? (opening?.scenes[0]?.title ?? "")
      : (full.scenes.find((item) => item.id === full.breaths[bounds.start]?.sceneId)?.title ?? "");
  return { minutes: minutesFromWords(words), words, source: bounds.source, scene };
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
