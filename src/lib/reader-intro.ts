import { pitchFor } from "./catalog/pitches.ts";
import { prefaceFor } from "./catalog/prefaces.ts";
import { ritualPitchFor } from "./catalog/rituals.ts";
import { shelfWork } from "./catalog/shelf.ts";
import { isDeviceImport } from "./import/private.ts";
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
  const sentences = splitSentences(copy);
  const shown = sentences.slice(0, 3);
  let index = 3;
  // An interior '!' can split the sentence just before the note
  // (“'A monkey!' I replied.”). Keep that fragment, then the note.
  const shifted = sentences[index];
  const afterShift = sentences[index + 1];
  if (
    shifted &&
    !/^A heads-up before you start\b/.test(shifted) &&
    afterShift &&
    /^A heads-up before you start\b/.test(afterShift)
  ) {
    shown.push(shifted);
    index += 1;
  }
  const next = sentences[index];
  if (next && /^A heads-up before you start\b/.test(next)) {
    shown.push(next);
    // A heads-up may continue through "left as printed." before the author line,
    // plus one trailing "The first sitting…" line. Do not stop that note on an
    // earlier '!' in the opening sentence.
    const endsNote = (value: string) => /left as printed[.!?]?$/.test(value.trim());
    const authorCredit = (value: string) =>
      /;\s+the year is\b/.test(value) ||
      /^[\p{Lu}].{0,80},\s+(?:in|from)\b/u.test(value);
    if (!endsNote(next)) {
      // Only keep a run that closes on "left as printed" before the author line.
      // A '!' fragment that never closes that way stays off the card.
      const extra: string[] = [];
      let cursor = index + 1;
      let closed = false;
      while (cursor < sentences.length && cursor <= index + 6) {
        const follow = sentences[cursor];
        if (!follow || authorCredit(follow)) break;
        extra.push(follow);
        cursor += 1;
        if (endsNote(follow)) {
          closed = true;
          break;
        }
      }
      if (closed) {
        shown.push(...extra);
        const after = sentences[cursor];
        if (after && /^The first sitting\b/.test(after)) shown.push(after);
      }
    }
  }
  return shown.join(" ").trim();
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
  if (isDeviceImport(work.id)) {
    return trimReaderIntro(work.note);
  }
  return "";
}
