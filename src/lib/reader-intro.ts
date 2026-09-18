import { pitchFor } from "./catalog/pitches";
import { ritualPitchFor } from "./catalog/rituals";
import { shelfWork } from "./catalog/shelf";
import { splitSentences } from "./sentences";
import type { Work } from "./works";

const MIN_INTRO_LENGTH = 24;

function usableCopy(value: string | undefined) {
  const copy = value?.replace(/\s+/g, " ").trim() ?? "";
  if (copy.length < MIN_INTRO_LENGTH) return "";
  if (/^Project Gutenberg\b/i.test(copy)) return "";
  if (/^(novel|stories|play|poem|other)$/i.test(copy)) return "";
  return copy;
}

export function trimReaderIntro(value: string | undefined) {
  const copy = usableCopy(value);
  if (!copy) return "";
  return splitSentences(copy, 2).join(" ").trim();
}

/**
 * Copy for the reader threshold: shelf pitches first, then the opening of a
 * Literary Editor About note. Note fallback is limited to local polished binds
 * so catalog metadata never masquerades as editorial context.
 */
export function readerIntro(work: Work) {
  const shelf = shelfWork(work.id);
  const pitch = usableCopy(pitchFor(work.id)) || usableCopy(ritualPitchFor(work.id));
  if (pitch) return trimReaderIntro(pitch);
  if (!shelf?.local) return "";
  return trimReaderIntro(shelf.intro || work.note);
}
