import { tapSpans, type DisplayKind } from "./display-blocks.ts";
import { PHONE_LINE_PX } from "./display-blocks.ts";
import { sentenceSpans } from "./sentences.ts";

/**
 * The lit passage is two to four rendered lines.
 * A third of a line of slack keeps a sentence that barely wraps from
 * being cut, and from swallowing the sentence after it.
 * Whole sentences are kept whenever they land in that window. A sentence
 * taller than four lines breaks at the most natural internal pause.
 */
export const SPOTLIGHT_MIN_LINES = 2;
export const SPOTLIGHT_MAX_LINES = 4;
export const SPOTLIGHT_LINE_SLOP = 0.34;

export type MeasureFn = (sample: string) => number;

export type SpotlightBreath = { index: number; text: string };

export type SpotlightPart = { index: number; start: number; end: number };

/**
 * One tap.
 * `index` / `cursor` are the sentence progress lands on: the first sentence
 * of the group, or the sentence a long window belongs to.
 * `window` is 0 unless that sentence is taller than four lines.
 */
export type SpotlightGroup = {
  index: number;
  cursor: number;
  window: number;
  endIndex: number;
  /** Exclusive sentence end in the last breath. */
  endCursor: number;
  parts: SpotlightPart[];
  /** The characters the focus paints, in order. */
  sample: string;
};

export type SpotlightPlace = { index: number; cursor: number; window: number };

type Atom = {
  index: number;
  sentence: number;
  start: number;
  end: number;
  text: string;
};

export function spotlightLineCap(linePx: number) {
  const line = linePx > 0 ? linePx : PHONE_LINE_PX;
  return line * SPOTLIGHT_MAX_LINES + line * SPOTLIGHT_LINE_SLOP;
}

function heightOf(sample: string, measure: MeasureFn) {
  const measured = measure(sample);
  return measured > 0 ? measured : 0;
}

/**
 * Lines a slice occupies.
 * Inside a paragraph the slice continues the lines above it. Measured on its
 * own, rounding can add a line. The taller of the two is the one that has to fit.
 */
function flowLines(text: string, start: number, end: number, measure: MeasureFn, linePx: number) {
  const line = linePx > 0 ? linePx : PHONE_LINE_PX;
  const slice = text.slice(start, Math.max(start, end));
  const alone = sampleLines(slice, measure, linePx);
  const before = start > 0 ? heightOf(text.slice(0, start), measure) : 0;
  const after = heightOf(text.slice(0, Math.max(start, end)), measure);
  const incremental = !(after > 0) && end > start ? (slice.length > 0 ? 1 : 0) : Math.max(0, (after - before) / line);
  return Math.max(incremental, alone);
}

function sampleLines(sample: string, measure: MeasureFn, linePx: number) {
  const line = linePx > 0 ? linePx : PHONE_LINE_PX;
  const height = heightOf(sample, measure);
  if (!(height > 0)) return sample.trim() ? 1 : 0;
  return height / line;
}

function fits(lines: number, limitPx: number, linePx: number) {
  if (lines > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP) return false;
  const line = linePx > 0 ? linePx : PHONE_LINE_PX;
  return lines * line <= limitPx + 0.5;
}

function wordPieces(text: string) {
  const parts: { start: number; end: number }[] = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    while (i < text.length && /\s/u.test(text[i] ?? "")) i += 1;
    while (i < text.length && !/\s/u.test(text[i] ?? "")) i += 1;
    if (i === start) break;
    parts.push({ start, end: i });
  }
  return parts;
}

function atomsOf(breath: SpotlightBreath, kind: DisplayKind): Atom[] {
  const text = breath.text ?? "";
  if (!text || kind === "verse") {
    return [{ index: breath.index, sentence: 0, start: 0, end: text.length, text }];
  }
  const spans = tapSpans(text);
  if (spans.length <= 1) {
    return [{ index: breath.index, sentence: 0, start: 0, end: text.length, text }];
  }
  return spans.map((span, sentence) => ({
    index: breath.index,
    sentence,
    start: span.start,
    end: span.end,
    text: text.slice(span.start, span.end),
  }));
}

