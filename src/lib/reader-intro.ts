import { pitchFor } from "./catalog/pitches.ts";
import { prefaceFor } from "./catalog/prefaces.ts";
import { ritualPitchFor } from "./catalog/rituals.ts";
import { shelfWork } from "./catalog/shelf.ts";
import { splitSentences } from "./sentences.ts";
import type { Work } from "./works.ts";

const MIN_INTRO_LENGTH = 24;

function usableCopy(value: string | undefined) {
  const copy = value?.replace(/\s+/g, " ").trim() ?? "";
  if (copy.length < MIN_INTRO_LENGTH) return "";
  if (/^Project Gutenberg\b/i.test(copy)) return "";
  if (/public domain|copyright ©|all rights reserved/i.test(copy)) return "";
  if (/^(novel|stories|play|poem|other)$/i.test(copy)) return "";
  return copy;
}

export function trimReaderIntro(value: string | undefined) {
  const copy = usableCopy(value);
  if (!copy) return "";
  return splitSentences(copy, 3).join(" ").trim();
}

/**
 * Copy for the reader threshold: shelf pitches first, then ritual pitches,
 * local shelf.intro, persisted prefaces, then a documented catalog fallback
 * so shelf works never open without settle-in copy.
 */
export function readerIntro(work: Work) {
  const shelf = shelfWork(work.id);
  const pitch = usableCopy(pitchFor(work.id)) || usableCopy(ritualPitchFor(work.id));
  if (pitch) return trimReaderIntro(pitch);
  if (shelf) {
    const stored =
      usableCopy(shelf.intro) ||
      usableCopy(prefaceFor(work.id)) ||
      usableCopy(work.note);
    return trimReaderIntro(stored);
  }
  if (work.id === "page") {
    return trimReaderIntro(work.note);
  }
  return "";
}
