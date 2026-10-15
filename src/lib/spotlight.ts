import {
  displayLinePx,
  measureDisplaySample,
  measureFocusRows,
  measureStyledHeight,
  PHONE_LINE_PX,
  resolveDisplayBlocks,
  tapSpans,
  type DisplayKind,
  type DisplayMetrics,
} from "./display-blocks.ts";
import { sentenceSpans } from "./sentences.ts";

/**
 * The lit passage is two to four rendered lines.
 * A third of a line of slack keeps a sentence that barely wraps from
 * being cut, and from swallowing the sentence after it.
 * Whole sentences are kept whenever they land in that window. A sentence
 * taller than four lines breaks at the most natural internal pause.
 * A row counter, when the reader supplies one, also refuses a fifth painted
 * row: the next sentence stays out, and a sentence that still paints five
 * or six rows breaks at a semicolon, dash, or comma.
 */
export const SPOTLIGHT_MIN_LINES = 2;
export const SPOTLIGHT_MAX_LINES = 4;
export const SPOTLIGHT_LINE_SLOP = 0.34;

export type MeasureFn = (sample: string) => number;

/**
 * Painted rows of one slice inside its breath.
 * The same characters can paint another row when they continue a line,
 * or when a display block boundary falls inside the slice.
 * Counts are non-decreasing as `end` grows.
 */
export type CountRows = (breathText: string, start: number, end: number) => number;

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

function rowsFit(countRows: CountRows | undefined, text: string, start: number, end: number) {
  if (!countRows) return true;
  return countRows(text, start, end) <= SPOTLIGHT_MAX_LINES;
}

