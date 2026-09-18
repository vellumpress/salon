import type { Form, WorkText } from "../catalog/works";

export type Breath = {
  id: string;
  text: string;
  chapterId: string;
  chapterTitle: string;
  paragraphIndex: number;
};

const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "st",
  "vs",
  "etc",
  "vol",
  "no",
  "rev",
  "gen",
  "col",
  "capt",
  "lt",
  "sgt",
  "mt",
  "ft",
  "hon",
  "esq",
  "inc",
  "ltd",
  "co",
  "approx",
  "fig",
]);

const SOFT_MAX = 220;

function isAbbreviation(word: string): boolean {
  const clean = word.replace(/["'“”‘’()[\]]/g, "").replace(/\.$/, "");
  if (ABBREVIATIONS.has(clean.toLowerCase())) return true;
  if (/^[A-Z]$/.test(clean)) return true;
  return false;
}

function splitLongBreath(text: string): string[] {
  if (text.length <= SOFT_MAX) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > SOFT_MAX) {
    const window = remaining.slice(0, SOFT_MAX + 40);
    const breaks = ["; ", " — ", " – ", " —", ": ", ", "];
    let cut = -1;
    for (const mark of breaks) {
      const at = window.lastIndexOf(mark);
      if (at >= 70) {
        cut = at + mark.length;
        break;
      }
    }
    if (cut < 0) {
      const space = window.lastIndexOf(" ");
      cut = space >= 70 ? space + 1 : SOFT_MAX;
    }
    const chunk = remaining.slice(0, cut).trim();
    if (chunk) parts.push(chunk);
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) parts.push(remaining);
  return parts.length ? parts : [text];
}

function splitSentences(paragraph: string): string[] {
  const chars = [...paragraph];
  const sentences: string[] = [];
  let current = "";

  for (let i = 0; i < chars.length; i += 1) {
    current += chars[i];
    const ch = chars[i];
    if (ch !== "." && ch !== "!" && ch !== "?" && ch !== "…") continue;

    if (ch === "." && chars[i + 1] === "." && chars[i + 2] === ".") {
      current += "..";
      i += 2;
    }

    while (i + 1 < chars.length && /["'”’)\]]/.test(chars[i + 1] ?? "")) {
      i += 1;
      current += chars[i];
    }

    const lastWord = current.trim().split(/\s+/).pop() ?? "";
    if (ch === "." && isAbbreviation(lastWord)) continue;

    const rest = chars.slice(i + 1).join("");
    if (/^\s*$/.test(rest)) {
      const breath = current.trim();
      if (breath) sentences.push(breath);
      current = "";
      break;
    }
    if (!/^\s/.test(rest)) continue;
    if (/^\s+[a-z]/.test(rest)) continue;

    const breath = current.trim();
    if (breath) sentences.push(breath);
    current = "";
  }

  const tail = current.trim();
  if (tail) sentences.push(tail);
  return sentences.length ? sentences : [paragraph.trim()];
}

export function splitParagraph(paragraph: string, form?: Form): string[] {
  const text = paragraph.replace(/\s+/g, " ").trim();
  if (!text) return [];

  const shortLine =
    text.length < 140 && !/[.!?…]/.test(text.slice(0, -1));
  if (form === "poem" || shortLine) {
    return [text];
  }
  if (text.length < 90) return [text];

  return splitSentences(text).flatMap(splitLongBreath);
}

export function breathsFromText(text: WorkText, form?: Form): Breath[] {
  const breaths: Breath[] = [];
  let paragraphIndex = 0;

  for (const chapter of text.chapters) {
    const chapterTitle = chapter.title?.trim() || "Opening";
    for (const paragraph of chapter.paragraphs) {
      const units = splitParagraph(paragraph, form);
      units.forEach((unit, unitIndex) => {
        breaths.push({
          id: `${chapter.id}:${paragraphIndex}:${unitIndex}`,
          text: unit,
          chapterId: chapter.id,
          chapterTitle,
          paragraphIndex,
        });
      });
      paragraphIndex += 1;
    }
  }

  return breaths;
}

export function chapterStartIndex(breaths: Breath[], chapterId: string): number {
  return Math.max(
    0,
    breaths.findIndex((breath) => breath.chapterId === chapterId),
  );
}

export function migrateBreathIndex(
  breaths: Breath[],
  saved: {
    breathIndex?: number;
    breathMigrated?: boolean;
    paragraphIndex?: number;
  },
): number {
  const last = Math.max(0, breaths.length - 1);
  if (saved.breathMigrated && typeof saved.breathIndex === "number") {
    return Math.min(last, Math.max(0, Math.floor(saved.breathIndex)));
  }
  const paragraphIndex = saved.paragraphIndex;
  if (typeof paragraphIndex === "number" && paragraphIndex > 0) {
    const mapped = breaths.findIndex(
      (breath) => breath.paragraphIndex >= paragraphIndex,
    );
    if (mapped >= 0) return Math.min(last, mapped);
  }
  if (typeof saved.breathIndex === "number") {
    return Math.min(last, Math.max(0, Math.floor(saved.breathIndex)));
  }
  return 0;
}