function sampleOf(atoms: readonly Atom[], kind: DisplayKind) {
  if (atoms.length === 0) return "";
  if (atoms.length === 1) return atoms[0]!.text;
  const same = atoms.every((atom) => atom.index === atoms[0]!.index);
  if (same) return atoms.map((atom) => atom.text).join("");
  const pieces = atoms.map((atom) => atom.text.replace(/\s+/g, " ").trim()).filter(Boolean);
  return kind === "verse" ? pieces.join("\n") : pieces.join(" ");
}

function partsOf(atoms: readonly Atom[]): SpotlightPart[] {
  const parts: SpotlightPart[] = [];
  for (const atom of atoms) {
    const prev = parts[parts.length - 1];
    if (prev && prev.index === atom.index) prev.end = atom.end;
    else parts.push({ index: atom.index, start: atom.start, end: atom.end });
  }
  return parts;
}

function groupFrom(atoms: readonly Atom[], window: number, kind: DisplayKind): SpotlightGroup {
  const first = atoms[0]!;
  const last = atoms[atoms.length - 1]!;
  return {
    index: first.index,
    cursor: first.sentence,
    window,
    endIndex: last.index,
    endCursor: last.sentence + 1,
    parts: partsOf(atoms),
    sample: sampleOf(atoms, kind),
  };
}

function atomLines(atom: Atom, breathText: string, measure: MeasureFn, linePx: number) {
  return flowLines(breathText, atom.start, atom.end, measure, linePx);
}

/**
 * Lines the lit passage occupies.
 * Sentences in one breath share a line. Sentences in different breaths are
 * separate blocks, so they stack even when a joined paragraph would wrap tighter.
 */
function mergedLines(
  atoms: readonly Atom[],
  texts: Map<number, string>,
  measure: MeasureFn,
  linePx: number,
  _kind: DisplayKind,
) {
  if (atoms.length === 0) return 0;
  const line = linePx > 0 ? linePx : PHONE_LINE_PX;
  let height = 0;
  let i = 0;
  while (i < atoms.length) {
    const index = atoms[i]!.index;
    let j = i + 1;
    while (j < atoms.length && atoms[j]!.index === index) j += 1;
    const text = texts.get(index) ?? "";
    const start = atoms[i]!.start;
    const end = atoms[j - 1]!.end;
    height += flowLines(text, start, end, measure, linePx) * line;
    i = j;
  }
  return height / line;
}

/**
 * Lines of a slice on its own. A window never lays out the paragraph above it.
 * A break is always after a word. A single word stays whole.
 */
function windowLines(breathText: string, start: number, end: number, measure: MeasureFn, linePx: number) {
  return sampleLines(breathText.slice(start, Math.max(start, end)), measure, linePx);
}

function minWindowLines() {
  return SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP;
}

function maxWindowLines() {
  return SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP;
}

/** Under two lines: one short line, which may cross a paragraph to find company. */
function isShortLine(lines: number) {
  return lines < minWindowLines();
}

function skipSpace(text: string, index: number) {
  let i = index;
  while (i < text.length && /\s/u.test(text[i] ?? "")) i += 1;
  return i;
}

function addBreak(found: Map<number, number>, end: number, rank: number, length: number) {
  if (end <= 0 || end >= length) return;
  const prev = found.get(end);
  if (prev === undefined || rank < prev) found.set(end, rank);
}

const COMMA_CONJUNCTION =
  /^(?:and|but|or|nor|for|yet|so|because|although|though|while|whereas|if|when|unless|until|since|before|after)\b/iu;

/**
 * Internal pauses, best rank first.
 * -1  a sentence end the tap kept inside one quotation
 *  0  semicolon, colon, em dash, or a line break
 *  1  a comma before a conjunction
 *  2  any other comma
 *  3  a word boundary
 * The cut sits on the first character of the next piece, so the pause
 * and the space after it stay with the earlier piece.
 */