/** Rows of a passage. Separate breaths stack, so their rows add. */
function coveredRows(atoms: readonly Atom[], texts: Map<number, string>, countRows: CountRows) {
  let rows = 0;
  let i = 0;
  while (i < atoms.length) {
    const index = atoms[i]!.index;
    const start = atoms[i]!.start;
    let end = atoms[i]!.end;
    let j = i + 1;
    while (j < atoms.length && atoms[j]!.index === index) {
      end = atoms[j]!.end;
      j += 1;
    }
    rows += countRows(texts.get(index) ?? "", start, end);
    if (rows > SPOTLIGHT_MAX_LINES) return rows;
    i = j;
  }
  return rows;
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
  countRows?: CountRows,
): ScoredCut | null {
  if (cut <= from || cut >= end) return null;
  const piece = windowLines(breathText, from, cut, measure, linePx);
  if (piece < minWindowLines() || piece > maxWindowLines()) return null;
  if (!fits(piece, limitPx, linePx)) return null;
  if (!rowsFit(countRows, breathText, from, cut)) return null;
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
  countRows?: CountRows,
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
    if (
      lines <= maxWindowLines() &&
      fits(lines, limitPx, linePx) &&
      rowsFit(countRows, breathText, from, wordCuts[mid]!)
    ) {
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
  countRows?: CountRows,
) {
  let best = -1;
  let low = 0;
  let high = wordCuts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lines = windowLines(breathText, from, wordCuts[mid]!, measure, linePx);
    if (fits(lines, limitPx, linePx) && rowsFit(countRows, breathText, from, wordCuts[mid]!)) {
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
  countRows?: CountRows,
) {
  const total = windowLines(breathText, from, absEnd, measure, linePx);
  const target = targetLines(total);
  const punct = local.filter((cand) => cand.rank < 3);
  const punctScored: ScoredCut[] = [];
  for (const cand of punct) {
    const scored = scoreCut(
      breathText,
      from,
      absEnd,
      cand.end,
      cand.rank,
      measure,
      limitPx,
      linePx,
      target,
      countRows,
    );
    if (scored) punctScored.push(scored);
  }
  const goodPunct = punctScored.filter((scored) => scored.remnant === 0);
  if (goodPunct.length > 0) return bestCut(goodPunct).end;
  const wordEnds = local.filter((cand) => cand.rank === 3).map((cand) => cand.end);
  const wordCuts = wordCutsInWindow(breathText, from, wordEnds, measure, limitPx, linePx, countRows);
  const wordScored: ScoredCut[] = [];
  for (const cut of wordCuts) {
    const scored = scoreCut(breathText, from, absEnd, cut, 3, measure, limitPx, linePx, target, countRows);
    if (scored) wordScored.push(scored);
  }
  const all = punctScored.concat(wordScored);
  if (all.length > 0) return bestCut(all).end;
  // A pause shorter than two lines still beats a fifth painted row.
  if (countRows) {
    const relaxed: ScoredCut[] = [];
    for (const cand of punct) {
      if (cand.end <= from || cand.end >= absEnd) continue;
      if (!rowsFit(countRows, breathText, from, cand.end)) continue;
      const piece = windowLines(breathText, from, cand.end, measure, linePx);
      if (piece > maxWindowLines() || !fits(piece, limitPx, linePx)) continue;
      relaxed.push({ end: cand.end, rank: cand.rank, remnant: 0, balance: Math.abs(piece - target) });
    }
    if (relaxed.length > 0) return bestCut(relaxed).end;
  }
  return longestWordFit(breathText, from, wordEnds, measure, limitPx, linePx, absEnd, countRows);
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
  countRows?: CountRows,
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
    if (!rowsFit(countRows, breathText, prevStart, cand.end)) continue;
    if (!rowsFit(countRows, breathText, cand.end, lastEnd)) continue;
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
  maxWindows?: number,
  countRows?: CountRows,
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
    if (fits(restLines, limitPx, linePx) && rowsFit(countRows, breathText, from, absEnd)) {
      cuts.push(absEnd);
      break;
    }
    const local = cands.filter((cand) => cand.end > from && cand.end < absEnd);
    let chosen =
      local.length > 0 ? pickCut(breathText, from, absEnd, local, measure, limitPx, linePx, countRows) : absEnd;
    if (chosen <= from || chosen >= absEnd) {
      cuts.push(absEnd);
      break;
    }
    cuts.push(chosen);
    from = chosen;
    // A reader only needs the window on screen. Earlier cuts stay put:
    // the tail balance only moves the last pair, and only once the sentence ends.
    if (maxWindows && maxWindows > 0 && cuts.length >= maxWindows) {
      const tail = windowLines(breathText, from, absEnd, measure, linePx);
      if (fits(tail, limitPx, linePx) && rowsFit(countRows, breathText, from, absEnd)) cuts.push(absEnd);
      break;
    }
  }
  if (cuts.length === 0 || (cuts[cuts.length - 1] !== absEnd && !(maxWindows && maxWindows > 0))) cuts.push(absEnd);
  if (cuts[cuts.length - 1] === absEnd) {
    balanceTail(cuts, breathText, absStart, cands, measure, limitPx, linePx, countRows);
  }
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

export type SpotlightEdge = "around" | "first" | "last";

export type SpotlightQuery = {
  cursor?: number;
  window?: number;
  edge?: SpotlightEdge;
  /** Groups to keep after the one on screen. A tap needs the next one. */
  after?: number;
};

type GroupBound = {
  edge: SpotlightEdge;
  index: number;
  cursor: number;
  window: number;
  after: number;
};

function atomIsTall(
  atom: Atom,
  breathText: string,
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  countRows?: CountRows,
) {
  if (wordPieces(atom.text).length <= 1) return false;
  if (!fits(atomLines(atom, breathText, measure, linePx), limitPx, linePx)) return true;
  return !rowsFit(countRows, breathText, atom.start, atom.end);
}

/**
 * Where a group that contains `focus` can start.
 * A tall sentence is split on its own and does not pull the next paragraph,
 * so the walk stops there. A run of short lines can still cross paragraphs,
 * and that run is the only lookback opening pays for.
 */
function groupOrigin(
  breaths: readonly SpotlightBreath[],
  focus: number,
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind,
  stops?: ReadonlySet<number>,
  countRows?: CountRows,
): { index: number; sentence: number } {
  const focusPos = breaths.findIndex((breath) => breath.index === focus);
  if (focusPos <= 0) return { index: breaths[focusPos]?.index ?? focus, sentence: 0 };
  let pos = focusPos;
  while (pos > 0) {
    const prev = breaths[pos - 1]!;
    const here = breaths[pos]!;
    if (crossesStop(prev.index, here.index, stops)) break;
    const prevAtoms = atomsOf(prev, kind);
    const breathText = prev.text ?? "";
    let lastTall = -1;
    for (let i = 0; i < prevAtoms.length; i += 1) {
      if (atomIsTall(prevAtoms[i]!, breathText, measure, limitPx, linePx, countRows)) lastTall = i;
    }
    if (lastTall >= 0) {
      const tail = prevAtoms.slice(lastTall + 1);
      if (tail.length === 0) break;
      const texts = new Map([[prev.index, breathText]]);
      if (!isShortLine(mergedLines(tail, texts, measure, linePx, kind))) break;
      return { index: prev.index, sentence: tail[0]!.sentence };
    }
    const texts = new Map([[prev.index, breathText]]);
    if (!isShortLine(mergedLines(prevAtoms, texts, measure, linePx, kind))) break;
    pos -= 1;
  }
  return { index: breaths[pos]!.index, sentence: 0 };
}

function groupCovers(group: SpotlightGroup, place: SpotlightPlace) {
  if (place.index < group.index || place.index > group.endIndex) return false;
  if (place.index === group.index && place.cursor < group.cursor) return false;
  if (place.index === group.endIndex && place.cursor >= group.endCursor) return false;
  if (group.index === group.endIndex && group.cursor === place.cursor && group.window !== place.window) {
    return false;
  }
  return true;
}

function boundSatisfied(groups: readonly SpotlightGroup[], bound: GroupBound) {
  if (bound.edge === "first") return groups.length >= 1;
  if (bound.edge === "last") return false;
  const coverAt = groups.findIndex((group) => groupCovers(group, bound));
  if (coverAt < 0) return false;
  return groups.length > coverAt + bound.after;
}

function windowsStillNeeded(groups: readonly SpotlightGroup[], bound: GroupBound | undefined) {
  if (!bound || bound.edge === "last") return undefined;
  if (bound.edge === "first") return Math.max(1, 1 + bound.after);
  const coverAt = groups.findIndex((group) => groupCovers(group, bound));
  if (coverAt < 0) return bound.window + bound.after + 1;
  const need = bound.after - (groups.length - (coverAt + 1));
  return need > 0 ? need : undefined;
}

/**
 * Groups for one stretch of breaths, in reading order.
 * Short sentences in one paragraph merge until the next sentence would pass
 * four lines. A one-line sentence may take the next paragraph when that still
 * fits; a longer passage stops at the paragraph. Chapter scope is the caller's:
 * the reader passes one scene. `stops` refuse the breath after a sit or a
 * ritual, including that short-line exception. `cuts` refuse the sentence
 * after a sit that ends inside a longer breath. A sentence taller than four
 * lines is split at an internal pause. With `countRows`, a window that would
 * paint a fifth row stops at the sentence before it, and a single sentence
 * that still paints five or six rows breaks at a semicolon, dash, or comma.
 * `bound` stops once the passage on screen, and one step past it, is known.
 */
function groupBreaths(
  breaths: readonly SpotlightBreath[],
  measureIn: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind,
  stops: ReadonlySet<number> | undefined,
  cuts: ReadonlyMap<number, number> | undefined,
  countRows: CountRows | undefined,
  bound: GroupBound | undefined,
  originSentence = 0,
): SpotlightGroup[] {
  const heights = new Map<string, number>();
  const measure: MeasureFn = (sample) => {
    const hit = heights.get(sample);
    if (hit !== undefined) return hit;
    const value = measureIn(sample);
    heights.set(sample, value);
    return value;
  };
  const rowCaches = new Map<string, Map<string, number>>();
  const rows: CountRows | undefined = countRows
    ? (text, start, end) => {
        let byText = rowCaches.get(text);
        if (!byText) {
          byText = new Map();
          rowCaches.set(text, byText);
        }
        const key = `${start}:${end}`;
        const hit = byText.get(key);
        if (hit !== undefined) return hit;
        const value = countRows(text, start, end);
        byText.set(key, value);
        return value;
      }
    : undefined;
  const texts = new Map<number, string>();
  const atoms: Atom[] = [];
  breaths.forEach((breath, breathAt) => {
    texts.set(breath.index, breath.text ?? "");
    const made = atomsOf(breath, kind);
    if (breathAt === 0 && originSentence > 0) {
      atoms.push(...made.filter((atom) => atom.sentence >= originSentence));
      return;
    }
    atoms.push(...made);
  });
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
    if (bound?.edge === "last" && atom.index > bound.index) break;
    if (bound && bound.edge !== "last" && boundSatisfied(groups, bound)) break;
    const breathText = texts.get(atom.index) ?? "";
    const alone = atomLines(atom, breathText, measure, linePx);
    const words = wordPieces(atom.text);
    const aloneRows = rowsFit(rows, breathText, atom.start, atom.end);
    if ((!fits(alone, cap, linePx) || !aloneRows) && words.length > 1) {
      const maxWindows =
        bound && (bound.edge === "last" || atom.index <= bound.index || !boundSatisfied(groups, bound))
          ? windowsStillNeeded(groups, bound)
          : undefined;
      groups.push(...splitAtom(atom, breathText, measure, cap, linePx, kind, maxWindows, rows));
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
      const nextFitsRows = rowsFit(rows, nextText, next.start, next.end);
      if ((!fits(nextLines, cap, linePx) || !nextFitsRows) && wordPieces(next.text).length > 1) break;
      const have = mergedLines(atoms.slice(i, j), texts, measure, linePx, kind);
      // A paragraph break (the next breath) stays closed unless this passage
      // is still a single short line.
      if (next.index !== prev.index && !isShortLine(have)) break;
      const lines = mergedLines(atoms.slice(i, j + 1), texts, measure, linePx, kind);
      if (!fits(lines, cap, linePx)) break;
      if (rows && coveredRows(atoms.slice(i, j + 1), texts, rows) > SPOTLIGHT_MAX_LINES) break;
      j += 1;
    }
    groups.push(groupFrom(atoms.slice(i, j), 0, kind));
    i = j;
  }
  if (bound?.edge === "last") {
    const overlapping = groups.filter((group) => group.index <= bound.index && group.endIndex >= bound.index);
    const last = overlapping[overlapping.length - 1] ?? groups[groups.length - 1];
    return last ? [last] : groups;
  }
  if (bound?.edge === "first") return groups.slice(0, 1);
  return groups;
}

export function spotlightGroups(
  breaths: readonly SpotlightBreath[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind = "prose",
  stops?: ReadonlySet<number>,
  cuts?: ReadonlyMap<number, number>,
  countRows?: CountRows,
): SpotlightGroup[] {
  return groupBreaths(breaths, measure, limitPx, linePx, kind, stops, cuts, countRows, undefined);
}

/**
 * The groups a reader needs for one place: the passage on screen, the step
 * after it, or the last passage of a breath when stepping backward.
 * The rest of the chapter is left ungrouped so a long poem can open.
 */
export function spotlightNear(
  breaths: readonly SpotlightBreath[],
  place: SpotlightPlace,
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind = "prose",
  stops?: ReadonlySet<number>,
  cuts?: ReadonlyMap<number, number>,
  edge: SpotlightEdge = "around",
  after = 1,
  countRows?: CountRows,
): SpotlightGroup[] {
  if (breaths.length === 0) return [];
  const focusPos = breaths.findIndex((breath) => breath.index === place.index);
  if (focusPos < 0) return spotlightGroups(breaths, measure, limitPx, linePx, kind, stops, cuts, countRows);
  const origin =
    edge === "first"
      ? { index: place.index, sentence: 0 }
      : groupOrigin(breaths, place.index, measure, limitPx, linePx, kind, stops, countRows);
  const originPos = breaths.findIndex((breath) => breath.index === origin.index);
  const start = originPos >= 0 ? originPos : focusPos;
  // A passage is at most four lines, so the breaths it can touch sit next to it.
  const slack = edge === "last" ? 8 : Math.max(after, 0) + 8;
  const slice = breaths.slice(start, Math.min(breaths.length, focusPos + slack + 1));
  const bound: GroupBound = {
    edge,
    index: place.index,
    cursor: place.cursor,
    window: place.window,
    after,
  };
  return groupBreaths(
    slice,
    measure,
    limitPx,
    linePx,
    kind,
    stops,
    cuts,
    countRows,
    bound,
    origin.index === slice[0]?.index ? origin.sentence : 0,
  );
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

export type GroupsAt = (breathIndex: number, query?: SpotlightQuery) => readonly SpotlightGroup[];

/**
 * One group forward or back.
 * `groupsAt` returns the scene that contains that breath. A query asks for
 * the passage on screen, the first passage of a breath, or the last one.
 * Off the first group of a scene, the previous scene opens on its last group.
 */
export function stepSpotlight(input: {
  place: SpotlightPlace;
  delta: 1 | -1;
  groupsAt: GroupsAt;
  breathCount: number;
}): SpotlightPlace | "start" | "end" {
  const groups = input.groupsAt(input.place.index, {
    cursor: input.place.cursor,
    window: input.place.window,
    edge: "around",
    after: 1,
  });
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
    const next = input.groupsAt(nextIndex, { cursor: 0, window: 0, edge: "first", after: 0 });
    const first = next.find((group) => group.index >= nextIndex) ?? next[0];
    return first ? placeOf(first) : "end";
  }
  if (at > 0) return placeOf(groups[at - 1]!);
  const first = groups[0]!;
  const prevIndex = first.index - 1;
  if (prevIndex < 0) return "start";
  const prev = input.groupsAt(prevIndex, { cursor: 0, window: 0, edge: "last", after: 0 });
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
  groupsAt: GroupsAt,
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

const ROW_BOX_SLACK = 0.08;

function lineBoxes(sample: string, metrics: DisplayMetrics) {
  const line = displayLinePx(metrics);
  const height = metrics.faceReady ? measureStyledHeight(sample, metrics) : measureDisplaySample(sample, metrics);
  if (!(height > 0)) return sample.trim() ? 1 : 0;
  return Math.max(1, Math.ceil(height / (line > 0 ? line : PHONE_LINE_PX) - ROW_BOX_SLACK));
}

/**
 * Painted rows of a lit slice.
 * One line-box cannot reach a fifth row. A longer slice is counted per display
 * block: past text can add the shared row and one extra wrap. Four or more
 * estimated rows are read from the focus spans' client rects, because a block
 * break can add a row the slice measured on its own does not see.
 * Books and imported pages share this count.
 */
export function countFocusRows(
  text: string,
  start: number,
  end: number,
  metrics: DisplayMetrics,
  kind: DisplayKind = "prose",
): number {
  if (!(end > start) || !text) return 0;
  const slice = text.slice(start, end);
  const alone = lineBoxes(slice, metrics);
  // One short line, even after past text or a block break, cannot paint a fifth row.
  if (alone <= 1) return Math.min(SPOTLIGHT_MAX_LINES, alone + (start > 0 ? 2 : 0));
  const laid = laidFocus(text, start, end, metrics, kind);
  if (laid.parts.length === 0) return 0;
  // Four estimated rows still paint once: a block break or the line after the
  // focus can add a row the slice-alone measure does not see.
  if (laid.safe < SPOTLIGHT_MAX_LINES || typeof document === "undefined") return laid.safe;
  return paintedRows(laid.parts, metrics);
}

/** Client rects of the focus, one block at a time. The gate uses this directly. */
export function paintFocusRows(
  text: string,
  start: number,
  end: number,
  metrics: DisplayMetrics,
  kind: DisplayKind = "prose",
): number {
  if (!(end > start) || !text || typeof document === "undefined") return 0;
  const laid = laidFocus(text, start, end, metrics, kind);
  if (laid.parts.length === 0) return 0;
  return paintedRows(laid.parts, metrics);
}

function laidFocus(text: string, start: number, end: number, metrics: DisplayMetrics, kind: DisplayKind) {
  const blocks = resolveDisplayBlocks(text, metrics, kind);
  const marked = markSpotlight(text, blocks, { start, end }, kind);
  let safe = 0;
  const parts: { text: string; focus: boolean }[][] = [];
  for (const pieces of marked) {
    const focusText = pieces
      .filter((piece) => piece.role === "focus")
      .map((piece) => piece.text)
      .join("");
    if (!focusText.trim()) continue;
    const past = pieces.some((piece) => piece.role === "past");
    const boxes = lineBoxes(focusText, metrics);
    safe += past ? boxes + 2 : boxes;
    parts.push(pieces.map((piece) => ({ text: piece.text, focus: piece.role === "focus" })));
  }
  return { safe, parts };
}

function paintedRows(parts: { text: string; focus: boolean }[][], metrics: DisplayMetrics) {
  let rows = 0;
  for (const pieces of parts) rows += measureFocusRows(pieces, metrics);
  return Math.max(rows, 1);
}
