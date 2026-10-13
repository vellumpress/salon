import type { DisplayKind } from "./display-blocks.ts";
import { sentenceSpans } from "./sentences.ts";

/**
 * How many taps a breath contains.
 * Verse is one step: a stanza is not a row of sentences.
 * Prose and speeches follow the display sentence breaks.
 */
export function breathSentenceCount(text: string, kind: DisplayKind = "prose"): number {
  if (kind === "verse" || !text) return 1;
  const count = sentenceSpans(text).length;
  return count > 0 ? count : 1;
}

/**
 * Pieces of one display block, one per sentence.
 * A single-sentence block stays whole, including a speaker label.
 * When the block text does not contain that many sentences, the caller
 * keeps the block whole rather than cutting it in the wrong place.
 */
export function blockSentencePieces(text: string, expected: number): string[] {
  if (expected <= 1) return [text];
  const spans = sentenceSpans(text);
  if (spans.length !== expected) return [text];
  return spans.map((span, index) => {
    const end = index + 1 < spans.length ? spans[index + 1]!.start : text.length;
    return text.slice(span.start, end);
  });
}

export type FocusPiece = { text: string; sentence: number };

/**
 * Pieces of each display block, tagged with the closed sentence a tap lands on.
 * A quotation split across blocks stays on that one sentence, including the
 * tail of it when the next block also begins a new sentence. Verse is one step.
 * A repeated speaker label stays on the first piece of its block.
 */
export function focusPieces(
  text: string,
  blocks: readonly { text: string }[],
  kind: DisplayKind = "prose",
): FocusPiece[][] {
  if (kind === "verse" || blocks.length === 0) {
    return blocks.map((block) => [{ text: block.text, sentence: 0 }]);
  }
  const speaker = kind === "speech" ? blocks[0]?.text.match(/^([^:]{1,80}): /)?.[1] : undefined;
  const prefix = speaker ? `${speaker}: ` : "";
  const raws = blocks.map((block, index) => {
    if (index > 0 && prefix && block.text.startsWith(prefix)) return block.text.slice(prefix.length);
    return block.text;
  });
  if (raws.join("") !== text) {
    return blocks.map((block) => [{ text: block.text, sentence: 0 }]);
  }
  const closed = sentenceSpans(text);
  let offset = 0;
  return raws.map((raw, index) => {
    const start = offset;
    const end = offset + raw.length;
    offset = end;
    const pieces: FocusPiece[] = [];
    closed.forEach((span, sentence) => {
      const from = Math.max(span.start, start);
      const to = Math.min(span.end, end);
      if (to > from) pieces.push({ text: text.slice(from, to), sentence });
    });
    if (pieces.length === 0) pieces.push({ text: raw, sentence: 0 });
    const first = pieces[0];
    if (index > 0 && prefix && first) pieces[0] = { text: prefix + first.text, sentence: first.sentence };
    return pieces;
  });
}

export type SentencePlace = { index: number; cursor: number };

/**
 * One tap.
 * Inside a breath, move to the neighboring sentence.
 * Off the first sentence, land on the last sentence of the previous breath,
 * so the sentence above the focus line is the one that was just read.
 * Off the last sentence, the next breath opens on its first sentence.
 */
export function stepSentencePlace(input: {
  index: number;
  cursor: number;
  delta: 1 | -1;
  here: number;
  prevCount: number;
  breathCount: number;
}): SentencePlace | "start" | "end" {
  const here = Math.max(1, Math.floor(input.here) || 1);
  const cursor = Math.min(here - 1, Math.max(0, Math.floor(input.cursor) || 0));
  const index = Math.floor(input.index) || 0;
  if (input.delta > 0) {
    if (cursor + 1 < here) return { index, cursor: cursor + 1 };
    if (index + 1 >= input.breathCount) return "end";
    return { index: index + 1, cursor: 0 };
  }
  if (cursor > 0) return { index, cursor: cursor - 1 };
  if (index <= 0) return "start";
  const prev = Math.max(1, Math.floor(input.prevCount) || 1);
  return { index: index - 1, cursor: prev - 1 };
}

/** `steps` taps from a place. Stops at the ends of the book. */
export function repeatSentenceStep(
  place: SentencePlace,
  delta: 1 | -1,
  steps: number,
  countAt: (index: number) => number,
  breathCount: number,
): SentencePlace | "start" | "end" {
  let current = place;
  const n = Math.max(0, Math.floor(steps));
  for (let i = 0; i < n; i += 1) {
    const here = Math.max(1, countAt(current.index) || 1);
    const moved = stepSentencePlace({
      index: current.index,
      cursor: current.cursor,
      delta,
      here,
      prevCount: current.index > 0 ? countAt(current.index - 1) : 1,
      breathCount,
    });
    if (moved === "start" || moved === "end") return moved;
    current = moved;
  }
  return current;
}