function breakCandidates(text: string): { end: number; rank: number }[] {
  const found = new Map<number, number>();
  const inner = sentenceSpans(text, "in-quotes");
  if (inner.length > 1) {
    for (const span of inner) addBreak(found, span.end, -1, text.length);
  }
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] ?? "";
    if (ch === ";" || ch === "\n") {
      addBreak(found, skipSpace(text, i + 1), 0, text.length);
      continue;
    }
    if (ch === ":") {
      const prev = i > 0 ? text[i - 1]! : "";
      const next = i + 1 < text.length ? text[i + 1]! : "";
      if (/\d/u.test(prev) && /\d/u.test(next)) continue;
      addBreak(found, skipSpace(text, i + 1), 0, text.length);
      continue;
    }
    if (ch === "\u2014" || ch === "\u2013") {
      addBreak(found, skipSpace(text, i + 1), 0, text.length);
      continue;
    }
    if (ch === "-" && text[i + 1] === "-") {
      let j = i + 2;
      while (text[j] === "-") j += 1;
      addBreak(found, skipSpace(text, j), 0, text.length);
      i = j - 1;
    }
  }
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== ",") continue;
    const after = skipSpace(text, i + 1);
    if (after >= text.length) continue;
    const rank = COMMA_CONJUNCTION.test(text.slice(after)) ? 1 : 2;
    addBreak(found, after, rank, text.length);
  }
  const words = wordPieces(text);
  for (let i = 0; i < words.length - 1; i += 1) {
    const next = words[i + 1]!;
    let at = next.start;
    while (at < next.end && /\s/u.test(text[at] ?? "")) at += 1;
    addBreak(found, at, 3, text.length);
  }
  const list: { end: number; rank: number }[] = [];
  for (const [end, rank] of found) list.push({ end, rank });
  list.sort((a, b) => a.end - b.end);
  return list;
}

function wordCount(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/u).length;
}

function targetLines(total: number) {
  const pieces = Math.max(1, Math.ceil(total / SPOTLIGHT_MAX_LINES));
  return total / pieces;
}

type ScoredCut = { end: number; rank: number; remnant: number; balance: number };

function scoreCut(
  breathText: string,
  from: number,
  end: number,
  cut: number,
  rank: number,
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  target: number,
): ScoredCut | null {
  if (cut <= from || cut >= end) return null;
  const piece = windowLines(breathText, from, cut, measure, linePx);
  if (piece < minWindowLines() || piece > maxWindowLines()) return null;
  if (!fits(piece, limitPx, linePx)) return null;
  const rest = windowLines(breathText, cut, end, measure, linePx);
  const restWords = wordCount(breathText.slice(cut, end));
  const restPieces = rest <= maxWindowLines() ? 1 : Math.ceil(rest / SPOTLIGHT_MAX_LINES);
  const tail = restPieces <= 1 ? rest : rest / restPieces;
  const remnant = (restWords > 0 && restWords < 4) || tail < minWindowLines() ? 1 : 0;
  return { end: cut, rank, remnant, balance: Math.abs(piece - target) };
}

function betterCut(a: ScoredCut, b: ScoredCut) {
  if (a.remnant !== b.remnant) return a.remnant - b.remnant;
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.balance !== b.balance) return a.balance - b.balance;
  return b.end - a.end;
}

function bestCut(scored: ScoredCut[]) {
  let best = scored[0]!;
  for (let i = 1; i < scored.length; i += 1) {
    const next = scored[i]!;
    if (betterCut(next, best) < 0) best = next;
  }
  return best;
}

/** Word cuts whose slice lands in the two-to-four line window. */
function wordCutsInWindow(
  breathText: string,
  from: number,
  wordCuts: readonly number[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
) {
  if (wordCuts.length === 0) return [];
  let low = 0;
  let high = wordCuts.length - 1;
  let left = wordCuts.length;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lines = windowLines(breathText, from, wordCuts[mid]!, measure, linePx);
    if (lines >= minWindowLines()) {
      left = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  low = left;
  high = wordCuts.length - 1;
  let right = left - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lines = windowLines(breathText, from, wordCuts[mid]!, measure, linePx);
    if (lines <= maxWindowLines() && fits(lines, limitPx, linePx)) {
      right = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (right < left) return [];
  return wordCuts.slice(left, right + 1);
}

/** The longest word cut that still fits, or the first word when nothing does. */
function longestWordFit(
  breathText: string,
  from: number,
  wordCuts: readonly number[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  absEnd: number,
) {
  let best = -1;
  let low = 0;
  let high = wordCuts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lines = windowLines(breathText, from, wordCuts[mid]!, measure, linePx);
    if (fits(lines, limitPx, linePx)) {
      best = wordCuts[mid]!;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (best > from) return best;
  return wordCuts[0] ?? absEnd;
}

function pickCut(
  breathText: string,
  from: number,
  absEnd: number,
  local: readonly { end: number; rank: number }[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
) {
  const total = windowLines(breathText, from, absEnd, measure, linePx);
  const target = targetLines(total);
  const punct = local.filter((cand) => cand.rank < 3);
  const punctScored: ScoredCut[] = [];
  for (const cand of punct) {
    const scored = scoreCut(breathText, from, absEnd, cand.end, cand.rank, measure, limitPx, linePx, target);
    if (scored) punctScored.push(scored);
  }
  const goodPunct = punctScored.filter((scored) => scored.remnant === 0);
  if (goodPunct.length > 0) return bestCut(goodPunct).end;
  const wordCuts = wordCutsInWindow(
    breathText,
    from,
    local.filter((cand) => cand.rank === 3).map((cand) => cand.end),
    measure,
    limitPx,
    linePx,
  );
  const wordScored: ScoredCut[] = [];
  for (const cut of wordCuts) {
    const scored = scoreCut(breathText, from, absEnd, cut, 3, measure, limitPx, linePx, target);
    if (scored) wordScored.push(scored);
  }
  const all = punctScored.concat(wordScored);
  if (all.length > 0) return bestCut(all).end;
  return longestWordFit(
    breathText,
    from,
    local.filter((cand) => cand.rank === 3).map((cand) => cand.end),
    measure,
    limitPx,
    linePx,
    absEnd,
  );
}

/**
 * Move the last cut earlier when it would leave a one-line or few-word tail
 * and some earlier pause keeps both pieces inside the window.
 */
function balanceTail(
  cuts: number[],
  breathText: string,
  absStart: number,
  cands: readonly { end: number; rank: number }[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
) {
  if (cuts.length < 2) return;
  const lastEnd = cuts[cuts.length - 1]!;
  const prevEnd = cuts[cuts.length - 2]!;
  const prevStart = cuts.length >= 3 ? cuts[cuts.length - 3]! : absStart;
  const lastLines = windowLines(breathText, prevEnd, lastEnd, measure, linePx);
  const lastWords = wordCount(breathText.slice(prevEnd, lastEnd));
  if (lastLines >= minWindowLines() && lastWords >= 4) return;
  let best: ScoredCut | null = null;
  for (const cand of cands) {
    if (cand.end <= prevStart || cand.end >= prevEnd) continue;
    const piece = windowLines(breathText, prevStart, cand.end, measure, linePx);
    const rest = windowLines(breathText, cand.end, lastEnd, measure, linePx);
    if (piece < minWindowLines() || piece > maxWindowLines()) continue;
    if (!fits(piece, limitPx, linePx) || !fits(rest, limitPx, linePx)) continue;
    if (rest < minWindowLines()) continue;
    const restWords = wordCount(breathText.slice(cand.end, lastEnd));
    if (restWords < 4) continue;
    const scored: ScoredCut = {
      end: cand.end,
      rank: cand.rank,
      remnant: 0,
      balance: Math.abs(piece - rest),
    };
    if (!best || betterCut(scored, best) < 0) best = scored;
  }
  if (best) cuts[cuts.length - 2] = best.end;
}

/**
 * A sentence taller than four lines, cut at the best pause inside the window.
 * Pieces stay between two and four lines when a pause allows it.
 * Nothing is cut inside a word, and the slices join back to the sentence.
 */
function splitAtom(
  atom: Atom,
  breathText: string,
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind,
): SpotlightGroup[] {
  const words = wordPieces(atom.text);
  if (words.length <= 1) return [groupFrom([atom], 0, kind)];
  const absStart = atom.start;
  const absEnd = atom.end;
  const cands = breakCandidates(atom.text).map((cand) => ({
    end: atom.start + cand.end,
    rank: cand.rank,
  }));
  const cuts: number[] = [];
  let from = absStart;
  while (from < absEnd) {
    const restLines = windowLines(breathText, from, absEnd, measure, linePx);
    if (fits(restLines, limitPx, linePx)) {
      cuts.push(absEnd);
      break;
    }
    const local = cands.filter((cand) => cand.end > from && cand.end < absEnd);
    let chosen = local.length > 0 ? pickCut(breathText, from, absEnd, local, measure, limitPx, linePx) : absEnd;
    if (chosen <= from || chosen >= absEnd) {
      cuts.push(absEnd);
      break;
    }
    cuts.push(chosen);
    from = chosen;
  }
  if (cuts.length === 0 || cuts[cuts.length - 1] !== absEnd) cuts.push(absEnd);
  balanceTail(cuts, breathText, absStart, cands, measure, limitPx, linePx);
  let cursor = absStart;
  return cuts.map((end, window) => {
    const start = cursor;
    cursor = end;
    const piece: Atom = {
      index: atom.index,
      sentence: atom.sentence,
      start,
      end,
      text: breathText.slice(start, end),
    };
    return groupFrom([piece], window, kind);
  });
}

/**
 * A stop is a breath a passage may include and must not continue past.
 * Sit ends and ritual ends are stops. Sentences inside the stop still merge.
 */
function crossesStop(fromIndex: number, toIndex: number, stops: ReadonlySet<number> | undefined) {
  if (!stops || stops.size === 0 || toIndex <= fromIndex) return false;
  for (const stop of stops) {
    if (fromIndex <= stop && toIndex > stop) return true;
  }
  return false;
}

/** A cut is a character end inside one breath. The next sentence stays out. */
function crossesCut(from: Atom, to: Atom, cuts: ReadonlyMap<number, number> | undefined) {
  if (!cuts || from.index !== to.index) return false;
  const cut = cuts.get(from.index);
  if (cut === undefined) return false;
  return from.start < cut && to.start >= cut;
}

/**
 * Groups for one stretch of breaths, in reading order.
 * Short sentences in one paragraph merge until the next sentence would pass
 * four lines. A one-line sentence may take the next paragraph when that still
 * fits; a longer passage stops at the paragraph. Chapter scope is the caller's:
 * the reader passes one scene. `stops` refuse the breath after a sit or a
 * ritual, including that short-line exception. `cuts` refuse the sentence
 * after a sit that ends inside a longer breath. A sentence taller than four
 * lines is split at an internal pause.
 */
export function spotlightGroups(
  breaths: readonly SpotlightBreath[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind = "prose",
  stops?: ReadonlySet<number>,
  cuts?: ReadonlyMap<number, number>,
): SpotlightGroup[] {
  const heights = new Map<string, number>();
  const raw = measure;
  measure = (sample) => {
    const hit = heights.get(sample);
    if (hit !== undefined) return hit;
    const value = raw(sample);
    heights.set(sample, value);
    return value;
  };
  const texts = new Map<number, string>();
  const atoms: Atom[] = [];
  for (const breath of breaths) {
    texts.set(breath.index, breath.text ?? "");
    atoms.push(...atomsOf(breath, kind));
  }
  if (atoms.length === 0) {
    return [
      {
        index: breaths[0]?.index ?? 0,
        cursor: 0,
        window: 0,
        endIndex: breaths[0]?.index ?? 0,
        endCursor: 1,
        parts: [],
        sample: "",
      },
    ];
  }
  const cap = limitPx > 0 ? limitPx : Number.POSITIVE_INFINITY;
  const groups: SpotlightGroup[] = [];
  let i = 0;
  while (i < atoms.length) {
    const atom = atoms[i]!;
    const breathText = texts.get(atom.index) ?? "";
    const alone = atomLines(atom, breathText, measure, linePx);
    const words = wordPieces(atom.text);
    if (!fits(alone, cap, linePx) && words.length > 1) {
      groups.push(...splitAtom(atom, breathText, measure, cap, linePx, kind));
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < atoms.length) {
      const next = atoms[j]!;
      const prev = atoms[j - 1]!;
      if (crossesStop(prev.index, next.index, stops)) break;
      if (crossesCut(prev, next, cuts)) break;
      const nextText = texts.get(next.index) ?? "";
      const nextLines = atomLines(next, nextText, measure, linePx);
      if (!fits(nextLines, cap, linePx) && wordPieces(next.text).length > 1) break;
      const have = mergedLines(atoms.slice(i, j), texts, measure, linePx, kind);
      // A paragraph break (the next breath) stays closed unless this passage
      // is still a single short line.
      if (next.index !== prev.index && !isShortLine(have)) break;
      const lines = mergedLines(atoms.slice(i, j + 1), texts, measure, linePx, kind);
      if (!fits(lines, cap, linePx)) break;
      j += 1;
    }
    groups.push(groupFrom(atoms.slice(i, j), 0, kind));
    i = j;
  }
  return groups;
}

/**
 * The passage that finishes `stop` must end on `stopLength` (the breath's
 * last character, or a cut inside that breath) and must not continue past it.
 * A miss is a short reason.
 */
export function passageEndsAtStop(
  groups: readonly SpotlightGroup[],
  stop: number,
  stopLength: number,
): string | null {
  for (const group of groups) {
    let before = false;
    let past = false;
    for (const part of group.parts) {
      if (part.index < stop || (part.index === stop && part.start < stopLength)) before = true;
      if (part.index > stop || (part.index === stop && part.end > stopLength)) past = true;
    }
    if (before && past) {
      return `a lit passage runs from breath ${group.index} through breath ${group.endIndex}`;
    }
  }
  const finishers = groups.filter((group) =>
    group.parts.some((part) => part.index === stop && part.end === stopLength),
  );
  if (finishers.length === 0) return "no lit passage ends on the stop's last character";
  const finisher = finishers[finishers.length - 1]!;
  if (finisher.parts.some((part) => part.index > stop || (part.index === stop && part.end > stopLength))) {
    return "the last lit passage continues past the stop";
  }
  return null;
}

/** The group a saved sentence belongs to. A window matches exactly, otherwise the first. */
export function locateSpotlight(
  groups: readonly SpotlightGroup[],
  index: number,
  cursor: number,
  window = 0,
): number {
  if (groups.length === 0) return 0;
  const exact = groups.findIndex(
    (group) => group.index === index && group.cursor === cursor && group.window === window,
  );
  if (exact >= 0) return exact;
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i]!;
    if (index < group.index || index > group.endIndex) continue;
    if (index === group.index && cursor < group.cursor) continue;
    if (index === group.endIndex && cursor >= group.endCursor) continue;
    if (group.endIndex === group.index && group.endCursor === group.cursor + 1 && group.window !== window) {
      const sameSentence = groups.some(
        (other) =>
          other.index === group.index &&
          other.cursor === group.cursor &&
          other.window === window &&
          other.endCursor === group.cursor + 1,
      );
      if (sameSentence) continue;
      if (window !== 0 && group.window !== 0) continue;
    }
    return i;
  }
  let best = 0;
  for (let i = 0; i < groups.length; i += 1) {
    if (groups[i]!.index <= index) best = i;
  }
  return best;
}

export function placeOf(group: SpotlightGroup): SpotlightPlace {
  return { index: group.index, cursor: group.cursor, window: group.window };
}

export function spotlightKey(place: SpotlightPlace) {
  return `${place.index}:${place.cursor}:${place.window}`;
}

/**
 * One group forward or back.
 * `groupsAt` returns the scene that contains that breath.
 * Off the first group of a scene, the previous scene opens on its last group.
 */
export function stepSpotlight(input: {
  place: SpotlightPlace;
  delta: 1 | -1;
  groupsAt: (breathIndex: number) => readonly SpotlightGroup[];
  breathCount: number;
}): SpotlightPlace | "start" | "end" {
  const groups = input.groupsAt(input.place.index);
  if (groups.length === 0) {
    if (input.delta < 0) return input.place.index <= 0 ? "start" : { index: input.place.index - 1, cursor: 0, window: 0 };
    return input.place.index + 1 >= input.breathCount ? "end" : { index: input.place.index + 1, cursor: 0, window: 0 };
  }
  const at = locateSpotlight(groups, input.place.index, input.place.cursor, input.place.window);
  if (input.delta > 0) {
    if (at + 1 < groups.length) return placeOf(groups[at + 1]!);
    const last = groups[at] ?? groups[groups.length - 1]!;
    const nextIndex = last.endIndex + 1;
    if (nextIndex >= input.breathCount) return "end";
    const next = input.groupsAt(nextIndex);
    const first = next.find((group) => group.index >= nextIndex) ?? next[0];
    return first ? placeOf(first) : "end";
  }
  if (at > 0) return placeOf(groups[at - 1]!);
  const first = groups[0]!;
  const prevIndex = first.index - 1;
  if (prevIndex < 0) return "start";
  const prev = input.groupsAt(prevIndex);
  for (let i = prev.length - 1; i >= 0; i -= 1) {
    const group = prev[i]!;
    if (group.endIndex <= prevIndex) return placeOf(group);
  }
  const last = prev[prev.length - 1];
  return last ? placeOf(last) : "start";
}

export function repeatSpotlight(
  place: SpotlightPlace,
  delta: 1 | -1,
  steps: number,
  groupsAt: (breathIndex: number) => readonly SpotlightGroup[],
  breathCount: number,
): SpotlightPlace | "start" | "end" {
  let current = place;
  const n = Math.max(0, Math.floor(steps));
  for (let i = 0; i < n; i += 1) {
    const moved = stepSpotlight({ place: current, delta, groupsAt, breathCount });
    if (moved === "start" || moved === "end") return moved;
    current = moved;
  }
  return current;
}

export type SpotlightRole = "past" | "focus" | "ahead";

export type SpotlightMark = { text: string; role: SpotlightRole };

/**
 * Pieces of each display block, split into what was read, the lit passage,
 * and what is still ahead. A play's repeated speaker stays on the first piece.
 * The pieces of a block join back to the block.
 */
export function markSpotlight(
  text: string,
  blocks: readonly { text: string }[],
  range: { start: number; end: number },
  kind: DisplayKind = "prose",
): SpotlightMark[][] {
  if (blocks.length === 0) return [];
  const speaker = kind === "speech" ? blocks[0]?.text.match(/^([^:]{1,80}): /)?.[1] : undefined;
  const prefix = speaker ? `${speaker}: ` : "";
  const raws = blocks.map((block, index) => {
    if (index > 0 && prefix && block.text.startsWith(prefix)) return block.text.slice(prefix.length);
    return block.text;
  });
  if (raws.join("") !== text) {
    return blocks.map((block) => [{ text: block.text, role: "focus" }]);
  }
  const focusStart = Math.max(0, Math.min(text.length, range.start));
  const focusEnd = Math.max(focusStart, Math.min(text.length, range.end));
  let offset = 0;
  return raws.map((raw, index) => {
    const start = offset;
    const end = offset + raw.length;
    offset = end;
    const cuts = [start, end];
    if (focusStart > start && focusStart < end) cuts.push(focusStart);
    if (focusEnd > start && focusEnd < end) cuts.push(focusEnd);
    cuts.sort((a, b) => a - b);
    const marks: SpotlightMark[] = [];
    for (let i = 0; i < cuts.length - 1; i += 1) {
      const from = cuts[i]!;
      const to = cuts[i + 1]!;
      if (to <= from) continue;
      const role: SpotlightRole = to <= focusStart ? "past" : from >= focusEnd ? "ahead" : "focus";
      marks.push({ text: text.slice(from, to), role });
    }
    if (marks.length === 0) marks.push({ text: raw, role: "focus" });
    const first = marks[0];
    if (index > 0 && prefix && first) marks[0] = { text: prefix + first.text, role: first.role };
    return marks;
  });
}
